'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface ChecklistItem {
  id: number
  title: string
  notes: string | null
  done: number
  done_at: number | null
  priority: 'high' | 'normal' | 'low'
  tags: string[]
  created_by: string
  created_at: number
  updated_at: number
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'text-red-400',
  normal: 'text-foreground',
  low: 'text-muted-foreground',
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
  normal: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  low: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-CA')
}

export function ChecklistPanel() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newPriority, setNewPriority] = useState<'high' | 'normal' | 'low'>('normal')
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchItems = useCallback(async (q: string, done: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (done) params.set('done', 'true')
      const res = await fetch(`/api/checklist?${params}`)
      if (!res.ok) throw new Error('Failed to load checklist')
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchItems(query, showDone), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, showDone, fetchItems])

  const toggleDone = async (item: ChecklistItem) => {
    const newDone = !item.done
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: newDone ? 1 : 0 } : i))
    await fetch('/api/checklist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, done: newDone }),
    })
    // Refetch after brief delay to update list
    setTimeout(() => fetchItems(query, showDone), 400)
  }

  const deleteItem = async (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/checklist?id=${id}`, { method: 'DELETE' })
  }

  const addItem = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), notes: newNotes.trim() || null, priority: newPriority, created_by: 'sev' }),
      })
      if (!res.ok) throw new Error('Failed to add')
      setNewTitle('')
      setNewNotes('')
      setNewPriority('normal')
      setAdding(false)
      fetchItems(query, showDone)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const pendingCount = items.filter(i => !i.done).length
  const doneCount = items.filter(i => i.done).length

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-bold text-foreground">Checklist</h2>
        <span className="text-sm text-muted-foreground">{pendingCount} pending</span>
        {doneCount > 0 && <span className="text-sm text-muted-foreground/50">{doneCount} done</span>}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search checklist..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full max-w-sm bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setShowDone(!showDone)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showDone ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
        >
          {showDone ? 'Hide done' : 'Show done'}
        </button>
        <Button onClick={() => setAdding(true)} size="sm">+ Add item</Button>
      </div>

      {/* Add item form */}
      {adding && (
        <div className="p-4 border-b border-border bg-card/40 flex flex-col gap-2">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            autoFocus
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            placeholder="Notes (optional)"
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            rows={2}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Priority:</span>
            {(['high', 'normal', 'low'] as const).map(p => (
              <button key={p} onClick={() => setNewPriority(p)}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${newPriority === p ? PRIORITY_BADGE[p] : 'border-border text-muted-foreground'}`}>
                {p}
              </button>
            ))}
            <div className="flex-1" />
            <Button onClick={() => { setAdding(false); setNewTitle(''); setNewNotes('') }} variant="secondary" size="sm">Cancel</Button>
            <Button onClick={addItem} disabled={!newTitle.trim() || saving} size="sm">
              {saving ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading...</div>
        )}
        {!loading && error && (
          <div className="p-4 text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-sm font-medium">Nothing here yet</p>
            <p className="text-xs mt-1">Ask Bella to add reminders, or click + Add item</p>
          </div>
        )}
        {!loading && items.map(item => (
          <div
            key={item.id}
            className={`flex items-start gap-3 px-5 py-3.5 border-b border-border/40 group transition-colors hover:bg-card/40 ${item.done ? 'opacity-50' : ''}`}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleDone(item)}
              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                item.done
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-border hover:border-primary'
              }`}
            >
              {item.done && <span className="text-xs">✓</span>}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-medium text-sm ${item.done ? 'line-through text-muted-foreground' : PRIORITY_STYLES[item.priority]}`}>
                  {item.title}
                </span>
                {item.priority !== 'normal' && (
                  <span className={`text-2xs px-1.5 py-0.5 rounded-full border ${PRIORITY_BADGE[item.priority]}`}>
                    {item.priority}
                  </span>
                )}
                <span className="text-2xs text-muted-foreground/40">{item.created_by}</span>
              </div>
              {item.notes && (
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{item.notes}</p>
              )}
              <div className="text-2xs text-muted-foreground/40 mt-1">
                {item.done && item.done_at ? `Done ${formatDate(item.done_at)}` : `Added ${formatDate(item.created_at)}`}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={() => deleteItem(item.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-400 transition-all text-xs mt-0.5"
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
