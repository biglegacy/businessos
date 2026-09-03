import React, { useState, useEffect } from 'react';
import { Calendar, Search, Plus, Edit, Trash2, Filter, DollarSign, User, MapPin, CheckCircle, Clock, AlertCircle, X, Plane, Hotel, FileCheck, Compass, Truck } from 'lucide-react';
import { Business, TravelBooking } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelBookingsProps {
  business: Business;
}

export const TravelBookings: React.FC<TravelBookingsProps> = ({ business }) => {
  const [bookings, setBookings] = useState<TravelBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<TravelBooking | null>(null);

  const currency = getCurrencySymbol(business.currency);

  const [formData, setFormData] = useState<Partial<TravelBooking>>({
    bookingNumber: '',
    customerId: '',
    customerName: '',
    serviceType: 'Flight',
    destination: '',
    departureDate: '',
    returnDate: '',
    airline: '',
    hotel: '',
    numberOfTravelers: 1,
    bookingStatus: 'Pending',
    paymentStatus: 'Unpaid',
    assignedStaff: business.ownerName || 'Staff',
    notes: '',
    totalAmount: 0,
    paidAmount: 0,
  });

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

  const handleOpenAdd = () => {
    setSelectedBooking(null);
    const num = `TB-${Math.floor(10000 + Math.random() * 90000)}`;
    setFormData({
      bookingNumber: num,
      customerId: '',
      customerName: '',
      serviceType: 'Flight',
      destination: '',
      departureDate: new Date().toISOString().split('T')[0],
      returnDate: '',
      airline: '',
      hotel: '',
      numberOfTravelers: 1,
      bookingStatus: 'Pending',
      paymentStatus: 'Unpaid',
      assignedStaff: business.ownerName || 'Staff',
      notes: '',
      totalAmount: 0,
      paidAmount: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: TravelBooking) => {
    setSelectedBooking(b);
    setFormData({ ...b });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.destination) {
      alert('Customer Name and Destination are required.');
      return;
    }

    const tot = Number(formData.totalAmount) || 0;
    const pd = Number(formData.paidAmount) || 0;
    let payStatus: 'Unpaid' | 'Partial' | 'Paid' | 'Refunded' = 'Unpaid';
    if (pd >= tot && tot > 0) payStatus = 'Paid';
    else if (pd > 0 && pd < tot) payStatus = 'Partial';

    const record: TravelBooking = {
      id: selectedBooking ? selectedBooking.id : `tb-${Date.now()}`,
      businessId: business.id,
      bookingNumber: formData.bookingNumber || `TB-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: formData.customerId || '',
      customerName: formData.customerName || '',
      serviceType: (formData.serviceType as any) || 'Flight',
      destination: formData.destination || '',
      departureDate: formData.departureDate || '',
      returnDate: formData.returnDate || '',
      airline: formData.airline || '',
      hotel: formData.hotel || '',
      numberOfTravelers: Number(formData.numberOfTravelers) || 1,
      bookingStatus: (formData.bookingStatus as any) || 'Pending',
      paymentStatus: payStatus,
      assignedStaff: formData.assignedStaff || business.ownerName || 'Staff',
      notes: formData.notes || '',
      totalAmount: tot,
      paidAmount: pd,
      createdAt: selectedBooking ? selectedBooking.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelBooking(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this booking?')) {
      db.deleteTravelBooking(id);
    }
  };

  const filtered = bookings.filter(b => {
    const matchesSearch = 
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.destination.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || b.bookingStatus === statusFilter;
    const matchesService = serviceFilter === 'All' || b.serviceType === serviceFilter;

    return matchesSearch && matchesStatus && matchesService;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" /> Travel & Tour Bookings
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage trip reservations, flights, hotels, tour itineraries, and payments
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Booking
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings by reference, customer name, destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        >
          <option value="All">All Services</option>
          <option value="Flight">Flight</option>
          <option value="Hotel">Hotel</option>
          <option value="Visa">Visa</option>
          <option value="Tour Package">Tour Package</option>
          <option value="Transportation">Transportation</option>
          <option value="Insurance">Insurance</option>
          <option value="Multiple Services">Multiple Services</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Processing">Processing</option>
          <option value="Ticketed">Ticketed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Booking Ref</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Service & Destination</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                    No bookings found. Click "Create Booking" to record a new travel reservation.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600">
                      {b.bookingNumber}
                    </td>
                    <td className="p-4 font-medium text-slate-900">
                      <div>{b.customerName}</div>
                      <div className="text-xs text-slate-400">{b.numberOfTravelers} Traveler(s)</div>
                    </td>
                    <td className="p-4 text-slate-700">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md">
                          {b.serviceType}
                        </span>
                        <span>{b.destination}</span>
                      </div>
                      {(b.airline || b.hotel) && (
                        <div className="text-xs text-slate-400 mt-1">
                          {b.airline && `Airline: ${b.airline}`} {b.hotel && `• Hotel: ${b.hotel}`}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div>Dep: <span className="font-medium text-slate-800">{b.departureDate || 'N/A'}</span></div>
                      {b.returnDate && <div>Ret: <span className="font-medium text-slate-800">{b.returnDate}</span></div>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Ticketed' || b.bookingStatus === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.bookingStatus === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.bookingStatus}
                      </span>
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
                      <div className="text-xs text-slate-400 mt-1">
                        Paid: {currency}{b.paidAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      {currency}{b.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedBooking ? 'Edit Booking' : 'New Travel Reservation'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Number</label>
                  <input
                    type="text"
                    disabled
                    value={formData.bookingNumber}
                    className="w-full px-3 py-2 bg-slate-100 border rounded-xl font-mono text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Kwame Mensah"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Type</label>
                  <select
                    value={formData.serviceType}
                    onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Flight">Flight</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Visa">Visa</option>
                    <option value="Tour Package">Tour Package</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Multiple Services">Multiple Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={e => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="London, UK"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Date</label>
                  <input
                    type="date"
                    value={formData.departureDate}
                    onChange={e => setFormData({ ...formData, departureDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={formData.returnDate}
                    onChange={e => setFormData({ ...formData, returnDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Airline (Optional)</label>
                  <input
                    type="text"
                    value={formData.airline}
                    onChange={e => setFormData({ ...formData, airline: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. British Airways"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hotel (Optional)</label>
                  <input
                    type="text"
                    value={formData.hotel}
                    onChange={e => setFormData({ ...formData, hotel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Hilton London"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Travelers Count</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.numberOfTravelers}
                    onChange={e => setFormData({ ...formData, numberOfTravelers: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Status</label>
                  <select
                    value={formData.bookingStatus}
                    onChange={e => setFormData({ ...formData, bookingStatus: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Ticketed">Ticketed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={e => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paid Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.paidAmount}
                    onChange={e => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-emerald-600"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Special Instructions</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Seat preferences, meal requests, visa application tracking details..."
                  />
                </div>
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
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-sm"
                >
                  Save Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
