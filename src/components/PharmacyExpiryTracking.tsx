/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, Product, PharmacyBatch } from '../types';
import {
  AlertTriangle,
  Clock,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Search,
  Filter,
  ShieldCheck,
  Package,
  Layers,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface PharmacyExpiryTrackingProps {
  business: Business;
  onNavigateMedicines?: () => void;
}

export const PharmacyExpiryTracking: React.FC<PharmacyExpiryTrackingProps> = ({
  business,
  onNavigateMedicines
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expired' | '30days' | '60days' | '90days'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const products = db.getProducts(business.id);
  const batches = db.getPharmacyBatches(business.id);

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Consolidated Item list with Expiry info (combining products and batches)
  interface ExpiryItem {
    id: string;
    productId: string;
    medicineName: string;
    genericName?: string;
    dosageForm?: string;
    strength?: string;
    batchNumber: string;
    expiryDate: string;
    daysRemaining: number;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    isBatchRecord: boolean;
    status: 'expired' | 'critical' | 'warning' | 'advisory' | 'healthy';
  }

  const expiryList: ExpiryItem[] = useMemo(() => {
    const list: ExpiryItem[] = [];

    // Add standalone products with expiry date
    products.forEach(p => {
      if (p.expiryDate) {
        const exp = new Date(p.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: ExpiryItem['status'] = 'healthy';
        if (diffDays < 0) status = 'expired';
        else if (diffDays <= 30) status = 'critical';
        else if (diffDays <= 60) status = 'warning';
        else if (diffDays <= 90) status = 'advisory';

        list.push({
          id: p.id,
          productId: p.id,
          medicineName: p.name,
          genericName: p.genericName,
          dosageForm: p.dosageForm,
          strength: p.strength,
          batchNumber: p.batchNumber || 'General Stock',
          expiryDate: p.expiryDate,
          daysRemaining: diffDays,
          quantity: p.stockQuantity,
          costPrice: p.costPrice || 0,
          sellingPrice: p.sellingPrice || 0,
          isBatchRecord: false,
          status
        });
      }
    });

    // Also add specialized pharmacy batches if any
    batches.forEach(b => {
      const prod = products.find(p => p.id === b.productId);
      if (!prod) return;
      const exp = new Date(b.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status: ExpiryItem['status'] = 'healthy';
      if (diffDays < 0) status = 'expired';
      else if (diffDays <= 30) status = 'critical';
      else if (diffDays <= 60) status = 'warning';
      else if (diffDays <= 90) status = 'advisory';

      // Avoid duplication if batch matches default product batch
      if (prod.batchNumber === b.batchNumber && prod.expiryDate === b.expiryDate) {
        return;
      }

      list.push({
        id: b.id,
        productId: prod.id,
        medicineName: prod.name,
        genericName: prod.genericName,
        dosageForm: prod.dosageForm,
        strength: prod.strength,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        daysRemaining: diffDays,
        quantity: b.quantity,
        costPrice: b.costPrice || prod.costPrice || 0,
        sellingPrice: b.sellingPrice || prod.sellingPrice || 0,
        isBatchRecord: true,
        status
      });
    });

    // Sort: expired first, then earliest expiring
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [products, batches]);

  // Filtered List
  const filteredList = useMemo(() => {
    return expiryList.filter(item => {
      const matchesSearch =
        item.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.genericName && item.genericName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === 'expired') return item.status === 'expired';
      if (filterType === '30days') return item.status === 'critical';
      if (filterType === '60days') return item.status === 'warning' || item.status === 'critical';
      if (filterType === '90days') return item.status === 'advisory' || item.status === 'warning' || item.status === 'critical';
      return true;
    });
  }, [expiryList, filterType, searchTerm]);

  // Summary Metrics
  const expiredItems = expiryList.filter(i => i.status === 'expired');
  const expiredCostValue = expiredItems.reduce((acc, i) => acc + (i.costPrice * i.quantity), 0);

  const atRiskItems = expiryList.filter(i => i.status === 'critical' || i.status === 'warning' || i.status === 'advisory');
  const atRiskCostValue = atRiskItems.reduce((acc, i) => acc + (i.costPrice * i.quantity), 0);

  // Quarantine / Disposal Action
  const handleDisposeBatch = (item: ExpiryItem) => {
    if (confirm(`Confirm write-off / quarantine of ${item.quantity} units of "${item.medicineName}" (Batch: ${item.batchNumber})? This will safely zero out expired units.`)) {
      if (item.isBatchRecord) {
        // Zero batch quantity
        const batch = batches.find(b => b.id === item.id);
        if (batch) {
          db.savePharmacyBatch(business.id, { ...batch, quantity: 0 });
        }
      } else {
        // Zero product stock quantity
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          db.saveProduct(business.id, { ...prod, stockQuantity: 0 });
        }
      }
      showSuccess('Stock Written Off', `${item.quantity} expired units of ${item.medicineName} removed from active dispensary stock.`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-600" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Medicine Expiry Tracking & FEFO Auditing
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Monitor approaching expiration horizons, isolate expired pharmaceuticals, and enforce regulatory healthcare compliance.
          </p>
        </div>

        {onNavigateMedicines && (
          <button
            onClick={onNavigateMedicines}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm shrink-0"
          >
            Manage Medicines Catalog
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Expired Stock */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Expired Stock (Action Required)</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            {expiredItems.length} {expiredItems.length === 1 ? 'batch' : 'batches'}
          </div>
          <div className="text-xs text-rose-600 font-semibold">
            Estimated loss: {formatCurrency(expiredCostValue, business.currency || 'GHC')}
          </div>
        </div>

        {/* Expiring Soon (< 90 Days) */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">At-Risk Stock (&le; 90 Days)</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            {atRiskItems.length} {atRiskItems.length === 1 ? 'item' : 'items'}
          </div>
          <div className="text-xs text-amber-700 font-semibold">
            Stock value at risk: {formatCurrency(atRiskCostValue, business.currency || 'GHC')}
          </div>
        </div>

        {/* Compliance Status */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Dispensary Health</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {expiryList.length - expiredItems.length} Active Items
          </div>
          <div className="text-xs text-emerald-700 font-semibold">
            FEFO automated dispatch enabled
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: `All Stock (${expiryList.length})` },
            { id: 'expired', label: `Expired (${expiredItems.length})`, countColor: 'text-rose-700 font-black' },
            { id: '30days', label: `&le; 30 Days (${expiryList.filter(i => i.status === 'critical').length})` },
            { id: '60days', label: `&le; 60 Days (${expiryList.filter(i => i.status === 'warning' || i.status === 'critical').length})` },
            { id: '90days', label: `&le; 90 Days (${atRiskItems.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search medicine or batch..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">Medicine Details</th>
                <th className="py-4 px-4">Batch #</th>
                <th className="py-4 px-4">Expiration Date</th>
                <th className="py-4 px-4">Expiry Horizon</th>
                <th className="py-4 px-4 text-right">Units in Stock</th>
                <th className="py-4 px-4 text-right">Value ({business.currency || 'GHC'})</th>
                <th className="py-4 px-6 text-right">Disposal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="font-bold text-slate-800">No stock alerts under this filter.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">All monitored medicines meet shelf life requirements.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map(item => {
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 transition ${
                        item.status === 'expired' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{item.medicineName}</div>
                        {item.genericName && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">{item.genericName}</div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          {item.dosageForm || 'Units'} {item.strength ? `&bull; ${item.strength}` : ''}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-slate-800">
                        {item.batchNumber}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800">{item.expiryDate}</div>
                      </td>

                      <td className="py-4 px-4">
                        {item.status === 'expired' ? (
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Expired {Math.abs(item.daysRemaining)} days ago
                          </span>
                        ) : item.status === 'critical' ? (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.daysRemaining} days left (Critical)
                          </span>
                        ) : item.status === 'warning' ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {item.daysRemaining} days left (Warning)
                          </span>
                        ) : item.status === 'advisory' ? (
                          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-[10px] font-semibold">
                            {item.daysRemaining} days left (Advisory)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-semibold">
                            {item.daysRemaining} days left (Safe)
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right font-black text-sm text-slate-900">
                        {item.quantity}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-slate-800">
                          {formatCurrency(item.sellingPrice * item.quantity, business.currency || 'GHC')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Cost: {formatCurrency(item.costPrice * item.quantity, business.currency || 'GHC')}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        {item.status === 'expired' && item.quantity > 0 ? (
                          <button
                            onClick={() => handleDisposeBatch(item)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold transition cursor-pointer shadow-xs"
                          >
                            Write Off Batch
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">In Dispensary</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
