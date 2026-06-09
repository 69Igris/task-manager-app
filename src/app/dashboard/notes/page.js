'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Trash2, Plus, Edit3, Loader2, Save, X, Check, XCircle
} from 'lucide-react';
import MobileHero from '@/components/MobileHero';

export default function NotesPage() {
  const { fetchWithAuth, user } = useAuth();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create / Edit state
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editItems, setEditItems] = useState([]);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/notes');
      const data = await response.json();
      if (response.ok) setNotes(data.notes || []);
      else showToast(data.error || 'Failed to fetch notes', 'error');
    } catch {
      showToast('Failed to fetch notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, showToast]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleCreateNote = async () => {
    try {
      const response = await fetchWithAuth('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Note', items: [] }),
      });
      const data = await response.json();
      if (response.ok) {
        setNotes([data, ...notes]);
        startEditing(data);
      } else throw new Error(data.error);
    } catch (err) {
      showToast(err.message || 'Failed to create note', 'error');
    }
  };

  const deleteNote = async (id, title) => {
    const confirmed = await showConfirm({
      title: 'Delete note',
      message: `Delete "${title}"? This can't be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      const response = await fetchWithAuth(`/api/notes/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Note deleted', 'success');
        setNotes(notes.filter(n => n.id !== id));
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditItems(JSON.parse(JSON.stringify(note.items || [])));
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditTitle('');
    setEditItems([]);
  };

  const saveNote = async () => {
    try {
      const response = await fetchWithAuth(`/api/notes/${editingNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, items: editItems }),
      });
      if (response.ok) {
        const savedNote = await response.json();
        setNotes(notes.map(n => n.id === editingNoteId ? savedNote : n));
        cancelEditing();
        showToast('Saved', 'success');
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const addItem = (type) => {
    setEditItems([
      ...editItems, 
      { id: Date.now().toString(), type, content: '', completed: false }
    ]);
  };

  const updateItem = (id, newContent) => {
    setEditItems(editItems.map(item => item.id === id ? { ...item, content: newContent } : item));
  };
  
  const toggleItemCompleted = (id) => {
    setEditItems(editItems.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const removeItem = (id) => {
    setEditItems(editItems.filter(item => item.id !== id));
  };

  const toggleStatusDirect = async (noteId, itemId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const items = [...(note.items || [])];
    const idx = items.findIndex(i => i.id === itemId);
    if (idx < 0) return;

    items[idx].completed = !items[idx].completed;
    
    // immediate optimistic update
    setNotes(notes.map(n => n.id === noteId ? { ...n, items } : n));
    
    try {
      await fetchWithAuth(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } catch {
      // rollback if needed
      items[idx].completed = !items[idx].completed;
      setNotes(notes.map(n => n.id === noteId ? { ...n, items } : n));
      showToast('Failed to toggle', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="lg:px-8 lg:pt-6 lg:pb-2">
        <MobileHero
          title="Your"
          accent="notes"
          eyebrowIcon={Edit3}
          eyebrow={`${notes.length} note${notes.length === 1 ? '' : 's'}`}
          body="Use notes for ideas, task lists, and pointers."
          progressIcon={Edit3}
          tiles={[]}
        />
      </div>

      <div
        className="sticky top-14 z-10 bg-[color:var(--color-bg-inset)]/90 backdrop-blur-sm border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-[color:var(--color-text-strong)] flex items-center gap-2">
            <Edit3 className="h-4 w-4" /> All Notes
          </h2>
          <button onClick={handleCreateNote} className="btn-primary" style={{ padding: '6px 12px', fontSize: 13 }}>
            <Plus className="h-4 w-4 mr-1" /> New Note
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-5 grid gap-4 lg:grid-cols-2">
        {notes.length === 0 ? (
          <div className="panel text-center py-14 px-6 lg:col-span-2">
            <p className="font-semibold text-[15px]" style={{ color: 'var(--color-text-strong)' }}>
              No notes yet
            </p>
            <p className="mt-1.5 text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--color-text-muted)' }}>
              Create a note to jot down ideas, lists with checkboxes, and important pointers.
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const isEditing = editingNoteId === note.id;

            return (
              <article key={note.id} className="card p-4 flex flex-col min-h-[200px]">
                {isEditing ? (
                  <div className="flex-1 flex flex-col space-y-3">
                    <input
                      type="text"
                      className="input-base font-semibold text-lg"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="Note Title"
                      autoFocus
                    />
                    
                    <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {editItems.map((item, idx) => (
                        <div key={item.id} className="flex flex-col gap-1">
                           <div className="flex items-start gap-2">
                            {item.type === 'task' ? (
                              <button onClick={() => toggleItemCompleted(item.id)} className="mt-1 flex-shrink-0 text-[color:var(--color-text-muted)] focus:outline-none">
                                {item.completed ? <Check className="h-4 w-4 text-[color:var(--color-success)]" /> : <div className="h-4 w-4 rounded border border-[color:var(--color-border)]" />}
                              </button>
                            ) : (
                              <span className="mt-1 flex-shrink-0 text-[color:var(--color-text-muted)]">•</span>
                            )}
                            <textarea
                              className="input-base flex-1 resize-none"
                              rows={1}
                              value={item.content}
                              onChange={e => updateItem(item.id, e.target.value)}
                              placeholder={item.type === 'task' ? "Task description..." : "Note details..."}
                              style={{ 
                                textDecoration: item.type === 'task' && item.completed ? 'line-through' : 'none',
                                color: item.type === 'task' && item.completed ? 'var(--color-text-muted)' : 'inherit'
                              }}
                            />
                            <button onClick={() => removeItem(item.id)} className="mt-1 text-[color:var(--color-danger)] opacity-60 hover:opacity-100 p-1">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <button onClick={() => addItem('bullet')} className="btn-secondary flex-1 py-1.5 text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Bullet
                      </button>
                      <button onClick={() => addItem('task')} className="btn-secondary flex-1 py-1.5 text-xs">
                        <Check className="h-3 w-3 mr-1" /> Task
                      </button>
                    </div>

                    <div className="border-t pt-3 flex items-center justify-end gap-2" style={{ borderColor: 'var(--color-divider)' }}>
                      <button onClick={cancelEditing} className="btn-ghost px-3 py-1.5 text-sm">Cancel</button>
                      <button onClick={saveNote} className="btn-primary px-3 py-1.5 text-sm">
                        <Save className="h-4 w-4 mr-1" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-[color:var(--color-text-strong)]">{note.title}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => startEditing(note)} className="btn-ghost p-1.5 text-[color:var(--color-text-muted)]" aria-label="Edit note">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteNote(note.id, note.title)} className="btn-ghost p-1.5 text-[color:var(--color-danger)]" aria-label="Delete note">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 mb-4">
                      {note.items && note.items.map(item => (
                        <div key={item.id} className="flex items-start gap-2 group">
                          {item.type === 'task' ? (
                            <button 
                              onClick={() => toggleStatusDirect(note.id, item.id)}
                              className="mt-0.5 flex-shrink-0 focus:outline-none"
                            >
                              {item.completed ? (
                                <Check className="h-4 w-4 text-[color:var(--color-success)]" />
                              ) : (
                                <div className="h-4 w-4 rounded-[4px] border-2 cursor-pointer" style={{ borderColor: 'var(--color-border)' }} />
                              )}
                            </button>
                          ) : (
                            <span className="mt-[-2px] flex-shrink-0 text-xl font-bold text-[color:var(--color-text-muted)]">•</span>
                          )}
                          <span 
                            className="text-[15px] leading-relaxed break-words whitespace-pre-wrap flex-1"
                            style={{ 
                              color: item.type === 'task' && item.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
                              textDecoration: item.type === 'task' && item.completed ? 'line-through' : 'none'
                            }}
                          >
                            {item.content}
                          </span>
                        </div>
                      ))}
                      {(!note.items || note.items.length === 0) && (
                        <p className="text-sm text-[color:var(--color-text-muted)] italic">Empty note</p>
                      )}
                    </div>
                    
                    <div className="mt-auto text-xs text-[color:var(--color-text-muted)] pt-3 border-t flex justify-between" style={{ borderColor: 'var(--color-divider)' }}>
                      <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}