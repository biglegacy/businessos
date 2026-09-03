import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, RestaurantOrder } from '../types';
import { 
  Search, 
  Filter, 
  Clock, 
  X, 
  CheckSquare, 
  XSquare, 
  Printer, 
  FileText 
} from 'lucide-react';

interface RestaurantOrdersProps {
  business: Business;
  currentUser: any;
}

export const RestaurantOrders: React.FC<RestaurantOrdersProps> = ({ business, currentUser }) => {
  const [orders, setOrders] = useState<RestaurantOrder[]>(() => db.getRestaurantOrders(business.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const refreshData = () => {
    setOrders(db.getRestaurantOrders(business.id));
  };

  const handleCancelOrder = (id: string) => {
    if (confirm('Are you sure you want to cancel this order? This will void the payment transaction record.')) {
      const match = orders.find(o => o.id === id);
      if (!match) return;

      db.saveRestaurantOrder(business.id, {
        ...match,
        status: 'Cancelled',
        kitchenStatus: 'COMPLETED'
      });

      alert('Order cancelled successfully.');
      refreshData();
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Order Logs & Tracking</h2>
        <p className="text-xs text-slate-500 mt-1">Review checkout receipts, trace chef cooking statuses, audit payment settlements, and void transactions.</p>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center text-xs">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search order number or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Preparing', 'Completed', 'Cancelled'].map(status => (
            <button 
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer whitespace-nowrap transition-colors ${
                selectedStatus === status ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-700">No matching orders found</h3>
            <p className="text-xs text-slate-400 mt-1">Processed guest orders, walk-in checks, and canceled receipts will appear on this log screen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Order Number</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Table</th>
                  <th className="py-4 px-6">Items Ordered</th>
                  <th className="py-4 px-6 text-right">Total Bill</th>
                  <th className="py-4 px-6 text-center">Kitchen status</th>
                  <th className="py-4 px-6 text-center">Bill Status</th>
                  <th className="py-4 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/40">
                    <td className="py-4 px-6 font-extrabold text-slate-900">{o.orderNumber}</td>
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                        {o.orderType}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold">{o.customerName}</td>
                    <td className="py-4 px-6 text-slate-500 font-semibold">{o.tableNumber ? `Table ${o.tableNumber}` : 'N/A'}</td>
                    <td className="py-4 px-6">
                      <div className="text-[11px] text-slate-500 leading-tight max-w-[200px] truncate">
                        {o.items.map(it => `${it.name} (x${it.quantity})`).join(', ')}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-slate-900">{formatCurrency(o.total, business.currency)}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {o.kitchenStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                        o.status === 'Completed' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : o.status === 'Cancelled'
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {o.status !== 'Cancelled' && (
                        <button 
                          onClick={() => handleCancelOrder(o.id)}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 font-semibold rounded text-[10px] transition-colors cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
