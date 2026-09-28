/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User } from '../types';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Briefcase,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  Sparkles,
  Grid
} from 'lucide-react';

interface OtherBusinessDashboardProps {
  business: Business;
  user: User;
  onNavigate: (tab: string) => void;
}

export const OtherBusinessDashboard: React.FC<OtherBusinessDashboardProps> = ({
  business,
  user,
  onNavigate
}) => {
  const products = db.getProducts(business.id);
  const services = db.getServices(business.id);
  const sales = db.getSales(business.id);
  const customers = db.getCustomers(business.id);
  const expenses = db.getExpenses(business.id);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr) && s.status !== 'refunded');
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);

  let todayCostOfGoods = 0;
  todaySales.forEach(s => {
    s.items.forEach(item => {
      const prod = products.find(p => p.id === item.itemId);
      if (prod && prod.costPrice) {
        todayCostOfGoods += prod.costPrice * item.quantity;
      }
    });
  });
  const todayProfit = todayRevenue - todayCostOfGoods;

  return (
    <div className="space-y-6 pb-12">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatCurrency(todayRevenue, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500">
            {todaySales.length} transaction{todaySales.length === 1 ? '' : 's'} recorded
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Profit Today</span>
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatCurrency(todayProfit, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500">
            Cost base: {formatCurrency(todayCostOfGoods, business.currency || 'GHC')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Products in Stock</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {products.length}
          </div>
          <div className="text-[10px] text-slate-500">
            Catalog inventory items
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Services Offered</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {services.length}
          </div>
          <div className="text-[10px] text-slate-500">
            Available service options
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Client Accounts</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {customers.length}
          </div>
          <div className="text-[10px] text-slate-500">
            Registered customers
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Sales (All Time)</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {sales.length}
          </div>
          <div className="text-[10px] text-slate-500">
            Orders processed
          </div>
        </div>
      </div>

      {/* Quick Launch Pathways */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('POS')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900">Point of Sale Terminal</h4>
            <p className="text-xs text-slate-500 mt-0.5">Quick barcode checkout, multiple payments, print &amp; SMS receipts</p>
          </div>
          <ArrowRight className="h-5 w-5 text-emerald-600" />
        </div>

        <div
          onClick={() => onNavigate('Products')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900">Inventory &amp; Products</h4>
            <p className="text-xs text-slate-500 mt-0.5">Stock management, cost &amp; selling prices, reorder alerts</p>
          </div>
          <ArrowRight className="h-5 w-5 text-blue-600" />
        </div>

        <div
          onClick={() => onNavigate('Reports')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-500 hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <h4 className="font-bold text-sm text-slate-900">Business Analytics &amp; Reports</h4>
            <p className="text-xs text-slate-500 mt-0.5">Revenue trends, profit &amp; loss statements, inventory values</p>
          </div>
          <ArrowRight className="h-5 w-5 text-purple-600" />
        </div>
      </div>
    </div>
  );
};
