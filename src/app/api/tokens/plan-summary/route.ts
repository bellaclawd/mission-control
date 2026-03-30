import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDatabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import os from 'os'

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

interface PlanSummaryResponse {
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
      totalInputTokens: number
      totalOutputTokens: number
      messageCount: number
      models: ModelRow[]
    }
  }
  agentActivity: AgentActivity[]
  allModels: ModelRow[]
  lastUpdated: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getProvider(model: string): 'anthropic' | 'openai' | 'ollama' | 'unknown' {
  const m = model.toLowerCase()
  if (m.includes('claude') || m.startsWith('anthropic')) return 'anthropic'
  if (m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4') || m.startsWith('openai')) return 'openai'
  if (m.includes('qwen') || m.includes('llama') || m.includes('mistral') || m.includes('deepseek') || m.includes(':')) return 'ollama'
  return 'unknown'
}

// ── JSONL parser ───────────────────────────────────────────────────────────

async function parseAgentActivity(): Promise<AgentActivity[]> {
  const agentsDir = path.join(os.homedir(), '.openclaw', 'agents')
  const activityMap = new Map<string, AgentActivity>()

  let agents: string[] = []
  try {
    agents = await readdir(agentsDir)
  } catch {
    return []
  }

  for (const agent of agents) {
    const sessionsDir = path.join(agentsDir, agent, 'sessions')
    let files: string[] = []
    try {
      files = (await readdir(sessionsDir)).filter(f => f.endsWith('.jsonl') && !f.includes('.deleted'))
    } catch {
      continue
    }

    for (const file of files) {
      try {
        const content = await readFile(path.join(sessionsDir, file), 'utf-8')
        const lines = content.split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            if (entry.type !== 'message') continue
            const msg = entry.message
            if (!msg || msg.role !== 'assistant') continue

            const model: string = msg.model || ''
            if (!model) continue

            const provider = getProvider(model)
            const key = `${agent}::${model}`

            const existing = activityMap.get(key) || {
              agent,
              model,
              provider,
              messageCount: 0,
              inputTokens: 0,
              outputTokens: 0,
            }

            existing.messageCount++
            if (msg.usage) {
              existing.inputTokens += (msg.usage.input || 0) + (msg.usage.cacheRead || 0) + (msg.usage.cacheWrite || 0)
              existing.outputTokens += msg.usage.output || 0
            }

            activityMap.set(key, existing)
          } catch {
            // skip bad line
          }
        }
      } catch {
        // skip bad file
      }
    }
  }

  return [...activityMap.values()].sort((a, b) => b.messageCount - a.messageCount)
}

// ── Route handler ──────────────────────────────────────────────────────────

function getTimeframeFilter(timeframe: string): string {
  switch (timeframe) {
    case 'day':   return `AND (first_message_at >= datetime('now', '-1 day') OR last_message_at >= datetime('now', '-1 day'))`
    case 'week':  return `AND (first_message_at >= datetime('now', '-7 days') OR last_message_at >= datetime('now', '-7 days'))`
    case 'month': return `AND (first_message_at >= datetime('now', '-30 days') OR last_message_at >= datetime('now', '-30 days'))`
    case 'year':  return `AND (first_message_at >= datetime('now', '-365 days') OR last_message_at >= datetime('now', '-365 days'))`
    default:      return '' // all time
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const timeframe = searchParams.get('timeframe') || 'all'

  try {
    const db = getDatabase()
    const tf = getTimeframeFilter(timeframe)

    // Query claude_sessions grouped by model
    const rows = db.prepare(`
      SELECT
        model,
        SUM(input_tokens) as input,
        SUM(output_tokens) as output,
        SUM(estimated_cost) as cost,
        COUNT(*) as sessions
      FROM claude_sessions
      WHERE 1=1 ${tf}
      GROUP BY model
      ORDER BY input DESC
    `).all() as ModelRow[]

    // Group by provider
    const anthropicModels: ModelRow[] = []
    const openaiModels: ModelRow[] = []
    const ollamaModels: ModelRow[] = []

    for (const row of rows) {
      const p = getProvider(row.model)
      if (p === 'anthropic') anthropicModels.push(row)
      else if (p === 'openai') openaiModels.push(row)
      else ollamaModels.push(row)
    }

    const sumTokens = (models: ModelRow[], field: 'input' | 'output') =>
      models.reduce((acc, m) => acc + (m[field] || 0), 0)
    const sumCost = (models: ModelRow[]) =>
      models.reduce((acc, m) => acc + (m.cost || 0), 0)
    const sumMessages = (models: ModelRow[]) =>
      models.reduce((acc, m) => acc + (m.sessions || 0), 0)

    // Parse JSONL agent activity
    const agentActivity = await parseAgentActivity()

    // Roll JSONL agent activity into provider totals (OpenAI/Codex sessions live here, not in claude_sessions)
    // Only include gpt-5.4 (Codex subscription) — exclude gpt-4.1/gpt-4.1-mini (old API key, no longer used)
    const CODEX_MODELS = ['gpt-5.4']
    const codexActivity = agentActivity.filter(a => CODEX_MODELS.includes(a.model))
    const jsonlOpenaiInput = codexActivity.reduce((s, a) => s + a.inputTokens, 0)
    const jsonlOpenaiOutput = codexActivity.reduce((s, a) => s + a.outputTokens, 0)
    const jsonlOpenaiModels: ModelRow[] = Object.values(
      codexActivity.reduce((acc, a) => {
        const key = a.model
        if (!acc[key]) acc[key] = { model: key, input: 0, output: 0, cost: 0, sessions: 0 }
        acc[key].input += a.inputTokens
        acc[key].output += a.outputTokens
        acc[key].sessions += a.messageCount
        return acc
      }, {} as Record<string, ModelRow>)
    )

    // Ollama local models from JSONL
    const jsonlOllamaModels: ModelRow[] = Object.values(
      agentActivity.filter(a => a.provider === 'ollama').reduce((acc, a) => {
        const key = a.model
        if (!acc[key]) acc[key] = { model: key, input: 0, output: 0, cost: 0, sessions: 0 }
        acc[key].input += a.inputTokens
        acc[key].output += a.outputTokens
        acc[key].sessions += a.messageCount
        return acc
      }, {} as Record<string, ModelRow>)
    )
    const jsonlOllamaInput = agentActivity.filter(a => a.provider === 'ollama').reduce((s, a) => s + a.inputTokens, 0)
    const jsonlOllamaOutput = agentActivity.filter(a => a.provider === 'ollama').reduce((s, a) => s + a.outputTokens, 0)

    const response: PlanSummaryResponse = {
      providers: {
        anthropic: {
          label: 'Anthropic',
          plan: 'MAX Plan',
          totalInputTokens: sumTokens(anthropicModels, 'input'),
          totalOutputTokens: sumTokens(anthropicModels, 'output'),
          estimatedCost: sumCost(anthropicModels),
          models: anthropicModels,
        },
        openai: {
          label: 'OpenAI',
          plan: 'Plus',
          totalInputTokens: sumTokens(openaiModels, 'input') + jsonlOpenaiInput,
          totalOutputTokens: sumTokens(openaiModels, 'output') + jsonlOpenaiOutput,
          estimatedCost: sumCost(openaiModels),
          models: [...openaiModels, ...jsonlOpenaiModels],
        },
        ollama: {
          label: 'Ollama',
          plan: 'Free (Local)',
          totalInputTokens: jsonlOllamaInput,
          totalOutputTokens: jsonlOllamaOutput,
          messageCount: sumMessages(ollamaModels),
          models: [...ollamaModels, ...jsonlOllamaModels],
        },
      },
      agentActivity,
      allModels: [...rows, ...jsonlOpenaiModels, ...jsonlOllamaModels],
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error({ err: error }, 'GET /api/tokens/plan-summary error')
    return NextResponse.json({ error: 'Failed to fetch plan summary' }, { status: 500 })
  }
}
