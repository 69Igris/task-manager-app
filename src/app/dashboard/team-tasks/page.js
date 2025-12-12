'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useState, useEffect } from 'react';

export default function TeamTasksPage() {
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchAllTasks();
  }, []);

  const fetchAllTasks = async () => {
    try {
      let url = '/api/tasks';
      const params = new URLSearchParams();
      
      if (filter !== 'all') {
        params.append('status', filter);
      }
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
        setTasks(data.tasks || []);
      } else {
        showToast(data.error || 'Failed to fetch tasks', 'error');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showToast('Failed to fetch tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPendingTime = (dueDate) => {
    if (!dueDate) return '';
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  useEffect(() => {
    fetchAllTasks();
  }, [filter, selectedDate]);

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
        <h2 className="text-xl font-semibold text-gray-900">Team Tasks</h2>
        <p className="text-sm text-gray-600 mt-1">All tasks in the system</p>
      </div>

      {/* Filters */}
      <div className="px-4 space-y-3">
        {/* Status Filter */}
        <div className="grid grid-cols-4 gap-1.5">
          {['all', 'pending', 'in-progress', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <label className="text-xs font-medium text-gray-700 mb-2 block">Filter by Due Date</label>
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

      {/* Task List */}
      <div className="px-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-2">📋</div>
            <p className="text-gray-600">No tasks found</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">EQUIPMENT</span>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`}></div>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mt-1">
                      {task.equipment || 'N/A'}
                    </h3>
                  </div>
                </div>
                {task.area && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-500">AREA</span>
                    <p className="text-sm text-gray-700 mt-1">{task.area}</p>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="px-4 py-3">
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                  )}
                </div>

                {/* Assigned Users */}
                {task.assignedUsers && task.assignedUsers.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-500">Assigned to:</span>
                    <div className="flex gap-1">
                      {task.assignedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {u.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {task.dueDate && task.status !== 'completed' && (
                    <span className="text-xs px-2 py-1 rounded border bg-white text-gray-700 border-gray-300">
                      ⏱️ {getPendingTime(task.dueDate)}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded border font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority ? task.priority.toUpperCase() : 'NORMAL'}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                    {task.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
