/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { User, Business } from '../types';
import { 
  DollarSign, Package, AlertTriangle, ArrowUpRight, 
  TrendingUp, TrendingDown, ShoppingBag, Plus, Sparkles,
  FileDown, Calendar, CreditCard, Layers, BarChart3, Database, ChevronRight,
  Truck, Users, Settings, Receipt, PlusCircle, ArrowDownLeft,
  ShoppingCart, Store, Building2, Bell, CheckCircle2, Clock
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

  const branches = db.getBranches(business.id);

  // Fetch isolated tenant data directly from source of truth
  const rawProducts = db.getProducts(business.id);
  const services = db.getServices(business.id);
  const rawSales = db.getSales(business.id).filter(s => s.status === 'completed');
  const rawExpenses = db.getExpenses(business.id);
  const rawCustomers = db.getCustomers(business.id);

  const products = rawProducts.filter(p => dashboardBranchId === 'All' || p.branchId === dashboardBranchId);
  const sales = rawSales.filter(s => dashboardBranchId === 'All' || s.branchId === dashboardBranchId);
  const expenses = rawExpenses.filter(e => dashboardBranchId === 'All' || e.branchId === dashboardBranchId);

  // Receivables computation (debts owed by customers)
  const debtors = rawCustomers.filter(c => c.balance < 0);
  const totalReceivables = debtors.reduce((sum, c) => sum + Math.abs(c.balance), 0);
  const debtorCount = debtors.length;

  // States for interactive charts
  const [chartTimeframe, setChartTimeframe] = useState<'7days' | '6months'>('7days');
  const [hoveredBar, setHoveredBar] = useState<{ index: number; type: 'revenue' | 'expense'; value: number; label: string } | null>(null);

  // Calculate metrics for today
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
  const todaySalesSum = todaySales.reduce((acc, curr) => acc + curr.total, 0);
  const todaySalesCount = todaySales.length;
  
  const totalSalesSum = sales.reduce((acc, curr) => acc + curr.total, 0);
  const totalExpensesSum = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Calculate COGS (Cost of Goods Sold)
  let totalCOGS = 0;
  sales.forEach(s => {
    s.items.forEach(item => {
      if (item.type === 'product') {
        const p = rawProducts.find(prod => prod.id === item.itemId);
        if (p && p.costPrice) {
          totalCOGS += item.quantity * p.costPrice;
        }
      }
    });
  });

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
      s.items.forEach(item => {
        if (item.type === 'product') {
          const p = rawProducts.find(prod => prod.id === item.itemId);
          if (p && p.costPrice) {
            pCOGS += item.quantity * p.costPrice;
          }
        }
      });
    });

    const pGross = pSalesSum - pCOGS;
    return pGross - pExpensesSum;
  };

  const todayProfit = getProfitForPeriod(1);
  const weeklyProfit = getProfitForPeriod(7);

  const lowStockItems = products.filter(p => {
    const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5;
    return p.stockQuantity <= threshold;
  });

  // Permissions
  const canAccessReceivables = ['owner', 'manager', 'admin', 'SUPER_ADMIN', 'accountant'].includes(user.role) || (user.permissions && user.permissions.includes('Accounts Receivable'));
  const canAddProduct = ['owner', 'manager', 'admin', 'SUPER_ADMIN', 'inventory_staff', 'pos_inventory_staff'].includes(user.role) || (user.permissions && user.permissions.includes('Products'));
  const canManageCustomers = ['owner', 'manager', 'admin', 'SUPER_ADMIN', 'cashier'].includes(user.role) || (user.permissions && user.permissions.includes('Customers'));

  // --- CHART COMPUTATIONS ---
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

  const monthlyChartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
    };
  }).reverse();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthlyChartDataComputed = monthlyChartData.map(({ year, month }) => {
    const label = `${monthNames[month]} ${String(year).slice(-2)}`;
    
    const monthSales = sales.filter(s => {
      const sDate = new Date(s.createdAt);
      return sDate.getFullYear() === year && sDate.getMonth() === month;
    });
    
    const monthExpenses = expenses.filter(e => {
      const parsedDate = new Date(e.date + 'T00:00:00');
      const eDate = isNaN(parsedDate.getTime()) ? new Date(e.createdAt) : parsedDate;
      return eDate.getFullYear() === year && eDate.getMonth() === month;
    });

    const revenue = monthSales.reduce((sum, item) => sum + item.total, 0);
    const expense = monthExpenses.reduce((sum, item) => sum + item.amount, 0);

    return { label, revenue, expense, key: `${year}-${month}` };
  });

  const activeChartData = chartTimeframe === '7days' ? weeklyChartData : monthlyChartDataComputed;
  const maxVal = Math.max(...activeChartData.map(d => Math.max(d.revenue, d.expense)), 100);

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto pb-24 md:pb-10">
      {/* 1. Mobile & Tablet Welcome Card - Clean Blue Theme */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 sm:p-7 text-white relative overflow-hidden shadow-sm">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Store className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/40 text-blue-100 text-[10px] font-bold tracking-wider uppercase border border-blue-400/30">
                {business.category || business.businessType || 'Enterprise'}
              </span>
              <span className="text-[10px] font-mono text-blue-200">
                BOS-{business.id.slice(2).toUpperCase()}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
              Welcome back, {user.name}
            </h2>

            <p className="text-blue-100 text-xs sm:text-sm max-w-xl leading-relaxed">
              Operating <strong className="text-white">{business.name}</strong> as <span className="uppercase font-bold text-blue-200">{user.role}</span>.
            </p>
          </div>

          {/* Branch filter dropdown for owner/admin */}
          {isOwnerOrAdmin && branches.length > 0 && (
            <div className="bg-blue-800/40 p-3 sm:p-4 rounded-2xl border border-blue-400/20 backdrop-blur-sm shrink-0 min-w-[200px] space-y-1.5">
              <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider">
                Store Branch
              </label>
              <select
                value={dashboardBranchId}
                onChange={(e) => setDashboardBranchId(e.target.value)}
                className="block w-full px-3 py-2 bg-blue-900/80 border border-blue-400/40 rounded-xl text-xs text-white font-bold cursor-pointer transition focus:ring-1 focus:ring-blue-300 focus:outline-none"
              >
                <option value="All">All Branches (Consolidated)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 2. QUICK ACTIONS SECTION - Large Touch-Friendly Buttons */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Quick Actions
          </h3>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
            Tap to open action
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* New Sale (POS) */}
          <button
            onClick={() => onNavigate('POS')}
            className="p-4 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group active:scale-95 min-h-[96px]"
          >
            <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600">New Sale</p>
              <p className="text-[10px] text-slate-400">POS Checkout</p>
            </div>
          </button>

          {/* Add Product */}
          {canAddProduct && (
            <button
              onClick={() => onNavigate('Products')}
              className="p-4 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group active:scale-95 min-h-[96px]"
            >
              <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600">Add Product</p>
                <p className="text-[10px] text-slate-400">Stock Catalog</p>
              </div>
            </button>
          )}

          {/* View Sales */}
          <button
            onClick={() => onNavigate('Sales')}
            className="p-4 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group active:scale-95 min-h-[96px]"
          >
            <div className="h-11 w-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 group-hover:scale-105 transition-transform">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600">View Sales</p>
              <p className="text-[10px] text-slate-400">Receipts & Logs</p>
            </div>
          </button>

          {/* Add Customer */}
          {canManageCustomers && (
            <button
              onClick={() => onNavigate('Customers')}
              className="p-4 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group active:scale-95 min-h-[96px]"
            >
              <div className="h-11 w-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600">Customers</p>
                <p className="text-[10px] text-slate-400">Directory & CRM</p>
              </div>
            </button>
          )}

          {/* Receive Payment / Debts */}
          {canAccessReceivables && (
            <button
              onClick={() => onNavigate('Accounts Receivable')}
              className="p-4 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group active:scale-95 min-h-[96px]"
            >
              <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600">Receive Payment</p>
                <p className="text-[10px] text-slate-400">Settle Debts</p>
              </div>
            </button>
          )}

          {/* View Receivables */}
          {canAccessReceivables && (
            <button
              onClick={() => onNavigate('Accounts Receivable')}
              className="p-4 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group active:scale-95 min-h-[96px]"
            >
              <div className="h-11 w-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600">Receivables</p>
                <p className="text-[10px] text-slate-400">Track Balances</p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* 3. PRIMARY BUSINESS METRICS (5 RESPONSIVE CARDS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Today's Business Overview
          </h3>
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            Live Records
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Today's Sales */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Sales</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {formatCurrency(todaySalesSum, business.currency)}
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              {todaySalesCount > 0 ? (
                <>
                  <span className="text-slate-500 font-medium">{todaySalesCount} orders today</span>
                  <button 
                    onClick={() => onNavigate('Sales')}
                    className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                  >
                    View <ArrowUpRight className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <span className="text-slate-400 font-medium italic">No sales yet today</span>
              )}
            </div>
          </div>

          {/* 2. Number of Transactions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transactions</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {todaySalesCount}
                </p>
              </div>
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                <Receipt className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">All-time: {sales.length}</span>
              <button 
                onClick={() => onNavigate('POS')}
                className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                Checkout <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 3. Products / Stock */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catalog & Stock</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {products.length} <span className="text-xs font-semibold text-slate-400">Items</span>
                </p>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Package className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              {lowStockItems.length > 0 ? (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  {lowStockItems.length} low stock
                </span>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Healthy stock
                </span>
              )}
              {canAddProduct && (
                <button 
                  onClick={() => onNavigate('Products')}
                  className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                >
                  Manage <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* 4. Outstanding Receivables */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receivables</span>
                <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                  {formatCurrency(totalReceivables, business.currency)}
                </p>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                {debtorCount > 0 ? `${debtorCount} customers owe` : 'All tabs settled'}
              </span>
              {canAccessReceivables && (
                <button 
                  onClick={() => onNavigate('Accounts Receivable')}
                  className="font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
                >
                  Collect <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* 5. Today's Profit */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Profit</span>
                <p className={`text-xl sm:text-2xl font-black mt-1 ${todayProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(todayProfit, business.currency)}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Net daily margin</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {todaySalesCount > 0 ? `${formatCurrency(weeklyProfit, business.currency)} (7d)` : '—'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Empty State for Today's Sales if 0 */}
      {todaySalesCount === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 text-center shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-slate-800">
            No sales yet today
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Start a new transaction at the point of sale terminal to record your first checkout.
          </p>
          <button
            onClick={() => onNavigate('POS')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Open POS Terminal</span>
          </button>
        </div>
      )}

      {/* 5. INTERACTIVE ANALYTICS CHARTS SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Grouped Column Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4 select-none">
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-blue-600" /> Revenue & Expenses
              </h4>
              <p className="text-xs text-slate-400">Comparing gross cashflow income against expenses</p>
            </div>
            
            {/* Chart controls */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setChartTimeframe('7days')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartTimeframe === '7days' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setChartTimeframe('6months')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartTimeframe === '6months' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                6 Months
              </button>
            </div>
          </div>

          {/* Interactive Tooltip Display */}
          <div className="h-8 mb-2 flex items-center justify-between select-none px-2">
            {hoveredBar ? (
              <div className="text-xs flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                <span className="font-bold text-slate-700">{hoveredBar.label}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span className={`font-bold ${hoveredBar.type === 'revenue' ? 'text-blue-600' : 'text-rose-600'}`}>
                  {hoveredBar.type.toUpperCase()}: {formatCurrency(hoveredBar.value, business.currency)}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium">Tap or hover over bars to view values</p>
            )}

            {/* Legends */}
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Expenses
              </span>
            </div>
          </div>

          {/* Responsive SVG Container */}
          <div className="relative flex-1 min-h-[200px]">
            <svg viewBox="0 0 600 220" className="w-full h-full overflow-visible">
              <line x1="40" y1="20" x2="580" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="70" x2="580" y2="70" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="120" x2="580" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="170" x2="580" y2="170" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="190" x2="580" y2="190" stroke="#E2E8F0" strokeWidth="1.5" />

              <text x="32" y="24" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{getCurrencySymbol(business.currency)} {(maxVal).toFixed(0)}</text>
              <text x="32" y="104" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{getCurrencySymbol(business.currency)} {(maxVal / 2).toFixed(0)}</text>
              <text x="32" y="194" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{getCurrencySymbol(business.currency)} 0</text>

              {activeChartData.map((data, idx) => {
                const totalPoints = activeChartData.length;
                const columnSpacing = 540 / totalPoints;
                const groupCenterX = 40 + idx * columnSpacing + columnSpacing / 2;

                const barWidth = Math.min(16, columnSpacing * 0.25);
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
                      className="hover:fill-slate-50/40 transition-colors duration-150 cursor-pointer"
                    />

                    {/* Revenue Bar */}
                    <rect
                      x={groupCenterX - barWidth - 2}
                      y={revY}
                      width={barWidth}
                      height={Math.max(revHeight, 2)}
                      rx="3"
                      fill={hoveredBar?.index === idx && hoveredBar?.type === 'revenue' ? '#1D4ED8' : '#2563EB'}
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
                      fill={hoveredBar?.index === idx && hoveredBar?.type === 'expense' ? '#BE123C' : '#F43F5E'}
                      className="transition duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredBar({ index: idx, type: 'expense', value: data.expense, label: data.label })}
                      onMouseLeave={() => setHoveredBar(null)}
                    />

                    <text
                      x={groupCenterX}
                      y="210"
                      textAnchor="middle"
                      fill="#64748B"
                      className="text-[10px] font-bold"
                    >
                      {data.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Low Stock Safeguard Card */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Alerts
              </h4>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                {lowStockItems.length} Critical
              </span>
            </div>

            {lowStockItems.length > 0 ? (
              <div className="divide-y divide-slate-100 mt-2 max-h-64 overflow-y-auto">
                {lowStockItems.slice(0, 5).map(item => (
                  <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Price: {formatCurrency(item.sellingPrice, business.currency)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-100">
                        {item.stockQuantity} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700">All products in stock</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No immediate restock required.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate('Products')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs text-center transition cursor-pointer border border-slate-200/60"
            >
              Manage Catalog Items &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* 6. CSV Data Export Hub */}
      <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Export Business Records
          </h4>
          <span className="text-[10px] text-slate-400">CSV Downloads</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => exportSalesToCSV(sales, business.name)}
            className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/60 hover:border-blue-200 rounded-xl text-left transition cursor-pointer group"
          >
            <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600 truncate">Sales Journal</p>
            <p className="text-[10px] text-slate-400">Receipts & totals</p>
          </button>

          <button
            onClick={() => exportProductsToCSV(products, business.name)}
            className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/60 hover:border-blue-200 rounded-xl text-left transition cursor-pointer group"
          >
            <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600 truncate">Product Inventory</p>
            <p className="text-[10px] text-slate-400">Stock & pricing</p>
          </button>

          <button
            onClick={() => exportCustomersToCSV(rawCustomers, business.name)}
            className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/60 hover:border-blue-200 rounded-xl text-left transition cursor-pointer group"
          >
            <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600 truncate">Customer Roll</p>
            <p className="text-[10px] text-slate-400">Balances & contacts</p>
          </button>

          <button
            onClick={() => exportExpensesToCSV(expenses, business.name)}
            className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/60 hover:border-blue-200 rounded-xl text-left transition cursor-pointer group"
          >
            <p className="font-bold text-xs text-slate-800 group-hover:text-blue-600 truncate">Expense Ledger</p>
            <p className="text-[10px] text-slate-400">Operating costs</p>
          </button>
        </div>
      </section>
    </div>
  );
}
