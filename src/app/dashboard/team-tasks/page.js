'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import SwipeableTaskCard from '@/components/SwipeableTaskCard';
import MobileHero from '@/components/MobileHero';
import { useState, useEffect, useCallback } from 'react';
import {
  Inbox, Calendar, MapPin, Settings2, User as UserIcon, Loader2, X, ArrowLeftRight,
  Users, ListTodo, Clock, Flame, CheckCircle2,
} from 'lucide-react';

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'overdue',     label: 'Overdue' },
];

function statusLabel(s) { return s === 'in-progress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1); }
function priorityTagCls(p) {
  if (p === 'high') return 'tag tag-urgent';
  if (p === 'medium') return 'tag tag-warn';
  if (p === 'low') return 'tag tag-success';
  return 'tag';
}
function statusTagCls(s) {
  if (s === 'completed') return 'tag tag-success';
  if (s === 'in-progress') return 'tag tag-accent';
  return 'tag';
}

export default function TeamTasksPage() {
  const { user, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTaskName, setSelectedTaskName] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchAllTasks = useCallback(async () => {
    try {
      let url = '/api/tasks';
      const params = new URLSearchParams();
      if (filter !== 'all' && filter !== 'overdue') params.append('status', filter);
      if (selectedDate) { params.append('startDate', selectedDate); params.append('endDate', selectedDate); }
      if (params.toString()) url += '?' + params.toString();

      const response = await fetchWithAuth(url);
      const data = await response.json();
      if (response.ok) setTasks(data.tasks || []);
      else showToast(data.error || 'Failed to fetch tasks', 'error');
    } catch {
      showToast('Failed to fetch tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, selectedDate, fetchWithAuth, showToast]);

  useEffect(() => { fetchAllTasks(); }, [fetchAllTasks]);

  useEffect(() => {
    const onRefresh = () => fetchAllTasks();
    window.addEventListener('refreshTasks', onRefresh);
    return () => window.removeEventListener('refreshTasks', onRefresh);
  }, [fetchAllTasks]);

  const handleTaskUpdate = (u) => setTasks((prev) => prev.map((t) => (t.id === u.id ? u : t)));
  const handleTaskDelete = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Task deleted', 'success');
  };

  // Permission helpers
  const isCreator = (task) => {
    if (!user || !task.createdBy) return false;
    return task.createdBy === user.id || task.createdBy?.id === user.id;
  };
  const isAssignee = (task) => {
    if (!user) return false;
    if (Array.isArray(task.assignedTo)) return task.assignedTo.includes(user.id);
    return task.assignedUsers?.some((u) => u.id === user.id);
  };

  // Optimistic swipe-to-complete
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

  // Optimistic swipe-to-delete (creator only)
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

  const uniqueUserNames = [...new Set(
    tasks.flatMap((t) => (t.assignedUsers || []).map((u) => u.name)).filter(Boolean)
  )].sort();

  const displayed = tasks.filter((task) => {
    const matchesStatus = (() => {
      if (filter === 'all') return true;
      if (filter === 'overdue') return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
      return task.status === filter;
    })();
    if (!matchesStatus) return false;
    if (!selectedTaskName) return true;
    return task.assignedUsers?.some((u) => u.name === selectedTaskName);
  });

  // ---- Team hero stats (computed from currently loaded tasks) ----
  const now = new Date();
  const teamStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    overdue: tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      const d = new Date(t.dueDate); d.setHours(23, 59, 59, 999);
      return d < now;
    }).length,
  };
  const teamPct = teamStats.total > 0 ? Math.round((teamStats.completed / teamStats.total) * 100) : 0;
  const teamBody = (() => {
    if (teamStats.total === 0) return 'No team tasks in the system yet.';
    if (teamStats.overdue > 0) return `${teamStats.overdue} overdue across the team.`;
    if (teamStats.completed === teamStats.total) return 'Team is fully on top of it.';
    return `${teamStats.pending + teamStats.inProgress} still in flight across the team.`;
  })();
  const uniqueAssignees = new Set(tasks.flatMap((t) => (t.assignedUsers || []).map((u) => u.id))).size;

  return (
    <div>
      {/* Desktop header */}
      <div className="hidden lg:block px-4 lg:px-8 pt-6 pb-4">
        <h2 className="display-sm" style={{ fontWeight: 500 }}>Team tasks</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">All tasks across the workspace.</p>
      </div>

      {/* Mobile hero */}
      <MobileHero
        title="Team"
        accent="tasks"
        eyebrowIcon={Users}
        eyebrow={uniqueAssignees > 0 ? `${uniqueAssignees} teammate${uniqueAssignees === 1 ? '' : 's'} involved` : 'Across the workspace'}
        body={teamBody}
        progress={teamPct}
        progressLabel="DONE"
        progressIcon={teamStats.total > 0 && teamStats.completed === teamStats.total ? CheckCircle2 : null}
        tiles={[
          { tone: 'stat-blue',   label: 'Total',       value: teamStats.total,      Icon: ListTodo },
          { tone: 'stat-orange', label: 'Overdue',     value: teamStats.overdue,    Icon: Flame, emphasise: teamStats.overdue > 0 },
          { tone: 'stat-amber',  label: 'In progress', value: teamStats.inProgress, Icon: Clock },
          { tone: 'stat-green',  label: 'Completed',   value: teamStats.completed,  Icon: CheckCircle2 },
        ]}
        alert={teamStats.overdue > 0 ? {
          tone: 'danger',
          message: (
            <>
              <span className="font-semibold" style={{ color: 'var(--color-urgent)' }}>
                {teamStats.overdue} team task{teamStats.overdue === 1 ? '' : 's'}
              </span>{' '}
              running late — keep an eye on those.
            </>
          ),
        } : null}
      />

      {/* Mobile section count */}
      <div className="lg:hidden px-4 pt-3 pb-1 flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-strong)' }}>
          {selectedTaskName ? `${selectedTaskName}'s tasks` : 'All team tasks'}
        </h3>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {displayed.length} {displayed.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

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

          <div className="hidden lg:flex items-center gap-2 ml-auto flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[color:var(--color-text-muted)] font-medium">Assignee</label>
              <select
                value={selectedTaskName}
                onChange={(e) => setSelectedTaskName(e.target.value)}
                className="input-base"
                style={{ padding: '6px 10px', fontSize: 13, width: 150 }}
              >
                <option value="">Everyone</option>
                {uniqueUserNames.map((name) => (<option key={name} value={name}>{name}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[color:var(--color-text-muted)] font-medium">Due</label>
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
                  className="p-1 rounded text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile assignee chip strip */}
      {uniqueUserNames.length > 0 && (
        <div className="lg:hidden px-4 pt-3 pb-1">
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 no-scrollbar">
            <button
              onClick={() => setSelectedTaskName('')}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 transition-colors"
              style={{
                color: !selectedTaskName ? '#fff' : 'var(--color-text-muted)',
                background: !selectedTaskName ? 'var(--color-accent)' : '#fff',
                border: `1px solid ${!selectedTaskName ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              Everyone
            </button>
            {uniqueUserNames.map((name) => {
              const active = selectedTaskName === name;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedTaskName(active ? '' : name)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 transition-colors"
                  style={{
                    color: active ? '#fff' : 'var(--color-text-muted)',
                    background: active ? 'var(--color-accent)' : '#fff',
                    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 lg:px-8 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        ) : displayed.length === 0 ? (
          <div className="panel text-center py-14 px-6">
            <div
              className="empty-blob mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #0070cc 0%, #00a0d9 100%)' }}
            >
              <Inbox className="h-7 w-7" style={{ color: '#ffffff' }} />
            </div>
            <p className="font-semibold text-[15px]" style={{ color: 'var(--color-text-strong)' }}>
              Nothing matches these filters
            </p>
            <p className="mt-1.5 text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--color-text-muted)' }}>
              Try broadening the status, assignee, or date range to see more tasks.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile swipeable list */}
            <div className="lg:hidden space-y-3">
              {displayed.map((task) => {
                const canComplete = isCreator(task) || isAssignee(task);
                const canDelete = isCreator(task);
                return (
                  <SwipeableTaskCard
                    key={task.id}
                    task={task}
                    onOpen={() => setSelectedTask(task)}
                    onComplete={() => quickToggleComplete(task)}
                    onDelete={() => quickDelete(task)}
                    canComplete={canComplete}
                    canDelete={canDelete}
                  />
                );
              })}
              <div
                className="flex items-center justify-center gap-1.5 pt-2 pb-6 text-[11px]"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>Swipe right to complete · left to delete · tap for details</span>
              </div>
            </div>

            {/* Desktop grid — unchanged */}
            <div className="hidden lg:grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {displayed.map((task) => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const due = task.dueDate ? new Date(task.dueDate) : null;
                if (due) due.setHours(0, 0, 0, 0);
                const overdue = due && due < today && task.status !== 'completed';
                const dueToday = due && due.getTime() === today.getTime() && task.status !== 'completed';
                return (
                  <article
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="card card-interactive p-4 flex flex-col gap-3"
                    role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedTask(task)}
                    style={overdue ? { borderColor: 'rgba(213, 59, 0, 0.45)' } : undefined}
                  >
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
                    <div>
                      <h3 className="text-[15px] font-medium text-[color:var(--color-text-strong)] leading-snug">{task.title}</h3>
                      {task.description && (
                        <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-text-muted)] line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    {task.assignedUsers?.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <UserIcon className="h-3.5 w-3.5 text-[color:var(--color-text-subtle)]" />
                        {task.assignedUsers.map((u) => (
                          <span key={u.id} className="tag" style={{ fontSize: 11, padding: '2px 8px' }}>{u.name}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t" style={{ borderColor: 'var(--color-divider)' }}>
                      <span className={statusTagCls(task.status)} style={{ fontSize: 11 }}>{statusLabel(task.status)}</span>
                      {task.priority && (
                        <span className={priorityTagCls(task.priority)} style={{ fontSize: 11 }}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
                        </span>
                      )}
                      {task.dueDate && (
                        <span
                          className={overdue ? 'tag tag-urgent' : dueToday ? 'tag tag-warn' : 'tag'}
                          style={{ fontSize: 11 }}
                        >
                          <Calendar className="h-3 w-3" />
                          {overdue ? `Overdue · ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : dueToday ? 'Due today'
                            : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
