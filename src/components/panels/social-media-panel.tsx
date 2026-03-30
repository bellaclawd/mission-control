'use client'

import { useState, useEffect, useMemo } from 'react'

interface Entry {
  name: string
  link: string
  location: string
  tags: string[]
  summary: string
  added: string
  thumbnail: string
}

interface Category {
  name: string
  file: string
  slug: string
  emoji: string
  entries: Entry[]
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

interface SocialMediaData {
  categories: Category[]
  pending: PendingEntry[]
}

const EMOJI_OPTIONS = ['🍽️', '🍸', '👨‍🍳', '🏖️', '🎭', '📌', '☕', '🛍️', '🎵', '🍕', '🍣', '🏋️']

export function SocialMediaPanel() {
  const [data, setData] = useState<SocialMediaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<'browse' | 'categories'>('browse')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/social-media')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = data?.pending?.length ?? 0

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Social Media Saves</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Links forwarded to Bella, organised by category</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border bg-card hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshIcon spinning={loading} />
          Refresh
        </button>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {(['browse', 'categories'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors relative ${
              mainTab === tab
                ? 'text-foreground border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'browse' ? (
              <span className="flex items-center gap-1.5">
                Browse
                {pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                    {pendingCount}
                  </span>
                )}
              </span>
            ) : 'Categories'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Loading...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error: {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {mainTab === 'browse' && (
            <>
              {data.pending.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-amber-500 text-white">{data.pending.length}</span>
                    <h3 className="text-sm font-semibold text-amber-400">Pending Approval</h3>
                  </div>
                  {data.pending.map(entry => (
                    <PendingCard
                      key={entry.id}
                      entry={entry}
                      categories={data.categories}
                      onAction={load}
                    />
                  ))}
                  <div className="border-t border-border pt-3" />
                </div>
              )}
              <BrowseTab categories={data.categories} />
            </>
          )}
          {mainTab === 'categories' && (
            <CategoriesTab categories={data.categories} onRefresh={load} />
          )}
        </>
      )}
    </div>
  )
}

// ─── Pending Tab ─────────────────────────────────────────────────────────────

function PendingTab({
  pending,
  categories,
  onRefresh,
}: {
  pending: PendingEntry[]
  categories: Category[]
  onRefresh: () => void
}) {
  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="text-4xl">✅</div>
        <p className="text-sm font-medium text-foreground">All clear!</p>
        <p className="text-xs text-muted-foreground">Send Bella a link on WhatsApp to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pending.map(entry => (
        <PendingCard
          key={entry.id}
          entry={entry}
          categories={categories}
          onAction={onRefresh}
        />
      ))}
    </div>
  )
}

function PendingCard({
  entry,
  categories,
  onAction,
}: {
  entry: PendingEntry
  categories: Category[]
  onAction: () => void
}) {
  const [selectedCategory, setSelectedCategory] = useState(entry.category)
  const [creating, setCreating] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('📌')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    try {
      const res = await fetch('/api/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id: entry.id, category: selectedCategory }),
      })
      const json = await res.json()
      if (!res.ok) { setFeedback(`Error: ${json.error}`); return }
      onAction()
    } catch (e) {
      setFeedback('Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function deny() {
    setBusy(true)
    try {
      await fetch('/api/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deny', id: entry.id }),
      })
      onAction()
    } catch {
      setFeedback('Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function createCategory() {
    if (!newCatName.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-category', name: newCatName.trim(), emoji: newCatEmoji }),
      })
      const json = await res.json()
      if (!res.ok) { setFeedback(`Error: ${json.error}`); return }
      setSelectedCategory(json.slug)
      setCreating(false)
      setNewCatName('')
      onAction()
    } catch {
      setFeedback('Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Title + link */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">{entry.name}</h3>
          {entry.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <span>📍</span>{entry.location}
            </p>
          )}
        </div>
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Open ↗
        </a>
      </div>

      {/* Description */}
      {entry.description && (
        <p className="text-sm text-foreground/80 leading-relaxed">{entry.description}</p>
      )}

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{tag}</span>
          ))}
        </div>
      )}

      {/* Category selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Category</label>
        <select
          value={creating ? '__new__' : selectedCategory}
          onChange={e => {
            if (e.target.value === '__new__') {
              setCreating(true)
            } else {
              setCreating(false)
              setSelectedCategory(e.target.value)
            }
          }}
          className="w-full text-sm bg-card border border-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {categories.map(c => (
            <option key={c.slug} value={c.slug}>{c.emoji} {c.name}</option>
          ))}
          <option value="__new__">＋ Create new category...</option>
        </select>

        {/* New category inline form */}
        {creating && (
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <input
              type="text"
              placeholder="Category name..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="w-full text-sm bg-card border border-border rounded-md px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map(em => (
                <button
                  key={em}
                  onClick={() => setNewCatEmoji(em)}
                  className={`w-8 h-8 text-lg rounded-md transition-colors ${
                    newCatEmoji === em ? 'bg-primary/20 ring-1 ring-primary' : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={createCategory}
                disabled={busy || !newCatName.trim()}
                className="flex-1 text-xs py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewCatName('') }}
                className="flex-1 text-xs py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <p className="text-xs text-destructive">{feedback}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={approve}
          disabled={busy || creating}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md bg-green-600/10 border border-green-600/30 text-green-500 hover:bg-green-600/20 disabled:opacity-50 transition-colors"
        >
          ✓ Approve
        </button>
        <button
          onClick={deny}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
        >
          ✗ Deny
        </button>
      </div>
    </div>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  restaurants: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  nightlife:   'bg-purple-500/15 text-purple-400 border-purple-500/30',
  recipes:     'bg-green-500/15 text-green-400 border-green-500/30',
  activities:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  entertainment: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
}

function getCategoryColor(slug: string) {
  return CATEGORY_COLORS[slug.toLowerCase()] ?? 'bg-muted text-muted-foreground border-border'
}

// ─── Browse Tab ───────────────────────────────────────────────────────────────

function BrowseTab({ categories }: { categories: Category[] }) {
  const [activeCategory, setActiveCategory] = useState<string>('__all__')
  const [search, setSearch] = useState('')

  const searchLower = search.trim().toLowerCase()

  const allEntries = useMemo(() =>
    categories.flatMap(c => c.entries.map(e => ({ ...e, categoryName: c.name, categoryEmoji: c.emoji, categorySlug: c.slug }))),
    [categories]
  )

  const displayEntries = useMemo(() => {
    let entries = activeCategory === '__all__'
      ? allEntries
      : allEntries.filter(e => e.categorySlug === activeCategory)

    if (searchLower) {
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(searchLower) ||
        e.location.toLowerCase().includes(searchLower) ||
        e.summary.toLowerCase().includes(searchLower) ||
        e.tags.some(t => t.toLowerCase().includes(searchLower))
      )
    }
    return entries
  }, [allEntries, activeCategory, searchLower])

  const totalAll = allEntries.length

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search across all categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <ClearIcon />
          </button>
        )}
      </div>

      {/* Category filter tabs — All + per category */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setActiveCategory('__all__')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            activeCategory === '__all__'
              ? 'bg-primary/10 border-primary/30 text-primary font-medium'
              : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          All
          <span className="text-xs opacity-60">({totalAll})</span>
        </button>
        {categories.map(cat => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              activeCategory === cat.slug
                ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.name}</span>
            <span className="text-xs opacity-60">({cat.entries.length})</span>
          </button>
        ))}
      </div>

      {searchLower && (
        <p className="text-xs text-muted-foreground">
          {displayEntries.length === 0 ? `No results for "${search}"` : `${displayEntries.length} result${displayEntries.length !== 1 ? 's' : ''} for "${search}"`}
        </p>
      )}

      {displayEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="text-4xl">📱</div>
          <p className="text-sm font-medium text-foreground">No saves yet</p>
          <p className="text-xs text-muted-foreground">Send Bella a link on WhatsApp and approve it in the Pending tab!</p>
        </div>
      )}

      {displayEntries.length > 0 && (
        <div className="space-y-3">
          {displayEntries.map((entry, i) => (
            <EntryCard key={`${entry.name}-${i}`} entry={entry} showCategory={activeCategory === '__all__'} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📌')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    if (!newName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-category', name: newName.trim(), emoji: newEmoji }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      setShowForm(false)
      setNewName('')
      setNewEmoji('📌')
      onRefresh()
    } catch {
      setError('Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          ＋ New Category
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">New Category</h3>
          <input
            type="text"
            placeholder="Category name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full text-sm bg-muted border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Pick an emoji</p>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(em => (
                <button
                  key={em}
                  onClick={() => setNewEmoji(em)}
                  className={`w-9 h-9 text-xl rounded-md transition-colors ${
                    newEmoji === em ? 'bg-primary/20 ring-1 ring-primary' : 'bg-muted border border-border hover:bg-muted/80'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={busy || !newName.trim()}
              className="flex-1 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Create Category
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              className="flex-1 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="text-4xl">📂</div>
          <p className="text-sm text-muted-foreground">No categories yet — create one above!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(cat => (
            <div key={cat.slug} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
              <div className="text-3xl">{cat.emoji}</div>
              <div>
                <p className="font-medium text-foreground text-sm">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.entries.length} save{cat.entries.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, showCategory }: { entry: Entry & { categoryName: string; categoryEmoji: string; categorySlug: string }; showCategory: boolean }) {
  const [imgError, setImgError] = useState(false)
  const catColor = getCategoryColor(entry.categorySlug)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-border/60 transition-colors flex">
      {/* Thumbnail */}
      {entry.thumbnail && !imgError ? (
        <div className="w-24 shrink-0 bg-muted relative overflow-hidden">
          <img
            src={entry.thumbnail}
            alt={entry.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-16 shrink-0 bg-muted flex items-center justify-center text-2xl">
          {entry.categoryEmoji}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
        {/* Name + link */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2" title={entry.name}>
            {entry.name}
          </h3>
          {entry.link && (
            <a href={entry.link} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
              Open ↗
            </a>
          )}
        </div>

        {/* Category badge + location */}
        <div className="flex items-center gap-2 flex-wrap">
          {showCategory && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${catColor}`}>
              {entry.categoryEmoji} {entry.categoryName}
            </span>
          )}
          {entry.location && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <span>📍</span>{entry.location}
            </span>
          )}
        </div>

        {/* Summary */}
        {entry.summary && (
          <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">{entry.summary}</p>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.slice(0, 5).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">#{tag}</span>
            ))}
          </div>
        )}

        {entry.added && (
          <p className="text-xs text-muted-foreground/50 mt-auto">Added {entry.added}</p>
        )}
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`}>
      <path d="M13.5 8A5.5 5.5 0 112.5 5" />
      <path d="M2.5 2v3h3" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none">
      <circle cx="6.5" cy="6.5" r="4" />
      <path d="M14 14l-3-3" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M12 4L4 12M4 4l8 8" />
    </svg>
  )
}
