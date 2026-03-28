'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface FileEntry {
  id: string
  name: string
  path: string
  relPath: string
  agent: string
  workspace: string
  ext: string
  size: number
  modifiedAt: number
  previewable: boolean
}

const AGENT_COLOR_PALETTE = [
  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'bg-green-500/15 text-green-400 border-green-500/30',
  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
]

function getAgentColor(name: string, agentList: string[]): string {
  const idx = agentList.indexOf(name)
  return AGENT_COLOR_PALETTE[(idx < 0 ? 0 : idx) % AGENT_COLOR_PALETTE.length]
}

const EXT_FILTERS = ['all', '.md', '.json', '.py', '.js', '.ts', '.txt', 'other']

const CORE_FILENAMES = new Set([
  'HEARTBEAT.md', 'USER.md', 'MEMORY.md', 'IDENTITY.md',
  'TOOLS.md', 'AGENTS.md', 'SOUL.md',
])

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatDate(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function FilesPanel() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [agentList, setAgentList] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [agentFilter, setAgentFilter] = useState('all')
  const [extFilter, setExtFilter] = useState('all')
  const [coreOnly, setCoreOnly] = useState(false)
  const [selected, setSelected] = useState<FileEntry | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchFiles = useCallback(async (q: string, agent: string, ext: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (agent !== 'all') params.set('agent', agent)
      if (ext !== 'all') params.set('ext', ext)
      const res = await fetch(`/api/files?${params}`)
      if (!res.ok) throw new Error('Failed to load files')
      const data = await res.json()
      setFiles(data.files || [])
      setTotal(data.total || 0)
      if (data.agents?.length) setAgentList(data.agents)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchFiles(query, agentFilter, extFilter)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, agentFilter, extFilter, fetchFiles])

  const loadPreview = async (file: FileEntry) => {
    setSelected(file)
    setPreview(null)
    if (!file.previewable) return
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/files/preview?path=${encodeURIComponent(file.path)}`)
      const data = await res.json()
      setPreview(data.content || '')
    } catch {
      setPreview('Could not load preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-bold text-foreground">Files</h2>
        <span className="text-sm text-muted-foreground">{total} files</span>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search files..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full max-w-sm bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border flex-shrink-0">
        <div className="flex gap-1">
          <span className="text-xs text-muted-foreground mr-1 self-center">Agent:</span>
          {['all', ...agentList].map(a => (
            <button key={a} onClick={() => setAgentFilter(a)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                agentFilter === a ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}>
              {a === 'all' ? 'All' : a}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <span className="text-xs text-muted-foreground mr-1 self-center">Type:</span>
          {EXT_FILTERS.map(e => (
            <button key={e} onClick={() => setExtFilter(e)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                extFilter === e ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}>
              {e === 'all' ? 'All' : e}
            </button>
          ))}
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-1 self-center">Show:</span>
          <button onClick={() => setCoreOnly(v => !v)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              coreOnly ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}>
            🧠 Core
          </button>
        </div>
        <button onClick={() => fetchFiles(query, agentFilter, extFilter)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground">
          ↻ Refresh
        </button>
      </div>

      {/* Main content: file list + preview */}
      <div className="flex-1 flex min-h-0">
        {/* File list */}
        <div className="w-1/2 border-r border-border overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Loading files...
            </div>
          )}
          {!loading && error && (
            <div className="p-4 text-red-400 text-sm">{error}</div>
          )}
          {!loading && !error && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-sm">No files found</p>
            </div>
          )}
          {!loading && files.filter(f => !coreOnly || CORE_FILENAMES.has(f.name)).map(file => (
            <div
              key={file.id}
              onClick={() => loadPreview(file)}
              className={`flex items-start gap-3 px-4 py-3 border-b border-border/40 cursor-pointer hover:bg-card/60 transition-colors ${
                selected?.id === file.id ? 'bg-card border-l-2 border-l-primary' : ''
              }`}
            >
              <div className="text-xl flex-shrink-0 mt-0.5">
                {file.ext === '.md' ? '📝' : file.ext === '.json' ? '🗂️' : file.ext === '.py' ? '🐍' : file.ext === '.html' ? '🌐' : '📄'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground truncate">{file.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getAgentColor(file.agent, agentList)}`}>
                    {file.agent}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground/70 truncate mt-0.5">{file.relPath}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground/50">{formatSize(file.size)}</span>
                  <span className="text-[10px] text-muted-foreground/50">{formatDate(file.modifiedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Preview panel */}
        <div className="w-1/2 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground/40">
              <div className="text-center">
                <div className="text-4xl mb-2">👈</div>
                <p className="text-sm">Select a file to preview</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 border-b border-border flex-shrink-0">
                <span className="font-medium text-sm text-foreground">{selected.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getAgentColor(selected.agent, agentList)}`}>{selected.agent}</span>
                <span className="text-xs text-muted-foreground ml-auto">{formatSize(selected.size)}</span>
                <a
                  href={`/api/files/preview?path=${encodeURIComponent(selected.path)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Raw ↗
                </a>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {previewLoading && <p className="text-sm text-muted-foreground">Loading preview...</p>}
                {!previewLoading && preview !== null && (
                  <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">{preview}</pre>
                )}
                {!previewLoading && preview === null && !selected.previewable && (
                  <p className="text-sm text-muted-foreground">Binary file — no preview available.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
