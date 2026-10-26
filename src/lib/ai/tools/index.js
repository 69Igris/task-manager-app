/**
 * The assistant's tool allowlist. The model can only reach the database through
 * these definitions; anything else it asks for is rejected.
 */

import { z } from 'zod';
import { READ_TOOLS } from './read';
import { WRITE_TOOLS } from './write';
import { ToolError } from './shared';

export { executeAction } from './write';
export { ToolError } from './shared';

export const TOOLS = [...READ_TOOLS, ...WRITE_TOOLS];
const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

export function getTool(name) {
  return BY_NAME.get(name) || null;
}

/** Provider-neutral tool specs: name, description, JSON Schema. */
export function toolSpecs() {
  return TOOLS.map((tool) => {
    const { $schema, ...inputSchema } = z.toJSONSchema(tool.schema);
    return { name: tool.name, description: tool.description, inputSchema };
  });
}

function formatIssues(error) {
  return error.issues
    .slice(0, 8)
    .map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('; ');
}

/**
 * Smaller open models often send null for omitted optional fields and numbers
 * as strings. Used only as a fallback when the raw arguments fail validation,
 * so meaningful nulls (e.g. clearing a due date) are kept when they are valid.
 */
function normalizeLoose(value) {
  if (Array.isArray(value)) return value.map(normalizeLoose);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null) continue;
      out[k] = normalizeLoose(v);
    }
    return out;
  }
  if (typeof value === 'string' && /^-?\d{1,6}$/.test(value.trim())) return Number(value.trim());
  if (value === 'true' || value === 'false') return value === 'true';
  return value;
}

/**
 * Validate a model-issued tool call. Returns { tool, args } or throws a
 * ToolError the model can read and correct.
 */
export function validateToolCall(name, input) {
  const tool = getTool(name);
  if (!tool) throw new ToolError(`Tool "${name}" is not available. Use only the tools you were given.`, 'unknown_tool');
  let parsed = tool.schema.safeParse(input ?? {});
  if (!parsed.success) {
    const loose = tool.schema.safeParse(normalizeLoose(input ?? {}));
    if (loose.success) parsed = loose;
  }
  if (!parsed.success) throw new ToolError(`Invalid arguments for ${name}: ${formatIssues(parsed.error)}`, 'invalid_arguments');
  return { tool, args: parsed.data };
}
