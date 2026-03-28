'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { createClientLogger } from '@/lib/client-logger'

const log = createClientLogger('AgentSquadPanel')

interface Agent {
  id: number
  name: string
  role: string
  session_key?: string
  soul_content?: string
  status: 'offline' | 'idle' | 'busy' | 'error' | 'active'
  last_seen?: number
  last_activity?: string
  created_at: number
  updated_at: number
  config?: any
  taskStats?: {
    total: number
    assigned: number
    in_progress: number
    completed: number
  }
}

// Hierarchy config — who reports to whom, and their titles
const HIERARCHY: Record<string, { title: string; reportsTo: string | null; emoji: string }> = {
  Bella: { title: 'CEO', reportsTo: null, emoji: '👑' },
  Ash:   { title: 'VP of Pokémon', reportsTo: 'Bella', emoji: '🎮' },
  Clyde: { title: 'VP of Questions', reportsTo: 'Bella', emoji: '🤙' },
}

const statusColors: Record<string, string> = {
  offline: 'bg-gray-500',
  idle:    'bg-green-500',
  active:  'bg-green-500',
  busy:    'bg-yellow-500',
  error:   'bg-red-500',
}

const statusLabel: Record<string, string> = {
  offline: 'Offline',
  idle:    'Online',
  active:  'Active',
  busy:    'Busy',
  error:   'Error',
}

export function AgentSquadPanel() {
  const t = useTranslations('agentSquad')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchAgents = useCallback(async () => {
    try {
      setError(null)
      if (agents.length === 0) setLoading(true)
      const response = await fetch('/api/agents')
      if (!response.ok) throw new Error(t('failedToFetch'))
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorOccurred'))
    } finally {
      setLoading(false)
    }
  }, [agents.length])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchAgents, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchAgents])

  const updateAgentStatus = async (agentName: string, status: Agent['status'], activity?: string) => {
    try {
      const response = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agentName, status, last_activity: activity || `Status changed to ${status}` })
      })
      if (!response.ok) throw new Error(t('failedToUpdateStatus'))
      setAgents(prev => prev.map(agent =>
        agent.name === agentName
          ? { ...agent, status, last_activity: activity || `Status changed to ${status}`, last_seen: Math.floor(Date.now() / 1000), updated_at: Math.floor(Date.now() / 1000) }
          : agent
      ))
    } catch (error) {
      log.error('Failed to update agent status:', error)
      setError(t('failedToUpdateStatus'))
    }
  }

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return t('never')
    const diffMs = Date.now() - (timestamp * 1000)
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMinutes < 1) return t('justNow')
    if (diffMinutes < 60) return t('minutesAgo', { count: diffMinutes })
    if (diffHours < 24) return t('hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('daysAgo', { count: diffDays })
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Build tree: find root agents and their children
  function buildTree(agentList: Agent[]) {
    const roots: Agent[] = []
    const children: Record<string, Agent[]> = {}

    // First pass: assign children
    agentList.forEach(agent => {
      const h = HIERARCHY[agent.name]
      if (h && h.reportsTo) {
        if (!children[h.reportsTo]) children[h.reportsTo] = []
        children[h.reportsTo].push(agent)
      }
    })

    // Second pass: find roots (no reportsTo, or not in hierarchy)
    agentList.forEach(agent => {
      const h = HIERARCHY[agent.name]
      const isChild = Object.values(children).flat().some(c => c.id === agent.id)
      if (!isChild) roots.push(agent)
    })

    return { roots, children }
  }

  if (loading && agents.length === 0) {
    return <Loader variant="panel" label={t('loadingAgents')} />
  }

  const { roots, children } = buildTree(agents)

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">{t('title')}</h2>
        <div className="flex gap-2">
          <Button onClick={() => setAutoRefresh(!autoRefresh)} variant={autoRefresh ? 'success' : 'secondary'} size="sm">
            {autoRefresh ? t('live') : t('manual')}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>{t('addAgent')}</Button>
          <Button onClick={fetchAgents} variant="secondary">{t('refresh')}</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-3 m-4 rounded">
          {error}
          <Button onClick={() => setError(null)} variant="ghost" size="icon-sm" className="float-right text-red-300 hover:text-red-100">×</Button>
        </div>
      )}

      {/* Org Chart */}
      <div className="flex-1 overflow-y-auto p-8">
        {agents.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <div className="text-5xl mb-3">🤖</div>
            <p className="text-lg">{t('noAgents')}</p>
            <p className="text-sm mt-1">{t('addFirstAgent')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0">
            {roots.map((root, ri) => (
              <OrgNode
                key={root.id}
                agent={root}
                children={children[root.name] || []}
                allChildren={children}
                onSelect={setSelectedAgent}
                formatLastSeen={formatLastSeen}
                isRoot
              />
            ))}
          </div>
        )}
      </div>

      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onUpdate={fetchAgents}
          onStatusUpdate={updateAgentStatus}
        />
      )}
      {showCreateModal && (
        <CreateAgentModal onClose={() => setShowCreateModal(false)} onCreated={fetchAgents} />
      )}
    </div>
  )
}

// ─── Org Node ────────────────────────────────────────────────────────────────

function OrgNode({
  agent,
  children,
  allChildren,
  onSelect,
  formatLastSeen,
  isRoot = false,
}: {
  agent: Agent
  children: Agent[]
  allChildren: Record<string, Agent[]>
  onSelect: (a: Agent) => void
  formatLastSeen: (ts?: number) => string
  isRoot?: boolean
}) {
  const h = HIERARCHY[agent.name]
  const title = h?.title || agent.role || 'Agent'
  const emoji = h?.emoji || '🤖'
  const initials = agent.name.slice(0, 2).toUpperCase()

  const statusDot = statusColors[agent.status] || 'bg-gray-500'
  const statusText = statusLabel[agent.status] || agent.status

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        onClick={() => onSelect(agent)}
        className={`
          cursor-pointer select-none
          bg-gray-800 border rounded-2xl shadow-lg
          transition-all duration-200
          hover:shadow-xl hover:border-blue-500/60 hover:-translate-y-0.5
          ${isRoot
            ? 'w-72 p-6 border-2 border-blue-500/40'
            : 'w-60 p-4 border border-gray-600'}
        `}
      >
        {/* Avatar + name row */}
        <div className="flex flex-col items-center gap-3">
          {/* Avatar circle */}
          <div className={`
            relative rounded-full flex items-center justify-center font-bold text-white shadow-inner
            ${isRoot ? 'w-20 h-20 text-2xl bg-gradient-to-br from-blue-500 to-purple-600' : 'w-16 h-16 text-xl bg-gradient-to-br from-teal-500 to-blue-600'}
          `}>
            {emoji}
            {/* Status dot */}
            <span className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-gray-800 ${statusDot}`} />
          </div>

          {/* Name + title */}
          <div className="text-center">
            <div className={`font-bold text-white ${isRoot ? 'text-xl' : 'text-base'}`}>{agent.name}</div>
            <div className={`font-medium mt-0.5 ${isRoot ? 'text-blue-400 text-sm' : 'text-teal-400 text-xs'}`}>{title}</div>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className={`w-2 h-2 rounded-full ${statusDot}`} />
              <span className="text-gray-400 text-xs">{statusText}</span>
            </div>
          </div>

          {/* Last seen */}
          <div className="text-xs text-gray-500 mt-0.5">
            Last seen: {formatLastSeen(agent.last_seen)}
          </div>
        </div>
      </div>

      {/* Connector line + children */}
      {children.length > 0 && (
        <div className="flex flex-col items-center">
          {/* Vertical line down from parent */}
          <div className="w-px h-8 bg-gray-600" />

          {/* Horizontal bar if multiple children */}
          {children.length > 1 && (
            <div
              className="h-px bg-gray-600"
              style={{ width: `${children.length * 280 - 40}px` }}
            />
          )}

          {/* Children row */}
          <div className="flex gap-10">
            {children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Vertical line down to child */}
                <div className="w-px h-8 bg-gray-600" />
                <OrgNode
                  agent={child}
                  children={allChildren[child.name] || []}
                  allChildren={allChildren}
                  onSelect={onSelect}
                  formatLastSeen={formatLastSeen}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function AgentDetailModal({ agent, onClose, onUpdate, onStatusUpdate }: {
  agent: Agent
  onClose: () => void
  onUpdate: () => void
  onStatusUpdate: (name: string, status: Agent['status'], activity?: string) => Promise<void>
}) {
  const t = useTranslations('agentSquad')
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    role: agent.role,
    session_key: agent.session_key || '',
    soul_content: agent.soul_content || '',
  })

  const handleSave = async () => {
    try {
      const response = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agent.name, ...formData })
      })
      if (!response.ok) throw new Error(t('failedToUpdate'))
      setEditing(false)
      onUpdate()
    } catch (error) {
      log.error('Failed to update agent:', error)
    }
  }

  const h = HIERARCHY[agent.name]
  const title = h?.title || agent.role || 'Agent'

  const statusIcons: Record<string, string> = { offline: '⚫', idle: '🟢', active: '🟢', busy: '🟡', error: '🔴' }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white">{agent.name}</h3>
              <p className="text-blue-400 font-medium">{title}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${statusColors[agent.status] || 'bg-gray-500'}`} />
              <span className="text-white capitalize">{agent.status}</span>
              <Button onClick={onClose} variant="ghost" size="icon-sm" className="text-2xl ml-2">×</Button>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-700/50 rounded-xl">
            <h4 className="text-sm font-medium text-white mb-3">{t('statusControl')}</h4>
            <div className="flex gap-2">
              {(['idle', 'busy', 'offline'] as const).map(status => (
                <Button key={status} onClick={() => onStatusUpdate(agent.name, status)} variant={agent.status === status ? 'default' : 'secondary'} size="sm">
                  {statusIcons[status]} {status}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">{t('role')}</label>
              {editing
                ? <input type="text" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                : <p className="text-white">{agent.role}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">{t('sessionKey')}</label>
              {editing
                ? <input type="text" value={formData.session_key} onChange={e => setFormData(p => ({ ...p, session_key: e.target.value }))} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                : <p className="text-white font-mono text-sm">{agent.session_key || t('notSet')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">{t('soulContent')}</label>
              {editing
                ? <textarea value={formData.soul_content} onChange={e => setFormData(p => ({ ...p, soul_content: e.target.value }))} rows={4} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('soulPlaceholder')} />
                : <p className="text-white whitespace-pre-wrap text-sm">{agent.soul_content || t('notSet')}</p>}
            </div>

            {agent.taskStats && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">{t('taskStatistics')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: agent.taskStats.total, label: t('total'), color: 'text-white' },
                    { val: agent.taskStats.assigned, label: t('assigned'), color: 'text-blue-400' },
                    { val: agent.taskStats.in_progress, label: t('inProgress'), color: 'text-yellow-400' },
                    { val: agent.taskStats.completed, label: t('done'), color: 'text-green-400' },
                  ].map(({ val, label, color }) => (
                    <div key={label} className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className={`text-lg font-semibold ${color}`}>{val}</div>
                      <div className="text-xs text-gray-400">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">{t('created')}:</span><span className="text-white ml-2">{new Date(agent.created_at * 1000).toLocaleDateString()}</span></div>
              <div><span className="text-gray-400">{t('lastUpdated')}:</span><span className="text-white ml-2">{new Date(agent.updated_at * 1000).toLocaleDateString()}</span></div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {editing ? (
              <>
                <Button onClick={handleSave} className="flex-1">{t('saveChanges')}</Button>
                <Button onClick={() => setEditing(false)} variant="secondary" className="flex-1">{t('cancel')}</Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)} className="flex-1">{t('editAgent')}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateAgentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useTranslations('agentSquad')
  const [formData, setFormData] = useState({ name: '', role: '', session_key: '', soul_content: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!response.ok) throw new Error(t('failedToCreate'))
      onCreated()
      onClose()
    } catch (error) {
      log.error('Error creating agent:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">{t('createNewAgent')}</h3>
          <div className="space-y-4">
            {[
              { key: 'name', label: t('name'), required: true, placeholder: '' },
              { key: 'role', label: t('role'), required: true, placeholder: t('rolePlaceholder') },
              { key: 'session_key', label: t('sessionKeyOptional'), required: false, placeholder: t('sessionKeyPlaceholder') },
            ].map(({ key, label, required, placeholder }) => (
              <div key={key}>
                <label className="block text-sm text-gray-400 mb-1">{label}</label>
                <input
                  type="text"
                  value={(formData as any)[key]}
                  onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={required}
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('soulContentOptional')}</label>
              <textarea
                value={formData.soul_content}
                onChange={e => setFormData(p => ({ ...p, soul_content: e.target.value }))}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder={t('soulPlaceholder')}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="submit" className="flex-1">{t('createAgent')}</Button>
            <Button type="button" onClick={onClose} variant="secondary" className="flex-1">{t('cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
