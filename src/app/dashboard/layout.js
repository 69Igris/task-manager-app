'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AddTaskModal from '@/components/AddTaskModal';
import AddEventModal from '@/components/AddEventModal';
import NotificationDropdown from '@/components/NotificationDropdown';
import TaskDetailsModal from '@/components/TaskDetailsModal';

export default function DashboardLayout({ children }) {
  const { user, loading, logout, fetchWithAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const isEventsPage = pathname === '/dashboard/events';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/notifications');
      if (response.status === 401) {
        // Auth token expired, silently skip
        return;
      }
      const data = await response.json();
      if (response.ok) {
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      // Silently fail for notification fetching
      console.log('Notification fetch skipped:', error.message);
    }
  }, [fetchWithAuth]);

  const checkReminders = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/notifications/check-reminders', {
        method: 'POST',
      });
      if (response.status === 401) {
        // Auth token expired, silently skip
        return;
      }
      if (response.ok) {
        fetchUnreadCount(); // Refresh count after checking reminders
      }
    } catch (error) {
      // Silently fail for reminder checking
      console.log('Reminder check skipped:', error.message);
    }
  }, [fetchWithAuth, fetchUnreadCount]);

  useEffect(() => {
    // Fetch unread count on mount and every 30 seconds
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchUnreadCount]);

  useEffect(() => {
    // Check for reminders every 5 minutes
    if (user) {
      checkReminders();
      const interval = setInterval(checkReminders, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, checkReminders]);

  // Expose refresh function for global use
  useEffect(() => {
    const handleRefreshNotifications = () => {
      console.log('🔔 Received refreshNotifications event, fetching...');
      fetchUnreadCount();
    };
    window.addEventListener('refreshNotifications', handleRefreshNotifications);
    return () => window.removeEventListener('refreshNotifications', handleRefreshNotifications);
  }, [fetchUnreadCount]);

  // Handle task click from notifications
  const handleTaskClick = async (taskId) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTask(data.task);
        setSelectedTaskId(taskId);
      }
    } catch (error) {
      console.error('Error fetching task:', error);
    }
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
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSelectedTask(null);
        setSelectedTaskId(null);
        window.dispatchEvent(new Event('refreshTasks'));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📋' },
    { path: '/dashboard/team-tasks', label: 'Team Tasks', icon: '👥' },
    { path: '/dashboard/events', label: 'Events', icon: '📅' },
    { path: '/dashboard/export', label: 'File Save', icon: '💾' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-700 sticky top-0 z-[100] shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
              <span className="text-xl">📋</span>
            </div>
            <h1 className="text-lg font-bold text-white">Task Manager</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white">{user.name}</span>
            </div>
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="flex items-center gap-1 text-sm text-white hover:text-yellow-200 font-medium transition-colors bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg relative"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
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

            <button
              onClick={logout}
              className="flex items-center gap-1 text-sm text-white hover:text-red-200 font-medium transition-colors bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-4">
        {children}
      </main>

      {/* Floating Add Task/Event Button */}
      <button
        onClick={() => isEventsPage ? setShowAddEvent(true) : setShowAddTask(true)}
        className="fixed bottom-20 right-4 w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center text-3xl z-20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all hover:shadow-blue-500/50 hover:scale-110 group"
      >
        <svg className="w-8 h-8 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 shadow-2xl">
        <div className="grid grid-cols-4 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center py-3 px-1 relative transition-all ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-b-full"></div>
                )}
                <span className={`text-2xl mb-1 transition-transform ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}>{item.icon}</span>
                <span className={`text-xs font-medium truncate w-full text-center ${
                  isActive ? 'font-semibold' : ''
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        onTaskAdded={() => {
          console.log('📋 onTaskAdded: Dispatching refreshTasks event');
          // Trigger custom event to refresh task list in child pages
          window.dispatchEvent(new Event('refreshTasks'));
          // Refresh notification count immediately
          console.log('🔔 onTaskAdded: Fetching unread count');
          fetchUnreadCount();
        }}
      />

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        onEventAdded={() => {
          // Refresh the events page with a new timestamp to trigger re-fetch
          router.push(`/dashboard/events?refresh=${Date.now()}`);
        }}
      />

      {/* Task Details Modal from Notification */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setSelectedTaskId(null);
          }}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}
