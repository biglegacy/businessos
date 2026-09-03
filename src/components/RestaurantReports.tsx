import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business } from '../types';
import { TrendingUp, Coins, BarChart2, Coffee } from 'lucide-react';

interface RestaurantReportsProps {
  business: Business;
}

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#ef4444'];

export const RestaurantReports: React.FC<RestaurantReportsProps> = ({ business }) => {
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<{ index: number; date: string; value: number } | null>(null);
  const [hoveredRecipe, setHoveredRecipe] = useState<{ index: number; name: string; cost: number; price: number; profit: number } | null>(null);

  const orders = db.getRestaurantOrders(business.id).filter(o => o.status === 'Completed' || o.paymentStatus === 'paid');
  const recipes = db.getRecipes(business.id);
  const ingredients = db.getIngredients(business.id);

  // 1. REVENUE DATA (Past 7 Days)
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toDateString();
  }).reverse();

  const salesTrendData = past7Days.map(dayStr => {
    const matchOrders = orders.filter(o => new Date(o.createdAt).toDateString() === dayStr);
    const revenue = matchOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      name: dayStr.substring(0, 10),
      Revenue: revenue
    };
  });

  // 2. FOOD DISH PORTIONS SOLD REPORT
  const dishSales: { [key: string]: number } = {};
  orders.forEach(o => {
    o.items.forEach(it => {
      dishSales[it.name] = (dishSales[it.name] || 0) + it.quantity;
    });
  });

  const foodSalesData = Object.keys(dishSales).map((name, idx) => ({
    name,
    Portions: dishSales[name],
    fill: COLORS[idx % COLORS.length]
  })).sort((a, b) => b.Portions - a.Portions).slice(0, 5);

  // 3. RECIPE PROFIT SHEET (Revenue vs Ingredient Cost vs Profit)
  const recipeProfitData = recipes.map(rec => {
    // calculate ingredient cost
    const cost = rec.items.reduce((sum, item) => {
      const ing = ingredients.find(i => i.id === item.ingredientId);
      return sum + (ing ? ing.costPrice * item.quantityNeeded : 0);
    }, 0);

    const matchMenuItem = db.getMenuItems(business.id).find(m => m.id === rec.menuItemId);
    const price = matchMenuItem ? matchMenuItem.sellingPrice : 0;
    const profit = Math.max(0, price - cost);

    return {
      name: rec.menuItemName,
      Cost: parseFloat(cost.toFixed(2)),
      Price: parseFloat(price.toFixed(2)),
      Profit: parseFloat(profit.toFixed(2))
    };
  }).slice(0, 6);

  // Summary Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  
  // Calculate total food ingredients cost of all completed orders
  let totalCost = 0;
  orders.forEach(o => {
    o.items.forEach(item => {
      const recipe = recipes.find(r => r.menuItemId === item.menuItemId);
      if (recipe) {
        recipe.items.forEach(recItem => {
          const ing = ingredients.find(i => i.id === recItem.ingredientId);
          if (ing) {
            totalCost += (ing.costPrice * recItem.quantityNeeded) * item.quantity;
          }
        });
      }
    });
  });

  const grossProfit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Math calculations for Sales Trend Area Chart
  const maxSales = Math.max(...salesTrendData.map(d => d.Revenue), 100);
  let linePath = '';
  let areaPath = '';
  const trendPoints = salesTrendData.map((d, idx) => {
    const x = 45 + idx * (525 / Math.max(1, salesTrendData.length - 1));
    const y = 190 - (d.Revenue / maxSales) * 160;
    return { x, y, value: d.Revenue, date: d.name };
  });

  if (trendPoints.length > 0) {
    linePath = `M ${trendPoints[0].x} ${trendPoints[0].y} ` + trendPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    areaPath = `${linePath} L ${trendPoints[trendPoints.length - 1].x} 190 L ${trendPoints[0].x} 190 Z`;
  }

  // Math calculations for Popular Menu Items Chart
  const maxPortions = Math.max(...foodSalesData.map(d => d.Portions), 5);

  // Math calculations for Recipe profit grouped chart
  const maxRecipeVal = Math.max(...recipeProfitData.map(d => Math.max(d.Cost, d.Price, d.Profit)), 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Operational & Financial Reports</h2>
        <p className="text-xs text-slate-500 mt-1">Audit ingredient cost efficiency, trace dish sales velocity, and review revenue profit margins.</p>
      </div>

      {orders.length === 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs font-bold text-amber-900">No data available for the selected period.</p>
          <p className="text-[11px] text-amber-700">Record restaurant orders to view live sales and recipe profit margins.</p>
        </div>
      )}

      {/* Bento numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sales Revenue</span>
          <span className="text-xl font-black text-slate-800 block">{formatCurrency(totalRevenue, business.currency)}</span>
          <span className="text-[10px] text-slate-400 block">From {totalOrders} completed orders</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Food Cost</span>
          <span className="text-xl font-black text-rose-600 block">{formatCurrency(totalCost, business.currency)}</span>
          <span className="text-[10px] text-slate-400 block">Based on linked ingredient sheets</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Profit Margin</span>
          <span className="text-xl font-black text-slate-800 block">{marginPercent.toFixed(0)}%</span>
          <span className="text-[10px] text-slate-400 block">Estimated percentage margin</span>
        </div>
      </div>

      {/* Charts board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
              <span>7-Day Sales Trend</span>
            </h3>
            {hoveredTrendPoint ? (
              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {hoveredTrendPoint.date.substring(0, 10)}: {formatCurrency(hoveredTrendPoint.value, business.currency)}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Hover path to view details</span>
            )}
          </div>
          
          <div className="h-64 relative">
            <svg viewBox="0 0 600 220" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="45" y1="20" x2="570" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="70" x2="570" y2="70" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="120" x2="570" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="170" x2="570" y2="170" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="45" y1="190" x2="570" y2="190" stroke="#E2E8F0" strokeWidth="1.5" />

              {/* Y Axis labels */}
              <text x="35" y="24" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{formatCurrency(maxSales, business.currency)}</text>
              <text x="35" y="105" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{formatCurrency(maxSales / 2, business.currency)}</text>
              <text x="35" y="194" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">0</text>

              {/* Fill Area and Stroke Line */}
              {areaPath && <path d={areaPath} fill="url(#salesGrad)" />}
              {linePath && <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

              {/* Hover Circles and interaction areas */}
              {trendPoints.map((pt, idx) => (
                <g key={idx}>
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={hoveredTrendPoint?.index === idx ? 5 : 3.5} 
                    fill={hoveredTrendPoint?.index === idx ? '#047857' : '#10b981'} 
                    stroke="#ffffff" 
                    strokeWidth={1.5}
                    className="transition-all duration-150 cursor-pointer"
                  />
                  <rect 
                    x={pt.x - 20} 
                    y="10" 
                    width="40" 
                    height="180" 
                    fill="transparent" 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredTrendPoint({ index: idx, date: pt.date, value: pt.value })}
                    onMouseLeave={() => setHoveredTrendPoint(null)}
                  />
                  <text 
                    x={pt.x} 
                    y="210" 
                    textAnchor="middle" 
                    fill="#64748B" 
                    className="text-[9px] font-bold"
                  >
                    {pt.date.substring(0, 10)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Top items bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-1.5">
            <BarChart2 className="h-4.5 w-4.5 text-emerald-500" />
            <span>Popular Menu Items (Portion Sales)</span>
          </h3>
          <div className="h-64">
            {foodSalesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold italic">
                No portion sales data logged yet today.
              </div>
            ) : (
              <svg viewBox="0 0 600 220" className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                <line x1="45" y1="20" x2="570" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="45" y1="120" x2="570" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="45" y1="190" x2="570" y2="190" stroke="#E2E8F0" strokeWidth="1.5" />

                {/* Y Axis labels */}
                <text x="35" y="24" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{maxPortions}</text>
                <text x="35" y="105" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{(maxPortions / 2).toFixed(0)}</text>
                <text x="35" y="194" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">0</text>

                {foodSalesData.map((d, idx) => {
                  const totalPoints = foodSalesData.length;
                  const spacing = 525 / totalPoints;
                  const centerX = 45 + idx * spacing + spacing / 2;
                  const barWidth = Math.min(26, spacing * 0.45);
                  const barHeight = (d.Portions / maxPortions) * 160;
                  const barY = 190 - barHeight;

                  return (
                    <g key={idx}>
                      <rect
                        x={centerX - barWidth / 2}
                        y={barY}
                        width={barWidth}
                        height={Math.max(barHeight, 2)}
                        rx="4"
                        fill={d.fill || '#10b981'}
                        className="transition-all duration-300 hover:opacity-90"
                      />
                      <text
                        x={centerX}
                        y="208"
                        textAnchor="middle"
                        fill="#475569"
                        className="text-[9px] font-bold"
                      >
                        {d.name.length > 10 ? d.name.substring(0, 8) + '...' : d.name}
                      </text>
                      <text
                        x={centerX}
                        y={barY - 6}
                        textAnchor="middle"
                        fill="#0f172a"
                        className="text-[10px] font-black font-mono"
                      >
                        {d.Portions}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Recipe analysis cost spreadsheet */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-1.5">
              <Coins className="h-4.5 w-4.5 text-amber-500" />
              <span>Menu Items Recipe Cost Analysis (Portion Profit breakdown)</span>
            </h3>

            {hoveredRecipe ? (
              <span className="text-[10px] font-mono font-bold bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-slate-700">
                <strong>{hoveredRecipe.name}</strong> &bull; Cost: <span className="text-rose-600">{formatCurrency(hoveredRecipe.cost, business.currency)}</span> &bull; Price: <span className="text-emerald-600">{formatCurrency(hoveredRecipe.price, business.currency)}</span> &bull; Margin: <span className="text-indigo-600">{formatCurrency(hoveredRecipe.profit, business.currency)}</span>
              </span>
            ) : (
              <div className="flex gap-4 text-[9px] font-bold select-none">
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="h-2.5 w-2.5 rounded bg-rose-500" /> Ingredient Cost
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Menu Price
                </span>
                <span className="flex items-center gap-1 text-indigo-600">
                  <span className="h-2.5 w-2.5 rounded bg-indigo-500" /> Profit Margin
                </span>
              </div>
            )}
          </div>

          <div className="h-64">
            {recipeProfitData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold italic">
                No recipe profit configurations created. Mapped ingredients onto recipes will trace margin levels here.
              </div>
            ) : (
              <svg viewBox="0 0 600 220" className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                <line x1="45" y1="20" x2="570" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="45" y1="120" x2="570" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="45" y1="190" x2="570" y2="190" stroke="#E2E8F0" strokeWidth="1.5" />

                {/* Y Axis labels */}
                <text x="35" y="24" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{formatCurrency(maxRecipeVal, business.currency)}</text>
                <text x="35" y="105" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">{formatCurrency(maxRecipeVal / 2, business.currency)}</text>
                <text x="35" y="194" textAnchor="end" fill="#94A3B8" className="text-[9px] font-bold font-mono">0</text>

                {recipeProfitData.map((d, idx) => {
                  const totalPoints = recipeProfitData.length;
                  const spacing = 525 / totalPoints;
                  const centerX = 45 + idx * spacing + spacing / 2;
                  const barWidth = Math.min(11, spacing * 0.16);

                  const costHeight = (d.Cost / maxRecipeVal) * 160;
                  const costY = 190 - costHeight;

                  const priceHeight = (d.Price / maxRecipeVal) * 160;
                  const priceY = 190 - priceHeight;

                  const profitHeight = (d.Profit / maxRecipeVal) * 160;
                  const profitY = 190 - profitHeight;

                  return (
                    <g key={idx}>
                      {/* Interactive hotspot */}
                      <rect 
                        x={centerX - spacing / 2}
                        y="10"
                        width={spacing}
                        height="180"
                        fill="transparent"
                        className="cursor-pointer hover:fill-slate-50/20"
                        onMouseEnter={() => setHoveredRecipe({ index: idx, name: d.name, cost: d.Cost, price: d.Price, profit: d.Profit })}
                        onMouseLeave={() => setHoveredRecipe(null)}
                      />

                      {/* Cost Bar (Rose) */}
                      <rect
                        x={centerX - barWidth * 1.5 - 2}
                        y={costY}
                        width={barWidth}
                        height={Math.max(costHeight, 2)}
                        rx="2"
                        fill="#f43f5e"
                      />
                      {/* Price Bar (Emerald) */}
                      <rect
                        x={centerX - barWidth / 2}
                        y={priceY}
                        width={barWidth}
                        height={Math.max(priceHeight, 2)}
                        rx="2"
                        fill="#10b981"
                      />
                      {/* Profit Bar (Indigo) */}
                      <rect
                        x={centerX + barWidth * 0.5 + 2}
                        y={profitY}
                        width={barWidth}
                        height={Math.max(profitHeight, 2)}
                        rx="2"
                        fill="#6366f1"
                      />
                      {/* X label */}
                      <text
                        x={centerX}
                        y="208"
                        textAnchor="middle"
                        fill="#475569"
                        className="text-[9px] font-bold"
                      >
                        {d.name.length > 10 ? d.name.substring(0, 8) + '...' : d.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
