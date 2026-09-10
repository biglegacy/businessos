/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Business, BusinessPopupPrompt } from '../types';
import { Sparkles, X, ArrowRight, CheckCircle2, AlertCircle, Bell, Info, Shield, Zap } from 'lucide-react';

interface RegistrationPopupModalProps {
  business: Business | null;
  onNavigateTab?: (tabName: string) => void;
}

export function RegistrationPopupModal({ business, onNavigateTab }: RegistrationPopupModalProps) {
  const [activePrompt, setActivePrompt] = useState<BusinessPopupPrompt | null>(null);
  const [daysSinceReg, setDaysSinceReg] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!business || !business.id) return;

    let isMounted = true;

    const checkEligibility = async () => {
      try {
        const res = await db.getEligibleBusinessPopups(business.id);
        if (!isMounted || !res.success || !res.eligiblePrompts || res.eligiblePrompts.length === 0) {
          return;
        }

        setDaysSinceReg(res.daysSinceRegistration);

        // Find the highest-priority eligible prompt that hasn't been dismissed
        for (const prompt of res.eligiblePrompts) {
          const sessionDismissKey = `bos_popup_dismissed_session_${prompt.id}`;
          const permanentDismissKey = `bos_popup_dismissed_perm_${prompt.id}`;

          // Check dismissal states
          const isSessionDismissed = sessionStorage.getItem(sessionDismissKey) === 'true';
          const isPermDismissed = localStorage.getItem(permanentDismissKey) === 'true';

          if (isPermDismissed) continue;
          if (!prompt.allowRepeatDisplay && isSessionDismissed) continue;

          // Found eligible prompt to show
          setActivePrompt(prompt);
          setIsVisible(true);
          break;
        }
      } catch (err) {
        console.warn('Error evaluating registration popup eligibility:', err);
      }
    };

    // Check after slight delay on load to allow dashboard to mount smoothly
    const timer = setTimeout(checkEligibility, 1200);

    // Listen for custom trigger if admin tests popup
    const handleManualTrigger = (e: any) => {
      if (e.detail?.prompt) {
        setActivePrompt(e.detail.prompt);
        setIsVisible(true);
      }
    };
    window.addEventListener('bos-trigger-popup-preview', handleManualTrigger);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.removeEventListener('bos-trigger-popup-preview', handleManualTrigger);
    };
  }, [business?.id, business?.registrationDate]);

  if (!isVisible || !activePrompt) return null;

  const handleDismiss = () => {
    if (activePrompt) {
      if (activePrompt.allowRepeatDisplay) {
        sessionStorage.setItem(`bos_popup_dismissed_session_${activePrompt.id}`, 'true');
      } else {
        localStorage.setItem(`bos_popup_dismissed_perm_${activePrompt.id}`, 'true');
        sessionStorage.setItem(`bos_popup_dismissed_session_${activePrompt.id}`, 'true');
      }
    }
    setIsVisible(false);
  };

  const handleAction = () => {
    if (activePrompt?.actionUrlOrTab && onNavigateTab) {
      onNavigateTab(activePrompt.actionUrlOrTab);
    }
    handleDismiss();
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'subscription':
        return <Zap className="h-5 w-5 text-amber-500" />;
      case 'promotional':
        return <Sparkles className="h-5 w-5 text-emerald-500" />;
      case 'announcement':
        return <Bell className="h-5 w-5 text-indigo-500" />;
      case 'instructional':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transition-all transform scale-100 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Close popup"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              {getCategoryIcon(activePrompt.category)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                  BusinessOS Notice
                </span>
                {daysSinceReg > 0 && (
                  <span className="text-[11px] text-slate-300 font-medium">
                    Day {daysSinceReg} of Registration
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white mt-1 leading-snug">
                {activePrompt.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Message Body */}
        <div className="p-6 sm:p-8 space-y-4 overflow-y-auto">
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-normal">
            {activePrompt.message}
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800">Verified Platform Notification</p>
              <p className="text-slate-500 text-[11px]">Authorized by BusinessOS Super Administration</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            Dismiss
          </button>

          {activePrompt.actionButtonText && (
            <button
              type="button"
              onClick={handleAction}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>{activePrompt.actionButtonText}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
