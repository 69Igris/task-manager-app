'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell, LogOut, Plus, Inbox, Send, Users,
  ListTodo, Calendar, User as UserIcon, Download, Loader2,
} from 'lucide-react';
import AddTaskModal from '@/components/AddTaskModal';
import AddEventModal from '@/components/AddEventModal';
import NotificationDropdown from '@/components/NotificationDropdown';
import TaskDetailsModal from '@/components/TaskDetailsModal';

const NAV = [
  { path: '/dashboard',                 label: 'My tasks',    Icon: ListTodo, short: 'Tasks' },
  { path: '/dashboard/assigned-by-me',  label: 'Assigned',    Icon: Send,     short: 'Assigned' },
  { path: '/dashboard/team-tasks',      label: 'Team',        Icon: Users,    short: 'Team' },
  { path: '/dashboard/events',          label: 'Calendar',    Icon: Calendar, short: 'Calendar' },
  { path: '/dashboard/export',          label: 'Export',      Icon: Download, short: 'Export' },
  { path: '/dashboard/profile',         label: 'Profile',     Icon: UserIcon, short: 'Profile' },
];

// Mobile nav is a tighter subset
const MOBILE_NAV = NAV.filter((n) => ['Tasks', 'Assigned', 'Team', 'Calendar', 'Profile'].includes(n.short));

export default function DashboardLayout({ children }) {
  const { user, loading, logout, fetchWithAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);

  const isEventsPage = pathname === '/dashboard/events';

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/notifications');
      if (response.status === 401) return;
      const data = await response.json();
      if (response.ok) setUnreadCount(data.unreadCount || 0);
    } catch { /* ignore */ }
  }, [fetchWithAuth]);

  const checkReminders = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/notifications/check-reminders', { method: 'POST' });
      if (response.ok) fetchUnreadCount();
    } catch { /* ignore */ }
  }, [fetchWithAuth, fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(id);
  }, [user, fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;
    checkReminders();
    const id = setInterval(checkReminders, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [user, checkReminders]);

  useEffect(() => {
    const onRefresh = () => fetchUnreadCount();
    window.addEventListener('refreshNotifications', onRefresh);
    return () => window.removeEventListener('refreshNotifications', onRefresh);
  }, [fetchUnreadCount]);

  const handleTaskClick = async (taskId) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTask(data.task);
      }
    } catch { /* ignore */ }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedTask(data.task);
        window.dispatchEvent(new Event('refreshTasks'));
      }
    } catch { /* ignore */ }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (response.ok) {
        setSelectedTask(null);
        window.dispatchEvent(new Event('refreshTasks'));
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }
  if (!user) return null;

  const initials = user.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen flex bg-white">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r" style={{ borderColor: 'var(--color-border)' }}>
        <div className="h-14 flex items-center gap-2 px-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
            <div className="h-1.5 w-1.5 rounded-sm bg-white" />
          </div>
          <span className="text-[15px] font-medium tracking-tight">Task Manager</span>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="px-2 mb-2 text-[11px] font-medium text-[color:var(--color-text-subtle)]">Workspace</p>
          <ul className="space-y-0.5">
            {NAV.map(({ path, label, Icon }) => {
              const active = pathname === path;
              return (
                <li key={path}>
                  <Link
                    href={path}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors"
                    style={{
                      color: active ? 'var(--color-accent)' : 'var(--color-text)',
                      background: active ? 'rgba(0, 112, 204, 0.08)' : 'transparent',
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t p-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
              style={{ background: 'var(--color-accent)' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs truncate text-[color:var(--color-text-muted)]">{user.email}</p>
            </div>
            <button onClick={logout} className="btn-ghost p-1.5" aria-label="Sign out" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header
          className="h-14 flex items-center justify-between px-4 lg:px-6 border-b sticky top-0 z-30 bg-white"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 lg:hidden">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
              <div className="h-1.5 w-1.5 rounded-sm bg-white" />
            </div>
            <span className="text-[15px] font-medium tracking-tight">Task Manager</span>
          </div>

          <div className="hidden lg:flex items-center">
            <h1 className="text-[15px] font-medium text-[color:var(--color-text)]">
              {NAV.find((n) => n.path === pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (isEventsPage ? setShowAddEvent(true) : setShowAddTask(true))}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: 13 }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{isEventsPage ? 'New event' : 'New task'}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications((s) => !s)}
                className="btn-ghost relative"
                style={{ padding: 8 }}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 text-[10px] font-medium text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center"
                    style={{ background: 'var(--color-urgent)' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationDropdown
                  onClose={() => setShowNotifications(false)}
                  onNotificationRead={fetchUnreadCount}
                  onTaskClick={handleTaskClick}
                />
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 overflow-x-hidden pb-24 lg:pb-10 bg-[color:var(--color-bg-inset)]">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-30"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map(({ path, short, Icon }) => {
            const active = pathname === path;
            return (
              <Link
                key={path}
                href={path}
                className="relative flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
              >
                <span
                  className="flex items-center justify-center h-8 w-12 rounded-full transition-all"
                  style={{
                    background: active ? 'rgba(0, 112, 204, 0.12)' : 'transparent',
                  }}
                >
                  <Icon
                    className="transition-transform"
                    style={{
                      width: active ? 18 : 16,
                      height: active ? 18 : 16,
                      strokeWidth: active ? 2.4 : 2,
                    }}
                  />
                </span>
                <span
                  className="text-[10px]"
                  style={{ fontWeight: active ? 600 : 500 }}
                >
                  {short}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile FAB */}
      <button
        onClick={() => (isEventsPage ? setShowAddEvent(true) : setShowAddTask(true))}
        className="lg:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full flex items-center justify-center text-white z-20 animate-fab-pulse active:scale-95 transition-transform"
        style={{
          background: 'linear-gradient(135deg, #0070cc 0%, #00a0d9 100%)',
          boxShadow: '0 10px 28px rgba(0, 112, 204, 0.42)',
        }}
        aria-label={isEventsPage ? 'Add event' : 'Add task'}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Modals */}
      <AddTaskModal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        onTaskAdded={() => {
          window.dispatchEvent(new Event('refreshTasks'));
          fetchUnreadCount();
        }}
      />
      <AddEventModal
        isOpen={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        onEventAdded={() => router.push(`/dashboard/events?refresh=${Date.now()}`)}
      />
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}
