'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      });
    }

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Only show on login page
    if (pathname !== '/login') {
      return;
    }

    // Check if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('📱 PWA install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ App is running in standalone mode');
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [pathname]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('✅ PWA installed successfully');
    }
    
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
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-indigo-600 text-white p-4 rounded-lg shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Install Task Manager</h3>
            <p className="text-sm text-indigo-100 mb-3">
              Install this app for quick access and a better experience
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-white text-indigo-600 px-4 py-2 rounded font-medium text-sm hover:bg-indigo-50 transition"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="text-white px-4 py-2 rounded font-medium text-sm hover:bg-indigo-700 transition"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
