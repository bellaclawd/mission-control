import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDatabase } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const db = getDatabase()
  const body = await request.json()
  const { title, description, content, category } = body

  const existing = db.prepare('SELECT * FROM skool_modules WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  db.prepare(`
    UPDATE skool_modules SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      content = COALESCE(?, content),
      category = COALESCE(?, category),
      updated_at = date('now')
    WHERE id = ?
  `).run(title ?? null, description ?? null, content ?? null, category ?? null, id)

  const module = db.prepare('SELECT * FROM skool_modules WHERE id = ?').get(id)
  return NextResponse.json({ module })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const db = getDatabase()
  const existing = db.prepare('SELECT id FROM skool_modules WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  db.prepare('DELETE FROM skool_modules WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
