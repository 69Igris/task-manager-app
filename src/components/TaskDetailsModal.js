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
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      // Fetch comments when modal opens
      fetchComments();
    }
  }, [task?.id]);

  const fetchComments = async () => {
    if (!task?.id) return;
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments`);
      const data = await response.json();
      if (response.ok) {
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

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

  const handleAddComment = async (parentId = null) => {
    const content = newComment.trim();
    if (!content) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentId }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Comment added successfully', 'success');
        setNewComment('');
        setReplyingTo(null);
        // Refresh comments
        await fetchComments();
      } else {
        throw new Error(data.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast(error.message || 'Failed to add comment', 'error');
    }
  };

  const handleEditComment = async (commentId) => {
    const content = editContent.trim();
    if (!content) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Comment updated successfully', 'success');
        setEditingComment(null);
        setEditContent('');
        // Refresh comments
        await fetchComments();
      } else {
        throw new Error(data.error || 'Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      showToast(error.message || 'Failed to update comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = await showConfirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? All replies will also be deleted.',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Comment deleted successfully', 'success');
        // Refresh comments
        await fetchComments();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast(error.message || 'Failed to delete comment', 'error');
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

  const formatCommentDate = (dateString) => {
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

  const renderComment = (comment, depth = 0) => {
    const isAuthor = user?.id === comment.authorId;
    const isTaskCreator = user?.id === task.createdBy;
    const canDelete = isAuthor || isTaskCreator;
    const isEditing = editingComment === comment.id;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-3' : ''}`}>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">{comment.author.name}</span>
                <span className="text-xs text-gray-500">{formatCommentDate(comment.createdAt)}</span>
                {comment.updatedAt !== comment.createdAt && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {isAuthor && !isEditing && (
                <button
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              )}
              {canDelete && !isEditing && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-xs text-red-600 hover:text-red-800 ml-2"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="3"
                maxLength={2000}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{comment.content}</p>
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-2"
              >
                Reply
              </button>
            </>
          )}
        </div>

        {/* Reply form */}
        {replyingTo === comment.id && (
          <div className="ml-8 mt-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a reply..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="2"
              maxLength={2000}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleAddComment(comment.id)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Reply
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
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

          {/* Comments Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Comments</h3>
            
            {/* Add comment form */}
            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="3"
                maxLength={2000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {newComment.length}/2000 characters
                </span>
                <button
                  onClick={() => handleAddComment()}
                  disabled={!newComment.trim()}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    newComment.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Add Comment
                </button>
              </div>
            </div>

            {/* Comments list */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.length > 0 ? (
                comments.map((comment) => renderComment(comment))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>
          </div>

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
