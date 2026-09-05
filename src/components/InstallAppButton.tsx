/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Check, Download, Loader2, Info, X, Share, PlusSquare } from 'lucide-react';

interface InstallAppButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'badge' | 'sidebar';
}

export function InstallAppButton({ className = '', variant = 'primary' }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  // Check if currently running in standalone PWA mode
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      localStorage.getItem('bos_pwa_installed') === 'true'
    );
  });

  // Check browser capabilities
  const isPwaSupported = typeof window !== 'undefined' && ('serviceWorker' in navigator);
  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || ((navigator as any).maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)));

  useEffect(() => {
    // 1. Recover prompt if already captured on window
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser's default mini-infobar on mobile
      e.preventDefault();
      // Store event for custom button trigger
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstalling(false);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      try {
        localStorage.setItem('bos_pwa_installed', 'true');
      } catch (e) {}
    };

    const handlePwaInstallable = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-installable', handlePwaInstallable);

    // Dynamic media query listener for standalone mode change
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (evt: MediaQueryListEvent) => {
      if (evt.matches) {
        setIsInstalled(true);
        try {
          localStorage.setItem('bos_pwa_installed', 'true');
        } catch (e) {}
      }
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

    if (promptEvent && typeof promptEvent.prompt === 'function') {
      setIsInstalling(true);
      try {
        // Show native install prompt
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          try {
            localStorage.setItem('bos_pwa_installed', 'true');
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Native PWA install prompt error:', err);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
      }
    } else {
      // Prompt not directly available (e.g. iOS Safari, manual browser install)
      setShowInstructionsModal(true);
    }
  };

  // State: App is already installed and running
  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <div id="pwa-status-installed" className={`p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs font-bold ${className}`}>
          <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Check className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-emerald-400 font-extrabold uppercase tracking-wider">PWA Mode</span>
            <span className="text-xs text-white">App Installed</span>
          </div>
        </div>
      );
    }

    return (
      <div id="pwa-status-installed" className={`inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold ${className}`}>
        <Check className="h-4 w-4 text-emerald-600" />
        <span>App Installed</span>
      </div>
    );
  }

  // State: Currently installing
  if (isInstalling) {
    if (variant === 'sidebar') {
      return (
        <button
          disabled
          className={`w-full py-2.5 px-4 bg-emerald-800/80 text-emerald-200 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 border border-emerald-600/40 cursor-wait ${className}`}
        >
          <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
          <span>Installing…</span>
        </button>
      );
    }

    return (
      <button
        disabled
        className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold opacity-90 cursor-wait ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Installing…</span>
      </button>
    );
  }

  // Determine if install is available via prompt or manual browser instructions
  const isPromptAvailable = Boolean(deferredPrompt || (window as any).deferredPrompt);

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          id="btn-sidebar-pwa-install"
          onClick={handleInstallClick}
          className={`w-full py-2.5 px-4 font-bold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-2 shadow-sm ${
            isPromptAvailable
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40'
              : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-500/20'
          } ${className}`}
          title={isPromptAvailable ? 'Install BusinessOS App' : 'Add BusinessOS to Home Screen'}
        >
          {isPromptAvailable ? (
            <>
              <Download className="h-4 w-4 text-emerald-200" />
              <span>Install App</span>
            </>
          ) : (
            <>
              <Smartphone className="h-4 w-4 text-emerald-300" />
              <span>Install App</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          id="btn-pwa-install"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-2 px-4 py-2 font-bold rounded-xl text-xs shadow-sm transition cursor-pointer ${
            isPromptAvailable
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-500'
              : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
          } ${className}`}
          title={isPromptAvailable ? 'Install BusinessOS as a standalone PWA' : 'How to install BusinessOS'}
        >
          {isPromptAvailable ? (
            <>
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </>
          ) : (
            <>
              <Smartphone className="h-3.5 w-3.5 text-emerald-700" />
              <span>Install App</span>
            </>
          )}
        </button>
      )}

      {/* Manual Installation Instructions Modal (for iOS Safari, Firefox, or unprompted desktop) */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Install BusinessOS App</h3>
                  <p className="text-xs text-emerald-700 font-semibold">Native PWA Experience</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <p className="font-medium text-slate-600">
                BusinessOS can be installed as a standalone application on your device for lightning-fast access, offline storage, and full-screen experience.
              </p>

              {isIOS ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5 text-[13px]">
                    <Share className="h-4 w-4 text-emerald-700" /> On Apple iPhone / iPad:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-emerald-900 font-medium">
                    <li>Tap the <strong>Share button</strong> in Safari's bottom toolbar (<span className="inline-block px-1.5 py-0.5 bg-emerald-200/60 rounded text-[11px] font-bold">📤</span>).</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong> (<span className="inline-block px-1.5 py-0.5 bg-emerald-200/60 rounded text-[11px] font-bold"><PlusSquare className="inline h-3 w-3" /> Add</span>).</li>
                    <li>Tap <strong>Add</strong> in the top-right corner to install.</li>
                  </ol>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5 text-[13px]">
                    <Download className="h-4 w-4 text-emerald-700" /> On Android &amp; Chrome / Edge:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-emerald-900 font-medium">
                    <li>Look for the <strong>Install App icon (⊕)</strong> on the right side of the address bar.</li>
                    <li>Or click the browser menu (<strong>⋮</strong>), then choose <strong>&ldquo;Install BusinessOS&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.</li>
                    <li>Confirm installation when prompted. The app will launch in standalone window mode.</li>
                  </ol>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-start gap-2 text-slate-600 text-[11px]">
                <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Once installed, BusinessOS will run independently without browser address bars and support offline sync.</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
