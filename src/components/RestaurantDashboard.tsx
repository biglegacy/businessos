import React from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business } from '../types';
import { QuickActionPathways } from './QuickActionPathways';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Grid, 
  Flame, 
  AlertTriangle, 
  Award,
  PlusCircle,
  Plus,
  Utensils,
  ClipboardList,
  CheckCircle,
  XCircle,
  ChevronRight,
  Truck,
  Users,
  Receipt,
  Settings,
  FileText
} from 'lucide-react';

interface RestaurantDashboardProps {
  business: Business;
  user: any;
  onNavigate: (tab: string) => void;
}

export const RestaurantDashboard: React.FC<RestaurantDashboardProps> = ({ business, user, onNavigate }) => {
  const orders = db.getRestaurantOrders(business.id);
  const tables = db.getRestaurantTables(business.id);
  const ingredients = db.getIngredients(business.id);
  const menuItems = db.getMenuItems(business.id);
  const recipes = db.getRecipes(business.id);

  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
  const completedToday = todayOrders.filter(o => o.status === 'Completed' || o.paymentStatus === 'paid');

  // --- 1. SALES OVERVIEW STATISTICS ---
  const todaySales = completedToday.reduce((sum, o) => sum + o.total, 0);
  const todayOrdersCount = completedToday.length;
  
  const totalRevenue = orders
    .filter(o => o.status === 'Completed' || o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.total, 0);
    
  const totalCompletedOrdersCount = orders.filter(o => o.status === 'Completed' || o.paymentStatus === 'paid').length;
  const averageOrderValue = totalCompletedOrdersCount > 0 ? totalRevenue / totalCompletedOrdersCount : 0;

  const cashSales = todayOrders
    .filter(o => o.paymentMethod === 'cash' && (o.status === 'Completed' || o.paymentStatus === 'paid'))
    .reduce((sum, o) => sum + o.total, 0);

  const momoSales = todayOrders
    .filter(o => o.paymentMethod === 'mobile' && (o.status === 'Completed' || o.paymentStatus === 'paid'))
    .reduce((sum, o) => sum + o.total, 0);

  const cardSales = todayOrders
    .filter(o => o.paymentMethod === 'card' && (o.status === 'Completed' || o.paymentStatus === 'paid'))
    .reduce((sum, o) => sum + o.total, 0);

  // --- 2. RESTAURANT OPERATIONS STATUS ---
  const activeTablesCount = tables.filter(t => t.status === 'Occupied').length;
  const availableTablesCount = tables.filter(t => t.status === 'Available').length;
  
  const kitchenOrdersPending = orders.filter(o => o.status === 'Pending' || o.kitchenStatus === 'NEW').length;
  const ordersPreparing = orders.filter(o => o.status === 'Preparing' || o.kitchenStatus === 'PREPARING').length;
  const completedOrdersCount = orders.filter(o => o.status === 'Completed').length;
  const cancelledOrdersCount = orders.filter(o => o.status === 'Cancelled').length;

  // --- 3. INVENTORY & FOOD COST ---
  const totalIngredientsCount = ingredients.length;
  const lowStockIngredients = ingredients.filter(i => i.quantity <= i.minStockLevel && i.quantity > 0).length;
  const outOfStockIngredients = ingredients.filter(i => i.quantity <= 0).length;
  
  // Food cost valuation in stock
  const foodCostValuation = ingredients.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);

  // --- 4. TOP MENU PERFORMANCE ---
  const foodSalesMap: { [key: string]: number } = {};
  const drinkSalesMap: { [key: string]: number } = {};
  const itemProfitMap: { [key: string]: { name: string; profit: number } } = {};

  orders.filter(o => o.status === 'Completed' || o.paymentStatus === 'paid').forEach(o => {
    o.items.forEach(it => {
      const mItem = menuItems.find(m => m.id === it.menuItemId);
      const categoryLower = mItem ? mItem.category.toLowerCase() : '';
      const isDrink = categoryLower.includes('drink') || categoryLower.includes('beverage') || categoryLower.includes('juice') || categoryLower.includes('wine') || categoryLower.includes('soda');
      
      if (isDrink) {
        drinkSalesMap[it.name] = (drinkSalesMap[it.name] || 0) + it.quantity;
      } else {
        foodSalesMap[it.name] = (foodSalesMap[it.name] || 0) + it.quantity;
      }

      // Profit calculation
      if (mItem) {
        const recipe = recipes.find(r => r.menuItemId === mItem.id);
        const cost = recipe ? recipe.items.reduce((s, ri) => {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          return s + (ing ? ing.costPrice * ri.quantityNeeded : 0);
        }, 0) : 0;
        const unitProfit = mItem.sellingPrice - cost;
        const totalProfit = unitProfit * it.quantity;

        if (!itemProfitMap[mItem.id]) {
          itemProfitMap[mItem.id] = { name: mItem.name, profit: 0 };
        }
        itemProfitMap[mItem.id].profit += totalProfit;
      }
    });
  });

  let bestSellingFood = 'No sales yet';
  let bestFoodQty = 0;
  Object.entries(foodSalesMap).forEach(([name, qty]) => {
    if (qty > bestFoodQty) {
      bestSellingFood = `${name} (${qty} portions)`;
      bestFoodQty = qty;
    }
  });

  let bestSellingDrink = 'No sales yet';
  let bestDrinkQty = 0;
  Object.entries(drinkSalesMap).forEach(([name, qty]) => {
    if (qty > bestDrinkQty) {
      bestSellingDrink = `${name} (${qty} sold)`;
      bestDrinkQty = qty;
    }
  });

  let mostProfitableItem = 'No sales yet';
  let maxProfit = 0;
  Object.values(itemProfitMap).forEach(ip => {
    if (ip.profit > maxProfit) {
      mostProfitableItem = `${ip.name} (${formatCurrency(ip.profit, business.currency)})`;
      maxProfit = ip.profit;
    }
  });

  return (
    <div className="space-y-8">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">Restaurant Operations</span>
          <h2 className="text-2xl font-black text-slate-800 mt-1">Restaurant Management Suite</h2>
          <p className="text-xs text-slate-500 mt-1">Real-time overview of recipes, menu velocity, tables, and live order preparation queues.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 text-xs font-bold">
          <Utensils className="h-4 w-4" />
          <span>Restaurant Mode Enabled</span>
        </div>
      </div>

      {/* Quick Action Pathways */}
      <QuickActionPathways business={business} onNavigate={onNavigate} />

      {/* Grid containing Sales Overview & Top performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Overview */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span>Operational Sales Overview</span>
            </h3>
            <span className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-mono">Today: {todayStr.substring(4, 15)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Sales</span>
              <span className="text-xl font-black text-slate-800 block">{formatCurrency(todaySales, business.currency)}</span>
              <span className="text-[9px] text-slate-400 block">From transactions today</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Orders</span>
              <span className="text-xl font-black text-slate-800 block">{todayOrdersCount} Orders</span>
              <span className="text-[9px] text-slate-400 block">Completed today</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
              <span className="text-xl font-black text-indigo-600 block">{formatCurrency(totalRevenue, business.currency)}</span>
              <span className="text-[9px] text-slate-400 block">Historical gross revenue</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Order Value</span>
              <span className="text-xl font-black text-slate-800 block">{formatCurrency(averageOrderValue, business.currency)}</span>
              <span className="text-[9px] text-slate-400 block">Average bill amount</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cash Sales</span>
              <span className="text-xl font-black text-slate-800 block">{formatCurrency(cashSales, business.currency)}</span>
              <span className="text-[9px] text-slate-400 block">Physical currency collected</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MoMo Sales</span>
              <span className="text-xl font-black text-amber-600 block">{formatCurrency(momoSales, business.currency)}</span>
              <span className="text-[9px] text-slate-400 block">Mobile money transactions</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl space-y-1 md:col-span-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Card Sales</span>
              <span className="text-xl font-black text-indigo-600 block">{formatCurrency(cardSales, business.currency)}</span>
              <span className="text-[9px] text-slate-400 block">Credit and debit card settlements</span>
            </div>
          </div>
        </div>

        {/* Top Performance Board */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Top Menu Performance</span>
            </h3>
          </div>

          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Best Selling Food</span>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <span className="text-xs font-extrabold text-slate-700">{bestSellingFood}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Best Selling Drink</span>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <span className="text-xs font-extrabold text-slate-700">{bestSellingDrink}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Most Profitable Item</span>
              <div className="flex items-center gap-2 p-3 bg-indigo-50/50 border border-indigo-50 rounded-xl">
                <span className="text-xs font-extrabold text-indigo-800">{mostProfitableItem}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operations & Inventory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Operations status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-rose-500" />
              <span>Restaurant Operations Status</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Tables</span>
                <span className="text-lg font-black text-slate-800 mt-1">{activeTablesCount} Occupied</span>
              </div>
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            </div>

            <div className="p-3.5 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Tables</span>
                <span className="text-lg font-black text-slate-800 mt-1">{availableTablesCount} Available</span>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>

            <div className="p-3.5 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kitchen Orders Pending</span>
                <span className="text-lg font-black text-slate-800 mt-1">{kitchenOrdersPending} Waiting</span>
              </div>
              <span className="text-[9px] font-bold font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">NEW</span>
            </div>

            <div className="p-3.5 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Orders Preparing</span>
                <span className="text-lg font-black text-slate-800 mt-1">{ordersPreparing} Active</span>
              </div>
              <span className="text-[9px] font-bold font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">LINE</span>
            </div>

            <div className="p-3.5 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Orders</span>
                <span className="text-lg font-black text-slate-800 mt-1">{completedOrdersCount} Served</span>
              </div>
              <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
            </div>

            <div className="p-3.5 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cancelled Orders</span>
                <span className="text-lg font-black text-slate-800 mt-1">{cancelledOrdersCount} Voided</span>
              </div>
              <XCircle className="h-4.5 w-4.5 text-rose-400" />
            </div>
          </div>
        </div>

        {/* Inventory and ingredient sheet stats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              <span>Ingredient Inventory & Valuation</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Ingredients</span>
              <span className="text-lg font-black text-slate-800 block">{totalIngredientsCount} Items</span>
              <span className="text-[9px] text-slate-400 block">Cataloged raw stock</span>
            </div>

            <div className="p-3.5 border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Low Stock Alert</span>
              <span className="text-lg font-black text-amber-600 block">{lowStockIngredients} Ingredients</span>
              <span className="text-[9px] text-slate-400 block">Under threshold</span>
            </div>

            <div className="p-3.5 border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Out of Stock Items</span>
              <span className="text-lg font-black text-rose-600 block">{outOfStockIngredients} Items</span>
              <span className="text-[9px] text-slate-400 block">Completely depleted</span>
            </div>

            <div className="p-3.5 border border-slate-100 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Food Stock Cost Valuation</span>
              <span className="text-lg font-black text-emerald-600 block">{formatCurrency(foodCostValuation, business.currency)}</span>
              <span className="text-[9px] text-slate-400 block">Total cost value in store</span>
            </div>
          </div>
        </div>

      </div>

      {/* Warnings & Alerts */}
      {(lowStockIngredients > 0 || outOfStockIngredients > 0) && (
        <div id="rest_dashboard_warning_banner" className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <span className="text-xs font-black text-amber-950 block">Operational Stock Warnings</span>
            <span className="text-[11px] text-amber-800 font-bold block">
              {lowStockIngredients > 0 && `● ${lowStockIngredients} ingredient(s) are reaching critical minimum stock thresholds. `}
              {outOfStockIngredients > 0 && `● ${outOfStockIngredients} item(s) are completely out of stock. `}
              Deductions for recipes using out-of-stock items will still succeed but levels are negative. Restock immediately from suppliers to ensure kitchen continuity.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
