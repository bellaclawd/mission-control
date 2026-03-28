import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDatabase } from '@/lib/db'
import { mutationLimiter } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').toLowerCase().trim()
  const showDone = searchParams.get('done') === 'true'
  const workspaceId = auth.user.workspace_id ?? 1

  const db = getDatabase()

  let query = 'SELECT * FROM checklist WHERE workspace_id = ?'
  const params: any[] = [workspaceId]

  if (!showDone) {
    query += ' AND done = 0'
  }

  query += ' ORDER BY done ASC, priority DESC, created_at DESC'

  let items = (db.prepare(query).all(...params) as any[]).map(row => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
  }))

  if (q) {
    items = items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      (i.notes || '').toLowerCase().includes(q) ||
      (i.tags || []).some((t: string) => t.toLowerCase().includes(q))
    )
  }

  return NextResponse.json({ items, total: items.length })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const limited = mutationLimiter(request)
  if (limited) return limited

  const body = await request.json()
  const { title, notes, priority = 'normal', tags = [], created_by = 'bella' } = body

  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const db = getDatabase()
  const workspaceId = auth.user.workspace_id ?? 1
  const now = Math.floor(Date.now() / 1000)

  const result = db.prepare(`
    INSERT INTO checklist (workspace_id, title, notes, priority, tags, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(workspaceId, title.trim(), notes || null, priority, JSON.stringify(tags), created_by, now, now)

  const item = db.prepare('SELECT * FROM checklist WHERE id = ?').get(result.lastInsertRowid) as any
  return NextResponse.json({ item: { ...item, tags: item.tags ? JSON.parse(item.tags) : [] } }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const limited = mutationLimiter(request)
  if (limited) return limited

  const body = await request.json()
  const { id, done, title, notes, priority, tags } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getDatabase()
  const workspaceId = auth.user.workspace_id ?? 1
  const now = Math.floor(Date.now() / 1000)

  const existing = db.prepare('SELECT * FROM checklist WHERE id = ? AND workspace_id = ?').get(id, workspaceId) as any
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newDone = done !== undefined ? (done ? 1 : 0) : existing.done
  const newDoneAt = done === true ? now : done === false ? null : existing.done_at

  db.prepare(`
    UPDATE checklist SET
      done = ?, done_at = ?,
      title = COALESCE(?, title),
      notes = COALESCE(?, notes),
      priority = COALESCE(?, priority),
      tags = COALESCE(?, tags),
      updated_at = ?
    WHERE id = ? AND workspace_id = ?
  `).run(newDone, newDoneAt, title || null, notes || null, priority || null, tags ? JSON.stringify(tags) : null, now, id, workspaceId)

  const item = db.prepare('SELECT * FROM checklist WHERE id = ?').get(id) as any
  return NextResponse.json({ item: { ...item, tags: item.tags ? JSON.parse(item.tags) : [] } })
}

export async function DELETE(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const limited = mutationLimiter(request)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getDatabase()
  const workspaceId = auth.user.workspace_id ?? 1
  db.prepare('DELETE FROM checklist WHERE id = ? AND workspace_id = ?').run(Number(id), workspaceId)
  return NextResponse.json({ ok: true })
}
