'use client'

import { useState, useEffect, useCallback } from 'react'

interface Target {
  type: 'contact' | 'group'
  id: string
  label: string
}

interface Rule {
  id: string
  name: string
  channelId: string
  channelName: string
  guildName: string
  enabled: boolean
  targets: Target[]
}

interface WAGroup {
  id: string
  name: string
}

function RuleCard({
  rule,
  groups,
  onToggle,
  onDelete,
  onEdit,
}: {
  rule: Rule
  groups: WAGroup[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (rule: Rule) => void
}) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${rule.enabled ? 'border-border bg-card' : 'border-border/40 bg-card/40 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Toggle */}
          <button
            onClick={() => onToggle(rule.id)}
            className={`mt-0.5 w-10 h-5 rounded-full flex-shrink-0 relative transition-colors ${rule.enabled ? 'bg-green-500' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${rule.enabled ? 'left-5' : 'left-0.5'}`} />
          </button>
          <div className="min-w-0">
            <div className="font-medium text-sm text-foreground">{rule.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">#{rule.channelName}</span>
              <span className="mx-1 text-muted-foreground/40">·</span>
              <span>{rule.guildName}</span>
              <span className="mx-1 text-muted-foreground/40">·</span>
              <span className="font-mono text-[10px] text-muted-foreground/60">{rule.channelId}</span>
            </div>
            {/* Targets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {rule.targets.map((t, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                  t.type === 'group'
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {t.type === 'group' ? '👥' : '👤'} {t.label}
                </span>
              ))}
              {rule.targets.length === 0 && (
                <span className="text-[11px] text-amber-400">⚠️ No targets — messages will be dropped</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => onEdit(rule)} className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
            Edit
          </button>
          <button onClick={() => onDelete(rule.id)} className="px-2.5 py-1 text-xs rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function EditModal({
  rule,
  groups,
  onSave,
  onClose,
}: {
  rule: Partial<Rule> | null
  groups: WAGroup[]
  onSave: (rule: Rule) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Rule>>(rule || {
    id: `rule-${Date.now()}`,
    name: '',
    channelId: '',
    channelName: '',
    guildName: '',
    enabled: true,
    targets: [],
  })
  const [newTarget, setNewTarget] = useState<{ type: 'contact' | 'group'; id: string; label: string }>({
    type: 'contact', id: '', label: ''
  })

  const addTarget = () => {
    if (!newTarget.id || !newTarget.label) return
    setForm(f => ({ ...f, targets: [...(f.targets || []), { ...newTarget }] }))
    setNewTarget({ type: 'contact', id: '', label: '' })
  }

  const removeTarget = (i: number) => {
    setForm(f => ({ ...f, targets: (f.targets || []).filter((_, idx) => idx !== i) }))
  }

  const selectGroup = (group: WAGroup) => {
    const already = form.targets?.find(t => t.id === group.id)
    if (already) return
    setForm(f => ({ ...f, targets: [...(f.targets || []), { type: 'group', id: group.id, label: group.name }] }))
  }

  const isValid = form.channelId && form.name

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{rule?.id ? 'Edit Rule' : 'New Rule'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Rule Name</label>
            <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Pokémon Center Drops" />
          </div>
          {/* Channel ID */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Discord Channel ID</label>
            <input value={form.channelId || ''} onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="1234567890123456789" />
          </div>
          {/* Channel Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Channel Name (display)</label>
              <input value={form.channelName || ''} onChange={e => setForm(f => ({ ...f, channelName: e.target.value }))}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="pokemon-center-ca" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Server Name (display)</label>
              <input value={form.guildName || ''} onChange={e => setForm(f => ({ ...f, guildName: e.target.value }))}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="PokeNotify" />
            </div>
          </div>

          {/* Targets */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Forward To</label>
            <div className="space-y-1.5 mb-3">
              {(form.targets || []).map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-card/60 rounded-lg px-3 py-1.5 border border-border/50">
                  <span className="text-sm">{t.type === 'group' ? '👥' : '👤'} {t.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{t.id.substring(0, 20)}...</span>
                  <button onClick={() => removeTarget(i)} className="text-red-400 hover:text-red-300 text-xs ml-2">remove</button>
                </div>
              ))}
            </div>

            {/* Add from WA groups */}
            {groups.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-1.5">Add WhatsApp group:</p>
                <div className="flex flex-wrap gap-1.5">
                  {groups.map(g => {
                    const added = form.targets?.find(t => t.id === g.id)
                    return (
                      <button key={g.id} onClick={() => selectGroup(g)} disabled={!!added}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${added ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-default' : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'}`}>
                        👥 {g.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Manual add */}
            <div className="border border-border/50 rounded-lg p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Or add manually:</p>
              <div className="flex gap-2">
                <select value={newTarget.type} onChange={e => setNewTarget(t => ({ ...t, type: e.target.value as any }))}
                  className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground">
                  <option value="contact">👤 Contact</option>
                  <option value="group">👥 Group</option>
                </select>
                <input value={newTarget.label} onChange={e => setNewTarget(t => ({ ...t, label: e.target.value }))}
                  className="flex-1 bg-card border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Label (e.g. Sev personal)" />
              </div>
              <div className="flex gap-2">
                <input value={newTarget.id} onChange={e => setNewTarget(t => ({ ...t, id: e.target.value }))}
                  className="flex-1 bg-card border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={newTarget.type === 'contact' ? '1234567890@c.us' : '120363000000000000@g.us'} />
                <button onClick={addTarget} className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90">Add</button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={() => isValid && onSave(form as Rule)} disabled={!isValid}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
            Save Rule
          </button>
        </div>
      </div>
    </div>
  )
}

export function WhatsAppAlertsPanel() {
  const [rules, setRules] = useState<Rule[]>([])
  const [groups, setGroups] = useState<WAGroup[]>([])
  const [waStatus, setWaStatus] = useState<string>('loading')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRule, setEditingRule] = useState<Partial<Rule> | null | false>(false)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/whatsapp-alerts')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setRules(data.rules || [])
      setGroups(data.groups || [])
      setWaStatus(data.waStatus || 'unknown')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const doAction = async (action: string, payload: any) => {
    setSaving(true)
    try {
      const res = await fetch('/api/whatsapp-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      const data = await res.json()
      if (data.rules) setRules(data.rules)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (rule: Rule) => {
    await doAction('save_rule', { rule })
    setEditingRule(false)
  }

  const statusColor = waStatus === 'connected' ? 'text-green-400' : waStatus === 'loading' ? 'text-muted-foreground' : 'text-red-400'
  const statusDot = waStatus === 'connected' ? 'bg-green-400' : waStatus === 'loading' ? 'bg-muted' : 'bg-red-400'

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp Alerts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Route Discord channels to WhatsApp contacts & groups</p>
        </div>
        <div className="flex items-center gap-4">
          {/* WA Status */}
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${statusDot} ${waStatus === 'connected' ? 'animate-pulse' : ''}`} />
            <span className={statusColor}>WhatsApp {waStatus}</span>
          </div>
          <button onClick={() => setEditingRule({ id: `rule-${Date.now()}`, enabled: true, targets: [] })}
            className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
            + Add Rule
          </button>
          <button onClick={fetchData} className="px-3 py-2 text-sm rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground">
            ↻
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-5 py-3 border-b border-border/50 bg-card/30 flex-shrink-0">
        <div className="text-sm">
          <span className="text-2xl font-bold font-mono text-foreground">{rules.length}</span>
          <span className="text-muted-foreground ml-1.5">total rules</span>
        </div>
        <div className="text-sm">
          <span className="text-2xl font-bold font-mono text-green-400">{rules.filter(r => r.enabled).length}</span>
          <span className="text-muted-foreground ml-1.5">active</span>
        </div>
        <div className="text-sm">
          <span className="text-2xl font-bold font-mono text-muted-foreground">{rules.filter(r => !r.enabled).length}</span>
          <span className="text-muted-foreground ml-1.5">paused</span>
        </div>
        <div className="text-sm">
          <span className="text-2xl font-bold font-mono text-blue-400">{groups.length}</span>
          <span className="text-muted-foreground ml-1.5">WA groups available</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Loading...
          </div>
        )}
        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && rules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">📡</div>
            <p className="text-muted-foreground text-sm">No rules yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Add a rule to start forwarding Discord messages to WhatsApp</p>
            <button onClick={() => setEditingRule({ id: `rule-${Date.now()}`, enabled: true, targets: [] })}
              className="mt-4 px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              + Add First Rule
            </button>
          </div>
        )}
        {!loading && !error && rules.length > 0 && (
          <div className="space-y-3">
            {rules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                groups={groups}
                onToggle={id => doAction('toggle_rule', { id })}
                onDelete={id => doAction('delete_rule', { id })}
                onEdit={setEditingRule}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingRule !== false && (
        <EditModal
          rule={editingRule}
          groups={groups}
          onSave={handleSave}
          onClose={() => setEditingRule(false)}
        />
      )}
    </div>
  )
}
