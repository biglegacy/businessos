/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { Sale, Expense, Business, User } from '../types';
import { 
  FileText, TrendingUp, DollarSign, Award, Calendar, 
  Download, ArrowUpRight, ArrowDownRight, ShoppingBag, PieChart,
  Percent, Clock, Sparkles
} from 'lucide-react';
import { exportSalesToCSV } from '../lib/csvExport';

interface ReportsProps {
  business: Business;
  user: User;
}

export function Reports({ business, user }: ReportsProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const isServiceCategory = business.category === 'Professional Services' || business.category === 'Beauty & Wellness';

  const sales = db.getSales(business.id).filter(s => s.status === 'completed');
  const expenses = db.getExpenses(business.id);
  const products = db.getProducts(business.id);
  const customers = db.getCustomers(business.id);

  // Totals & COGS
  const totalSalesRevenue = sales.reduce((acc, curr) => acc + curr.total, 0);
  const totalExpensesCost = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  let totalCOGS = 0;
  sales.forEach(s => {
    s.items.forEach(item => {
      if (item.type === 'product') {
        const p = products.find(prod => prod.id === item.itemId);
        if (p && p.costPrice) {
          totalCOGS += item.quantity * p.costPrice;
        }
      }
    });
  });

  const isRestrictedFromReturns = business.category === 'Professional Services' || business.category === 'Beauty & Wellness' || business.category === 'Beauty and Wellness';
  const customerReturns = isRestrictedFromReturns ? [] : db.getCustomerReturns(business.id);
  const totalRefunds = isRestrictedFromReturns ? 0 : customerReturns.reduce((acc, curr) => acc + curr.refundAmount, 0);

  const grossProfit = totalSalesRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpensesCost - totalRefunds;

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
    const periodReturns = customerReturns.filter(cr => new Date(cr.createdAt) >= cutoffDate);

    const pSalesSum = periodSales.reduce((acc, curr) => acc + curr.total, 0);
    const pExpensesSum = periodExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const pReturnsSum = periodReturns.reduce((acc, curr) => acc + curr.refundAmount, 0);

    let pCOGS = 0;
    periodSales.forEach(s => {
      s.items.forEach(item => {
        if (item.type === 'product') {
          const p = products.find(prod => prod.id === item.itemId);
          if (p && p.costPrice) {
            pCOGS += item.quantity * p.costPrice;
          }
        }
      });
    });

    const pGross = pSalesSum - pCOGS;
    return pGross - pExpensesSum - pReturnsSum;
  };

  const todayProfit = getProfitForPeriod(1);
  const weeklyProfit = getProfitForPeriod(7);
  const monthlyProfit = getProfitForPeriod(30);
  const yearlyProfit = getProfitForPeriod(365);

  // 1. Employee performance standings
  const employeePerformance = sales.reduce((acc: Record<string, { name: string; sales: number; count: number }>, curr) => {
    if (!acc[curr.employeeId]) {
      acc[curr.employeeId] = { name: curr.employeeName, sales: 0, count: 0 };
    }
    acc[curr.employeeId].sales += curr.total;
    acc[curr.employeeId].count += 1;
    return acc;
  }, {});
  const employeeLeaderboard = Object.values(employeePerformance).sort((a, b) => b.sales - a.sales);

  // 2. Product sales popularity counts
  const itemPopularity = sales.reduce((acc: Record<string, { name: string; type: string; qty: number; revenue: number }>, curr) => {
    curr.items.forEach(i => {
      if (!acc[i.itemId]) {
        acc[i.itemId] = { name: i.name, type: i.type, qty: 0, revenue: 0 };
      }
      acc[i.itemId].qty += i.quantity;
      acc[i.itemId].revenue += (i.price * i.quantity);
    });
    return acc;
  }, {});
  const popularItemsList = Object.values(itemPopularity).sort((a,b) => b.qty - a.qty).slice(0, 5);

  // 3. Timeframe aggregation helper for custom charts
  let chartData: { label: string; revenue: number; expense: number }[] = [];

  if (timeframe === 'weekly') {
    chartData = [
      { label: 'Sun', revenue: 0, expense: 0 },
      { label: 'Mon', revenue: 0, expense: 0 },
      { label: 'Tue', revenue: 0, expense: 0 },
      { label: 'Wed', revenue: 0, expense: 0 },
      { label: 'Thu', revenue: 0, expense: 0 },
      { label: 'Fri', revenue: 0, expense: 0 },
      { label: 'Sat', revenue: 0, expense: 0 }
    ];

    sales.forEach(s => {
      const day = new Date(s.createdAt).getDay();
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const lbl = dayLabels[day];
      const match = chartData.find(c => c.label === lbl);
      if (match) match.revenue += s.total;
    });

    expenses.forEach(e => {
      const day = new Date(e.createdAt).getDay();
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const lbl = dayLabels[day];
      const match = chartData.find(c => c.label === lbl);
      if (match) match.expense += e.amount;
    });
  } else if (timeframe === 'daily') {
    chartData = [
      { label: '08:00', revenue: 0, expense: 0 },
      { label: '10:00', revenue: 0, expense: 0 },
      { label: '12:00', revenue: 0, expense: 0 },
      { label: '14:00', revenue: 0, expense: 0 },
      { label: '16:00', revenue: 0, expense: 0 },
      { label: '18:00', revenue: 0, expense: 0 },
      { label: '20:00', revenue: 0, expense: 0 }
    ];

    sales.forEach(s => {
      const hour = new Date(s.createdAt).getHours();
      let slot = '08:00';
      if (hour < 9) slot = '08:00';
      else if (hour < 11) slot = '10:00';
      else if (hour < 13) slot = '12:00';
      else if (hour < 15) slot = '14:00';
      else if (hour < 17) slot = '16:00';
      else if (hour < 19) slot = '18:00';
      else slot = '20:00';

      const match = chartData.find(c => c.label === slot);
      if (match) match.revenue += s.total;
    });

    expenses.forEach(e => {
      const hour = new Date(e.createdAt).getHours();
      let slot = '08:00';
      if (hour < 9) slot = '08:00';
      else if (hour < 11) slot = '10:00';
      else if (hour < 13) slot = '12:00';
      else if (hour < 15) slot = '14:00';
      else if (hour < 17) slot = '16:00';
      else if (hour < 19) slot = '18:00';
      else slot = '20:00';

      const match = chartData.find(c => c.label === slot);
      if (match) match.expense += e.amount;
    });
  } else {
    chartData = [
      { label: 'Jan', revenue: 0, expense: 0 },
      { label: 'Feb', revenue: 0, expense: 0 },
      { label: 'Mar', revenue: 0, expense: 0 },
      { label: 'Apr', revenue: 0, expense: 0 },
      { label: 'May', revenue: 0, expense: 0 },
      { label: 'Jun', revenue: 0, expense: 0 },
      { label: 'Jul', revenue: 0, expense: 0 },
      { label: 'Aug', revenue: 0, expense: 0 },
      { label: 'Sep', revenue: 0, expense: 0 },
      { label: 'Oct', revenue: 0, expense: 0 },
      { label: 'Nov', revenue: 0, expense: 0 },
      { label: 'Dec', revenue: 0, expense: 0 }
    ];

    sales.forEach(s => {
      const month = new Date(s.createdAt).getMonth();
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const lbl = monthLabels[month];
      const match = chartData.find(c => c.label === lbl);
      if (match) match.revenue += s.total;
    });

    expenses.forEach(e => {
      const parsedDate = new Date(e.date + 'T00:00:00');
      const monthVal = isNaN(parsedDate.getTime()) ? new Date(e.createdAt).getMonth() : parsedDate.getMonth();
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const lbl = monthLabels[monthVal];
      const match = chartData.find(c => c.label === lbl);
      if (match) match.expense += e.amount;
    });
  }

  const maxVal = Math.max(...chartData.map(c => Math.max(c.revenue, c.expense)), 100);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Top Header controls */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl max-w-xs select-none">
          {(['daily', 'weekly', 'monthly'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold text-center transition capitalize cursor-pointer ${
                timeframe === tf ? 'bg-white text-[#064E3B] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tf} analytics
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => exportSalesToCSV(sales, business.name)}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
          >
            <Download className="h-4 w-4" /> Download Sales CSV
          </button>

          <button
            onClick={handlePrintReport}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
          >
            <FileText className="h-4 w-4" /> Print Report Sheet
          </button>
        </div>
      </header>

      {sales.length === 0 && expenses.length === 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs font-bold text-amber-900">No data available for the selected period.</p>
          <p className="text-[11px] text-amber-700">Record sales or expenses to view live performance reports and analytics.</p>
        </div>
      )}

      {/* Comprehensive 9-Metric Financial Matrix */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comprehensive Financial Matrix</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
          {/* 1. Total Sales */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales (Turnover)</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(totalSalesRevenue, business.currency)}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center font-bold">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Completed Tickets</span>
              <span className="font-bold text-slate-700">{sales.length} transactions</span>
            </div>
          </div>

          {/* 2. Total Expenses */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses Outlay</p>
                <h3 className="text-2xl font-black text-rose-700 mt-1">-{formatCurrency(totalExpensesCost, business.currency)}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                <ArrowDownRight className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Receipt Ledger items</span>
              <span className="font-bold text-rose-600">{expenses.length} claims</span>
            </div>
          </div>

          {/* 3. Today's Profit */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Profit</p>
                <h3 className={`text-2xl font-black mt-1 ${todayProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(todayProfit, business.currency)}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Last 24 Hours</span>
              <span className={`font-bold ${todayProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                Active Daily
              </span>
            </div>
          </div>

          {/* 4. Weekly Profit */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Profit</p>
                <h3 className={`text-2xl font-black mt-1 ${weeklyProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatCurrency(weeklyProfit, business.currency)}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Rolling 7 Days</span>
              <span className={`font-bold ${weeklyProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                Active Weekly
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Visual SVG Chart + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visual Chart Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-800" /> Revenue vs Outlays Curve
            </h4>
            
            {/* Chart Legend */}
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-600" /> Revenue Income
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="h-2 w-2 rounded-full bg-rose-600" /> Operational Outlays
              </span>
            </div>
          </div>

          {/* Premium Custom SVG Chart Canvas */}
          <div className="relative pt-6">
            <svg 
              viewBox="0 0 600 240" 
              className="w-full h-64 overflow-visible"
            >
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="580" y2="20" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="70" x2="580" y2="70" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="120" x2="580" y2="120" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="170" x2="580" y2="170" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="200" x2="580" y2="200" stroke="#E2E8F0" strokeWidth="1.5" />

              {/* Y-Axis scale descriptors */}
              <text x="30" y="24" textAnchor="end" fill="#94A3B8" className="text-[10px] font-bold font-mono">{getCurrencySymbol(business.currency)} {(maxVal).toFixed(0)}</text>
              <text x="30" y="124" textAnchor="end" fill="#94A3B8" className="text-[10px] font-bold font-mono">{getCurrencySymbol(business.currency)} {(maxVal/2).toFixed(0)}</text>
              <text x="30" y="204" textAnchor="end" fill="#94A3B8" className="text-[10px] font-bold font-mono">{getCurrencySymbol(business.currency)} 0</text>

              {/* Render dynamic Bars/Plots */}
              {chartData.map((data, index) => {
                const stepX = (540 / (chartData.length - 1 || 1));
                const plotX = 40 + (index * stepX);
                
                // Scale calculations (constrained inside y-range [20, 200])
                const revHeight = (data.revenue / maxVal) * 180;
                const revY = 200 - revHeight;
                
                const expHeight = (data.expense / maxVal) * 180;
                const expY = 200 - expHeight;

                return (
                  <g key={index} className="group/plot">
                    {/* Background bar trigger for hover tooltips */}
                    <rect 
                      x={plotX - 15} 
                      y="10" 
                      width="30" 
                      height="200" 
                      fill="transparent" 
                      className="hover:fill-slate-50/40 cursor-pointer"
                    />

                    {/* Revenue Bar (Double barchart column format) */}
                    <rect
                      x={plotX - 10}
                      y={revY}
                      width="8"
                      height={Math.max(revHeight, 2)}
                      rx="2"
                      fill="#10B981"
                      className="transition duration-300 hover:fill-emerald-600"
                    />

                    {/* Expense Bar */}
                    <rect
                      x={plotX + 2}
                      y={expY}
                      width="8"
                      height={Math.max(expHeight, 2)}
                      rx="2"
                      fill="#F43F5E"
                      className="transition duration-300 hover:fill-rose-600"
                    />

                    {/* X-Axis labels */}
                    <text 
                      x={plotX} 
                      y="222" 
                      textAnchor="middle" 
                      fill="#64748B" 
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      {data.label}
                    </text>

                    {/* Interactive inline tooltip values */}
                    <g className="opacity-0 group-hover/plot:opacity-100 transition duration-200 pointer-events-none">
                      <rect 
                        x={plotX - 45} 
                        y={Math.min(revY, expY) - 34} 
                        width="90" 
                        height="26" 
                        rx="6" 
                        fill="#0F172A" 
                      />
                      <text 
                        x={plotX} 
                        y={Math.min(revY, expY) - 18} 
                        textAnchor="middle" 
                        fill="#FFFFFF" 
                        className="text-[9px] font-bold font-mono"
                      >
                        In: {getCurrencySymbol(business.currency)} {data.revenue.toFixed(0)} | Out: {getCurrencySymbol(business.currency)} {data.expense.toFixed(0)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Popular items + Leaderboard list */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              🏆 Top Staff Conversion
            </h4>
            
            <div className="space-y-3">
              {employeeLeaderboard.map((emp, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">#0{idx+1}</span>
                    <span className="font-bold text-slate-800">{emp.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-800">{formatCurrency(emp.sales, business.currency)}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{emp.count} tickets</p>
                  </div>
                </div>
              ))}
              {employeeLeaderboard.length === 0 && (
                <p className="text-slate-400 text-xs py-4 text-center">No active rosters logged sales yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-100 mt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              {isServiceCategory ? '📦 High Demand Services' : '📦 High Demand Items'}
            </h4>
            
            <div className="space-y-3">
              {popularItemsList.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 truncate pr-4">{item.name}</span>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-700">{item.qty} Sold</p>
                    <p className="text-[10px] text-emerald-700 font-bold">{formatCurrency(item.revenue, business.currency)}</p>
                  </div>
                </div>
              ))}
              {popularItemsList.length === 0 && (
                <p className="text-slate-400 text-xs py-4 text-center">
                  {isServiceCategory ? 'No catalog services checkout yet.' : 'No catalog goods checkout yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Registry and Safeguard Report */}
      {!isServiceCategory ? (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="h-5 w-5 text-amber-500" /> Inventory &amp; Low Stock Safeguard Report
            </h4>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              Real-time Audit
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Items Tracked</p>
              <h5 className="text-lg font-black text-slate-800 mt-1">{products.length} Products</h5>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col justify-between">
              <p className="text-[10px] font-bold text-amber-600 uppercase">Low Stock Alerts</p>
              <h5 className="text-lg font-black text-amber-700 mt-1">
                {products.filter(p => {
                  const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5;
                  return p.stockQuantity <= threshold && p.stockQuantity > 0;
                }).length} Items
              </h5>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col justify-between">
              <p className="text-[10px] font-bold text-rose-600 uppercase">Out of Stock Alerts</p>
              <h5 className="text-lg font-black text-rose-700 mt-1">{products.filter(p => p.stockQuantity <= 0).length} Items</h5>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Alert Threshold</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs">
                {products.map(p => {
                  const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5;
                  const isLow = p.stockQuantity <= threshold;
                  const isOut = p.stockQuantity <= 0;
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/50 transition ${isOut ? 'bg-rose-50/10' : isLow ? 'bg-amber-50/15' : ''}`}>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{p.name}</td>
                      <td className="py-3.5 px-4 text-slate-500">{p.category}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{p.stockQuantity}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{threshold}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] leading-none ${
                          isOut ? 'bg-red-50 text-red-700' : isLow ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No products recorded in business catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Professional Services Registry Report */
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="h-5 w-5 text-emerald-800" /> Services Performance &amp; Assignment Report
            </h4>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Labor Registry
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Service Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Assigned Employee</th>
                  <th className="py-3 px-4">Estimated Duration</th>
                  <th className="py-3 px-4">Retail Price</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs">
                {db.getServices(business.id).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{s.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 uppercase">{s.code || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-slate-500">{s.category}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">{s.assignedEmployeeName || 'Unassigned'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{s.duration || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-800">{formatCurrency(s.price, business.currency)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] leading-none ${
                        s.status === 'Inactive' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {s.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
                {db.getServices(business.id).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No services recorded in business catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
