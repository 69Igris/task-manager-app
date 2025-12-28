'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { useState, useEffect } from 'react';

export default function TeamTasksPage() {
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, in-progress, completed, overdue
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTaskName, setSelectedTaskName] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchAllTasks();
    
    // Listen for refresh event from task creation
    const handleRefresh = () => {
      console.log('👥 Team Tasks: Received refreshTasks event, fetching tasks...');
      fetchAllTasks();
    };
    window.addEventListener('refreshTasks', handleRefresh);
    return () => window.removeEventListener('refreshTasks', handleRefresh);
  }, []);

  const fetchAllTasks = async () => {
    try {
      let url = '/api/tasks';
      const params = new URLSearchParams();
      
      if (filter !== 'all' && filter !== 'overdue') {
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

  const handleTaskUpdate = (updatedTask) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleTaskDelete = (deletedTaskId) => {
    setTasks(tasks.filter(t => t.id !== deletedTaskId));
    showToast('Task deleted successfully', 'success');
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

  // Get unique assigned user names for dropdown
  const uniqueUserNames = [...new Set(
    tasks.flatMap(t => (t.assignedUsers || []).map(u => u.name)).filter(Boolean)
  )].sort();

  const displayedTasks = tasks.filter((task) => {
    const matchesStatus = (() => {
      if (filter === 'all') return true;
      if (filter === 'overdue') {
        return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
      }
      return task.status === filter;
    })();

    if (!matchesStatus) return false;

    if (!selectedTaskName) return true;
    return task.assignedUsers && task.assignedUsers.some(u => u.name === selectedTaskName);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        {/* Page Title */}
        <div className="px-4 pt-4 pb-3">
          <h2 className="text-2xl font-bold text-gray-900">Team Tasks</h2>
          <p className="text-sm text-gray-600 mt-1">All tasks in the system</p>
        </div>

        {/* Filters */}
        <div className="px-4 pb-3">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap mb-1">Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white min-w-[110px]"
              >
                {['all', 'pending', 'in-progress', 'completed', 'overdue'].map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All' : status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap mb-1">Due Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white min-w-[130px]"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium ml-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap mb-1">Name:</label>
              <div className="flex items-center gap-1">
                <select
                  value={selectedTaskName}
                  onChange={(e) => setSelectedTaskName(e.target.value)}
                  className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white min-w-[110px]"
                >
                  <option value="">All</option>
                  {uniqueUserNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {selectedTaskName && (
                  <button
                    onClick={() => setSelectedTaskName('')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="px-4 space-y-3 pt-4">
        {displayedTasks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-gray-300 text-6xl mb-3">📋</div>
            <p className="text-gray-600 font-medium">No tasks found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          displayedTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {/* Card Header - Equipment & Area */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-4 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500 tracking-wide">EQUIPMENT</span>
                      <div className={`w-3 h-3 rounded-full shadow-inner ${getStatusColor(task.status)}`}></div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>⚙️</span>
                      {task.equipment || 'N/A'}
                    </h3>
                  </div>
                  {task.area && (
                    <div className="flex-1 bg-white/50 rounded-lg px-3 py-2">
                      <span className="text-xs font-bold text-gray-500 tracking-wide">AREA</span>
                      <p className="text-sm font-semibold text-gray-700 mt-1 flex items-center gap-2">
                        <span>📍</span>
                        {task.area}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body - Task Details */}
              <div className="px-4 py-4">
                <div className="mb-4">
                  <h4 className="text-base font-bold text-gray-900 mb-2">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{task.description}</p>
                  )}
                </div>

                {/* Assigned Users */}
                {task.assignedUsers && task.assignedUsers.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-gray-500 font-medium">👥</span>
                    <div className="flex gap-2 flex-wrap">
                      {task.assignedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-3 py-1.5 rounded-full font-semibold shadow-sm"
                        >
                          {u.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer - Badges */}
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Status Badge */}
                  <span className="inline-flex items-center text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-semibold whitespace-nowrap">
                    {task.status.replace('-', ' ').toUpperCase()}
                  </span>
                  
                  {/* Due Date Badge - Always show if exists */}
                  {task.dueDate && (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const isOverdue = dueDate < today && task.status !== 'completed';
                    const isDueToday = dueDate.getTime() === today.getTime() && task.status !== 'completed';
                    
                    return (
                      <span className={`inline-flex items-center gap-0.5 text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full border sm:border-2 font-semibold whitespace-nowrap ${
                        isOverdue
                          ? 'bg-red-50 border-red-300 text-red-800'
                          : isDueToday
                          ? 'bg-orange-50 border-orange-300 text-orange-800'
                          : task.status === 'completed'
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : 'bg-blue-50 border-blue-300 text-blue-800'
                      }`}>
                        <span className="text-[8px] sm:text-xs">📅</span>
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {isOverdue && ' - OVERDUE'}
                        {isDueToday && ' - DUE TODAY'}
                      </span>
                    );
                  })()}
                  
                  {/* Priority Badge */}
                  <span className={`inline-flex items-center text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full border sm:border-2 font-bold shadow-sm whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                    {task.priority ? task.priority.toUpperCase() : 'NORMAL'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Details Modal */}
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
