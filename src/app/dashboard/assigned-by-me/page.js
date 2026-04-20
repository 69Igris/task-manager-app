'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import SwipeableTaskCard from '@/components/SwipeableTaskCard';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import MobileHero from '@/components/MobileHero';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Calendar, Settings2, User as UserIcon, Loader2,
  ArrowLeftRight, Inbox, Send, Clock, Flame, CheckCircle2, ListTodo,
} from 'lucide-react';

const MOBILE_FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'overdue',     label: 'Overdue' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AssignedByMePage() {
  const { user, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const [stats, setStats] = useState({
    totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0, overdueTasks: 0,
    dailyCompletion: [], upcomingTasks: [],
  });
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [allTasks, setAllTasks] = useState([]);
  const [mobileFilter, setMobileFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);

  // Mobile refresh on window event
  useEffect(() => {
    const onRefresh = () => fetchStats();
    window.addEventListener('refreshTasks', onRefresh);
    return () => window.removeEventListener('refreshTasks', onRefresh);
    // eslint-disable-next-line
  }, []);

  // Keep stat counters in sync after optimistic mutations on mobile
  useEffect(() => {
    if (allTasks.length === 0 && stats.totalTasks === 0) return;
    const now = new Date();
    setStats((prev) => ({
      ...prev,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter((t) => t.status === 'completed').length,
      pendingTasks: allTasks.filter((t) => t.status === 'pending').length,
      inProgressTasks: allTasks.filter((t) => t.status === 'in-progress').length,
      overdueTasks: allTasks.filter((t) => {
        if (!t.dueDate || t.status === 'completed') return false;
        const d = new Date(t.dueDate); d.setHours(23, 59, 59, 999);
        return d < now;
      }).length,
    }));
    // eslint-disable-next-line
  }, [allTasks]);

  const handleTaskUpdate = (u) => setAllTasks((prev) => prev.map((t) => (t.id === u.id ? u : t)));
  const handleTaskDelete = (id) => {
    setAllTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Task deleted', 'success');
  };

  const quickToggleComplete = async (task) => {
    const willComplete = task.status !== 'completed';
    const prev = allTasks;
    const nextStatus = willComplete ? 'completed' : 'pending';
    setAllTasks((cur) => cur.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAllTasks(prev);
        showToast(data.error || 'Could not update task', 'error');
        return;
      }
      if (data.task) {
        setAllTasks((cur) => cur.map((t) => (t.id === task.id ? data.task : t)));
      }
      showToast(willComplete ? 'Nice — marked complete' : 'Task reopened', 'success');
    } catch {
      setAllTasks(prev);
      showToast('Could not update task', 'error');
    }
  };

  const quickDelete = async (task) => {
    const ok = await showConfirm({
      title: 'Delete task?',
      message: `"${task.title}" will be permanently removed.`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      type: 'danger',
    });
    if (!ok) return;
    const prev = allTasks;
    setAllTasks((cur) => cur.filter((t) => t.id !== task.id));
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!response.ok) {
        setAllTasks(prev);
        const data = await response.json().catch(() => ({}));
        showToast(data.error || 'Could not delete task', 'error');
        return;
      }
      showToast('Task deleted', 'success');
    } catch {
      setAllTasks(prev);
      showToast('Could not delete task', 'error');
    }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (allTasks.length > 0) updateStatsForWeek(); /* eslint-disable-next-line */ }, [weekOffset, allTasks]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/tasks?createdByMe=true');
      const data = await response.json();
      if (!response.ok) return;
      const tasks = data.tasks || [];
      setAllTasks(tasks);

      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const pending = tasks.filter((t) => t.status === 'pending').length;
      const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
      const overdue = tasks.filter((t) => {
        if (!t.dueDate || t.status === 'completed') return false;
        const d = new Date(t.dueDate); d.setHours(23, 59, 59, 999);
        return d < new Date();
      }).length;

      setStats({
        totalTasks: total, completedTasks: completed, pendingTasks: pending, inProgressTasks: inProgress, overdueTasks: overdue,
        dailyCompletion: calculateDailyCompletion(tasks, 0),
        upcomingTasks: getUpcomingTasks(tasks),
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatsForWeek = () => {
    setStats((prev) => ({ ...prev, dailyCompletion: calculateDailyCompletion(allTasks, weekOffset) }));
  };

  const calculateDailyCompletion = (tasks, offset = 0) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startDate = new Date(today); startDate.setDate(startDate.getDate() + offset * 7);
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startDate); date.setDate(date.getDate() - i); date.setHours(0, 0, 0, 0);
      const tasksOnDay = tasks.filter((t) => {
        if (!t.dueDate) return false;
        const td = new Date(t.dueDate); td.setHours(0, 0, 0, 0);
        return td.getTime() === date.getTime();
      });
      out.push({
        day: DAYS[date.getDay()],
        date,
        counts: {
          completed: tasksOnDay.filter((t) => t.status === 'completed').length,
          inProgress: tasksOnDay.filter((t) => t.status === 'in-progress').length,
          pending: tasksOnDay.filter((t) => t.status === 'pending').length,
          overdue: tasksOnDay.filter((t) => {
            const dd = new Date(t.dueDate); dd.setHours(23, 59, 59, 999);
            return t.status !== 'completed' && dd < today;
          }).length,
        },
        total: tasksOnDay.length,
      });
    }
    return out;
  };

  const getUpcomingTasks = (tasks) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7 = new Date(today); in7.setDate(in7.getDate() + 7);
    return tasks
      .filter((t) => {
        if (!t.dueDate || t.status === 'completed') return false;
        const d = new Date(new Date(t.dueDate).setHours(0, 0, 0, 0));
        return d >= today && d <= in7;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not set';
  const getMaxCount = () => Math.max(1, ...stats.dailyCompletion.map((d) => d.total || 0));
  const weekRange = () => {
    if (stats.dailyCompletion.length === 0) return '';
    const f = stats.dailyCompletion[0].date;
    const l = stats.dailyCompletion[stats.dailyCompletion.length - 1].date;
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(f)} – ${fmt(l)}`;
  };
  const canForward = weekOffset < 0;
  const canBack = weekOffset > -12;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  const statCards = [
    { href: '/dashboard?filter=all&createdByMe=true',         label: 'Total',       value: stats.totalTasks,      tone: 'tag' },
    { href: '/dashboard?filter=pending&createdByMe=true',     label: 'Pending',     value: stats.pendingTasks,    tone: 'tag tag-warn' },
    { href: '/dashboard?filter=in-progress&createdByMe=true', label: 'In progress', value: stats.inProgressTasks, tone: 'tag tag-accent' },
    { href: '/dashboard?filter=completed&createdByMe=true',   label: 'Completed',   value: stats.completedTasks,  tone: 'tag tag-success' },
    { href: '/dashboard?filter=overdue&createdByMe=true',     label: 'Overdue',     value: stats.overdueTasks,    tone: 'tag tag-urgent' },
  ];

  // Mobile filter pipeline
  const mobileFiltered = allTasks.filter((task) => {
    if (mobileFilter === 'all') return true;
    if (mobileFilter === 'overdue') {
      return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    }
    return task.status === mobileFilter;
  });

  // ---- MobileHero data ----
  const heroPct = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;
  const allDone = stats.totalTasks > 0 && stats.completedTasks === stats.totalTasks;
  const firstName = (user?.name || 'there').split(' ')[0];
  const heroBody = (() => {
    if (stats.totalTasks === 0) return "You haven't assigned anything yet.";
    if (allDone) return 'Everyone finished — celebrate with the team.';
    if (stats.overdueTasks > 0)
      return `${stats.overdueTasks} assigned task${stats.overdueTasks === 1 ? '' : 's'} overdue.`;
    return `${stats.pendingTasks + stats.inProgressTasks} still in flight across the team.`;
  })();

  return (
    <div className="lg:px-8 lg:pt-6 lg:pb-10 lg:space-y-5 max-w-6xl">
      {/* Mobile hero */}
      <MobileHero
        title="Assigned"
        accent="by me"
        body={heroBody}
        eyebrowIcon={Send}
        eyebrow={`${stats.totalTasks} task${stats.totalTasks === 1 ? '' : 's'} delegated`}
        progress={heroPct}
        progressLabel="DONE"
        progressIcon={allDone ? CheckCircle2 : null}
        tiles={[
          { tone: 'stat-blue',   label: 'Total',       value: stats.totalTasks,      Icon: ListTodo },
          { tone: 'stat-orange', label: 'Overdue',     value: stats.overdueTasks,    Icon: Flame, emphasise: stats.overdueTasks > 0 },
          { tone: 'stat-amber',  label: 'In progress', value: stats.inProgressTasks, Icon: Clock },
          { tone: 'stat-green',  label: 'Completed',   value: stats.completedTasks,  Icon: CheckCircle2 },
        ]}
        alert={stats.overdueTasks > 0 ? {
          tone: 'danger',
          message: (
            <>
              <span className="font-semibold" style={{ color: 'var(--color-urgent)' }}>
                {stats.overdueTasks} assigned task{stats.overdueTasks === 1 ? '' : 's'}
              </span>{' '}
              past due — nudge the team to keep things moving.
            </>
          ),
        } : null}
      />

      <div className="px-4 lg:px-0 pt-4 lg:pt-0 space-y-5">
      {/* Desktop heading */}
      <div className="hidden lg:block">
        <h2 className="display-sm" style={{ fontWeight: 500 }}>Assigned by me</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Tasks you&apos;ve assigned to others across your team.</p>
      </div>

      <div className="hidden lg:grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href} className="card card-interactive p-4">
            <div className="text-2xl font-light text-[color:var(--color-text-strong)]">{s.value}</div>
            <div className="mt-1.5">
              <span className={s.tone} style={{ fontSize: 11 }}>{s.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Mobile-only swipeable task list */}
      <div className="lg:hidden space-y-3">
        <div className="flex items-baseline justify-between pt-1">
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-strong)' }}>
            All assigned tasks
          </h3>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {mobileFiltered.length} {mobileFiltered.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto -mx-4 px-4 no-scrollbar">
          {MOBILE_FILTERS.map((f) => {
            const active = mobileFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setMobileFilter(f.key)}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors shrink-0"
                style={{
                  color: active ? '#fff' : 'var(--color-text)',
                  background: active ? 'var(--color-accent)' : '#fff',
                  border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {mobileFiltered.length === 0 ? (
          <div className="panel text-center py-12 px-6">
            <div
              className="empty-blob mx-auto mb-3"
              style={{ background: 'linear-gradient(135deg, #0070cc 0%, #00a0d9 100%)' }}
            >
              <Inbox className="h-7 w-7" style={{ color: '#ffffff' }} />
            </div>
            <p className="font-semibold text-[15px]" style={{ color: 'var(--color-text-strong)' }}>
              Nothing here
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No tasks match this filter yet.
            </p>
          </div>
        ) : (
          <>
            {mobileFiltered.map((task) => (
              <SwipeableTaskCard
                key={task.id}
                task={task}
                onOpen={() => setSelectedTask(task)}
                onComplete={() => quickToggleComplete(task)}
                onDelete={() => quickDelete(task)}
                canComplete={true}
                canDelete={true}
              />
            ))}
            <div
              className="flex items-center justify-center gap-1.5 pt-1 text-[11px]"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              <ArrowLeftRight className="h-3 w-3" />
              <span>Swipe right to complete · left to delete · tap for details</span>
            </div>
          </>
        )}
      </div>

      {/* Stats chart + upcoming — hidden on mobile to keep the focus on the task list */}
      <section className="hidden lg:block panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-medium">Daily activity</h3>
            <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5">{weekRange()}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset((p) => p - 1)} disabled={!canBack} className="btn-ghost p-1.5" aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-[color:var(--color-text-muted)] min-w-[90px] text-center">
              {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
            </span>
            <button onClick={() => setWeekOffset((p) => p + 1)} disabled={!canForward} className="btn-ghost p-1.5" aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="h-44 flex items-end justify-between gap-2">
          {stats.dailyCompletion.map((day, i) => {
            const max = getMaxCount();
            const totalH = day.total > 0 ? (day.total / max) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center group">
                <div className="w-full max-w-[40px] flex flex-col-reverse justify-start h-36">
                  {day.counts.completed > 0 && (
                    <div style={{ height: `${(day.counts.completed / (day.total || 1)) * totalH}%`, background: '#0a7d3a' }} />
                  )}
                  {day.counts.inProgress > 0 && (
                    <div style={{ height: `${(day.counts.inProgress / (day.total || 1)) * totalH}%`, background: 'var(--color-accent)' }} />
                  )}
                  {day.counts.pending > 0 && (
                    <div style={{ height: `${(day.counts.pending / (day.total || 1)) * totalH}%`, background: '#d4a017' }} />
                  )}
                  {day.counts.overdue > 0 && (
                    <div style={{ height: `${(day.counts.overdue / (day.total || 1)) * totalH}%`, background: 'var(--color-urgent)' }} />
                  )}
                  {day.total === 0 && <div className="w-full h-px bg-[color:var(--color-divider)] self-end" />}
                </div>
                <div className="text-[10px] mt-2 font-medium text-[color:var(--color-text)]">{day.day}</div>
                <div className="text-[10px] text-[color:var(--color-text-subtle)]">{day.date.getDate()}</div>
              </div>
            );
          })}
        </div>

        <div
          className="flex items-center justify-center gap-5 mt-5 pt-4 border-t text-[11px] text-[color:var(--color-text-muted)]"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <Legend color="#0a7d3a" label="Completed" />
          <Legend color="var(--color-accent)" label="In progress" />
          <Legend color="#d4a017" label="Pending" />
          <Legend color="var(--color-urgent)" label="Overdue" />
        </div>
      </section>

      <section className="hidden lg:block panel p-5">
        <h3 className="text-[15px] font-medium mb-4">Upcoming in the next 7 days</h3>
        {stats.upcomingTasks.length === 0 ? (
          <div className="text-center py-8">
            <div
              className="inline-flex items-center justify-center h-12 w-12 rounded-full mb-2.5"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(30, 174, 219, 0.28) 0%, rgba(0, 112, 204, 0.14) 55%, transparent 100%)',
              }}
            >
              <Calendar className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>No upcoming tasks</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Things are quiet for the next week.</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
            {stats.upcomingTasks.slice(0, 5).map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                style={{ borderColor: 'var(--color-divider)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{task.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[color:var(--color-text-muted)]">
                    {task.equipment && (
                      <span className="inline-flex items-center gap-1">
                        <Settings2 className="h-3 w-3" /> {task.equipment}
                      </span>
                    )}
                    {task.assignedUsers?.length > 0 && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <UserIcon className="h-3 w-3" /> {task.assignedUsers.map((u) => u.name).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium text-[color:var(--color-accent)]">{formatDate(task.dueDate)}</div>
                  {task.priority && (
                    <span
                      className={
                        task.priority === 'high' ? 'tag tag-urgent' :
                        task.priority === 'medium' ? 'tag tag-warn' :
                        'tag tag-success'
                      }
                      style={{ fontSize: 10, padding: '1px 8px', marginTop: 4 }}
                    >
                      {task.priority}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {stats.upcomingTasks.length > 5 && (
          <div className="text-center pt-3 mt-2 border-t" style={{ borderColor: 'var(--color-divider)' }}>
            <Link href="/dashboard?createdByMe=true" className="link text-sm" style={{ fontWeight: 500 }}>
              View all {stats.upcomingTasks.length} tasks →
            </Link>
          </div>
        )}
      </section>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
