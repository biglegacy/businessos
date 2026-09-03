import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Plus, Edit, Trash2, Printer, CheckCircle, Clock, AlertCircle, DollarSign, X } from 'lucide-react';
import { Business } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelInvoicesProps {
  business: Business;
}

export const TravelInvoices: React.FC<TravelInvoicesProps> = ({ business }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const currency = getCurrencySymbol(business.currency);

  const loadData = () => {
    const list = db.getTravelBookings(business.id);
    setBookings(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const filtered = bookings.filter(b => 
    b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" /> Travel Invoices & Receipts
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Auto-generated invoices for flights, hotel stays, visa processing, and tour packages
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search invoices by reference, customer name, destination..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Invoice No</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Service Details</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-right">Paid</th>
                <th className="p-4 text-right">Balance</th>
                <th className="p-4 text-right">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-sm">
                    No travel invoices generated yet. Create a booking to generate an automatic invoice.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const bal = (b.totalAmount || 0) - (b.paidAmount || 0);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600">
                        INV-{b.bookingNumber}
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {b.customerName}
                      </td>
                      <td className="p-4 text-slate-600 text-xs">
                        <span className="font-semibold text-slate-800">{b.serviceType}</span> - {b.destination}
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {b.createdAt ? b.createdAt.split('T')[0] : 'N/A'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          b.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.paymentStatus === 'Partial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900">
                        {currency}{b.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-medium text-emerald-600">
                        {currency}{b.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-bold text-rose-600">
                        {currency}{bal > 0 ? bal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => window.print()}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
