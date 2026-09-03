import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, RestaurantOrder } from '../types';
import { showSuccess } from '../lib/toast';
import { 
  Flame, 
  Clock, 
  CheckCircle2, 
  Utensils, 
  Filter, 
  ArrowRight, 
  User, 
  ShoppingBag, 
  AlertCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface FastFoodKDSProps {
  business: Business;
  user: any;
}

export const FastFoodKDS: React.FC<FastFoodKDSProps> = ({ business, user }) => {
  const currency = business.currency || 'GHC';
  const orders = db.getFastFoodOrders(business.id);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED'>('ALL');

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'ALL') return o.status !== 'Cancelled';
    if (statusFilter === 'NEW') return o.kitchenStatus === 'NEW' || o.status === 'Pending';
    if (statusFilter === 'PREPARING') return o.kitchenStatus === 'PREPARING' || o.status === 'Preparing';
    if (statusFilter === 'READY') return o.kitchenStatus === 'READY' || o.status === 'Ready';
    if (statusFilter === 'COMPLETED') return o.kitchenStatus === 'COMPLETED' || o.status === 'Completed';
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleUpdateKitchenStatus = (order: RestaurantOrder, nextKitchenStatus: 'PREPARING' | 'READY' | 'COMPLETED') => {
    let nextStatus: 'Pending' | 'Preparing' | 'Ready' | 'Completed' = 'Preparing';
    if (nextKitchenStatus === 'PREPARING') nextStatus = 'Preparing';
    if (nextKitchenStatus === 'READY') nextStatus = 'Ready';
    if (nextKitchenStatus === 'COMPLETED') nextStatus = 'Completed';

    const updatedOrder: RestaurantOrder = {
      ...order,
      kitchenStatus: nextKitchenStatus,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    db.saveFastFoodOrder(business.id, updatedOrder);
    showSuccess('Kitchen Status Updated', `Order #${order.orderNumber} is now ${nextKitchenStatus}.`);
  };

  const getTimeElapsed = (createdDateStr: string) => {
    const elapsedMs = new Date().getTime() - new Date(createdDateStr).getTime();
    const mins = Math.floor(elapsedMs / (1000 * 60));
    return `${mins}m ago`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/30 rounded-full text-rose-300 text-xs font-bold">
            <Flame className="h-3.5 w-3.5 text-rose-400 animate-pulse" /> Kitchen Display System (KDS)
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Fast Food Kitchen Screen
          </h1>
          <p className="text-xs text-slate-400">Live order queue, prep notes, cook timers and order readiness status</p>
        </div>

        {/* STATUS FILTER PILLS */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-2xl border border-slate-700/80">
          {(['ALL', 'NEW', 'PREPARING', 'READY', 'COMPLETED'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ORDERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredOrders.map(order => {
          const kStatus = order.kitchenStatus || (order.status === 'Pending' ? 'NEW' : order.status.toUpperCase());
          const isNew = kStatus === 'NEW';
          const isPrep = kStatus === 'PREPARING';
          const isReady = kStatus === 'READY';
          const isDone = kStatus === 'COMPLETED';

          return (
            <div 
              key={order.id} 
              className={`bg-white rounded-3xl border shadow-sm p-5 space-y-4 relative flex flex-col justify-between transition-all ${
                isNew ? 'border-blue-400 ring-2 ring-blue-100' :
                isPrep ? 'border-amber-400 ring-2 ring-amber-100' :
                isReady ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                
                {/* ORDER HEADER */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-lg font-black text-slate-900">#{order.orderNumber}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {order.orderType || 'Takeaway'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {getTimeElapsed(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* KITCHEN STATUS BADGE */}
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                    isNew ? 'bg-blue-100 text-blue-800' :
                    isPrep ? 'bg-amber-100 text-amber-800' :
                    isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {kStatus}
                  </span>
                </div>

                {/* CUSTOMER INFO */}
                <div className="text-xs text-slate-600 font-semibold flex items-center justify-between">
                  <span>Customer: {order.customerName || 'Walk-in'}</span>
                  <span>{order.items.length} Items</span>
                </div>

                {/* ITEMS LIST */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-48 overflow-y-auto">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-200/50 last:border-0 pb-1.5 last:pb-0">
                      <span className="font-bold text-slate-900">{it.quantity}x {it.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACTION PROGRESSION BUTTONS */}
              <div className="pt-3 border-t border-slate-100">
                {isNew && (
                  <button
                    onClick={() => handleUpdateKitchenStatus(order, 'PREPARING')}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Flame className="h-4 w-4" /> Start Preparing
                  </button>
                )}

                {isPrep && (
                  <button
                    onClick={() => handleUpdateKitchenStatus(order, 'READY')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark Order Ready
                  </button>
                )}

                {isReady && (
                  <button
                    onClick={() => handleUpdateKitchenStatus(order, 'COMPLETED')}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Complete & Hand Over
                  </button>
                )}

                {isDone && (
                  <div className="text-center py-2 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl">
                    Order Completed
                  </div>
                )}
              </div>

            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
            <Flame className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Kitchen order queue is clear</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">New fast food orders submitted from the POS terminal will automatically appear here in real time.</p>
          </div>
        )}
      </div>

    </div>
  );
};
