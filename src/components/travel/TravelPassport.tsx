import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Plus, Edit, Trash2, Calendar, User, X } from 'lucide-react';
import { Business, TravelPassport } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelPassportProps {
  business: Business;
}

export const TravelPassportAssistance: React.FC<TravelPassportProps> = ({ business }) => {
  const [passports, setPassports] = useState<TravelPassport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPassport, setSelectedPassport] = useState<TravelPassport | null>(null);

  const currency = getCurrencySymbol(business.currency);

  const [formData, setFormData] = useState<Partial<TravelPassport>>({
    customerName: '',
    serviceType: 'Renewal',
    passportNumber: '',
    expiryDate: '',
    submissionDate: '',
    collectionDate: '',
    status: 'Processing',
    fee: 0,
    notes: '',
  });

  const loadData = () => {
    const list = db.getTravelPassports(business.id);
    setPassports(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAdd = () => {
    setSelectedPassport(null);
    setFormData({
      customerName: '',
      serviceType: 'Renewal',
      passportNumber: '',
      expiryDate: '',
      submissionDate: new Date().toISOString().split('T')[0],
      collectionDate: '',
      status: 'Processing',
      fee: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: TravelPassport) => {
    setSelectedPassport(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName) {
      alert('Customer Name is required.');
      return;
    }

    const record: TravelPassport = {
      id: selectedPassport ? selectedPassport.id : `tp-${Date.now()}`,
      businessId: business.id,
      customerId: formData.customerId || '',
      customerName: formData.customerName || '',
      serviceType: (formData.serviceType as any) || 'Renewal',
      passportNumber: formData.passportNumber || '',
      expiryDate: formData.expiryDate || '',
      submissionDate: formData.submissionDate || '',
      collectionDate: formData.collectionDate || '',
      status: (formData.status as any) || 'Processing',
      fee: Number(formData.fee) || 0,
      notes: formData.notes || '',
      createdAt: selectedPassport ? selectedPassport.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelPassport(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this passport record?')) {
      db.deleteTravelPassport(id);
    }
  };

  const filtered = passports.filter(p => 
    p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.passportNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.serviceType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" /> Passport Assistance Requests
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage passport applications, renewals, lost passport replacements, and express biometric processing
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Passport Request
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search requests by applicant name, passport number, service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Applicant</th>
                <th className="p-4">Service Type</th>
                <th className="p-4">Passport No.</th>
                <th className="p-4">Submission / Collection</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Fee</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    No passport assistance records found. Click "New Passport Request" to add one.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-medium text-slate-900">
                      {p.customerName}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-teal-50 text-teal-800">
                        {p.serviceType}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-700">
                      {p.passportNumber || '—'}
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div>Sub: {p.submissionDate || 'N/A'}</div>
                      {p.collectionDate && <div>Col: {p.collectionDate}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        p.status === 'Collected' || p.status === 'Ready for Collection'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      {currency}{p.fee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
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
                {selectedPassport ? 'Edit Passport Request' : 'New Passport Request'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Applicant Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="Kwame Mensah"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Service Type</label>
                  <select
                    value={formData.serviceType}
                    onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="New Passport">New Passport</option>
                    <option value="Renewal">Renewal</option>
                    <option value="Lost Passport">Lost Passport</option>
                    <option value="Expedited Service">Expedited Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Passport Number (If existing)</label>
                  <input
                    type="text"
                    value={formData.passportNumber}
                    onChange={e => setFormData({ ...formData, passportNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                    placeholder="G1234567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Processing">Processing</option>
                    <option value="Ready for Collection">Ready for Collection</option>
                    <option value="Collected">Collected</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Submission Date</label>
                  <input
                    type="date"
                    value={formData.submissionDate}
                    onChange={e => setFormData({ ...formData, submissionDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fee ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fee}
                    onChange={e => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-bold"
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
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-medium shadow-sm"
                >
                  Save Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
