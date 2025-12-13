'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const { user, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, in-progress, completed, overdue
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      const response = await fetchWithAuth('/api/tasks?myTasks=true');
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

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'overdue') {
      return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    }
    return task.status === filter;
  });

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
        <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
        <p className="text-sm text-gray-600 mt-1">Tasks assigned to you</p>
      </div>

      {/* Filter Tabs */}
      <div className="px-4">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {['all', 'pending', 'in-progress', 'completed', 'overdue'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-2 py-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-all shadow-sm ${
                filter === status
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:shadow-md'
              }`}
            >
              {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="px-4 space-y-3 pb-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-gray-300 text-6xl mb-3">📋</div>
            <p className="text-gray-600 font-medium">No tasks found</p>
            <p className="text-gray-400 text-sm mt-1">Tasks will appear here when assigned</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {/* Card Header - Equipment & Area */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-4 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
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
                </div>
                {task.area && (
                  <div className="mt-3 bg-white/50 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-gray-500 tracking-wide">AREA</span>
                    <p className="text-sm font-semibold text-gray-700 mt-1 flex items-center gap-2">
                      <span>📍</span>
                      {task.area}
                    </p>
                  </div>
                )}
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
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Due Date Badge - Always show if exists */}
                  {task.dueDate && (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const isOverdue = dueDate < today && task.status !== 'completed';
                    const isDueToday = dueDate.getTime() === today.getTime() && task.status !== 'completed';
                    
                    return (
                      <span className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border-2 font-semibold ${
                        isOverdue
                          ? 'bg-red-50 border-red-300 text-red-800'
                          : isDueToday
                          ? 'bg-orange-50 border-orange-300 text-orange-800'
                          : task.status === 'completed'
                          ? 'bg-green-50 border-green-300 text-green-800'
                          : 'bg-blue-50 border-blue-300 text-blue-800'
                      }`}>
                        <span>📅</span>
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {isOverdue && ' - OVERDUE'}
                        {isDueToday && ' - DUE TODAY'}
                      </span>
                    );
                  })()}
                  
                  {/* Priority Badge */}
                  <span className={`inline-flex items-center text-xs px-3 py-1.5 rounded-full border-2 font-bold shadow-sm ${getPriorityColor(task.priority)}`}>
                    {task.priority ? task.priority.toUpperCase() : 'NORMAL'}
                  </span>

                  {/* Status Badge */}
                  <span className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-semibold">
                    {task.status.replace('-', ' ').toUpperCase()}
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
