'use client';

import { createContext, useContext, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
  });

  const showConfirm = ({
    title = 'Confirm action',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          if (onConfirm) onConfirm();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          if (onCancel) onCancel();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  const isDanger = confirmState.type === 'danger';
  const accentColor = isDanger ? 'var(--color-urgent)' : '#a86400';
  const accentBg = isDanger ? 'rgba(213, 59, 0, 0.08)' : 'rgba(168, 100, 0, 0.08)';

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {confirmState.isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4 animate-fade-in"
          style={{ background: 'rgba(0, 0, 0, 0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) confirmState.onCancel();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md animate-slide-up"
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 p-6">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: accentBg }}
              >
                <AlertTriangle className="h-5 w-5" style={{ color: accentColor }} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-[17px] font-medium" style={{ color: 'var(--color-text-strong)' }}>
                  {confirmState.title}
                </h3>
                {confirmState.message && (
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {confirmState.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmState.onCancel();
                }}
                className="btn-ghost p-1.5 shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className="flex items-center justify-end gap-2 px-6 py-4 border-t"
              style={{ borderColor: 'var(--color-divider)', background: 'var(--color-bg-inset)' }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmState.onCancel();
                }}
                className="btn-secondary"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmState.onConfirm();
                }}
                className={isDanger ? 'btn-danger' : 'btn-primary'}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
  return context;
}
