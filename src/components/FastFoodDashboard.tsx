import React from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business } from '../types';
import { QuickActionPathways } from './QuickActionPathways';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Flame, 
  AlertTriangle, 
  Utensils, 
  ClipboardList, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Truck, 
  Users, 
  PlusCircle, 
  CreditCard, 
  Smartphone, 
  Clock, 
  Package, 
  Award,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface FastFoodDashboardProps {
  business: Business;
  user: any;
  onNavigate: (tab: string) => void;
}

export const FastFoodDashboard: React.FC<FastFoodDashboardProps> = ({ business, user, onNavigate }) => {
  const orders = db.getFastFoodOrders(business.id);
  const ingredients = db.getFastFoodIngredients(business.id);
  const menuItems = db.getFastFoodMenuItems(business.id);
  const recipes = db.getFastFoodRecipes(business.id);

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

  // --- 2. ORDER OPERATIONS ---
  const newOrdersCount = orders.filter(o => o.status === 'Pending' || o.kitchenStatus === 'NEW').length;
  const preparingOrdersCount = orders.filter(o => o.status === 'Preparing' || o.kitchenStatus === 'PREPARING').length;
  const readyOrdersCount = orders.filter(o => o.status === 'Ready' || o.kitchenStatus === 'READY').length;
  const completedOrdersCount = orders.filter(o => o.status === 'Completed' || o.kitchenStatus === 'COMPLETED').length;
  const cancelledOrdersCount = orders.filter(o => o.status === 'Cancelled').length;

  // --- 3. FOOD OPERATIONS ---
  const totalMenuItems = menuItems.length;
  const availableMenuItems = menuItems.filter(m => m.isAvailable).length;
  const outOfStockMenuItems = menuItems.filter(m => !m.isAvailable).length;

  // Most popular item
  const itemCounts: { [name: string]: number } = {};
  orders.forEach(o => {
    o.items.forEach(it => {
      itemCounts[it.name] = (itemCounts[it.name] || 0) + it.quantity;
    });
  });

  let popularItemName = 'No orders yet';
  let popularItemQty = 0;
  Object.entries(itemCounts).forEach(([name, qty]) => {
    if (qty > popularItemQty) {
      popularItemName = name;
      popularItemQty = qty;
    }
  });

  // --- 4. INVENTORY OVERVIEW ---
  const ingredientsAvailable = ingredients.filter(i => i.quantity > i.minStockLevel).length;
  const lowStockIngredients = ingredients.filter(i => i.quantity <= i.minStockLevel && i.quantity > 0).length;
  const outOfStockIngredients = ingredients.filter(i => i.quantity <= 0).length;
  const foodCostValuation = ingredients.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);

  const currency = business.currency || 'GHC';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-emerald-300 text-xs font-bold tracking-wide">
              <Sparkles className="h-3.5 w-3.5" /> Fast Food Management System
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {business.name}
            </h1>
            <p className="text-xs text-emerald-100/80 max-w-xl">
              Quick service operational workspace. Monitor live kitchen flow, fast counter sales, recipe ingredient usage, and store profitability in real time.
            </p>
          </div>

          <button
            onClick={() => onNavigate('Fast Food POS')}
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Utensils className="h-5 w-5" />
            Launch Fast Food POS
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS HUB */}
      <QuickActionPathways business={business} onNavigate={onNavigate} />

      {/* SECTION 1: SALES OVERVIEW CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" /> Sales Overview
          </h2>
          <span className="text-xs text-slate-500 font-semibold">Today's Live Revenue & Payment Breakdowns</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(todaySales, currency)}</div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>{todayOrdersCount} completed orders today</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Orders</span>
                <div className="text-2xl font-black text-slate-900">{todayOrders.length} Orders</div>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium">
              Average ticket size: <strong className="text-slate-800">{formatCurrency(averageOrderValue, currency)}</strong>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(totalRevenue, currency)}</div>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium">
              Lifetime counter revenue
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Order Value</span>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(averageOrderValue, currency)}</div>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium">
              Per completed transaction
            </div>
          </div>
        </div>

        {/* PAYMENT METHOD BREAKDOWN SUB-CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Sales Today</span>
              <div className="text-lg font-black text-white">{formatCurrency(cashSales, currency)}</div>
            </div>
            <div className="p-3 bg-slate-800 text-emerald-400 rounded-xl border border-slate-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Money Sales Today</span>
              <div className="text-lg font-black text-amber-400">{formatCurrency(momoSales, currency)}</div>
            </div>
            <div className="p-3 bg-slate-800 text-amber-400 rounded-xl border border-slate-700">
              <Smartphone className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card Sales Today</span>
              <div className="text-lg font-black text-cyan-400">{formatCurrency(cardSales, currency)}</div>
            </div>
            <div className="p-3 bg-slate-800 text-cyan-400 rounded-xl border border-slate-700">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 & 3: ORDER OPERATIONS & FOOD OPERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ORDER OPERATIONS CARDS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" /> Order Operations Status
            </h3>
            <button
              onClick={() => onNavigate('Kitchen Display')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              Kitchen Display <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50/70 border border-blue-200/70 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">New Orders</span>
              <div className="text-2xl font-black text-blue-900">{newOrdersCount}</div>
              <span className="text-[10px] text-blue-600 block font-medium">Awaiting prep</span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/70 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Preparing</span>
              <div className="text-2xl font-black text-amber-900">{preparingOrdersCount}</div>
              <span className="text-[10px] text-amber-600 block font-medium">In kitchen</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/70 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Ready</span>
              <div className="text-2xl font-black text-emerald-900">{readyOrdersCount}</div>
              <span className="text-[10px] text-emerald-600 block font-medium">Pick up / Serve</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Completed</span>
              <div className="text-2xl font-black text-slate-800">{completedOrdersCount}</div>
              <span className="text-[10px] text-slate-500 block font-medium">Served & paid</span>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/70 p-4 rounded-2xl text-center space-y-1 col-span-2 sm:col-span-2">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Cancelled Orders</span>
              <div className="text-2xl font-black text-rose-900">{cancelledOrdersCount}</div>
              <span className="text-[10px] text-rose-600 block font-medium">Refunded or voided</span>
            </div>
          </div>
        </div>

        {/* FOOD OPERATIONS CARDS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Utensils className="h-4 w-4 text-emerald-600" /> Food Operations & Menu
            </h3>
            <button
              onClick={() => onNavigate('Menu Management')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              Manage Menu <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Menu Items</span>
              <div className="text-2xl font-black text-slate-900">{totalMenuItems} Items</div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/70 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Available Items</span>
              <div className="text-2xl font-black text-emerald-900">{availableMenuItems} Items</div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/70 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Out Of Stock Items</span>
              <div className="text-2xl font-black text-rose-900">{outOfStockMenuItems} Items</div>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-200/70 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Popular Item</span>
              <div className="text-sm font-black text-indigo-950 truncate">{popularItemName}</div>
              <span className="text-[10px] text-indigo-600 block font-semibold">{popularItemQty} portions ordered</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: INVENTORY OVERVIEW CARDS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" /> Ingredient Inventory & Recipe Food Cost
          </h3>
          <button
            onClick={() => onNavigate('Ingredient Inventory')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            Ingredient Inventory <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-emerald-50/50 border border-emerald-200/60 p-5 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Available Ingredients</span>
            <div className="text-2xl font-black text-emerald-900">{ingredientsAvailable} Items</div>
            <span className="text-[10px] text-emerald-600 block font-medium">Stock levels healthy</span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/70 p-5 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Low Stock Ingredients</span>
            <div className="text-2xl font-black text-amber-900">{lowStockIngredients} Items</div>
            <span className="text-[10px] text-amber-700 block font-medium">Requires supplier reorder</span>
          </div>

          <div className="bg-rose-50/60 border border-rose-200/70 p-5 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Out Of Stock Ingredients</span>
            <div className="text-2xl font-black text-rose-900">{outOfStockIngredients} Items</div>
            <span className="text-[10px] text-rose-700 block font-medium">Critically empty</span>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-1 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Raw Food Cost Valuation</span>
            <div className="text-2xl font-black text-emerald-400">{formatCurrency(foodCostValuation, currency)}</div>
            <span className="text-[10px] text-slate-400 block font-medium">In raw stock inventory</span>
          </div>
        </div>
      </div>

    </div>
  );
};
