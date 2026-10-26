/**
 * AI assistant configuration. Everything is read from the environment so the
 * provider, model and limits can change without touching business logic.
 */

function int(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  const n = raw === undefined || raw === '' ? fallback : Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function str(name, fallback) {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

// Per-provider defaults, used when AI_MODEL / AI_MAX_OUTPUT_TOKENS are unset.
const PROVIDER_DEFAULTS = {
  anthropic: { model: 'claude-opus-5-5', maxOutputTokens: 16000 },
  groq: { model: 'llama-3.3-70b-versatile', maxOutputTokens: 8192 },
};

export function getAiConfig() {
  const provider = str('AI_PROVIDER', 'anthropic');
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.anthropic;
  return {
    provider,
    model: str('AI_MODEL', defaults.model),
    // Anthropic only.
    effort: str('AI_EFFORT', 'medium'),
    // Anthropic only: "default" enables server-side refusal fallbacks; "off" disables them.
    refusalFallback: str('AI_REFUSAL_FALLBACK', 'default'),
    maxOutputTokens: int('AI_MAX_OUTPUT_TOKENS', defaults.maxOutputTokens, { min: 1024, max: 64000 }),

    // Bounded workflow
    maxModelCalls: int('AI_MAX_MODEL_CALLS', 6, { max: 12 }),
    maxToolCalls: int('AI_MAX_TOOL_CALLS', 12, { max: 30 }),
    requestTimeoutMs: int('AI_REQUEST_TIMEOUT_MS', 90000, { min: 5000 }),
    providerRetries: int('AI_PROVIDER_RETRIES', 1, { min: 0, max: 3 }),

    // Conversation memory
    historyMessages: int('AI_HISTORY_MESSAGES', 12, { max: 40 }),
    storedMessages: int('AI_STORED_MESSAGES', 60, { max: 200 }),
    maxMessageChars: int('AI_MAX_MESSAGE_CHARS', 4000, { min: 100, max: 20000 }),

    // Guardrails
    rateLimitPerMinute: int('AI_RATE_LIMIT_PER_MINUTE', 10),
    // "always": every write waits for approval.
    // "single_reversible": a lone status change / field edit / comment runs
    // immediately; bulk, creation and destructive actions still need approval.
    approvalMode: str('AI_APPROVAL_MODE', 'always'),
    proposalTtlMinutes: int('AI_PROPOSAL_TTL_MINUTES', 60 * 24),

    // Project intelligence
    timezone: str('AI_TIMEZONE', process.env.TZ || 'UTC'),
    sprintLengthDays: int('AI_SPRINT_LENGTH_DAYS', 14, { max: 60 }),
    dueSoonDays: int('AI_DUE_SOON_DAYS', 3, { max: 30 }),
    staleDays: int('AI_STALE_DAYS', 7, { max: 90 }),
    overloadThreshold: int('AI_OVERLOAD_THRESHOLD', 5, { max: 100 }),
  };
}
