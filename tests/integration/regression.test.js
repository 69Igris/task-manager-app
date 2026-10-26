import { beforeEach, describe, expect, it } from 'vitest';
import { hasDb, prisma, resetDb, createUser, createTaskFor, authHeader, jsonRequest } from '../helpers/db';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as refresh } from '@/app/api/auth/refresh/route';
import { GET as listTasks, POST as createTaskRoute } from '@/app/api/tasks/route';
import { PATCH as patchTask, DELETE as deleteTask } from '@/app/api/tasks/[id]/route';
import { POST as postComment } from '@/app/api/tasks/[id]/comments/route';
import { POST as checkReminders } from '@/app/api/notifications/check-reminders/route';

const params = (id) => ({ params: Promise.resolve({ id }) });

describe.skipIf(!hasDb)('existing features (regression)', () => {
  let alice; let bob;
  beforeEach(async () => {
    await resetDb();
    alice = await createUser('Alice Smith');
    bob = await createUser('Bob Jones');
  });

  it('login issues tokens and refresh rotates the refresh token', async () => {
    const res = await login(jsonRequest('/api/auth/login', { body: { email: alice.email, password: 'Test123!' } }));
    expect(res.status).toBe(200);
    const { accessToken, refreshToken } = await res.json();
    expect(accessToken).toBeTruthy();

    const r1 = await refresh(jsonRequest('/api/auth/refresh', { body: { refreshToken } }));
    expect(r1.status).toBe(200);
    const rotated = await r1.json();
    expect(rotated.refreshToken).not.toBe(refreshToken);
    // The old token is single-use.
    expect((await refresh(jsonRequest('/api/auth/refresh', { body: { refreshToken } }))).status).toBe(401);
    expect((await login(jsonRequest('/api/auth/login', { body: { email: alice.email, password: 'wrong' } }))).status).toBe(401);
  });

  it('POST /api/tasks creates a task and assignment notifications (same response shape)', async () => {
    const res = await createTaskRoute(jsonRequest('/api/tasks', {
      headers: authHeader(alice),
      body: { equipment: 'L36', area: 'Rack', title: 'Inspect', assignedTo: [bob.id], dueDate: '2026-11-01' },
    }));
    expect(res.status).toBe(201);
    const task = await res.json();
    expect(task).toMatchObject({ title: 'Inspect', priority: 'medium', creator: { id: alice.id }, assignedUsers: [{ id: bob.id }] });
    expect(new Date(task.dueDate).toISOString()).toBe('2026-11-01T00:00:00.000Z');
    const note = await prisma.notification.findFirst({ where: { taskId: task.id } });
    expect(note).toMatchObject({ userId: bob.id, type: 'assigned' });
    expect(note.nextReminderAt).toBeInstanceOf(Date);

    const bad = await createTaskRoute(jsonRequest('/api/tasks', { headers: authHeader(alice), body: { title: 'x', assignedTo: [bob.id, alice.id, bob.id] } }));
    expect(bad.status).toBe(400);
  });

  it('GET /api/tasks still returns team tasks with assignees', async () => {
    await createTaskFor(bob, { title: 'Bob task' });
    const res = await listTasks(jsonRequest('/api/tasks', { method: 'GET', headers: authHeader(alice) }));
    const { tasks } = await res.json();
    expect(tasks.map((t) => t.title)).toEqual(['Bob task']);
    expect(tasks[0].assignedUsers[0].id).toBe(bob.id);
  });

  it('PATCH status keeps permissions, completedAt and notifications', async () => {
    const t = await createTaskFor(alice, { assignedTo: [bob.id] });
    const res = await patchTask(jsonRequest(`/api/tasks/${t.id}`, { method: 'PATCH', headers: authHeader(bob), body: { status: 'completed' } }), params(t.id));
    expect(res.status).toBe(200);
    expect((await res.json()).task.completedAt).toBeTruthy();
    expect(await prisma.notification.count({ where: { taskId: t.id, type: 'status_update', userId: alice.id } })).toBe(1);

    const reopen = await patchTask(jsonRequest(`/api/tasks/${t.id}`, { method: 'PATCH', headers: authHeader(bob), body: { status: 'pending' } }), params(t.id));
    expect(reopen.status).toBe(403);
    const invalid = await patchTask(jsonRequest(`/api/tasks/${t.id}`, { method: 'PATCH', headers: authHeader(alice), body: { status: 'nope' } }), params(t.id));
    expect(invalid.status).toBe(400);
    const back = await patchTask(jsonRequest(`/api/tasks/${t.id}`, { method: 'PATCH', headers: authHeader(alice), body: { status: 'pending' } }), params(t.id));
    expect((await back.json()).task.completedAt).toBeNull();
  });

  it('comments notify participants; delete is creator-only', async () => {
    const t = await createTaskFor(alice, { assignedTo: [bob.id] });
    const res = await postComment(jsonRequest(`/api/tasks/${t.id}/comments`, { headers: authHeader(bob), body: { content: ' Looks good ' } }), params(t.id));
    expect(res.status).toBe(201);
    expect((await res.json()).comment).toMatchObject({ content: 'Looks good', author: { id: bob.id } });
    expect(await prisma.notification.count({ where: { taskId: t.id, type: 'comment', userId: alice.id } })).toBe(1);

    expect((await deleteTask(jsonRequest(`/api/tasks/${t.id}`, { method: 'DELETE', headers: authHeader(bob) }), params(t.id))).status).toBe(403);
    expect((await deleteTask(jsonRequest(`/api/tasks/${t.id}`, { method: 'DELETE', headers: authHeader(alice) }), params(t.id))).status).toBe(200);
  });

  it('reminder check still creates reminders for open assigned tasks', async () => {
    const t = await createTaskFor(alice, { assignedTo: [bob.id] });
    await prisma.notification.create({
      data: { userId: bob.id, taskId: t.id, type: 'assigned', message: 'm', nextReminderAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 3600e3) },
    });
    const res = await checkReminders(jsonRequest('/api/notifications/check-reminders', {}));
    expect((await res.json()).remindersCreated).toBe(1);
  });
});
