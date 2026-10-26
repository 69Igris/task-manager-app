/**
 * Write tools. The model never mutates data directly: `prepare` validates the
 * arguments, checks permissions against the current database state and builds
 * previewable actions. Actions run later through `executeAction`, which checks
 * permissions again (the task may have changed) and re-reads the database to
 * verify the result.
 */

import { z } from 'zod';
import {
  MAX_ASSIGNEES, TASK_PRIORITIES, TASK_STATUSES, addTaskComment, changeTaskStatus,
  createTask, updateTaskFields,
} from '@/lib/tasks/service';
import { dueDateToIso, isoToDueDate } from '../dates';
import { daysUntilDue } from '../insights';
import {
  ToolError, dateExpr, loadAccessibleTask, loadScopedTasks, loadUserNames, nameOf,
  objectId, resolveAssignees, resolveDateOrThrow,
} from './shared';

const REMINDER_TYPE = 'deadline_reminder';
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

const title = z.string().trim().min(3).max(200);
const description = z.string().trim().max(2000);
const project = z.string().trim().min(1).max(100);
const area = z.string().trim().min(1).max(100);

// ---------------------------------------------------------------------------
// Tool definitions (what the model can call)
// ---------------------------------------------------------------------------

const newTask = z.object({
  title,
  description: description.optional(),
  project: project.describe('Project name (task "equipment"), e.g. "L36"'),
  area: area.optional().describe('Area within the project. Defaults to "General".'),
  priority: z.enum(TASK_PRIORITIES).optional().describe('Defaults to medium'),
  dueDate: dateExpr.optional().describe('Only if the user gave a deadline. Never invent one.'),
  assignees: z.array(z.string().trim().min(1).max(100)).min(1).max(MAX_ASSIGNEES).optional()
    .describe('"me", user ids or exact names. Only if the user named them; defaults to the requesting user.'),
}).strict();

export const createTasks = {
  name: 'create_tasks',
  kind: 'write',
  description: 'Propose creating one or more tasks. Nothing is saved until the user approves the preview.',
  schema: z.object({
    tasks: z.array(newTask).min(1).max(10),
  }).strict(),
  async prepare(ctx, { tasks }) {
    const names = await loadUserNames(ctx, []);
    const actions = [];
    for (const t of tasks) {
      const notes = [];
      const assignedTo = t.assignees ? await resolveAssignees(ctx, t.assignees) : [ctx.user.id];
      if (!t.assignees) notes.push('No assignee given — assigned to you.');
      if (assignedTo.length > MAX_ASSIGNEES) throw new ToolError(`A task can have at most ${MAX_ASSIGNEES} assignees.`);
      const due = t.dueDate ? resolveDateOrThrow(t.dueDate, ctx.today) : null;
      if (due && due < ctx.today) notes.push('Due date is in the past.');
      if (!due) notes.push('No due date.');
      if (!t.area) notes.push('No area given — using "General".');

      const extra = await ctx.prisma.user.findMany({ where: { id: { in: assignedTo } }, select: { id: true, name: true } });
      extra.forEach((u) => names.set(u.id, u.name));

      actions.push({
        tool: 'create_task',
        args: {
          title: t.title,
          description: t.description || null,
          equipment: t.project,
          area: t.area || 'General',
          priority: t.priority || 'medium',
          dueDate: due,
          assignedTo,
        },
        preview: {
          kind: 'create',
          title: t.title,
          fields: {
            project: t.project,
            area: t.area || 'General',
            priority: t.priority || 'medium',
            dueDate: due,
            assignees: assignedTo.map((id) => nameOf(names, id, ctx)),
            description: t.description || null,
          },
          notes,
        },
        risk: 'create',
      });
    }
    return actions;
  },
};

export const updateTask = {
  name: 'update_task',
  kind: 'write',
  description: 'Propose changing a task\'s title, description, priority, due date, area or assignees.',
  schema: z.object({
    taskId: objectId,
    changes: z.object({
      title: title.optional(),
      description: description.optional(),
      priority: z.enum(TASK_PRIORITIES).optional(),
      dueDate: z.union([dateExpr, z.null()]).optional().describe('null clears the due date'),
      area: area.optional(),
      assignees: z.array(z.string().trim().min(1).max(100)).min(1).max(MAX_ASSIGNEES).optional(),
    }).strict(),
  }).strict(),
  async prepare(ctx, { taskId, changes }) {
    const { task, permissions } = await loadAccessibleTask(ctx, taskId);
    if (!permissions.canEdit) throw new ToolError('Only the task creator can modify a completed task.', 'forbidden');
    if (Object.keys(changes).length === 0) throw new ToolError('No changes were requested.');

    const args = {};
    const before = {};
    const after = {};
    for (const key of ['title', 'description', 'priority', 'area']) {
      if (changes[key] !== undefined && changes[key] !== task[key]) {
        args[key] = changes[key];
        before[key] = task[key] ?? null;
        after[key] = changes[key];
      }
    }
    if (changes.dueDate !== undefined) {
      const due = changes.dueDate === null ? null : resolveDateOrThrow(changes.dueDate, ctx.today);
      if (due !== dueDateToIso(task.dueDate)) {
        args.dueDate = due;
        before.dueDate = dueDateToIso(task.dueDate);
        after.dueDate = due;
      }
    }
    if (changes.assignees !== undefined) {
      if (!permissions.canReassign) throw new ToolError('Only the task creator can change assignees.', 'forbidden');
      const ids = await resolveAssignees(ctx, changes.assignees);
      if (ids.length > MAX_ASSIGNEES) throw new ToolError(`A task can have at most ${MAX_ASSIGNEES} assignees.`);
      const names = await loadUserNames(ctx, [{ ...task, assignedTo: [...task.assignedTo, ...ids] }]);
      args.assignedTo = ids;
      before.assignees = task.assignedTo.map((id) => nameOf(names, id, ctx));
      after.assignees = ids.map((id) => nameOf(names, id, ctx));
    }
    if (Object.keys(args).length === 0) throw new ToolError('The task already has those values; nothing to change.');

    return [{
      tool: 'update_task',
      args: { taskId, changes: args, expectedUpdatedAt: new Date(task.updatedAt).toISOString() },
      preview: { kind: 'update', title: task.title, taskId, before, after, notes: [] },
      risk: args.assignedTo ? 'reassign' : 'reversible',
    }];
  },
};

export const updateTaskStatus = {
  name: 'update_task_status',
  kind: 'write',
  description: 'Propose moving a task to pending, in-progress or completed.',
  schema: z.object({ taskId: objectId, status: z.enum(TASK_STATUSES) }).strict(),
  async prepare(ctx, { taskId, status }) {
    const { task, permissions } = await loadAccessibleTask(ctx, taskId);
    if (!permissions.canChangeStatus) throw new ToolError('Only the task creator can modify a completed task.', 'forbidden');
    if (task.status === status) throw new ToolError(`The task is already ${status}.`);
    return [{
      tool: 'update_task_status',
      args: { taskId, status },
      preview: { kind: 'status', title: task.title, taskId, before: { status: task.status }, after: { status }, notes: [] },
      risk: 'reversible',
    }];
  },
};

export const addComment = {
  name: 'add_task_comment',
  kind: 'write',
  description: 'Propose adding a comment or progress note to a task.',
  schema: z.object({ taskId: objectId, content: z.string().trim().min(1).max(2000) }).strict(),
  async prepare(ctx, { taskId, content }) {
    const { task, permissions } = await loadAccessibleTask(ctx, taskId);
    if (!permissions.canComment) throw new ToolError('You cannot comment on this task.', 'forbidden');
    return [{
      tool: 'add_task_comment',
      args: { taskId, content },
      preview: { kind: 'comment', title: task.title, taskId, after: { comment: content }, notes: [] },
      risk: 'reversible',
    }];
  },
};

export const deleteTask = {
  name: 'delete_task',
  kind: 'write',
  description: 'Propose permanently deleting a task (creator only). Always requires explicit approval.',
  schema: z.object({ taskId: objectId }).strict(),
  async prepare(ctx, { taskId }) {
    const { task, permissions } = await loadAccessibleTask(ctx, taskId);
    if (!permissions.canDelete) throw new ToolError('Only the task creator can delete this task.', 'forbidden');
    return [{
      tool: 'delete_task',
      args: { taskId },
      preview: { kind: 'delete', title: task.title, taskId, notes: ['Permanent: the task and its comments will be deleted.'] },
      risk: 'destructive',
    }];
  },
};

export const createDeadlineReminders = {
  name: 'create_deadline_reminders',
  kind: 'write',
  description: 'Propose in-app reminders for assignees of open tasks due within N days (or overdue). Assignees already reminded about a task in the last 24 hours are skipped.',
  schema: z.object({
    project: project.optional(),
    withinDays: z.number().int().min(0).max(14).optional(),
    includeOverdue: z.boolean().optional(),
  }).strict(),
  async prepare(ctx, { project: p, withinDays, includeOverdue = true }) {
    const window = withinDays ?? ctx.cfg.dueSoonDays;
    const tasks = (await loadScopedTasks(ctx, { project: p })).filter((t) => {
      if (t.status === 'completed') return false;
      const d = daysUntilDue(t, ctx.today);
      return d !== null && d <= window && (includeOverdue || d >= 0);
    });
    if (tasks.length === 0) throw new ToolError(`No open tasks are due within ${window} days.`, 'nothing_to_do');

    const names = await loadUserNames(ctx, tasks);
    const actions = [];
    for (const t of tasks.slice(0, 20)) {
      const recipients = await pendingReminderRecipients(ctx, t);
      if (recipients.length === 0) continue;
      const d = daysUntilDue(t, ctx.today);
      actions.push({
        tool: 'create_deadline_reminder',
        args: { taskId: t.id },
        preview: {
          kind: 'reminder',
          title: t.title,
          taskId: t.id,
          fields: {
            dueDate: dueDateToIso(t.dueDate),
            when: d < 0 ? `overdue by ${-d} day(s)` : d === 0 ? 'due today' : `due in ${d} day(s)`,
            recipients: recipients.map((id) => nameOf(names, id, ctx)),
          },
          notes: [],
        },
        risk: 'notify',
      });
    }
    if (actions.length === 0) throw new ToolError('Everyone involved was already reminded about these tasks in the last 24 hours.', 'nothing_to_do');
    return actions;
  },
};

export const WRITE_TOOLS = [createTasks, updateTask, updateTaskStatus, addComment, deleteTask, createDeadlineReminders];

// ---------------------------------------------------------------------------
// Execution (runs only after approval, or under the auto-approval policy)
// ---------------------------------------------------------------------------

async function pendingReminderRecipients(ctx, task) {
  const recent = await ctx.prisma.notification.findMany({
    where: {
      taskId: task.id,
      type: REMINDER_TYPE,
      userId: { in: task.assignedTo },
      createdAt: { gte: new Date(ctx.now.getTime() - REMINDER_WINDOW_MS) },
    },
    select: { userId: true },
  });
  const already = new Set(recent.map((n) => n.userId));
  return task.assignedTo.filter((id) => !already.has(id));
}

const sameIds = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

function verify(condition, what) {
  if (!condition) throw new ToolError(`The change was written but verification failed (${what}).`, 'verification_failed');
}

const EXECUTORS = {
  async create_task(ctx, args) {
    const task = await createTask(ctx.prisma, ctx.user.id, {
      ...args,
      dueDate: args.dueDate ? isoToDueDate(args.dueDate) : null,
    });
    const saved = await ctx.prisma.task.findUnique({ where: { id: task.id } });
    verify(saved && saved.title === args.title && saved.createdBy === ctx.user.id, 'task not found after create');
    return { taskId: task.id, message: `Created "${saved.title}"` };
  },

  async update_task(ctx, { taskId, changes, expectedUpdatedAt }) {
    const { task, permissions } = await loadAccessibleTask(ctx, taskId);
    if (!permissions.canEdit) throw new ToolError('You can no longer edit this task.', 'forbidden');
    if (changes.assignedTo && !permissions.canReassign) throw new ToolError('Only the task creator can change assignees.', 'forbidden');
    if (expectedUpdatedAt && new Date(task.updatedAt).toISOString() !== expectedUpdatedAt) {
      throw new ToolError('The task changed after this was proposed; ask the assistant for a fresh proposal.', 'conflict');
    }
    await updateTaskFields(ctx.prisma, task, ctx.user.id, {
      ...changes,
      ...(changes.dueDate !== undefined ? { dueDate: changes.dueDate ? isoToDueDate(changes.dueDate) : null } : {}),
    });
    const saved = await ctx.prisma.task.findUnique({ where: { id: taskId } });
    for (const key of ['title', 'description', 'priority', 'area']) {
      if (changes[key] !== undefined) verify(saved[key] === changes[key], key);
    }
    if (changes.dueDate !== undefined) verify(dueDateToIso(saved.dueDate) === changes.dueDate, 'dueDate');
    if (changes.assignedTo) verify(sameIds(saved.assignedTo, changes.assignedTo), 'assignees');
    return { taskId, message: `Updated "${saved.title}"` };
  },

  async update_task_status(ctx, { taskId, status }) {
    const { task, permissions } = await loadAccessibleTask(ctx, taskId);
    if (!permissions.canChangeStatus) throw new ToolError('Only the task creator can modify a completed task.', 'forbidden');
    if (task.status === status) return { taskId, message: `"${task.title}" was already ${status}` };
    await changeTaskStatus(ctx.prisma, task, ctx.user.id, status);
    const saved = await ctx.prisma.task.findUnique({ where: { id: taskId } });
    verify(saved.status === status, 'status');
    verify(status !== 'completed' || saved.completedAt, 'completedAt');
    return { taskId, message: `Moved "${saved.title}" from ${task.status} to ${status}` };
  },

  async add_task_comment(ctx, { taskId, content }) {
    const { task, permissions } = await loadAccessibleTask(ctx, taskId);
    if (!permissions.canComment) throw new ToolError('You cannot comment on this task.', 'forbidden');
    const comment = await addTaskComment(ctx.prisma, task, ctx.user, content);
    const saved = await ctx.prisma.comment.findUnique({ where: { id: comment.id } });
    verify(saved && saved.taskId === taskId, 'comment not found');
    return { taskId, message: `Commented on "${task.title}"` };
  },

  async delete_task(ctx, { taskId }) {
    const { task, permissions } = await loadAccessibleTask(ctx, taskId);
    if (!permissions.canDelete) throw new ToolError('Only the task creator can delete this task.', 'forbidden');
    await ctx.prisma.task.delete({ where: { id: taskId } });
    const saved = await ctx.prisma.task.findUnique({ where: { id: taskId } });
    verify(!saved, 'task still exists');
    return { taskId, message: `Deleted "${task.title}"` };
  },

  async create_deadline_reminder(ctx, { taskId }) {
    const { task } = await loadAccessibleTask(ctx, taskId);
    if (task.status === 'completed') return { taskId, message: `"${task.title}" is already completed; no reminder sent` };
    const recipients = await pendingReminderRecipients(ctx, task);
    if (recipients.length === 0) return { taskId, message: `Everyone on "${task.title}" was already reminded` };
    const d = daysUntilDue(task, ctx.today);
    const when = d === null ? 'is still open' : d < 0 ? `is overdue by ${-d} day(s)` : d === 0 ? 'is due today' : `is due in ${d} day(s)`;
    await Promise.all(recipients.map((userId) => ctx.prisma.notification.create({
      data: {
        userId,
        taskId,
        type: REMINDER_TYPE,
        message: `Reminder from ${ctx.user.name}: "${task.title}" ${when}`,
        expiresAt: new Date(ctx.now.getTime() + REMINDER_WINDOW_MS),
      },
    })));
    return { taskId, message: `Reminded ${recipients.length} assignee(s) about "${task.title}"` };
  },
};

/** Execute one stored action. Throws ToolError for expected failures. */
export async function executeAction(ctx, action) {
  const executor = EXECUTORS[action.tool];
  if (!executor) throw new ToolError(`Unknown action "${action.tool}".`, 'unknown_action');
  return executor(ctx, action.args);
}
