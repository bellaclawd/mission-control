import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, extname, basename } from 'node:path'
import { getDatabase } from '@/lib/db'
import { getAgentWorkspaceCandidates } from '@/lib/agent-workspace'

// Dirs to skip
const SKIP_DIRS = new Set(['.git', 'node_modules', '.obsidian', '.openclaw'])

// Files to skip
const SKIP_FILENAMES = new Set([
  'workspace-state.json', 'heartbeat-state.json',
])

const PREVIEW_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.js', '.ts', '.tsx', '.jsx', '.py',
  '.html', '.css', '.sh', '.yaml', '.yml', '.csv', '.log',
])

interface FileEntry {
  id: string
  name: string
  path: string       // absolute path
  relPath: string    // relative to workspace
  agent: string
  workspace: string
  ext: string
  size: number
  modifiedAt: number // unix ms
  previewable: boolean
}

function scanDir(dir: string, agent: string, workspace: string, results: FileEntry[]) {
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return }

  for (const entry of entries) {
    if (entry.startsWith('.') && SKIP_DIRS.has(entry)) continue
    if (entry.startsWith('.') && !PREVIEW_EXTENSIONS.has(extname(entry))) continue

    const full = join(dir, entry)
    let stat: ReturnType<typeof statSync>
    try { stat = statSync(full) } catch { continue }

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) scanDir(full, agent, workspace, results)
    } else {
      if (SKIP_FILENAMES.has(entry)) continue
      const ext = extname(entry).toLowerCase()
      results.push({
        id: Buffer.from(full).toString('base64url'),
        name: basename(entry),
        path: full,
        relPath: relative(workspace, full),
        agent,
        workspace,
        ext,
        size: stat.size,
        modifiedAt: stat.mtimeMs,
        previewable: PREVIEW_EXTENSIONS.has(ext),
      })
    }
  }
}

function getAgentWorkspaces(workspaceId: number): Array<{ name: string; workspace: string }> {
  try {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT name, config FROM agents WHERE workspace_id = ? ORDER BY id ASC')
      .all(workspaceId) as Array<{ name: string; config: string | null }>

    const result: Array<{ name: string; workspace: string }> = []
    for (const row of rows) {
      const agentConfig = row.config ? JSON.parse(row.config) : {}
      const candidates = getAgentWorkspaceCandidates(agentConfig, row.name)
      if (candidates.length > 0) {
        result.push({ name: row.name, workspace: candidates[0] })
      }
    }
    return result
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('q') || '').toLowerCase().trim()
  const agentFilter = searchParams.get('agent') || ''
  const extFilter = searchParams.get('ext') || ''

  const workspaceId = auth.user.workspace_id ?? 1
  const agentWorkspaces = getAgentWorkspaces(workspaceId)
  const files: FileEntry[] = []

  for (const { name, workspace } of agentWorkspaces) {
    if (!existsSync(workspace)) continue
    if (agentFilter && agentFilter !== name) continue
    scanDir(workspace, name, workspace, files)
  }

  // Sort by modified desc
  files.sort((a, b) => b.modifiedAt - a.modifiedAt)

  // Apply filters
  let filtered = files
  if (query) {
    filtered = filtered.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.relPath.toLowerCase().includes(query)
    )
  }
  if (extFilter) {
    filtered = filtered.filter(f => f.ext === extFilter || f.ext === '.' + extFilter)
  }

  return NextResponse.json({
    files: filtered,
    total: filtered.length,
    agents: agentWorkspaces.map(a => a.name),
  })
}
