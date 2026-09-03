import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit, Trash2, Phone, Mail, MapPin, FileText, Globe, Calendar, X, Upload } from 'lucide-react';
import { Business, TravelCustomer } from '../../types';
import { db } from '../../lib/db';

interface TravelCustomersProps {
  business: Business;
}

export const TravelCustomers: React.FC<TravelCustomersProps> = ({ business }) => {
  const [customers, setCustomers] = useState<TravelCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<TravelCustomer | null>(null);

  const [formData, setFormData] = useState<Partial<TravelCustomer>>({
    fullName: '',
    passportNumber: '',
    nationality: 'Ghanaian',
    dateOfBirth: '',
    phoneNumber: '',
    email: '',
    address: '',
    emergencyContact: '',
    customerNotes: '',
    preferredDestination: '',
    travelHistory: '',
  });

  const loadCustomers = () => {
    const list = db.getTravelCustomers(business.id);
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
    const unsubscribe = db.subscribe(() => {
      loadCustomers();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAddModal = () => {
    setSelectedCustomer(null);
    setFormData({
      fullName: '',
      passportNumber: '',
      nationality: 'Ghanaian',
      dateOfBirth: '',
      phoneNumber: '',
      email: '',
      address: '',
      emergencyContact: '',
      customerNotes: '',
      preferredDestination: '',
      travelHistory: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: TravelCustomer) => {
    setSelectedCustomer(c);
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phoneNumber) {
      alert('Full Name and Phone Number are required.');
      return;
    }

    const customerRecord: TravelCustomer = {
      id: selectedCustomer ? selectedCustomer.id : `tc-${Date.now()}`,
      businessId: business.id,
      fullName: formData.fullName || '',
      passportNumber: formData.passportNumber || '',
      nationality: formData.nationality || 'Ghanaian',
      dateOfBirth: formData.dateOfBirth || '',
      phoneNumber: formData.phoneNumber || '',
      email: formData.email || '',
      address: formData.address || '',
      emergencyContact: formData.emergencyContact || '',
      customerNotes: formData.customerNotes || '',
      preferredDestination: formData.preferredDestination || '',
      travelHistory: formData.travelHistory || '',
      createdAt: selectedCustomer ? selectedCustomer.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelCustomer(customerRecord);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      db.deleteTravelCustomer(id);
    }
  };

  const filtered = customers.filter(c => 
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.passportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber.includes(searchQuery) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Travel Customers Directory
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage traveler profiles, passport details, and travel preferences
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Traveler
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search customers by name, passport number, phone, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Traveler Name</th>
                <th className="p-4">Passport No.</th>
                <th className="p-4">Nationality</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Preferred Destination</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    No travel customers found. Click "Add Traveler" to register a client.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-medium text-slate-900">
                      <div>{c.fullName}</div>
                      {c.dateOfBirth && <div className="text-xs text-slate-400">DOB: {c.dateOfBirth}</div>}
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-700">
                      {c.passportNumber || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-600">
                      {c.nationality}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {c.phoneNumber}</div>
                      {c.email && <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5"><Mail className="w-3.5 h-3.5" /> {c.email}</div>}
                    </td>
                    <td className="p-4 text-slate-600">
                      {c.preferredDestination ? (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          {c.preferredDestination}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
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
                {selectedCustomer ? 'Edit Traveler Profile' : 'Add New Traveler'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Kwame Mensah"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Passport Number</label>
                  <input
                    type="text"
                    value={formData.passportNumber}
                    onChange={e => setFormData({ ...formData, passportNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    placeholder="e.g. G1234567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Ghanaian"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phoneNumber}
                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="+233 24 000 0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="client@email.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Accra, Ghana"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Name & Phone"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Destination</label>
                  <input
                    type="text"
                    value={formData.preferredDestination}
                    onChange={e => setFormData({ ...formData, preferredDestination: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. UK, Canada, Dubai"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Notes & Travel History</label>
                  <textarea
                    rows={3}
                    value={formData.customerNotes}
                    onChange={e => setFormData({ ...formData, customerNotes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Previous visas, travel preferences, medical conditions, special requests..."
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
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
