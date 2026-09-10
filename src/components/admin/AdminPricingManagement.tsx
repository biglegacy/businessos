/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { DollarSign, Search, RefreshCw, Check, Edit2, AlertCircle, TrendingUp, Building, ShieldCheck, Plus, Trash2, Layers, Tag } from 'lucide-react';

export function AdminPricingManagement() {
  const [pricingList, setPricingList] = useState<any[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [selectedPlanForBus, setSelectedPlanForBus] = useState<string>('');
  const [savingBusId, setSavingBusId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New plan modal / form state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: 300,
    currency: 'GHS',
    billingCycle: 'monthly',
    description: '',
    featuresText: 'Unlimited Products\nPOS Transactions\nDaily Sales Reports'
  });

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const data = await db.getBusinessPricingList();
      setPricingList(data || []);
      const plans = db.getPricingPlans();
      setPricingPlans(plans || []);
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Error fetching business pricing list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleStartEdit = (bus: any) => {
    setEditingBusId(bus.id);
    setPriceInput(String(bus.subscriptionAmount || 300));
    setSelectedPlanForBus(bus.pricingPlanId || '');
  };

  const handleCancelEdit = () => {
    setEditingBusId(null);
    setPriceInput('');
    setSelectedPlanForBus('');
  };

  const handleSavePrice = async (busId: string, customVal?: number) => {
    const val = customVal !== undefined ? customVal : parseFloat(priceInput);
    if (isNaN(val) || val <= 0) {
      setNotification({ type: 'error', text: 'Pricing amount must be a positive monetary number (GHS).' });
      return;
    }

    setSavingBusId(busId);
    setNotification(null);

    try {
      const res = await db.updateBusinessPrice(busId, val, 'Super Admin');
      if (res.success) {
        // Also update plan ID if assigned
        const busList = db.getBusinesses();
        const bIdx = busList.findIndex(b => b.id === busId);
        if (bIdx >= 0) {
          busList[bIdx].pricingPlanId = selectedPlanForBus || undefined;
          busList[bIdx].subscriptionAmount = val;
          db.saveBusiness(busList[bIdx]);
        }
        setNotification({ type: 'success', text: res.message || 'Pricing updated successfully!' });
        setEditingBusId(null);
        setPriceInput('');
        await fetchPricing();
      } else {
        setNotification({ type: 'error', text: res.message || 'Failed to update business pricing.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to update pricing.' });
    } finally {
      setSavingBusId(null);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleSavePlanForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) return;
    const features = planForm.featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    const planToSave = {
      id: editingPlan ? editingPlan.id : 'plan_' + Date.now(),
      name: planForm.name.trim(),
      price: Number(planForm.price) || 0,
      currency: planForm.currency || 'GHS',
      billingCycle: planForm.billingCycle || 'monthly',
      description: planForm.description.trim(),
      features,
      isActive: true
    };

    db.savePricingPlan(planToSave);
    setPricingPlans(db.getPricingPlans());
    setShowPlanModal(false);
    setEditingPlan(null);
    setNotification({ type: 'success', text: `Plan "${planToSave.name}" saved successfully.` });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeletePlan = (planId: string) => {
    if (!window.confirm('Are you sure you want to delete this pricing plan?')) return;
    db.deletePricingPlan(planId);
    setPricingPlans(db.getPricingPlans());
    setNotification({ type: 'success', text: 'Pricing plan removed.' });
    setTimeout(() => setNotification(null), 4000);
  };

  const openAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      price: 300,
      currency: 'GHS',
      billingCycle: 'monthly',
      description: '',
      featuresText: 'Unlimited Products\nPOS Transactions\nDaily Sales Reports'
    });
    setShowPlanModal(true);
  };

  const openEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name || '',
      price: plan.price || 300,
      currency: plan.currency || 'GHS',
      billingCycle: plan.billingCycle || 'monthly',
      description: plan.description || '',
      featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : ''
    });
    setShowPlanModal(true);
  };

  const filtered = pricingList.filter(b => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTenants = pricingList.length;
  const avgPrice = totalTenants > 0 
    ? (pricingList.reduce((acc, b) => acc + (b.subscriptionAmount || 300), 0) / totalTenants).toFixed(2)
    : '300.00';
  const customPricedCount = pricingList.filter(b => b.subscriptionAmount && b.subscriptionAmount !== 300).length;

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
              <DollarSign className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Super Admin Business Pricing &amp; Plans
              </h3>
              <p className="text-xs text-slate-500">
                Configure platform pricing tiers, subscription packages, and isolated monthly fees in Ghanaian Cedi (GH₵).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddPlan}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[40px]"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Pricing Tier
            </button>
            <button
              onClick={fetchPricing}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Registered Tenants</p>
            <p className="font-extrabold text-slate-800 text-lg mt-1">{totalTenants}</p>
            <p className="text-[11px] text-slate-500">Subject to monthly subscription</p>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Average Monthly Rate</p>
            <p className="font-extrabold text-emerald-900 text-lg mt-1">GH₵ {avgPrice}</p>
            <p className="text-[11px] text-emerald-700 font-medium">Standard baseline: GH₵ 300.00</p>
          </div>

          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Custom Priced Tenants</p>
            <p className="font-extrabold text-indigo-900 text-lg mt-1">{customPricedCount}</p>
            <p className="text-[11px] text-indigo-700">Custom negotiated tiers</p>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Active Pricing Tiers</p>
            <p className="font-extrabold text-amber-900 text-lg mt-1">{pricingPlans.length}</p>
            <p className="text-[11px] text-amber-700">Configured platform plans</p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
        </div>
      )}

      {/* Standard Pricing Tiers Cards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-700" /> Standard System Pricing Plans
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Available subscription tiers that can be assigned to businesses across all industries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pricingPlans.map(plan => (
            <div key={plan.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-300 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">{plan.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditPlan(plan)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                      title="Edit Plan"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-1 hover:bg-rose-100 rounded text-rose-500 cursor-pointer"
                      title="Delete Plan"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xl font-black text-emerald-900 mt-2">
                  GH₵ {Number(plan.price).toFixed(2)}
                  <span className="text-xs font-normal text-slate-500"> /{plan.billingCycle || 'mo'}</span>
                </p>
                {plan.description && (
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{plan.description}</p>
                )}
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[10px] text-slate-600 border-t border-slate-200 pt-2">
                    {plan.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Pricing Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by business name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>
          <span className="text-xs font-bold text-slate-500">
            Showing {filtered.length} of {pricingList.length} Businesses
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                <th className="py-3.5 px-6">Business / Tenant</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Assigned Plan</th>
                <th className="py-3.5 px-6">Monthly Rate (GHS)</th>
                <th className="py-3.5 px-6">Last Price Update</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map(bus => {
                const isEditing = editingBusId === bus.id;
                const isSaving = savingBusId === bus.id;
                const currentAmount = bus.subscriptionAmount !== null && bus.subscriptionAmount !== undefined 
                  ? bus.subscriptionAmount 
                  : 300;
                const assignedPlan = pricingPlans.find(p => p.id === bus.pricingPlanId);

                return (
                  <tr key={bus.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {bus.name?.charAt(0) || 'B'}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{bus.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {bus.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-700 uppercase">
                        {bus.category || 'General'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      {isEditing ? (
                        <select
                          value={selectedPlanForBus}
                          onChange={(e) => {
                            setSelectedPlanForBus(e.target.value);
                            const pl = pricingPlans.find(p => p.id === e.target.value);
                            if (pl) setPriceInput(String(pl.price));
                          }}
                          className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-800"
                        >
                          <option value="">-- Custom Rate --</option>
                          {pricingPlans.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (GH₵ {p.price})</option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          <Tag className="h-3 w-3 text-slate-400" />
                          {assignedPlan ? assignedPlan.name : 'Custom / Standard'}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700">GH₵</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={priceInput}
                              onChange={(e) => setPriceInput(e.target.value)}
                              className="w-24 px-2.5 py-1 border border-emerald-500 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              autoFocus
                            />
                          </div>
                          {/* Quick presets */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {[150, 250, 300, 350, 500, 750].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setPriceInput(String(p))}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-[9px] font-bold rounded text-slate-600"
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 font-black text-slate-900 text-sm bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                            GH₵ {Number(currentAmount).toFixed(2)}
                            <span className="text-[10px] text-emerald-600 font-normal">/mo</span>
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6 text-slate-500 text-[11px]">
                      {bus.priceUpdatedAt ? (
                        <div>
                          <p className="font-medium text-slate-700">{new Date(bus.priceUpdatedAt).toLocaleDateString()}</p>
                          <p className="text-[10px] text-slate-400">by {bus.priceUpdatedBy || 'Super Admin'}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Default Baseline</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSavePrice(bus.id)}
                            disabled={isSaving}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                          >
                            {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(bus)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ml-auto"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit Pricing
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No businesses found matching &ldquo;{searchTerm}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Modal (Add / Edit) */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base">
              {editingPlan ? 'Edit Pricing Plan' : 'Create New Pricing Tier'}
            </h3>
            <form onSubmit={handleSavePlanForm} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g., Starter, Pro, Enterprise"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Price (GH₵)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Billing Cycle</label>
                  <select
                    value={planForm.billingCycle}
                    onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Description</label>
                <input
                  type="text"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Brief summary of who this plan is for"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Features (One per line)</label>
                <textarea
                  rows={4}
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  placeholder="Unlimited Products&#10;POS Transactions&#10;Daily Reports"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
