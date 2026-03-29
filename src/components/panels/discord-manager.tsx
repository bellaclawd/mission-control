'use client'

import { useState, useEffect, useCallback } from 'react'

interface DiscordChannel {
  id: string
  name: string
  type: number // 0=text, 2=voice, etc
}

interface GuildChannelConfig {
  allow: boolean
  requireMention: boolean
  allowFrom?: string[]
  blockFrom?: string[]
}

interface GuildConfig {
  requireMention?: boolean
  users?: string[]
  channels?: Record<string, GuildChannelConfig>
}

interface BotAccount {
  accountId: string
  token?: string
  groupPolicy?: string
  dmPolicy?: string
  allowFrom?: string[]
  guilds?: Record<string, GuildConfig>
  connected?: boolean
}

interface DiscordConfig {
  enabled: boolean
  guilds?: Record<string, { requireMention?: boolean; users?: string[] }>
  accounts?: Record<string, BotAccount>
}

function StatusDot({ ok }: { ok?: boolean }) {
  return <span className={`w-2 h-2 rounded-full inline-block ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-4 py-3 border-b border-border/50">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

interface UserInfo {
  username: string
  displayName: string
  avatar?: string
}

function UserList({
  label,
  users,
  onAdd,
  onRemove,
  placeholder,
  color,
  guildId,
}: {
  label: string
  users: string[]
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  placeholder: string
  color: 'green' | 'red'
  guildId?: string
}) {
  const [input, setInput] = useState('')
  const [userInfo, setUserInfo] = useState<Record<string, UserInfo>>({})
  const colorClass = color === 'green'
    ? 'bg-green-500/10 text-green-400 border-green-500/20'
    : 'bg-red-500/10 text-red-400 border-red-500/20'

  // Resolve unknown user IDs
  useEffect(() => {
    const unknown = users.filter(uid => !userInfo[uid])
    if (!unknown.length) return
    const params = new URLSearchParams({ userIds: unknown.join(',') })
    if (guildId) params.set('guildId', guildId)
    fetch(`/api/discord/users?${params}`)
      .then(r => r.json())
      .then(d => { if (d.users) setUserInfo(prev => ({ ...prev, ...d.users })) })
      .catch(() => {})
  }, [users, guildId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
        {users.length === 0 && <span className="text-[10px] text-muted-foreground/40 italic">None set</span>}
        {users.map(uid => {
          const info = userInfo[uid]
          return (
            <span key={uid} className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border ${colorClass}`}>
              {info?.avatar && <img src={info.avatar} alt="" className="w-3.5 h-3.5 rounded-full" />}
              <span className="font-medium">{info?.displayName || uid}</span>
              {info && info.displayName !== uid && <span className="opacity-60 font-mono">@{info.username}</span>}
              <button onClick={() => onRemove(uid)} className="hover:opacity-70 ml-0.5">×</button>
            </span>
          )
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onAdd(input.trim()); setInput('') } }}
          placeholder={placeholder}
          className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput('') } }}
          className="px-3 py-1.5 text-xs rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function ManualChannelAdd({ onAdd, existingIds }: { onAdd: (id: string, name: string) => void; existingIds: string[] }) {
  const [channelId, setChannelId] = useState('')
  const [channelName, setChannelName] = useState('')

  const handle = () => {
    const id = channelId.trim()
    if (!id || existingIds.includes(id)) return
    onAdd(id, channelName.trim() || id)
    setChannelId('')
    setChannelName('')
  }

  return (
    <div className="border-t border-border/30 pt-3">
      <p className="text-[10px] text-muted-foreground mb-2">Add channel manually:</p>
      <div className="flex gap-2">
        <input
          value={channelId}
          onChange={e => setChannelId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()}
          placeholder="Channel ID (e.g. 1485528020855951380)"
          className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          value={channelName}
          onChange={e => setChannelName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()}
          placeholder="Name (optional)"
          className="w-32 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handle}
          disabled={!channelId.trim()}
          className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  )
}

interface ChannelRowProps {
  channelId: string
  channelName: string
  config: GuildChannelConfig
  onChange: (config: GuildChannelConfig) => void
  onRemove: () => void
  guildId?: string
}

function ChannelRow({ channelId, channelName, config, onChange, onRemove, guildId }: ChannelRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2 bg-background/50">
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground text-xs">
          {expanded ? '▾' : '▸'}
        </button>
        <span className="text-[10px] text-muted-foreground font-mono">#</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-foreground font-medium">{channelName || <span className="text-muted-foreground font-mono text-xs">{channelId}</span>}</span>
          {channelName && <span className="text-[10px] text-muted-foreground/50 font-mono ml-2">{channelId}</span>}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={config.allow} onChange={e => onChange({ ...config, allow: e.target.checked })}
            className="accent-primary" />
          Active
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={config.requireMention} onChange={e => onChange({ ...config, requireMention: e.target.checked })}
            className="accent-primary" />
          @mention
        </label>
        <button onClick={onRemove} className="text-red-400/60 hover:text-red-400 text-xs">✕</button>
      </div>
      {expanded && (
        <div className="p-3 space-y-3 border-t border-border/30">
          <UserList
            label="✅ Allow from (users who can trigger this bot in this channel)"
            users={config.allowFrom || []}
            onAdd={uid => onChange({ ...config, allowFrom: [...(config.allowFrom || []), uid] })}
            onRemove={uid => onChange({ ...config, allowFrom: (config.allowFrom || []).filter(u => u !== uid) })}
            placeholder="Discord user ID e.g. 290009433491111936"
            color="green"
            guildId={guildId}
          />
          <UserList
            label="🚫 Block from (users who cannot trigger this bot here)"
            users={config.blockFrom || []}
            onAdd={uid => onChange({ ...config, blockFrom: [...(config.blockFrom || []), uid] })}
            onRemove={uid => onChange({ ...config, blockFrom: (config.blockFrom || []).filter(u => u !== uid) })}
            placeholder="Discord user ID"
            color="red"
            guildId={guildId}
          />
        </div>
      )}
    </div>
  )
}

interface BotEditorProps {
  accountId: string
  bot: BotAccount
  onChange: (bot: BotAccount) => void
  accountStatus?: { connected?: boolean }
}

function BotEditor({ accountId, bot, onChange, accountStatus }: BotEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const [availableChannels, setAvailableChannels] = useState<DiscordChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [configHash, setConfigHash] = useState<string | null>(null)

  const fetchAvailableChannels = useCallback(async () => {
    if (!bot.guilds) return
    setLoadingChannels(true)
    try {
      // Get current config hash for saving
      const cfgRes = await fetch('/api/gateway-config')
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json()
        setConfigHash(cfgData.hash)
      }
      // Fetch channels for each guild
      for (const guildId of Object.keys(bot.guilds || {})) {
        const res = await fetch('/api/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'discord-channels', guildId, accountTokens: { [accountId]: bot.token } })
        })
        if (res.ok) {
          const data = await res.json()
          const channels: DiscordChannel[] = Object.entries(data.channels || {}).map(([id, name]) => ({
            id,
            name: String(name),
            type: 0,
          }))
          setAvailableChannels(channels)
        }
      }
    } catch { /* ignore */ }
    setLoadingChannels(false)
  }, [accountId, bot])

  useEffect(() => {
    if (expanded) fetchAvailableChannels()
  }, [expanded, fetchAvailableChannels])

  const guilds = bot.guilds || {}
  const firstGuildId = Object.keys(guilds)[0]
  const firstGuild = firstGuildId ? guilds[firstGuildId] : null
  const configuredChannels = firstGuild?.channels || {}
  const channelCount = Object.keys(configuredChannels).length

  const addChannel = (channelId: string, channelName: string) => {
    if (!firstGuildId) return
    onChange({
      ...bot,
      guilds: {
        ...guilds,
        [firstGuildId]: {
          ...firstGuild,
          channels: {
            ...configuredChannels,
            [channelId]: { allow: true, requireMention: false },
          }
        }
      }
    })
  }

  const updateChannel = (channelId: string, config: GuildChannelConfig) => {
    if (!firstGuildId) return
    onChange({
      ...bot,
      guilds: {
        ...guilds,
        [firstGuildId]: {
          ...firstGuild,
          channels: { ...configuredChannels, [channelId]: config }
        }
      }
    })
  }

  const removeChannel = (channelId: string) => {
    if (!firstGuildId) return
    const { [channelId]: _, ...rest } = configuredChannels
    onChange({
      ...bot,
      guilds: { ...guilds, [firstGuildId]: { ...firstGuild, channels: rest } }
    })
  }

  const availableToAdd = availableChannels.filter(ch => !configuredChannels[ch.id])

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-card/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusDot ok={accountStatus?.connected} />
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground capitalize">{accountId}</p>
            <p className="text-[10px] text-muted-foreground">
              {channelCount} channel{channelCount !== 1 ? 's' : ''} configured
              {firstGuildId && <span className="ml-1">· guild {firstGuildId.slice(-6)}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
            accountStatus?.connected
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {accountStatus?.connected ? 'Connected' : 'Offline'}
          </span>
          <span className="text-muted-foreground text-sm">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Global allowFrom */}
          <SectionCard title="Global User Allowlist">
            <UserList
              label="Users allowed to DM or mention this bot globally"
              users={bot.allowFrom || []}
              onAdd={uid => onChange({ ...bot, allowFrom: [...(bot.allowFrom || []), uid] })}
              onRemove={uid => onChange({ ...bot, allowFrom: (bot.allowFrom || []).filter(u => u !== uid) })}
              placeholder="Discord user ID"
              color="green"
              guildId={firstGuildId}
            />
          </SectionCard>

          {/* Channel management */}
          <SectionCard title="Channel Permissions">
            {Object.entries(configuredChannels).length === 0 ? (
              <p className="text-xs text-muted-foreground/60 mb-3">No channels configured — bot responds everywhere in the guild</p>
            ) : (
              <div className="space-y-2 mb-3">
                {Object.entries(configuredChannels).map(([channelId, config]) => {
                  const ch = availableChannels.find(c => c.id === channelId)
                  return (
                    <ChannelRow
                      key={channelId}
                      channelId={channelId}
                      channelName={ch?.name || ''}
                      config={config}
                      onChange={cfg => updateChannel(channelId, cfg)}
                      onRemove={() => removeChannel(channelId)}
                      guildId={firstGuildId}
                    />
                  )
                })}
              </div>
            )}

            {/* Add channel from available list */}
            {loadingChannels ? (
              <p className="text-xs text-muted-foreground animate-pulse">Loading channels…</p>
            ) : availableToAdd.length > 0 ? (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Add from guild:</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableToAdd.slice(0, 30).map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => addChannel(ch.id, ch.name)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    >
                      # {ch.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={fetchAvailableChannels}
                className="text-xs text-primary hover:underline mb-3 block"
              >
                {availableChannels.length > 0 ? '↻ Reload channels' : 'Load available channels'}
              </button>
            )}

            {/* Manual channel ID input — always visible */}
            <ManualChannelAdd onAdd={(id, name) => addChannel(id, name)} existingIds={Object.keys(configuredChannels)} />
          </SectionCard>
        </div>
      )}
    </div>
  )
}

export function DiscordManager() {
  const [config, setConfig] = useState<DiscordConfig | null>(null)
  const [accountStatuses, setAccountStatuses] = useState<Record<string, { connected?: boolean }>>({})
  const [configHash, setConfigHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localBots, setLocalBots] = useState<Record<string, BotAccount>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [cfgRes, chRes] = await Promise.all([
        fetch('/api/gateway-config'),
        fetch('/api/channels'),
      ])
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json()
        setConfigHash(cfgData.hash)
        const discordCfg: DiscordConfig = cfgData.config?.channels?.discord || {}
        setConfig(discordCfg)
        setLocalBots(discordCfg.accounts || {})
      }
      if (chRes.ok) {
        const chData = await chRes.json()
        const discordAccounts = chData.channelAccounts?.discord || []
        const statuses: Record<string, { connected?: boolean }> = {}
        for (const acct of discordAccounts) {
          statuses[acct.accountId] = { connected: acct.connected }
        }
        setAccountStatuses(statuses)
      }
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const saveChanges = async () => {
    setSaving(true)
    setError(null)
    try {
      const updates: Record<string, any> = {}
      for (const [accountId, bot] of Object.entries(localBots)) {
        updates[`channels.discord.accounts.${accountId}.allowFrom`] = bot.allowFrom || []
        if (bot.guilds) {
          for (const [guildId, guild] of Object.entries(bot.guilds)) {
            if (guild.channels) {
              updates[`channels.discord.accounts.${accountId}.guilds.${guildId}.channels`] = guild.channels
            }
          }
        }
      }
      const res = await fetch('/api/gateway-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, hash: configHash }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await fetchData()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-4 text-sm text-muted-foreground animate-pulse">Loading Discord config…</div>

  const botIds = Object.keys(localBots)

  return (
    <div className="p-4 space-y-4 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Discord Bot Management</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Configure which servers/channels each bot responds in, and who can trigger them</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-3 py-1.5 text-xs rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground">
            ↻ Refresh
          </button>
          <button
            onClick={saveChanges}
            disabled={saving}
            className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-all ${
              saved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
            }`}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
      )}

      {/* Bot list */}
      {botIds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/40 text-sm">No Discord bots configured</div>
      ) : (
        <div className="space-y-3">
          {botIds.map(accountId => (
            <BotEditor
              key={accountId}
              accountId={accountId}
              bot={localBots[accountId]}
              accountStatus={accountStatuses[accountId]}
              onChange={bot => setLocalBots(prev => ({ ...prev, [accountId]: bot }))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
