/**
 * Bounded agent orchestration for one user request.
 *
 *   interpret → (model ↔ tools)* → finalize
 *
 * Each model call either answers (or asks a follow-up question) or requests
 * tools. Every tool call is checked against the allowlist, validated, and run
 * with the user's permissions. Read tools run immediately; write tools only
 * produce proposed actions unless the approval policy allows a single
 * reversible change to run. The loop stops at the model-call, tool-call and
 * wall-clock limits from config — it never runs open-ended.
 */

import { ProviderError } from './providers/errors';
import { SYSTEM_PROMPT, buildUserTurn } from './prompt';
import { ToolError, executeAction, toolSpecs, validateToolCall } from './tools';
import { todayIn, weekdayOf } from './dates';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_TOOL_RESULT_CHARS = 24000;
const MAX_ACTIONS_PER_TURN = 20;
const ARTIFACT_TOOLS = new Set(['get_sprint_summary', 'get_priority_recommendations', 'get_daily_briefing']);
const AUTO_RISKS = new Set(['reversible']);

export class AgentError extends Error {
  constructor(message, code, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function serialize(result) {
  const json = JSON.stringify(result);
  if (json.length <= MAX_TOOL_RESULT_CHARS) return json;
  return JSON.stringify({
    truncated: true,
    note: 'Result was too large; narrow the filters (project, status, limit) and call again.',
    preview: json.slice(0, MAX_TOOL_RESULT_CHARS - 300),
  });
}

function summarizeArgs(args) {
  const parts = [];
  for (const [k, v] of Object.entries(args || {})) {
    if (k === 'tasks' && Array.isArray(v)) parts.push(`${v.length} task(s)`);
    else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') parts.push(`${k}=${String(v).slice(0, 40)}`);
  }
  return parts.join(', ');
}

/**
 * Run one assistant turn.
 * @returns {Promise<{ text, stopReason, steps, proposedActions, executedActions, artifacts, project, usage }>}
 */
export async function runAgentTurn({ prisma, user, provider, cfg, history, message, project, now = new Date() }) {
  const today = todayIn(cfg.timezone, now);
  const ctx = { prisma, user, cfg, today, now };
  const deadline = now.getTime() + cfg.requestTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.requestTimeoutMs);

  const steps = [];
  const proposedActions = [];
  const executedActions = [];
  const artifacts = {};
  const usage = { modelCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  let currentProject = project || null;

  const turn = provider.startTurn({
    system: SYSTEM_PROMPT,
    tools: toolSpecs(),
    history,
    userMessage: buildUserTurn({
      message, user, today, weekday: WEEKDAY_NAMES[weekdayOf(today)], timezone: cfg.timezone,
      project: currentProject, approvalMode: cfg.approvalMode,
    }),
  });

  async function callModel(toolResults) {
    for (let attempt = 0; ; attempt += 1) {
      if (Date.now() >= deadline) throw new ProviderError('The assistant ran out of time.', 'timeout');
      try {
        usage.modelCalls += 1;
        const res = await turn.next(toolResults, { signal: controller.signal });
        usage.inputTokens += res.usage?.inputTokens || 0;
        usage.outputTokens += res.usage?.outputTokens || 0;
        usage.cacheReadTokens += res.usage?.cacheReadTokens || 0;
        return res;
      } catch (error) {
        const err = error instanceof ProviderError ? error : new ProviderError('Unexpected AI provider failure.', 'unknown');
        if (!err.retryable || attempt >= cfg.providerRetries || controller.signal.aborted) throw err;
        await sleep(Math.min(500 * 2 ** attempt, Math.max(0, deadline - Date.now())));
      }
    }
  }

  async function runTool(call, autoExecuteAllowed) {
    const step = { tool: call.name, args: summarizeArgs(call.input), status: 'ok', summary: '' };
    steps.push(step);
    try {
      if (usage.toolCalls >= cfg.maxToolCalls) {
        throw new ToolError('Tool-call limit reached for this request. Answer with what you already know.', 'limit');
      }
      usage.toolCalls += 1;
      const { tool, args } = validateToolCall(call.name, call.input);
      if (typeof args.project === 'string') currentProject = args.project;

      if (tool.kind === 'read') {
        const result = await tool.run(ctx, args);
        if (ARTIFACT_TOOLS.has(tool.name)) artifacts[tool.name] = result;
        step.summary = 'read live data';
        return { id: call.id, content: serialize(result), isError: false };
      }

      const actions = await tool.prepare(ctx, args);
      for (const a of actions) {
        if (a.args.equipment) currentProject = a.args.equipment;
      }

      if (autoExecuteAllowed && actions.length === 1 && AUTO_RISKS.has(actions[0].risk)) {
        const action = actions[0];
        try {
          const outcome = await executeAction(ctx, action);
          executedActions.push({ ...action, result: { status: 'succeeded', ...outcome } });
          step.status = 'executed';
          step.summary = outcome.message;
          return { id: call.id, content: serialize({ status: 'executed', verified: true, message: outcome.message }), isError: false };
        } catch (error) {
          const msg = error instanceof ToolError ? error.message : 'The change could not be saved.';
          if (!(error instanceof ToolError)) console.error('[ai] auto-execute failed:', error.message);
          executedActions.push({ ...action, result: { status: 'failed', message: msg } });
          step.status = 'failed';
          step.summary = msg;
          return { id: call.id, content: serialize({ status: 'failed', error: msg }), isError: true };
        }
      }

      if (proposedActions.length + actions.length > MAX_ACTIONS_PER_TURN) {
        throw new ToolError(`At most ${MAX_ACTIONS_PER_TURN} changes can be proposed at once.`, 'limit');
      }
      const first = proposedActions.length + 1;
      proposedActions.push(...actions);
      step.status = 'proposed';
      step.summary = `${actions.length} change(s) proposed`;
      return {
        id: call.id,
        content: serialize({
          status: 'proposed',
          message: 'NOT executed yet. These changes are shown to the user for approval.',
          actionNumbers: actions.map((_, i) => first + i),
          previews: actions.map((a) => a.preview),
        }),
        isError: false,
      };
    } catch (error) {
      step.status = 'error';
      if (error instanceof ToolError) {
        step.summary = error.message;
        return { id: call.id, content: serialize({ error: error.message, code: error.code }), isError: true };
      }
      console.error(`[ai] tool ${call.name} failed:`, error.message);
      step.summary = 'internal error';
      return { id: call.id, content: serialize({ error: 'Internal error while running this tool.' }), isError: true };
    }
  }

  let text = '';
  let stopReason = 'completed';
  let toolResults = [];
  let wroteThisTurn = false;

  try {
    while (true) {
      if (usage.modelCalls >= cfg.maxModelCalls) {
        stopReason = 'max_model_calls';
        break;
      }
      const res = await callModel(toolResults);
      toolResults = [];
      if (res.text) text = res.text;

      if (res.stopReason === 'refusal') {
        stopReason = 'refusal';
        text = 'I can\'t help with that request.';
        break;
      }
      if (res.stopReason === 'pause_turn') continue;
      if (!res.toolCalls.length) {
        if (res.stopReason === 'max_tokens') stopReason = 'max_tokens';
        break;
      }
      if (res.stopReason === 'max_tokens') {
        // A truncated tool call may have incomplete arguments; don't run it.
        stopReason = 'max_tokens';
        break;
      }

      // Auto-execution (when enabled) applies only to a response that makes a
      // single write call, and only if nothing was written earlier this turn.
      const writeCalls = res.toolCalls.filter((c) => {
        const kind = (() => { try { return validateToolCall(c.name, c.input).tool.kind; } catch { return null; } })();
        return kind === 'write';
      });
      const autoOk = cfg.approvalMode === 'single_reversible' && writeCalls.length === 1 && !wroteThisTurn;
      if (writeCalls.length) wroteThisTurn = true;

      for (const call of res.toolCalls) {
        toolResults.push(await runTool(call, autoOk && call === writeCalls[0]));
      }
    }
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof ProviderError) {
      // Anything already executed stays executed; report it honestly.
      throw Object.assign(new AgentError(error.message, `provider_${error.code}`, error.code === 'not_configured' ? 503 : 502), {
        partial: { steps, proposedActions, executedActions },
      });
    }
    throw error;
  }
  clearTimeout(timer);

  if (stopReason === 'max_model_calls' || stopReason === 'max_tokens' || !text) {
    const note = stopReason === 'max_tokens'
      ? 'My reply was cut off before I finished.'
      : stopReason === 'max_model_calls'
        ? 'I reached the step limit for one request before finishing.'
        : 'I could not produce an answer.';
    const parts = [text, note];
    if (proposedActions.length) parts.push(`${proposedActions.length} proposed change(s) are ready for your review below.`);
    if (executedActions.length) parts.push(`${executedActions.length} change(s) already ran; see the results below.`);
    text = parts.filter(Boolean).join('\n\n');
  }

  return { text, stopReason, steps, proposedActions, executedActions, artifacts, project: currentProject, usage, today };
}
