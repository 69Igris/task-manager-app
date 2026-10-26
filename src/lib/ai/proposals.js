/**
 * Proposed changes awaiting human approval.
 *
 * pending ──approve──▶ executing ──▶ executed | partially_failed | failed
 *    │
 *    ├──reject──▶ cancelled
 *    └──(ttl)───▶ expired
 *
 * The pending → executing step is a conditional update, so concurrent or
 * retried approvals execute a proposal at most once; later calls get the
 * stored results back.
 */

import { ToolError, executeAction } from './tools';
import { todayIn } from './dates';
import { appendMessages, getOwnedConversation } from './conversations';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const FINAL = new Set(['executed', 'partially_failed', 'failed', 'cancelled', 'expired']);

const VERBS = {
  create_task: ['Create', 'task'],
  update_task: ['Update', 'task'],
  update_task_status: ['Change status of', 'task'],
  add_task_comment: ['Comment on', 'task'],
  delete_task: ['Delete', 'task'],
  create_deadline_reminder: ['Send reminders for', 'task'],
};

export function summarizeActions(actions) {
  const counts = new Map();
  for (const a of actions) counts.set(a.tool, (counts.get(a.tool) || 0) + 1);
  return [...counts.entries()]
    .map(([tool, n]) => {
      const [verb, noun] = VERBS[tool] || ['Run', 'action'];
      return `${verb} ${n} ${noun}${n === 1 ? '' : 's'}`;
    })
    .join(', ');
}

export async function createProposal(prisma, { userId, conversationId, actions, ttlMinutes }) {
  const stored = actions.map((a, i) => ({ id: `a${i + 1}`, tool: a.tool, args: a.args, preview: a.preview, risk: a.risk }));
  return prisma.agentProposal.create({
    data: {
      userId,
      conversationId: conversationId || null,
      status: 'pending',
      summary: summarizeActions(stored),
      actions: stored,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    },
  });
}

export function serializeProposal(p) {
  if (!p) return null;
  return {
    id: p.id,
    status: p.status,
    summary: p.summary,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
    decidedAt: p.decidedAt,
    // Raw args stay server-side; the client only needs the preview.
    actions: (p.actions || []).map((a) => ({ id: a.id, tool: a.tool, risk: a.risk, preview: a.preview })),
    results: p.results || null,
  };
}

export async function getOwnedProposal(prisma, userId, proposalId) {
  if (!proposalId || !OBJECT_ID.test(proposalId)) return null;
  return prisma.agentProposal.findFirst({ where: { id: proposalId, userId } });
}

export class ProposalError extends Error {
  constructor(message, code, status, proposal = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.proposal = proposal;
  }
}

async function claim(prisma, proposal, userId, nextStatus) {
  if (proposal.status === 'pending' && new Date(proposal.expiresAt) <= new Date()) {
    await prisma.agentProposal.updateMany({ where: { id: proposal.id, status: 'pending' }, data: { status: 'expired' } });
    throw new ProposalError('This proposal has expired. Ask the assistant again for a fresh one.', 'expired', 410);
  }
  const { count } = await prisma.agentProposal.updateMany({
    where: { id: proposal.id, userId, status: 'pending' },
    data: { status: nextStatus, decidedAt: new Date() },
  });
  return count === 1;
}

async function recordInConversation(prisma, userId, proposal, text, cfg) {
  if (!proposal.conversationId) return;
  const conversation = await getOwnedConversation(prisma, userId, proposal.conversationId);
  if (!conversation) return;
  await appendMessages(prisma, conversation, [{ role: 'assistant', content: text, createdAt: new Date() }], {
    maxStored: cfg.storedMessages,
  });
}

/**
 * Execute the selected actions of a pending proposal. `actionIds` omitted
 * means all actions; unselected actions are recorded as skipped.
 */
export async function approveProposal(prisma, user, proposalId, { actionIds, cfg }) {
  const proposal = await getOwnedProposal(prisma, user.id, proposalId);
  if (!proposal) throw new ProposalError('Proposal not found.', 'not_found', 404);

  if (!(await claim(prisma, proposal, user.id, 'executing'))) {
    const current = await getOwnedProposal(prisma, user.id, proposalId);
    if (FINAL.has(current.status) && current.status !== 'cancelled' && current.status !== 'expired') {
      return { proposal: current, duplicate: true };
    }
    throw new ProposalError(
      current.status === 'executing' ? 'This proposal is already being executed.' : `This proposal is ${current.status}.`,
      'invalid_state', 409, current
    );
  }

  const now = new Date();
  const ctx = { prisma, user, cfg, now, today: todayIn(cfg.timezone, now) };
  const selected = actionIds ? new Set(actionIds) : null;
  const results = [];

  for (const action of proposal.actions) {
    if (selected && !selected.has(action.id)) {
      results.push({ actionId: action.id, status: 'skipped', message: 'Not selected' });
      continue;
    }
    try {
      const outcome = await executeAction(ctx, action);
      results.push({ actionId: action.id, status: 'succeeded', verified: true, ...outcome });
    } catch (error) {
      if (!(error instanceof ToolError)) console.error(`[ai] proposal ${proposal.id} action ${action.id} failed:`, error.message);
      results.push({
        actionId: action.id,
        status: 'failed',
        message: error instanceof ToolError ? error.message : 'Unexpected error while saving this change.',
      });
    }
    // Persist progress so a crash mid-batch still shows what already ran.
    await prisma.agentProposal.update({ where: { id: proposal.id }, data: { results } });
  }

  const attempted = results.filter((r) => r.status !== 'skipped');
  const succeeded = attempted.filter((r) => r.status === 'succeeded').length;
  const status = attempted.length === 0
    ? 'cancelled'
    : succeeded === attempted.length ? 'executed' : succeeded === 0 ? 'failed' : 'partially_failed';

  const updated = await prisma.agentProposal.update({ where: { id: proposal.id }, data: { status, results } });

  const lines = results
    .filter((r) => r.status !== 'skipped')
    .map((r) => `- ${r.status === 'succeeded' ? 'Done' : 'Failed'}: ${r.message}`);
  const skipped = results.length - attempted.length;
  const header = {
    executed: `Approved and executed: ${succeeded} of ${attempted.length} change(s) succeeded.`,
    partially_failed: `Partially completed: ${succeeded} of ${attempted.length} change(s) succeeded.`,
    failed: `None of the ${attempted.length} approved change(s) could be saved.`,
    cancelled: 'No changes were selected, so nothing was executed.',
  }[status];
  await recordInConversation(prisma, user.id, updated,
    [header, ...lines, skipped ? `${skipped} change(s) were not selected and were skipped.` : ''].filter(Boolean).join('\n'), cfg);

  return { proposal: updated, duplicate: false };
}

export async function rejectProposal(prisma, user, proposalId, { cfg }) {
  const proposal = await getOwnedProposal(prisma, user.id, proposalId);
  if (!proposal) throw new ProposalError('Proposal not found.', 'not_found', 404);
  if (!(await claim(prisma, proposal, user.id, 'cancelled'))) {
    const current = await getOwnedProposal(prisma, user.id, proposalId);
    if (current.status === 'cancelled') return { proposal: current, duplicate: true };
    throw new ProposalError(`This proposal is already ${current.status}.`, 'invalid_state', 409, current);
  }
  const updated = await getOwnedProposal(prisma, user.id, proposalId);
  await recordInConversation(prisma, user.id, updated, `Proposal cancelled: ${updated.summary}. Nothing was changed.`, cfg);
  return { proposal: updated, duplicate: false };
}
