/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { BusinessPopupPrompt, Business } from '../../types';
import { 
  Sparkles, Plus, Trash2, Edit2, CheckCircle2, XCircle, 
  Eye, RefreshCw, AlertCircle, Calendar, Users, Layers, ExternalLink, X, ArrowRight, Shield
} from 'lucide-react';

export function AdminPopupManagement() {
  const [prompts, setPrompts] = useState<BusinessPopupPrompt[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for Create/Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<BusinessPopupPrompt>>({
    title: '',
    message: '',
    daysAfterRegistration: 7,
    targetType: 'all',
    targetBusinessIds: [],
    status: 'active',
    category: 'onboarding',
    actionButtonText: 'View Options',
    actionUrlOrTab: 'settings',
    allowRepeatDisplay: false,
    expirationDate: ''
  });

  // Live Preview Modal State
  const [previewPrompt, setPreviewPrompt] = useState<BusinessPopupPrompt | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [promptsData, bizData] = await Promise.all([
        db.getAdminPopupPrompts(),
        db.getBusinesses()
      ]);
      setPrompts(promptsData || []);
      setBusinesses(bizData || []);
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error loading popup prompts data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      message: '',
      daysAfterRegistration: 7,
      targetType: 'all',
      targetBusinessIds: [],
      status: 'active',
      category: 'onboarding',
      actionButtonText: 'Explore Features',
      actionUrlOrTab: 'settings',
      allowRepeatDisplay: false,
      expirationDate: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prompt: BusinessPopupPrompt) => {
    setEditingId(prompt.id);
    setFormData({ ...prompt });
    setIsFormOpen(true);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.message?.trim()) {
      setNotification({ type: 'error', text: 'Prompt title and message content are required.' });
      return;
    }

    // Strict 5 to 30 days validation
    const rawDays = Number(formData.daysAfterRegistration);
    const validDays = Math.min(30, Math.max(5, isNaN(rawDays) ? 7 : Math.round(rawDays)));

    setLoading(true);
    setNotification(null);

    try {
      const payload: Partial<BusinessPopupPrompt> = {
        ...formData,
        id: editingId || undefined,
        daysAfterRegistration: validDays
      };

      const res = await db.savePopupPrompt(payload);
      if (res.success) {
        setNotification({ type: 'success', text: res.message || 'Popup prompt saved successfully!' });
        setIsFormOpen(false);
        await fetchData();
      } else {
        setNotification({ type: 'error', text: res.message || 'Failed to save prompt.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Network error saving popup prompt.' });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Permanently delete this scheduled popup prompt?')) return;
    try {
      const res = await db.deletePopupPrompt(id);
      if (res.success) {
        setPrompts(prev => prev.filter(p => p.id !== id));
        setNotification({ type: 'success', text: 'Popup prompt removed successfully.' });
      } else {
        setNotification({ type: 'error', text: res.message || 'Failed to delete prompt.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error deleting popup prompt.' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleStatus = async (prompt: BusinessPopupPrompt) => {
    const newStatus = prompt.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await db.savePopupPrompt({ ...prompt, status: newStatus });
      if (res.success) {
        setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, status: newStatus } : p));
      }
    } catch (err) {
      console.warn('Error toggling prompt status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Registration-Based Business Popup System
              </h3>
              <p className="text-xs text-slate-500">
                Scheduled modal prompts targeting businesses between 5 to 30 days after registration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Plus className="h-4 w-4" />
              Create Scheduled Popup
            </button>
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-600" /> Precise 5–30 Day Window
            </p>
            <p className="text-slate-500 mt-1 text-[11px] leading-relaxed">
              Targeted automatically against the tenant&apos;s verified <code className="text-slate-700 font-mono">business.registrationDate</code>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-indigo-600" /> Audience Filtering
            </p>
            <p className="text-slate-500 mt-1 text-[11px] leading-relaxed">
              Broadcast to all registered businesses or target specific tenant accounts explicitly.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-amber-600" /> Reliable Session Tracking
            </p>
            <p className="text-slate-500 mt-1 text-[11px] leading-relaxed">
              Interactive modal prevents intrusive spam while respecting tenant dismissal actions.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Popups Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Active &amp; Scheduled Popup Prompts ({prompts.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                <th className="py-3.5 px-6">Prompt Title</th>
                <th className="py-3.5 px-6">Trigger Schedule</th>
                <th className="py-3.5 px-6">Audience</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {prompts.map(prompt => {
                const isActive = prompt.status === 'active';
                const targetText = prompt.targetType === 'all' 
                  ? 'All Businesses' 
                  : `${prompt.targetBusinessIds?.length || 0} Specific Businesses`;

                return (
                  <tr key={prompt.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-900 text-sm">{prompt.title}</p>
                        <p className="text-[11px] text-slate-500 max-w-sm truncate">{prompt.message}</p>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg">
                        Day {prompt.daysAfterRegistration}
                        <span className="text-[10px] font-normal text-amber-600">after registration</span>
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className="text-slate-700 font-medium">
                        {targetText}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-700 uppercase">
                        {prompt.category || 'general'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(prompt)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer ${
                          isActive 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                        {isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewPrompt(prompt)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer min-h-[36px]"
                          title="Preview Live Modal"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(prompt)}
                          className="p-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer min-h-[36px]"
                          title="Edit Prompt"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer min-h-[36px]"
                          title="Delete Prompt"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {prompts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No scheduled popup prompts configured yet. Click &ldquo;Create Scheduled Popup&rdquo; to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PROMPT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingId ? 'Edit Scheduled Popup Prompt' : 'Create Scheduled Popup Prompt'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated modal delivered between Day 5 and Day 30 of tenant registration.
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrompt} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Popup Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Welcome to Day 7: Connect Invoicing"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Message Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the feature, announcement, or milestone to the business owner..."
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Days After Registration Slider/Input (5 to 30) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Days After Registration (5 to 30 Days)
                  </label>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Day {formData.daysAfterRegistration}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={formData.daysAfterRegistration || 7}
                  onChange={(e) => setFormData({ ...formData, daysAfterRegistration: Number(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>Day 5 (Minimum)</span>
                  <span>Day 15 (Mid-trial)</span>
                  <span>Day 30 (Full cycle)</span>
                </div>
              </div>

              {/* Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category || 'onboarding'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none"
                  >
                    <option value="onboarding">Onboarding</option>
                    <option value="subscription">Subscription</option>
                    <option value="promotional">Promotional</option>
                    <option value="announcement">Announcement</option>
                    <option value="instructional">Instructional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Audience Scope
                  </label>
                  <select
                    value={formData.targetType || 'all'}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none"
                  >
                    <option value="all">All Businesses</option>
                    <option value="selected">Selected Businesses</option>
                  </select>
                </div>
              </div>

              {/* If selected businesses */}
              {formData.targetType === 'selected' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <p className="font-bold text-slate-700 text-xs">Select Targeted Businesses:</p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {businesses.map(b => (
                      <label key={b.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.targetBusinessIds?.includes(b.id) || false}
                          onChange={(e) => {
                            const cur = formData.targetBusinessIds || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, targetBusinessIds: [...cur, b.id] });
                            } else {
                              setFormData({ ...formData, targetBusinessIds: cur.filter(id => id !== b.id) });
                            }
                          }}
                          className="rounded accent-emerald-600"
                        />
                        <span>{b.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({b.category})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button Label & Route */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Action Button Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Upgrade Now"
                    value={formData.actionButtonText || ''}
                    onChange={(e) => setFormData({ ...formData, actionButtonText: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Destination Tab
                  </label>
                  <select
                    value={formData.actionUrlOrTab || 'settings'}
                    onChange={(e) => setFormData({ ...formData, actionUrlOrTab: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none"
                  >
                    <option value="settings">Settings / Subscription</option>
                    <option value="sales">Point of Sale / Orders</option>
                    <option value="inventory">Inventory Management</option>
                    <option value="customers">Customers / Directory</option>
                    <option value="reports">Analytics &amp; Reports</option>
                  </select>
                </div>
              </div>

              {/* Repeat Display Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="allow-repeat"
                  checked={formData.allowRepeatDisplay || false}
                  onChange={(e) => setFormData({ ...formData, allowRepeatDisplay: e.target.checked })}
                  className="rounded accent-emerald-600 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="allow-repeat" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Allow Repeat Display across different browser sessions
                </label>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL */}
      {previewPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transition-all flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white relative">
              <button
                onClick={() => setPreviewPrompt(null)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                      Live Preview
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium">
                      Day {previewPrompt.daysAfterRegistration} of Registration
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1 leading-snug">
                    {previewPrompt.title}
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {previewPrompt.message}
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

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreviewPrompt(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
              {previewPrompt.actionButtonText && (
                <button
                  type="button"
                  onClick={() => {
                    alert(`Simulated Action: Navigate to tab "${previewPrompt.actionUrlOrTab}"`);
                    setPreviewPrompt(null);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <span>{previewPrompt.actionButtonText}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
