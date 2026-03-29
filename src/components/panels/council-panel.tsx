'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const AVAILABLE_MODELS = [
  { id: 'claude-sonnet', label: 'Claude Sonnet', color: '#f97316', provider: 'Anthropic' },
  { id: 'claude-opus', label: 'Claude Opus', color: '#ea580c', provider: 'Anthropic' },
  { id: 'claude-haiku', label: 'Claude Haiku', color: '#fb923c', provider: 'Anthropic' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', color: '#3b82f6', provider: 'Google' },
  { id: 'gemini-2.0-flash', label: 'Gemini Flash', color: '#60a5fa', provider: 'Google' },
  { id: 'gpt-4o', label: 'GPT-4o', color: '#10b981', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', color: '#059669', provider: 'OpenAI' },
]

interface DebateEntry {
  model: string
  label: string
  color: string
  round: number
  content: string
  role: 'debate' | 'conclusion'
  error?: boolean
}

interface SessionSummary {
  id: number
  topic: string
  models: string[]
  rounds: number
  status: string
  conclusion?: string
  created_at: number
}

interface SessionDetail extends SessionSummary {
  debate: DebateEntry[]
}

function ModelPill({ modelId, selected, onClick }: { modelId: string; selected: boolean; onClick: () => void }) {
  const m = AVAILABLE_MODELS.find(x => x.id === modelId)!
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? 'border-transparent text-white'
          : 'border-border text-muted-foreground hover:text-foreground bg-card'
      }`}
      style={selected ? { backgroundColor: m.color + '33', borderColor: m.color, color: m.color } : {}}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
      {m.label}
    </button>
  )
}

function DebateMessage({ entry, isNew }: { entry: DebateEntry; isNew?: boolean }) {
  const isConclusion = entry.role === 'conclusion'

  if (isConclusion) {
    return (
      <div className={`rounded-xl border-2 p-4 ${isNew ? 'animate-in fade-in slide-in-from-bottom-2' : ''}`}
        style={{ borderColor: '#a855f7' + '40', backgroundColor: '#a855f7' + '10' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-sm font-bold text-purple-400">⚖️ Council Conclusion</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entry.content}</p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border p-3.5 ${isNew ? 'animate-in fade-in slide-in-from-bottom-2' : ''}`}
      style={{ borderColor: entry.color + '30', backgroundColor: entry.color + '08' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
        <span className="text-xs font-semibold" style={{ color: entry.color }}>{entry.label}</span>
        <span className="text-[10px] text-muted-foreground/50 ml-auto">Round {entry.round}</span>
        {entry.error && <span className="text-[10px] text-red-400">⚠ error</span>}
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">{entry.content}</p>
    </div>
  )
}

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      {label} is thinking…
    </div>
  )
}

export function CouncilPanel() {
  const [topic, setTopic] = useState('')
  const [selectedModels, setSelectedModels] = useState(['claude-sonnet', 'claude-opus'])
  const [rounds, setRounds] = useState(3)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [thinking, setThinking] = useState<string | null>(null)
  const [newEntries, setNewEntries] = useState<Set<number>>(new Set())
  const [loadingHistory, setLoadingHistory] = useState(false)
  const debateEndRef = useRef<HTMLDivElement>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/council')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const scrollToBottom = () => {
    debateEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [activeSession?.debate?.length, thinking])

  const toggleModel = (id: string) => {
    setSelectedModels(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(m => m !== id) : prev) : [...prev, id]
    )
  }

  const loadSession = async (id: number) => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/council?id=${id}`)
      if (res.ok) {
        const data = await res.json()
        setActiveSession(data)
      }
    } catch { /* ignore */ }
    setLoadingHistory(false)
  }

  const startCouncil = async () => {
    if (!topic.trim() || selectedModels.length < 2 || isRunning) return

    setIsRunning(true)
    setThinking(null)
    setNewEntries(new Set())

    // Create session
    const createRes = await fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.trim(), models: selectedModels, rounds }),
    })
    if (!createRes.ok) {
      setIsRunning(false)
      return
    }
    const { id } = await createRes.json()

    // Init active session
    const newSession: SessionDetail = {
      id,
      topic: topic.trim(),
      models: selectedModels,
      rounds,
      status: 'running',
      debate: [],
      created_at: Math.floor(Date.now() / 1000),
    }
    setActiveSession(newSession)

    // Stream debate
    try {
      const runRes = await fetch('/api/council/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      })

      if (!runRes.body) throw new Error('No stream')

      const reader = runRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'thinking') {
              setThinking(event.model)
            } else if (event.type === 'message' || event.type === 'conclusion') {
              setThinking(null)
              const entry: DebateEntry = {
                model: event.model,
                label: event.label,
                color: event.color,
                round: event.round,
                content: event.content,
                role: event.role || 'debate',
                error: event.error,
              }
              setActiveSession(prev => {
                if (!prev) return prev
                const updated = { ...prev, debate: [...prev.debate, entry] }
                setNewEntries(ne => new Set([...ne, updated.debate.length - 1]))
                return updated
              })
            } else if (event.type === 'done') {
              setActiveSession(prev => prev ? { ...prev, status: 'completed' } : prev)
              setThinking(null)
              fetchSessions()
            } else if (event.type === 'error') {
              setActiveSession(prev => prev ? { ...prev, status: 'failed' } : prev)
              setThinking(null)
            }
          } catch { /* ignore parse error */ }
        }
      }
    } catch (err: any) {
      setActiveSession(prev => prev ? { ...prev, status: 'failed' } : prev)
    }

    setIsRunning(false)
    setThinking(null)
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts * 1000)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* Left sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
        {/* New session form */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">⚖️</span>
            <h3 className="font-semibold text-foreground">New Council Session</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Topic / Question</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="What should the council deliberate on?"
                rows={4}
                disabled={isRunning}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Models</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_MODELS.map(m => (
                  <ModelPill
                    key={m.id}
                    modelId={m.id}
                    selected={selectedModels.includes(m.id)}
                    onClick={() => toggleModel(m.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">
                Rounds: {rounds}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={rounds}
                onChange={e => setRounds(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-primary disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            <button
              onClick={startCouncil}
              disabled={!topic.trim() || selectedModels.length < 2 || isRunning}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Council in session…
                </>
              ) : (
                <>▶ Start Council</>
              )}
            </button>
          </div>
        </div>

        {/* Past sessions */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground">🕐</span>
            <span className="text-xs font-medium text-muted-foreground">Past Sessions</span>
          </div>
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground/50">No past sessions yet</div>
          ) : (
            sessions.map(s => (
              <button
                key={s.id}
                onClick={() => loadSession(s.id)}
                className={`w-full text-left px-4 py-3 border-b border-border/30 hover:bg-card/60 transition-colors ${
                  activeSession?.id === s.id ? 'bg-card border-l-2 border-l-primary' : ''
                }`}
              >
                <p className="text-xs text-foreground truncate">{s.topic}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground/60">{formatDate(s.created_at)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    s.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                    s.status === 'running' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>{s.status}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main debate area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-muted-foreground/40">
            <div className="text-6xl">⚖️</div>
            <div>
              <p className="text-base font-medium text-muted-foreground/60">No Active Session</p>
              <p className="text-sm mt-1 max-w-sm">Start a new council session to have multiple AI models deliberate on a topic together. Or select a past session to review.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Topic</p>
                  <h2 className="font-semibold text-foreground text-base">{activeSession.topic}</h2>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex gap-1">
                    {activeSession.models.map(m => {
                      const cfg = AVAILABLE_MODELS.find(x => x.id === m)
                      return cfg ? (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: cfg.color + '40', color: cfg.color, backgroundColor: cfg.color + '15' }}>
                          {cfg.label}
                        </span>
                      ) : null
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground">{activeSession.rounds} rounds</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeSession.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                    activeSession.status === 'running' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>{activeSession.status}</span>
                </div>
              </div>
            </div>

            {/* Debate stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading session…</div>
              ) : (
                <>
                  {activeSession.debate.map((entry, i) => (
                    <DebateMessage key={i} entry={entry} isNew={newEntries.has(i)} />
                  ))}
                  {thinking && <ThinkingIndicator label={thinking} />}
                  <div ref={debateEndRef} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
