import { describe, expect, it } from 'vitest';
import { analyzeWorkload, findPotentialBlocker, rankTasks, scoreTask, summarizeTasks } from '@/lib/ai/insights';

const TODAY = '2026-10-26';
const cfg = { dueSoonDays: 3, staleDays: 7, overloadThreshold: 2, sprintLengthDays: 14 };
const due = (iso) => new Date(`${iso}T00:00:00Z`);
let n = 0;
const task = (o = {}) => ({
  id: `t${++n}`, title: `Task ${n}`, status: 'pending', priority: 'medium', assignedTo: ['u1'],
  createdBy: 'u1', dueDate: null, updatedAt: new Date('2026-10-25T10:00:00Z'), createdAt: new Date('2026-10-20T00:00:00Z'),
  completedAt: null, ...o,
});

describe('scoreTask', () => {
  it('scores overdue high-priority work above everything else and explains why', () => {
    const s = scoreTask(task({ priority: 'high', dueDate: due('2026-10-23') }), TODAY, cfg);
    expect(s.daysUntilDue).toBe(-3);
    expect(s.score).toBe(30 + 40 + 9);
    expect(s.reasons).toContain('overdue by 3 days (+49)');
  });

  it('rewards deadline proximity within the due-soon window only', () => {
    expect(scoreTask(task({ dueDate: due('2026-10-26') }), TODAY, cfg).reasons).toContain('due today (+25)');
    expect(scoreTask(task({ dueDate: due('2026-10-28') }), TODAY, cfg).score).toBe(15 + 15);
    expect(scoreTask(task({ dueDate: due('2026-11-20') }), TODAY, cfg).score).toBe(15);
  });

  it('adds staleness and in-progress signals', () => {
    const s = scoreTask(task({ status: 'in-progress', updatedAt: new Date('2026-10-10T00:00:00Z') }), TODAY, cfg);
    expect(s.score).toBe(15 + 5 + 10);
  });
});

describe('rankTasks', () => {
  it('excludes completed tasks and orders by score', () => {
    const ranked = rankTasks([
      task({ title: 'low', priority: 'low' }),
      task({ title: 'done', status: 'completed', priority: 'high' }),
      task({ title: 'urgent', priority: 'high', dueDate: due('2026-10-25') }),
    ], TODAY, cfg);
    expect(ranked.map((r) => r.task.title)).toEqual(['urgent', 'low']);
  });
});

describe('findPotentialBlocker', () => {
  it('only flags tasks with comment evidence', () => {
    expect(findPotentialBlocker(task())).toBeNull();
    expect(findPotentialBlocker(task({ comments: [{ id: 'c', content: 'Looks good', createdAt: new Date() }] }))).toBeNull();
    const b = findPotentialBlocker(task({ comments: [{ id: 'c', content: 'We are waiting on the vendor API keys', createdAt: new Date() }] }));
    expect(b.keyword).toBe('waiting on');
    expect(b.evidence).toMatch(/vendor/);
  });
});

describe('analyzeWorkload', () => {
  it('reports overloaded assignees and same-day high-priority conflicts', () => {
    const tasks = [
      task({ assignedTo: ['u1'], priority: 'high', dueDate: due('2026-10-28') }),
      task({ assignedTo: ['u1'], priority: 'high', dueDate: due('2026-10-28') }),
      task({ assignedTo: ['u1', 'u2'] }),
      task({ assignedTo: ['u2'], status: 'completed' }),
    ];
    const [u1, u2] = analyzeWorkload(tasks, cfg);
    expect(u1).toMatchObject({ userId: 'u1', openTasks: 3, overloaded: true, highPriority: 2 });
    expect(u1.conflicts).toEqual([{ date: '2026-10-28', taskIds: [tasks[0].id, tasks[1].id] }]);
    expect(u2).toMatchObject({ userId: 'u2', openTasks: 1, overloaded: false, conflicts: [] });
  });
});

describe('summarizeTasks', () => {
  it('computes counts, completion rate, overdue and upcoming deadlines', () => {
    const s = summarizeTasks([
      task({ status: 'completed', completedAt: new Date('2026-10-24T00:00:00Z') }),
      task({ status: 'completed', completedAt: new Date('2026-09-01T00:00:00Z') }),
      task({ dueDate: due('2026-10-20') }),
      task({ status: 'in-progress', dueDate: due('2026-10-30') }),
      task(),
    ], TODAY, cfg);
    expect(s.counts).toEqual({ pending: 2, 'in-progress': 1, completed: 2 });
    expect(s.completionRate).toBe(40);
    expect(s.completedRecently.count).toBe(1);
    expect(s.overdue).toHaveLength(1);
    expect(s.upcoming.tasks).toHaveLength(1);
    expect(s.noDueDateCount).toBe(1);
  });
});
