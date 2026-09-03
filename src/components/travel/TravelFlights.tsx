import React, { useState, useEffect } from 'react';
import { Plane, Search, Plus, Edit, Trash2, Calendar, DollarSign, X } from 'lucide-react';
import { Business, TravelFlight } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelFlightsProps {
  business: Business;
}

export const TravelFlights: React.FC<TravelFlightsProps> = ({ business }) => {
  const [flights, setFlights] = useState<TravelFlight[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<TravelFlight | null>(null);

  const currency = getCurrencySymbol(business.currency);

  const [formData, setFormData] = useState<Partial<TravelFlight>>({
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTime: '',
    arrivalTime: '',
    ticketClass: 'Economy',
    seatPreference: '',
    ticketCost: 0,
    sellingPrice: 0,
    bookingReference: '',
    passengerName: '',
    status: 'Reserved',
  });

  const loadData = () => {
    const list = db.getTravelFlights(business.id);
    setFlights(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAdd = () => {
    setSelectedFlight(null);
    setFormData({
      airline: '',
      flightNumber: '',
      departureAirport: '',
      arrivalAirport: '',
      departureTime: new Date().toISOString().split('T')[0] + 'T10:00',
      arrivalTime: new Date().toISOString().split('T')[0] + 'T18:00',
      ticketClass: 'Economy',
      seatPreference: '',
      ticketCost: 0,
      sellingPrice: 0,
      bookingReference: `PNR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      passengerName: '',
      status: 'Reserved',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: TravelFlight) => {
    setSelectedFlight(f);
    setFormData({ ...f });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.airline || !formData.flightNumber) {
      alert('Airline and Flight Number are required.');
      return;
    }

    const record: TravelFlight = {
      id: selectedFlight ? selectedFlight.id : `tf-${Date.now()}`,
      businessId: business.id,
      airline: formData.airline || '',
      flightNumber: formData.flightNumber || '',
      departureAirport: formData.departureAirport || '',
      arrivalAirport: formData.arrivalAirport || '',
      departureTime: formData.departureTime || '',
      arrivalTime: formData.arrivalTime || '',
      ticketClass: (formData.ticketClass as any) || 'Economy',
      seatPreference: formData.seatPreference || '',
      ticketCost: Number(formData.ticketCost) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      bookingReference: formData.bookingReference || '',
      passengerName: formData.passengerName || '',
      status: (formData.status as any) || 'Reserved',
      createdAt: selectedFlight ? selectedFlight.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelFlight(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this flight record?')) {
      db.deleteTravelFlight(id);
    }
  };

  const filtered = flights.filter(f => 
    f.airline.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.passengerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.bookingReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.departureAirport.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.arrivalAirport.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Plane className="w-5 h-5 text-cyan-600" /> Flight Reservations
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage airline tickets, PNR references, flight schedules, and passenger seats
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Flight Reservation
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search flights by airline, flight no, PNR, passenger name, airport..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
        />
      </div>

      {/* Flight List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Airline & Flight</th>
                <th className="p-4">PNR Ref</th>
                <th className="p-4">Passenger</th>
                <th className="p-4">Route</th>
                <th className="p-4">Departure / Arrival</th>
                <th className="p-4">Class</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                    No flight reservations recorded. Click "Add Flight Reservation" to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-medium text-slate-900">
                      <div>{f.airline}</div>
                      <div className="text-xs text-cyan-600 font-mono font-bold">{f.flightNumber}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700">
                      {f.bookingReference || '—'}
                    </td>
                    <td className="p-4 text-slate-800 font-medium">
                      {f.passengerName || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <span className="font-semibold text-slate-800">{f.departureAirport || 'ACC'}</span> → <span className="font-semibold text-slate-800">{f.arrivalAirport || 'LHR'}</span>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div>Dep: {f.departureTime}</div>
                      <div>Arr: {f.arrivalTime}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-cyan-50 text-cyan-800">
                        {f.ticketClass}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      {currency}{f.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(f)}
                          className="p-1.5 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
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
                {selectedFlight ? 'Edit Flight Reservation' : 'New Flight Reservation'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Airline *</label>
                  <input
                    type="text"
                    required
                    value={formData.airline}
                    onChange={e => setFormData({ ...formData, airline: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="e.g. British Airways, KLM, Emirates"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Flight Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.flightNumber}
                    onChange={e => setFormData({ ...formData, flightNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                    placeholder="e.g. BA078"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PNR / Booking Ref</label>
                  <input
                    type="text"
                    value={formData.bookingReference}
                    onChange={e => setFormData({ ...formData, bookingReference: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono uppercase"
                    placeholder="e.g. PNR789"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Passenger Name</label>
                  <input
                    type="text"
                    value={formData.passengerName}
                    onChange={e => setFormData({ ...formData, passengerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Kwame Mensah"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Airport</label>
                  <input
                    type="text"
                    value={formData.departureAirport}
                    onChange={e => setFormData({ ...formData, departureAirport: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Kotoka Intl (ACC)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Arrival Airport</label>
                  <input
                    type="text"
                    value={formData.arrivalAirport}
                    onChange={e => setFormData({ ...formData, arrivalAirport: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="London Heathrow (LHR)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Time</label>
                  <input
                    type="datetime-local"
                    value={formData.departureTime}
                    onChange={e => setFormData({ ...formData, departureTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Arrival Time</label>
                  <input
                    type="datetime-local"
                    value={formData.arrivalTime}
                    onChange={e => setFormData({ ...formData, arrivalTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Class</label>
                  <select
                    value={formData.ticketClass}
                    onChange={e => setFormData({ ...formData, ticketClass: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="Economy">Economy</option>
                    <option value="Premium Economy">Premium Economy</option>
                    <option value="Business">Business</option>
                    <option value="First Class">First Class</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-bold"
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
                  className="px-5 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 font-medium shadow-sm"
                >
                  Save Flight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
