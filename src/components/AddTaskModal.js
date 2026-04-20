'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { X, Loader2, Bell, BellOff } from 'lucide-react';

const PRIORITIES = [
  { key: 'low',    label: 'Low',    tagCls: 'tag tag-success' },
  { key: 'medium', label: 'Medium', tagCls: 'tag tag-warn' },
  { key: 'high',   label: 'High',   tagCls: 'tag tag-urgent' },
];

export default function AddTaskModal({ isOpen, onClose, onTaskAdded }) {
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    equipment: '',
    area: '',
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: [],
    dueDate: '',
    alarm: false,
  });

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await fetchWithAuth('/api/users');
      const data = await response.json();
      if (response.ok) setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const resetForm = () => setFormData({
    equipment: '', area: '', title: '', description: '',
    priority: 'medium', assignedTo: [], dueDate: '', alarm: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.equipment) return showToast('Equipment is required', 'error');
    if (!formData.area) return showToast('Area is required', 'error');
    if (!formData.title) return showToast('Title is required', 'error');
    if (formData.assignedTo.length === 0) return showToast('Please assign at least one person', 'error');
    if (formData.assignedTo.length > 2) return showToast('Maximum 2 people can be assigned', 'error');

    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        showToast('Task created', 'success');
        resetForm();
        onClose();
        if (onTaskAdded) onTaskAdded();
        window.dispatchEvent(new Event('refreshNotifications'));
      } else {
        throw new Error(data.error || 'Failed to create task');
      }
    } catch (error) {
      showToast(error.message || 'Failed to create task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssigneeToggle = (userId) => {
    setFormData((prev) => {
      const next = prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter((id) => id !== userId)
        : prev.assignedTo.length < 2
          ? [...prev.assignedTo, userId]
          : prev.assignedTo;
      return { ...prev, assignedTo: next };
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-lg sm:mx-4 max-h-[92vh] overflow-y-auto animate-slide-up"
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between border-b"
          style={{ background: '#ffffff', borderColor: 'var(--color-divider)' }}
        >
          <h2 className="text-[17px] font-medium" style={{ color: 'var(--color-text-strong)' }}>New task</h2>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">
                Equipment <span style={{ color: 'var(--color-urgent)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                className="input-base"
                placeholder="e.g., Excavator, Pump"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">
                Area <span style={{ color: 'var(--color-urgent)' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="input-base"
                placeholder="e.g., Workshop A, Site 3"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">
              Title <span style={{ color: 'var(--color-urgent)' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-base"
              placeholder="Brief task description"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="input-base resize-none"
              placeholder="Detailed information..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium">
                Assign to <span style={{ color: 'var(--color-urgent)' }}>*</span>
              </label>
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {formData.assignedTo.length}/2 selected
              </span>
            </div>
            <div
              className="max-h-44 overflow-y-auto p-2 space-y-1"
              style={{
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-input)',
                background: '#ffffff',
              }}
            >
              {users.length === 0 ? (
                <p className="text-sm text-center py-3" style={{ color: 'var(--color-text-muted)' }}>
                  Loading team members...
                </p>
              ) : (
                users.map((u) => {
                  const selected = formData.assignedTo.includes(u.id);
                  const disabled = !selected && formData.assignedTo.length >= 2;
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-2 py-2 cursor-pointer transition-colors"
                      style={{
                        borderRadius: 'var(--radius-xs)',
                        background: selected ? 'rgba(0, 112, 204, 0.08)' : 'transparent',
                        border: `1px solid ${selected ? 'rgba(0, 112, 204, 0.25)' : 'transparent'}`,
                        opacity: disabled ? 0.45 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleAssigneeToggle(u.id)}
                        disabled={disabled}
                        className="h-4 w-4"
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-strong)' }}>
                          {u.name}
                        </div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {u.email}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">Due date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Priority</label>
              <div className="flex gap-1">
                {PRIORITIES.map((p) => {
                  const active = formData.priority === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.key })}
                      className="flex-1 text-xs font-medium px-2 py-2 transition-colors"
                      style={{
                        background: active ? 'var(--color-accent)' : '#ffffff',
                        color: active ? '#ffffff' : 'var(--color-text)',
                        border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
                        borderRadius: 'var(--radius-input)',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: 'var(--color-bg-inset)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <div className="flex items-center gap-2.5">
              {formData.alarm
                ? <Bell className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
                : <BellOff className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />}
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Reminder</div>
                <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Notify before the due date
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, alarm: !formData.alarm })}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ background: formData.alarm ? 'var(--color-accent)' : '#d1d5db' }}
              aria-label="Toggle reminder"
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                style={{ transform: formData.alarm ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          <div
            className="flex items-center justify-end gap-2 pt-4 mt-2 border-t"
            style={{ borderColor: 'var(--color-divider)' }}
          >
            <button type="button" onClick={() => { resetForm(); onClose(); }} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /><span>Creating</span></>) : <span>Create task</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
