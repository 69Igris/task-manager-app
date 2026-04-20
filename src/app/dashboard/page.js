'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import MobileHero from '@/components/MobileHero';
import SwipeableTaskCard from '@/components/SwipeableTaskCard';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Inbox, Calendar, MapPin, User as UserIcon, Settings2,
  Loader2, X, PartyPopper, Sparkles, ArrowLeftRight,
  ListTodo, CheckCircle2, Flame, Clock,
} from 'lucide-react';

function greetingFor(date) {
  const h = date.getHours();
  if (h < 5)  return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'overdue',     label: 'Overdue' },
];

function statusLabel(status) {
  if (status === 'in-progress') return 'In progress';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function priorityTag(priority) {
  if (priority === 'high')   return 'tag tag-urgent';
  if (priority === 'medium') return 'tag tag-warn';
  if (priority === 'low')    return 'tag tag-success';
  return 'tag';
}

function statusTag(status) {
  if (status === 'completed')   return 'tag tag-success';
  if (status === 'in-progress') return 'tag tag-accent';
  return 'tag';
}

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dueDate); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
  const label = new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label, diff, overdue: diff < 0, today: diff === 0 };
}

export default function DashboardPage() {
  const { user, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  const createdByMe = searchParams.get('createdByMe') === 'true';

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && FILTERS.some((f) => f.key === filterParam)) setFilter(filterParam);
  }, [searchParams]);

  useEffect(() => {
    fetchMyTasks();
    const handleRefresh = () => fetchMyTasks();
    window.addEventListener('refreshTasks', handleRefresh);
    return () => window.removeEventListener('refreshTasks', handleRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdByMe]);

  const fetchMyTasks = async () => {
    try {
      const qp = createdByMe ? 'createdByMe=true' : 'myTasks=true';
      const response = await fetchWithAuth(`/api/tasks?${qp}`);
      const data = await response.json();
      if (response.ok) setTasks(data.tasks || []);
      else showToast(data.error || 'Failed to fetch tasks', 'error');
    } catch {
      showToast('Failed to fetch tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = (updated) => setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  const handleTaskDelete = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Task deleted', 'success');
  };

  // Quick swipe-to-complete. Optimistic with rollback. No confirm — the swipe IS the confirmation.
  const quickToggleComplete = async (task) => {
    const willComplete = task.status !== 'completed';
    const prev = tasks;
    const nextStatus = willComplete ? 'completed' : 'pending';
    setTasks((cur) => cur.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        setTasks(prev);
        showToast(data.error || 'Could not update task', 'error');
        return;
      }
      if (data.task) {
        setTasks((cur) => cur.map((t) => (t.id === task.id ? data.task : t)));
      }
      showToast(willComplete ? 'Nice — marked complete' : 'Task reopened', 'success');
    } catch {
      setTasks(prev);
      showToast('Could not update task', 'error');
    }
  };

  // Quick swipe-to-delete (only for creator).
  const quickDelete = async (task) => {
    const ok = await showConfirm({
      title: 'Delete task?',
      message: `"${task.title}" will be permanently removed.`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      type: 'danger',
    });
    if (!ok) return;
    const prev = tasks;
    setTasks((cur) => cur.filter((t) => t.id !== task.id));
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!response.ok) {
        setTasks(prev);
        const data = await response.json().catch(() => ({}));
        showToast(data.error || 'Could not delete task', 'error');
        return;
      }
      showToast('Task deleted', 'success');
    } catch {
      setTasks(prev);
      showToast('Could not delete task', 'error');
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = (() => {
      if (filter === 'all') return true;
      if (filter === 'overdue')
        return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
      return task.status === filter;
    })();
    if (!matchesStatus) return false;
    if (!selectedDate) return true;
    if (!task.dueDate) return false;
    const td = new Date(task.dueDate);
    const nd = new Date(Date.UTC(td.getFullYear(), td.getMonth(), td.getDate()));
    const sd = new Date(selectedDate + 'T00:00:00Z');
    return nd.getTime() === sd.getTime();
  });

  const isCreator = (task) => user && task.createdBy && (task.createdBy.id === user.id || task.createdBy === user.id);

  // -------- MobileHero data for the "My tasks" view --------
  const heroNow = new Date();
  const heroStats = (() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay); endOfDay.setHours(23, 59, 59, 999);
    const isDueToday = (t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= startOfDay && d <= endOfDay;
    };
    const isOverdue = (t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      const d = new Date(t.dueDate); d.setHours(23, 59, 59, 999);
      return d < heroNow;
    };
    const today = tasks.filter(isDueToday);
    const todayCompleted = today.filter((t) => t.status === 'completed').length;
    const overdueCount = tasks.filter(isOverdue).length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const dueToday = today.length;

    // Ring tracks OVERALL completion across every task you own, not just today's.
    // That way, every time you tick a task off, the ring ticks up.
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      dueToday, todayCompleted, overdueCount, inProgress,
      total, completed, pct,
      allDone: total > 0 && completed === total,
      noTasks: total === 0,
      nothingToday: dueToday === 0 && overdueCount === 0,
    };
  })();
  const firstName = (user?.name || 'there').split(' ')[0];
  const heroBody = (() => {
    if (heroStats.noTasks) return 'Nothing on your plate yet.';
    if (heroStats.allDone) return 'Every task done — nicely played.';
    if (heroStats.overdueCount > 0 && heroStats.dueToday > 0)
      return `${heroStats.dueToday} due today, ${heroStats.overdueCount} overdue.`;
    if (heroStats.overdueCount > 0)
      return `${heroStats.overdueCount} task${heroStats.overdueCount === 1 ? '' : 's'} overdue.`;
    if (heroStats.dueToday > 0)
      return `${heroStats.dueToday} task${heroStats.dueToday === 1 ? '' : 's'} due today.`;
    return `${heroStats.total - heroStats.completed} open, ${heroStats.completed} done.`;
  })();

  return (
    <div>
      {/* Mobile hero (only on the "My tasks" view, not on createdByMe) */}
      {!createdByMe && !loading && (
        <MobileHero
          title={greetingFor(heroNow)}
          accent={firstName}
          body={heroBody}
          // Ring reflects overall completion across all your tasks.
          // When you have no tasks at all, show a sparkle instead of a meaningless 0.
          progress={heroStats.noTasks ? null : heroStats.pct}
          progressIcon={
            heroStats.allDone ? CheckCircle2
            : heroStats.noTasks ? Sparkles
            : null
          }
          tiles={[
            { tone: 'stat-blue',   label: 'Due today',   value: heroStats.dueToday,       Icon: ListTodo },
            { tone: 'stat-orange', label: 'Overdue',     value: heroStats.overdueCount,   Icon: Flame, emphasise: heroStats.overdueCount > 0 },
            { tone: 'stat-amber',  label: 'In progress', value: heroStats.inProgress,     Icon: Clock },
            { tone: 'stat-green',  label: 'Done today',  value: heroStats.todayCompleted, Icon: CheckCircle2 },
          ]}
          alert={heroStats.overdueCount > 0 ? {
            tone: 'danger',
            message: (
              <>
                You have <span className="font-semibold" style={{ color: 'var(--color-urgent)' }}>
                {heroStats.overdueCount} overdue task{heroStats.overdueCount === 1 ? '' : 's'}</span>. Catch up first so they don&apos;t snowball.
              </>
            ),
          } : null}
        />
      )}

      {/* Desktop page header */}
      <div className="hidden lg:block px-4 lg:px-8 pt-6 pb-4">
        <h2 className="display-sm" style={{ fontWeight: 500 }}>
          {createdByMe ? 'Tasks assigned by me' : 'My tasks'}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
          {createdByMe ? 'Tasks you have assigned to others' : 'Tasks assigned to you'}
        </p>
      </div>

      {/* Mobile section heading */}
      <div className="lg:hidden px-4 pt-1 pb-1 flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--color-text-strong)' }}>
          {createdByMe ? 'Assigned by me' : 'Your tasks'}
        </h2>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Filter bar */}
      <div
        className="sticky top-14 z-10 bg-[color:var(--color-bg-inset)]/90 backdrop-blur-sm border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="px-4 lg:px-8 py-3 flex items-center gap-3">
          <div className="flex items-center gap-1 overflow-x-auto -mx-4 px-4 lg:overflow-visible lg:mx-0 lg:px-0 lg:flex-wrap no-scrollbar">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
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

          <div className="hidden lg:flex items-center gap-2 ml-auto">
            <label className="text-xs text-[color:var(--color-text-muted)] font-medium">Due</label>
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-base"
                style={{ padding: '6px 10px', fontSize: 13, width: 150 }}
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="ml-1 p-1 rounded text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                  aria-label="Clear date"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="px-4 lg:px-8 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyTasks filter={filter} createdByMe={createdByMe} />
        ) : (
          <>
            {/* Mobile list — swipeable */}
            <div className="lg:hidden space-y-3">
              {filteredTasks.map((task) => (
                <SwipeableTaskCard
                  key={task.id}
                  task={task}
                  onOpen={() => setSelectedTask(task)}
                  onComplete={() => quickToggleComplete(task)}
                  onDelete={() => quickDelete(task)}
                  canComplete={true}
                  canDelete={isCreator(task)}
                />
              ))}
              {/* Gentle hint, only when there are tasks */}
              <div
                className="flex items-center justify-center gap-1.5 pt-2 pb-6 text-[11px]"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>Swipe right to complete · left to delete · tap for details</span>
              </div>
            </div>

            {/* Desktop grid — original card */}
            <div className="hidden lg:grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {filteredTasks.map((task) => {
                const due = formatDueDate(task.dueDate);
                const urgent = due?.overdue && task.status !== 'completed';
                return (
                  <article
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="card card-interactive p-4 flex flex-col gap-3"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedTask(task)}
                    style={urgent ? { borderColor: 'rgba(213, 59, 0, 0.45)' } : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
                          <Settings2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate font-medium">{task.equipment || 'Unassigned equipment'}</span>
                          {task.area && (
                            <>
                              <span className="text-[color:var(--color-text-subtle)]">·</span>
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{task.area}</span>
                            </>
                          )}
                        </div>
                        <h3 className="mt-2 text-[15px] font-medium text-[color:var(--color-text-strong)] leading-snug">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-text-muted)] line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {task.assignedUsers && task.assignedUsers.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <UserIcon className="h-3.5 w-3.5 text-[color:var(--color-text-subtle)]" />
                        {task.assignedUsers.map((u) => (
                          <span key={u.id} className="tag" style={{ fontSize: 11, padding: '2px 8px' }}>
                            {u.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      className="flex items-center gap-2 flex-wrap pt-2 border-t"
                      style={{ borderColor: 'var(--color-divider)' }}
                    >
                      <span className={statusTag(task.status)} style={{ fontSize: 11 }}>
                        {statusLabel(task.status)}
                      </span>
                      {task.priority && (
                        <span className={priorityTag(task.priority)} style={{ fontSize: 11 }}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
                        </span>
                      )}
                      {due && (
                        <span
                          className={
                            urgent ? 'tag tag-urgent'
                            : due.today && task.status !== 'completed' ? 'tag tag-warn'
                            : 'tag'
                          }
                          style={{ fontSize: 11 }}
                        >
                          <Calendar className="h-3 w-3" />
                          {urgent ? `Overdue · ${due.label}` : due.today ? `Due today` : due.label}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}

function EmptyTasks({ filter, createdByMe }) {
  const variant = (() => {
    if (filter === 'completed') return 'completed';
    if (filter === 'overdue')   return 'overdue';
    return 'default';
  })();

  const copy = {
    completed: {
      Icon: PartyPopper,
      tone: 'linear-gradient(135deg, #0a7d3a 0%, #1ca352 100%)',
      title: 'No finished tasks yet',
      body:  'Complete your first task and it will live here as a little trophy.',
    },
    overdue: {
      Icon: Sparkles,
      tone: 'linear-gradient(135deg, #0070cc 0%, #00a0d9 100%)',
      title: "You're all caught up",
      body:  'No overdue tasks — that\'s a beautiful thing.',
    },
    default: {
      Icon: Inbox,
      tone: 'linear-gradient(135deg, #0070cc 0%, #00a0d9 100%)',
      title: createdByMe ? 'No tasks assigned yet' : 'No tasks here',
      body:  createdByMe
        ? 'When you assign a task to someone on your team, it shows up here.'
        : 'When work is assigned to you, it shows up here. Until then — enjoy the quiet.',
    },
  }[variant];

  const { Icon } = copy;

  return (
    <div className="panel text-center py-14 px-6">
      <div className="empty-blob mx-auto mb-4" style={{ background: copy.tone }}>
        <Icon className="h-7 w-7" style={{ color: '#ffffff' }} />
      </div>
      <p className="font-semibold text-[15px]" style={{ color: 'var(--color-text-strong)' }}>
        {copy.title}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--color-text-muted)' }}>
        {copy.body}
      </p>
    </div>
  );
}
