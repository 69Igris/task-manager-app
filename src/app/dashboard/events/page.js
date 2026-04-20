'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Trash2, User as UserIcon, X, Loader2 } from 'lucide-react';

export default function EventsPage() {
  const { fetchWithAuth, user } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

  const refreshParam = searchParams.get('refresh');

  const fetchEvents = useCallback(async () => {
    try {
      let url = '/api/events';
      const params = new URLSearchParams();
      if (selectedDate) { params.append('startDate', selectedDate); params.append('endDate', selectedDate); }
      if (params.toString()) url += '?' + params.toString();

      const response = await fetchWithAuth(url);
      const data = await response.json();
      if (response.ok) setEvents(data.events || []);
      else showToast(data.error || 'Failed to fetch events', 'error');
    } catch {
      showToast('Failed to fetch events', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, fetchWithAuth, showToast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents, refreshParam]);

  const formatEventDate = (s) => {
    const date = new Date(s);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    let timeInfo = '';
    if (diffDays < 0) timeInfo = `${Math.abs(diffDays)} days ago`;
    else if (diffDays === 0) timeInfo = 'Today';
    else if (diffDays === 1) timeInfo = 'Tomorrow';
    else if (diffDays <= 7) timeInfo = `In ${diffDays} days`;
    return { formattedDate, timeInfo, diffDays };
  };

  const deleteEvent = async (eventId, eventTitle) => {
    const confirmed = await showConfirm({
      title: 'Delete event',
      message: `Delete "${eventTitle}"? This can't be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      const response = await fetchWithAuth(`/api/events/${eventId}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        showToast('Event deleted', 'success');
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } else throw new Error(data.error || 'Failed to delete event');
    } catch (err) {
      showToast(err.message || 'Failed to delete event', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 lg:px-8 pt-6 pb-4">
        <h2 className="display-sm" style={{ fontWeight: 500 }}>Calendar</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Upcoming company events and activities.</p>
      </div>

      <div
        className="sticky top-14 z-10 bg-[color:var(--color-bg-inset)]/90 backdrop-blur-sm border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="px-4 lg:px-8 py-3 flex items-center gap-2 flex-wrap">
          <label className="text-xs text-[color:var(--color-text-muted)] font-medium">Filter by date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-base"
            style={{ padding: '6px 10px', fontSize: 13, width: 160 }}
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="p-1 rounded text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 lg:px-8 py-5 grid gap-3 lg:grid-cols-2">
        {events.length === 0 ? (
          <div className="panel text-center py-16 px-6 lg:col-span-2">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full mb-3 surface-subtle">
              <Calendar className="h-5 w-5 text-[color:var(--color-text-muted)]" />
            </div>
            <p className="font-medium">No events found</p>
            <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">Create one from the top bar.</p>
          </div>
        ) : (
          events.map((event) => {
            const { formattedDate, timeInfo, diffDays } = formatEventDate(event.eventDate);
            const isPast = diffDays < 0;
            const isToday = diffDays === 0;
            const isSoon = diffDays > 0 && diffDays <= 3;
            const pillCls =
              isToday ? 'tag tag-accent' :
              isSoon  ? 'tag tag-warn'   :
              isPast  ? 'tag'            :
                        'tag tag-success';
            return (
              <article key={event.id} className="card p-4" style={isPast ? { opacity: 0.8 } : undefined}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-medium text-[color:var(--color-text-strong)]">{event.title}</h3>
                    {timeInfo && (
                      <span className={pillCls} style={{ fontSize: 11, marginTop: 6 }}>{timeInfo}</span>
                    )}
                  </div>
                  {user && event.createdBy === user.id && (
                    <button
                      onClick={() => deleteEvent(event.id, event.title)}
                      className="btn-ghost p-1.5"
                      style={{ color: 'var(--color-danger)' }}
                      aria-label="Delete event"
                      title="Delete event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {event.description && (
                  <p className="text-sm leading-relaxed text-[color:var(--color-text-muted)] mb-3">{event.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-[color:var(--color-text-muted)] pt-3 border-t" style={{ borderColor: 'var(--color-divider)' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="font-medium text-[color:var(--color-text)]">{formattedDate}</span>
                  </span>
                  {event.creator && (
                    <span className="inline-flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5" />
                      {event.creator.name}
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
