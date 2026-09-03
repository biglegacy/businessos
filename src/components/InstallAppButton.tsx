/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Check, Download } from 'lucide-react';

interface InstallAppButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'badge' | 'sidebar';
}

export function InstallAppButton({ className = '', variant = 'primary' }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });

  useEffect(() => {
    // Check if prompt was caught globally
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    };

    const handlePwaInstallable = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-installable', handlePwaInstallable);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (evt: MediaQueryListEvent) => {
      if (evt.matches) setIsInstalled(true);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-installable', handlePwaInstallable);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          setIsInstalled(true);
        }
      } catch (err) {
        console.warn('Native PWA install prompt error:', err);
      }
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    } else {
      // Direct native prompt simulation / standalone mark
      setIsInstalled(true);
    }
  };

  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <div className={`p-3 bg-emerald-900/40 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-extrabold ${className}`}>
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>✓ App Installed</span>
        </div>
      );
    }
    return (
      <button
        disabled
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold cursor-default opacity-90 ${className}`}
      >
        <Check className="h-4 w-4 text-emerald-600" />
        <span>✓ App Installed</span>
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        id="btn-sidebar-pwa-install"
        onClick={handleInstallClick}
        className={`w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-2 shadow border border-emerald-400/30 ${className}`}
      >
        <Smartphone className="h-4 w-4 text-emerald-100" />
        <span>📲 Install App</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      id="btn-pwa-install"
      onClick={handleInstallClick}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer border border-emerald-500 ${className}`}
    >
      <span className="text-sm">📲</span>
      <span>Install App</span>
    </button>
  );
}
