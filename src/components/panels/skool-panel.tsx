'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Module {
  id: string
  title: string
  description: string
  content: string
  category: string
  order: number
  createdAt: string
  updatedAt: string
}

// ─── Seed data — edit these or add more via the UI ───────────────────────────

const INITIAL_MODULES: Module[] = [
  {
    id: 'intro',
    title: 'What is OpenClaw?',
    description: 'Overview of what OpenClaw is and what it can do for you.',
    content: `# What is OpenClaw?

OpenClaw is a personal AI agent platform. It connects AI models (Claude, GPT, local LLMs) to your real life — your files, calendar, messages, smart home, code, and more.

## Key Concepts

- **Agents** — AI assistants with personalities, memory, and tools. Each agent has a role (CEO, VP of Pokémon, etc.)
- **Mission Control** — This dashboard. Where you monitor and manage everything.
- **Skills** — Modular capabilities you can install (web scraping, image gen, email, etc.)
- **Channels** — How agents receive and send messages (Discord, Telegram, WhatsApp, etc.)
- **Gateway** — The backbone service that routes everything together.

## What makes it different?

OpenClaw agents remember things between sessions using memory files. They can take real actions — send messages, run code, control lights, browse the web — not just answer questions.`,
    category: 'Getting Started',
    order: 1,
    createdAt: '2026-03-29',
    updatedAt: '2026-03-29',
  },
  {
    id: 'setup',
    title: 'Initial Setup',
    description: 'How to install OpenClaw and get Mission Control running.',
    content: `# Initial Setup

## Install OpenClaw

\`\`\`bash
npm install -g openclaw
\`\`\`

## Start the Gateway

\`\`\`bash
openclaw gateway start
\`\`\`

## Set Up Mission Control

\`\`\`bash
git clone https://github.com/bellaclawd/mission-control.git
cd mission-control
pnpm install
cp .env.example .env.local
# Fill in your .env.local (see SETUP.md)
pnpm build
pnpm start
\`\`\`

Open http://localhost:3000 — you should see Mission Control.

## Get Your Gateway Token

\`\`\`bash
openclaw config get auth.token
\`\`\`

Paste this into your \`.env.local\` as \`OPENCLAW_GATEWAY_TOKEN\` and \`NEXT_PUBLIC_GATEWAY_TOKEN\`.`,
    category: 'Getting Started',
    order: 2,
    createdAt: '2026-03-29',
    updatedAt: '2026-03-29',
  },
  {
    id: 'agents',
    title: 'Creating Your First Agent',
    description: 'How to create, configure, and customize an agent.',
    content: `# Creating Your First Agent

## What is an agent?

An agent is an AI with a specific role, personality, memory, and set of tools. You can have multiple agents for different purposes.

## Agent Config Files

Every agent lives in your workspace directory (\`~/.openclaw/workspace-*\`):

- \`SOUL.md\` — personality and tone
- \`IDENTITY.md\` — name, role, emoji, avatar
- \`USER.md\` — info about the human they help
- \`MEMORY.md\` — long-term memory (updated over time)
- \`AGENTS.md\` — rules and conventions

## Connecting an Agent to a Channel

In \`openclaw.json\`, add your agent under \`agents\` and bind it to a channel (Discord server, Telegram bot, etc.).

## Example: Discord Agent

1. Create a Discord bot at discord.com/developers
2. Add the bot token to OpenClaw config
3. Bind the agent to a Discord channel in \`openclaw.json\`
4. Your agent will now respond to messages in that channel`,
    category: 'Agents',
    order: 3,
    createdAt: '2026-03-29',
    updatedAt: '2026-03-29',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Getting Started', 'Agents', 'Skills', 'Automation', 'Advanced', 'My Changes']

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function SkoolPanel() {
  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES)
  const [activeModule, setActiveModule] = useState<Module | null>(null)
  const [category, setCategory] = useState('All')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', content: '', category: 'My Changes' })

  const filtered = category === 'All'
    ? modules
    : modules.filter(m => m.category === category)

  function openModule(m: Module) {
    setActiveModule(m)
    setEditing(false)
  }

  function startAdd() {
    setForm({ title: '', description: '', content: '', category: 'My Changes' })
    setAdding(true)
    setActiveModule(null)
  }

  function saveNew() {
    if (!form.title.trim()) return
    const now = new Date().toISOString().slice(0, 10)
    const newMod: Module = {
      id: slugify(form.title),
      title: form.title.trim(),
      description: form.description.trim(),
      content: form.content.trim(),
      category: form.category,
      order: modules.length + 1,
      createdAt: now,
      updatedAt: now,
    }
    setModules(prev => [...prev, newMod])
    setActiveModule(newMod)
    setAdding(false)
  }

  function startEdit() {
    if (!activeModule) return
    setForm({
      title: activeModule.title,
      description: activeModule.description,
      content: activeModule.content,
      category: activeModule.category,
    })
    setEditing(true)
  }

  function saveEdit() {
    if (!activeModule || !form.title.trim()) return
    const now = new Date().toISOString().slice(0, 10)
    const updated = { ...activeModule, ...form, updatedAt: now }
    setModules(prev => prev.map(m => m.id === activeModule.id ? updated : m))
    setActiveModule(updated)
    setEditing(false)
  }

  function deleteModule(id: string) {
    setModules(prev => prev.filter(m => m.id !== id))
    if (activeModule?.id === id) setActiveModule(null)
  }

  return (
    <div className="flex h-full min-h-0">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col h-full">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎓</span>
            <h1 className="text-base font-bold text-foreground">Skool</h1>
          </div>
          <p className="text-xs text-muted-foreground">OpenClaw tutorials & docs</p>
        </div>

        {/* Category filter */}
        <div className="px-3 pt-3 pb-2 flex flex-wrap gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                category === cat
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Module list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">No modules yet in this category.</p>
          )}
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => openModule(m)}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors group ${
                activeModule?.id === m.id
                  ? 'bg-primary/15 text-primary'
                  : 'hover:bg-secondary/60 text-foreground'
              }`}
            >
              <div className="text-xs font-medium truncate">{m.title}</div>
              <div className="text-[10px] text-muted-foreground truncate mt-0.5">{m.description}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] px-1.5 py-px rounded bg-secondary text-muted-foreground/60">{m.category}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Add button */}
        <div className="px-3 py-3 border-t border-border shrink-0">
          <Button size="sm" className="w-full" onClick={startAdd}>
            + New Module
          </Button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Add form */}
        {adding && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">New Module</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Setting Up Discord"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Short description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="One sentence about what this covers"
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Content (Markdown)</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={16}
                  placeholder="Write your module content in Markdown..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono resize-y"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={saveNew} size="sm">Save Module</Button>
                <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit form */}
        {editing && activeModule && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Module</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Short description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Content (Markdown)</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={16}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-primary/50 font-mono resize-y"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={saveEdit} size="sm">Save Changes</Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Module viewer */}
        {!adding && !editing && activeModule && (
          <div className="max-w-2xl mx-auto">
            {/* Module header */}
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary">{activeModule.category}</span>
                  <span className="text-[10px] text-muted-foreground/50">Updated {activeModule.updatedAt}</span>
                </div>
                <h2 className="text-xl font-bold text-foreground">{activeModule.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{activeModule.description}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => deleteModule(activeModule.id)}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Rendered content */}
            <div className="prose prose-invert prose-sm max-w-none">
              <MarkdownRenderer content={activeModule.content} />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!adding && !editing && !activeModule && (
          <div className="flex flex-col items-center justify-center h-full py-24 text-center gap-4">
            <span className="text-5xl">🎓</span>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Welcome to Skool</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Your OpenClaw tutorial library. Pick a module from the sidebar or create a new one to document changes, tips, and how-tos.
              </p>
            </div>
            <Button onClick={startAdd}>+ New Module</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Simple Markdown renderer (no deps) ──────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="bg-black/40 border border-border rounded-lg p-4 overflow-x-auto my-3">
          <code className="text-xs font-mono text-green-300">{codeLines.join('\n')}</code>
        </pre>
      )
      i++
      continue
    }

    // H1
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-bold text-foreground mt-6 mb-3 first:mt-0">{line.slice(2)}</h1>)
      i++; continue
    }
    // H2
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-semibold text-foreground mt-5 mb-2 border-b border-border pb-1">{line.slice(3)}</h2>)
      i++; continue
    }
    // H3
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-1">{line.slice(4)}</h3>)
      i++; continue
    }
    // List item
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} className="my-2 space-y-1 pl-4">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-foreground/90 flex gap-2">
              <span className="text-primary mt-1 shrink-0">·</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      )
      continue
    }
    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
      i++; continue
    }
    // Normal paragraph
    elements.push(
      <p key={i} className="text-sm text-foreground/90 leading-relaxed my-1"
        dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
      />
    )
    i++
  }

  return <>{elements}</>
}

function inlineFormat(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-black/40 text-green-300 text-xs font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic text-foreground/80">$1</em>')
}
