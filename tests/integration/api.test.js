import { beforeEach, describe, expect, it } from 'vitest';
import { hasDb, prisma, resetDb, createUser, createTaskFor, authHeader, jsonRequest } from '../helpers/db';
import { scriptedProvider, toolCall, callTools, answer, parseResult } from '../helpers/scriptedProvider';
import { registerProvider } from '@/lib/ai/providers';
import { ProviderError } from '@/lib/ai/providers/errors';
import { resetRateLimits } from '@/lib/ai/http';
import { POST as chat } from '@/app/api/ai/chat/route';
import { POST as approve } from '@/app/api/ai/proposals/[id]/approve/route';
import { POST as reject } from '@/app/api/ai/proposals/[id]/reject/route';
import { GET as getConversation, DELETE as deleteConversation } from '@/app/api/ai/conversations/[id]/route';
import { GET as listConversations } from '@/app/api/ai/conversations/route';

let provider;
registerProvider('scripted', () => provider);
const params = (id) => ({ params: Promise.resolve({ id }) });
const send = (user, body) => chat(jsonRequest('/api/ai/chat', { body, headers: authHeader(user) }));

describe.skipIf(!hasDb)('AI API routes', () => {
  let alice; let bob;
  beforeEach(async () => {
    await resetDb();
    resetRateLimits();
    alice = await createUser('Alice Smith');
    bob = await createUser('Bob Jones');
  });

  it('requires authentication', async () => {
    const res = await chat(jsonRequest('/api/ai/chat', { body: { message: 'hi' } }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('unauthorized');
  });

  it('validates input and request size', async () => {
    expect((await send(alice, { message: '' })).status).toBe(400);
    expect((await send(alice, { message: 'hi', extra: true })).status).toBe(400);
    const big = await send(alice, { message: 'x'.repeat(20000) });
    expect([400, 413]).toContain(big.status);
  });

  it('rate-limits per user', async () => {
    provider = scriptedProvider([answer('ok')]);
    const statuses = [];
    for (let i = 0; i < 11; i += 1) statuses.push((await send(alice, { message: `hi ${i}` })).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect((await send(bob, { message: 'hi' })).status).toBe(200);
  });

  it('runs the demo flow end to end: analyze, propose, approve, verify in MongoDB', async () => {
    await createTaskFor(alice, { title: 'Login form validation', priority: 'high', equipment: 'Auth' });
    provider = scriptedProvider([
      callTools(toolCall('get_priority_recommendations', { project: 'Auth', limit: 3 })),
      callTools(toolCall('create_tasks', { tasks: [
        { title: 'Add rate limiting to login', project: 'Auth', priority: 'high', dueDate: 'friday' },
        { title: 'Write auth integration tests', project: 'Auth' },
      ] })),
      answer('Top priority is login validation. I drafted two missing tasks for your approval.'),
    ]);
    const res = await send(alice, { message: 'Analyze the Auth sprint, recommend priorities and draft missing tasks', clientMessageId: 'demo-msg-0001' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.proposal).toMatchObject({ status: 'pending', summary: 'Create 2 tasks' });
    expect(data.proposal.actions[0]).not.toHaveProperty('args'); // raw args stay server-side
    expect(data.artifacts.get_priority_recommendations.ranked[0].title).toBe('Login form validation');
    expect(await prisma.task.count()).toBe(1);

    const ok = await approve(jsonRequest(`/api/ai/proposals/${data.proposal.id}/approve`, { body: {}, headers: authHeader(alice) }), params(data.proposal.id));
    const approved = await ok.json();
    expect(approved.proposal.status).toBe('executed');
    const created = await prisma.task.findMany({ where: { equipment: 'Auth', createdBy: alice.id }, orderBy: { createdAt: 'asc' } });
    expect(created.map((t) => t.title)).toEqual(['Login form validation', 'Add rate limiting to login', 'Write auth integration tests']);
    expect(created[1].dueDate).toBeInstanceOf(Date);
    expect(await prisma.notification.count({ where: { userId: alice.id, type: 'assigned' } })).toBe(2);

    const conv = await (await getConversation(jsonRequest(`/api/ai/conversations/${data.conversationId}`, { method: 'GET', headers: authHeader(alice) }), params(data.conversationId))).json();
    expect(conv.conversation.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'assistant']);
    expect(conv.conversation.messages[2].content).toMatch(/2 of 2 change\(s\) succeeded/);
    expect(conv.proposals[0].status).toBe('executed');
  });

  it('returns the stored reply for a retried message instead of re-running the agent', async () => {
    provider = scriptedProvider([
      callTools(toolCall('create_tasks', { tasks: [{ title: 'Only once please', project: 'P' }] })),
      answer('Drafted.'),
    ]);
    const first = await (await send(alice, { message: 'make a task', clientMessageId: 'retry-key-123' })).json();
    const modelCalls = provider.calls.length;
    const second = await (await send(alice, { message: 'make a task', clientMessageId: 'retry-key-123', conversationId: first.conversationId })).json();
    expect(second.duplicate).toBe(true);
    expect(second.proposal.id).toBe(first.proposal.id);
    expect(provider.calls.length).toBe(modelCalls);
    expect(await prisma.agentProposal.count()).toBe(1);
  });

  it('keeps follow-up context but always re-reads fresh task state', async () => {
    const t = await createTaskFor(alice, { title: 'Payment bug', priority: 'high' });
    provider = scriptedProvider([
      callTools(toolCall('get_sprint_summary', { project: 'L36' })),
      answer('1 open task: Payment bug (pending).'),
    ]);
    const first = await (await send(alice, { message: 'Summarize our sprint' })).json();
    expect(first.project).toBe('L36');

    // Someone completes the task between messages.
    await prisma.task.update({ where: { id: t.id }, data: { status: 'completed', completedAt: new Date() } });

    let fresh;
    provider = scriptedProvider([
      ({ history, userMessage }) => {
        expect(history.map((m) => m.role)).toEqual(['user', 'assistant']);
        expect(history[1].content).toContain('pending'); // stale text from the earlier reply
        expect(userMessage).toContain('Current project context: L36');
        return callTools(toolCall('get_priority_recommendations', { project: 'L36', limit: 3 }));
      },
      ({ toolResults }) => {
        fresh = parseResult(toolResults[0]);
        return answer('Nothing open right now.');
      },
    ]);
    const second = await (await send(alice, { message: 'Which three tasks should we prioritize first?', conversationId: first.conversationId })).json();
    expect(fresh.ranked).toHaveLength(0); // the tool saw the completed status, not the stale history
    expect(second.message.content).toBe('Nothing open right now.');
  });

  it('isolates conversations and proposals between users', async () => {
    provider = scriptedProvider([callTools(toolCall('create_tasks', { tasks: [{ title: 'Alice plan', project: 'P' }] })), answer('Drafted.')]);
    const a = await (await send(alice, { message: 'plan' })).json();

    const peek = await getConversation(jsonRequest(`/api/ai/conversations/${a.conversationId}`, { method: 'GET', headers: authHeader(bob) }), params(a.conversationId));
    expect(peek.status).toBe(404);
    const hijack = await send(bob, { message: 'continue', conversationId: a.conversationId });
    expect(hijack.status).toBe(404);
    const list = await (await listConversations(jsonRequest('/api/ai/conversations', { method: 'GET', headers: authHeader(bob) }))).json();
    expect(list.conversations).toHaveLength(0);
    const steal = await approve(jsonRequest(`/api/ai/proposals/${a.proposal.id}/approve`, { body: {}, headers: authHeader(bob) }), params(a.proposal.id));
    expect(steal.status).toBe(404);
    expect(await prisma.task.count()).toBe(0);
  });

  it('cancels a proposal through the reject route', async () => {
    provider = scriptedProvider([callTools(toolCall('create_tasks', { tasks: [{ title: 'Maybe later', project: 'P' }] })), answer('Drafted.')]);
    const a = await (await send(alice, { message: 'plan' })).json();
    const res = await reject(jsonRequest(`/api/ai/proposals/${a.proposal.id}/reject`, { body: {}, headers: authHeader(alice) }), params(a.proposal.id));
    expect((await res.json()).proposal.status).toBe('cancelled');
    expect(await prisma.task.count()).toBe(0);
  });

  it('deleting a conversation cancels its pending proposals', async () => {
    provider = scriptedProvider([callTools(toolCall('create_tasks', { tasks: [{ title: 'Orphan', project: 'P' }] })), answer('Drafted.')]);
    const a = await (await send(alice, { message: 'plan' })).json();
    const res = await deleteConversation(jsonRequest(`/api/ai/conversations/${a.conversationId}`, { method: 'DELETE', headers: authHeader(alice) }), params(a.conversationId));
    expect(res.status).toBe(200);
    expect((await prisma.agentProposal.findUnique({ where: { id: a.proposal.id } })).status).toBe('cancelled');
  });

  it('maps provider outages to structured 5xx errors without persisting a broken exchange', async () => {
    provider = scriptedProvider([new ProviderError('down', 'unavailable', false)]);
    const res = await send(alice, { message: 'hello' });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatchObject({ code: 'provider_unavailable' });
    expect(await prisma.agentConversation.count()).toBe(0);
  });

  it('reports a missing API key as not configured', async () => {
    const { createAnthropicProvider } = await import('@/lib/ai/providers/anthropic');
    registerProvider('scripted', createAnthropicProvider);
    try {
      const res = await send(alice, { message: 'hello' });
      expect(res.status).toBe(503);
      expect((await res.json()).error.code).toBe('provider_not_configured');
    } finally {
      registerProvider('scripted', () => provider);
    }
  });
});
