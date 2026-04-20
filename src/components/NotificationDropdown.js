'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, ClipboardList, Clock, Loader2 } from 'lucide-react';

export default function NotificationDropdown({ onClose, onNotificationRead, onTaskClick }) {
  const { fetchWithAuth } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetchWithAuth('/api/notifications');
      const data = await response.json();
      if (response.ok) setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) await handleMarkAsRead(notification.id);
    if (onTaskClick && notification.taskId) {
      onTaskClick(notification.taskId);
      onClose();
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await fetchWithAuth(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
      onNotificationRead();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetchWithAuth('/api/notifications', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onNotificationRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getIcon = (type) => {
    const isAssigned = type === 'assigned';
    const Icon = isAssigned ? ClipboardList : Clock;
    const color = isAssigned ? 'var(--color-accent)' : '#a86400';
    const bg = isAssigned ? 'rgba(0, 112, 204, 0.08)' : 'rgba(168, 100, 0, 0.08)';
    return (
      <div
        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: bg }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        ref={dropdownRef}
        className="fixed sm:absolute right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-[22rem] max-h-[80vh] overflow-hidden flex flex-col z-[9999] animate-slide-up"
        style={{
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-3)',
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" style={{ color: 'var(--color-text)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-strong)' }}>Notifications</h3>
            {unreadCount > 0 && (
              <span className="tag tag-accent" style={{ fontSize: 10, padding: '1px 7px' }}>{unreadCount}</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-medium link"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--color-accent)' }} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 px-6">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full mb-3 surface-subtle">
                <Bell className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>You're all caught up</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                New notifications will appear here.
              </p>
            </div>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="px-4 py-3 cursor-pointer border-b transition-colors hover:bg-[color:var(--color-bg-inset)]"
                  style={{
                    borderColor: 'var(--color-divider)',
                    background: !notification.isRead ? 'rgba(0, 112, 204, 0.04)' : 'transparent',
                  }}
                >
                  <div className="flex gap-3 items-start">
                    {getIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm leading-snug"
                        style={{
                          color: !notification.isRead ? 'var(--color-text-strong)' : 'var(--color-text)',
                          fontWeight: !notification.isRead ? 500 : 400,
                        }}
                      >
                        {notification.message}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span
                        className="h-2 w-2 rounded-full mt-1.5 shrink-0"
                        style={{ background: 'var(--color-accent)' }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
