import { NextResponse } from 'next/server'
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const SOCIAL_MEDIA_DIR = '/Users/claw/.openclaw/workspace-main/social-media'
const PENDING_FILE = join(SOCIAL_MEDIA_DIR, 'pending.json')

const CATEGORY_EMOJIS: Record<string, string> = {
  restaurants: '🍽️',
  nightlife: '🍸',
  recipes: '👨‍🍳',
  activities: '🏖️',
  entertainment: '🎭',
}

function getEmoji(filename: string): string {
  const name = basename(filename, '.md').toLowerCase()
  return CATEGORY_EMOJIS[name] ?? '📌'
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface Entry {
  name: string
  link: string
  location: string
  tags: string[]
  summary: string
  added: string
  thumbnail: string
}

interface PendingEntry {
  id: string
  url: string
  name: string
  description: string
  category: string
  location: string
  tags: string[]
  addedAt: string
  thumbnailUrl: string
}

function parseEntries(content: string): Entry[] {
  const entries: Entry[] = []
  const blocks = content.split(/^## /m).slice(1)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    const name = lines[0].trim()

    const get = (key: string): string => {
      const re = new RegExp(`^\\s*[-*]\\s+\\*\\*${key}:\\*\\*\\s*(.*)`, 'im')
      const m = block.match(re)
      return m ? m[1].trim() : ''
    }

    const link = get('Link')
    const location = get('Location')
    const tagsRaw = get('Tags')
    const summary = get('Summary')
    const added = get('Added')
    const thumbnail = get('Thumbnail')

    const tags = tagsRaw
      ? tagsRaw.split(/\s+/).filter(t => t.startsWith('#')).map(t => t.slice(1))
      : []

    entries.push({ name, link, location, tags, summary, added, thumbnail })
  }

  return entries
}

function readPending(): PendingEntry[] {
  if (!existsSync(PENDING_FILE)) return []
  try {
    return JSON.parse(readFileSync(PENDING_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function writePending(entries: PendingEntry[]) {
  writeFileSync(PENDING_FILE, JSON.stringify(entries, null, 2), 'utf-8')
}

function getCategoryFiles() {
  if (!existsSync(SOCIAL_MEDIA_DIR)) return []
  return readdirSync(SOCIAL_MEDIA_DIR)
    .filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .sort()
}

// GET — return categories + pending queue
export async function GET() {
  const files = getCategoryFiles()

  const categories = files.map(file => {
    const filePath = join(SOCIAL_MEDIA_DIR, file)
    let content = ''
    try { content = readFileSync(filePath, 'utf-8') } catch { content = '' }

    const name = capitalise(basename(file, '.md').replace(/-/g, ' '))
    return {
      name,
      file,
      slug: basename(file, '.md'),
      emoji: getEmoji(file),
      entries: parseEntries(content),
    }
  })

  const pending = readPending()

  return NextResponse.json({ categories, pending })
}

// POST /api/social-media — route by action in body
export async function POST(req: Request) {
  const body = await req.json()
  const { action } = body

  // Approve a pending entry
  if (action === 'approve') {
    const { id, category } = body
    const pending = readPending()
    const entry = pending.find(e => e.id === id)
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Find the right md file
    const targetFile = join(SOCIAL_MEDIA_DIR, `${category}.md`)
    if (!existsSync(targetFile)) {
      return NextResponse.json({ error: `Category file not found: ${category}.md` }, { status: 400 })
    }

    // Build the markdown entry
    const lines: string[] = [`\n## ${entry.name}`]
    lines.push(`- **Link:** ${entry.url}`)
    if (entry.thumbnailUrl) lines.push(`- **Thumbnail:** ${entry.thumbnailUrl}`)
    if (entry.location) lines.push(`- **Location:** ${entry.location}`)
    if (entry.tags.length > 0) lines.push(`- **Tags:** ${entry.tags.map(t => `#${t}`).join(' ')}`)
    lines.push(`- **Summary:** ${entry.description}`)
    lines.push(`- **Added:** ${entry.addedAt}`)

    const existing = readFileSync(targetFile, 'utf-8')
    writeFileSync(targetFile, existing + lines.join('\n') + '\n', 'utf-8')

    // Remove from pending
    writePending(pending.filter(e => e.id !== id))
    return NextResponse.json({ ok: true })
  }

  // Deny a pending entry
  if (action === 'deny') {
    const { id } = body
    const pending = readPending()
    writePending(pending.filter(e => e.id !== id))
    return NextResponse.json({ ok: true })
  }

  // Create a new category
  if (action === 'create-category') {
    const { name, emoji } = body
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const targetFile = join(SOCIAL_MEDIA_DIR, `${slug}.md`)
    if (existsSync(targetFile)) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 })
    }
    const content = `# ${emoji} ${name}\n\n> Saved from Instagram/Facebook/TikTok\n\n---\n\n<!-- entries will be added below -->\n`
    writeFileSync(targetFile, content, 'utf-8')
    return NextResponse.json({ ok: true, slug })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
