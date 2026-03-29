import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDatabase } from '@/lib/db'
import { readLimiter, mutationLimiter } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const limited = readLimiter(request)
  if (limited) return limited

  const db = getDatabase()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const session = db.prepare('SELECT * FROM council_sessions WHERE id = ? AND workspace_id = ?')
      .get(Number(id), auth.user.workspace_id ?? 1) as any
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      ...session,
      models: JSON.parse(session.models),
      debate: session.debate ? JSON.parse(session.debate) : [],
    })
  }

  const sessions = db.prepare(
    'SELECT id, topic, models, rounds, status, conclusion, created_at FROM council_sessions WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(auth.user.workspace_id ?? 1) as any[]

  return NextResponse.json({
    sessions: sessions.map(s => ({ ...s, models: JSON.parse(s.models) }))
  })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const limited = mutationLimiter(request)
  if (limited) return limited

  const body = await request.json().catch(() => ({}))
  const { topic, models, rounds = 3 } = body

  if (!topic?.trim()) return NextResponse.json({ error: 'topic required' }, { status: 400 })
  if (!Array.isArray(models) || models.length < 2) return NextResponse.json({ error: 'at least 2 models required' }, { status: 400 })

  const db = getDatabase()
  const result = db.prepare(
    'INSERT INTO council_sessions (topic, models, rounds, status, workspace_id) VALUES (?, ?, ?, ?, ?)'
  ).run(topic.trim(), JSON.stringify(models), Math.min(Math.max(1, rounds), 5), 'running', auth.user.workspace_id ?? 1)

  return NextResponse.json({ id: result.lastInsertRowid })
}

export const dynamic = 'force-dynamic'
