'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Module {
  id: string
  title: string
  description: string
  content: string
  category: string
  sort_order: number
  created_at: string
  updated_at: string
}

const CATEGORIES = ['All', 'Getting Started', 'Agents', 'Skills', 'Automation', 'Advanced', 'My Changes']

// ─── Panel ────────────────────────────────────────────────────────────────────

export function SkoolPanel() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState<Module | null>(null)
  const [category, setCategory] = useState('All')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', content: '', category: 'My Changes' })

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch('/api/skool')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setModules(data.modules || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchModules() }, [fetchModules])

  const filtered = category === 'All' ? modules : modules.filter(m => m.category === category)

  function openModule(m: Module) {
    setActiveModule(m)
    setAdding(false)
    setEditing(false)
  }

  function startAdd() {
    setForm({ title: '', description: '', content: '', category: 'My Changes' })
    setAdding(true)
    setActiveModule(null)
    setEditing(false)
  }

  async function saveNew() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/skool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      await fetchModules()
      setActiveModule(data.module)
      setAdding(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
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

  async function saveEdit() {
    if (!activeModule || !form.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/skool/${activeModule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      await fetchModules()
      setActiveModule(data.module)
      setEditing(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function deleteModule(id: string) {
    if (!confirm('Delete this module?')) return
    try {
      await fetch(`/api/skool/${id}`, { method: 'DELETE' })
      await fetchModules()
      if (activeModule?.id === id) setActiveModule(null)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex h-full min-h-0">

      {/* ── Sidebar ─────────────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col h-full">
        <div className="px-4 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎓</span>
            <h1 className="text-base font-bold text-foreground">Skool</h1>
          </div>
          <p className="text-xs text-muted-foreground">OpenClaw tutorials & docs</p>
        </div>

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

        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">Loading...</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">No modules in this category yet.</p>
          )}
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => openModule(m)}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${
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
          <ModuleForm
            form={form}
            setForm={setForm}
            onSave={saveNew}
            onCancel={() => setAdding(false)}
            saving={saving}
            title="New Module"
          />
        )}

        {/* Edit form */}
        {editing && activeModule && (
          <ModuleForm
            form={form}
            setForm={setForm}
            onSave={saveEdit}
            onCancel={() => setEditing(false)}
            saving={saving}
            title="Edit Module"
          />
        )}

        {/* Module viewer */}
        {!adding && !editing && activeModule && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary">{activeModule.category}</span>
                  <span className="text-[10px] text-muted-foreground/50">Updated {activeModule.updated_at}</span>
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
                Your OpenClaw tutorial library. Pick a module from the sidebar or create a new one.
              </p>
            </div>
            <Button onClick={startAdd}>+ New Module</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Module Form ──────────────────────────────────────────────────────────────

function ModuleForm({ form, setForm, onSave, onCancel, saving, title }: {
  form: { title: string; description: string; content: string; category: string }
  setForm: (fn: (f: typeof form) => typeof form) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  title: string
}) {
  const CATS = ['Getting Started', 'Agents', 'Skills', 'Automation', 'Advanced', 'My Changes']
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
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
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Content (Markdown)</label>
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={18}
            placeholder="Write your module content in Markdown..."
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono resize-y"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={onSave} size="sm" disabled={saving}>
            {saving ? 'Saving...' : 'Save Module'}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Simple Markdown renderer ─────────────────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
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
      i++; continue
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-bold text-foreground mt-6 mb-3 first:mt-0">{line.slice(2)}</h1>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-semibold text-foreground mt-5 mb-2 border-b border-border pb-1">{line.slice(3)}</h2>)
      i++; continue
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-1">{line.slice(4)}</h3>)
      i++; continue
    }
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
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
      i++; continue
    }
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
