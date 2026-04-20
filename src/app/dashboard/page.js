'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Inbox, Calendar, MapPin, User as UserIcon, Settings2,
  Loader2, X,
} from 'lucide-react';

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

  const handleTaskUpdate = (updated) => setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
  const handleTaskDelete = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
    showToast('Task deleted', 'success');
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

  return (
    <div>
      {/* Page header */}
      <div className="px-4 lg:px-8 pt-6 pb-4">
        <h2 className="display-sm" style={{ fontWeight: 500 }}>
          {createdByMe ? 'Tasks assigned by me' : 'My tasks'}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
          {createdByMe ? 'Tasks you have assigned to others' : 'Tasks assigned to you'}
        </p>
      </div>

      {/* Filter bar */}
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

          <div className="flex items-center gap-2 ml-auto">
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
          <div className="panel text-center py-16 px-6">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full mb-3 surface-subtle">
              <Inbox className="h-5 w-5 text-[color:var(--color-text-muted)]" />
            </div>
            <p className="font-medium text-[color:var(--color-text)]">No tasks found</p>
            <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
              Tasks will appear here when assigned.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
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
                  {/* Top row: equipment + status dot */}
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

                  {/* Assignees */}
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

                  {/* Footer: status + priority + due */}
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
