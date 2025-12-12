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
    <div className="space-y-4">
      {/* Page Title */}
      <div className="px-4 pt-2">
        <h2 className="text-xl font-semibold text-gray-900">Upcoming Events</h2>
        <p className="text-sm text-gray-600 mt-1">Company events and activities</p>
      </div>

      {/* Date Filter */}
      <div className="px-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <label className="text-xs font-medium text-gray-700 mb-2 block">Filter by Event Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Select date"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Clear date
            </button>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="px-4 space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-2">📅</div>
            <p className="text-gray-600">No events found</p>
            <p className="text-sm text-gray-500 mt-1">Check back later for upcoming activities</p>
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
                className={`bg-white rounded-lg border overflow-hidden shadow-sm ${
                  isToday
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : isSoon
                    ? 'border-yellow-400'
                    : isPast
                    ? 'border-gray-300 opacity-75'
                    : 'border-gray-200'
                }`}
              >
                <div className="p-4">
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">
                        {event.title}
                      </h3>
                      {timeInfo && (
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-1 rounded font-medium ${
                            isToday
                              ? 'bg-blue-100 text-blue-800'
                              : isSoon
                              ? 'bg-yellow-100 text-yellow-800'
                              : isPast
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {timeInfo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Description */}
                  {event.description && (
                    <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                  )}

                  {/* Event Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>{formattedDate}</span>
                    </div>
                    {event.creator && (
                      <div className="flex items-center gap-1">
                        <span>Created by {event.creator.name}</span>
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
