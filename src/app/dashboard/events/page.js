'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useState, useEffect } from 'react';

export default function EventsPage() {
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      let url = '/api/events';
      const params = new URLSearchParams();
      
      if (selectedDate) {
        params.append('startDate', selectedDate);
        params.append('endDate', selectedDate);
      }

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetchWithAuth(url);
      const data = await response.json();
      
      if (response.ok) {
        setEvents(data.events || []);
      } else {
        showToast(data.error || 'Failed to fetch events', 'error');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      showToast('Failed to fetch events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    let timeInfo = '';
    if (diffDays < 0) {
      timeInfo = `${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
      timeInfo = 'Today';
    } else if (diffDays === 1) {
      timeInfo = 'Tomorrow';
    } else if (diffDays <= 7) {
      timeInfo = `In ${diffDays} days`;
    }

    return { formattedDate, timeInfo, diffDays };
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Page Title */}
      <div className="px-4 pt-4">
        <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
        <p className="text-sm text-gray-600 mt-1">Company events and activities</p>
      </div>

      {/* Date Filter */}
      <div className="px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
          <label className="text-xs font-medium text-gray-700 mb-2 block">Filter by Event Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Select date"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear date
            </button>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="px-4 space-y-3 pb-2">
        {events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-gray-300 text-6xl mb-3">📅</div>
            <p className="text-gray-600 font-medium">No events found</p>
            <p className="text-gray-400 text-sm mt-1">Check back later for upcoming activities</p>
          </div>
        ) : (
          events.map((event) => {
            const { formattedDate, timeInfo, diffDays } = formatEventDate(event.eventDate);
            const isPast = diffDays < 0;
            const isToday = diffDays === 0;
            const isSoon = diffDays > 0 && diffDays <= 3;

            return (
              <div
                key={event.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isToday
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : isSoon
                    ? 'border-yellow-400 ring-1 ring-yellow-200'
                    : isPast
                    ? 'border-gray-300 opacity-75'
                    : 'border-gray-200'
                }`}
              >
                {/* Event Header */}
                <div className={`px-4 py-4 border-b ${
                  isToday
                    ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-blue-100'
                    : isSoon
                    ? 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-yellow-100'
                    : isPast
                    ? 'bg-gray-50 border-gray-100'
                    : 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-green-100'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>📅</span>
                        {event.title}
                      </h3>
                      {timeInfo && (
                        <span
                          className={`inline-block mt-2 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm ${
                            isToday
                              ? 'bg-blue-500 text-white'
                              : isSoon
                              ? 'bg-yellow-500 text-white'
                              : isPast
                              ? 'bg-gray-400 text-white'
                              : 'bg-green-500 text-white'
                          }`}
                        >
                          {timeInfo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Event Body */}
                <div className="px-4 py-4">
                  {/* Event Description */}
                  {event.description && (
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{event.description}</p>
                  )}

                  {/* Event Footer */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="text-base">🗓️</span>
                      <span className="font-semibold text-gray-700">{formattedDate}</span>
                    </div>
                    {event.creator && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-base">👤</span>
                        <span className="font-medium">{event.creator.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
