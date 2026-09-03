/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { CreditCard, RefreshCw, AlertTriangle, X, Clock, Calendar, ShieldAlert } from 'lucide-react';
import type { Notification, Business } from '../types';

interface SubscriptionReminderModalProps {
  notification: Notification;
  business?: Business | null;
  isProcessing: boolean;
  errorMessage?: string | null;
  onPayNow: () => Promise<void> | void;
  onLater: () => void;
}

export function SubscriptionReminderModal({
  notification,
  business,
  isProcessing,
  errorMessage,
  onPayNow,
  onLater
}: SubscriptionReminderModalProps) {
  // Mobile swipe-to-dismiss state
  const [translateY, setTranslateY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartY = useRef<number>(0);
  const currentY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - touchStartY.current;
    if (diff > 0) {
      setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (translateY > 85) {
      onLater();
    } else {
      setTranslateY(0);
    }
  };

  // Calculate days remaining or days past expiry
  const expiryDateStr = business?.nextPaymentDate || business?.subscriptionCycleEndDate || business?.trialEndDate;
  let remainingText = '';
  let expiryFormatted = '';
  let isExpired = false;

  if (expiryDateStr) {
    const expiryDate = new Date(expiryDateStr);
    expiryFormatted = expiryDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const diffMs = expiryDate.getTime() - new Date().getTime();
    const daysUntilExpiry = diffMs / (1000 * 60 * 60 * 24);

    if (daysUntilExpiry > 1) {
      remainingText = `${Math.ceil(daysUntilExpiry)} Days Remaining`;
    } else if (daysUntilExpiry > 0) {
      remainingText = '1 Day Remaining';
    } else if (daysUntilExpiry >= -1) {
      remainingText = 'Expires Today';
      isExpired = true;
    } else {
      isExpired = true;
      const daysPast = Math.abs(Math.floor(daysUntilExpiry));
      remainingText = `${daysPast} Day(s) Expired`;
    }
  }

  const amountToPay = business?.subscriptionAmount || 300;
  const currency = business?.currency || 'GHC';

  const opacity = Math.max(0.2, 1 - translateY / 280);

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4 transition-opacity duration-200"
      style={{ opacity: isSwiping ? opacity : 1 }}
    >
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease'
        }}
        className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 select-none relative"
      >
        {/* Mobile Swipe Handle Indicator */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto -mt-2 mb-1 cursor-grab sm:hidden" />

        {/* Close Button Top Right */}
        <button
          onClick={onLater}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
          title="Remind Me Later"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon & Title Header */}
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${
            isExpired 
              ? 'bg-rose-50 text-rose-600 border-rose-200' 
              : 'bg-emerald-50 text-[#064E3B] border-emerald-200'
          }`}>
            {isExpired ? <ShieldAlert className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}
          </div>

          <div className="space-y-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {notification.message || 'Renew your BusinessOS subscription to continue accessing all features.'}
            </p>
          </div>
        </div>

        {/* Details Grid - Modern Light Box */}
        <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Subscription Status:
            </span>
            <span className={`font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full border ${
              isExpired 
                ? 'bg-rose-100 text-rose-800 border-rose-200' 
                : 'bg-amber-100 text-amber-800 border-amber-200'
            }`}>
              {business?.subscriptionStatus === 'trial' ? 'Free Trial' : isExpired ? 'Renewal Overdue' : 'Expiring Soon'}
            </span>
          </div>

          {remainingText && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Remaining Period:</span>
              <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}>
                {remainingText}
              </span>
            </div>
          )}

          {expiryFormatted && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Expiry Date:
              </span>
              <span className="font-bold text-slate-800">{expiryFormatted}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 text-sm">
            <span className="font-extrabold text-slate-900">Payment Amount:</span>
            <span className="font-black text-[#064E3B] text-base">
              {amountToPay}.00 {currency}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            id="btn-reminder-pay"
            disabled={isProcessing}
            onClick={onPayNow}
            className="w-full py-3 bg-[#064E3B] hover:bg-[#032e23] disabled:opacity-50 text-white font-black rounded-xl shadow-md hover:shadow-lg transition cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-300" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 text-emerald-300" />
                <span>Pay Now</span>
              </>
            )}
          </button>

          <button
            id="btn-reminder-later"
            disabled={isProcessing}
            onClick={onLater}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs uppercase tracking-wider active:scale-98"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}
