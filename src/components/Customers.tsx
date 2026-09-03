/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { Customer, Sale, Business, User } from '../types';
import { 
  Users, Plus, Search, Edit, Trash2, X, 
  FileText, Calendar, DollarSign, ArrowUpRight, FileDown
} from 'lucide-react';
import { exportCustomersToCSV } from '../lib/csvExport';

interface CustomersProps {
  business: Business;
  user: User;
}

export function Customers({ business, user }: CustomersProps) {
  const [search, setSearch] = useState('');
  const [trigger, setTrigger] = useState(0);
  const forceUpdate = () => setTrigger(prev => prev + 1);

  // Modals / Selection drawers
  const [selectedCustProfile, setSelectedCustProfile] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form Fields
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custBalance, setCustBalance] = useState(0);

  const customers = db.getCustomers(business.id);
  const sales = db.getSales(business.id);

  const handleEditClick = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening profile drawer
    setSelectedCustProfile(c);
    setIsEditing(true);
    setIsCreatingNew(false);

    setCustName(c.name);
    setCustEmail(c.email);
    setCustPhone(c.phone);
    setCustBalance(c.balance);
  };

  const handleCreateNewClick = () => {
    setIsCreatingNew(true);
    setIsEditing(false);
    setSelectedCustProfile(null);

    setCustName('');
    setCustEmail('');
    setCustPhone('');
    setCustBalance(0);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to permanently remove this customer profile? Historical transactions will be detached but preserved.')) {
      db.deleteCustomer(business.id, id);
      alert('Customer profile deleted successfully.');
      if (selectedCustProfile?.id === id) setSelectedCustProfile(null);
      forceUpdate();
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName) {
      alert('Customer Name is required.');
      return;
    }

    const targetId = isEditing && selectedCustProfile ? selectedCustProfile.id : 'c-' + Math.random().toString(36).substring(2, 9);
    const customerData: Customer = {
      id: targetId,
      businessId: business.id,
      name: custName,
      email: custEmail,
      phone: custPhone,
      balance: custBalance,
      createdAt: isEditing && selectedCustProfile ? selectedCustProfile.createdAt : new Date().toISOString()
    };

    db.saveCustomer(business.id, customerData);
    alert(`Customer profile "${custName}" saved successfully.`);

    // Activity Log
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: isEditing ? 'Customer Updated' : 'Customer Created',
      details: `${isEditing ? 'Modified' : 'Created'} customer registry file for "${custName}".`
    });

    setIsEditing(false);
    setIsCreatingNew(false);
    setSelectedCustProfile(null);
    forceUpdate();
  };

  // Filter list
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[calc(100vh-12rem)] font-sans">
      {/* Left List Pane */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0">
        <header className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search customer database..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-64 pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => exportCustomersToCSV(customers, business.name)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <FileDown className="h-4 w-4" /> Export CSV
            </button>

            <button
              onClick={handleCreateNewClick}
              className="px-4 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Customer Profile
            </button>
          </div>
        </header>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <th className="py-3 px-6">Customer Name</th>
                <th className="py-3 px-6">Contact Email / Phone</th>
                <th className="py-3 px-6">Outstanding Tab</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-xs divide-y divide-slate-100 cursor-pointer">
              {filteredCustomers.map(c => {
                const isOwed = c.balance < 0;
                const hasCredit = c.balance > 0;
                return (
                  <tr 
                    key={c.id} 
                    onClick={() => { setSelectedCustProfile(c); setIsEditing(false); setIsCreatingNew(false); }}
                    className={`transition ${selectedCustProfile?.id === c.id ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'}`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-600 flex items-center justify-center uppercase text-xs">
                          {c.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-600">{c.email || '—'}</p>
                        <p className="text-slate-400 font-medium">{c.phone || 'No phone'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isOwed ? 'bg-rose-50 text-rose-700 border-rose-100' : hasCredit ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {isOwed ? `Owes ${formatCurrency(Math.abs(c.balance), business.currency)}` : hasCredit ? `Credit: ${formatCurrency(c.balance, business.currency)}` : formatCurrency(0, business.currency)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={(e) => handleEditClick(c, e)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
                        title="Edit Info"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(c.id, e)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer transition-colors"
                        title="Delete Profile"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-600 mb-2">No customers have been added yet.</p>
                    <button
                      onClick={() => setIsCreatingNew(true)}
                      className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#043d2e] text-white font-bold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Customer
                    </button>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No matching customer records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column Details Pane */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0">
        {selectedCustProfile && !isEditing && !isCreatingNew ? (
          /* Profile Detail Mode */
          <div className="flex-1 flex flex-col min-h-0">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#064E3B] text-white font-bold flex items-center justify-center uppercase text-sm">
                  {selectedCustProfile.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 leading-tight">{selectedCustProfile.name}</h4>
                  <p className="text-[10px] text-slate-400">Registry ID: {selectedCustProfile.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustProfile(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Ledger Tab Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center select-none">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Account Tab Balance</p>
                  <p className="text-lg font-extrabold text-slate-800 mt-1">
                    {formatCurrency(selectedCustProfile.balance, business.currency)}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border ${
                  selectedCustProfile.balance < 0 
                    ? 'bg-rose-100 text-rose-800 border-rose-200' 
                    : selectedCustProfile.balance > 0 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                }`}>
                  {selectedCustProfile.balance < 0 ? 'Outstanding Owed' : selectedCustProfile.balance > 0 ? 'Prepaid credit' : 'Settle'}
                </span>
              </div>

              {/* Purchase History Ledger */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Workspace Purchase Log</h5>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {sales.filter(s => s.customerId === selectedCustProfile.id).map(sale => (
                    <div key={sale.id} className="p-3 bg-[#F8FAFC] border border-slate-200/60 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-800 font-mono text-[10px]">{sale.id}</span>
                        <span className="text-emerald-800">{formatCurrency(sale.total, sale.currency || business.currency)}</span>
                      </div>
                      
                      <div className="text-[10px] text-slate-500 space-y-0.5">
                        {sale.items.map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span>{formatCurrency(item.price * item.quantity, sale.currency || business.currency)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-1.5 border-t border-slate-200/60 flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                        <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
                        <span>Paid: {sale.paymentMethod}</span>
                      </div>
                    </div>
                  ))}

                  {sales.filter(s => s.customerId === selectedCustProfile.id).length === 0 && (
                    <p className="text-center py-8 text-slate-400">No transactions recorded for this customer.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isEditing || isCreatingNew ? (
          /* Form Mode */
          <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0 text-xs">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h4 className="font-bold text-sm text-slate-800">
                {isEditing ? 'Modify Customer Registry' : 'New Customer Profile'}
              </h4>
              <button 
                type="button" 
                onClick={() => { setIsEditing(false); setIsCreatingNew(false); }}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Alice Johnson"
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="alice@gmail.com"
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Outstanding Balance / Prepaid Credit ({getCurrencySymbol(business.currency)})</label>
                <input
                  type="number"
                  step="0.01"
                  value={custBalance}
                  onChange={(e) => setCustBalance(parseFloat(e.target.value) || 0)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 text-xs"
                  placeholder="Negative values are debts, positive is credit"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Use negative values to register unpaid tab bills, and positive for upfront credit payments.</span>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setIsCreatingNew(false); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Save Profile
              </button>
            </div>
          </form>
        ) : (
          /* Empty default state */
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-slate-400 space-y-2 select-none">
            <Users className="h-12 w-12 text-slate-200 animate-pulse" />
            <h4 className="font-bold text-xs text-slate-700">No profile selected</h4>
            <p className="text-[10px] text-slate-400 max-w-xs leading-normal">Click on any customer in the registry database to inspect account ledgers, unpaid bill tabs, or previous shopping logs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
