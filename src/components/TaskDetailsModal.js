'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

export default function TaskDetailsModal({ task, onClose, onUpdate, onDelete }) {
  const { user, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const [status, setStatus] = useState(task?.status || 'pending');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
    }
  }, [task]);

  if (!task) return null;

  const isCreator = user?.id === task.createdBy;
  const isAssignee = task.assignedTo?.includes(user?.id);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const canEdit = isCreator || (isAssignee && task.status !== 'completed');

  const handleSave = async () => {
    // If status is being set to completed, show confirmation
    if (status === 'completed' && task.status !== 'completed') {
      const confirmed = await showConfirm({
        title: 'Mark as Completed',
        message: 'Are you sure the task is completed? This action cannot be undone by assignees.',
        confirmText: 'Yes, Complete',
        cancelText: 'Cancel',
        type: 'warning',
      });
      
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Task updated successfully', 'success');
        onUpdate(data.task);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      showToast(error.message || 'Failed to update task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Task deleted successfully', 'success');
        onDelete(task.id);
        onClose();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast(error.message || 'Failed to delete task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'low':
        return 'bg-green-100 border-green-500 text-green-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-blue-600/95 via-indigo-600/95 to-purple-700/95 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Equipment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment
            </label>
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
              {task.equipment || 'N/A'}
            </div>
          </div>

          {/* Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area / Location
            </label>
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
              {task.area || 'N/A'}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title
            </label>
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
              {task.title}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 min-h-[80px]">
                {task.description}
              </div>
            </div>
          )}

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned To
            </label>
            <div className="space-y-2 border border-gray-300 rounded-lg p-3 bg-gray-50">
              {task.assignedUsers && task.assignedUsers.length > 0 ? (
                task.assignedUsers.map((assignedUser) => (
                  <div
                    key={assignedUser.id}
                    className="flex items-center gap-3 p-2 rounded bg-blue-50 border border-blue-300"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{assignedUser.name}</div>
                      <div className="text-xs text-gray-500">{assignedUser.email}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No assignees</p>
              )}
            </div>
          </div>

          {/* Created By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created By
            </label>
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
              {task.creator?.name || 'Unknown'} ({task.creator?.email || 'N/A'})
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created Date
              </label>
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm">
                {formatDate(task.createdAt)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <div className={`w-full px-4 py-2 border rounded-lg text-sm ${
                isOverdue ? 'bg-red-50 border-red-300 text-red-800 font-semibold' : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}>
                {formatDate(task.dueDate)}
                {isOverdue && ' ⚠️ OVERDUE'}
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className={`py-2 px-4 rounded-lg border-2 font-medium text-center ${getPriorityColor(task.priority)}`}>
              {task.priority ? task.priority.toUpperCase() : 'MEDIUM'}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            {canEdit ? (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            ) : (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900">
                {task.status.replace('-', ' ').toUpperCase()}
              </div>
            )}
            {!canEdit && (
              <p className="text-xs text-gray-500 mt-1">
                {task.status === 'completed' 
                  ? 'Only the creator can modify completed tasks'
                  : 'You do not have permission to edit this task'}
              </p>
            )}
          </div>

          {/* Completed At */}
          {task.completedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completed Date
              </label>
              <div className="w-full px-4 py-2 border border-green-300 rounded-lg bg-green-50 text-green-900">
                {formatDate(task.completedAt)}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {isCreator && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className={`px-4 py-3 rounded-lg font-medium text-white ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || status === task.status}
                className={`flex-1 px-4 py-3 rounded-lg font-medium text-white ${
                  loading || status === task.status
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            {!canEdit && !isCreator && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
