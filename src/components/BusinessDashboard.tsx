/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { User, Business, Sale } from '../types';
import { 
  DollarSign, Package, AlertTriangle, ArrowUpRight, 
  TrendingUp, TrendingDown, ShoppingBag, Plus, Sparkles,
  FileDown, Calendar, CreditCard, Layers, BarChart3, Database, ChevronRight,
  Truck, Users, Settings, Receipt, PlusCircle, ArrowDownLeft,
  ShoppingCart, Building2, Bell, CheckCircle2, Clock,
  Wallet, Smartphone, Eye, X, ArrowRight, ShieldCheck, RefreshCw,
  Search, ExternalLink, Printer
} from 'lucide-react';
import { 
  exportSalesToCSV, 
  exportProductsToCSV, 
  exportServicesToCSV, 
  exportCustomersToCSV, 
  exportExpensesToCSV 
} from '../lib/csvExport';

interface BusinessDashboardProps {
  business: Business;
  user: User;
  onNavigate: (tab: string) => void;
}

export function BusinessDashboard({ business, user, onNavigate }: BusinessDashboardProps) {
  const isOwnerOrAdmin = ['owner', 'admin', 'SUPER_ADMIN'].includes(user.role);
  const isManager = user.role === 'manager';
  const initialBranchId = isOwnerOrAdmin ? 'All' : (user.branchId || 'All');
  const [dashboardBranchId, setDashboardBranchId] = useState<string>(initialBranchId);

  // Modal state for quick receipt inspection
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);

  // Timeframe for performance analytics
  const [chartTimeframe, setChartTimeframe] = useState<'7days' | '30days' | '6months'>('7days');
  const [hoveredBar, setHoveredBar] = useState<{ index: number; type: 'revenue' | 'expense'; value: number; label: string } | null>(null);

  // Filter for recent sales list
  const [recentSalesFilter, setRecentSalesFilter] = useState<'all' | 'cash' | 'mobile' | 'card' | 'credit'>('all');

  const branches = db.getBranches(business.id);

  // Fetch tenant data from database
  const rawProducts = db.getProducts(business.id);
  const rawServices = db.getServices(business.id);
  const rawSales = db.getSales(business.id).filter(s => s.status === 'completed');
  const rawExpenses = db.getExpenses(business.id);
  const rawCustomers = db.getCustomers(business.id);

  // Filtered by branch if selected
  const products = rawProducts.filter(p => dashboardBranchId === 'All' || p.branchId === dashboardBranchId);
  const sales = rawSales.filter(s => dashboardBranchId === 'All' || s.branchId === dashboardBranchId);
  const expenses = rawExpenses.filter(e => dashboardBranchId === 'All' || e.branchId === dashboardBranchId);

  // Receivables computation (customer debt)
  const debtors = rawCustomers.filter(c => c.balance < 0);
  const totalReceivables = debtors.reduce((sum, c) => sum + Math.abs(c.balance), 0);
  const debtorCount = debtors.length;

  // Calculate metrics for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
  const todaySalesSum = todaySales.reduce((acc, curr) => acc + curr.total, 0);
  const todaySalesCount = todaySales.length;

  // Average basket / ticket size today
  const avgBasketSize = todaySalesCount > 0 ? todaySalesSum / todaySalesCount : 0;

  // Total items sold today
  const todayItemsSold = todaySales.reduce((sum, s) => {
    return sum + (s.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 1), 0);
  }, 0);

  // Today's Payment Method breakdown
  const todayCash = todaySales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const todayMomo = todaySales.filter(s => s.paymentMethod === 'mobile').reduce((sum, s) => sum + s.total, 0);
  const todayCard = todaySales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);
  const todayCredit = todaySales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + s.total, 0);

  // Today's Expenses
  const todayExpenses = expenses.filter(e => {
    const dStr = e.date || (e.createdAt ? e.createdAt.split('T')[0] : '');
    return dStr === todayStr;
  });
  const todayExpensesSum = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate COGS (Cost of Goods Sold) for today
  let todayCOGS = 0;
  todaySales.forEach(s => {
    (s.items || []).forEach(item => {
      if (item.type === 'product') {
        const p = rawProducts.find(prod => prod.id === item.itemId);
        if (p && p.costPrice) {
          todayCOGS += (item.quantity || 1) * p.costPrice;
        }
      }
    });
  });

  // Today's estimated net profit: Revenue - COGS - Expenses
  const todayGrossProfit = todaySalesSum - todayCOGS;
  const todayNetProfit = todayGrossProfit - todayExpensesSum;
  const todayMarginPercent = todaySalesSum > 0 ? Math.round((todayNetProfit / todaySalesSum) * 100) : 0;

  // Helper for periodic profit calculations
  const getProfitForPeriod = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const periodSales = sales.filter(s => new Date(s.createdAt) >= cutoffDate);
    const periodExpenses = expenses.filter(e => {
      const eDate = new Date(e.date + 'T00:00:00');
      const finalDate = isNaN(eDate.getTime()) ? new Date(e.createdAt) : eDate;
      return finalDate >= cutoffDate;
    });

    const pSalesSum = periodSales.reduce((acc, curr) => acc + curr.total, 0);
    const pExpensesSum = periodExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    let pCOGS = 0;
    periodSales.forEach(s => {
      (s.items || []).forEach(item => {
        if (item.type === 'product') {
          const p = rawProducts.find(prod => prod.id === item.itemId);
          if (p && p.costPrice) {
            pCOGS += (item.quantity || 1) * p.costPrice;
          }
        }
      });
    });

    return pSalesSum - pCOGS - pExpensesSum;
  };

  const weeklyProfit = getProfitForPeriod(7);

  // Low stock and out-of-stock items
  const lowStockItems = useMemo(() => {
    const defaultThreshold = typeof business.defaultLowStockThreshold === 'number' ? business.defaultLowStockThreshold : 5;
    return products.filter(p => {
      const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : defaultThreshold;
      return p.stockQuantity <= threshold;
    }).sort((a, b) => a.stockQuantity - b.stockQuantity);
  }, [products, business.defaultLowStockThreshold]);

  const outOfStockCount = lowStockItems.filter(p => p.stockQuantity <= 0).length;

  // Permissions
  const canAccessReceivables = ['owner', 'manager', 'admin', 'SUPER_ADMIN', 'accountant'].includes(user.role) || (user.permissions && user.permissions.includes('Accounts Receivable'));
  const canAddProduct = ['owner', 'manager', 'admin', 'SUPER_ADMIN', 'inventory_staff', 'pos_inventory_staff'].includes(user.role) || (user.permissions && user.permissions.includes('Products'));
  const canManageCustomers = ['owner', 'manager', 'admin', 'SUPER_ADMIN', 'cashier'].includes(user.role) || (user.permissions && user.permissions.includes('Customers'));
  const canAccessExpenses = ['owner', 'manager', 'admin', 'SUPER_ADMIN', 'accountant'].includes(user.role) || (user.permissions && user.permissions.includes('Expenses'));
  const canViewReports = ['owner', 'manager', 'admin', 'SUPER_ADMIN', 'accountant'].includes(user.role) || (user.permissions && user.permissions.includes('Reports'));

  // --- CHART COMPUTATIONS ---
  // 1. 7-Day Data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const weeklyChartData = last7Days.map(dateStr => {
    const daySales = sales.filter(s => s.createdAt.startsWith(dateStr));
    const dayExpenses = expenses.filter(e => {
      const parsedDate = new Date(e.date + 'T00:00:00');
      const expDateStr = isNaN(parsedDate.getTime()) ? new Date(e.createdAt).toISOString().split('T')[0] : e.date;
      return expDateStr === dateStr;
    });

    const revenue = daySales.reduce((sum, item) => sum + item.total, 0);
    const expense = dayExpenses.reduce((sum, item) => sum + item.amount, 0);

    const dateObj = new Date(dateStr + 'T00:00:00');
    const label = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    return { label, revenue, expense, key: dateStr };
  });

  // 2. 30-Day Data (grouped into 6 consecutive 5-day intervals)
  const thirtyDaysChartData = useMemo(() => {
    const intervals = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const startD = new Date(now);
      startD.setDate(startD.getDate() - (i * 5 + 4));
      const endD = new Date(now);
      endD.setDate(endD.getDate() - (i * 5));

      const sStr = startD.toISOString().split('T')[0];
      const eStr = endD.toISOString().split('T')[0];

      const periodSales = sales.filter(s => {
        const d = s.createdAt.split('T')[0];
        return d >= sStr && d <= eStr;
      });
      const periodExpenses = expenses.filter(e => {
        const d = e.date || (e.createdAt ? e.createdAt.split('T')[0] : '');
        return d >= sStr && d <= eStr;
      });

      const revenue = periodSales.reduce((sum, item) => sum + item.total, 0);
      const expense = periodExpenses.reduce((sum, item) => sum + item.amount, 0);
      const label = `${startD.getDate()}/${startD.getMonth() + 1}`;

      intervals.push({ label, revenue, expense, key: `${sStr}-${eStr}` });
    }
    return intervals;
  }, [sales, expenses]);

  // 3. 6-Month Data
  const monthlyChartDataComputed = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${monthNames[month]} '${String(year).slice(-2)}`;

      const mSales = sales.filter(s => {
        const sDate = new Date(s.createdAt);
        return sDate.getFullYear() === year && sDate.getMonth() === month;
      });
      const mExpenses = expenses.filter(e => {
        const parsedDate = new Date(e.date + 'T00:00:00');
        const eDate = isNaN(parsedDate.getTime()) ? new Date(e.createdAt) : parsedDate;
        return eDate.getFullYear() === year && eDate.getMonth() === month;
      });

      const revenue = mSales.reduce((sum, item) => sum + item.total, 0);
      const expense = mExpenses.reduce((sum, item) => sum + item.amount, 0);

      months.push({ label, revenue, expense, key: `${year}-${month}` });
    }
    return months;
  }, [sales, expenses]);

  const activeChartData = chartTimeframe === '7days' 
    ? weeklyChartData 
    : chartTimeframe === '30days' 
      ? thirtyDaysChartData 
      : monthlyChartDataComputed;

  const maxVal = Math.max(...activeChartData.map(d => Math.max(d.revenue, d.expense)), 100);

  // Period totals for the chart view
  const periodTotalRevenue = activeChartData.reduce((sum, d) => sum + d.revenue, 0);
  const periodTotalExpense = activeChartData.reduce((sum, d) => sum + d.expense, 0);
  const periodNetMargin = periodTotalRevenue - periodTotalExpense;

  // Recent sales list (sorted newest first)
  const recentSales = useMemo(() => {
    let list = [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (recentSalesFilter !== 'all') {
      list = list.filter(s => s.paymentMethod === recentSalesFilter);
    }
    return list.slice(0, 7);
  }, [sales, recentSalesFilter]);

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-24 md:pb-12 text-slate-900">
      {/* Active Branch Selector (if multi-branch) */}
      {isOwnerOrAdmin && branches.length > 0 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs font-bold text-slate-700">Filter Branch:</span>
          <select
            value={dashboardBranchId}
            onChange={(e) => setDashboardBranchId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold cursor-pointer outline-none"
          >
            <option value="All">All Branches (Consolidated)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* COMMAND CENTER: USER-FRIENDLY QUICK ACTIONS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Quick Actions &amp; Workflows
          </h2>
          <span className="text-xs text-slate-400">1-click task launch</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* New Sale (POS) */}
          <button
            type="button"
            onClick={() => onNavigate('POS')}
            className="p-4 bg-white hover:bg-emerald-50/50 border border-slate-200/90 hover:border-emerald-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group active:scale-98 min-h-[104px]"
          >
            <div className="h-11 w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700">New Sale</p>
              <p className="text-[10px] text-slate-500 mt-0.5">POS Checkout</p>
            </div>
          </button>

          {/* Add / Manage Products */}
          {canAddProduct && (
            <button
              type="button"
              onClick={() => onNavigate('Products')}
              className="p-4 bg-white hover:bg-indigo-50/50 border border-slate-200/90 hover:border-indigo-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group active:scale-98 min-h-[104px]"
            >
              <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-700">Add Product</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Inventory Catalog</p>
              </div>
            </button>
          )}

          {/* View Sales & Receipts */}
          <button
            type="button"
            onClick={() => onNavigate('Sales')}
            className="p-4 bg-white hover:bg-sky-50/50 border border-slate-200/90 hover:border-sky-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group active:scale-98 min-h-[104px]"
          >
            <div className="h-11 w-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 group-hover:scale-105 transition-transform">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="font-extrabold text-xs text-slate-900 group-hover:text-sky-700">Sales History</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Receipts &amp; Audits</p>
            </div>
          </button>

          {/* Settle Customer Debts */}
          {canAccessReceivables && (
            <button
              type="button"
              onClick={() => onNavigate('Accounts Receivable')}
              className="p-4 bg-white hover:bg-rose-50/50 border border-slate-200/90 hover:border-rose-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group active:scale-98 min-h-[104px]"
            >
              <div className="h-11 w-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-xs text-slate-900 group-hover:text-rose-700">Receivables</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {debtorCount > 0 ? `${debtorCount} Debts Owed` : 'Settle Debts'}
                </p>
              </div>
            </button>
          )}

          {/* Customers Directory */}
          {canManageCustomers && (
            <button
              type="button"
              onClick={() => onNavigate('Customers')}
              className="p-4 bg-white hover:bg-purple-50/50 border border-slate-200/90 hover:border-purple-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group active:scale-98 min-h-[104px]"
            >
              <div className="h-11 w-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-xs text-slate-900 group-hover:text-purple-700">Customers</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Profiles &amp; CRM</p>
              </div>
            </button>
          )}

          {/* Expenses / Reports */}
          {canAccessExpenses ? (
            <button
              type="button"
              onClick={() => onNavigate('Expenses')}
              className="p-4 bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group active:scale-98 min-h-[104px]"
            >
              <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-xs text-slate-900 group-hover:text-amber-700">Record Expense</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Operating Outflows</p>
              </div>
            </button>
          ) : canViewReports ? (
            <button
              type="button"
              onClick={() => onNavigate('Reports')}
              className="p-4 bg-white hover:bg-slate-100 border border-slate-200/90 rounded-2xl shadow-xs flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group active:scale-98 min-h-[104px]"
            >
              <div className="h-11 w-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 group-hover:scale-105 transition-transform">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-xs text-slate-900">Reports</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Financial Audits</p>
              </div>
            </button>
          ) : null}
        </div>
      </section>

      {/* 3. TODAY'S PERFORMANCE KPIS (CLEAN, NO STATIC PILL SLOP) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Today's Financial Overview
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Direct ledger sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Gross Sales */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {formatCurrency(todaySalesSum, business.currency)}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                {todaySalesCount} {todaySalesCount === 1 ? 'sale' : 'sales'} · {todayItemsSold} {todayItemsSold === 1 ? 'item' : 'items'}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                Avg: {formatCurrency(avgBasketSize, business.currency)}
              </span>
            </div>
          </div>

          {/* Card 2: Net Daily Profit & Margin */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Daily Margin</span>
                <p className={`text-2xl sm:text-3xl font-black mt-1 ${todayNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(todayNetProfit, business.currency)}
                </p>
              </div>
              <div className={`p-3 rounded-xl border ${todayNetProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                {todayNetProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                After COGS &amp; Expenses
              </span>
              <span className="font-bold text-slate-700">
                {todaySalesSum > 0 ? `${todayMarginPercent}% margin` : '7d: ' + formatCurrency(weeklyProfit, business.currency)}
              </span>
            </div>
          </div>

          {/* Card 3: Outstanding Receivables / Customer Credit */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Receivables</span>
                <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">
                  {formatCurrency(totalReceivables, business.currency)}
                </p>
              </div>
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                {debtorCount > 0 ? `${debtorCount} customers owe` : 'All customer tabs settled'}
              </span>
              {canAccessReceivables && (
                <button 
                  onClick={() => onNavigate('Accounts Receivable')}
                  className="font-bold text-rose-700 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                >
                  Collect <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Card 4: Inventory & Stock Alerts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catalog &amp; Stock</span>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {products.length} <span className="text-sm font-semibold text-slate-400">items</span>
                </p>
              </div>
              <div className={`p-3 rounded-xl border ${lowStockItems.length > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                <Package className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              {lowStockItems.length > 0 ? (
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {lowStockItems.length} low stock {outOfStockCount > 0 && `(${outOfStockCount} out)`}
                </span>
              ) : (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Healthy inventory levels
                </span>
              )}
              {canAddProduct && (
                <button 
                  onClick={() => onNavigate('Products')}
                  className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                >
                  Catalog <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. TODAY'S PAYMENT BREAKDOWN & CASH REGISTER BALANCE */}
      <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              Today's Tender Breakdown &amp; Register Reconciliation
            </h3>
            <p className="text-xs text-slate-500">
              Instant breakdown of collections across physical cash, mobile money wallets, and cards
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Inflow Today</span>
            <span className="text-base font-black text-slate-900 font-mono">
              {formatCurrency(todaySalesSum, business.currency)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Cash */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Physical Cash
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {todaySalesSum > 0 ? `${Math.round((todayCash / todaySalesSum) * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-lg font-black text-slate-900 font-mono">
              {formatCurrency(todayCash, business.currency)}
            </p>
          </div>

          {/* Mobile Money */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-sky-600" /> Mobile Money (MoMo)
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {todaySalesSum > 0 ? `${Math.round((todayMomo / todaySalesSum) * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-lg font-black text-slate-900 font-mono">
              {formatCurrency(todayMomo, business.currency)}
            </p>
          </div>

          {/* Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-indigo-600" /> Card Payments
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {todaySalesSum > 0 ? `${Math.round((todayCard / todaySalesSum) * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-lg font-black text-slate-900 font-mono">
              {formatCurrency(todayCard, business.currency)}
            </p>
          </div>

          {/* Credit tabs */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Customer Credit
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {todaySalesSum > 0 ? `${Math.round((todayCredit / todaySalesSum) * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-lg font-black text-slate-900 font-mono">
              {formatCurrency(todayCredit, business.currency)}
            </p>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE FINANCIAL PERFORMANCE VISUALIZER */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column (2 Cols on desktop) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4 select-none">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" /> Cash Flow Dynamics
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparison of gross revenue inflow against operational expenses
                </p>
              </div>
              
              {/* Interactive Segmented Control Buttons */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setChartTimeframe('7days')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartTimeframe === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setChartTimeframe('30days')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartTimeframe === '30days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  30 Days
                </button>
                <button
                  type="button"
                  onClick={() => setChartTimeframe('6months')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    chartTimeframe === '6months' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  6 Months
                </button>
              </div>
            </div>

            {/* Interactive Tooltip & Legends */}
            <div className="h-9 mb-3 flex items-center justify-between select-none px-1">
              {hoveredBar ? (
                <div className="text-xs flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1 rounded-lg">
                  <span className="font-bold">{hoveredBar.label}</span>
                  <span aria-hidden="true" className="text-slate-400">·</span>
                  <span className={`font-mono font-bold ${hoveredBar.type === 'revenue' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {hoveredBar.type === 'revenue' ? 'Revenue' : 'Expense'}: {formatCurrency(hoveredBar.value, business.currency)}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Hover or touch bars to inspect exact period figures</p>
              )}

              {/* Legends */}
              <div className="flex gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Revenue
                </span>
                <span className="flex items-center gap-1.5 text-rose-800">
                  <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Expenses
                </span>
              </div>
            </div>

            {/* Responsive SVG Chart */}
            <div className="relative min-h-[220px]">
              <svg viewBox="0 0 600 220" className="w-full h-full overflow-visible">
                <line x1="45" y1="20" x2="580" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="45" y1="70" x2="580" y2="70" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="45" y1="120" x2="580" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="45" y1="170" x2="580" y2="170" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="45" y1="190" x2="580" y2="190" stroke="#CBD5E1" strokeWidth="1.5" />

                <text x="38" y="24" textAnchor="end" fill="#64748B" className="text-[10px] font-mono font-medium">{getCurrencySymbol(business.currency)} {Math.round(maxVal)}</text>
                <text x="38" y="104" textAnchor="end" fill="#64748B" className="text-[10px] font-mono font-medium">{getCurrencySymbol(business.currency)} {Math.round(maxVal / 2)}</text>
                <text x="38" y="194" textAnchor="end" fill="#64748B" className="text-[10px] font-mono font-medium">{getCurrencySymbol(business.currency)} 0</text>

                {activeChartData.map((data, idx) => {
                  const totalPoints = activeChartData.length;
                  const columnSpacing = 535 / totalPoints;
                  const groupCenterX = 45 + idx * columnSpacing + columnSpacing / 2;

                  const barWidth = Math.min(18, columnSpacing * 0.28);
                  const revHeight = (data.revenue / maxVal) * 160;
                  const revY = 190 - revHeight;

                  const expHeight = (data.expense / maxVal) * 160;
                  const expY = 190 - expHeight;

                  return (
                    <g key={data.key || idx}>
                      <rect
                        x={groupCenterX - columnSpacing / 2}
                        y="10"
                        width={columnSpacing}
                        height="180"
                        fill="transparent"
                        className="hover:fill-slate-50 transition-colors cursor-pointer"
                      />

                      {/* Revenue Bar */}
                      <rect
                        x={groupCenterX - barWidth - 2}
                        y={revY}
                        width={barWidth}
                        height={Math.max(revHeight, 2)}
                        rx="3"
                        fill={hoveredBar?.index === idx && hoveredBar?.type === 'revenue' ? '#047857' : '#059669'}
                        className="transition duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredBar({ index: idx, type: 'revenue', value: data.revenue, label: data.label })}
                        onMouseLeave={() => setHoveredBar(null)}
                      />

                      {/* Expense Bar */}
                      <rect
                        x={groupCenterX + 2}
                        y={expY}
                        width={barWidth}
                        height={Math.max(expHeight, 2)}
                        rx="3"
                        fill={hoveredBar?.index === idx && hoveredBar?.type === 'expense' ? '#BE123C' : '#E11D48'}
                        className="transition duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredBar({ index: idx, type: 'expense', value: data.expense, label: data.label })}
                        onMouseLeave={() => setHoveredBar(null)}
                      />

                      <text
                        x={groupCenterX}
                        y="210"
                        textAnchor="middle"
                        fill="#64748B"
                        className="text-[11px] font-bold"
                      >
                        {data.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Period Summary Footnote */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Period Revenue</span>
              <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">
                {formatCurrency(periodTotalRevenue, business.currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Period Expenses</span>
              <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">
                {formatCurrency(periodTotalExpense, business.currency)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Balance</span>
              <span className={`text-sm font-black font-mono mt-0.5 block ${periodNetMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(periodNetMargin, business.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Stock & Low Inventory Watchlist */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Watchlist
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {lowStockItems.length > 0 ? (
              <div className="divide-y divide-slate-100 mt-2 max-h-[300px] overflow-y-auto">
                {lowStockItems.slice(0, 6).map(item => {
                  const threshold = item.lowStockThreshold || business.defaultLowStockThreshold || 5;
                  const ratio = Math.min(100, Math.max(0, (item.stockQuantity / threshold) * 100));
                  const isOut = item.stockQuantity <= 0;

                  return (
                    <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                      <div className="min-w-0 pr-3 flex-1">
                        <p className="font-bold text-slate-900 truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span>SKU: {item.barcode || '—'}</span>
                          <span aria-hidden="true">·</span>
                          <span>Price: {formatCurrency(item.sellingPrice, business.currency)}</span>
                        </div>
                        {/* Visual stock bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isOut ? 'bg-rose-500' : 'bg-amber-500'}`} 
                            style={{ width: `${Math.max(5, ratio)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className={`font-mono font-bold text-xs ${isOut ? 'text-rose-700' : 'text-amber-700'}`}>
                          {item.stockQuantity} in stock
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Min: {threshold}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-14 text-center text-slate-400 text-xs">
                <CheckCircle2 className="h-9 w-9 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-sm">All products fully stocked</p>
                <p className="text-xs text-slate-500 mt-1">No items currently below restock thresholds.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('Products')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs text-center transition cursor-pointer border border-slate-200/80"
            >
              Open Inventory Catalog &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 6. LIVE RECENT ACTIVITY & TRANSACTIONS FEED */}
      <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" /> Recent Sales Journal
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time audit log of customer checkouts and transactions
            </p>
          </div>

          {/* Payment filter segmented buttons (Light theme) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setRecentSalesFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                recentSalesFilter === 'all' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setRecentSalesFilter('cash')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                recentSalesFilter === 'cash' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setRecentSalesFilter('mobile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                recentSalesFilter === 'mobile' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              MoMo
            </button>
            <button
              type="button"
              onClick={() => setRecentSalesFilter('card')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                recentSalesFilter === 'card' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Card
            </button>
            <button
              type="button"
              onClick={() => setRecentSalesFilter('credit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                recentSalesFilter === 'credit' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Credit
            </button>
          </div>
        </div>

        {recentSales.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentSales.map(sale => {
              const saleDate = new Date(sale.createdAt);
              const formattedTime = saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const formattedDate = saleDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
              const itemsCount = (sale.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

              return (
                <div 
                  key={sale.id}
                  onClick={() => setSelectedSaleForView(sale)}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 rounded-xl transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center shrink-0 transition-colors">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-slate-900 truncate">
                          {sale.customerName || 'Walk-in Customer'}
                        </p>
                        <span className="text-[10px] font-mono text-slate-400">
                          #{sale.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="capitalize">{sale.paymentMethod}</span>
                        <span aria-hidden="true">·</span>
                        <span>{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formattedDate}, {formattedTime}</span>
                        {sale.cashierName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Cashier: {sale.cashierName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-mono font-black text-sm text-slate-900">
                        {formatCurrency(sale.total, business.currency)}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {sale.paymentStatus || 'Completed'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSaleForView(sale);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Inspect Receipt Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No sales recorded yet</p>
            <p className="text-slate-400 mt-1 max-w-sm mx-auto">
              Launch the point of sale checkout terminal to record your first sale of the day.
            </p>
            <button
              onClick={() => onNavigate('POS')}
              className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <ShoppingCart className="h-3.5 w-3.5" /> Start POS Checkout
            </button>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Total recorded transactions: {sales.length}
          </span>
          <button
            onClick={() => onNavigate('Sales')}
            className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            Open Complete Sales Register <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* 7. ONE-CLICK CSV DATA EXPORT HUB */}
      <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Export Business Records &amp; Ledgers
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Download clean CSV spreadsheets for accounting, audit, and tax filing
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">CSV / Excel</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => exportSalesToCSV(sales, business.name)}
            className="p-3.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 rounded-2xl text-left transition cursor-pointer group"
          >
            <p className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700 truncate">Sales Journal</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Receipts &amp; Inflows</p>
          </button>

          <button
            type="button"
            onClick={() => exportProductsToCSV(products, business.name)}
            className="p-3.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 rounded-2xl text-left transition cursor-pointer group"
          >
            <p className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700 truncate">Inventory Valuation</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Stock &amp; Cost Prices</p>
          </button>

          <button
            type="button"
            onClick={() => exportCustomersToCSV(rawCustomers, business.name)}
            className="p-3.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 rounded-2xl text-left transition cursor-pointer group"
          >
            <p className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700 truncate">Customer Directory</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Balances &amp; Contacts</p>
          </button>

          <button
            type="button"
            onClick={() => exportExpensesToCSV(expenses, business.name)}
            className="p-3.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 rounded-2xl text-left transition cursor-pointer group"
          >
            <p className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700 truncate">Expense Ledger</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Operating Outflows</p>
          </button>
        </div>
      </section>

      {/* 8. QUICK SALE DETAILS / RECEIPT INSPECTION MODAL */}
      {selectedSaleForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-black text-base text-slate-900">Receipt Details</h4>
                <p className="text-xs text-slate-400 font-mono">
                  #{selectedSaleForView.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleForView(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Customer</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedSaleForView.customerName || 'Walk-in Customer'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</span>
                  <p className="font-bold text-slate-900 mt-0.5 capitalize">
                    {selectedSaleForView.paymentMethod}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Date &amp; Time</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {new Date(selectedSaleForView.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cashier</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedSaleForView.cashierName || 'Staff'}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase grid grid-cols-12">
                  <span className="col-span-7">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-3 text-right">Total</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {(selectedSaleForView.items || []).map((item, i) => (
                    <div key={i} className="px-3 py-2 grid grid-cols-12 items-center text-xs">
                      <span className="col-span-7 font-bold text-slate-900 truncate">{item.name}</span>
                      <span className="col-span-2 text-center font-mono text-slate-500">{item.quantity}</span>
                      <span className="col-span-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.price * item.quantity, business.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="pt-2 space-y-1.5 border-t border-slate-100">
                {selectedSaleForView.discount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Discount Applied</span>
                    <span className="font-mono text-rose-600 font-bold">
                      -{formatCurrency(selectedSaleForView.discount, business.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                  <span>Grand Total</span>
                  <span className="font-mono text-emerald-700">
                    {formatCurrency(selectedSaleForView.total, business.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setSelectedSaleForView(null);
                  onNavigate('Sales');
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer text-center shadow-xs"
              >
                Open in Full Sales Register
              </button>
              <button
                onClick={() => setSelectedSaleForView(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
