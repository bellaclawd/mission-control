export interface ModelConfig {
  alias: string
  name: string
  provider: string
  description: string
  costPer1k: number
}

export const MODEL_CATALOG: ModelConfig[] = [
  // ── Anthropic ──────────────────────────────────────────────────────────────
  { alias: 'claude-sonnet-4-6', name: 'anthropic/claude-sonnet-4-6', provider: 'anthropic', description: 'Main workhorse', costPer1k: 3.0 },
  { alias: 'claude-opus-4-6', name: 'anthropic/claude-opus-4-6', provider: 'anthropic', description: 'Premium quality', costPer1k: 15.0 },
  { alias: 'claude-haiku-4-6', name: 'anthropic/claude-haiku-4-6', provider: 'anthropic', description: 'Fast + cheap', costPer1k: 0.25 },
  { alias: 'claude-haiku-4-5', name: 'anthropic/claude-haiku-4-5', provider: 'anthropic', description: 'Fast + cheap (older)', costPer1k: 0.25 },

  // ── OpenAI Codex (Plus subscription) ──────────────────────────────────────
  { alias: 'gpt-5.4', name: 'openai-codex/gpt-5.4', provider: 'openai-codex', description: 'ChatGPT Plus subscription', costPer1k: 0.0 },

  // ── Ollama (local) ─────────────────────────────────────────────────────────
  { alias: 'qwen2.5:3b', name: 'ollama/qwen2.5:3b', provider: 'ollama', description: 'Tiny local model (free)', costPer1k: 0.0 },
  { alias: 'qwen2.5:7b', name: 'ollama/qwen2.5:7b', provider: 'ollama', description: 'Small local model (free)', costPer1k: 0.0 },
  { alias: 'qwen2.5:14b', name: 'ollama/qwen2.5:14b', provider: 'ollama', description: 'Mid local model (free)', costPer1k: 0.0 },

  // ── Google ─────────────────────────────────────────────────────────────────
  { alias: 'gemini-2.5-pro', name: 'google/gemini-2.5-pro', provider: 'google', description: 'Gemini 2.5 Pro', costPer1k: 1.25 },
  { alias: 'gemini-2.0-flash', name: 'google/gemini-2.0-flash', provider: 'google', description: 'Gemini Flash — fast', costPer1k: 0.1 },
]

export function getModelByAlias(alias: string): ModelConfig | undefined {
  return MODEL_CATALOG.find(m => m.alias === alias)
}

export function getModelByName(name: string): ModelConfig | undefined {
  return MODEL_CATALOG.find(m => m.name === name)
}

export function getAllModels(): ModelConfig[] {
  return [...MODEL_CATALOG]
}
