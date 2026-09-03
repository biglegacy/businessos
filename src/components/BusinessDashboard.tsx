/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { User, Business } from '../types';
import { 
  DollarSign, Package, AlertTriangle, ArrowUpRight, 
  TrendingUp, TrendingDown, ShoppingBag, Plus, Sparkles,
  FileDown, Calendar, CreditCard, Layers, BarChart3, Database, ChevronRight,
  Truck, Users, Settings, Receipt, PlusCircle
} from 'lucide-react';
import { QuickActionPathways } from './QuickActionPathways';
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
  const initialBranchId = isOwnerOrAdmin ? 'All' : (user.branchId || 'All');
  const [dashboardBranchId, setDashboardBranchId] = useState<string>(initialBranchId);

  const branches = db.getBranches(business.id);

  // Fetch isolated tenant data
  const rawProducts = db.getProducts(business.id);
  const services = db.getServices(business.id);
  const rawSales = db.getSales(business.id).filter(s => s.status === 'completed');
  const rawExpenses = db.getExpenses(business.id);

  const products = rawProducts.filter(p => dashboardBranchId === 'All' || p.branchId === dashboardBranchId);
  const sales = rawSales.filter(s => dashboardBranchId === 'All' || s.branchId === dashboardBranchId);
  const expenses = rawExpenses.filter(e => dashboardBranchId === 'All' || e.branchId === dashboardBranchId);

  // States for interactive charts
  const [chartTimeframe, setChartTimeframe] = useState<'7days' | '6months'>('7days');
  const [hoveredBar, setHoveredBar] = useState<{ index: number; type: 'revenue' | 'expense'; value: number; label: string } | null>(null);

  // Calculate metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
  const todaySalesSum = todaySales.reduce((acc, curr) => acc + curr.total, 0);
  
  const totalSalesSum = sales.reduce((acc, curr) => acc + curr.total, 0);
  const totalIncomeSum = totalSalesSum; // Total Income corresponds to Total Sales
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

  const grossProfit = totalSalesSum - totalCOGS;
  const netProfit = grossProfit - totalExpensesSum;

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
  const monthlyProfit = getProfitForPeriod(30);
  const yearlyProfit = getProfitForPeriod(365);

  const lowStockItems = products.filter(p => {
    const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5;
    return p.stockQuantity <= threshold;
  });

  // --- CHART COMPUTATIONS ---
  
  // 1. Weekly Chart Data (Last 7 Days)
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

  // 2. Monthly Chart Data (Last 6 Months)
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

  // 3. Category Sales breakdown
  const categoryRevenueMap: Record<string, number> = {};
  let totalCategorySales = 0;
  sales.forEach(s => {
    s.items.forEach(item => {
      let cat = 'Other';
      if (item.type === 'product') {
        const p = products.find(prod => prod.id === item.itemId);
        if (p) cat = p.category;
      } else {
        const serv = services.find(sv => sv.id === item.itemId);
        if (serv) cat = serv.category;
      }
      categoryRevenueMap[cat] = (categoryRevenueMap[cat] || 0) + (item.price * item.quantity);
      totalCategorySales += (item.price * item.quantity);
    });
  });

  const topCategories = Object.entries(categoryRevenueMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalCategorySales > 0 ? (amount / totalCategorySales) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // 4. Payment method split
  const paymentMethodTotals = {
    cash: 0,
    card: 0,
    mobile: 0,
    other: 0
  };
  sales.forEach(s => {
    if (paymentMethodTotals[s.paymentMethod] !== undefined) {
      paymentMethodTotals[s.paymentMethod] += s.total;
    }
  });
  const totalPaymentSum = Object.values(paymentMethodTotals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-[#064E3B] to-[#032e23] rounded-3xl p-8 text-white relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Sparkles className="h-48 w-48 text-white rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-300 text-[10px] font-bold tracking-widest uppercase border border-emerald-700/30">
              Authorized Work Session
            </span>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome back, {user.name}
            </h2>
            <p className="text-emerald-100/90 max-w-xl text-sm leading-relaxed">
              You are managing <strong className="text-white font-semibold">{business.name}</strong> as an authorized <span className="underline decoration-emerald-500 underline-offset-4 font-bold uppercase text-emerald-400">{user.role}</span>. All operations are isolated and secured under Business ID: <code className="bg-emerald-950/40 px-2 py-0.5 rounded text-xs font-mono text-emerald-200">BOS-{business.id.slice(2).toUpperCase()}</code>.
            </p>
          </div>

          {/* Branch filter dropdown for owner/admin */}
          {['owner', 'admin', 'SUPER_ADMIN'].includes(user.role) && branches.length > 0 && (
            <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-700/20 backdrop-blur-sm shrink-0 min-w-[200px] space-y-2">
              <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                Select View / Branch
              </label>
              <select
                value={dashboardBranchId}
                onChange={(e) => setDashboardBranchId(e.target.value)}
                className="block w-full px-3 py-2 bg-emerald-900 border border-emerald-700/50 rounded-xl text-xs text-white font-bold cursor-pointer transition focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="All">All Branches (Consolidated)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {!['owner', 'admin', 'SUPER_ADMIN'].includes(user.role) && user.branchId && (
            <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-700/20 backdrop-blur-sm shrink-0">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">Assigned Branch</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-400" />
                {branches.find(b => b.id === user.branchId)?.name || 'Local Branch'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Pathways */}
      <QuickActionPathways business={business} onNavigate={onNavigate} />

      {/* Primary KPI Indicators */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#064E3B]" /> Comprehensive Financial Indicators
          </h3>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
            Live Calculations
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {/* 1. Total Sales */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalSalesSum, business.currency)}</h3>
              </div>
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{sales.length} transactions</span>
              <button onClick={() => onNavigate('POS')} className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">
                POS Terminal <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 2. Total Income */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Income</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalIncomeSum, business.currency)}</h3>
              </div>
              <div className="h-10 w-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-100">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Consolidated Receipts</span>
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" /> 100% Verified
              </span>
            </div>
          </div>

          {/* 3. Total Expenses */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalExpensesSum, business.currency)}</h3>
              </div>
              <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{expenses.length} ledger logs</span>
              <button onClick={() => onNavigate('Expenses')} className="font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5">
                Expenses Ledger <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 4. Today's Profit */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Profit</p>
                <h3 className={`text-2xl font-bold mt-1 ${todayProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(todayProfit, business.currency)}
                </h3>
              </div>
              <div className="h-10 w-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Last 24 Hours</span>
              <span className="text-slate-400 font-medium">Daily summary</span>
            </div>
          </div>

          {/* 5. Weekly Profit */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Profit</p>
                <h3 className={`text-2xl font-bold mt-1 ${weeklyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(weeklyProfit, business.currency)}
                </h3>
              </div>
              <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Last 7 Days</span>
              <span className="text-slate-400 font-medium">Weekly summary</span>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE ANALYTICS CHARTS SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SVG Grouped Column Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4 select-none">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="h-5 w-5 text-emerald-700" /> Financial Performance Curve
              </h4>
              <p className="text-xs text-slate-400">Comparing gross cashflow income against operational ledger costs</p>
            </div>
            
            {/* Chart controls */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setChartTimeframe('7days')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartTimeframe === '7days' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setChartTimeframe('6months')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartTimeframe === '6months' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                6 Months
              </button>
            </div>
          </div>

          {/* Interactive Tooltip Display */}
          <div className="h-8 mb-2 flex items-center justify-between select-none px-2">
            {hoveredBar ? (
              <div className="text-xs flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                <span className="font-bold text-slate-700">{hoveredBar.label}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span className={`font-bold flex items-center gap-1 ${hoveredBar.type === 'revenue' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {hoveredBar.type.toUpperCase()}: {formatCurrency(hoveredBar.value, business.currency)}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium">Hover over the bars to inspect granular statistics</p>
            )}

            {/* Legends */}
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Expenses
              </span>
            </div>
          </div>

          {/* Responsive SVG Container */}
          <div className="relative flex-1 min-h-[220px]">
            <svg viewBox="0 0 600 220" className="w-full h-full overflow-visible">
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="580" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="70" x2="580" y2="70" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="120" x2="580" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="170" x2="580" y2="170" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="190" x2="580" y2="190" stroke="#E2E8F0" strokeWidth="1.5" />

              {/* Y-Axis Scales */}
              <text x="32" y="24" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{getCurrencySymbol(business.currency)} {(maxVal).toFixed(0)}</text>
              <text x="32" y="104" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{getCurrencySymbol(business.currency)} {(maxVal / 2).toFixed(0)}</text>
              <text x="32" y="194" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{getCurrencySymbol(business.currency)} 0</text>

              {/* Dynamic Columns */}
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
                    {/* Hover hotspot group */}
                    <rect
                      x={groupCenterX - columnSpacing / 2}
                      y="10"
                      width={columnSpacing}
                      height="180"
                      fill="transparent"
                      className="hover:fill-slate-50/20 transition-colors duration-150 cursor-pointer"
                    />

                    {/* Revenue Bar */}
                    <rect
                      x={groupCenterX - barWidth - 2}
                      y={revY}
                      width={barWidth}
                      height={Math.max(revHeight, 2)}
                      rx="3"
                      fill={hoveredBar?.index === idx && hoveredBar?.type === 'revenue' ? '#047857' : '#10B981'}
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

                    {/* X-Axis labels */}
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

        {/* Right Column: Categories Breakdown & Payment Share */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          {/* Top Categories Progress list */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4.5 w-4.5 text-indigo-600" /> Top Sales Categories
              </h4>
              <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Sales Density
              </span>
            </div>

            <div className="space-y-3">
              {topCategories.map((cat, idx) => {
                const colorMap = [
                  'bg-emerald-500',
                  'bg-indigo-500',
                  'bg-amber-500',
                  'bg-rose-500',
                  'bg-slate-500'
                ];
                const activeColor = colorMap[idx % colorMap.length];

                return (
                  <div key={cat.category || idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 truncate max-w-[120px]">{cat.category}</span>
                      <div className="space-x-1.5 font-mono text-[10px] text-slate-400">
                        <span className="font-bold text-slate-800">{formatCurrency(cat.amount, business.currency)}</span>
                        <span>&bull;</span>
                        <span>{cat.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    {/* Track progress container */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${activeColor} rounded-full transition-all duration-500`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {topCategories.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No products or services have been purchased yet to calculate distribution.
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Split */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-4.5 w-4.5 text-emerald-700" /> Payment Channel Split
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {(['cash', 'card', 'mobile', 'other'] as const).map(method => {
                const total = paymentMethodTotals[method];
                const percent = totalPaymentSum > 0 ? (total / totalPaymentSum) * 100 : 0;
                
                const styleMap = {
                  cash: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-100', dot: 'bg-emerald-500' },
                  card: { bg: 'bg-blue-50 text-blue-800 border-blue-100', dot: 'bg-blue-500' },
                  mobile: { bg: 'bg-indigo-50 text-indigo-800 border-indigo-100', dot: 'bg-indigo-500' },
                  other: { bg: 'bg-slate-50 text-slate-800 border-slate-200', dot: 'bg-slate-500' }
                };

                const style = styleMap[method];

                return (
                  <div key={method} className={`p-2.5 rounded-2xl border ${style.bg} flex flex-col justify-between space-y-1`}>
                    <div className="flex items-center gap-1.5">
                       <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      <span className="font-extrabold uppercase text-[9px] tracking-wider">{method}</span>
                    </div>
                    <div>
                      <p className="font-black">{formatCurrency(total, business.currency)}</p>
                      <p className="text-[9px] font-bold opacity-60">{percent.toFixed(0)}% share</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* DURABLE SECURE DATA BACKUP & CSV EXPORTS HUB */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1 select-none">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="h-5 w-5 text-emerald-800" /> Secure Data Backup & CSV Export Center
            </h4>
            <p className="text-xs text-slate-400">Download cryptographically isolated transaction logs and master data catalogs for backups or tax spreadsheets</p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-black uppercase tracking-widest rounded-full">
            Client-Side Protected
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Action 1: Sales Transactions */}
          <button
            onClick={() => exportSalesToCSV(db.getSales(business.id), business.name)}
            className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-200 border border-slate-100 rounded-2xl text-left transition cursor-pointer"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <p className="font-bold text-slate-800 text-xs group-hover:text-emerald-900 transition-colors flex items-center gap-1.5">
                Sales Ledger Matrix
              </p>
              <p className="text-[10px] text-slate-400">All historical tickets & refunds</p>
            </div>
            <div className="h-8 w-8 bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 text-slate-500 group-hover:text-emerald-700 rounded-xl flex items-center justify-center transition-all">
              <FileDown className="h-4 w-4" />
            </div>
          </button>

          {/* Action 2: Products Catalog (Rendered only for non-services businesses) */}
          {!(business.category === 'Professional Services' || business.category === 'Beauty & Wellness') && (
            <button
              onClick={() => exportProductsToCSV(db.getProducts(business.id), business.name)}
              className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-200 border border-slate-100 rounded-2xl text-left transition cursor-pointer"
            >
              <div className="space-y-1 min-w-0 pr-2">
                <p className="font-bold text-slate-800 text-xs group-hover:text-emerald-900 transition-colors flex items-center gap-1.5">
                  Inventory Catalog Sheet
                </p>
                <p className="text-[10px] text-slate-400">Goods, cost margins, SKU stock</p>
              </div>
              <div className="h-8 w-8 bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 text-slate-500 group-hover:text-emerald-700 rounded-xl flex items-center justify-center transition-all">
                <FileDown className="h-4 w-4" />
              </div>
            </button>
          )}

          {/* Action 3: Service Listings */}
          {!(business.category === 'Professional Services' || business.category === 'Beauty & Wellness') && (
            <button
              onClick={() => exportServicesToCSV(db.getServices(business.id), business.name)}
              className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-200 border border-slate-100 rounded-2xl text-left transition cursor-pointer"
            >
              <div className="space-y-1 min-w-0 pr-2">
                <p className="font-bold text-slate-800 text-xs group-hover:text-emerald-900 transition-colors flex items-center gap-1.5">
                  Service Package Registry
                </p>
                <p className="text-[10px] text-slate-400">Listed plans & service contracts</p>
              </div>
              <div className="h-8 w-8 bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 text-slate-500 group-hover:text-emerald-700 rounded-xl flex items-center justify-center transition-all">
                <FileDown className="h-4 w-4" />
              </div>
            </button>
          )}

          {/* Action 4: Customers Accounts */}
          <button
            onClick={() => exportCustomersToCSV(db.getCustomers(business.id), business.name)}
            className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-200 border border-slate-100 rounded-2xl text-left transition cursor-pointer"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <p className="font-bold text-slate-800 text-xs group-hover:text-emerald-900 transition-colors flex items-center gap-1.5">
                Customer Database Roll
              </p>
              <p className="text-[10px] text-slate-400">Credit lines, emails, profiles</p>
            </div>
            <div className="h-8 w-8 bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 text-slate-500 group-hover:text-emerald-700 rounded-xl flex items-center justify-center transition-all">
              <FileDown className="h-4 w-4" />
            </div>
          </button>

          {/* Action 5: Expenses Ledger */}
          <button
            onClick={() => exportExpensesToCSV(db.getExpenses(business.id), business.name)}
            className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-200 border border-slate-100 rounded-2xl text-left transition cursor-pointer"
          >
            <div className="space-y-1 min-w-0 pr-2">
              <p className="font-bold text-slate-800 text-xs group-hover:text-emerald-900 transition-colors flex items-center gap-1.5">
                Expenses Outlays Ledger
              </p>
              <p className="text-[10px] text-slate-400">Operating costs & supply outlays</p>
            </div>
            <div className="h-8 w-8 bg-white border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 text-slate-500 group-hover:text-emerald-700 rounded-xl flex items-center justify-center transition-all">
              <FileDown className="h-4 w-4" />
            </div>
          </button>
        </div>
      </section>

      {/* Main Safeguards & Catalog Overview */}
      <div className="w-full space-y-6">
        {(business.category === 'Professional Services' || business.category === 'Beauty & Wellness') ? (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-[#064E3B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-700 animate-pulse" /> POS Services Workflow Active
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your professional services and bookings are consolidated entirely within the main checkout terminal. Standalone management screens and secondary dashboards are disabled to optimize cashier focus.
            </p>
          </div>
        ) : (
          <>
            {/* Low stock card alerts */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Stock Safeguard Alarm
              </h4>
              
              {lowStockItems.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="py-3.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-3">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="h-10 w-10 rounded-lg bg-slate-50 object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                          <p className="text-slate-400 font-mono text-[10px] mt-0.5">
                            SKU: {item.barcode} &bull; Alert Level: {typeof item.lowStockThreshold === 'number' ? item.lowStockThreshold : 5} &bull; Price: {formatCurrency(item.sellingPrice, business.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 font-bold text-[10px]">
                          Current Stock: {item.stockQuantity}
                        </span>
                        <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">
                          {item.stockQuantity <= 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  All catalog products are securely stocked above low threshold. Excellent!
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => onNavigate('Inventory')}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  Refill Inventory Catalog &rarr;
                </button>
              </div>
            </div>

            {/* Quick Stats overview of catalog */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Goods Catalog</p>
                <h4 className="text-3xl font-bold text-slate-800 mt-2">{products.length} Items</h4>
                <button onClick={() => onNavigate('Products')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 mt-4 inline-block cursor-pointer">
                  Manage Products &rarr;
                </button>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Listings</p>
                <h4 className="text-3xl font-bold text-slate-800 mt-2">{services.length} Listed</h4>
                <button onClick={() => onNavigate('Products')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 mt-4 inline-block cursor-pointer">
                  Manage Services &rarr;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

