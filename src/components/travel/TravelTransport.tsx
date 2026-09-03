import React, { useState, useEffect } from 'react';
import { Truck, Search, Plus, Edit, Trash2, Calendar, User, MapPin, X } from 'lucide-react';
import { Business, TravelTransport } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelTransportProps {
  business: Business;
}

export const TravelTransportation: React.FC<TravelTransportProps> = ({ business }) => {
  const [transports, setTransports] = useState<TravelTransport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<TravelTransport | null>(null);

  const currency = getCurrencySymbol(business.currency);

  const [formData, setFormData] = useState<Partial<TravelTransport>>({
    vehicleType: 'SUV / Bus',
    driverName: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupTime: '',
    passengerName: '',
    bookingReference: '',
    cost: 0,
    sellingPrice: 0,
    status: 'Booked',
  });

  const loadData = () => {
    const list = db.getTravelTransports(business.id);
    setTransports(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAdd = () => {
    setSelectedTransport(null);
    setFormData({
      vehicleType: 'Executive Sedan',
      driverName: '',
      pickupLocation: 'Kotoka Intl Airport (ACC)',
      dropoffLocation: 'Kempinski Hotel, Accra',
      pickupTime: new Date().toISOString().split('T')[0] + 'T12:00',
      passengerName: '',
      bookingReference: `TRP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      cost: 0,
      sellingPrice: 0,
      status: 'Booked',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: TravelTransport) => {
    setSelectedTransport(t);
    setFormData({ ...t });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pickupLocation || !formData.dropoffLocation) {
      alert('Pickup and Dropoff locations are required.');
      return;
    }

    const record: TravelTransport = {
      id: selectedTransport ? selectedTransport.id : `tt-${Date.now()}`,
      businessId: business.id,
      type: formData.vehicleType || 'Executive Sedan',
      driver: formData.driverName || '',
      vehicle: formData.vehicleType || 'Executive Sedan',
      dropOffTime: formData.pickupTime || '',
      destination: formData.dropoffLocation || '',
      vehicleType: formData.vehicleType || 'Executive Sedan',
      driverName: formData.driverName || '',
      pickupLocation: formData.pickupLocation || '',
      dropoffLocation: formData.dropoffLocation || '',
      pickupTime: formData.pickupTime || '',
      passengerName: formData.passengerName || '',
      bookingReference: formData.bookingReference || '',
      cost: Number(formData.cost) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      status: (formData.status as any) || 'Booked',
      createdAt: selectedTransport ? selectedTransport.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelTransport(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this transport booking?')) {
      db.deleteTravelTransport(id);
    }
  };

  const filtered = transports.filter(t => 
    t.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.dropoffLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.passengerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-slate-700" /> Ground Transportation & Airport Transfers
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage airport pickups, private chauffeured cars, tour buses, and vehicle rentals
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Book Ground Transfer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search transport by vehicle, pickup, dropoff, passenger..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Vehicle Type</th>
                <th className="p-4">Passenger</th>
                <th className="p-4">Pickup & Dropoff</th>
                <th className="p-4">Pickup Time</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    No transportation bookings recorded. Click "Book Ground Transfer" to schedule one.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-medium text-slate-900">
                      {t.vehicleType}
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      {t.passengerName || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div className="font-semibold text-slate-800">{t.pickupLocation}</div>
                      <div>→ {t.dropoffLocation}</div>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      {t.pickupTime}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      {currency}{t.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedTransport ? 'Edit Transport Booking' : 'New Transport Booking'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Type</label>
                  <input
                    type="text"
                    value={formData.vehicleType}
                    onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-500 focus:outline-none"
                    placeholder="e.g. Executive Sedan, 15-Seater Bus"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Passenger Name</label>
                  <input
                    type="text"
                    value={formData.passengerName}
                    onChange={e => setFormData({ ...formData, passengerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-500 focus:outline-none"
                    placeholder="Kwame Mensah"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pickup Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupLocation}
                    onChange={e => setFormData({ ...formData, pickupLocation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-500 focus:outline-none"
                    placeholder="Kotoka Intl Airport"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dropoff Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.dropoffLocation}
                    onChange={e => setFormData({ ...formData, dropoffLocation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-500 focus:outline-none"
                    placeholder="Labadi Beach Hotel"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pickup Time</label>
                  <input
                    type="datetime-local"
                    value={formData.pickupTime}
                    onChange={e => setFormData({ ...formData, pickupTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-slate-500 focus:outline-none font-bold"
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
                  className="px-5 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-medium shadow-sm"
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
