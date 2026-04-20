'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  X, Calendar, MapPin, Settings2, User as UserIcon, AlertTriangle,
  MessageSquare, Loader2, Trash2, Send, CornerDownRight,
} from 'lucide-react';

function priorityTagCls(p) {
  if (p === 'high') return 'tag tag-urgent';
  if (p === 'medium') return 'tag tag-warn';
  if (p === 'low') return 'tag tag-success';
  return 'tag';
}
function statusTagCls(s) {
  if (s === 'completed') return 'tag tag-success';
  if (s === 'in-progress') return 'tag tag-accent';
  return 'tag';
}
function statusLabel(s) { return s === 'in-progress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1); }

export default function TaskDetailsModal({ task, onClose, onUpdate, onDelete, onTaskUpdate, onTaskDelete }) {
  const handleUpdate = onUpdate || onTaskUpdate || (() => {});
  const handleDeleteCb = onDelete || onTaskDelete || (() => {});
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
    // eslint-disable-next-line
  }, [task]);

  useEffect(() => {
    if (replyTo && replyBoxRef.current) {
      setTimeout(() => replyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  }, [replyTo]);

  const fetchComments = async () => {
    if (!task?.id) return;
    setLoadingComments(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments`);
      const data = await response.json();
      if (response.ok) setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
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
        showToast('Reply added', 'success');
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
    const confirmed = await showConfirm({
      title: 'Delete comment',
      message: 'This comment will be removed permanently.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}/comments/${commentId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchComments();
        showToast('Comment deleted', 'success');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete comment');
      }
    } catch (error) {
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
    if (status === 'completed' && task.status !== 'completed') {
      const confirmed = await showConfirm({
        title: 'Mark as completed',
        message: 'Assignees can\'t reopen the task once it\'s marked completed. Proceed?',
        confirmText: 'Mark completed',
        cancelText: 'Cancel',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    setLoading(true);
    try {
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
        showToast('Comment added', 'success');
        await fetchComments();
      }

      if (status !== task.status && canEdit) {
        const response = await fetchWithAuth(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        const data = await response.json();
        if (response.ok) {
          showToast('Task updated', 'success');
          setCurrentTask(data.task);
          handleUpdate(data.task);
        } else {
          throw new Error(data.error || 'Failed to update task');
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to save changes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: 'Delete task',
      message: 'This task and all its comments will be removed. This can\'t be undone.',
      confirmText: 'Delete task',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Task deleted', 'success');
        handleDeleteCb(task.id);
        onClose();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete task');
      }
    } catch (error) {
      showToast(error.message || 'Failed to delete task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Not set';

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
    const initial = comment.author?.name?.charAt(0).toUpperCase() || '?';
    return (
      <div key={comment.id} className={depth > 0 ? 'ml-6 mt-2' : 'mt-3 first:mt-0'}>
        <div className="flex gap-3">
          {depth > 0 && (
            <CornerDownRight className="h-3.5 w-3.5 mt-2.5 shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
          )}
          <div
            className="flex-1 p-3"
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {initial}
                </div>
                <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text-strong)' }}>
                  {comment.author?.name || 'Unknown'}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  · {formatCommentDate(comment.createdAt)}
                </span>
              </div>
              {isAuthor && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteComment(comment.id); }}
                  className="btn-ghost p-1"
                  style={{ color: 'var(--color-urgent)' }}
                  aria-label="Delete comment"
                  title="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
              {comment.content}
            </p>
            {canComment && depth === 0 && (
              <button
                onClick={() => { setReplyTo(comment.id); setReplyContent(''); }}
                className="mt-2 text-[11px] font-medium link"
              >
                Reply
              </button>
            )}

            {replyTo === comment.id && (
              <div ref={replyBoxRef} className="mt-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="input-base resize-none text-sm"
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setReplyTo(null); setReplyContent(''); }}
                    className="btn-ghost"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddReply(comment.id)}
                    disabled={!replyContent.trim() || submittingComment}
                    className="btn-primary"
                    style={{ padding: '7px 14px', fontSize: 13 }}
                  >
                    {submittingComment
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Sending</span></>
                      : <><Send className="h-3.5 w-3.5" /><span>Reply</span></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-1">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const saveDisabled = loading || ((status === currentTask.status || !canEdit) && !newComment.trim());

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-2xl sm:mx-4 max-h-[92vh] overflow-y-auto modal-sheet animate-sheet sm:animate-slide-up"
        style={{
          background: '#ffffff',
          boxShadow: 'var(--shadow-3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden sheet-handle" aria-hidden="true" />
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 pt-3 pb-3 sm:pt-4 sm:pb-4 flex items-start justify-between gap-4 border-b"
          style={{ background: '#ffffff', borderColor: 'var(--color-divider)' }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-medium" style={{ color: 'var(--color-text)' }}>
                {task.equipment || 'Unassigned equipment'}
              </span>
              {task.area && (
                <>
                  <span style={{ color: 'var(--color-text-subtle)' }}>·</span>
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{task.area}</span>
                </>
              )}
            </div>
            <h2 className="text-[19px] leading-snug font-medium" style={{ color: 'var(--color-text-strong)' }}>
              {task.title}
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 shrink-0" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Status + priority + due */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={statusTagCls(currentTask.status)}>{statusLabel(currentTask.status)}</span>
            {task.priority && (
              <span className={priorityTagCls(task.priority)}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
              </span>
            )}
            {task.dueDate && (
              <span className={isOverdue ? 'tag tag-urgent' : 'tag'}>
                <Calendar className="h-3 w-3" />
                {isOverdue ? `Overdue · ${formatDate(task.dueDate)}` : `Due ${formatDate(task.dueDate)}`}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <div className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Description
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
                {task.description}
              </p>
            </div>
          )}

          {/* Metadata grid */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4"
            style={{
              background: 'var(--color-bg-inset)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <MetaRow label="Assigned to">
              {task.assignedUsers && task.assignedUsers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {task.assignedUsers.map((u) => (
                    <span key={u.id} className="tag" style={{ fontSize: 11 }}>
                      <UserIcon className="h-3 w-3" />
                      {u.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No assignees</span>
              )}
            </MetaRow>
            <MetaRow label="Created by">
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                {task.creator?.name || 'Unknown'}
              </span>
            </MetaRow>
            <MetaRow label="Created">
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>{formatDate(task.createdAt)}</span>
            </MetaRow>
            <MetaRow label="Due date">
              <span
                className="text-sm inline-flex items-center gap-1.5"
                style={{ color: isOverdue ? 'var(--color-urgent)' : 'var(--color-text)' }}
              >
                {formatDate(task.dueDate)}
                {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
              </span>
            </MetaRow>
            {task.completedAt && (
              <MetaRow label="Completed">
                <span className="text-sm" style={{ color: '#0a7d3a' }}>{formatDate(task.completedAt)}</span>
              </MetaRow>
            )}
          </div>

          {/* Status editor */}
          {canEdit && (
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Update status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-base"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          {!canEdit && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {task.status === 'completed'
                ? 'Only the creator can modify a completed task.'
                : 'You don\'t have permission to edit this task.'}
            </p>
          )}

          {/* Comments */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4" style={{ color: 'var(--color-text)' }} />
              <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-strong)' }}>
                Comments {comments.length > 0 && <span style={{ color: 'var(--color-text-muted)' }}>({comments.length})</span>}
              </h3>
            </div>

            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--color-accent)' }} />
              </div>
            ) : comments.length > 0 ? (
              <div>{comments.map((c) => renderComment(c))}</div>
            ) : (
              <p
                className="text-sm text-center py-6"
                style={{ color: 'var(--color-text-muted)' }}
              >
                No comments yet.
              </p>
            )}

            {canComment && (
              <div className="mt-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="input-base resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions footer */}
        <div
          className="sticky bottom-0 px-6 py-4 flex items-center justify-between gap-3 border-t"
          style={{ background: '#ffffff', borderColor: 'var(--color-divider)' }}
        >
          <div>
            {isCreator && (
              <button type="button" onClick={handleDelete} disabled={loading} className="btn-ghost" style={{ color: 'var(--color-urgent)' }}>
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Close</button>
            {(canEdit || canComment) && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saveDisabled}
                className="btn-primary"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving</span></>
                  : <span>Save changes</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, children }) {
  return (
    <div>
      <div
        className="text-[11px] font-medium mb-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
