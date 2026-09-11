/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { db, formatCurrency, getCurrencySymbol } from '../lib/db';
import { Business, Customer, User } from '../types';
import { 
  CreditCard, Search, DollarSign, Send, CheckCircle2, 
  AlertCircle, Phone, Mail, User as UserIcon, ArrowDownLeft, 
  Clock, X, Check, Filter, ChevronRight
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface AccountsReceivableProps {
  business: Business;
  currentUser: User;
  onNavigate?: (tab: string) => void;
}

export const AccountsReceivable: React.FC<AccountsReceivableProps> = ({
  business,
  currentUser,
  onNavigate
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'highest' | 'recent'>('all');
  const [reloadKey, setReloadKey] = useState(0);

  // Payment modal state
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile' | 'card' | 'bank'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // SMS Reminder state
  const [reminderCustomer, setReminderCustomer] = useState<Customer | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Fetch all customers for this business
  const allCustomers = useMemo(() => {
    return db.getCustomers(business.id);
  }, [business.id, reloadKey]);

  // Debtors: customers with a negative balance (balance < 0)
  const debtors = useMemo(() => {
    return allCustomers
      .filter(c => c.balance < 0)
      .map(c => ({
        ...c,
        amountOwed: Math.abs(c.balance)
      }));
  }, [allCustomers]);

  // Filtered and sorted debtors
  const filteredDebtors = useMemo(() => {
    let result = debtors.filter(d => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.phone && d.phone.includes(q)) ||
        (d.email && d.email.toLowerCase().includes(q))
      );
    });

    if (filterType === 'highest') {
      result = [...result].sort((a, b) => b.amountOwed - a.amountOwed);
    } else if (filterType === 'recent') {
      result = [...result].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return result;
  }, [debtors, search, filterType]);

  // Metrics
  const totalReceivables = useMemo(() => {
    return debtors.reduce((sum, d) => sum + d.amountOwed, 0);
  }, [debtors]);

  const debtorCount = debtors.length;
  const avgDebt = debtorCount > 0 ? totalReceivables / debtorCount : 0;

  // Handle payment collection
  const handleOpenPayment = (customer: Customer) => {
    const owed = Math.abs(customer.balance);
    setPaymentCustomer(customer);
    setPaymentAmount(owed);
    setPaymentMethod('cash');
    setPaymentNote(`Payment towards outstanding debt of ${formatCurrency(owed, business.currency)}`);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || !paymentAmount || paymentAmount <= 0) {
      showError('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const currentOwed = Math.abs(paymentCustomer.balance);
      const paid = Number(paymentAmount);
      // Updating balance: previous balance + paid (since balance was negative)
      const newBalance = Number((paymentCustomer.balance + paid).toFixed(2));

      const updatedCust: Customer = {
        ...paymentCustomer,
        balance: newBalance,
        notes: paymentNote 
          ? `${paymentCustomer.notes || ''}\n[${new Date().toLocaleDateString()}] Received ${formatCurrency(paid, business.currency)} via ${paymentMethod}: ${paymentNote}`.trim()
          : paymentCustomer.notes
      };

      db.saveCustomer(business.id, updatedCust);
      setReloadKey(prev => prev + 1);
      showSuccess(
        'Payment Recorded', 
        `Successfully received ${formatCurrency(paid, business.currency)} from ${paymentCustomer.name}. Remaining balance: ${formatCurrency(Math.max(0, currentOwed - paid), business.currency)}.`
      );
      setPaymentCustomer(null);
    } catch (err: any) {
      showError('Payment Error', err?.message || 'Unable to update customer account.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle SMS reminder
  const handleOpenReminder = (customer: Customer) => {
    const owed = Math.abs(customer.balance);
    setReminderCustomer(customer);
    setReminderMessage(
      `Dear ${customer.name}, friendly reminder from ${business.name}: Your outstanding balance is ${formatCurrency(owed, business.currency)}. Kindly settle at your earliest convenience. Thank you!`
    );
  };

  const handleSendReminderSms = async () => {
    if (!reminderCustomer || !reminderCustomer.phone) {
      showError('Missing Phone', 'This customer does not have a saved phone number.');
      return;
    }

    setIsSendingReminder(true);
    try {
      const res = await db.sendSms({
        recipient: reminderCustomer.phone,
        message: reminderMessage,
        businessId: business.id,
        type: 'reminder'
      });

      if (res.success) {
        showSuccess('Reminder Sent', `SMS payment reminder delivered to ${reminderCustomer.phone}.`);
        setReminderCustomer(null);
      } else {
        showError('SMS Delivery Issue', res.message || 'Could not deliver SMS reminder.');
      }
    } catch (err: any) {
      showError('Network Error', err?.message || 'Failed to dispatch SMS reminder.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 md:pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <span>Accounts Receivable</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track customer credit balances, outstanding tabs, and record debt payments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outstanding */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Receivables</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-2">
            {formatCurrency(totalReceivables, business.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Across {debtorCount} customer {debtorCount === 1 ? 'account' : 'accounts'}
          </p>
        </div>

        {/* Debtors count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Debtors on File</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <UserIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-800 mt-2">
            {debtorCount}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {debtorCount > 0 ? 'Awaiting collection' : 'All accounts settled'}
          </p>
        </div>

        {/* Average debt */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Balance</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-800 mt-2">
            {formatCurrency(avgDebt, business.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Per debtor account
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search debtor name, phone, email..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-400 mr-1 hidden sm:inline">Sort:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'all' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Debtors
          </button>
          <button
            onClick={() => setFilterType('highest')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'highest' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Highest Owed
          </button>
          <button
            onClick={() => setFilterType('recent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterType === 'recent' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Recent
          </button>
        </div>
      </div>

      {/* Debtors Listing - Mobile Cards & Desktop Table */}
      {filteredDebtors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {debtors.length === 0 ? 'No Outstanding Receivables' : 'No Matching Debtors Found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {debtors.length === 0 
              ? 'All customer accounts are currently settled. New credit balances or tabs recorded at checkout will appear here automatically.'
              : 'Try clearing your search query to see other customer accounts.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card List (hidden on md and up) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredDebtors.map(debtor => (
              <div 
                key={debtor.id} 
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm uppercase shrink-0 border border-blue-100">
                      {debtor.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 leading-tight">{debtor.name}</h4>
                      {debtor.phone && (
                        <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{debtor.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider block">Owed</span>
                    <span className="text-base font-black text-rose-600">
                      {formatCurrency(debtor.amountOwed, business.currency)}
                    </span>
                  </div>
                </div>

                {debtor.email && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 truncate font-medium">
                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{debtor.email}</span>
                  </p>
                )}

                {/* Mobile action buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenPayment(debtor)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                    <span>Receive Payment</span>
                  </button>

                  {debtor.phone && (
                    <button
                      onClick={() => handleOpenReminder(debtor)}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Send SMS Payment Reminder"
                    >
                      <Send className="h-3.5 w-3.5 text-blue-600" />
                      <span>SMS</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-6">Customer Name</th>
                  <th className="py-3.5 px-6">Contact Info</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Outstanding Debt</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                {filteredDebtors.map(debtor => (
                  <tr key={debtor.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs uppercase border border-blue-100">
                          {debtor.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{debtor.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {debtor.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600">
                      <p>{debtor.phone || '—'}</p>
                      {debtor.email && <p className="text-[11px] text-slate-400">{debtor.email}</p>}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        <AlertCircle className="h-3 w-3 text-rose-500" />
                        <span>Unpaid Tab</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-rose-600 text-sm">
                      {formatCurrency(debtor.amountOwed, business.currency)}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenPayment(debtor)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        <span>Receive Payment</span>
                      </button>

                      {debtor.phone && (
                        <button
                          onClick={() => handleOpenReminder(debtor)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="Send SMS Payment Reminder"
                        >
                          <Send className="h-3 w-3 text-blue-600" />
                          <span>Remind</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Receive Payment Modal */}
      {paymentCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-up relative">
            <button
              onClick={() => setPaymentCustomer(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Debt Collection
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Receive Customer Payment</h3>
              <p className="text-xs text-slate-500">
                Recording debt reduction for <strong className="text-slate-800">{paymentCustomer.name}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
              {/* Debt overview */}
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-600">Current Balance Owed</span>
                  <p className="text-base font-black text-rose-700">
                    {formatCurrency(Math.abs(paymentCustomer.balance), business.currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentAmount(Math.abs(paymentCustomer.balance))}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold border border-rose-200 cursor-pointer"
                >
                  Pay in Full
                </button>
              </div>

              {/* Payment Amount */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  Amount Received ({getCurrencySymbol(business.currency)}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Math.abs(paymentCustomer.balance)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Payment Method *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['cash', 'mobile', 'card', 'bank'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-xl font-bold uppercase text-[10px] border transition-all cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Note */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Receipt / Transaction Memo</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Optional reference, receipt #, or mobile money trans ID"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment || !paymentAmount || paymentAmount <= 0}
                  className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isProcessingPayment ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirm Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMS Reminder Modal */}
      {reminderCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up relative">
            <button
              onClick={() => setReminderCustomer(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                SMS Payment Reminder
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Send Reminder Message</h3>
              <p className="text-xs text-slate-500">
                Sending SMS to: <strong className="text-slate-800">{reminderCustomer.name} ({reminderCustomer.phone})</strong>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Message Content</label>
              <textarea
                rows={4}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 text-right">
                {reminderMessage.length} characters
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReminderCustomer(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReminderSms}
                disabled={isSendingReminder || !reminderMessage.trim()}
                className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSendingReminder ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send SMS Reminder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
