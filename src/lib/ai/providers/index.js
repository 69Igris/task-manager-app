/**
 * LLM provider registry. The orchestrator talks to a provider through a small
 * contract so the model vendor can change by configuration:
 *
 *   provider.startTurn({ system, tools, history, userMessage }) -> turn
 *   turn.next(toolResults, { signal }) -> { text, toolCalls, stopReason, usage }
 *
 * `tools` are { name, description, inputSchema } (JSON Schema). `history` is
 * [{ role: 'user' | 'assistant', content: string }]. `toolResults` are
 * [{ id, content: string, isError: boolean }]. Providers throw ProviderError.
 */

import { createAnthropicProvider } from './anthropic';
import { createGroqProvider } from './groq';
import { ProviderError } from './errors';

export { ProviderError } from './errors';

const factories = new Map([
  ['anthropic', createAnthropicProvider],
  ['groq', createGroqProvider],
]);

// Server-side credential each built-in provider needs.
const REQUIRED_KEYS = {
  anthropic: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'],
  groq: ['GROQ_API_KEY'],
};

export function requiredKeyFor(cfg) {
  return REQUIRED_KEYS[cfg.provider]?.[0] || null;
}

/** Whether the configured provider has credentials (custom providers are assumed ready). */
export function isProviderConfigured(cfg) {
  const keys = REQUIRED_KEYS[cfg.provider];
  return !keys || keys.some((k) => Boolean(process.env[k]));
}

/** Register an additional provider (also used to inject fakes in tests). */
export function registerProvider(name, factory) {
  factories.set(name, factory);
}

export function getProvider(cfg) {
  const factory = factories.get(cfg.provider);
  if (!factory) throw new ProviderError(`Unknown AI provider "${cfg.provider}".`, 'not_configured');
  return factory(cfg);
}
