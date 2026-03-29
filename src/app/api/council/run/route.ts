import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDatabase } from '@/lib/db'

const MODEL_CONFIG: Record<string, { apiKey: () => string | undefined; baseUrl: string; model: string; label: string; color: string }> = {
  'claude-sonnet': {
    apiKey: () => process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-5',
    label: 'Claude Sonnet',
    color: '#f97316',
  },
  'claude-opus': {
    apiKey: () => process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-opus-4-5',
    label: 'Claude Opus',
    color: '#ea580c',
  },
  'claude-haiku': {
    apiKey: () => process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-haiku-4-5',
    label: 'Claude Haiku',
    color: '#fb923c',
  },
  'gemini-2.5-pro': {
    apiKey: () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-2.5-pro-preview-03-25',
    label: 'Gemini 2.5 Pro',
    color: '#3b82f6',
  },
  'gemini-2.0-flash': {
    apiKey: () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-2.0-flash',
    label: 'Gemini Flash',
    color: '#60a5fa',
  },
  'gpt-codex': {
    apiKey: () => process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4.1',
    label: 'GPT Codex',
    color: '#10b981',
  },
}

async function callAnthropic(model: string, systemPrompt: string, messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown error')
    throw new Error(`Anthropic API error ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

async function callOpenAI(model: string, systemPrompt: string, messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown error')
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callGemini(model: string, systemPrompt: string, messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(60000),
    }
  )
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown error')
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callModel(modelId: string, systemPrompt: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  const cfg = MODEL_CONFIG[modelId]
  if (!cfg) throw new Error(`Unknown model: ${modelId}`)
  const apiKey = cfg.apiKey()
  if (!apiKey) throw new Error(`No API key configured for ${cfg.label}`)

  if (cfg.baseUrl.includes('anthropic')) {
    return callAnthropic(cfg.model, systemPrompt, messages, apiKey)
  } else if (cfg.baseUrl.includes('generativelanguage')) {
    return callGemini(cfg.model, systemPrompt, messages, apiKey)
  } else {
    return callOpenAI(cfg.model, systemPrompt, messages, apiKey)
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => ({}))
  const { sessionId } = body

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const db = getDatabase()
  const session = db.prepare('SELECT * FROM council_sessions WHERE id = ? AND workspace_id = ?')
    .get(Number(sessionId), auth.user.workspace_id ?? 1) as any

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status === 'completed') return NextResponse.json({ error: 'Already completed' }, { status: 400 })

  const models: string[] = JSON.parse(session.models)
  const rounds = session.rounds
  const topic = session.topic

  // SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const debate: Array<{ model: string; label: string; color: string; round: number; content: string; role: 'debate' | 'conclusion' }> = []
      const conversationHistory: Array<{ role: string; content: string }> = []

      try {
        // Debate rounds
        for (let round = 1; round <= rounds; round++) {
          for (const modelId of models) {
            const cfg = MODEL_CONFIG[modelId]
            if (!cfg) continue

            const isFirst = round === 1 && conversationHistory.length === 0
            const systemPrompt = isFirst
              ? `You are ${cfg.label}, participating in a council debate. You will deliberate on a topic with other AI models. Be thoughtful, direct, and build a clear argument. Keep responses under 200 words. You're in round ${round} of ${rounds}.`
              : `You are ${cfg.label}, participating in a council debate. You have heard the other models' views. Build on the discussion, agree or respectfully challenge points, and refine your position. Keep responses under 200 words. You're in round ${round} of ${rounds}.`

            const userMsg = isFirst
              ? `The topic for deliberation: "${topic}"\n\nPlease share your initial perspective.`
              : `The topic: "${topic}"\n\nContinue the debate based on what's been said. Round ${round} of ${rounds}.`

            if (!conversationHistory.find(m => m.role === 'user' && m.content === userMsg)) {
              conversationHistory.push({ role: 'user', content: userMsg })
            }

            send({ type: 'thinking', model: cfg.label, round })

            try {
              const response = await callModel(modelId, systemPrompt, conversationHistory)
              const entry = { model: modelId, label: cfg.label, color: cfg.color, round, content: response, role: 'debate' as const }
              debate.push(entry)
              conversationHistory.push({ role: 'assistant', content: `[${cfg.label}]: ${response}` })
              send({ type: 'message', ...entry })
            } catch (err: any) {
              const errEntry = { model: modelId, label: cfg.label, color: cfg.color, round, content: `Error: ${err.message}`, role: 'debate' as const }
              debate.push(errEntry)
              send({ type: 'message', ...errEntry, error: true })
            }
          }
        }

        // Final synthesis — use the first available model
        send({ type: 'thinking', model: 'Synthesizing...', round: 0 })

        const synthModelId = models[0]
        const synthCfg = MODEL_CONFIG[synthModelId]
        const synthSystem = `You are a neutral council synthesizer. Based on the debate that just occurred between AI models on the topic "${topic}", provide a definitive executive conclusion. Summarize the key points of agreement and disagreement, then deliver a clear, actionable final recommendation in under 300 words. Start with "COUNCIL CONCLUSION:".`

        let conclusion = ''
        try {
          conclusion = await callModel(synthModelId, synthSystem, [
            { role: 'user', content: `Here is the full debate:\n\n${debate.map(d => `[${d.label} - Round ${d.round}]: ${d.content}`).join('\n\n')}\n\nProvide the executive conclusion.` }
          ])
        } catch (err: any) {
          conclusion = `Unable to synthesize conclusion: ${err.message}`
        }

        const conclusionEntry = { model: synthModelId, label: 'Council Conclusion', color: '#a855f7', round: 0, content: conclusion, role: 'conclusion' as const }
        debate.push(conclusionEntry)
        send({ type: 'conclusion', ...conclusionEntry })

        // Save to DB
        db.prepare('UPDATE council_sessions SET status = ?, debate = ?, conclusion = ?, updated_at = unixepoch() WHERE id = ?')
          .run('completed', JSON.stringify(debate), conclusion, session.id)

        send({ type: 'done', sessionId: session.id })
      } catch (err: any) {
        db.prepare('UPDATE council_sessions SET status = ?, updated_at = unixepoch() WHERE id = ?')
          .run('failed', session.id)
        send({ type: 'error', message: err.message })
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export const dynamic = 'force-dynamic'
export const maxDuration = 300
