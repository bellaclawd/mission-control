'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────

interface ModelRow {
  model: string
  input: number
  output: number
  cost: number
  sessions: number
}

interface AgentActivity {
  agent: string
  model: string
  provider: string
  messageCount: number
  inputTokens: number
  outputTokens: number
}

interface PlanSummaryData {
  providers: {
    anthropic: {
      label: string
      plan: string
      totalInputTokens: number
      totalOutputTokens: number
      estimatedCost: number
      models: ModelRow[]
    }
    openai: {
      label: string
      plan: string
      totalInputTokens: number
      totalOutputTokens: number
      estimatedCost: number
      models: ModelRow[]
    }
    ollama: {
      label: string
      plan: string
      totalInputTokens?: number
      totalOutputTokens?: number
      messageCount: number
      models: ModelRow[]
    }
  }
  agentActivity: AgentActivity[]
  allModels: ModelRow[]
  lastUpdated: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const formatNumber = (num: number) => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toString()
}

const formatCost = (cost: number) => '$' + cost.toFixed(2)

const getModelShortName = (name: string) => {
  // e.g. "claude-sonnet-4-6" → "sonnet-4-6", "gpt-4o" → "gpt-4o"
  const n = name.split('/').pop() || name
  return n.replace(/^claude-/, '').replace(/^anthropic\//, '')
}

function getProviderColor(provider: string) {
  switch (provider) {
    case 'anthropic': return '#d97706' // amber
    case 'openai': return '#10b981'    // green
    case 'ollama': return '#6366f1'    // indigo
    default: return '#6b7280'
  }
}

const PROVIDER_COLORS = ['#d97706', '#a16207', '#92400e', '#78350f']
const OPENAI_COLORS = ['#10b981', '#059669', '#047857']
const OLLAMA_COLORS = ['#6366f1', '#4f46e5', '#4338ca']

// ── Main Component ──────────────────────────────────────────────────────────

type Timeframe = 'day' | 'week' | 'month' | 'year' | 'all'
const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  day: 'Today', week: '7 Days', month: '30 Days', year: 'This Year', all: 'All Time'
}

export function CostTrackerPanel() {
  const [data, setData] = useState<PlanSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'plans' | 'models' | 'activity'>('plans')
  const [timeframe, setTimeframe] = useState<Timeframe>('all')
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (tf: Timeframe = 'all') => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tokens/plan-summary?timeframe=${tf}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load(timeframe) }, [load, timeframe])

  useEffect(() => {
    refreshTimer.current = setInterval(() => load(timeframe), 60_000)
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current) }
  }, [load, timeframe])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Usage Tracker</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Subscription plans — no per-token billing
              {data?.lastUpdated && (
                <span className="ml-2 text-xs opacity-60">
                  · updated {new Date(data.lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Timeframe selector */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['day', 'week', 'month', 'year', 'all'] as Timeframe[]).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    timeframe === tf
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {TIMEFRAME_LABELS[tf]}
                </button>
              ))}
            </div>
            {/* Tab selector */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['plans', 'models', 'activity'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <Button onClick={() => load(timeframe)} variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? '…' : '↺ Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {isLoading && !data ? (
        <Loader variant="panel" label="Loading usage data…" />
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-500 text-lg mb-2">Failed to load</div>
          <div className="text-muted-foreground text-sm mb-4">{error}</div>
          <Button onClick={() => load(timeframe)} variant="outline" size="sm">Retry</Button>
        </div>
      ) : !data ? null : activeTab === 'plans' ? (
        <PlansView data={data} />
      ) : activeTab === 'models' ? (
        <ModelsView data={data} />
      ) : (
        <ActivityView data={data} />
      )}
    </div>
  )
}

// ── Plans View ──────────────────────────────────────────────────────────────

function PlansView({ data }: { data: PlanSummaryData }) {
  const { anthropic, openai, ollama } = data.providers

  const anthropicTotal = anthropic.totalInputTokens + anthropic.totalOutputTokens
  const openaiTotal = openai.totalInputTokens + openai.totalOutputTokens

  return (
    <div className="space-y-6">
      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Anthropic */}
        <div className="bg-card border border-amber-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Anthropic</div>
              <div className="text-lg font-bold text-foreground mt-0.5">MAX Plan</div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">Active</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">{formatNumber(anthropicTotal)}</div>
            <div className="text-sm text-muted-foreground">total tokens used</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Input</div>
              <div className="font-medium">{formatNumber(anthropic.totalInputTokens)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Output</div>
              <div className="font-medium">{formatNumber(anthropic.totalOutputTokens)}</div>
            </div>
          </div>
          {/* Model pills */}
          <div className="flex flex-wrap gap-1.5">
            {anthropic.models.map((m, i) => (
              <span key={m.model} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {getModelShortName(m.model)}
              </span>
            ))}
            {anthropic.models.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No sessions recorded</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
            Est. value: <span className="line-through opacity-60">{formatCost(anthropic.estimatedCost)}</span>
            <span className="ml-1 text-green-500 font-medium">not billed</span>
          </div>
        </div>

        {/* OpenAI */}
        <div className="bg-card border border-green-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-green-500 uppercase tracking-wider">OpenAI</div>
              <div className="text-lg font-bold text-foreground mt-0.5">Plus</div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">Active</span>
          </div>
          {openai.models.length > 0 ? (
            <>
              <div>
                <div className="text-3xl font-bold text-foreground">{formatNumber(openaiTotal)}</div>
                <div className="text-sm text-muted-foreground">total tokens used</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Input</div>
                  <div className="font-medium">{formatNumber(openai.totalInputTokens)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Output</div>
                  <div className="font-medium">{formatNumber(openai.totalOutputTokens)}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {openai.models.map(m => (
                  <span key={m.model} className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                    {getModelShortName(m.model)}
                  </span>
                ))}
              </div>
              <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                Est. value: <span className="line-through opacity-60">{formatCost(openai.estimatedCost)}</span>
                <span className="ml-1 text-green-500 font-medium">not billed</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground italic py-4">No OpenAI sessions in DB yet</div>
          )}
        </div>

        {/* Ollama */}
        <div className="bg-card border border-indigo-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Ollama</div>
              <div className="text-lg font-bold text-foreground mt-0.5">Free · Local</div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-medium">$0</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">{formatNumber((ollama.totalInputTokens ?? 0) + (ollama.totalOutputTokens ?? 0))}</div>
            <div className="text-sm text-muted-foreground">tokens processed locally</div>
            {((ollama.totalInputTokens ?? 0) + (ollama.totalOutputTokens ?? 0)) > 0 && (
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>↑ {formatNumber(ollama.totalInputTokens ?? 0)} in</span>
                <span>↓ {formatNumber(ollama.totalOutputTokens ?? 0)} out</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ollama.models.length > 0 ? ollama.models.map(m => (
              <span key={m.model} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                {m.model} {m.input + m.output > 0 ? `· ${formatNumber(m.input + m.output)}` : ''}
              </span>
            )) : (
              <span className="text-xs text-muted-foreground italic">No local usage recorded yet</span>
            )}
          </div>
          <div className="text-xs text-green-500 font-medium pt-1 border-t border-border/50">
            ✓ Free — runs locally, no API costs
          </div>
        </div>
      </div>

      {/* Quick token summary bar chart */}
      {data.allModels.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Token Usage by Model</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.allModels.filter(m => (m.input + m.output) > 0).map(m => ({
                  name: getModelShortName(m.model),
                  input: m.input,
                  output: m.output,
                  provider: getProvider(m.model),
                }))}
                margin={{ left: 0, right: 10, top: 5, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, n) => [formatNumber(Number(v)), n === 'input' ? 'Input tokens' : 'Output tokens']} />
                <Bar dataKey="input" name="input" radius={[3, 3, 0, 0]}>
                  {data.allModels.filter(m => (m.input + m.output) > 0).map((m, i) => {
                    const p = getProvider(m.model)
                    const color = p === 'anthropic' ? '#f97316' : p === 'openai' ? '#10b981' : p === 'ollama' ? '#6366f1' : '#94a3b8'
                    return <Cell key={i} fill={color} />
                  })}
                </Bar>
                <Bar dataKey="output" name="output" radius={[3, 3, 0, 0]} opacity={0.5}>
                  {data.allModels.filter(m => (m.input + m.output) > 0).map((m, i) => {
                    const p = getProvider(m.model)
                    const color = p === 'anthropic' ? '#f97316' : p === 'openai' ? '#10b981' : p === 'ollama' ? '#6366f1' : '#94a3b8'
                    return <Cell key={i} fill={color} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Models View ──────────────────────────────────────────────────────────────

function getProvider(model: string): 'anthropic' | 'openai' | 'ollama' | 'unknown' {
  const m = model.toLowerCase()
  if (m.includes('claude') || m.startsWith('anthropic')) return 'anthropic'
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4') || m.startsWith('openai')) return 'openai'
  if (m.includes('qwen') || m.includes('llama') || m.includes('mistral') || m.includes('deepseek') || m.includes(':')) return 'ollama'
  return 'unknown'
}

const PROVIDER_BADGE: Record<string, string> = {
  anthropic: 'bg-amber-500/10 text-amber-500',
  openai: 'bg-green-500/10 text-green-500',
  ollama: 'bg-indigo-500/10 text-indigo-400',
  unknown: 'bg-secondary text-muted-foreground',
}

function ModelsView({ data }: { data: PlanSummaryData }) {
  // Group by provider
  const groups: Record<string, ModelRow[]> = {}
  for (const row of data.allModels) {
    const p = getProvider(row.model)
    if (!groups[p]) groups[p] = []
    groups[p].push(row)
  }

  const providerOrder = ['anthropic', 'openai', 'ollama', 'unknown']
  const providerLabels: Record<string, string> = {
    anthropic: 'Anthropic — MAX Plan',
    openai: 'OpenAI — Plus',
    ollama: 'Ollama — Local (Free)',
    unknown: 'Other',
  }

  if (data.allModels.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <div className="text-lg mb-2">No model data yet</div>
        <div className="text-sm">Sessions will appear here once Claude Code syncs</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {providerOrder.filter(p => groups[p]?.length).map(provider => (
        <div key={provider} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{providerLabels[provider]}</h2>
            {provider !== 'ollama' && (
              <span className="text-xs text-muted-foreground italic">estimated cost — not billed</span>
            )}
            {provider === 'ollama' && (
              <span className="text-xs text-green-500 font-medium">$0 — free local inference</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/50">
                  <th className="text-left px-5 py-2 font-medium">Model</th>
                  <th className="text-right px-4 py-2 font-medium">Input Tokens</th>
                  <th className="text-right px-4 py-2 font-medium">Output Tokens</th>
                  <th className="text-right px-4 py-2 font-medium">Sessions</th>
                  <th className="text-right px-5 py-2 font-medium">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {groups[provider].map((row, i) => (
                  <tr key={row.model} className={`border-b border-border/30 ${i % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PROVIDER_BADGE[provider]}`}>
                          {provider === 'anthropic' ? 'A' : provider === 'openai' ? 'OAI' : 'local'}
                        </span>
                        <span className="font-medium text-foreground">{getModelShortName(row.model)}</span>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 tabular-nums">{formatNumber(row.input)}</td>
                    <td className="text-right px-4 py-3 tabular-nums">{formatNumber(row.output)}</td>
                    <td className="text-right px-4 py-3 tabular-nums text-muted-foreground">{row.sessions}</td>
                    <td className="text-right px-5 py-3 tabular-nums">
                      {provider === 'ollama' ? (
                        <span className="text-green-500 text-xs font-medium">free</span>
                      ) : (
                        <span className="text-muted-foreground line-through text-xs">{formatCost(row.cost)}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Subtotals row */}
                <tr className="bg-secondary/40 font-medium">
                  <td className="px-5 py-2 text-xs text-muted-foreground">Total</td>
                  <td className="text-right px-4 py-2 tabular-nums text-xs">
                    {formatNumber(groups[provider].reduce((s, r) => s + r.input, 0))}
                  </td>
                  <td className="text-right px-4 py-2 tabular-nums text-xs">
                    {formatNumber(groups[provider].reduce((s, r) => s + r.output, 0))}
                  </td>
                  <td className="text-right px-4 py-2 tabular-nums text-xs text-muted-foreground">
                    {groups[provider].reduce((s, r) => s + r.sessions, 0)}
                  </td>
                  <td className="text-right px-5 py-2 tabular-nums text-xs">
                    {provider === 'ollama' ? (
                      <span className="text-green-500">$0.00</span>
                    ) : (
                      <span className="text-muted-foreground line-through">
                        {formatCost(groups[provider].reduce((s, r) => s + r.cost, 0))}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Activity View ──────────────────────────────────────────────────────────

function ActivityView({ data }: { data: PlanSummaryData }) {
  const activity = data.agentActivity

  if (activity.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <div className="text-lg mb-2">No agent activity found</div>
        <div className="text-sm">JSONL session files not found or empty</div>
      </div>
    )
  }

  // Build chart data grouped by agent
  const agentTotals = activity.reduce<Record<string, number>>((acc, a) => {
    acc[a.agent] = (acc[a.agent] || 0) + a.messageCount
    return acc
  }, {})

  const chartData = Object.entries(agentTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([agent, count]) => ({ agent, messages: count }))

  // Group by agent for the table
  const byAgent: Record<string, AgentActivity[]> = {}
  for (const a of activity) {
    if (!byAgent[a.agent]) byAgent[a.agent] = []
    byAgent[a.agent].push(a)
  }

  const barColors = ['#d97706', '#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#ec4899']

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Messages per Agent</h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="agent" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, 'Messages']} />
              <Bar dataKey="messages" radius={[4, 4, 0, 0]} name="Messages">
                {chartData.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-agent breakdown table */}
      <div className="space-y-4">
        {Object.entries(byAgent)
          .sort(([, a], [, b]) => b.reduce((s, x) => s + x.messageCount, 0) - a.reduce((s, x) => s + x.messageCount, 0))
          .map(([agent, rows]) => (
            <div key={agent} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground capitalize">{agent}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {rows.reduce((s, r) => s + r.messageCount, 0)} msgs
                  </span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border/50">
                    <th className="text-left px-5 py-2 font-medium">Model</th>
                    <th className="text-left px-4 py-2 font-medium">Provider</th>
                    <th className="text-right px-4 py-2 font-medium">Messages</th>
                    <th className="text-right px-4 py-2 font-medium">Input Tokens</th>
                    <th className="text-right px-5 py-2 font-medium">Output Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.model}-${i}`} className={`border-b border-border/30 ${i % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                      <td className="px-5 py-2.5 font-medium text-foreground">
                        {getModelShortName(row.model)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROVIDER_BADGE[row.provider] || PROVIDER_BADGE.unknown}`}>
                          {row.provider}
                        </span>
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums">{row.messageCount}</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{formatNumber(row.inputTokens)}</td>
                      <td className="text-right px-5 py-2.5 tabular-nums text-muted-foreground">{formatNumber(row.outputTokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  )
}
