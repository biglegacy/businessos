import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business } from '../types';
import { 
  TrendingUp, 
  Utensils, 
  Package, 
  DollarSign, 
  Award, 
  BarChart3, 
  PieChart, 
  Calendar, 
  Layers, 
  Sparkles,
  Printer,
  ChevronRight,
  Percent
} from 'lucide-react';

interface FastFoodReportsProps {
  business: Business;
  user: any;
}

export const FastFoodReports: React.FC<FastFoodReportsProps> = ({ business, user }) => {
  const currency = business.currency || 'GHC';

  const orders = db.getFastFoodOrders(business.id);
  const menuItems = db.getFastFoodMenuItems(business.id);
  const ingredients = db.getFastFoodIngredients(business.id);
  const recipes = db.getFastFoodRecipes(business.id);

  const [reportTab, setReportTab] = useState<'sales' | 'food' | 'inventory' | 'profit'>('sales');

  const completedOrders = orders.filter(o => o.status === 'Completed' || o.paymentStatus === 'paid');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  // Calculate Raw Food Costs across all orders
  let totalFoodCost = 0;
  completedOrders.forEach(o => {
    o.items.forEach(it => {
      const recipe = recipes.find(r => r.menuItemId === it.menuItemId);
      if (recipe) {
        recipe.items.forEach(ri => {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          if (ing) {
            totalFoodCost += (ing.costPrice * ri.quantityNeeded * it.quantity);
          }
        });
      }
    });
  });

  const grossProfit = totalRevenue - totalFoodCost;
  const netProfitMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Food performance ranking
  const itemSalesCount: { [name: string]: { qty: number; totalRev: number } } = {};
  completedOrders.forEach(o => {
    o.items.forEach(it => {
      if (!itemSalesCount[it.name]) {
        itemSalesCount[it.name] = { qty: 0, totalRev: 0 };
      }
      itemSalesCount[it.name].qty += it.quantity;
      itemSalesCount[it.name].totalRev += (it.price * it.quantity);
    });
  });

  const sortedFoodItems = Object.entries(itemSalesCount)
    .map(([name, data]) => ({ name, qty: data.qty, totalRev: data.totalRev }))
    .sort((a, b) => b.qty - a.qty);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" /> Fast Food Operations Analytics
          </h1>
          <p className="text-xs text-slate-500">Live operational reporting, ingredient cost analysis and profitability tracking</p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow transition flex items-center gap-2 cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Print Reports
        </button>
      </div>

      {orders.length === 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs font-bold text-amber-900">No data available for the selected period.</p>
          <p className="text-[11px] text-amber-700">Record fast food orders to view live sales and cost analytics.</p>
        </div>
      )}

      {/* REPORT TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'sales', label: 'Sales Reports', icon: DollarSign },
          { id: 'food', label: 'Food Performance', icon: Utensils },
          { id: 'inventory', label: 'Ingredient Usage', icon: Package },
          { id: 'profit', label: 'Profit & Margins', icon: Percent },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = reportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                isActive ? 'bg-[#064E3B] text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Revenue</span>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalRevenue, currency)}</div>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">{completedOrders.length} Completed Orders</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Food Cost</span>
          <div className="text-2xl font-black text-rose-700">{formatCurrency(totalFoodCost, currency)}</div>
          <span className="text-[10px] text-slate-500 font-medium mt-1 block">Raw ingredients used</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Profit Margin %</span>
          <div className="text-2xl font-black text-indigo-700">{netProfitMarginPct.toFixed(1)}%</div>
          <span className="text-[10px] text-indigo-600 font-bold mt-1 block">Food margin ratio</span>
        </div>
      </div>

      {/* TAB CONTENT: SALES REPORTS */}
      {reportTab === 'sales' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Completed Sales History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {completedOrders.map(o => (
                  <tr key={o.id}>
                    <td className="py-3 px-4 font-bold text-slate-900">#{o.orderNumber}</td>
                    <td className="py-3 px-4 text-slate-700">{o.customerName}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{o.orderType}</span></td>
                    <td className="py-3 px-4 uppercase font-bold text-emerald-700">{o.paymentMethod}</td>
                    <td className="py-3 px-4 font-black">{formatCurrency(o.total, currency)}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {completedOrders.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No sales transactions recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: FOOD PERFORMANCE */}
      {reportTab === 'food' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Top Selling Fast Food Items</h3>
          <div className="space-y-3">
            {sortedFoodItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-emerald-100 text-emerald-800 font-black rounded-xl flex items-center justify-center text-xs">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                    <span className="text-[10px] text-slate-500 font-semibold">{item.qty} portions sold</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-emerald-700">{formatCurrency(item.totalRev, currency)}</div>
                  <span className="text-[10px] text-slate-400">Total revenue generated</span>
                </div>
              </div>
            ))}
            {sortedFoodItems.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center">No food items sold yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: INGREDIENT USAGE */}
      {reportTab === 'inventory' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Ingredient Stock Status & Reorder Warnings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ingredients.map(ing => (
              <div key={ing.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-slate-900">{ing.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    ing.quantity <= ing.minStockLevel ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {ing.quantity <= ing.minStockLevel ? 'Low Stock' : 'Healthy'}
                  </span>
                </div>
                <div className="text-sm font-black text-slate-800">{ing.quantity} {ing.unit} available</div>
                <div className="text-[10px] text-slate-400">Reorder threshold: {ing.minStockLevel} {ing.unit}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROFIT & MARGINS */}
      {reportTab === 'profit' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Fast Food Profitability Analysis</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl">
              <span className="font-bold text-slate-600">Total Sales Revenue</span>
              <span className="font-black text-slate-900">{formatCurrency(totalRevenue, currency)}</span>
            </div>

            <div className="flex justify-between items-center text-xs p-3 bg-rose-50 rounded-xl">
              <span className="font-bold text-rose-800">Less Raw Food & Ingredient Costs</span>
              <span className="font-black text-rose-900">- {formatCurrency(totalFoodCost, currency)}</span>
            </div>

            <div className="flex justify-between items-center text-sm p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="font-black text-emerald-950 uppercase">Operating Food Profit</span>
              <span className="font-black text-emerald-800 text-lg">{formatCurrency(grossProfit, currency)}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
