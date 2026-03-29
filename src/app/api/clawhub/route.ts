import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter, mutationLimiter } from '@/lib/rate-limit'
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const OPENCLAW_BIN = process.env.OPENCLAW_BIN || '/opt/homebrew/bin/openclaw'
const HOME = homedir()
const OPENCLAW_HOME = process.env.OPENCLAW_HOME || process.env.OPENCLAW_STATE_DIR || join(HOME, '.openclaw')

// Skill source roots to scan
function getSkillRoots(): Array<{ source: string; path: string }> {
  const roots = [
    { source: 'openclaw-bundled', path: '/opt/homebrew/lib/node_modules/openclaw/skills' },
    { source: 'openclaw', path: join(OPENCLAW_HOME, 'skills') },
    { source: 'workspace', path: join(OPENCLAW_HOME, 'workspace-main', 'skills') },
    { source: 'agents-skills', path: join(HOME, '.agents', 'skills') },
  ]

  // Also scan workspace-* agent dirs
  try {
    const entries = readdirSync(OPENCLAW_HOME)
    for (const entry of entries) {
      if (!entry.startsWith('workspace-') || entry === 'workspace-main') continue
      const skillsDir = join(OPENCLAW_HOME, entry, 'skills')
      if (existsSync(skillsDir)) {
        roots.push({ source: entry, path: skillsDir })
      }
    }
  } catch { /* ignore */ }

  return roots
}

function extractSkillMeta(skillDir: string): { description?: string; emoji?: string; homepage?: string } {
  const mdPath = join(skillDir, 'SKILL.md')
  if (!existsSync(mdPath)) return {}
  try {
    const content = readFileSync(mdPath, 'utf-8')
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean)

    let description: string | undefined
    let emoji: string | undefined
    let homepage: string | undefined

    // Look for description in first non-heading line
    for (const line of lines) {
      if (!line.startsWith('#') && !line.startsWith('---')) {
        description = line.length > 220 ? line.slice(0, 217) + '...' : line
        break
      }
    }

    // Look for emoji in heading
    const headingMatch = content.match(/^#\s*([\p{Emoji}])/mu)
    if (headingMatch) emoji = headingMatch[1]

    // Look for homepage in content
    const homepageMatch = content.match(/homepage[:\s]+([https://]\S+)/i)
    if (homepageMatch) homepage = homepageMatch[1]

    return { description, emoji, homepage }
  } catch { return {} }
}

function scanSkills(): Array<any> {
  const roots = getSkillRoots()
  const seen = new Set<string>()
  const skills: any[] = []

  for (const { source, path: rootPath } of roots) {
    if (!existsSync(rootPath)) continue
    try {
      const entries = readdirSync(rootPath, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const skillDir = join(rootPath, entry.name)
        if (!existsSync(join(skillDir, 'SKILL.md'))) continue
        if (seen.has(entry.name)) continue
        seen.add(entry.name)
        const meta = extractSkillMeta(skillDir)
        skills.push({
          name: entry.name,
          source,
          description: meta.description,
          emoji: meta.emoji,
          homepage: meta.homepage,
          path: skillDir,
          eligible: true, // simplified — no binary check
        })
      }
    } catch { /* unreadable */ }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name))
}

async function fetchRegistryStats(slug: string): Promise<{ downloads: number; installs: number; stars: number; version: string | null } | null> {
  try {
    const res = await fetch(`https://clawhub.ai/api/skill?slug=${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const stats = data?.skill?.stats
    if (!stats) return null
    return {
      downloads: stats.downloads ?? 0,
      installs: stats.installsAllTime ?? 0,
      stars: stats.stars ?? 0,
      version: data?.latestVersion?.version ?? null,
    }
  } catch { return null }
}

// GET: list or search skills
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const limited = readLimiter(request)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'list'
  const query = (searchParams.get('q') || '').toLowerCase()
  const sortBy = searchParams.get('sort') || '' // 'downloads' | 'installs' | 'stars'

  const allSkills = scanSkills()

  let skills = allSkills
  if (action === 'search' && query) {
    skills = allSkills.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.description || '').toLowerCase().includes(query)
    )
  }

  // If sort by registry stat, fetch stats in parallel (cap at 30 to avoid rate limits)
  if (sortBy && ['downloads', 'installs', 'stars'].includes(sortBy)) {
    const toFetch = skills.slice(0, 30)
    const statsResults = await Promise.all(toFetch.map(s => fetchRegistryStats(s.name)))
    const statsMap = new Map<string, any>()
    toFetch.forEach((s, i) => { if (statsResults[i]) statsMap.set(s.name, statsResults[i]) })

    skills = skills.map(s => ({ ...s, _stats: statsMap.get(s.name) || null }))

    skills.sort((a: any, b: any) => {
      const aVal = a._stats?.[sortBy === 'installs' ? 'installs' : sortBy] ?? -1
      const bVal = b._stats?.[sortBy === 'installs' ? 'installs' : sortBy] ?? -1
      return bVal - aVal
    })
  }

  return NextResponse.json({ skills, total: skills.length })
}

// POST: install, get content for analyze/fork
export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const limited = mutationLimiter(request)
  if (limited) return limited

  const body = await request.json().catch(() => ({}))
  const { action, name } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  if (action === 'install') {
    try {
      const env = {
        ...process.env,
        HOME,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
        OPENCLAW_HOME,
      }
      const stdout = execSync(`"${OPENCLAW_BIN}" skills install "${name}"`, {
        timeout: 60000,
        encoding: 'utf8',
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      return NextResponse.json({ success: true, output: stdout })
    } catch (e: any) {
      const out = (e.stdout || '') + (e.stderr || '') || e.message
      return NextResponse.json({ success: false, output: out }, { status: 500 })
    }
  }

  if (action === 'get_skill_content') {
    // Find the skill and read its SKILL.md
    const allSkills = scanSkills()
    const skill = allSkills.find(s => s.name === name)
    if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

    let skillContent = ''
    try {
      skillContent = readFileSync(join(skill.path, 'SKILL.md'), 'utf-8')
    } catch { /* no content */ }

    // Try to fetch ClawHub registry stats
    let registryData: any = null
    try {
      const res = await fetch(`https://clawhub.ai/api/skill?slug=${encodeURIComponent(name)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) registryData = await res.json()
    } catch { /* no registry data */ }

    return NextResponse.json({ ...skill, skillContent, registry: registryData })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export const dynamic = 'force-dynamic'
