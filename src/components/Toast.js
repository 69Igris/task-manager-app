'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

const TONE = {
  success: { icon: CheckCircle2, color: '#0a7d3a', bg: 'rgba(10, 125, 58, 0.08)', border: 'rgba(10, 125, 58, 0.35)' },
  error:   { icon: XCircle,      color: 'var(--color-danger)', bg: 'rgba(200, 27, 58, 0.08)', border: 'rgba(200, 27, 58, 0.35)' },
  warning: { icon: AlertTriangle,color: '#a86400', bg: 'rgba(168, 100, 0, 0.08)', border: 'rgba(168, 100, 0, 0.35)' },
  info:    { icon: Info,         color: 'var(--color-accent)', bg: 'rgba(0, 112, 204, 0.08)', border: 'rgba(0, 112, 204, 0.35)' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const showToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${idCounter.current++}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] space-y-2 pointer-events-none">
        {toasts.map((toast) => {
          const tone = TONE[toast.type] || TONE.info;
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              className="animate-slide-up flex items-start gap-3 px-4 py-3 min-w-[280px] max-w-sm pointer-events-auto"
              style={{
                background: '#ffffff',
                border: `1px solid ${tone.border}`,
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-3)',
              }}
              role="status"
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: tone.color }} />
              <span className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
