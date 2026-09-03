import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, Customer, Sale, SalonAppointment } from '../types';
import { ImageUploadInput } from './ImageUploadInput';
import { 
  Users, Plus, Search, Edit3, Trash2, Phone, Mail, 
  Calendar, Scissors, ShoppingBag, History, FileText, 
  UserCheck, X, Sparkles, User as UserIcon
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface SalonCustomersProps {
  business: Business;
}

export const SalonCustomers: React.FC<SalonCustomersProps> = ({ business }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected Customer for Detailed Profile Drawer / Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Edit/Add Customer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [notes, setNotes] = useState('');
  const [preferences, setPreferences] = useState('');

  // Load Data
  const customers = db.getCustomers(business.id);
  const sales = db.getSales(business.id);
  const appointments = db.getSalonAppointments(business.id);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setProfileImage('');
    setNotes('');
    setPreferences('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setProfileImage(c.profileImage || '');
    setNotes(c.notes || '');
    setPreferences(c.preferences || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Validation Error', 'Please enter customer name.');
      return;
    }

    const custObj: Customer = {
      id: editingCustomer ? editingCustomer.id : 'cust_' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      profileImage: profileImage || undefined,
      notes: notes.trim() || undefined,
      preferences: preferences.trim() || undefined,
      balance: editingCustomer ? editingCustomer.balance : 0,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString()
    };

    db.saveCustomer(business.id, custObj);
    showSuccess(editingCustomer ? 'Client Updated' : 'Client Registered', `${name} profile saved.`);
    setIsModalOpen(false);

    if (selectedCustomer && selectedCustomer.id === custObj.id) {
      setSelectedCustomer(custObj);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-600" /> Salon Client Profiles
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage client records, view past appointments, service history, retail purchases, and styling preferences.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Add New Client
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients by name, telephone, email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      {/* Customers List & Profile Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Clients List */}
        <div className={`space-y-4 ${selectedCustomer ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
              <Users className="h-12 w-12 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-500">No client profiles found.</p>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl hover:bg-purple-100 transition cursor-pointer"
              >
                + Register Client
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomers.map(c => {
                const clientApps = appointments.filter(a => a.customerId === c.id || a.customerName.toLowerCase() === c.name.toLowerCase());
                const clientSales = sales.filter(s => s.customerId === c.id || (s.customerName && s.customerName.toLowerCase() === c.name.toLowerCase()));
                const isSelected = selectedCustomer?.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`bg-white p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'border-purple-600 ring-2 ring-purple-500/20 shadow-md' 
                        : 'border-slate-200/80 hover:border-purple-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 font-black flex items-center justify-center overflow-hidden shrink-0 border border-purple-200">
                          {c.profileImage ? (
                            <img src={c.profileImage} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-lg">{c.name.charAt(0)}</span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm">{c.name}</h3>
                          <p className="text-xs text-slate-500 font-mono">{c.phone || 'No phone'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                          <span className="block text-slate-400 font-bold text-[9px] uppercase">Appointments</span>
                          <span className="font-black text-purple-900 text-sm">{clientApps.length}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                          <span className="block text-slate-400 font-bold text-[9px] uppercase">Purchases</span>
                          <span className="font-black text-emerald-900 text-sm">{clientSales.length}</span>
                        </div>
                      </div>

                      {c.preferences && (
                        <p className="text-[11px] text-purple-900 font-medium bg-purple-50/60 p-2 rounded-xl line-clamp-2 border border-purple-100/60">
                          <strong>Preferences:</strong> {c.preferences}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-purple-700 font-bold hover:underline">View Full History & Preferences →</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(c);
                        }}
                        className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Customer History & Preferences Drawer */}
        {selectedCustomer && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-6 self-start sticky top-6">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-700 text-white font-black text-xl flex items-center justify-center overflow-hidden">
                  {selectedCustomer.profileImage ? (
                    <img src={selectedCustomer.profileImage} alt={selectedCustomer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    selectedCustomer.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedCustomer.phone}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Styling Preferences & Notes Box */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100 space-y-2">
              <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-600" /> Styling Preferences & Formulas
              </h4>
              <p className="text-xs text-purple-900 font-medium leading-relaxed">
                {selectedCustomer.preferences || 'No styling preferences specified yet.'}
              </p>
              {selectedCustomer.notes && (
                <p className="text-[11px] text-slate-600 pt-1 border-t border-purple-200/60 italic">
                  Notes: {selectedCustomer.notes}
                </p>
              )}
            </div>

            {/* Service & Appointment History */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-purple-600" /> Appointment History
              </h4>

              {(() => {
                const clientApps = appointments.filter(a => a.customerId === selectedCustomer.id || a.customerName.toLowerCase() === selectedCustomer.name.toLowerCase());
                if (clientApps.length === 0) {
                  return <p className="text-xs text-slate-400 italic">No past appointments logged.</p>;
                }
                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                    {clientApps.map(app => (
                      <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{app.serviceName}</span>
                          <span className="text-purple-700">{formatCurrency(app.price, business.currency)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{app.date} at {app.time}</span>
                          <span className="font-bold uppercase text-purple-800">{app.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Purchase History */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-indigo-600" /> Product Purchases
              </h4>

              {(() => {
                const clientSales = sales.filter(s => s.customerId === selectedCustomer.id || (s.customerName && s.customerName.toLowerCase() === selectedCustomer.name.toLowerCase()));
                if (clientSales.length === 0) {
                  return <p className="text-xs text-slate-400 italic">No product receipts on record.</p>;
                }
                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                    {clientSales.map(sale => (
                      <div key={sale.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Receipt #{sale.id.slice(-6).toUpperCase()}</span>
                          <span className="text-emerald-700">{formatCurrency(sale.total, business.currency)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                {editingCustomer ? 'Edit Client Profile' : 'Register New Salon Client'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amanda Seyfried"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telephone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 24 123 4567"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amanda@gmail.com"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <ImageUploadInput
                  value={profileImage}
                  onChange={setProfileImage}
                  label="Profile Picture / Avatar Upload"
                  placeholder="Upload client photo or URL"
                  businessId={business.id}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Styling Preferences & Hair Formula</label>
                <textarea
                  rows={2}
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="e.g. Prefers organic hair dye, balayage technique, blonde toner 9.1..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-2xl text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Client Notes / Health Remarks</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Allergic to ammonia products, sensitive skin..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-2xl text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold shadow-md transition cursor-pointer"
                >
                  {editingCustomer ? 'Save Profile Changes' : 'Register Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
