import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User } from '../types';
import { 
  Shirt, Clock, CheckCircle2, DollarSign, Users, Calendar, 
  Sparkles, TrendingUp, AlertCircle, ArrowRight, Package, Truck, RefreshCw, Tag
} from 'lucide-react';
import { QuickActionPathways } from './QuickActionPathways';
import { LaundryPriceList } from './LaundryPriceList';

interface LaundryDashboardProps {
  business: Business;
  user: User;
  onNavigate: (tab: string) => void;
}

export const LaundryDashboard: React.FC<LaundryDashboardProps> = ({
  business,
  user,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'price_list'>('overview');

  // Fetch real data from Cloud DB
  const orders = db.getLaundryOrders(business.id);
  const customers = db.getCustomers(business.id);

  // Date filters
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = now.toISOString().slice(0, 7);

  // 1. Today's Orders
  const todayOrders = orders.filter(o => o.receivedDate && o.receivedDate.startsWith(todayStr));
  const todaysOrdersCount = todayOrders.length;

  // 2. Orders in Progress (Received, Washing, Drying, Ironing)
  const ordersInProgress = orders.filter(o => ['Received', 'Washing', 'Drying', 'Ironing'].includes(o.status));
  const ordersInProgressCount = ordersInProgress.length;

  // 3. Ready for Pickup
  const readyForPickupCount = orders.filter(o => o.status === 'Ready for Pickup').length;

  // 4. Ready for Delivery (Orders marked Ready for Pickup)
  const readyForDeliveryCount = orders.filter(o => o.status === 'Ready for Pickup').length;

  // 5. Completed Orders
  const completedOrdersCount = orders.filter(o => o.status === 'Delivered').length;

  // 6. Pending Payments
  const activeOrders = orders.filter(o => o.status !== 'Cancelled');
  const pendingPaymentsCount = activeOrders.filter(o => o.balanceDue > 0).length;

  // 7. Daily Revenue (collected today)
  const dailyRevenue = todayOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);

  // 8. Monthly Revenue (collected this month)
  const monthlyOrders = orders.filter(o => o.receivedDate && o.receivedDate.startsWith(thisMonthStr));
  const monthlyRevenue = monthlyOrders.reduce((acc, o) => acc + (o.amountPaid || 0), 0);

  // 9. Total Customers
  const totalCustomers = customers.length;

  // 10. Garments Received Today
  const garmentsReceivedToday = todayOrders.reduce((acc, o) => acc + (o.totalPieces || 0), 0);

  // 11. Garments Delivered Today
  const deliveredTodayOrders = orders.filter(o => o.status === 'Delivered' && (o.deliveredDate ? o.deliveredDate.startsWith(todayStr) : (o.receivedDate && o.receivedDate.startsWith(todayStr))));
  const garmentsDeliveredToday = deliveredTodayOrders.reduce((acc, o) => acc + (o.totalPieces || 0), 0);

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Header Hero Banner */}
      <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Shirt className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-cyan-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Laundry & Dry Cleaning Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {business.name}
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/80 font-medium">
              Track garment intake, service price lists, washing stages, pickup readiness, and payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab(activeTab === 'overview' ? 'price_list' : 'overview')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs backdrop-blur-sm transition flex items-center gap-2 cursor-pointer border border-white/20"
            >
              <Tag className="h-4 w-4 text-cyan-300" />
              {activeTab === 'overview' ? 'Manage Price List' : 'View Dashboard Overview'}
            </button>
            <button
              onClick={() => onNavigate('Laundry Orders')}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Shirt className="h-4 w-4" /> Manage Laundry Orders
            </button>
            <button
              onClick={() => onNavigate('POS')}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <DollarSign className="h-4 w-4" /> Open Express POS
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <Shirt className="h-4 w-4" />
          Dashboard Overview
        </button>
        <button
          onClick={() => setActiveTab('price_list')}
          className={`px-4 py-2 rounded-2xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'price_list'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <Tag className="h-4 w-4" />
          Laundry Price List
        </button>
      </div>

      {/* Quick Action Pathways */}
      <QuickActionPathways business={business} onNavigate={onNavigate} />

      {activeTab === 'overview' && (
        <>
          {/* Operational Metrics Cards Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {/* 1. Today's Orders */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Orders</p>
                  <h3 className="text-2xl font-black text-cyan-900 mt-1">{todaysOrdersCount}</h3>
                  <p className="text-[11px] text-cyan-700 font-semibold mt-1">Intake orders logged today</p>
                </div>
                <div className="p-3 bg-cyan-50 text-cyan-700 rounded-2xl">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 2. Orders in Progress */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orders in Progress</p>
                  <h3 className="text-2xl font-black text-amber-600 mt-1">{ordersInProgressCount}</h3>
                  <p className="text-[11px] text-amber-600 font-semibold mt-1">In wash, dry, or iron stages</p>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <RefreshCw className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 3. Ready for Pickup */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ready for Pickup</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-1">{readyForPickupCount}</h3>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">Awaiting client collection</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 4. Ready for Delivery */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ready for Delivery</p>
                  <h3 className="text-2xl font-black text-blue-600 mt-1">{readyForDeliveryCount}</h3>
                  <p className="text-[11px] text-blue-600 font-semibold mt-1">Pending courier drop-off</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Truck className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 5. Completed Orders */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Orders</p>
                  <h3 className="text-2xl font-black text-teal-700 mt-1">{completedOrdersCount}</h3>
                  <p className="text-[11px] text-teal-600 font-semibold mt-1">Delivered to customers</p>
                </div>
                <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl">
                  <Package className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 6. Pending Payments */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Payments</p>
                  <h3 className="text-2xl font-black text-rose-600 mt-1">{pendingPaymentsCount}</h3>
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">Orders with unpaid balances</p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 7. Daily Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Revenue</p>
                  <h3 className="text-2xl font-black text-emerald-800 mt-1">{formatCurrency(dailyRevenue, business.currency)}</h3>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">Payments collected today</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 8. Monthly Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Revenue</p>
                  <h3 className="text-2xl font-black text-indigo-700 mt-1">{formatCurrency(monthlyRevenue, business.currency)}</h3>
                  <p className="text-[11px] text-indigo-600 font-semibold mt-1">Total revenue this month</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 9. Total Customers */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Customers</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">{totalCustomers}</h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">Registered clients</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 10. Garments Received Today */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Garments Received Today</p>
                  <h3 className="text-2xl font-black text-cyan-700 mt-1">{garmentsReceivedToday} <span className="text-xs text-slate-400 font-semibold">pcs</span></h3>
                  <p className="text-[11px] text-cyan-600 font-semibold mt-1">Total items intake today</p>
                </div>
                <div className="p-3 bg-cyan-50 text-cyan-700 rounded-2xl">
                  <Shirt className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* 11. Garments Delivered Today */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Garments Delivered Today</p>
                  <h3 className="text-2xl font-black text-teal-800 mt-1">{garmentsDeliveredToday} <span className="text-xs text-slate-400 font-semibold">pcs</span></h3>
                  <p className="text-[11px] text-teal-600 font-semibold mt-1">Items returned to clients today</p>
                </div>
                <div className="p-3 bg-teal-50 text-teal-800 rounded-2xl">
                  <Shirt className="h-6 w-6" />
                </div>
              </div>
            </div>
          </section>

          {/* Recent Laundry Orders & Quick Action Workflow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Shirt className="h-5 w-5 text-cyan-600" /> Active Laundry Orders
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Garments currently undergoing processing, washing, drying, or awaiting pickup.
                  </p>
                </div>

                <button
                  onClick={() => onNavigate('Laundry Orders')}
                  className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
                >
                  View All Orders <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <Package className="h-12 w-12 mx-auto text-slate-300 stroke-1" />
                  <p className="text-sm font-semibold text-slate-500">No laundry orders recorded yet.</p>
                  <button
                    onClick={() => onNavigate('Laundry Orders')}
                    className="px-4 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    + Create First Laundry Order
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map(order => {
                    const statusStyles: Record<string, string> = {
                      Received: 'bg-slate-100 text-slate-800 border-slate-200',
                      Washing: 'bg-blue-100 text-blue-800 border-blue-200',
                      Drying: 'bg-amber-100 text-amber-800 border-amber-200',
                      Ironing: 'bg-purple-100 text-purple-800 border-purple-200',
                      'Ready for Pickup': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      Delivered: 'bg-teal-100 text-teal-800 border-teal-200',
                      Cancelled: 'bg-rose-100 text-rose-800 border-rose-200'
                    };

                    return (
                      <div key={order.id} className="p-4 rounded-2xl border border-slate-100 hover:border-cyan-200 bg-slate-50/50 hover:bg-cyan-50/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-800">{order.orderNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyles[order.status] || 'bg-slate-100 text-slate-700'}`}>
                              {order.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${order.balanceDue === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {order.balanceDue === 0 ? 'Paid in Full' : `Due: ${formatCurrency(order.balanceDue, business.currency)}`}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900">{order.customerName}</p>
                          <p className="text-[11px] text-slate-500">
                            {order.totalPieces} Pieces &bull; Total: {formatCurrency(order.total, business.currency)} &bull; Rec: {new Date(order.receivedDate).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          onClick={() => onNavigate('Laundry Orders')}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-cyan-500 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-center"
                        >
                          Manage Order
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Laundry Shortcuts */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 rounded-3xl p-6 space-y-4">
                <h4 className="font-extrabold text-cyan-950 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-600" /> Laundry Workflow
                </h4>

                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('price_list')}
                    className="w-full p-3 bg-white hover:bg-cyan-100/50 border border-cyan-200/60 rounded-2xl text-left transition cursor-pointer flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Laundry Price List</div>
                      <div className="text-[10px] text-slate-500">Set rates per item type & service</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-cyan-600" />
                  </button>

                  <button
                    onClick={() => onNavigate('Laundry Orders')}
                    className="w-full p-3 bg-white hover:bg-cyan-100/50 border border-cyan-200/60 rounded-2xl text-left transition cursor-pointer flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Laundry Order Entry</div>
                      <div className="text-[10px] text-slate-500">Intake garments & issue ticket</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-cyan-600" />
                  </button>

                  <button
                    onClick={() => onNavigate('Customers')}
                    className="w-full p-3 bg-white hover:bg-blue-100/50 border border-blue-200/60 rounded-2xl text-left transition cursor-pointer flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Customer Database</div>
                      <div className="text-[10px] text-slate-500">{totalCustomers} registered clients</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Laundry Service Price List Section on Dashboard */}
          <section className="pt-4">
            <LaundryPriceList business={business} user={user} />
          </section>
        </>
      )}

      {activeTab === 'price_list' && (
        <LaundryPriceList business={business} user={user} />
      )}
    </div>
  );
};

