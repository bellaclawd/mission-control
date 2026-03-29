import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter } from '@/lib/rate-limit'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from '@/lib/config'

// GET /api/discord/users?userIds=id1,id2&guildId=xxx&botToken=xxx
// Resolves Discord user IDs → usernames using guild member endpoint
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const limited = readLimiter(request)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const userIds = (searchParams.get('userIds') || '').split(',').filter(Boolean)
  const guildId = searchParams.get('guildId') || ''

  if (!userIds.length) return NextResponse.json({ users: {} })

  // Get all bot tokens from openclaw.json
  let botTokens: string[] = []
  try {
    const raw = JSON.parse(readFileSync(join(config.openclawStateDir!, 'openclaw.json'), 'utf-8'))
    const accounts = raw?.channels?.discord?.accounts || {}
    botTokens = Object.values(accounts).map((a: any) => a.token).filter(Boolean)
  } catch { /* ignore */ }

  if (!botTokens.length) return NextResponse.json({ users: {}, error: 'No bot tokens found' })

  const results: Record<string, { username: string; displayName: string; avatar?: string }> = {}

  for (const userId of userIds) {
    let resolved = false

    // Try guild member endpoint first (gives display name)
    if (guildId) {
      for (const token of botTokens) {
        try {
          const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
            headers: { Authorization: `Bot ${token}` },
            signal: AbortSignal.timeout(5000),
          })
          if (res.ok) {
            const data = await res.json()
            results[userId] = {
              username: data.user?.username || userId,
              displayName: data.nick || data.user?.global_name || data.user?.username || userId,
              avatar: data.user?.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${data.user.avatar}.png?size=64` : undefined,
            }
            resolved = true
            break
          }
        } catch { /* try next token */ }
      }
    }

    // Fallback: global user endpoint
    if (!resolved) {
      for (const token of botTokens) {
        try {
          const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
            headers: { Authorization: `Bot ${token}` },
            signal: AbortSignal.timeout(5000),
          })
          if (res.ok) {
            const data = await res.json()
            results[userId] = {
              username: data.username || userId,
              displayName: data.global_name || data.username || userId,
              avatar: data.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${data.avatar}.png?size=64` : undefined,
            }
            resolved = true
            break
          }
        } catch { /* try next token */ }
      }
    }

    if (!resolved) {
      results[userId] = { username: userId, displayName: userId }
    }
  }

  return NextResponse.json({ users: results })
}

export const dynamic = 'force-dynamic'
