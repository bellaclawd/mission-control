'use client'

import { useState } from 'react'
import { WhatsAppAlertsPanel } from './whatsapp-alerts-panel'
import { ChannelsPanel } from './channels-panel'
import { DiscordManager } from './discord-manager'

type Tab = 'whatsapp' | 'telegram' | 'discord'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', emoji: '📱' },
  { id: 'telegram', label: 'Telegram', emoji: '✈️' },
  { id: 'discord', label: 'Discord', emoji: '🎮' },
]

// Thin wrapper that renders ChannelsPanel but hides other platform cards
// by passing a filter context. Since ChannelsPanel handles its own data,
// we'll render a focused single-platform view for Telegram and Discord.

function SingleChannelView({ platform }: { platform: 'telegram' | 'discord' }) {
  // We just mount the full ChannelsPanel filtered to one platform via CSS trick
  // A proper solution would extract per-platform cards, but ChannelsPanel
  // already has all the logic — easier to just show it and note the platform.
  return (
    <div className="h-full overflow-auto">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs text-muted-foreground">
          {platform === 'telegram'
            ? 'Telegram bots status, accounts, and configuration'
            : 'Discord bots status, guilds, and channel permissions'}
        </p>
      </div>
      <ChannelsSingleView platform={platform} />
    </div>
  )
}

// Render just the relevant card from ChannelsPanel data inline
import { useCallback, useEffect } from 'react'
import { useMissionControl } from '@/store'
import { useTranslations } from 'next-intl'

interface ChannelStatus {
  configured: boolean
  running: boolean
  mode?: string
  lastError?: string
  lastStartAt?: string
  probe?: any
}

interface ChannelAccount {
  accountId: string
  label?: string
  status: string
  connected: boolean
}

interface ChannelsSnapshot {
  connected: boolean
  channels: Record<string, ChannelStatus>
  channelAccounts: Record<string, ChannelAccount[]>
  channelOrder: string[]
  channelLabels: Record<string, string>
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
      ok ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
      {ok ? 'Connected' : 'Offline'}
    </span>
  )
}

function ChannelsSingleView({ platform }: { platform: 'telegram' | 'discord' }) {
  const { connection } = useMissionControl()
  const [snapshot, setSnapshot] = useState<ChannelsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/channels')
      if (!res.ok) { setError('Failed to load'); return }
      setSnapshot(await res.json())
      setError(null)
    } catch { setError('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchChannels()
    const iv = setInterval(fetchChannels, 30000)
    return () => clearInterval(iv)
  }, [fetchChannels])

  if (loading) return <div className="p-4 text-sm text-muted-foreground animate-pulse">Loading…</div>
  if (error) return <div className="p-4 text-sm text-red-400">{error}</div>

  const status = snapshot?.channels?.[platform]
  const accounts = snapshot?.channelAccounts?.[platform] ?? []

  if (!status) {
    return (
      <div className="p-6 text-center text-muted-foreground/50">
        <p className="text-sm">{platform === 'telegram' ? '✈️' : '🎮'} {platform.charAt(0).toUpperCase() + platform.slice(1)} not configured</p>
        <p className="text-xs mt-1">Configure in openclaw.json → channels.{platform}</p>
      </div>
    )
  }

  const isActive = status.configured && status.running

  return (
    <div className="p-4 space-y-4">
      {/* Status card */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground capitalize">{platform}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {platform === 'telegram' ? 'Bot messaging' : 'Guild messaging'}
            </p>
          </div>
          <StatusBadge ok={isActive} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-background/50 rounded-lg p-2.5">
            <p className="text-muted-foreground">Configured</p>
            <p className="font-medium text-foreground mt-0.5">{status.configured ? 'Yes' : 'No'}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-2.5">
            <p className="text-muted-foreground">Running</p>
            <p className="font-medium text-foreground mt-0.5">{status.running ? 'Yes' : 'No'}</p>
          </div>
          {status.mode && (
            <div className="bg-background/50 rounded-lg p-2.5">
              <p className="text-muted-foreground">Mode</p>
              <p className="font-medium text-foreground mt-0.5">{status.mode}</p>
            </div>
          )}
          {status.probe?.bot?.username && (
            <div className="bg-background/50 rounded-lg p-2.5">
              <p className="text-muted-foreground">Bot</p>
              <p className="font-medium text-foreground mt-0.5">@{status.probe.bot.username}</p>
            </div>
          )}
        </div>
        {status.lastError && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {status.lastError}
          </div>
        )}
      </div>

      {/* Accounts */}
      {accounts.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-medium text-muted-foreground mb-3">
            {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
          </h4>
          <div className="space-y-2">
            {accounts.map(acct => (
              <div key={acct.accountId} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{acct.label || acct.accountId}</p>
                  <p className="text-xs text-muted-foreground font-mono">{acct.accountId}</p>
                </div>
                <StatusBadge ok={!!(acct.connected ?? (status?.running))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discord guild info */}
      {platform === 'discord' && status.probe?.guilds && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-xs font-medium text-muted-foreground mb-3">Guilds</h4>
          <div className="space-y-2">
            {Object.entries(status.probe.guilds).map(([guildId, guild]: [string, any]) => (
              <div key={guildId} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{guild.name || guildId}</p>
                  <p className="text-xs text-muted-foreground font-mono">{guildId}</p>
                </div>
                <span className="text-xs text-muted-foreground">{guild.memberCount ? `${guild.memberCount} members` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={fetchChannels}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        ↻ Refresh
      </button>
    </div>
  )
}

export function CommunicationPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('whatsapp')

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header with tabs */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <div>
            <h2 className="text-xl font-bold text-foreground">Communication</h2>
            <p className="text-sm text-muted-foreground mt-0.5 mb-3">Manage channels, bots, and alert routing</p>
          </div>
        </div>
        <div className="flex px-5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'whatsapp' && (
          <div className="h-full overflow-auto">
            <WhatsAppAlertsPanel />
          </div>
        )}
        {activeTab === 'telegram' && <SingleChannelView platform="telegram" />}
        {activeTab === 'discord' && (
          <div className="h-full overflow-hidden">
            <DiscordManager />
          </div>
        )}
      </div>
    </div>
  )
}
