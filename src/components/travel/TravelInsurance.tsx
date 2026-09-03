import React, { useState, useEffect } from 'react';
import { Shield, Search, Plus, Edit, Trash2, Calendar, User, X } from 'lucide-react';
import { Business, TravelInsurance } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelInsuranceProps {
  business: Business;
}

export const TravelInsuranceManagement: React.FC<TravelInsuranceProps> = ({ business }) => {
  const [insurances, setInsurances] = useState<TravelInsurance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState<TravelInsurance | null>(null);

  const currency = getCurrencySymbol(business.currency);

  const [formData, setFormData] = useState<Partial<TravelInsurance>>({
    provider: 'Allianz Global / Enterprise Insurance',
    policyNumber: '',
    coverageType: 'Medical & Interruption',
    travelerName: '',
    startDate: '',
    endDate: '',
    premiumAmount: 0,
    status: 'Issued',
  });

  const loadData = () => {
    const list = db.getTravelInsurances(business.id);
    setInsurances(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAdd = () => {
    setSelectedInsurance(null);
    setFormData({
      provider: 'Allianz Global Assistance',
      policyNumber: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
      coverageType: 'Comprehensive World Travel',
      travelerName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      premiumAmount: 150,
      status: 'Issued',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (i: TravelInsurance) => {
    setSelectedInsurance(i);
    setFormData({ ...i });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.travelerName || !formData.provider) {
      alert('Traveler Name and Provider are required.');
      return;
    }

    const record: TravelInsurance = {
      id: selectedInsurance ? selectedInsurance.id : `ti-${Date.now()}`,
      businessId: business.id,
      insuranceProvider: formData.provider || '',
      coverage: formData.coverageType || 'Comprehensive',
      premium: Number(formData.premiumAmount) || 0,
      expiryDate: formData.endDate || new Date().toISOString().split('T')[0],
      provider: formData.provider || '',
      policyNumber: formData.policyNumber || '',
      coverageType: formData.coverageType || '',
      travelerName: formData.travelerName || '',
      startDate: formData.startDate || '',
      endDate: formData.endDate || '',
      premiumAmount: Number(formData.premiumAmount) || 0,
      status: (formData.status as any) || 'Issued',
      createdAt: selectedInsurance ? selectedInsurance.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelInsurance(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this travel insurance record?')) {
      db.deleteTravelInsurance(id);
    }
  };

  const filtered = insurances.filter(i => 
    i.travelerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.policyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" /> Travel Insurance Policies
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Issue travel health insurance, trip cancellation protection, and baggage coverage policies
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Issue Insurance Policy
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search insurance by traveler name, policy number, provider..."
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
                <th className="p-4">Traveler Name</th>
                <th className="p-4">Policy No.</th>
                <th className="p-4">Provider & Coverage</th>
                <th className="p-4">Coverage Period</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Premium</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    No insurance policies recorded. Click "Issue Insurance Policy" to issue one.
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-medium text-slate-900">
                      {i.travelerName}
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-600">
                      {i.policyNumber}
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div className="font-semibold text-slate-800">{i.provider}</div>
                      <div>{i.coverageType}</div>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div>Start: {i.startDate}</div>
                      <div>End: {i.endDate}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                        {i.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      {currency}{i.premiumAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(i)}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(i.id)}
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
                {selectedInsurance ? 'Edit Insurance Policy' : 'Issue Insurance Policy'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Traveler Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.travelerName}
                    onChange={e => setFormData({ ...formData, travelerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Kwame Mensah"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Insurance Provider *</label>
                  <input
                    type="text"
                    required
                    value={formData.provider}
                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Allianz Global Assistance"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={formData.policyNumber}
                    onChange={e => setFormData({ ...formData, policyNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Coverage Type</label>
                  <input
                    type="text"
                    value={formData.coverageType}
                    onChange={e => setFormData({ ...formData, coverageType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Medical, Baggage & Flight Cancellation"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Premium Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.premiumAmount}
                    onChange={e => setFormData({ ...formData, premiumAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
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
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium shadow-sm"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
