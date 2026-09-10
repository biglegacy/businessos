/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, Product, Sale } from '../types';
import {
  Sparkles,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  TrendingDown,
  ArrowRight,
  Plus,
  Grid,
  CheckCircle2
} from 'lucide-react';

interface BeautyCosmeticsDashboardProps {
  business: Business;
  user: User;
  onNavigate: (tab: string) => void;
}

export const BeautyCosmeticsDashboard: React.FC<BeautyCosmeticsDashboardProps> = ({
  business,
  user,
  onNavigate
}) => {
  const products = db.getProducts(business.id);
  const sales = db.getSales(business.id);
  const expenses = db.getExpenses(business.id);
  const customers = db.getCustomers(business.id);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Calculations for Today, Week, Month
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const validSales = sales.filter(s => s.status !== 'refunded');

  const todaySales = validSales.filter(s => s.createdAt.startsWith(todayStr));
  const weeklySales = validSales.filter(s => new Date(s.createdAt) >= oneWeekAgo);
  const monthlySales = validSales.filter(s => new Date(s.createdAt) >= oneMonthAgo);

  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);
  const weeklySalesTotal = weeklySales.reduce((acc, s) => acc + s.total, 0);
  const monthlySalesTotal = monthlySales.reduce((acc, s) => acc + s.total, 0);

  // Profit calculation
  let todayCostOfGoods = 0;
  todaySales.forEach(s => {
    s.items.forEach(item => {
      const prod = products.find(p => p.id === item.itemId);
      if (prod && prod.costPrice) {
        todayCostOfGoods += prod.costPrice * item.quantity;
      }
    });
  });
  const todayGrossProfit = todaySalesTotal - todayCostOfGoods;

  // Expenses
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Inventory stats
  const totalProducts = products.length;
  const outOfStock = products.filter(p => p.stockQuantity <= 0);
  const lowStock = products.filter(p => {
    const threshold = p.lowStockThreshold || p.reorderLevel || 5;
    return p.stockQuantity > 0 && p.stockQuantity <= threshold;
  });

  // Expiring soon (< 90 days)
  const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiringProducts = products.filter(p => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    return exp <= ninetyDaysLater;
  });

  // Top Selling Products
  const prodSalesMap: { [key: string]: { name: string; qty: number; revenue: number } } = {};
  validSales.forEach(s => {
    s.items.forEach(item => {
      if (!prodSalesMap[item.itemId]) {
        prodSalesMap[item.itemId] = { name: item.name, qty: 0, revenue: 0 };
      }
      prodSalesMap[item.itemId].qty += item.quantity;
      prodSalesMap[item.itemId].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(prodSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Categories Breakdown
  const categoryCountMap: { [cat: string]: number } = {};
  products.forEach(p => {
    const cat = p.category || 'General Beauty';
    categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-pink-900 to-indigo-950 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wide text-rose-200">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Beauty & Cosmetics Management Studio</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {business.name} Beauty Counter
          </h2>
          <p className="text-xs text-rose-200/90 max-w-xl">
            Streamline shade matching, fragrance lines, skincare inventory, batch expirations, and sales terminal operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('POS')}
            className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Beauty Counter POS</span>
          </button>
          <button
            onClick={() => onNavigate('Products')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border border-white/10"
          >
            <Plus className="h-4 w-4" />
            <span>Add Beauty Item</span>
          </button>
        </div>
      </div>

      {/* KPI Grid (12 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Sales</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(todaySalesTotal, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {todaySales.length} transaction{todaySales.length === 1 ? '' : 's'} today
          </div>
        </div>

        {/* Weekly Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">7-Day Sales</span>
            <div className="p-2 bg-pink-50 text-pink-700 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(weeklySalesTotal, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {weeklySales.length} weekly orders
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">30-Day Sales</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(monthlySalesTotal, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {monthlySales.length} monthly orders
          </div>
        </div>

        {/* Gross Profit Today */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Profit</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {formatCurrency(todayGrossProfit, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Cost base: {formatCurrency(todayCostOfGoods, business.currency || 'GHC')}
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Beauty Inventory</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {totalProducts}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {Object.keys(categoryCountMap).length} beauty categories
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Clients / Customers</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {customers.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Client profiles registered
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Low Stock Items</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700">
            {lowStock.length}
          </div>
          <div className="text-[10px] text-amber-600 font-medium">
            At or below reorder limit
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Out of Stock</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            {outOfStock.length}
          </div>
          <div className="text-[10px] text-rose-600 font-medium">
            0 units in stock
          </div>
        </div>

        {/* Expiring Products */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expiring (&le; 90 Days)</span>
            <div className="p-2 bg-orange-50 text-orange-700 rounded-xl">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-700">
            {expiringProducts.length}
          </div>
          <div className="text-[10px] text-orange-600 font-medium">
            Creams, serums, fragrances
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 bg-slate-50 text-slate-700 rounded-xl">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800">
            {formatCurrency(totalExpenses, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {expenses.length} expense entries recorded
          </div>
        </div>
      </div>

      {/* Two-Column Detail Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Cosmetics */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-600" />
              <h3 className="text-base font-bold text-slate-900">Top-Selling Beauty Products</h3>
            </div>
            <button
              onClick={() => onNavigate('Sales')}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Sales Ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-medium">No sales recorded yet</p>
              <button
                onClick={() => onNavigate('POS')}
                className="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Launch POS Terminal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-black text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.qty} units sold</div>
                    </div>
                  </div>
                  <div className="font-extrabold text-xs text-rose-700 shrink-0">
                    {formatCurrency(p.revenue, business.currency || 'GHC')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid className="h-5 w-5 text-rose-600" />
              <h3 className="text-base font-bold text-slate-900">Product Categories</h3>
            </div>
            <button
              onClick={() => onNavigate('Categories')}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Categories</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(categoryCountMap).map(([cat, count]) => (
              <div key={cat} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="truncate pr-2">
                  <div className="font-bold text-xs text-slate-800 truncate">{cat}</div>
                  <div className="text-[10px] text-slate-400">{count} item{count === 1 ? '' : 's'}</div>
                </div>
                <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
