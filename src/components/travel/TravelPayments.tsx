import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Plus, CreditCard, ArrowUpRight, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import { Business, TravelBooking } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelPaymentsProps {
  business: Business;
}

export const TravelPayments: React.FC<TravelPaymentsProps> = ({ business }) => {
  const [bookings, setBookings] = useState<TravelBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<TravelBooking | null>(null);
  const [paymentInput, setPaymentInput] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleOpenRecordPayment = (b: TravelBooking) => {
    setSelectedBooking(b);
    const balance = (b.totalAmount || 0) - (b.paidAmount || 0);
    setPaymentInput(balance > 0 ? balance : 0);
    setIsModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    const newPaid = (selectedBooking.paidAmount || 0) + Number(paymentInput);
    let newStatus: 'Unpaid' | 'Partial' | 'Paid' | 'Refunded' = 'Unpaid';
    if (newPaid >= selectedBooking.totalAmount) {
      newStatus = 'Paid';
    } else if (newPaid > 0) {
      newStatus = 'Partial';
    }

    const updatedBooking: TravelBooking = {
      ...selectedBooking,
      paidAmount: newPaid,
      paymentStatus: newStatus,
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelBooking(updatedBooking);
    setIsModalOpen(false);
  };

  const filtered = bookings.filter(b => 
    b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = bookings.reduce((acc, b) => acc + (b.paidAmount || 0), 0);
  const totalOutstanding = bookings.reduce((acc, b) => {
    const bal = (b.totalAmount || 0) - (b.paidAmount || 0);
    return acc + (bal > 0 && b.bookingStatus !== 'Cancelled' ? bal : 0);
  }, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" /> Payments & Accounts Receivable
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Collect traveler installments, track pending balances, and record payment methods
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Collected Revenue</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {currency}{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Outstanding Receivable Balances</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {currency}{totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by client, booking reference, destination..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Booking Ref</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Total Fee</th>
                <th className="p-4">Paid</th>
                <th className="p-4">Outstanding Balance</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Collect Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const bal = (b.totalAmount || 0) - (b.paidAmount || 0);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600">
                        {b.bookingNumber}
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {b.customerName}
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {currency}{b.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-emerald-600 font-semibold">
                        {currency}{b.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 font-bold text-rose-600">
                        {currency}{bal > 0 ? bal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
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
                      <td className="p-4 text-right">
                        {bal > 0 && (
                          <button
                            onClick={() => handleOpenRecordPayment(b)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                          >
                            + Add Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Record Payment - {selectedBooking.bookingNumber}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer</label>
                <div className="p-2.5 bg-slate-50 border rounded-xl font-medium text-slate-800">
                  {selectedBooking.customerName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min={1}
                  value={paymentInput}
                  onChange={e => setPaymentInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-lg text-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium shadow-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
