'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Smartphone, X } from 'lucide-react';

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => console.log('Service Worker registered:', registration.scope))
          .catch((error) => console.error('Service Worker registration failed:', error));
      });
    }

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') return;
    if (pathname !== '/login') return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [pathname]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log('PWA installed');
    setDeferredPrompt(null);
    setShowInstallButton(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showInstallButton) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-96 animate-slide-up">
      <div
        className="p-4"
        style={{
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-3)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0, 112, 204, 0.08)' }}
          >
            <Smartphone className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-strong)' }}>
              Install task manager
            </h3>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Add to your home screen for quicker access and a smoother experience.
            </p>
            <div className="flex gap-2 mt-3">
              <button onClick={handleInstallClick} className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}>
                Install
              </button>
              <button onClick={handleDismiss} className="btn-ghost" style={{ padding: '7px 12px', fontSize: 13 }}>
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="btn-ghost p-1 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
