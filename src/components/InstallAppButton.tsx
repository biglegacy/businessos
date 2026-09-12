/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Check, Download, Loader2, Info, X, Share, PlusSquare, Copy } from 'lucide-react';

interface InstallAppButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'badge' | 'sidebar';
}

export function InstallAppButton({ className = '', variant = 'primary' }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Accurate standalone check (never falsely permanently locked by localStorage)
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (navigator as any).standalone === true
    );
  });

  // Check browser & iOS capabilities
  const isPwaSupported = typeof window !== 'undefined' && ('serviceWorker' in navigator);
  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    ((navigator as any).maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
  );

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

  const triggerNativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'BusinessOS',
          text: 'Install BusinessOS to your Home Screen',
          url: window.location.href
        });
      } catch (err) {
        // Ignored if user cancelled sheet
      }
    }
  };

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;

    if (promptEvent && typeof promptEvent.prompt === 'function') {
      setIsInstalling(true);
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
      } catch (err) {
        console.warn('Native PWA install prompt error:', err);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
      }
    } else if (isIOS) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-ios-install-overlay'));
      }
      triggerNativeShare();
    } else {
      setShowInstructionsModal(true);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {}
  };

  // State: App is currently running in standalone PWA mode
  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <div id="pwa-status-installed" className={`p-2.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold ${className}`}>
          <div className="h-5 w-5 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Check className="h-3 w-3" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">PWA Mode</span>
            <span className="text-[11px] text-white">Standalone Active</span>
          </div>
        </div>
      );
    }

    if (variant === 'badge') {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold ${className}`}>
          <Check className="h-3 w-3 text-emerald-600" />
          <span>Installed</span>
        </span>
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
        className={`inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold opacity-90 cursor-wait ${className}`}
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
          title={isIOS ? 'Install BusinessOS for iOS' : (isPromptAvailable ? 'Install BusinessOS App' : 'Add BusinessOS to Home Screen')}
        >
          {isPromptAvailable ? (
            <>
              <Download className="h-4 w-4 text-emerald-200" />
              <span>Install App</span>
            </>
          ) : (
            <>
              <Smartphone className="h-4 w-4 text-emerald-300" />
              <span>{isIOS ? 'Install for iOS' : 'Install App'}</span>
            </>
          )}
        </button>
      ) : variant === 'badge' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#064E3B] border border-emerald-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${className}`}
          title={isIOS ? 'Install BusinessOS for iOS' : 'Install App'}
        >
          <Smartphone className="h-3.5 w-3.5 text-emerald-700" />
          <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
        </button>
      ) : (
        <button
          type="button"
          id="btn-pwa-install"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-2 px-3.5 py-2 font-bold rounded-xl text-xs shadow-xs transition cursor-pointer ${
            isPromptAvailable
              ? 'bg-[#064E3B] hover:bg-[#053d2e] text-white border border-emerald-600'
              : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
          } ${className}`}
          title={isIOS ? 'Install BusinessOS for iPhone/iPad' : (isPromptAvailable ? 'Install BusinessOS as a standalone PWA' : 'How to install BusinessOS')}
        >
          {isPromptAvailable ? (
            <>
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </>
          ) : (
            <>
              <Smartphone className="h-3.5 w-3.5 text-emerald-700" />
              <span>{isIOS ? 'Install for iOS' : 'Install App'}</span>
            </>
          )}
        </button>
      )}

      {/* Manual Installation Instructions Modal (Optimized for iOS Safari, Chrome on iOS, and Desktop) */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-2xl relative text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Install BusinessOS</h3>
                  <p className="text-xs text-emerald-700 font-semibold">{isIOS ? 'Apple iPhone & iPad PWA' : 'Standalone PWA App'}</p>
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

            <div className="space-y-3.5 text-xs text-slate-700">
              <p className="font-medium text-slate-600 leading-relaxed text-[11px]">
                BusinessOS is built as a complete Progressive Web App with offline local database sync, camera barcode scanner, and full-screen terminal POS mode.
              </p>

              {isIOS ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5">
                  {typeof navigator !== 'undefined' && (navigator as any).share && (
                    <button
                      type="button"
                      onClick={triggerNativeShare}
                      className="w-full py-2.5 px-3 bg-[#064E3B] hover:bg-[#053d2e] text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition cursor-pointer active:scale-98 mb-2"
                    >
                      <Share className="h-4 w-4 text-emerald-200" />
                      <span>Open iOS Share Sheet Now</span>
                    </button>
                  )}
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <Share className="h-4 w-4 text-emerald-700" /> 3 Steps on iPhone &amp; iPad:
                  </p>
                  <ol className="space-y-2 text-emerald-900 font-medium text-[11px]">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Tap the <strong>Share</strong> button in Safari&rsquo;s toolbar (<Share className="inline h-3.5 w-3.5 text-emerald-800" /> at bottom of screen).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Scroll down the menu and tap <strong>Add to Home Screen</strong> (<PlusSquare className="inline h-3.5 w-3.5 text-emerald-800" />).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Tap <strong>Add</strong> in the top-right corner to complete installation.</span>
                    </li>
                  </ol>

                  <div className="pt-2 border-t border-emerald-200/60 mt-2">
                    <p className="text-[10px] text-emerald-800 font-semibold mb-1.5">
                      Need to open in Safari from another browser or social app?
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full py-1.5 px-2 bg-white border border-emerald-300 rounded-xl font-bold text-emerald-800 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition text-[11px] cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Link Copied! Paste into Safari</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Copy App URL to Open in Safari</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <Download className="h-4 w-4 text-emerald-700" /> On Android &amp; Chrome / Edge:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-emerald-900 font-medium text-[11px]">
                    <li>Look for the <strong>Install App icon (⊕)</strong> on the right side of the address bar.</li>
                    <li>Or click the browser menu (<strong>⋮</strong>), then choose <strong>&ldquo;Install BusinessOS&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.</li>
                    <li>Confirm installation when prompted.</li>
                  </ol>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex items-start gap-2 text-slate-600 text-[11px]">
                <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Once launched from your Home Screen, BusinessOS opens full-screen without address bar clutter and runs offline.</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="px-5 py-2.5 bg-[#064E3B] hover:bg-[#053d2e] text-white font-bold rounded-xl text-xs transition cursor-pointer"
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

