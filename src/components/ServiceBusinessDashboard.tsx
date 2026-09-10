/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, ProfessionalServiceJob, Service, Customer } from '../types';
import {
  Wrench,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Briefcase,
  Plus,
  ArrowRight,
  TrendingUp,
  X,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface ServiceBusinessDashboardProps {
  business: Business;
  user: User;
  onNavigate: (tab: string) => void;
}

export const ServiceBusinessDashboard: React.FC<ServiceBusinessDashboardProps> = ({
  business,
  user,
  onNavigate
}) => {
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [description, setDescription] = useState('');
  const [completionDate, setCompletionDate] = useState('');

  const jobs = db.getProfessionalServiceJobs(business.id);
  const services = db.getServices(business.id);
  const customers = db.getCustomers(business.id);
  const employees = db.getEmployees(business.id);
  const appointments = db.getAppointments(business.id);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Job metrics
  const activeJobs = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled');
  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const inProgressJobs = jobs.filter(j => j.status === 'in_progress');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  // Today revenue & outstanding balances
  let revenueToday = 0;
  let outstandingBalance = 0;

  jobs.forEach(j => {
    if (j.createdAt.startsWith(todayStr)) {
      revenueToday += j.amountPaid || 0;
    }
    const balance = (j.totalPrice || 0) - (j.amountPaid || 0);
    if (balance > 0 && j.status !== 'cancelled') {
      outstandingBalance += balance;
    }
  });

  // Today's appointments
  const todayAppointments = appointments.filter(a => a.date === todayStr);

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      showError('Title Required', 'Please enter a job title or service description.');
      return;
    }
    if (!customerName.trim()) {
      showError('Customer Required', 'Please enter client full name.');
      return;
    }

    const newJob: ProfessionalServiceJob = {
      id: 'JOB-' + Date.now(),
      businessId: business.id,
      jobNumber: 'SRV-' + Math.floor(1000 + Math.random() * 9000),
      title: jobTitle.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      assignedStaffName: assignedStaff.trim() || undefined,
      totalPrice: parseFloat(serviceFee) || 0,
      amountPaid: 0,
      paymentStatus: 'unpaid',
      status: 'pending',
      description: description.trim() || undefined,
      scheduledDate: completionDate || todayStr,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.saveProfessionalServiceJob(business.id, newJob);
    showSuccess('Service Job Created', `Job ${newJob.jobNumber} added to active work orders.`);
    setIsJobModalOpen(false);
    setJobTitle('');
    setCustomerName('');
    setCustomerPhone('');
    setAssignedStaff('');
    setServiceFee('');
    setDescription('');
    setCompletionDate('');
  };

  const handleUpdateJobStatus = (job: ProfessionalServiceJob, newStatus: 'in_progress' | 'completed' | 'cancelled') => {
    db.saveProfessionalServiceJob(business.id, {
      ...job,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    showSuccess('Status Updated', `Job ${job.jobNumber} marked as ${newStatus.replace('_', ' ')}.`);
  };

  const handleMarkPaid = (job: ProfessionalServiceJob) => {
    db.saveProfessionalServiceJob(business.id, {
      ...job,
      amountPaid: job.totalPrice,
      paymentStatus: 'paid',
      updatedAt: new Date().toISOString()
    });
    showSuccess('Payment Recorded', `Payment of ${formatCurrency(job.totalPrice, business.currency || 'GHC')} registered.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wide text-blue-200">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Professional Services & Work Order OS</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {business.name} Operations Hub
          </h2>
          <p className="text-xs text-blue-200/90 max-w-xl">
            Track service appointments, customer work orders, technician assignments, job stages, and receivables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsJobModalOpen(true)}
            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>New Service Job</span>
          </button>
          <button
            onClick={() => onNavigate('Services')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border border-white/10"
          >
            <Wrench className="h-4 w-4" />
            <span>Service Catalog ({services.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Active Jobs */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Jobs</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {activeJobs.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Pending &amp; In-progress
          </div>
        </div>

        {/* Jobs in Progress */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700">
            {inProgressJobs.length}
          </div>
          <div className="text-[10px] text-amber-600 font-medium">
            Currently being serviced
          </div>
        </div>

        {/* Completed Jobs */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Jobs</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {completedJobs.length}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">
            Delivered work orders
          </div>
        </div>

        {/* Revenue Today */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Revenue Today</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(revenueToday, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Collected payments today
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Appointments Today</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700">
            {todayAppointments.length}
          </div>
          <div className="text-[10px] text-purple-600 font-medium">
            Bookings scheduled for today
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Receivables Due</span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            {formatCurrency(outstandingBalance, business.currency || 'GHC')}
          </div>
          <div className="text-[10px] text-rose-600 font-medium">
            Unpaid job balances
          </div>
        </div>

        {/* Registered Clients */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Clients</span>
            <div className="p-2 bg-slate-50 text-slate-700 rounded-xl">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {customers.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Client accounts on file
          </div>
        </div>

        {/* Assigned Staff */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Technicians / Staff</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {employees.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Active service team members
          </div>
        </div>
      </div>

      {/* Active Work Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-700" />
            <h3 className="font-extrabold text-base text-slate-900">Active Work Orders &amp; Service Jobs</h3>
          </div>
          <button
            onClick={() => onNavigate('Jobs & Orders')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>All Work Orders ({jobs.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-800 text-sm">No service jobs created yet.</p>
            <button
              onClick={() => setIsJobModalOpen(true)}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Create First Work Order
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.slice(0, 6).map(job => (
              <div key={job.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{job.jobNumber}</span>
                    <h4 className="font-bold text-sm text-slate-900 truncate">{job.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      job.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : job.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {job.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Client: <strong className="text-slate-700">{job.customerName}</strong></span>
                    {job.assignedStaffName && (
                      <span>&bull; Assigned to: <strong className="text-slate-700">{job.assignedStaffName}</strong></span>
                    )}
                    {job.scheduledDate && (
                      <span>&bull; Due: {job.scheduledDate}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-extrabold text-sm text-slate-900">
                      {formatCurrency(job.totalPrice, business.currency || 'GHC')}
                    </div>
                    <span className={`text-[10px] font-bold ${
                      job.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {job.paymentStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {job.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateJobStatus(job, 'in_progress')}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Start Job
                      </button>
                    )}
                    {job.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateJobStatus(job, 'completed')}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Complete
                      </button>
                    )}
                    {job.paymentStatus !== 'paid' && (
                      <button
                        onClick={() => handleMarkPaid(job)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Create Service Work Order</h3>
              <button onClick={() => setIsJobModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Service / Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Screen Replacement / Deep Carpet Cleaning / Logo Design"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Client Phone</label>
                  <input
                    type="tel"
                    placeholder="0244123456"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Technician / Staff</label>
                  <select
                    value={assignedStaff}
                    onChange={e => setAssignedStaff(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Total Fee ({business.currency || 'GHC'})</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={serviceFee}
                    onChange={e => setServiceFee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Delivery / Completion Date</label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={e => setCompletionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Job Specifications / Client Notes</label>
                <textarea
                  rows={2}
                  placeholder="Diagnostics, parts needed, client specific instructions..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Create Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
