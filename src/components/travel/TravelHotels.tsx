import React, { useState, useEffect } from 'react';
import { Hotel, Search, Plus, Edit, Trash2, MapPin, Calendar, DollarSign, X } from 'lucide-react';
import { Business, TravelHotel } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelHotelsProps {
  business: Business;
}

export const TravelHotels: React.FC<TravelHotelsProps> = ({ business }) => {
  const [hotels, setHotels] = useState<TravelHotel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<TravelHotel | null>(null);

  const currency = getCurrencySymbol(business.currency);

  const [formData, setFormData] = useState<Partial<TravelHotel>>({
    hotelName: '',
    city: '',
    country: '',
    checkIn: '',
    checkOut: '',
    roomType: 'Deluxe Room',
    numberOfGuests: 2,
    bookingReference: '',
    cost: 0,
    sellingPrice: 0,
    guestName: '',
    status: 'Reserved',
  });

  const loadData = () => {
    const list = db.getTravelHotels(business.id);
    setHotels(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAdd = () => {
    setSelectedHotel(null);
    setFormData({
      hotelName: '',
      city: '',
      country: '',
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      roomType: 'Standard King',
      numberOfGuests: 2,
      bookingReference: `HTL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      cost: 0,
      sellingPrice: 0,
      guestName: '',
      status: 'Reserved',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h: TravelHotel) => {
    setSelectedHotel(h);
    setFormData({ ...h });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hotelName || !formData.city) {
      alert('Hotel Name and City are required.');
      return;
    }

    const record: TravelHotel = {
      id: selectedHotel ? selectedHotel.id : `th-${Date.now()}`,
      businessId: business.id,
      hotelName: formData.hotelName || '',
      city: formData.city || '',
      country: formData.country || '',
      checkIn: formData.checkIn || '',
      checkOut: formData.checkOut || '',
      roomType: formData.roomType || 'Standard',
      numberOfGuests: Number(formData.numberOfGuests) || 1,
      bookingReference: formData.bookingReference || '',
      cost: Number(formData.cost) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      guestName: formData.guestName || '',
      status: (formData.status as any) || 'Reserved',
      createdAt: selectedHotel ? selectedHotel.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelHotel(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this hotel reservation?')) {
      db.deleteTravelHotel(id);
    }
  };

  const filtered = hotels.filter(h => 
    h.hotelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.guestName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.bookingReference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Hotel className="w-5 h-5 text-violet-600" /> Hotel Reservations
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage hotel bookings, room types, check-in schedules, and guest vouchers
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Hotel Reservation
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search hotels by name, city, guest, booking ref..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Hotel Name</th>
                <th className="p-4">Ref</th>
                <th className="p-4">Location</th>
                <th className="p-4">Guest</th>
                <th className="p-4">Check In / Check Out</th>
                <th className="p-4">Room Type</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                    No hotel reservations recorded. Click "Add Hotel Reservation" to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-medium text-slate-900">
                      {h.hotelName}
                    </td>
                    <td className="p-4 font-mono font-bold text-violet-600">
                      {h.bookingReference || '—'}
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {h.city}{h.country ? `, ${h.country}` : ''}</div>
                    </td>
                    <td className="p-4 text-slate-800 font-medium">
                      {h.guestName || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div>In: {h.checkIn}</div>
                      <div>Out: {h.checkOut}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-violet-50 text-violet-800">
                        {h.roomType} ({h.numberOfGuests} Guests)
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      {currency}{h.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(h)}
                          className="p-1.5 text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedHotel ? 'Edit Hotel Reservation' : 'New Hotel Reservation'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hotel Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.hotelName}
                    onChange={e => setFormData({ ...formData, hotelName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    placeholder="e.g. Hilton London Metropole"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Reference</label>
                  <input
                    type="text"
                    value={formData.bookingReference}
                    onChange={e => setFormData({ ...formData, bookingReference: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    placeholder="London"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    placeholder="United Kingdom"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check In Date</label>
                  <input
                    type="date"
                    value={formData.checkIn}
                    onChange={e => setFormData({ ...formData, checkIn: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check Out Date</label>
                  <input
                    type="date"
                    value={formData.checkOut}
                    onChange={e => setFormData({ ...formData, checkOut: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Type</label>
                  <input
                    type="text"
                    value={formData.roomType}
                    onChange={e => setFormData({ ...formData, roomType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    placeholder="Executive King Suite"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Name</label>
                  <input
                    type="text"
                    value={formData.guestName}
                    onChange={e => setFormData({ ...formData, guestName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    placeholder="Kwame Mensah"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Guests</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.numberOfGuests}
                    onChange={e => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-bold"
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
                  className="px-5 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium shadow-sm"
                >
                  Save Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
