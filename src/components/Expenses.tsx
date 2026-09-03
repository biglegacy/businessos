/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { Expense, Business, User } from '../types';
import { 
  DollarSign, Plus, Trash2, Search, Calendar, 
  TrendingDown, TrendingUp, Filter, Receipt, X,
  Edit2, Upload, Image, Eye, Trash
} from 'lucide-react';

interface ExpensesProps {
  business: Business;
  user: User;
}

const EXPENSE_CATEGORIES = [
  'Inventory Restocking',
  'Rent & Utilities',
  'Staff Wages',
  'Marketing & Promo',
  'Software Licenses',
  'Logistics & Courier',
  'Supplies',
  'Maintenance',
  'Other Operational'
];

export function Expenses({ business, user }: ExpensesProps) {
  const [trigger, setTrigger] = useState(0);
  const forceUpdate = () => setTrigger(prev => prev + 1);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Form Fields State
  const [isAdding, setIsAdding] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState('Inventory Restocking');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'mobile' | 'other'>('cash');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptImage, setReceiptImage] = useState<string>('');

  // Drag & drop state
  const [isDragActive, setIsDragActive] = useState(false);

  // Full-screen Receipt Preview Modal State
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const expenses = db.getExpenses(business.id);
  const sales = db.getSales(business.id).filter(s => s.status === 'completed');

  // Math totals
  const totalRevenueSum = sales.reduce((acc, curr) => acc + curr.total, 0);
  const totalExpensesSum = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalRevenueSum - totalExpensesSum;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const cloudUrl = await db.uploadFile(file.name, base64);
          setReceiptImage(cloudUrl);
        } catch (err) {
          console.error("Cloud receipt upload failed, falling back to local base64", err);
          setReceiptImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const cloudUrl = await db.uploadFile(file.name, base64);
          setReceiptImage(cloudUrl);
        } catch (err) {
          console.error("Cloud receipt upload failed, falling back to local base64", err);
          setReceiptImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !desc) {
      alert('Please enter a valid expense amount and explanation description.');
      return;
    }

    if (editingExpenseId) {
      // EDIT CRU[D] flow
      const existing = expenses.find(exp => exp.id === editingExpenseId);
      if (!existing) return;

      const updatedExpense: Expense = {
        ...existing,
        category,
        amount,
        paymentMethod: payMethod,
        description: desc,
        date,
        receiptImage: receiptImage || undefined,
        updatedAt: new Date().toISOString()
      } as any;

      db.saveExpense(business.id, updatedExpense);
      alert('Expense recorded successfully.');

      db.addActivityLog(business.id, {
        userId: user.id,
        userName: user.name,
        action: 'Expense Updated',
        details: `Updated expense #${editingExpenseId} to ${formatCurrency(amount, business.currency)} under category "${category}".`
      });

      setEditingExpenseId(null);
    } else {
      // CREATE [C]RUD flow
      const newExpense: Expense = {
        id: 'e-' + Math.random().toString(36).substring(2, 9),
        businessId: business.id,
        category,
        amount,
        paymentMethod: payMethod,
        description: desc,
        date,
        currency: business.currency || 'GHC',
        receiptImage: receiptImage || undefined,
        createdAt: new Date().toISOString()
      };

      db.saveExpense(business.id, newExpense);
      alert('Expense recorded successfully.');

      db.addActivityLog(business.id, {
        userId: user.id,
        userName: user.name,
        action: 'Expense Recorded',
        details: `Logged expense of ${formatCurrency(amount, business.currency)} under category "${category}".`
      });
    }

    resetForm();
    forceUpdate();
  };

  const handleEditClick = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setIsAdding(true);
    setAmount(exp.amount);
    setCategory(exp.category);
    setPayMethod(exp.paymentMethod);
    setDesc(exp.description);
    setDate(exp.date);
    setReceiptImage(exp.receiptImage || '');
  };

  const handleDelete = (id: string, cost: number, catName: string) => {
    const formattedCost = formatCurrency(cost, business.currency);
    if (confirm(`Are you sure you want to delete this expense record for ${formattedCost}?`)) {
      db.deleteExpense(business.id, id);
      alert('Expense record deleted successfully.');
      db.addActivityLog(business.id, {
        userId: user.id,
        userName: user.name,
        action: 'Expense Deleted',
        details: `Deleted ${formattedCost} expense listed under "${catName}".`
      });
      if (editingExpenseId === id) {
        resetForm();
      }
      forceUpdate();
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingExpenseId(null);
    setAmount(0);
    setDesc('');
    setCategory('Inventory Restocking');
    setPayMethod('cash');
    setDate(new Date().toISOString().split('T')[0]);
    setReceiptImage('');
  };

  // Filter
  const filteredExpenses = expenses.filter(exp => {
    const matchSearch = exp.description.toLowerCase().includes(search.toLowerCase()) ||
                        exp.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'All' || exp.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const canEditExpenses = ['owner', 'manager', 'admin', 'SUPER_ADMIN'].includes(user.role);

  return (
    <div className="space-y-6 font-sans">
      {/* KPI Dashboard Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales Revenue</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalRevenueSum, business.currency)}</h3>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ledger Expenses Sum</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalExpensesSum, business.currency)}</h3>
          </div>
          <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>
      </section>

      {/* Main split: Ledger list + Input Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ledger table card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[480px]">
          <header className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-4 py-1.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500 text-xs w-48 font-bold"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-1.5 px-3 border border-slate-200 bg-white rounded-xl text-slate-700 text-xs w-40 cursor-pointer font-bold"
              >
                <option value="All">All Categories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {canEditExpenses && !isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" /> Record Expense
              </button>
            )}
          </header>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-6">Proof</th>
                  <th className="py-3 px-6">Expense Description</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Billed Amount</th>
                  <th className="py-3 px-6">Due Date</th>
                  {canEditExpenses && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-6">
                      {exp.receiptImage ? (
                        <button
                          onClick={() => setPreviewImageUrl(exp.receiptImage!)}
                          className="h-8 w-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center hover:border-emerald-500 cursor-pointer group relative"
                          title="View Receipt Preview"
                        >
                          <img src={exp.receiptImage} alt="Receipt Thumbnail" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="h-3 w-3 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="h-8 w-8 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300" title="No receipt uploaded">
                          <Image className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-800 max-w-[200px] truncate">{exp.description}</td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[9px] uppercase border border-slate-200/55">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-rose-700">{formatCurrency(exp.amount, exp.currency || business.currency)}</td>
                    <td className="py-4 px-6 font-bold text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-300" /> {exp.date}
                      </div>
                    </td>
                    {canEditExpenses && (
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(exp)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id, exp.amount, exp.category)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="max-w-[200px] mx-auto space-y-2">
                        <Receipt className="h-8 w-8 mx-auto text-slate-200" />
                        <p className="text-xs font-bold text-slate-600">No records registered</p>
                        <p className="text-[10px] text-slate-400">Matching your specified filter terms.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right input form */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0">
          {isAdding && canEditExpenses ? (
            /* Record Expense Form */
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs p-6 space-y-4">
              <header className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Receipt className="h-5 w-5 text-emerald-800 animate-pulse" /> 
                  {editingExpenseId ? 'Edit Outlay Record' : 'Record Expense Cost'}
                </h4>
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1 text-[10px] tracking-wider">Expense Cost Amount ({getCurrencySymbol(business.currency)})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="150.00"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1 text-[10px] tracking-wider">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 block w-full py-2 px-3 border border-slate-200 bg-white rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs cursor-pointer font-bold"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1 text-[10px] tracking-wider">Expense Explanation / Vendor</label>
                  <input
                    type="text"
                    required
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Wages Mike / Restock Arabica Beans"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1 text-[10px] tracking-wider">Payment Method</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="mt-1 block w-full py-2 px-3 border border-slate-200 bg-white rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs cursor-pointer font-bold"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile">Mobile Pay</option>
                      <option value="other">Bank Transfer / Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1 text-[10px] tracking-wider">Transaction Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Receipt Upload Box */}
                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1 text-[10px] tracking-wider">Digital Receipt Upload</label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`mt-1 border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
                      isDragActive 
                        ? 'border-emerald-500 bg-emerald-50/60' 
                        : receiptImage 
                          ? 'border-emerald-200 bg-emerald-50/20' 
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {receiptImage ? (
                      <div className="space-y-2 relative group">
                        <img src={receiptImage} alt="Receipt Preview" className="max-h-24 mx-auto rounded-lg object-contain shadow-sm" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptImage('');
                          }}
                          className="absolute -top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition cursor-pointer shadow"
                          title="Remove Uploaded Proof"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <p className="text-[10px] text-slate-400 font-bold truncate">File uploaded successfully</p>
                      </div>
                    ) : (
                      <label className="block h-full w-full cursor-pointer space-y-1.5">
                        <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                        <div className="text-[10px] text-slate-500 font-bold">
                          <span className="text-[#064E3B] underline">Choose a file</span> or drag it here
                        </div>
                        <p className="text-[9px] text-slate-400">Supports JPG, PNG, WEBP</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-center cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold text-center cursor-pointer shadow transition-colors"
                >
                  {editingExpenseId ? 'Save Changes' : 'File Expense'}
                </button>
              </div>
            </form>
          ) : (
            /* Welcome / Help state */
            <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-slate-400 space-y-3 select-none py-16">
              <div className="h-14 w-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <TrendingDown className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-xs text-slate-700">Financial Ledger Audits</h4>
                <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                  As an authorized manager, you can record outlays, file restocks, log receipt proof, and audit net company profit margins.
                </p>
              </div>
              {canEditExpenses && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-xl transition cursor-pointer shadow-sm"
                >
                  Record Outlay Cost
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Full Screen Receipt Proof Viewer */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl p-4 max-w-lg w-full shadow-2xl relative border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 p-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 cursor-pointer shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center space-y-2 pb-3 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Receipt className="h-4 w-4 text-emerald-800" /> Expense Receipt Voucher
              </h3>
              <p className="text-[10px] text-slate-400">Audit documentation proof</p>
            </div>
            <div className="my-4 bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60 max-h-[70vh] flex items-center justify-center p-2">
              <img src={previewImageUrl} alt="Expense Receipt Voucher" className="max-h-[60vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
