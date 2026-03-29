import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { readLimiter, mutationLimiter } from '@/lib/rate-limit'

import { homedir } from 'node:os'
import { join } from 'node:path'
const CONFIG_PATH = process.env.WHATSAPP_ALERTS_CONFIG || join(homedir(), 'pokemon-alerts', 'config.json')
const WA_BRIDGE = 'http://127.0.0.1:3002'

function readConfig() {
  if (!existsSync(CONFIG_PATH)) return { rules: [] }
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) } catch { return { rules: [] } }
}

function writeConfig(data: any) {
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// GET: return rules + WA groups + bridge status
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const limited = readLimiter(request)
  if (limited) return limited

  const config = readConfig()

  // Fetch WA bridge status + groups
  let waStatus = 'disconnected'
  let groups: Array<{ id: string; name: string }> = []
  try {
    const health = await fetch(`${WA_BRIDGE}/health`, { signal: AbortSignal.timeout(3000) })
    const hData = await health.json()
    waStatus = hData.status || 'disconnected'
    if (waStatus === 'connected') {
      const gr = await fetch(`${WA_BRIDGE}/groups`, { signal: AbortSignal.timeout(5000) })
      groups = await gr.json()
    }
  } catch {
    waStatus = 'unreachable'
  }

  return NextResponse.json({ rules: config.rules, waStatus, groups })
}

// POST: create or update a rule
export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const limited = mutationLimiter(request)
  if (limited) return limited

  const body = await request.json()
  const config = readConfig()

  if (body.action === 'save_rule') {
    const rule = body.rule
    if (!rule?.id) return NextResponse.json({ error: 'Rule id required' }, { status: 400 })
    const idx = config.rules.findIndex((r: any) => r.id === rule.id)
    if (idx >= 0) {
      config.rules[idx] = rule
    } else {
      config.rules.push(rule)
    }
    writeConfig(config)
    return NextResponse.json({ success: true, rules: config.rules })
  }

  if (body.action === 'delete_rule') {
    config.rules = config.rules.filter((r: any) => r.id !== body.id)
    writeConfig(config)
    return NextResponse.json({ success: true, rules: config.rules })
  }

  if (body.action === 'toggle_rule') {
    const rule = config.rules.find((r: any) => r.id === body.id)
    if (rule) rule.enabled = !rule.enabled
    writeConfig(config)
    return NextResponse.json({ success: true, rules: config.rules })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
