/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X, Smartphone, Check, Copy, ExternalLink, ArrowDown, Sparkles } from 'lucide-react';

interface IOSAddToHomeScreenOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
  autoPrompt?: boolean;
}

export function IOSAddToHomeScreenOverlay({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  autoPrompt = true
}: IOSAddToHomeScreenOverlayProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isIPad, setIsIPad] = useState(false);

  // Standalone detection (PWA is already running as installed app)
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as any).standalone === true
  );

  // Detect iOS (iPhone, iPad, iPod, or iPadOS with multi-touch)
  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    ((navigator as any).maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
  );

  const isVisible = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleDismissPermanently = () => {
    try {
      localStorage.setItem('bos_ios_install_overlay_dismissed', 'true');
    } catch {
      // Ignored if storage restricted
    }
    handleClose();
  };

  // Inspect environment on mount & register global event listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iPad vs iPhone
    const userAgent = navigator.userAgent.toLowerCase();
    const isPad = /ipad/.test(userAgent) || ((navigator as any).maxTouchPoints > 1 && /macintosh/.test(userAgent));
    setIsIPad(isPad);

    // Detect common in-app webviews (Instagram, Facebook, TikTok, Line, LinkedIn, Twitter/X)
    const isAppWebview = /fban|fbav|instagram|tiktok|linkedin|line|snapchat|pinterest|micromessenger/i.test(userAgent);
    setIsInAppBrowser(isAppWebview);

    // Global listener so any component (e.g. InstallAppButton) can trigger the overlay
    const handleOpenOverlay = () => {
      setInternalIsOpen(true);
    };

    window.addEventListener('open-ios-install-overlay', handleOpenOverlay);

    // Auto-prompt on iOS Safari if not already installed and not dismissed
    if (autoPrompt && isIOS && !isStandalone && controlledIsOpen === undefined) {
      try {
        const dismissed = localStorage.getItem('bos_ios_install_overlay_dismissed');
        if (!dismissed) {
          // Present after a short organic delay to not interrupt initial render
          const timer = setTimeout(() => {
            setInternalIsOpen(true);
          }, 2500);
          return () => {
            clearTimeout(timer);
            window.removeEventListener('open-ios-install-overlay', handleOpenOverlay);
          };
        }
      } catch {
        // storage access exception
      }
    }

    return () => {
      window.removeEventListener('open-ios-install-overlay', handleOpenOverlay);
    };
  }, [autoPrompt, isIOS, isStandalone, controlledIsOpen]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = window.location.href;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn('Failed to copy link', err);
    }
  };

  const handleTriggerNativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'BusinessOS',
          text: 'Install BusinessOS to your Home Screen',
          url: window.location.href
        });
      } catch {
        // User closed the share sheet
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      id="ios-add-to-homescreen-overlay"
      className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
    >
      <div 
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-6 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-[#064E3B] px-5 py-4 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 p-1.5 border border-white/20 shadow-inner flex items-center justify-center shrink-0">
                <img 
                  src="/apple-touch-icon.png" 
                  alt="BusinessOS" 
                  className="w-full h-full rounded-xl object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 id="ios-install-title" className="font-extrabold text-base tracking-tight text-white leading-tight">
                    Add to Home Screen
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-400 text-emerald-950">
                    iOS Web App
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200 font-medium leading-snug mt-0.5">
                  Install BusinessOS as a native standalone app
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              aria-label="Close installation instructions"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-700 text-xs leading-relaxed">
          {/* In-app Browser Notice */}
          {isInAppBrowser && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <ExternalLink className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-semibold text-amber-900 text-[11px]">
                  You are viewing inside an in-app browser. Tap the menu (•••) and select <strong>Open in Safari</strong> to enable Home Screen installation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition self-start cursor-pointer"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Link Copied! Open Safari' : 'Copy App Link'}</span>
              </button>
            </div>
          )}

          {/* Value proposition pill */}
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl text-[11px] text-emerald-900">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Enables instant launching, full-screen view without URL bars, and offline cache.</span>
          </div>

          {/* 3 Step Interactive Visual Instructions */}
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Share className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs">Step 1: Tap Safari Share</h4>
                  <span className="text-[10px] text-slate-400 font-medium">Toolbar</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {isIPad 
                    ? "Tap the Share icon in the top-right toolbar of Safari." 
                    : "Tap the Share icon (square with upward arrow) in the bottom toolbar of Safari."}
                </p>

                {/* Direct Share Trigger Button */}
                {typeof navigator !== 'undefined' && (navigator as any).share && (
                  <button
                    type="button"
                    onClick={handleTriggerNativeShare}
                    className="mt-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                  >
                    <Share className="h-3.5 w-3.5" />
                    <span>Open Safari Share Sheet Now</span>
                  </button>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <PlusSquare className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs">Step 2: Add to Home Screen</h4>
                  <span className="text-[10px] text-slate-400 font-medium">Action</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Scroll down the share sheet actions and tap <strong className="text-slate-800">"Add to Home Screen"</strong> (indicated by a plus icon in a square).
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm font-black text-xs">
                3
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs">Step 3: Confirm 'Add'</h4>
                  <span className="text-[10px] text-blue-600 font-bold">Top Right</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Tap <strong className="text-blue-600 font-bold">"Add"</strong> in the top-right corner of the confirmation dialog to place BusinessOS on your Home Screen.
                </p>
              </div>
            </div>
          </div>

          {/* Toolbar Position Indicator Callout for iPhone */}
          {!isIPad && (
            <div className="text-center py-1 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 animate-bounce">
              <span>Look at Safari's bottom toolbar</span>
              <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleDismissPermanently}
            className="w-full sm:w-auto text-center px-3 py-2 text-[11px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer transition"
          >
            Don't show again
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#064E3B] hover:bg-[#053d2e] text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer active:scale-98 text-center"
          >
            Got it, I'll install
          </button>
        </div>
      </div>
    </div>
  );
}
