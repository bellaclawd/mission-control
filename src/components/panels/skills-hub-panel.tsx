'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Skill {
  name: string
  description?: string
  emoji?: string
  eligible?: boolean
  source?: string
  homepage?: string
  missing?: { bins?: string[]; env?: string[] }
  disabled?: boolean
  _stats?: { downloads: number; installs: number; stars: number; version: string | null } | null
}

interface RegistryStats {
  downloads: number
  installsAllTime: number
  stars: number
  versions: number
}

interface SkillDetail extends Skill {
  filePath?: string
  skillContent?: string
  requirements?: { bins?: string[]; env?: string[] }
  install?: Array<{ id: string; kind: string; label: string }>
  registry?: {
    skill?: { stats?: RegistryStats; displayName?: string; summary?: string }
    latestVersion?: { version?: string; changelog?: string }
    owner?: { handle?: string; displayName?: string }
  } | null
}

const SOURCE_COLORS: Record<string, string> = {
  'openclaw-bundled': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'openclaw': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'workspace': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
}

function SkillCard({ skill, onClick, selected }: { skill: Skill; onClick: () => void; selected: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3.5 transition-all hover:border-primary/40 group ${
        selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-card/80'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{skill.emoji || '🔧'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{skill.name}</span>
            {skill.eligible && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                ✓ ready
              </span>
            )}
            {skill.disabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                disabled
              </span>
            )}
            {skill._stats && (
              <span className="flex items-center gap-2 ml-auto text-[10px] text-muted-foreground flex-shrink-0">
                <span title="Downloads">⬇ {skill._stats.downloads.toLocaleString()}</span>
                <span title="Installs">📦 {skill._stats.installs.toLocaleString()}</span>
                <span title="Stars">⭐ {skill._stats.stars}</span>
                {skill._stats.version && <span className="text-green-400/70">v{skill._stats.version}</span>}
              </span>
            )}
          </div>
          {skill.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{skill.description}</p>
          )}
          {skill.missing?.bins && skill.missing.bins.length > 0 && (
            <p className="text-[10px] text-amber-400/80 mt-1">needs: {skill.missing.bins.join(', ')}</p>
          )}
        </div>
      </div>
    </button>
  )
}

function ActionPanel({
  skill,
  detail,
  loading,
  onInstall,
  onAnalyze,
  onFork,
}: {
  skill: Skill
  detail: SkillDetail | null
  loading: boolean
  onInstall: () => void
  onAnalyze: () => void
  onFork: () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border flex-shrink-0">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{skill.emoji || '🔧'}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg text-foreground">{skill.name}</h3>
            {skill.source && (
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mt-1 ${SOURCE_COLORS[skill.source] || 'bg-muted text-muted-foreground border-border'}`}>
                {skill.source}
              </span>
            )}
          </div>
          {skill.eligible ? (
            <span className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">✓ Installed & Ready</span>
          ) : (
            <span className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Not Installed</span>
          )}
        </div>

        {skill.description && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{skill.description}</p>
        )}

        {skill.homepage && (
          <a href={skill.homepage} target="_blank" rel="noopener noreferrer"
            className="inline-block text-xs text-primary hover:underline mt-2">
            {skill.homepage} ↗
          </a>
        )}

        {/* ClawHub registry stats */}
        {!loading && detail?.registry?.skill?.stats && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            <div className="bg-card/60 rounded-lg p-2.5 border border-border/50 text-center">
              <div className="text-lg font-bold font-mono text-foreground">
                {detail.registry.skill.stats.downloads.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">downloads</div>
            </div>
            <div className="bg-card/60 rounded-lg p-2.5 border border-border/50 text-center">
              <div className="text-lg font-bold font-mono text-blue-400">
                {detail.registry.skill.stats.installsAllTime.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">installs</div>
            </div>
            <div className="bg-card/60 rounded-lg p-2.5 border border-border/50 text-center">
              <div className="text-lg font-bold font-mono text-amber-400">
                {detail.registry.skill.stats.stars.toLocaleString()} ⭐
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">stars</div>
            </div>
            <div className="bg-card/60 rounded-lg p-2.5 border border-border/50 text-center">
              <div className="text-sm font-bold font-mono text-green-400">
                v{detail.registry?.latestVersion?.version || '—'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">version</div>
            </div>
          </div>
        )}
        {!loading && detail?.registry?.owner && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">by</span>
            <span className="text-[10px] text-foreground/70">{detail.registry.owner.displayName || detail.registry.owner.handle}</span>
          </div>
        )}

        {/* Requirements */}
        {detail && (detail.requirements?.bins?.length || detail.requirements?.env?.length) ? (
          <div className="mt-3 p-3 rounded-lg bg-card border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Requirements</p>
            {detail.requirements?.bins?.map(b => (
              <span key={b} className={`inline-block mr-1.5 mb-1 text-[10px] px-2 py-0.5 rounded border ${
                skill.missing?.bins?.includes(b)
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-green-500/10 text-green-400 border-green-500/20'
              }`}>
                {skill.missing?.bins?.includes(b) ? '✗' : '✓'} {b}
              </span>
            ))}
            {detail.requirements?.env?.map(e => (
              <span key={e} className={`inline-block mr-1.5 mb-1 text-[10px] px-2 py-0.5 rounded border ${
                skill.missing?.env?.includes(e)
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-green-500/10 text-green-400 border-green-500/20'
              }`}>
                {skill.missing?.env?.includes(e) ? '✗' : '✓'} {e}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Action buttons */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <button onClick={onInstall}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 text-green-400 transition-colors group">
            <span className="text-xl">📦</span>
            <span className="text-xs font-medium">Install</span>
          </button>
          <button onClick={onAnalyze}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 transition-colors">
            <span className="text-xl">🔍</span>
            <span className="text-xs font-medium">Analyze</span>
          </button>
          <button onClick={onFork}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 transition-colors">
            <span className="text-xl">🍴</span>
            <span className="text-xs font-medium">Make Mine</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <p className="text-[10px] text-muted-foreground text-center">Run openclaw skills install</p>
          <p className="text-[10px] text-muted-foreground text-center">Bella reads & explains it</p>
          <p className="text-[10px] text-muted-foreground text-center">Bella builds a custom version</p>
        </div>
      </div>

      {/* SKILL.md preview */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-sm text-muted-foreground">Loading skill details...</p>}
        {!loading && detail?.skillContent && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">SKILL.md</p>
            <pre className="text-xs text-foreground/70 whitespace-pre-wrap font-mono leading-relaxed bg-card/50 rounded-lg p-3 border border-border/30">
              {detail.skillContent}
            </pre>
          </div>
        )}
        {!loading && !detail?.skillContent && (
          <p className="text-xs text-muted-foreground">No SKILL.md available for this skill.</p>
        )}
      </div>
    </div>
  )
}

function InstallModal({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running')
  const [output, setOutput] = useState('')

  useEffect(() => {
    fetch('/api/clawhub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'install', name: skill.name }),
    })
      .then(r => r.json())
      .then(d => {
        setOutput(d.output || '')
        setStatus(d.success ? 'done' : 'error')
      })
      .catch(e => {
        setOutput(e.message)
        setStatus('error')
      })
  }, [skill.name])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Installing {skill.name}</h3>
          {status !== 'running' && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">×</button>
          )}
        </div>
        <div className="p-5">
          {status === 'running' && (
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Running openclaw skills install {skill.name}...
            </div>
          )}
          {status === 'done' && <p className="text-green-400 text-sm mb-3">✓ Installed successfully</p>}
          {status === 'error' && <p className="text-red-400 text-sm mb-3">✗ Installation failed</p>}
          {output && (
            <pre className="text-xs font-mono text-foreground/70 bg-card rounded-lg p-3 border border-border whitespace-pre-wrap max-h-64 overflow-y-auto mt-3">
              {output}
            </pre>
          )}
        </div>
        {status !== 'running' && (
          <div className="p-5 pt-0">
            <button onClick={onClose} className="w-full py-2 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:text-foreground">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AgentTaskModal({
  skill,
  mode,
  skillContent,
  onClose,
}: {
  skill: Skill
  mode: 'analyze' | 'fork'
  skillContent: string
  onClose: () => void
}) {
  const prompt = mode === 'analyze'
    ? `Please analyze this skill and explain what it does, what it requires, how it works, and any security considerations:\n\n**Skill:** ${skill.name}\n\n\`\`\`\n${skillContent}\n\`\`\``
    : `Please create a custom version of this skill tailored for my setup. Improve it, make it smarter, and adapt it for how I actually use things:\n\n**Original skill:** ${skill.name}\n\n\`\`\`\n${skillContent}\n\`\`\``

  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-foreground">
              {mode === 'analyze' ? '🔍 Analyze' : '🍴 Make Mine'}: {skill.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === 'analyze'
                ? 'Send this prompt to Bella to get a full skill analysis'
                : 'Send this prompt to Bella to build a custom version'}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed bg-card rounded-lg p-4 border border-border">
            {prompt}
          </pre>
        </div>
        <div className="p-5 border-t border-border flex gap-3 flex-shrink-0">
          <button onClick={copy}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
            {copied ? '✓ Copied!' : 'Copy Prompt'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm bg-card border border-border text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function SkillsHubPanel() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'ready' | 'not-installed'>('all')
  const [sortBy, setSortBy] = useState<'' | 'downloads' | 'installs' | 'stars'>('')
  const [sortLoading, setSortLoading] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [detail, setDetail] = useState<SkillDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [modal, setModal] = useState<{ type: 'install' | 'analyze' | 'fork'; skill: Skill } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSkills = useCallback(async (q: string, sort: string = '') => {
    if (sort) setSortLoading(true)
    else setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ action: q ? 'search' : 'list' })
      if (q) params.set('q', q)
      if (sort) params.set('sort', sort)
      const res = await fetch(`/api/clawhub?${params}`)
      if (!res.ok) throw new Error('Failed to load skills')
      const data = await res.json()
      setSkills(data.skills || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setSortLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSkills('')
  }, [fetchSkills])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSkills(query, sortBy), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, sortBy, fetchSkills])

  const selectSkill = async (skill: Skill) => {
    setSelectedSkill(skill)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch('/api/clawhub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_skill_content', name: skill.name }),
      })
      const data = await res.json()
      setDetail(data)
    } catch { /* best effort */ }
    finally { setDetailLoading(false) }
  }

  const filteredSkills = skills.filter(s => {
    if (filter === 'ready') return s.eligible
    if (filter === 'not-installed') return !s.eligible
    return true
  })

  const readyCount = skills.filter(s => s.eligible).length

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-foreground">Skills Hub</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Browse, install, analyze, and fork OpenClaw skills</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{readyCount}/{skills.length} ready</span>
          <button onClick={() => fetchSkills(query)} className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground text-sm">↻</button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: skill list */}
        <div className="w-96 flex flex-col border-r border-border flex-shrink-0">
          {/* Search + filters */}
          <div className="p-3 border-b border-border space-y-2 flex-shrink-0">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search skills..."
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-1.5">
              {(['all', 'ready', 'not-installed'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1 text-xs rounded-md font-medium transition-colors ${
                    filter === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}>
                  {f === 'all' ? 'All' : f === 'ready' ? '✓ Ready' : 'Not Installed'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 items-center">
              <span className="text-[10px] text-muted-foreground mr-0.5">Sort:</span>
              {([['', 'Default'], ['downloads', '⬇ Downloads'], ['installs', '📦 Installs'], ['stars', '⭐ Stars']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setSortBy(val)}
                  className={`py-0.5 px-1.5 text-[10px] rounded font-medium transition-colors ${
                    sortBy === val ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}>
                  {sortLoading && sortBy === val ? '...' : label}
                </button>
              ))}
            </div>
          </div>

          {/* Skill list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Loading...
              </div>
            )}
            {!loading && error && (
              <div className="p-3 text-red-400 text-sm bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>
            )}
            {!loading && !error && filteredSkills.length === 0 && (
              <div className="text-center py-12 text-muted-foreground/50">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm">No skills found</p>
              </div>
            )}
            {!loading && filteredSkills.map(skill => (
              <SkillCard
                key={skill.name}
                skill={skill}
                selected={selectedSkill?.name === skill.name}
                onClick={() => selectSkill(skill)}
              />
            ))}
          </div>
        </div>

        {/* Right: detail + actions */}
        <div className="flex-1 min-w-0">
          {!selectedSkill ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="text-5xl">🔧</div>
              <p className="text-muted-foreground text-sm">Select a skill to view details</p>
              <p className="text-muted-foreground/50 text-xs">Install, analyze, or build your own version</p>
            </div>
          ) : (
            <ActionPanel
              skill={selectedSkill}
              detail={detail}
              loading={detailLoading}
              onInstall={() => setModal({ type: 'install', skill: selectedSkill })}
              onAnalyze={() => setModal({ type: 'analyze', skill: selectedSkill })}
              onFork={() => setModal({ type: 'fork', skill: selectedSkill })}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'install' && (
        <InstallModal skill={modal.skill} onClose={() => { setModal(null); fetchSkills(query) }} />
      )}
      {(modal?.type === 'analyze' || modal?.type === 'fork') && (
        <AgentTaskModal
          skill={modal.skill}
          mode={modal.type}
          skillContent={detail?.skillContent || ''}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
