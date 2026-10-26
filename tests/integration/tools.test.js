import { beforeEach, describe, expect, it } from 'vitest';
import { hasDb, prisma, resetDb, createUser, createTaskFor, makeCtx, dueIn } from '../helpers/db';
import { validateToolCall, executeAction, ToolError } from '@/lib/ai/tools';

async function run(ctx, name, input) {
  const { tool, args } = validateToolCall(name, input);
  return tool.kind === 'read' ? tool.run(ctx, args) : tool.prepare(ctx, args);
}

describe.skipIf(!hasDb)('tools: access control and data', () => {
  let alice; let bob; let carol;
  beforeEach(async () => {
    await resetDb();
    alice = await createUser('Alice Smith');
    bob = await createUser('Bob Jones');
    carol = await createUser('Carol White');
  });

  it('list_tasks only returns tasks the user created or is assigned to', async () => {
    await createTaskFor(alice, { title: 'Alice own' });
    await createTaskFor(bob, { title: 'Bob assigned Alice', assignedTo: [alice.id] });
    await createTaskFor(bob, { title: 'Bob private' });
    await createTaskFor(carol, { title: 'Carol private', equipment: 'L99' });

    const res = await run(makeCtx(alice), 'list_tasks', {});
    expect(res.tasks.map((t) => t.title).sort()).toEqual(['Alice own', 'Bob assigned Alice']);
    expect(res.total).toBe(2);

    const projects = await run(makeCtx(alice), 'list_projects', {});
    expect(projects.projects.map((p) => p.project)).toEqual(['L36']);
  });

  it('filters by status, priority, assignee and overdue using server-side dates', async () => {
    await createTaskFor(alice, { title: 'Overdue high', priority: 'high', dueDate: dueIn(-2) });
    await createTaskFor(alice, { title: 'Due later', dueDate: dueIn(10) });
    await createTaskFor(alice, { title: 'Done', status: 'completed', dueDate: dueIn(-5) });
    await createTaskFor(alice, { title: 'For Bob', assignedTo: [bob.id] });

    const ctx = makeCtx(alice);
    expect((await run(ctx, 'list_tasks', { overdueOnly: true })).tasks.map((t) => t.title)).toEqual(['Overdue high']);
    expect((await run(ctx, 'list_tasks', { priority: 'high' })).tasks).toHaveLength(1);
    expect((await run(ctx, 'list_tasks', { assignee: 'Bob Jones' })).tasks.map((t) => t.title)).toEqual(['For Bob']);
    expect((await run(ctx, 'list_tasks', { status: 'open', dueBefore: 'in 5 days' })).tasks.map((t) => t.title)).toEqual(['Overdue high']);
    const overdue = (await run(ctx, 'list_tasks', { overdueOnly: true })).tasks[0];
    expect(overdue).toMatchObject({ daysUntilDue: -2, overdue: true });
  });

  it('get_task_details hides other users\' tasks behind the same not-found error', async () => {
    const hidden = await createTaskFor(bob, { title: 'Secret' });
    const missingId = '0123456789abcdef01234567';
    const err1 = await run(makeCtx(alice), 'get_task_details', { taskId: hidden.id }).catch((e) => e);
    const err2 = await run(makeCtx(alice), 'get_task_details', { taskId: missingId }).catch((e) => e);
    expect(err1).toBeInstanceOf(ToolError);
    expect(err1.message).toBe(err2.message);
  });

  it('refuses to prepare changes to another user\'s task', async () => {
    const hidden = await createTaskFor(bob, { title: 'Secret' });
    for (const [name, input] of [
      ['update_task_status', { taskId: hidden.id, status: 'completed' }],
      ['update_task', { taskId: hidden.id, changes: { title: 'Pwned task' } }],
      ['add_task_comment', { taskId: hidden.id, content: 'hi' }],
      ['delete_task', { taskId: hidden.id }],
    ]) {
      await expect(run(makeCtx(alice), name, input)).rejects.toThrow(/not found/i);
    }
  });

  it('enforces existing role rules: assignees cannot delete, reassign, or reopen completed tasks', async () => {
    const t = await createTaskFor(bob, { title: 'Shared', assignedTo: [alice.id] });
    await expect(run(makeCtx(alice), 'delete_task', { taskId: t.id })).rejects.toThrow(/Only the task creator/);
    await expect(run(makeCtx(alice), 'update_task', { taskId: t.id, changes: { assignees: ['me'] } })).rejects.toThrow(/Only the task creator/);
    const done = await createTaskFor(bob, { title: 'Done', assignedTo: [alice.id], status: 'completed' });
    await expect(run(makeCtx(alice), 'update_task_status', { taskId: done.id, status: 'pending' })).rejects.toThrow(/completed task/);
  });

  it('re-checks permissions at execution time, not just when proposed', async () => {
    const t = await createTaskFor(bob, { title: 'Shared', assignedTo: [alice.id] });
    const [action] = await run(makeCtx(alice), 'update_task_status', { taskId: t.id, status: 'in-progress' });
    await prisma.task.update({ where: { id: t.id }, data: { assignedTo: [bob.id] } });
    await expect(executeAction(makeCtx(alice), action)).rejects.toThrow(/not found/i);
    expect((await prisma.task.findUnique({ where: { id: t.id } })).status).toBe('pending');
  });

  it('create_tasks resolves relative dates, defaults assignee to the requester, and flags missing data', async () => {
    const actions = await run(makeCtx(alice), 'create_tasks', {
      tasks: [
        { title: 'Fix login validation', project: 'Auth', priority: 'high', dueDate: 'in 3 days' },
        { title: 'Write auth tests', project: 'Auth', assignees: ['Bob Jones'] },
      ],
    });
    expect(actions).toHaveLength(2);
    expect(actions[0].args).toMatchObject({ equipment: 'Auth', area: 'General', priority: 'high', assignedTo: [alice.id] });
    expect(actions[0].args.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(actions[0].preview.notes).toContain('No assignee given — assigned to you.');
    expect(actions[1].args.assignedTo).toEqual([bob.id]);
    expect(actions[1].preview.notes).toContain('No due date.');
    expect(await prisma.task.count()).toBe(0); // nothing saved by preparing
  });

  it('rejects unknown assignees and unparseable dates instead of guessing', async () => {
    await expect(run(makeCtx(alice), 'create_tasks', { tasks: [{ title: 'X task', project: 'P', assignees: ['Nobody'] }] })).rejects.toThrow(/No team member/);
    await expect(run(makeCtx(alice), 'create_tasks', { tasks: [{ title: 'X task', project: 'P', dueDate: 'whenever' }] })).rejects.toThrow(/Could not interpret/);
  });

  it('executes and verifies a status change, keeping completedAt and notifications consistent', async () => {
    const t = await createTaskFor(alice, { title: 'Ship it', assignedTo: [alice.id, bob.id] });
    const [action] = await run(makeCtx(alice), 'update_task_status', { taskId: t.id, status: 'completed' });
    const out = await executeAction(makeCtx(alice), action);
    expect(out.message).toMatch(/pending to completed/);
    const saved = await prisma.task.findUnique({ where: { id: t.id } });
    expect(saved.status).toBe('completed');
    expect(saved.completedAt).toBeInstanceOf(Date);
    const notes = await prisma.notification.findMany({ where: { taskId: t.id, type: 'status_update' } });
    expect(notes.map((n) => n.userId)).toEqual([bob.id]);
  });

  it('update_task detects that the task changed after the proposal', async () => {
    const t = await createTaskFor(alice, { title: 'Original title' });
    const [action] = await run(makeCtx(alice), 'update_task', { taskId: t.id, changes: { priority: 'high' } });
    await new Promise((r) => setTimeout(r, 5));
    await prisma.task.update({ where: { id: t.id }, data: { title: 'Edited elsewhere' } });
    await expect(executeAction(makeCtx(alice), action)).rejects.toThrow(/changed after/);
  });

  it('sprint summary and priorities are computed from the database', async () => {
    await createTaskFor(alice, { title: 'Late', priority: 'high', dueDate: dueIn(-1) });
    await createTaskFor(alice, { title: 'Soon', dueDate: dueIn(1) });
    await createTaskFor(alice, { title: 'Finished', status: 'completed', completedAt: new Date() });
    const blocked = await createTaskFor(alice, { title: 'Waiting', priority: 'low' });
    await prisma.comment.create({ data: { taskId: blocked.id, authorId: bob.id, content: 'Blocked by the vendor' } });

    const summary = await run(makeCtx(alice), 'get_sprint_summary', { project: 'L36' });
    expect(summary).toMatchObject({ totalTasks: 4, completionRatePercent: 25, openTasks: 3 });
    expect(summary.overdue.map((t) => t.title)).toEqual(['Late']);
    expect(summary.potentialBlockers).toEqual([expect.objectContaining({ title: 'Waiting', flaggedBecause: 'comment mentions "blocked"' })]);

    const prio = await run(makeCtx(alice), 'get_priority_recommendations', { project: 'L36', limit: 3 });
    expect(prio.ranked[0].title).toBe('Late');
    expect(prio.ranked[0].reasons[1]).toMatch(/overdue by 1 day/);
  });

  it('deadline reminders reuse notifications and never duplicate within 24h', async () => {
    const t = await createTaskFor(alice, { title: 'Due tomorrow', dueDate: dueIn(1), assignedTo: [alice.id, bob.id] });
    const actions = await run(makeCtx(alice), 'create_deadline_reminders', {});
    expect(actions).toHaveLength(1);
    await executeAction(makeCtx(alice), actions[0]);
    // A second run, or a re-executed stale action, sends nothing new.
    await expect(run(makeCtx(alice), 'create_deadline_reminders', {})).rejects.toThrow(/already reminded/);
    const again = await executeAction(makeCtx(alice), actions[0]);
    expect(again.message).toMatch(/already reminded/);
    expect(await prisma.notification.count({ where: { taskId: t.id, type: 'deadline_reminder' } })).toBe(2);
  });
});
