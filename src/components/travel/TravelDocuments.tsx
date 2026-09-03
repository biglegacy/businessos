import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, Trash2, Download, Upload, Eye, FileCheck, X } from 'lucide-react';
import { Business, TravelDocument } from '../../types';
import { db } from '../../lib/db';

interface TravelDocumentsProps {
  business: Business;
}

export const TravelDocuments: React.FC<TravelDocumentsProps> = ({ business }) => {
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<TravelDocument>>({
    customerName: '',
    documentType: 'Passport Copy',
    documentName: '',
    fileUrl: '',
    notes: '',
  });

  const loadData = () => {
    const list = db.getTravelDocuments(business.id);
    setDocuments(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAdd = () => {
    setFormData({
      customerName: '',
      documentType: 'Passport Copy',
      documentName: '',
      fileUrl: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.documentName) {
      alert('Customer Name and Document Name are required.');
      return;
    }

    const record: TravelDocument = {
      id: `tdoc-${Date.now()}`,
      businessId: business.id,
      customerId: formData.customerId || '',
      customerName: formData.customerName || '',
      documentType: (formData.documentType as any) || 'Passport Copy',
      documentName: formData.documentName || '',
      fileUrl: formData.fileUrl || '',
      uploadedAt: new Date().toISOString(),
      notes: formData.notes || '',
    };

    db.saveTravelDocument(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document reference?')) {
      db.deleteTravelDocument(id);
    }
  };

  const filtered = documents.filter(d => 
    d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.documentType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Travel Documents Vault
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Digital archive for passports, visa decision letters, e-Tickets, hotel vouchers, and invitation letters
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search documents by client name, document type, file title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="p-4">Customer Name</th>
                <th className="p-4">Document Title</th>
                <th className="p-4">Document Category</th>
                <th className="p-4">Uploaded At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                    No documents uploaded yet. Click "Upload Document" to store client travel files.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-medium text-slate-900">
                      {d.customerName}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      {d.documentName}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-800">
                        {d.documentType}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      {d.uploadedAt ? d.uploadedAt.split('T')[0] : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(d.id)}
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Upload Travel Document</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={formData.documentName}
                  onChange={e => setFormData({ ...formData, documentName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Kwame Mensah Passport Scan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={formData.documentType}
                  onChange={e => setFormData({ ...formData, documentType: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Passport Copy">Passport Copy</option>
                  <option value="e-Ticket">e-Ticket</option>
                  <option value="Hotel Voucher">Hotel Voucher</option>
                  <option value="Visa Grant Letter">Visa Grant Letter</option>
                  <option value="Insurance Policy">Insurance Policy</option>
                  <option value="Bank Statement">Bank Statement</option>
                  <option value="Other">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Expiry date notes or special instructions..."
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
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-sm"
                >
                  Save File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
