/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import type { Notification, Business, User } from '../types';
import { 
  Bell, X, CreditCard, AlertTriangle, Shield, ShoppingCart, 
  Package, Flame, Users, CheckCheck, Trash2, Zap, Clock, Info, CheckCircle2, RefreshCw
} from 'lucide-react';

interface PopupNotificationInterfaceProps {
  business: Business | null;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tabName: string) => void;
  onPayNow?: () => Promise<void> | void;
}

export function PopupNotificationInterface({
  business,
  user,
  isOpen,
  onClose,
  onNavigateTab,
  onPayNow
}: PopupNotificationInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'subscription' | 'system'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Touch Swipe-to-dismiss state for mobile
  const [translateY, setTranslateY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartY = React.useRef<number>(0);
  const currentY = React.useRef<number>(0);

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
    if (translateY > 90) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

  const businessId = business?.id || 'global';

  const [notifications, setNotifications] = useState<Notification[]>(() => 
    db.getNotifications(businessId)
  );

  const refreshNotifs = () => {
    setNotifications(db.getNotifications(businessId));
  };

  useEffect(() => {
    if (isOpen) {
      refreshNotifs();
    }

    const handlePushEvent = () => refreshNotifs();
    window.addEventListener('bos-push-notification', handlePushEvent);
    return () => window.removeEventListener('bos-push-notification', handlePushEvent);
  }, [isOpen, businessId]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => n.readStatus === 'unread').length;

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, readStatus: 'read' as const }));
    setNotifications(updated);
    updated.forEach(n => db.saveNotification(n));
  };

  const handleMarkSingleRead = (id: string) => {
    const target = notifications.find(n => n.notificationId === id);
    if (!target) return;
    const updated = { ...target, readStatus: 'read' as const };
    db.saveNotification(updated);
    setNotifications(prev => prev.map(n => n.notificationId === id ? updated : n));
  };

  const handleDeleteSingle = (id: string) => {
    db.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.notificationId !== id));
  };

  const handleClearAll = () => {
    if (confirm('Clear all notifications in this list?')) {
      db.clearAllNotifications(businessId);
      setNotifications([]);
    }
  };

  const handlePayNowTrigger = async (notifId?: string) => {
    if (!onPayNow) return;
    setIsProcessing(true);
    setPaymentError(null);
    try {
      await onPayNow();
      if (notifId) {
        handleMarkSingleRead(notifId);
      }
    } catch (err: any) {
      console.error('Pay Now Error in notification interface:', err);
      setPaymentError(err.message || 'Payment execution failed. Please verify your Pay Now API settings.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActionClick = (notif: Notification) => {
    handleMarkSingleRead(notif.notificationId);

    if ((notif.type === 'subscription' || notif.actionType === 'payment') && onPayNow) {
      handlePayNowTrigger(notif.notificationId);
    } else if (notif.actionType === 'inventory' && onNavigateTab) {
      onClose();
      onNavigateTab('Inventory');
    } else if (notif.actionType === 'order' && onNavigateTab) {
      onClose();
      if (business?.category === 'Fast Food' || business?.category === 'Restaurant') {
        onNavigateTab('Kitchen Display');
      } else {
        onNavigateTab('POS');
      }
    }
  };

  // Filter logic
  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'subscription') {
      return n.type === 'subscription';
    }
    if (activeTab === 'system') {
      return n.type === 'system' || n.type === 'emergency' || n.type === 'maintenance' || n.type === 'sales' || n.type === 'inventory' || n.type === 'kitchen' || n.type === 'staff';
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Check if account is in active subscription reminder window
  const expiryDateStr = business?.nextPaymentDate || business?.subscriptionCycleEndDate || business?.trialEndDate;
  let isInSubReminderPeriod = false;
  let latestSubNotif = notifications.find(n => n.type === 'subscription');

  if (expiryDateStr) {
    const diffMs = new Date(expiryDateStr).getTime() - new Date().getTime();
    const daysUntilExpiry = diffMs / (1000 * 60 * 60 * 24);
    if (daysUntilExpiry <= 2.0 && daysUntilExpiry >= -31.0) {
      isInSubReminderPeriod = true;
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sales': return <ShoppingCart className="h-4 w-4 text-emerald-600" />;
      case 'inventory': return <Package className="h-4 w-4 text-amber-600" />;
      case 'kitchen': return <Flame className="h-4 w-4 text-rose-600" />;
      case 'staff': return <Users className="h-4 w-4 text-indigo-600" />;
      case 'subscription': return <CreditCard className="h-4 w-4 text-[#064E3B]" />;
      case 'emergency': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'system':
      case 'maintenance': return <Shield className="h-4 w-4 text-blue-600" />;
      default: return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const opacity = Math.max(0.2, 1 - translateY / 300);

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex sm:items-center items-end justify-center sm:p-4 p-0 transition-opacity duration-200"
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
        className="bg-white rounded-t-[2.5rem] sm:rounded-3xl border border-slate-200/90 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 select-none"
      >
        
        {/* Modal Header - Modern Light Theme */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 text-slate-900 flex flex-col shrink-0">
          {/* Mobile Swipe Handle Indicator */}
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden shrink-0 cursor-grab" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-[#064E3B] flex items-center justify-center border border-emerald-100 shadow-xs">
                <Bell className="h-5 w-5 text-[#064E3B]" />
              </div>
              <div>
                <h2 className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-2xs">
                      {unreadCount} New
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 font-medium">System alerts &amp; subscription reminders</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Close Notifications"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Light Theme */}
        <div className="bg-slate-50/80 p-2.5 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0 overflow-x-auto text-xs font-bold">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Messages
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition ${
                activeTab === 'system' ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              System Messages
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 ${
                activeTab === 'subscription' ? 'bg-[#064E3B] text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" /> Subscription
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] shrink-0 pr-1">
            <button
              onClick={handleMarkAllRead}
              className="text-slate-500 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark Read
            </button>
            <button
              onClick={handleClearAll}
              className="text-slate-400 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* Subscription Reminder Banner in Allowed Period */}
        {isInSubReminderPeriod && (activeTab === 'all' || activeTab === 'subscription') && (
          <div className="p-4 bg-emerald-50/80 border-b border-emerald-100 shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-white rounded-2xl border border-emerald-200 text-[#064E3B] shadow-xs shrink-0 mt-0.5">
                  <CreditCard className="h-5 w-5 text-[#064E3B]" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm tracking-tight text-slate-900">Subscription Reminder</h3>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 font-black text-[9px] rounded-full uppercase">
                      {business?.subscriptionStatus === 'trial' ? 'Trial Period' : 'Renewal Due'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {latestSubNotif?.message || 'Renew your BusinessOS subscription to continue using all platform features.'}
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-700">
                    <div>Amount: <span className="text-[#064E3B] font-black">{business?.subscriptionAmount || 300}.00 {business?.currency || 'GHC'}</span></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                <button
                  disabled={isProcessing}
                  onClick={() => handlePayNowTrigger(latestSubNotif?.notificationId)}
                  className="w-full sm:w-auto px-4 py-2 bg-[#064E3B] hover:bg-[#032e23] disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-xs cursor-pointer transition uppercase tracking-wide flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-300" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Pay Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {paymentError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredNotifs.map(notif => (
            <div 
              key={notif.notificationId}
              className={`p-4 rounded-2xl transition flex items-start gap-3.5 relative ${
                notif.readStatus === 'unread' 
                  ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border border-emerald-100/90' 
                  : 'bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 shadow-2xs shrink-0 mt-0.5">
                {getTypeIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold text-slate-900 truncate">{notif.title}</h4>
                  <span className="text-[10px] text-slate-400 shrink-0 font-semibold">{formatTimeAgo(notif.createdAt)}</span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words font-medium">{notif.message}</p>

                {/* Actions */}
                <div className="mt-2.5 flex items-center gap-2">
                  {notif.type === 'subscription' || notif.actionType === 'payment' ? (
                    <button
                      disabled={isProcessing}
                      onClick={() => handlePayNowTrigger(notif.notificationId)}
                      className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#032e23] disabled:opacity-50 text-white rounded-xl text-[10px] font-extrabold shadow-xs cursor-pointer transition flex items-center gap-1 uppercase tracking-wider"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin text-emerald-300" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3 w-3 text-emerald-300" />
                          <span>Pay Now</span>
                        </>
                      )}
                    </button>
                  ) : notif.actionType && notif.actionType !== 'info' ? (
                    <button
                      onClick={() => handleActionClick(notif)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-bold shadow-xs cursor-pointer transition flex items-center gap-1"
                    >
                      <Zap className="h-3 w-3 text-amber-300" />
                      {notif.actionType === 'inventory' ? 'View Inventory' : 'View Details'}
                    </button>
                  ) : null}

                  {notif.readStatus === 'unread' && (
                    <button
                      onClick={() => handleMarkSingleRead(notif.notificationId)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDeleteSingle(notif.notificationId)}
                className="absolute top-4 right-3 text-slate-300 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                title="Delete notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Empty Notification State */}
          {filteredNotifs.length === 0 && (
            <div className="py-16 px-4 text-center text-slate-400 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 border border-slate-200/60">
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-extrabold text-slate-800">No new notifications</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed font-medium">
                You're all caught up! No active notifications found.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[10px] font-semibold text-slate-400">BusinessOS Push Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
