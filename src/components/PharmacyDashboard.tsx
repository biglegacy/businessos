/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, Product, Sale, Prescription } from '../types';
import {
  Pill,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  TrendingUp,
  FileText,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface PharmacyDashboardProps {
  business: Business;
  user: User;
  onNavigate: (tab: string) => void;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({
  business,
  user,
  onNavigate
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Load real isolated tenant data
  const products = db.getProducts(business.id);
  const sales = db.getSales(business.id);
  const customers = db.getCustomers(business.id);
  const prescriptions = db.getPrescriptions(business.id);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Sales Filtering
  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr) && s.status !== 'refunded');
  
  let salesAmount = 0;
  let costOfGoodsSold = 0;
  let outstandingBalance = 0;

  todaySales.forEach(s => {
    salesAmount += s.total;
    if (s.paymentStatus === 'unpaid' || s.paymentStatus === 'partial') {
      outstandingBalance += (s.total - (s.amountPaid || 0));
    }
    // Calculate cost if available
    s.items.forEach(item => {
      const prod = products.find(p => p.id === item.itemId);
      if (prod && prod.costPrice) {
        costOfGoodsSold += prod.costPrice * item.quantity;
      }
    });
  });

  const todayProfit = salesAmount - costOfGoodsSold;

  // Inventory & Medicine Counts
  const totalMedicines = products.length;
  const outOfStockMedicines = products.filter(p => p.stockQuantity <= 0);
  const lowStockMedicines = products.filter(p => {
    const threshold = p.lowStockThreshold || p.reorderLevel || 10;
    return p.stockQuantity > 0 && p.stockQuantity <= threshold;
  });

  // Expiry Calculations
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const expiredProducts = products.filter(p => {
    if (!p.expiryDate) return false;
    return new Date(p.expiryDate) < now;
  });

  const expiringIn30Days = products.filter(p => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    return exp >= now && exp <= thirtyDaysLater;
  });

  const expiringIn90Days = products.filter(p => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    return exp >= now && exp <= ninetyDaysLater;
  });

  // Total Inventory Value
  const totalCostValue = products.reduce((acc, p) => acc + ((p.costPrice || 0) * (p.stockQuantity || 0)), 0);
  const totalRetailValue = products.reduce((acc, p) => acc + ((p.sellingPrice || 0) * (p.stockQuantity || 0)), 0);

  // Pending Prescriptions
  const pendingPrescriptions = prescriptions.filter(rx => rx.status === 'Pending');

  // Top Selling Medicines (from all sales)
  const medicineSalesMap: { [key: string]: { name: string; qty: number; revenue: number } } = {};
  sales.forEach(s => {
    s.items.forEach(item => {
      if (!medicineSalesMap[item.itemId]) {
        medicineSalesMap[item.itemId] = { name: item.name, qty: 0, revenue: 0 };
      }
      medicineSalesMap[item.itemId].qty += item.quantity;
      medicineSalesMap[item.itemId].revenue += item.price * item.quantity;
    });
  });

  const topMedicines = Object.values(medicineSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* Expiry Warning Header Banner if expired/critical items exist */}
      {(expiredProducts.length > 0 || expiringIn30Days.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-700 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Pharmacy Stock Expiry Advisory</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {expiredProducts.length > 0 && (
                  <span className="font-bold text-rose-700 mr-2">
                    &bull; {expiredProducts.length} expired {expiredProducts.length === 1 ? 'medicine' : 'medicines'} detected (quarantine immediately).
                  </span>
                )}
                {expiringIn30Days.length > 0 && (
                  <span className="font-semibold text-amber-800">
                    &bull; {expiringIn30Days.length} {expiringIn30Days.length === 1 ? 'item' : 'items'} expiring in the next 30 days (apply FEFO dispatch).
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('Expiry Tracking')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-sm"
          >
            Review Expiry Tracking
          </button>
        </div>
      )}

      {/* Top Banner & Quick Dispensary Actions */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wide text-emerald-200">
            <Pill className="h-3.5 w-3.5" />
            <span>Pharmacy Dispensary Operating System</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {business.name} Dispensary
          </h2>
          <p className="text-xs text-emerald-200/90 max-w-xl">
            FEFO-enabled batch management, prescription dispensation tracking, and automated expiry defense adhering to healthcare compliance standards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('POS')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Open Dispensary POS</span>
          </button>
          <button
            onClick={() => onNavigate('Prescriptions')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border border-white/10"
          >
            <FileText className="h-4 w-4" />
            <span>Record Prescription ({pendingPrescriptions.length})</span>
          </button>
          <button
            onClick={() => onNavigate('Medicines & Products')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border border-white/10"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* KPI Grid (11 Required Pharmacy Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Sales</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(salesAmount, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {todaySales.length} transaction{todaySales.length === 1 ? '' : 's'} recorded today
          </div>
        </div>

        {/* Today's Profit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Profit</span>
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {formatCurrency(todayProfit, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            COGS: {formatCurrency(costOfGoodsSold, business.currency || 'GHC')}
          </div>
        </div>

        {/* Total Medicines */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Medicines Catalog</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Pill className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {totalMedicines}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {products.filter(p => p.requiresPrescription).length} Rx-only &bull; {products.filter(p => !p.requiresPrescription).length} OTC
          </div>
        </div>

        {/* Patients / Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Patients / Customers</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {customers.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {prescriptions.length} historical prescription records
          </div>
        </div>

        {/* Low Stock Medicines */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock Medicines</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700">
            {lowStockMedicines.length}
          </div>
          <div className="text-[10px] text-amber-600 font-medium">
            At or below reorder threshold
          </div>
        </div>

        {/* Out of Stock Medicines */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Out of Stock</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            {outOfStockMedicines.length}
          </div>
          <div className="text-[10px] text-rose-600 font-medium">
            Zero dispensary units remaining
          </div>
        </div>

        {/* Expiring Soon (< 90 Days) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expiring &le; 90 Days</span>
            <div className="p-2 bg-orange-50 text-orange-700 rounded-xl">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-700">
            {expiringIn90Days.length}
          </div>
          <div className="text-[10px] text-orange-600 font-medium">
            {expiringIn30Days.length} critical (&le; 30 days)
          </div>
        </div>

        {/* Expired Items */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expired Medicines</span>
            <div className="p-2 bg-red-50 text-red-700 rounded-xl">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-700">
            {expiredProducts.length}
          </div>
          <div className="text-[10px] text-red-600 font-medium">
            Blocked from point-of-sale
          </div>
        </div>

        {/* Inventory Value (Retail & Cost) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Inventory Value</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(totalRetailValue, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Cost base: {formatCurrency(totalCostValue, business.currency || 'GHC')}
          </div>
        </div>

        {/* Outstanding Balances */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Patient Balances</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700">
            {formatCurrency(outstandingBalance, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Unpaid / partial medicine balances
          </div>
        </div>
      </div>

      {/* Two-Column Detail Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Prescriptions & Dispensary Sales */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">Prescription Queue</h3>
            </div>
            <button
              onClick={() => onNavigate('Prescriptions')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({prescriptions.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-medium">No recorded prescriptions yet</p>
              <button
                onClick={() => onNavigate('Prescriptions')}
                className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Record First Prescription
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.slice(0, 5).map(rx => (
                <div key={rx.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {rx.patientName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        rx.status === 'Dispensed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rx.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Rx #{rx.prescriptionNumber} &bull; Dr. {rx.doctorName || 'General Practitioner'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-700">
                      {rx.medicines?.length || 0} item{rx.medicines?.length === 1 ? '' : 's'}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rx.prescribedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Top Selling Medicines & Quick Stock Alerts */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">Top Moving Medicines</h3>
            </div>
            <button
              onClick={() => onNavigate('Sales')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Sales Ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {topMedicines.length === 0 ? (
            <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Pill className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-medium">No dispensary sales recorded yet</p>
              <button
                onClick={() => onNavigate('POS')}
                className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Launch Dispensary POS
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {topMedicines.map((m, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{m.name}</div>
                      <div className="text-[10px] text-slate-500">{m.qty} units dispensed</div>
                    </div>
                  </div>
                  <div className="font-extrabold text-xs text-emerald-800 shrink-0">
                    {formatCurrency(m.revenue, business.currency || 'GHC')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compliance Notice Footer */}
      <div className="p-4 bg-slate-100 rounded-2xl text-[11px] text-slate-500 flex items-center gap-3 border border-slate-200">
        <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
        <span>
          <strong>Pharmacy Operations Notice:</strong> BusinessOS tracks pharmacy inventory, batch batches, FEFO stock distribution, and financial ledgers. Prescription records are maintained for store administrative purposes only and do not replace professional pharmaceutical assessment.
        </span>
      </div>
    </div>
  );
};
