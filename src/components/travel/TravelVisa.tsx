import React, { useState, useEffect } from 'react';
import { FileCheck, Search, Plus, Edit, Trash2, Calendar, User, Globe, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { Business, TravelVisa } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelVisaProps {
  business: Business;
}

export const TravelVisaProcessing: React.FC<TravelVisaProps> = ({ business }) => {
  const [visas, setVisas] = useState<TravelVisa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisa, setSelectedVisa] = useState<TravelVisa | null>(null);

  const currency = getCurrencySymbol(business.currency);

  const [formData, setFormData] = useState<Partial<TravelVisa>>({
    customerName: '',
    country: 'United Kingdom',
    visaType: 'Tourist',
    submissionDate: '',
    appointmentDate: '',
    interviewDate: '',
    status: 'New',
    assignedOfficer: business.ownerName || 'Visa Officer',
    embassy: 'British High Commission, Accra',
    processingFee: 0,
    notes: '',
  });

  const loadData = () => {
    const list = db.getTravelVisas(business.id);
    setVisas(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAdd = () => {
    setSelectedVisa(null);
    setFormData({
      customerName: '',
      country: 'United Kingdom',
      visaType: 'Tourist',
      submissionDate: new Date().toISOString().split('T')[0],
      appointmentDate: '',
      interviewDate: '',
      status: 'New',
      assignedOfficer: business.ownerName || 'Visa Officer',
      embassy: 'British High Commission, Accra',
      processingFee: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: TravelVisa) => {
    setSelectedVisa(v);
    setFormData({ ...v });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.country) {
      alert('Customer Name and Target Country are required.');
      return;
    }

    const record: TravelVisa = {
      id: selectedVisa ? selectedVisa.id : `tv-${Date.now()}`,
      businessId: business.id,
      customerId: formData.customerId || '',
      customerName: formData.customerName || '',
      country: formData.country || '',
      visaType: formData.visaType || 'Tourist',
      submissionDate: formData.submissionDate || '',
      appointmentDate: formData.appointmentDate || '',
      interviewDate: formData.interviewDate || '',
      status: (formData.status as any) || 'New',
      assignedOfficer: formData.assignedOfficer || business.ownerName || 'Visa Officer',
      embassy: formData.embassy || '',
      processingFee: Number(formData.processingFee) || 0,
      notes: formData.notes || '',
      createdAt: selectedVisa ? selectedVisa.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelVisa(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this visa application record?')) {
      db.deleteTravelVisa(id);
    }
  };

  const filtered = visas.filter(v => {
    const matchesSearch = 
      v.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.embassy.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-sky-600" /> Visa Processing & Applications
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Track embassy submissions, biometrics appointments, interview dates, and decision status
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Visa Application
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search visa applications by applicant, country, embassy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
        >
          <option value="All">All Visa Statuses</option>
          <option value="New">New</option>
          <option value="Waiting for Documents">Waiting for Documents</option>
          <option value="Submitted">Submitted</option>
          <option value="Appointment Scheduled">Appointment Scheduled</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Collected">Collected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Applicant</th>
                <th className="p-4">Country & Type</th>
                <th className="p-4">Embassy</th>
                <th className="p-4">Key Dates</th>
                <th className="p-4">Officer</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Fee</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                    No visa processing records found. Click "New Visa Application" to track a client.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-medium text-slate-900">
                      {v.customerName}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{v.country}</div>
                      <div className="text-xs text-sky-600 font-medium">{v.visaType} Visa</div>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      {v.embassy || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      {v.appointmentDate && <div>Appt: <span className="font-medium text-slate-800">{v.appointmentDate}</span></div>}
                      {v.submissionDate && <div>Sub: <span className="font-medium text-slate-800">{v.submissionDate}</span></div>}
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      {v.assignedOfficer}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        v.status === 'Approved' || v.status === 'Collected'
                          ? 'bg-emerald-100 text-emerald-800'
                          : v.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : v.status === 'Under Review' || v.status === 'Appointment Scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">
                      {currency}{v.processingFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
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
                {selectedVisa ? 'Edit Visa Application' : 'New Visa Application'}
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
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="Kwame Mensah"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Country *</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="United Kingdom, USA, Canada, Schengen"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Visa Category</label>
                  <select
                    value={formData.visaType}
                    onChange={e => setFormData({ ...formData, visaType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="Tourist">Tourist Visa</option>
                    <option value="Business">Business Visa</option>
                    <option value="Student">Student Visa</option>
                    <option value="Work">Work Visa</option>
                    <option value="Transit">Transit Visa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Embassy / Consulate</label>
                  <input
                    type="text"
                    value={formData.embassy}
                    onChange={e => setFormData({ ...formData, embassy: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="British High Commission, Accra"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Date</label>
                  <input
                    type="date"
                    value={formData.appointmentDate}
                    onChange={e => setFormData({ ...formData, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Submission Date</label>
                  <input
                    type="date"
                    value={formData.submissionDate}
                    onChange={e => setFormData({ ...formData, submissionDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Application Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="New">New</option>
                    <option value="Waiting for Documents">Waiting for Documents</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Appointment Scheduled">Appointment Scheduled</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Collected">Collected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processing Fee ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.processingFee}
                    onChange={e => setFormData({ ...formData, processingFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Officer Notes / Requirements</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="Bank statement requirements, employment proof, invitation letter status..."
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
                  className="px-5 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-medium shadow-sm"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
