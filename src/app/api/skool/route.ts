import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDatabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const db = getDatabase()
  const modules = db.prepare(`
    SELECT id, title, description, content, category, sort_order, created_at, updated_at
    FROM skool_modules ORDER BY sort_order ASC, created_at ASC
  `).all()
  return NextResponse.json({ modules })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const { title, description = '', content = '', category = 'My Changes' } = body
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const db = getDatabase()
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM skool_modules').get() as any)?.m ?? 0

  db.prepare(`
    INSERT INTO skool_modules (id, title, description, content, category, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, date('now'), date('now'))
  `).run(id, title.trim(), description.trim(), content.trim(), category, maxOrder + 1)

  const module = db.prepare('SELECT * FROM skool_modules WHERE id = ?').get(id)
  return NextResponse.json({ module }, { status: 201 })
}
