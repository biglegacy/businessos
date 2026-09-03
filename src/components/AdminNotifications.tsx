/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import type { Business, NotificationLog, Notification } from '../types';
import { dispatchPushNotification, notifyAdminGlobalBroadcast } from '../lib/pushNotifications';
import { showSuccess, showError } from '../lib/toast';
import { 
  Send, Bell, Calendar, Clock, ShieldAlert, CheckCircle2, 
  Search, Filter, RefreshCw, AlertTriangle, Building2, 
  Trash2, FileText, Zap, Sparkles, Check, Globe
} from 'lucide-react';

interface AdminNotificationsProps {
  businesses: Business[];
}

export function AdminNotifications({ businesses }: AdminNotificationsProps) {
  const [selectedTarget, setSelectedTarget] = useState<string>('global'); // 'global' or businessId
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'system' | 'maintenance' | 'subscription' | 'emergency' | 'general'>('system');
  const [actionType, setActionType] = useState<'info' | 'payment' | 'url'>('info');
  const [actionUrl, setActionUrl] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');

  // Logs & Scheduled State
  const [logs, setLogs] = useState<NotificationLog[]>(() => db.getNotificationLogs());
  const [scheduledNotifs, setScheduledNotifs] = useState<Notification[]>(() => 
    db.getNotificationsRaw().filter(n => n.deliveryStatus === 'scheduled')
  );

  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('all');

  const refreshLogsAndScheduled = () => {
    setLogs(db.getNotificationLogs());
    setScheduledNotifs(db.getNotificationsRaw().filter(n => n.deliveryStatus === 'scheduled'));
  };

  const applyTemplate = (tpl: { title: string; message: string; category: 'system' | 'maintenance' | 'subscription' | 'emergency' | 'general'; actionType?: 'info' | 'payment' | 'url' }) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setCategory(tpl.category);
    if (tpl.actionType) setActionType(tpl.actionType);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showError('Validation Error', 'Please enter both notification title and message.');
      return;
    }

    try {
      const targetBusName = selectedTarget === 'global' ? 'All Businesses' : businesses.find(b => b.id === selectedTarget)?.name || selectedTarget;

      dispatchPushNotification({
        businessId: selectedTarget,
        type: category,
        title: title.trim(),
        message: message.trim(),
        actionType: actionType,
        actionUrl: actionUrl.trim() || undefined,
        senderName: 'Super Admin',
        scheduledFor: isScheduled && scheduledFor ? new Date(scheduledFor).toISOString() : undefined
      });

      if (isScheduled && scheduledFor) {
        showSuccess('Notification Scheduled', `Notification scheduled for ${new Date(scheduledFor).toLocaleString()} to ${targetBusName}`);
      } else {
        showSuccess('Notification Sent', `Push notification sent instantly to ${targetBusName}!`);
      }

      // Reset form
      setTitle('');
      setMessage('');
      setActionUrl('');
      setIsScheduled(false);
      setScheduledFor('');
      refreshLogsAndScheduled();
    } catch (err: any) {
      showError('Notification Error', err.message || 'Failed to dispatch notification');
    }
  };

  const handleCancelScheduled = (notifId: string) => {
    if (confirm('Cancel this scheduled notification?')) {
      db.deleteNotification(notifId);
      refreshLogsAndScheduled();
      showSuccess('Notification Cancelled', 'Scheduled notification cancelled.');
    }
  };

  const handleDispatchNow = (notif: Notification) => {
    const updated = { ...notif, deliveryStatus: 'delivered' as const, scheduledFor: undefined };
    db.saveNotification(updated);
    refreshLogsAndScheduled();
    showSuccess('Notification Sent', 'Notification dispatched immediately!');
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.title.toLowerCase().includes(logSearch.toLowerCase()) || 
                          log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
                          log.recipient.toLowerCase().includes(logSearch.toLowerCase());
    const matchesCategory = logFilter === 'all' || log.type === logFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shrink-0">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Super Admin Push Notification Center</h1>
            <p className="text-xs text-slate-300">
              Broadcast real-time push alerts, maintenance announcements, subscription reminders &amp; emergency updates across all businesses.
            </p>
          </div>
        </div>

        <button
          onClick={refreshLogsAndScheduled}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 backdrop-blur-xs transition cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" /> Refresh Logs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Broadcaster Tool Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-extrabold text-slate-900">Broadcast Push Notification</h2>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => applyTemplate({
                    title: '🔧 Scheduled System Maintenance',
                    message: 'BusinessOS will undergo a brief system optimization tonight between 02:00 UTC and 03:00 UTC.',
                    category: 'maintenance'
                  })}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition"
                >
                  Maintenance
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate({
                    title: '💳 Subscription Renewal Reminder',
                    message: 'Your BusinessOS plan renewal is approaching. Ensure your payment information is up to date.',
                    category: 'subscription',
                    actionType: 'payment'
                  })}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold cursor-pointer transition"
                >
                  Subscription
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate({
                    title: '🚀 New Platform Upgrade Available',
                    message: 'Exciting news! We have added new POS, Fast Food & Inventory features to your BusinessOS workspace.',
                    category: 'system'
                  })}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold cursor-pointer transition"
                >
                  Update
                </button>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-5">
              {/* Target Business Selection */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-2">Recipient Target</label>
                <select
                  value={selectedTarget}
                  onChange={e => setSelectedTarget(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                >
                  <option value="global">🌐 ALL REGISTERED BUSINESSES (Global Platform Push)</option>
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                      🏢 {b.name} ({b.businessType || b.category || 'Business'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">Notification Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Scheduled Maintenance / System Notice"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition capitalize"
                  >
                    <option value="system">System Notice</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="subscription">Subscription</option>
                    <option value="emergency">Emergency Alert</option>
                    <option value="general">General News</option>
                  </select>
                </div>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-2">Notification Message *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter detailed message to display on user screens and desktop push alerts..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none"
                />
              </div>

              {/* Action Link Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">Action Button Type</label>
                  <select
                    value={actionType}
                    onChange={e => setActionType(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  >
                    <option value="info">None (Informational Only)</option>
                    <option value="payment">Open Subscription Payment Dialog</option>
                    <option value="url">Open Custom External URL</option>
                  </select>
                </div>

                {actionType === 'url' && (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">Custom Action URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={actionUrl}
                      onChange={e => setActionUrl(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                )}
              </div>

              {/* Scheduled Send Option */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Schedule For Later Date/Time</p>
                      <p className="text-[10px] text-slate-400">Queue notification to automatically trigger at a future time</p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={e => setIsScheduled(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {isScheduled && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Delivery Timestamp</label>
                    <input
                      type="datetime-local"
                      required={isScheduled}
                      value={scheduledFor}
                      onChange={e => setScheduledFor(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition"
                >
                  <Send className="h-4 w-4" />
                  {isScheduled ? 'Schedule Notification' : 'Send Push Notification Now'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Scheduled Queue & System Stats */}
        <div className="space-y-6">
          {/* Scheduled Queue Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" /> Scheduled Queue
              </h3>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] rounded-full">
                {scheduledNotifs.length} Pending
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {scheduledNotifs.map(sn => (
                <div key={sn.notificationId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate max-w-[150px]">{sn.title}</span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                      {sn.scheduledFor ? new Date(sn.scheduledFor).toLocaleDateString() : 'Scheduled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{sn.message}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                    <button
                      onClick={() => handleDispatchNow(sn)}
                      className="text-emerald-700 hover:underline font-extrabold cursor-pointer"
                    >
                      Dispatch Now
                    </button>
                    <button
                      onClick={() => handleCancelScheduled(sn.notificationId)}
                      className="text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}

              {scheduledNotifs.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-medium space-y-1">
                  <Clock className="h-6 w-6 mx-auto text-slate-300" />
                  <p>No upcoming scheduled notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Platform Metrics */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md space-y-4">
            <h4 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" /> Push Messaging Infrastructure
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Businesses</span>
                <span className="text-lg font-black text-white">{businesses.length}</span>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Logs Recorded</span>
                <span className="text-lg font-black text-emerald-400">{logs.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Table: Delivery Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-700" /> Notification Delivery Logs
            </h3>
            <p className="text-xs text-slate-400">Complete historical audit trail of dispatched push messages</p>
          </div>

          {/* Filter / Search Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search log title or recipient..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={logFilter}
              onChange={e => setLogFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">All Types</option>
              <option value="system">System</option>
              <option value="maintenance">Maintenance</option>
              <option value="subscription">Subscription</option>
              <option value="emergency">Emergency</option>
              <option value="sales">Sales</option>
              <option value="inventory">Inventory</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Sender</th>
                <th className="p-3.5">Recipient Target</th>
                <th className="p-3.5">Notification Title &amp; Message</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">{log.sender}</td>
                  <td className="p-3.5 text-slate-700 font-bold whitespace-nowrap">
                    {log.recipient}
                  </td>
                  <td className="p-3.5 max-w-xs">
                    <p className="font-bold text-slate-900">{log.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{log.message}</p>
                  </td>
                  <td className="p-3.5 capitalize">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                      {log.type}
                    </span>
                  </td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                      log.deliveryStatus === 'delivered' || log.deliveryStatus === 'sent' ? 'bg-emerald-100 text-emerald-800' :
                      log.deliveryStatus === 'scheduled' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      <Check className="h-3 w-3" />
                      {log.deliveryStatus.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    No notification delivery logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
