import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { requireRole } from '@/lib/auth'
import { config } from '@/lib/config'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent') || ''
  const avatarPath = searchParams.get('path') || ''

  if (!agentId || !avatarPath) {
    return NextResponse.json({ error: 'agent and path required' }, { status: 400 })
  }

  // Resolve workspace for this agent
  const stateDir = config.openclawStateDir
  if (!stateDir) return NextResponse.json({ error: 'State dir not configured' }, { status: 500 })

  // Try workspace-<agentId> and workspace-main
  const candidates = [
    join(stateDir, `workspace-${agentId}`, avatarPath),
    join(stateDir, `workspace-main`, avatarPath),
    join(stateDir, `workspace`, avatarPath),
  ]

  let filePath: string | null = null
  for (const c of candidates) {
    if (existsSync(c)) { filePath = c; break }
  }

  if (!filePath) return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })

  // Security: must stay within stateDir
  if (!filePath.startsWith(stateDir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ext = extname(filePath).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'

  try {
    const buf = readFileSync(filePath)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to read avatar' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
