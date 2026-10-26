/**
 * One chat request end to end: load the owner's conversation, run the bounded
 * agent turn, store proposed changes for approval, and persist the exchange.
 */

import { z } from 'zod';
import { AgentError, runAgentTurn } from './agent';
import {
  appendMessages, createConversation, findReplyToClientMessage, getOwnedConversation, historyForModel,
} from './conversations';
import { createProposal, getOwnedProposal, serializeProposal } from './proposals';

export function chatRequestSchema(cfg) {
  return z.object({
    message: z.string().trim().min(1, 'message is required').max(cfg.maxMessageChars, `message must be at most ${cfg.maxMessageChars} characters`),
    conversationId: z.string().regex(/^[a-f0-9]{24}$/i).optional().nullable(),
    clientMessageId: z.string().min(8).max(64).regex(/^[\w-]+$/).optional(),
  }).strict();
}

// One in-flight chat per user, so double-submits can't run two agents that
// propose (or auto-execute) the same changes concurrently.
const inFlight = new Set();

export class ChatError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function presentAction(a) {
  return { tool: a.tool, preview: a.preview, result: a.result };
}

export async function handleChat({ prisma, user, provider, cfg, input }) {
  let conversation = null;
  if (input.conversationId) {
    conversation = await getOwnedConversation(prisma, user.id, input.conversationId);
    if (!conversation) throw new ChatError('Conversation not found.', 'not_found', 404);
  }

  // A retried request (same clientMessageId) returns the stored reply instead
  // of running the agent — and any write proposals — a second time.
  const previous = findReplyToClientMessage(conversation, input.clientMessageId);
  if (previous) {
    const proposal = previous.proposalId ? await getOwnedProposal(prisma, user.id, previous.proposalId) : null;
    return {
      duplicate: true,
      conversationId: conversation.id,
      message: { role: 'assistant', content: previous.content, proposalId: previous.proposalId || null },
      proposal: serializeProposal(proposal),
      steps: [],
      executedActions: [],
      artifacts: {},
    };
  }

  if (inFlight.has(user.id)) throw new ChatError('The assistant is still working on your previous message.', 'busy', 409);
  inFlight.add(user.id);
  const started = Date.now();
  try {
    const result = await runAgentTurn({
      prisma,
      user,
      provider,
      cfg,
      history: historyForModel(conversation, cfg.historyMessages),
      message: input.message,
      project: conversation?.project || null,
    });

    conversation ||= await createConversation(prisma, user.id, input.message);

    const proposal = result.proposedActions.length
      ? await createProposal(prisma, {
        userId: user.id, conversationId: conversation.id, actions: result.proposedActions, ttlMinutes: cfg.proposalTtlMinutes,
      })
      : null;

    const now = new Date();
    const updated = await appendMessages(prisma, conversation, [
      { role: 'user', content: input.message, clientMessageId: input.clientMessageId || null, createdAt: now },
      { role: 'assistant', content: result.text, proposalId: proposal?.id || null, createdAt: now },
    ], { maxStored: cfg.storedMessages, project: result.project });

    // Metadata only: no prompts, task content or tokens.
    console.info('[ai] chat', JSON.stringify({
      userId: user.id,
      conversationId: updated.id,
      stopReason: result.stopReason,
      ms: Date.now() - started,
      ...result.usage,
      proposed: result.proposedActions.length,
      executed: result.executedActions.length,
    }));

    return {
      duplicate: false,
      conversationId: updated.id,
      message: { role: 'assistant', content: result.text, proposalId: proposal?.id || null },
      stopReason: result.stopReason,
      steps: result.steps,
      proposal: serializeProposal(proposal),
      executedActions: result.executedActions.map(presentAction),
      artifacts: result.artifacts,
      project: result.project,
    };
  } catch (error) {
    if (error instanceof AgentError) {
      console.warn('[ai] chat failed', JSON.stringify({ userId: user.id, code: error.code, ms: Date.now() - started }));
      throw Object.assign(new ChatError(error.message, error.code, error.status), {
        executedActions: (error.partial?.executedActions || []).map(presentAction),
      });
    }
    throw error;
  } finally {
    inFlight.delete(user.id);
  }
}
