'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Calendar, Settings2, Loader2 } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProfilePage() {
  const { user, fetchWithAuth } = useAuth();
  const [stats, setStats] = useState({
    totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0, overdueTasks: 0,
    dailyCompletion: [], upcomingTasks: [],
  });
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [allTasks, setAllTasks] = useState([]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (allTasks.length > 0) updateStatsForWeek(); /* eslint-disable-next-line */ }, [weekOffset, allTasks]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/tasks?myTasks=true');
      const data = await response.json();
      if (!response.ok) return;
      const tasks = data.tasks || [];
      setAllTasks(tasks);
      const today = new Date();
      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === 'completed').length,
        pendingTasks: tasks.filter((t) => t.status === 'pending').length,
        inProgressTasks: tasks.filter((t) => t.status === 'in-progress').length,
        overdueTasks: tasks.filter((t) => {
          if (!t.dueDate || t.status === 'completed') return false;
          const d = new Date(t.dueDate); d.setHours(23, 59, 59, 999);
          return d < today;
        }).length,
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
    { href: '/dashboard?filter=all',         label: 'Total',       value: stats.totalTasks,      tone: 'tag' },
    { href: '/dashboard?filter=pending',     label: 'Pending',     value: stats.pendingTasks,    tone: 'tag tag-warn' },
    { href: '/dashboard?filter=in-progress', label: 'In progress', value: stats.inProgressTasks, tone: 'tag tag-accent' },
    { href: '/dashboard?filter=completed',   label: 'Completed',   value: stats.completedTasks,  tone: 'tag tag-success' },
    { href: '/dashboard?filter=overdue',     label: 'Overdue',     value: stats.overdueTasks,    tone: 'tag tag-urgent' },
  ];

  const initials = (user?.name || '??').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="px-4 lg:px-8 pt-6 pb-10 space-y-5 max-w-6xl">
      <div>
        <h2 className="display-sm" style={{ fontWeight: 500 }}>Profile</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Your task overview and statistics.</p>
      </div>

      {/* Identity card */}
      <section className="panel p-5">
        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-white text-lg font-medium shrink-0"
            style={{ background: 'var(--color-accent)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium truncate">{user?.name}</div>
            <div className="text-xs text-[color:var(--color-text-muted)] truncate">{user?.email}</div>
          </div>
          <Link href="/dashboard/export" className="btn-secondary hidden sm:inline-flex">
            <Download className="h-4 w-4" />
            Export
          </Link>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href} className="card card-interactive p-4">
            <div className="text-2xl font-light text-[color:var(--color-text-strong)]">{s.value}</div>
            <div className="mt-1.5">
              <span className={s.tone} style={{ fontSize: 11 }}>{s.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Daily activity */}
      <section className="panel p-5">
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
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full max-w-[40px] flex flex-col-reverse justify-start h-36">
                  {day.counts.completed > 0 && <div style={{ height: `${(day.counts.completed / (day.total || 1)) * totalH}%`, background: '#0a7d3a' }} />}
                  {day.counts.inProgress > 0 && <div style={{ height: `${(day.counts.inProgress / (day.total || 1)) * totalH}%`, background: 'var(--color-accent)' }} />}
                  {day.counts.pending > 0 && <div style={{ height: `${(day.counts.pending / (day.total || 1)) * totalH}%`, background: '#d4a017' }} />}
                  {day.counts.overdue > 0 && <div style={{ height: `${(day.counts.overdue / (day.total || 1)) * totalH}%`, background: 'var(--color-urgent)' }} />}
                  {day.total === 0 && <div className="w-full h-px bg-[color:var(--color-divider)] self-end" />}
                </div>
                <div className="text-[10px] mt-2 font-medium">{day.day}</div>
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

      {/* Upcoming */}
      <section className="panel p-5">
        <h3 className="text-[15px] font-medium mb-4">Upcoming in the next 7 days</h3>
        {stats.upcomingTasks.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-full surface-subtle mb-2">
              <Calendar className="h-4 w-4 text-[color:var(--color-text-muted)]" />
            </div>
            <p className="text-sm text-[color:var(--color-text-muted)]">No upcoming tasks</p>
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
                  {task.equipment && (
                    <div className="text-xs text-[color:var(--color-text-muted)] mt-1 inline-flex items-center gap-1">
                      <Settings2 className="h-3 w-3" /> {task.equipment}
                    </div>
                  )}
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
            <Link href="/dashboard" className="link text-sm" style={{ fontWeight: 500 }}>
              View all {stats.upcomingTasks.length} tasks →
            </Link>
          </div>
        )}
      </section>
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
