import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readFileSync, existsSync } from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import { getDatabase } from '@/lib/db'
import { getAgentWorkspaceCandidates } from '@/lib/agent-workspace'

const MAX_PREVIEW_BYTES = 50_000

function getAllowedRoots(workspaceId: number): string[] {
  try {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT name, config FROM agents WHERE workspace_id = ? ORDER BY id ASC')
      .all(workspaceId) as Array<{ name: string; config: string | null }>

    const roots: string[] = []
    for (const row of rows) {
      const agentConfig = row.config ? JSON.parse(row.config) : {}
      const candidates = getAgentWorkspaceCandidates(agentConfig, row.name)
      roots.push(...candidates)
    }
    return roots
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path') || ''
  const forceDownload = searchParams.get('download') === '1'

  // Security: must be under an allowed workspace root or the generated media dir
  const allowedRoots = getAllowedRoots(auth.user.workspace_id ?? 1)
  const generatedDir = join(os.homedir(), '.openclaw', 'media', 'generated')
  if (!allowedRoots.some(root => path.startsWith(root)) && !path.startsWith(generatedDir)) {
    return NextResponse.json({ error: 'Path not allowed' }, { status: 403 })
  }

  if (!existsSync(path)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  try {
    const ext = path.split('.').pop()?.toLowerCase()

    // Binary files — serve as raw bytes with correct MIME type
    if (ext === 'pdf') {
      const buf = readFileSync(path)
      const disposition = forceDownload ? 'attachment' : 'inline'
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${disposition}; filename="${path.split('/').pop()}"`,
        },
      })
    }

    // Image files
    const imageMimes: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }
    if (ext && imageMimes[ext]) {
      const buf = readFileSync(path)
      return new NextResponse(buf, { headers: { 'Content-Type': imageMimes[ext] } })
    }

    // Text files
    const buf = readFileSync(path)
    const content = buf.slice(0, MAX_PREVIEW_BYTES).toString('utf-8')
    return NextResponse.json({ content, truncated: buf.length > MAX_PREVIEW_BYTES })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
