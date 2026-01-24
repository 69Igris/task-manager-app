'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

export default function TaskDetailsModal({ task, onClose, onUpdate, onDelete }) {
  const { user, fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const [status, setStatus] = useState(task?.status || 'pending');
  const [currentTask, setCurrentTask] = useState(task);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const replyBoxRef = useRef(null);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setCurrentTask(task);
      fetchComments();
    }
  }, [task]);

  useEffect(() => {
    if (replyTo && replyBoxRef.current) {
      setTimeout(() => {
        replyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [replyTo]);

  const fetchComments = async () => {
    if (!task?.id) return;
    
    setLoadingComments(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments`);
      const data = await response.json();
      
      if (response.ok) {
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setNewComment('');
        await fetchComments();
        showToast('Comment added successfully', 'success');
      } else {
        throw new Error(data.error || 'Failed to add comment');
      }
    } catch (error) {
      showToast(error.message || 'Failed to add comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddReply = async (parentId) => {
    if (!replyContent.trim()) return;
    
    setSubmittingComment(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: replyContent, parentId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setReplyContent('');
        setReplyTo(null);
        await fetchComments();
        showToast('Reply added successfully', 'success');
      } else {
        throw new Error(data.error || 'Failed to add reply');
      }
    } catch (error) {
      showToast(error.message || 'Failed to add reply', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    console.log('Delete button clicked for comment:', commentId);
    
    const confirmed = await showConfirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment?',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) {
      console.log('Delete cancelled');
      return;
    }

    console.log('Deleting comment:', commentId);
    
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments/${commentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        console.log('Comment deleted successfully');
        await fetchComments();
        showToast('Comment deleted successfully', 'success');
      } else {
        const data = await response.json();
        console.error('Delete failed:', data);
        throw new Error(data.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast(error.message || 'Failed to delete comment', 'error');
    }
  };

  if (!task) return null;

  const isCreator = user?.id === task.createdBy;
  const isAssignee = task.assignedTo?.includes(user?.id);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const canEdit = isCreator || (isAssignee && task.status !== 'completed');
  const canComment = isCreator || isAssignee;

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
      // First, post the comment if there's one
      if (newComment.trim()) {
        const commentResponse = await fetchWithAuth(`/api/tasks/${task.id}/comments`, {
          method: 'POST',
          body: JSON.stringify({ content: newComment }),
        });
        
        if (!commentResponse.ok) {
          const commentData = await commentResponse.json();
          throw new Error(commentData.error || 'Failed to add comment');
        }
        setNewComment('');
        showToast('Comment added successfully', 'success');
        await fetchComments();
      }

      // Then update the status if it changed AND user has permission
      if (status !== task.status && canEdit) {
        const response = await fetchWithAuth(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });

        const data = await response.json();

        if (response.ok) {
          showToast('Task updated successfully', 'success');
          setCurrentTask(data.task);
          onUpdate(data.task);
        } else {
          throw new Error(data.error || 'Failed to update task');
        }
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast(error.message || 'Failed to save changes', 'error');
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
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderComment = (comment, depth = 0) => {
    const isAuthor = user?.id === comment.authorId;
    
    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {comment.author.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{comment.author.name}</div>
                <div className="text-xs text-gray-500">{formatCommentDate(comment.createdAt)}</div>
              </div>
            </div>
            {isAuthor && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteComment(comment.id);
                }}
                className="px-2 py-1 text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded text-xs font-semibold transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <p className="text-gray-800 text-sm whitespace-pre-wrap">{comment.content}</p>
          <button
            onClick={() => {
              setReplyTo(comment.id);
              setReplyContent('');
            }}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Reply
          </button>
          
          {replyTo === comment.id && (
            <div ref={replyBoxRef} className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows="2"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleAddReply(comment.id)}
                  disabled={!replyContent.trim() || submittingComment}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingComment ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={() => {
                    setReplyTo(null);
                    setReplyContent('');
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
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
      className="fixed inset-0 bg-gradient-to-br from-blue-600/95 via-indigo-600/95 to-purple-700/95 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center"
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

          {/* Created Date and Due Date - Side by Side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Created Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created Date
              </label>
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm">
                {formatDate(task.createdAt)}
              </div>
            </div>
            
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <div className={`w-full px-4 py-2 border rounded-lg text-sm ${
                isOverdue ? 'bg-red-50 border-red-300 text-red-800 font-semibold' : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}>
                {formatDate(task.dueDate)}
                {isOverdue && ' ⚠️'}
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

          {/* Comments Section */}
          <div className="pt-6 border-t border-gray-200 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>
            
            {/* Comments List */}
            {loadingComments ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-2 mb-4">
                {comments.map((comment) => renderComment(comment))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8 mb-4">No comments yet. Be the first to comment!</p>
            )}

            {/* Add Comment */}
            <div className="mt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows="3"
              />
            </div>
          </div>

          {/* Status */}
          <div className="pt-6 border-t border-gray-200 mt-6">
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
            {(canEdit || canComment) && (
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || ((status === currentTask.status || !canEdit) && !newComment.trim())}
                className={`flex-1 px-4 py-3 rounded-lg font-medium text-white ${
                  loading || ((status === currentTask.status || !canEdit) && !newComment.trim())
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            {!canEdit && !canComment && (
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
