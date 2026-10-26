/**
 * Read-only tools. They never need approval and only return tasks the caller
 * created or is assigned to.
 */

import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/tasks/service';
import { analyzeWorkload, rankTasks, summarizeTasks } from '../insights';
import {
  UNTRUSTED_NOTE, dateExpr, loadAccessibleTask, loadScopedTasks, loadUserNames, nameOf,
  objectId, resolveAssignees, resolveDateOrThrow, scopedWhere, taskSummary,
} from './shared';
import { isoToDueDate } from '../dates';

const projectArg = z.string().trim().min(1).max(100).optional()
  .describe('Project name (the task "equipment" field, e.g. "L36"). Omit for all projects.');

export const listProjects = {
  name: 'list_projects',
  kind: 'read',
  description: 'List the projects the user has tasks in, with open/completed counts. Use it to resolve which project a request is about.',
  schema: z.object({}).strict(),
  async run(ctx) {
    const tasks = await loadScopedTasks(ctx);
    const byProject = new Map();
    for (const t of tasks) {
      const p = byProject.get(t.equipment) || { project: t.equipment, open: 0, completed: 0, areas: new Set() };
      if (t.status === 'completed') p.completed += 1; else p.open += 1;
      p.areas.add(t.area);
      byProject.set(t.equipment, p);
    }
    return {
      projects: [...byProject.values()]
        .map((p) => ({ ...p, areas: [...p.areas].slice(0, 15) }))
        .sort((a, b) => b.open - a.open),
    };
  },
};

export const listTeamMembers = {
  name: 'list_team_members',
  kind: 'read',
  description: 'List team members (id and name) that tasks can be assigned to.',
  schema: z.object({}).strict(),
  async run(ctx) {
    const users = await ctx.prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 200 });
    return { members: users.map((u) => ({ ...u, isYou: u.id === ctx.user.id })) };
  },
};

export const listTasks = {
  name: 'list_tasks',
  kind: 'read',
  description: 'List tasks the user can access, filtered by project, status, priority, assignee or due date. Returns live data from the database.',
  schema: z.object({
    project: projectArg,
    status: z.enum([...TASK_STATUSES, 'open']).optional().describe('"open" means pending or in-progress'),
    priority: z.enum(TASK_PRIORITIES).optional(),
    assignee: z.string().trim().min(1).max(100).optional().describe('"me", a user id, or an exact team member name'),
    dueBefore: dateExpr.optional().describe('Only tasks due on or before this date'),
    dueAfter: dateExpr.optional().describe('Only tasks due on or after this date'),
    overdueOnly: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }).strict(),
  async run(ctx, args) {
    const filter = {};
    if (args.project) filter.equipment = args.project;
    if (args.status === 'open') filter.status = { in: ['pending', 'in-progress'] };
    else if (args.status) filter.status = args.status;
    if (args.priority) filter.priority = args.priority;
    if (args.assignee) {
      const [userId] = await resolveAssignees(ctx, [args.assignee]);
      filter.assignedTo = { has: userId };
    }
    const due = {};
    if (args.dueBefore) due.lte = isoToDueDate(resolveDateOrThrow(args.dueBefore, ctx.today));
    if (args.dueAfter) due.gte = isoToDueDate(resolveDateOrThrow(args.dueAfter, ctx.today));
    if (args.overdueOnly) {
      due.lt = isoToDueDate(ctx.today);
      filter.status = { in: ['pending', 'in-progress'] };
    }
    if (Object.keys(due).length) filter.dueDate = due;

    const limit = args.limit ?? 25;
    const where = scopedWhere(ctx, filter);
    const [tasks, total] = await Promise.all([
      ctx.prisma.task.findMany({ where, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }], take: limit }),
      ctx.prisma.task.count({ where }),
    ]);
    const names = await loadUserNames(ctx, tasks);
    return {
      note: UNTRUSTED_NOTE,
      total,
      returned: tasks.length,
      tasks: tasks.map((t) => taskSummary(t, ctx, names)),
    };
  },
};

export const getTaskDetails = {
  name: 'get_task_details',
  kind: 'read',
  description: 'Get one task with its full description, comments, and what the user is allowed to change.',
  schema: z.object({ taskId: objectId }).strict(),
  async run(ctx, { taskId }) {
    const { task, permissions } = await loadAccessibleTask(ctx, taskId, {
      include: { comments: { orderBy: { createdAt: 'desc' }, take: 30 } },
    });
    const names = await loadUserNames(ctx, [task]);
    const authors = await ctx.prisma.user.findMany({
      where: { id: { in: [...new Set(task.comments.map((c) => c.authorId))] } },
      select: { id: true, name: true },
    });
    authors.forEach((a) => names.set(a.id, a.name));
    return {
      note: UNTRUSTED_NOTE,
      task: {
        ...taskSummary(task, ctx, names, { descriptionChars: 2000 }),
        createdAt: new Date(task.createdAt).toISOString(),
        comments: task.comments.map((c) => ({
          id: c.id,
          author: nameOf(names, c.authorId, ctx),
          content: c.content.slice(0, 1000),
          createdAt: new Date(c.createdAt).toISOString(),
          isReply: Boolean(c.parentId),
        })),
      },
      yourPermissions: {
        changeStatus: permissions.canChangeStatus,
        editFields: permissions.canEdit,
        reassign: permissions.canReassign,
        comment: permissions.canComment,
        delete: permissions.canDelete,
      },
    };
  },
};

function shapeSummary(summary, ctx, names) {
  const brief = (t) => taskSummary(t, ctx, names, { descriptionChars: 120 });
  return {
    window: `TaskForge has no sprint records; "this sprint" is the ${ctx.cfg.sprintLengthDays}-day window ending today for completed work and starting today for upcoming deadlines.`,
    totalTasks: summary.total,
    byStatus: summary.counts,
    completionRatePercent: summary.completionRate,
    openTasks: summary.openCount,
    openWithoutDueDate: summary.noDueDateCount,
    completedSince: { since: summary.completedRecently.since, count: summary.completedRecently.count },
    overdue: summary.overdue.map(brief),
    upcomingDeadlines: { until: summary.upcoming.until, tasks: summary.upcoming.tasks.map(brief) },
    potentialBlockers: summary.potentialBlockers.map(({ task, blocker }) => ({
      taskId: task.id, title: task.title, evidence: blocker.evidence, flaggedBecause: `comment mentions "${blocker.keyword}"`,
    })),
    staleTasks: summary.stale.map(brief),
  };
}

export const getSprintSummary = {
  name: 'get_sprint_summary',
  kind: 'read',
  description: 'Compute task counts by status, completion rate, overdue tasks, upcoming deadlines, stale tasks and potential blockers (from comments) for a project or all projects.',
  schema: z.object({ project: projectArg }).strict(),
  async run(ctx, { project }) {
    const tasks = await loadScopedTasks(ctx, { project, withComments: true });
    const names = await loadUserNames(ctx, tasks);
    return { note: UNTRUSTED_NOTE, project: project || 'all projects', today: ctx.today, ...shapeSummary(summarizeTasks(tasks, ctx.today, ctx.cfg), ctx, names) };
  },
};

export const getPriorityRecommendations = {
  name: 'get_priority_recommendations',
  kind: 'read',
  description: 'Rank open tasks by a deterministic priority score (priority, overdue days, deadline proximity, staleness, possible blockers) and report overloaded assignees and same-day high-priority conflicts.',
  schema: z.object({ project: projectArg, limit: z.number().int().min(1).max(10).optional() }).strict(),
  async run(ctx, { project, limit = 5 }) {
    const tasks = await loadScopedTasks(ctx, { project, withComments: true });
    const names = await loadUserNames(ctx, tasks);
    const ranked = rankTasks(tasks, ctx.today, ctx.cfg).slice(0, limit);
    const workload = analyzeWorkload(tasks, ctx.cfg);
    return {
      note: UNTRUSTED_NOTE,
      project: project || 'all projects',
      today: ctx.today,
      scoring: 'high=30, medium=15, low=5; overdue +40 (+3/day, max +30); due within the due-soon window +5..+25; in progress +5; stale +10; possible blocker +10',
      ranked: ranked.map(({ task, score, reasons }) => ({ ...taskSummary(task, ctx, names, { descriptionChars: 120 }), score, reasons })),
      workload: workload.map((w) => ({
        member: nameOf(names, w.userId, ctx),
        openTasks: w.openTasks,
        highPriorityOpen: w.highPriority,
        overloaded: w.overloaded,
        sameDayHighPriorityConflicts: w.conflicts,
      })),
      overloadThreshold: ctx.cfg.overloadThreshold,
    };
  },
};

export const getDailyBriefing = {
  name: 'get_daily_briefing',
  kind: 'read',
  description: 'Gather facts for a daily briefing: work completed in the last day, overdue and due-soon tasks, high-priority open work, and recent comments or changes by others on the user\'s tasks.',
  schema: z.object({ project: projectArg }).strict(),
  async run(ctx, { project }) {
    const tasks = await loadScopedTasks(ctx, { project, withComments: true });
    const names = await loadUserNames(ctx, tasks);
    const since = new Date(ctx.now.getTime() - 24 * 60 * 60 * 1000);
    const brief = (t) => taskSummary(t, ctx, names, { descriptionChars: 120 });
    const summary = summarizeTasks(tasks, ctx.today, ctx.cfg);
    const open = tasks.filter((t) => t.status !== 'completed');

    const recentComments = [];
    for (const t of tasks) {
      for (const c of t.comments || []) {
        if (new Date(c.createdAt) >= since && c.authorId !== ctx.user.id) {
          recentComments.push({ taskId: t.id, taskTitle: t.title, commentId: c.id, authorId: c.authorId, content: c.content.slice(0, 200), at: new Date(c.createdAt).toISOString() });
        }
      }
    }
    const authorNames = await ctx.prisma.user.findMany({
      where: { id: { in: [...new Set(recentComments.map((c) => c.authorId))] } }, select: { id: true, name: true },
    });
    authorNames.forEach((a) => names.set(a.id, a.name));

    const ranked = rankTasks(tasks, ctx.today, ctx.cfg).slice(0, 3);
    return {
      note: UNTRUSTED_NOTE,
      project: project || 'all projects',
      today: ctx.today,
      facts: {
        completedLast24h: tasks.filter((t) => t.completedAt && new Date(t.completedAt) >= since).map(brief),
        overdue: summary.overdue.map(brief),
        dueSoon: open.filter((t) => {
          const d = brief(t).daysUntilDue;
          return d !== null && d >= 0 && d <= ctx.cfg.dueSoonDays;
        }).map(brief),
        highPriorityOpen: open.filter((t) => t.priority === 'high').map(brief),
        newCommentsFromOthers: recentComments.map(({ authorId, ...c }) => ({ ...c, author: names.get(authorId) || 'Unknown user' })),
        updatedLast24hByAnyone: open.filter((t) => new Date(t.updatedAt) >= since).map((t) => ({ id: t.id, title: t.title })),
        potentialBlockers: summary.potentialBlockers.map(({ task, blocker }) => ({ taskId: task.id, title: task.title, evidence: blocker.evidence })),
      },
      ruleBasedSuggestions: ranked.map(({ task, reasons }) => `Focus on "${task.title}" — ${reasons.join(', ')}`),
    };
  },
};

export const READ_TOOLS = [
  listProjects, listTeamMembers, listTasks, getTaskDetails,
  getSprintSummary, getPriorityRecommendations, getDailyBriefing,
];
