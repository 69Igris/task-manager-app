/**
 * Deterministic project analytics. Every date difference, count and priority
 * score the assistant reports is computed here, never by the model.
 */

import { addDays, daysBetween, dueDateToIso } from './dates';

const PRIORITY_WEIGHT = { high: 30, medium: 15, low: 5 };
const BLOCKER_PATTERN = /\b(blocked|blocker|blocking|waiting (on|for)|stuck|depends on|dependency)\b/i;

const isOpen = (task) => task.status !== 'completed';

/** Days until due (negative = overdue), or null when there is no due date. */
export function daysUntilDue(task, today) {
  const due = dueDateToIso(task.dueDate);
  return due ? daysBetween(today, due) : null;
}

/**
 * Find a comment that suggests the task is blocked. TaskForge has no "blocked"
 * status, so this is reported only as a *potential* blocker with its evidence.
 */
export function findPotentialBlocker(task) {
  const comments = [...(task.comments || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  for (const comment of comments) {
    const match = comment.content?.match(BLOCKER_PATTERN);
    if (match) {
      return {
        evidence: comment.content.slice(0, 200),
        keyword: match[0].toLowerCase(),
        commentId: comment.id,
        at: new Date(comment.createdAt).toISOString(),
      };
    }
  }
  return null;
}

export function isStale(task, today, staleDays) {
  if (!isOpen(task) || !task.updatedAt) return false;
  const lastUpdate = new Date(task.updatedAt).toISOString().slice(0, 10);
  return daysBetween(lastUpdate, today) >= staleDays;
}

/** Score an open task and explain every point it receives. */
export function scoreTask(task, today, cfg) {
  const reasons = [];
  let score = PRIORITY_WEIGHT[task.priority] ?? PRIORITY_WEIGHT.medium;
  reasons.push(`${task.priority || 'medium'} priority (+${score})`);

  const days = daysUntilDue(task, today);
  if (days !== null && days < 0) {
    const pts = 40 + Math.min(-days * 3, 30);
    score += pts;
    reasons.push(`overdue by ${-days} day${days === -1 ? '' : 's'} (+${pts})`);
  } else if (days !== null && days <= cfg.dueSoonDays) {
    const pts = Math.max(25 - days * 5, 5);
    score += pts;
    reasons.push(days === 0 ? `due today (+${pts})` : `due in ${days} day${days === 1 ? '' : 's'} (+${pts})`);
  }

  if (task.status === 'in-progress') {
    score += 5;
    reasons.push('already in progress (+5)');
  }
  if (isStale(task, today, cfg.staleDays)) {
    score += 10;
    reasons.push(`no updates for ${cfg.staleDays}+ days (+10)`);
  }
  if (findPotentialBlocker(task)) {
    score += 10;
    reasons.push('a comment mentions a possible blocker (+10)');
  }

  return { score, reasons, daysUntilDue: days };
}

/** Open tasks ranked by score (highest first). */
export function rankTasks(tasks, today, cfg) {
  return tasks
    .filter(isOpen)
    .map((task) => ({ task, ...scoreTask(task, today, cfg) }))
    .sort((a, b) => b.score - a.score || String(a.task.title).localeCompare(String(b.task.title)));
}

/**
 * Assignee workload: open-task counts, overload against the threshold, and
 * scheduling conflicts (two or more open high-priority tasks due the same day).
 */
export function analyzeWorkload(tasks, cfg) {
  const byUser = new Map();
  for (const task of tasks.filter(isOpen)) {
    for (const userId of task.assignedTo || []) {
      if (!byUser.has(userId)) byUser.set(userId, { userId, openTasks: 0, highPriority: 0, byDueDate: new Map() });
      const entry = byUser.get(userId);
      entry.openTasks += 1;
      if (task.priority === 'high') entry.highPriority += 1;
      const due = dueDateToIso(task.dueDate);
      if (due && task.priority === 'high') {
        if (!entry.byDueDate.has(due)) entry.byDueDate.set(due, []);
        entry.byDueDate.get(due).push(task.id);
      }
    }
  }

  return [...byUser.values()]
    .map((entry) => ({
      userId: entry.userId,
      openTasks: entry.openTasks,
      highPriority: entry.highPriority,
      overloaded: entry.openTasks > cfg.overloadThreshold,
      conflicts: [...entry.byDueDate.entries()]
        .filter(([, ids]) => ids.length >= 2)
        .map(([date, taskIds]) => ({ date, taskIds })),
    }))
    .sort((a, b) => b.openTasks - a.openTasks);
}

/** Status counts, completion rate, overdue and upcoming work for a task set. */
export function summarizeTasks(tasks, today, cfg) {
  const counts = { pending: 0, 'in-progress': 0, completed: 0 };
  for (const task of tasks) counts[task.status] = (counts[task.status] || 0) + 1;
  const total = tasks.length;

  const windowStart = addDays(today, -(cfg.sprintLengthDays - 1));
  const windowEnd = addDays(today, cfg.sprintLengthDays - 1);

  const completedInWindow = tasks.filter((t) => {
    if (t.status !== 'completed' || !t.completedAt) return false;
    const done = new Date(t.completedAt).toISOString().slice(0, 10);
    return done >= windowStart && done <= today;
  });

  const open = tasks.filter(isOpen);
  const overdue = open.filter((t) => (daysUntilDue(t, today) ?? 0) < 0);
  const upcoming = open.filter((t) => {
    const d = daysUntilDue(t, today);
    return d !== null && d >= 0 && dueDateToIso(t.dueDate) <= windowEnd;
  });

  return {
    total,
    counts,
    completionRate: total ? Math.round((counts.completed / total) * 1000) / 10 : 0,
    openCount: open.length,
    noDueDateCount: open.filter((t) => !t.dueDate).length,
    completedRecently: { since: windowStart, count: completedInWindow.length, tasks: completedInWindow },
    overdue,
    upcoming: { until: windowEnd, tasks: upcoming },
    potentialBlockers: open
      .map((t) => ({ task: t, blocker: findPotentialBlocker(t) }))
      .filter((x) => x.blocker),
    stale: open.filter((t) => isStale(t, today, cfg.staleDays)),
  };
}
