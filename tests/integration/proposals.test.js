import { beforeEach, describe, expect, it } from 'vitest';
import { hasDb, prisma, resetDb, createUser, createTaskFor, makeCtx } from '../helpers/db';
import { validateToolCall } from '@/lib/ai/tools';
import { approveProposal, createProposal, rejectProposal, ProposalError } from '@/lib/ai/proposals';
import { getAiConfig } from '@/lib/ai/config';

const cfg = getAiConfig();
async function propose(user, name, input, ttlMinutes = 60) {
  const { tool, args } = validateToolCall(name, input);
  const actions = await tool.prepare(makeCtx(user), args);
  return createProposal(prisma, { userId: user.id, conversationId: null, actions, ttlMinutes });
}
const newTasks = (n) => ({ tasks: Array.from({ length: n }, (_, i) => ({ title: `Planned task ${i + 1}`, project: 'Auth', priority: 'high' })) });

describe.skipIf(!hasDb)('proposals: approval workflow', () => {
  let alice; let bob;
  beforeEach(async () => {
    await resetDb();
    alice = await createUser('Alice Smith');
    bob = await createUser('Bob Jones');
  });

  it('creates nothing until approved, then creates and verifies every task', async () => {
    const proposal = await propose(alice, 'create_tasks', newTasks(3));
    expect(proposal.summary).toBe('Create 3 tasks');
    expect(await prisma.task.count()).toBe(0);

    const { proposal: done, duplicate } = await approveProposal(prisma, alice, proposal.id, { cfg });
    expect(duplicate).toBe(false);
    expect(done.status).toBe('executed');
    expect(done.results.map((r) => r.status)).toEqual(['succeeded', 'succeeded', 'succeeded']);
    const saved = await prisma.task.findMany({ where: { equipment: 'Auth' } });
    expect(saved.map((t) => t.title).sort()).toEqual(['Planned task 1', 'Planned task 2', 'Planned task 3']);
    expect(saved.every((t) => t.createdBy === alice.id && t.priority === 'high')).toBe(true);
    expect(done.results.map((r) => r.taskId).sort()).toEqual(saved.map((t) => t.id).sort());
  });

  it('is idempotent: a retried or concurrent approval never creates duplicates', async () => {
    const proposal = await propose(alice, 'create_tasks', newTasks(2));
    const [a, b] = await Promise.allSettled([
      approveProposal(prisma, alice, proposal.id, { cfg }),
      approveProposal(prisma, alice, proposal.id, { cfg }),
    ]);
    const outcomes = [a, b].map((x) => (x.status === 'fulfilled' ? (x.value.duplicate ? 'duplicate' : 'ran') : x.reason.code));
    expect(outcomes.filter((o) => o === 'ran')).toHaveLength(1);
    const retry = await approveProposal(prisma, alice, proposal.id, { cfg });
    expect(retry.duplicate).toBe(true);
    expect(await prisma.task.count()).toBe(2);
  });

  it('executes only the selected actions and records the rest as skipped', async () => {
    const proposal = await propose(alice, 'create_tasks', newTasks(3));
    const { proposal: done } = await approveProposal(prisma, alice, proposal.id, { cfg, actionIds: ['a1', 'a3'] });
    expect(done.results.map((r) => r.status)).toEqual(['succeeded', 'skipped', 'succeeded']);
    expect(await prisma.task.count()).toBe(2);
  });

  it('reports partial failure honestly when one action can no longer run', async () => {
    const t1 = await createTaskFor(alice, { title: 'Still here' });
    const t2 = await createTaskFor(alice, { title: 'Will vanish' });
    const { tool, args } = validateToolCall('update_task_status', { taskId: t1.id, status: 'completed' });
    const second = validateToolCall('update_task_status', { taskId: t2.id, status: 'completed' });
    const actions = [...await tool.prepare(makeCtx(alice), args), ...await second.tool.prepare(makeCtx(alice), second.args)];
    const proposal = await createProposal(prisma, { userId: alice.id, actions, ttlMinutes: 60 });
    await prisma.task.delete({ where: { id: t2.id } });

    const { proposal: done } = await approveProposal(prisma, alice, proposal.id, { cfg });
    expect(done.status).toBe('partially_failed');
    expect(done.results[0]).toMatchObject({ status: 'succeeded', verified: true });
    expect(done.results[1]).toMatchObject({ status: 'failed', message: expect.stringMatching(/not found/i) });
  });

  it('marks a proposal failed when every action fails', async () => {
    const t = await createTaskFor(alice, { title: 'Gone' });
    const proposal = await propose(alice, 'delete_task', { taskId: t.id });
    await prisma.task.delete({ where: { id: t.id } });
    const { proposal: done } = await approveProposal(prisma, alice, proposal.id, { cfg });
    expect(done.status).toBe('failed');
  });

  it('cancels on rejection and cannot be approved afterwards', async () => {
    const proposal = await propose(alice, 'create_tasks', newTasks(1));
    const { proposal: cancelled } = await rejectProposal(prisma, alice, proposal.id, { cfg });
    expect(cancelled.status).toBe('cancelled');
    const err = await approveProposal(prisma, alice, proposal.id, { cfg }).catch((e) => e);
    expect(err).toBeInstanceOf(ProposalError);
    expect(err.status).toBe(409);
    expect(await prisma.task.count()).toBe(0);
  });

  it('refuses expired proposals', async () => {
    const proposal = await propose(alice, 'create_tasks', newTasks(1), 0);
    const err = await approveProposal(prisma, alice, proposal.id, { cfg }).catch((e) => e);
    expect(err).toMatchObject({ code: 'expired', status: 410 });
    expect((await prisma.agentProposal.findUnique({ where: { id: proposal.id } })).status).toBe('expired');
  });

  it('does not let another user approve, reject or even see a proposal', async () => {
    const proposal = await propose(alice, 'create_tasks', newTasks(1));
    await expect(approveProposal(prisma, bob, proposal.id, { cfg })).rejects.toMatchObject({ status: 404 });
    await expect(rejectProposal(prisma, bob, proposal.id, { cfg })).rejects.toMatchObject({ status: 404 });
    expect((await prisma.agentProposal.findUnique({ where: { id: proposal.id } })).status).toBe('pending');
  });
});
