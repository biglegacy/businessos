import React, { useState, useEffect } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, RestaurantOrder } from '../types';
import { 
  Flame, 
  Clock, 
  CheckCircle, 
  Utensils, 
  Play, 
  Bell, 
  RefreshCw,
  XSquare,
  Volume2
} from 'lucide-react';

interface RestaurantKDSProps {
  business: Business;
  currentUser: any;
}

export const RestaurantKDS: React.FC<RestaurantKDSProps> = ({ business, currentUser }) => {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchKitchenOrders = () => {
    // Only fetch orders that are preparing, ready or new
    const list = db.getRestaurantOrders(business.id);
    const activeKitchen = list.filter(o => o.kitchenStatus === 'NEW' || o.kitchenStatus === 'PREPARING' || o.kitchenStatus === 'READY');
    
    // Sort so NEW and older orders appear first
    activeKitchen.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Play a notification sound if a new order arrives
    if (soundEnabled && activeKitchen.some(o => o.kitchenStatus === 'NEW' && !orders.some(prev => prev.id === o.id))) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (e) {
        console.log('Audio notification blocked by browser user gesture policies.');
      }
    }

    setOrders(activeKitchen);
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 5000); // Poll kitchen orders every 5 seconds for live simulation
    return () => clearInterval(interval);
  }, [business.id, orders.length]);

  const handleUpdateStatus = (orderId: string, nextStatus: 'PREPARING' | 'READY' | 'COMPLETED') => {
    const list = db.getRestaurantOrders(business.id);
    const match = list.find(o => o.id === orderId);
    if (!match) return;

    const updated: RestaurantOrder = {
      ...match,
      kitchenStatus: nextStatus,
      status: nextStatus === 'COMPLETED' ? 'Completed' : match.status
    };

    db.saveRestaurantOrder(business.id, updated);
    
    db.addActivityLog(business.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'KDS Order Updated',
      details: `Kitchen updated order ${match.orderNumber} status to ${nextStatus}`
    });

    fetchKitchenOrders();
  };

  const getElapsedTime = (dateStr: string) => {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col justify-between">
      {/* Header board */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Kitchen Display System (KDS)</h2>
          <p className="text-xs text-slate-500 mt-1">Live tracking board for chefs. Prepare, cook, plate, and dispatch menu orders efficiently.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
              soundEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <Volume2 className="h-4 w-4" />
            <span>{soundEnabled ? 'Bell Alerts Active' : 'Muted'}</span>
          </button>

          <button 
            onClick={fetchKitchenOrders}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 cursor-pointer"
            title="Refresh kitchen orders list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KDS board grid columns */}
      <div className="flex-1 overflow-x-auto pb-4">
        {orders.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center h-full flex flex-col justify-center items-center shadow-sm">
            <Flame className="h-12 w-12 text-slate-300 animate-pulse mb-3" />
            <h3 className="text-sm font-bold text-slate-700">Kitchen is clear!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">No pending orders in the kitchen. Completed orders or newly registered checkout tickets will show up here.</p>
          </div>
        ) : (
          <div className="flex gap-6 min-w-max h-full pb-2">
            
            {/* COLUMN 1: NEW / IN QUEUE ORDERS */}
            <div className="w-80 bg-slate-50 rounded-3xl p-4 border border-slate-100 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <span className="text-[11px] font-black uppercase text-indigo-700 tracking-wider">New Orders ({orders.filter(o => o.kitchenStatus === 'NEW').length})</span>
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {orders.filter(o => o.kitchenStatus === 'NEW').map(order => {
                  const elapsed = getElapsedTime(order.createdAt);
                  return (
                    <div key={order.id} id={`kds_card_${order.id}`} className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm">{order.orderNumber}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{order.orderType} &bull; {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${elapsed > 15 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                          <Clock className="h-3 w-3" />
                          {elapsed}m
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs text-slate-700 font-medium">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.name}</span>
                            <span className="font-black text-slate-900">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wider"
                      >
                        <Play className="h-3 w-3" />
                        <span>Start Prep</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: PREPARING IN KITCHEN */}
            <div className="w-80 bg-slate-50 rounded-3xl p-4 border border-slate-100 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <span className="text-[11px] font-black uppercase text-amber-700 tracking-wider">Preparing ({orders.filter(o => o.kitchenStatus === 'PREPARING').length})</span>
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {orders.filter(o => o.kitchenStatus === 'PREPARING').map(order => {
                  const elapsed = getElapsedTime(order.createdAt);
                  return (
                    <div key={order.id} id={`kds_card_${order.id}`} className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm">{order.orderNumber}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{order.orderType} &bull; {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${elapsed > 20 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                          <Clock className="h-3 w-3" />
                          {elapsed}m
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs text-slate-700 font-medium">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.name}</span>
                            <span className="font-black text-slate-900">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wider"
                      >
                        <CheckCircle className="h-3 w-3" />
                        <span>Ready to Plate</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 3: READY TO DISPATCH */}
            <div className="w-80 bg-slate-50 rounded-3xl p-4 border border-slate-100 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider">Ready / Plated ({orders.filter(o => o.kitchenStatus === 'READY').length})</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {orders.filter(o => o.kitchenStatus === 'READY').map(order => {
                  const elapsed = getElapsedTime(order.createdAt);
                  return (
                    <div key={order.id} id={`kds_card_${order.id}`} className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm">{order.orderNumber}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{order.orderType} &bull; {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}</span>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Plated
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs text-slate-700 font-medium">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.name}</span>
                            <span className="font-black text-slate-900">x{it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wider"
                      >
                        <span>Complete Service</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
