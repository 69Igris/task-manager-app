'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { useState, useEffect, useCallback } from 'react';
import { Inbox, Calendar, MapPin, Settings2, User as UserIcon, Loader2, X } from 'lucide-react';

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
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
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

  const handleTaskUpdate = (u) => setTasks(tasks.map((t) => (t.id === u.id ? u : t)));
  const handleTaskDelete = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
    showToast('Task deleted', 'success');
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

  return (
    <div>
      <div className="px-4 lg:px-8 pt-6 pb-4">
        <h2 className="display-sm" style={{ fontWeight: 500 }}>Team tasks</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">All tasks across the workspace.</p>
      </div>

      <div
        className="sticky top-14 z-10 bg-[color:var(--color-bg-inset)]/90 backdrop-blur-sm border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="px-4 lg:px-8 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
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

          <div className="flex items-center gap-2 ml-auto flex-wrap">
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

      <div className="px-4 lg:px-8 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        ) : displayed.length === 0 ? (
          <div className="panel text-center py-16 px-6">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full mb-3 surface-subtle">
              <Inbox className="h-5 w-5 text-[color:var(--color-text-muted)]" />
            </div>
            <p className="font-medium">No tasks found</p>
            <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Try adjusting the filters.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
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
