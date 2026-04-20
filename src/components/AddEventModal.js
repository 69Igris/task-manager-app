'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { X, Loader2 } from 'lucide-react';

export default function AddEventModal({ isOpen, onClose, onEventAdded }) {
  const { fetchWithAuth } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
  });

  const resetForm = () => setFormData({ title: '', description: '', eventDate: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return showToast('Title is required', 'error');
    if (!formData.eventDate) return showToast('Event date is required', 'error');

    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/events', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        showToast('Event created', 'success');
        resetForm();
        onClose();
        if (onEventAdded) onEventAdded();
      } else {
        throw new Error(data.error || 'Failed to create event');
      }
    } catch (error) {
      showToast(error.message || 'Failed to create event', 'error');
    } finally {
      setLoading(false);
    }
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
        className="w-full sm:max-w-lg sm:mx-4 max-h-[92vh] overflow-y-auto modal-sheet animate-sheet sm:animate-slide-up"
        style={{
          background: '#ffffff',
          boxShadow: 'var(--shadow-3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden sheet-handle" aria-hidden="true" />
        <div
          className="sticky top-0 z-10 px-6 pt-3 pb-3 sm:pt-4 sm:pb-4 flex items-center justify-between border-b"
          style={{ background: '#ffffff', borderColor: 'var(--color-divider)' }}
        >
          <h2 className="text-[17px] font-medium" style={{ color: 'var(--color-text-strong)' }}>
            New event
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
              Title <span style={{ color: 'var(--color-urgent)' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-base"
              placeholder="e.g., Team offsite, Company retreat"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="input-base resize-none"
              placeholder="Event details..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
              Date <span style={{ color: 'var(--color-urgent)' }}>*</span>
            </label>
            <input
              type="date"
              value={formData.eventDate}
              onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              className="input-base"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div
            className="flex items-center justify-end gap-2 pt-4 mt-2 border-t"
            style={{ borderColor: 'var(--color-divider)' }}
          >
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /><span>Creating</span></>) : <span>Create event</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
