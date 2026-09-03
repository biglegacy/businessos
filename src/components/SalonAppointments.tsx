import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, SalonAppointment, Service, Customer, SalonStaff } from '../types';
import { dispatchPushNotification } from '../lib/pushNotifications';
import { 
  Calendar as CalendarIcon, Plus, Search, Filter, Clock, 
  CheckCircle2, AlertCircle, X, UserCheck, Phone, Mail, 
  Scissors, DollarSign, Check, ChevronLeft, ChevronRight,
  FileText, Sparkles, UserPlus
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface SalonAppointmentsProps {
  business: Business;
  onNavigatePOS?: () => void;
}

export const SalonAppointments: React.FC<SalonAppointmentsProps> = ({
  business,
  onNavigatePOS
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<SalonAppointment | null>(null);

  // New Customer Quick Modal inside Booking Form
  const [isNewCustomerModal, setIsNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // Form Fields
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [price, setPrice] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<SalonAppointment['status']>('Pending');

  // Load Data
  const appointments = db.getSalonAppointments(business.id);
  const services = db.getServices(business.id).filter(s => s.status !== 'Inactive');
  const customers = db.getCustomers(business.id);
  const staff = db.getSalonStaff(business.id).filter(s => s.status === 'Active');

  const openAddModal = () => {
    setEditingAppointment(null);
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setServiceId(services[0]?.id || '');
    setServiceName(services[0]?.name || '');
    setPrice(services[0]?.price || 0);
    setStaffId('');
    setStaffName('');
    setDate(selectedDate);
    setTime('10:00');
    setNotes('');
    setStatus('Pending');
    setIsModalOpen(true);
  };

  const openEditModal = (app: SalonAppointment) => {
    setEditingAppointment(app);
    setCustomerId(app.customerId);
    setCustomerName(app.customerName);
    setCustomerPhone(app.customerPhone || '');
    setServiceId(app.serviceId);
    setServiceName(app.serviceName);
    setStaffId(app.staffId || '');
    setStaffName(app.staffName || '');
    setDate(app.date);
    setTime(app.time);
    setPrice(app.price);
    setNotes(app.notes || '');
    setStatus(app.status);
    setIsModalOpen(true);
  };

  const handleSelectService = (srvId: string) => {
    setServiceId(srvId);
    const srv = services.find(s => s.id === srvId);
    if (srv) {
      setServiceName(srv.name);
      setPrice(srv.price);
      if (srv.assignedEmployeeId) {
        setStaffId(srv.assignedEmployeeId);
        setStaffName(srv.assignedEmployeeName || '');
      }
    }
  };

  const handleSelectCustomer = (cId: string) => {
    setCustomerId(cId);
    const cust = customers.find(c => c.id === cId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone || '');
    }
  };

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      showError('Validation Error', 'Please enter customer name.');
      return;
    }

    const createdCust: Customer = {
      id: 'cust_' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim(),
      balance: 0,
      createdAt: new Date().toISOString()
    };

    db.saveCustomer(business.id, createdCust);
    setCustomerId(createdCust.id);
    setCustomerName(createdCust.name);
    setCustomerPhone(createdCust.phone);
    setIsNewCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    showSuccess('Customer Saved', `Client profile created for ${createdCust.name}`);
  };

  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showError('Validation Error', 'Please select or enter a client name.');
      return;
    }
    if (!serviceName.trim()) {
      showError('Validation Error', 'Please select a salon service.');
      return;
    }

    let resolvedStaffName = staffName;
    if (staffId) {
      const matchStaff = staff.find(s => s.id === staffId);
      if (matchStaff) resolvedStaffName = matchStaff.name;
    }

    const appObj: SalonAppointment = {
      id: editingAppointment ? editingAppointment.id : 'app_' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      customerId: customerId || 'guest_' + Math.random().toString(36).substring(2, 7),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      serviceId,
      serviceName,
      staffId: staffId || undefined,
      staffName: resolvedStaffName || undefined,
      date,
      time,
      price: Number(price),
      status,
      notes: notes.trim() || undefined,
      createdAt: editingAppointment ? editingAppointment.createdAt : new Date().toISOString()
    };

    db.saveSalonAppointment(business.id, appObj);

    // Push notification dispatch
    dispatchPushNotification({
      businessId: business.id,
      title: editingAppointment ? '📅 Appointment Updated' : '💈 New Salon Appointment Booked',
      message: `${appObj.customerName} booked for ${appObj.serviceName} on ${appObj.date} at ${appObj.time}${appObj.staffName ? ` with ${appObj.staffName}` : ''}.`,
      type: 'customer',
      soundType: 'chime'
    });

    showSuccess(editingAppointment ? 'Appointment Updated' : 'Appointment Booked', `Booking saved for ${customerName}`);
    setIsModalOpen(false);
  };

  const handleUpdateStatus = (appId: string, newStatus: SalonAppointment['status']) => {
    const target = appointments.find(a => a.id === appId);
    if (!target) return;
    const updated = { ...target, status: newStatus };
    db.saveSalonAppointment(business.id, updated);

    dispatchPushNotification({
      businessId: business.id,
      title: `Salon Appointment Status: ${newStatus}`,
      message: `${target.customerName}'s appointment for ${target.serviceName} is now ${newStatus}.`,
      type: 'customer',
      soundType: newStatus === 'Completed' ? 'sale' : 'chime'
    });

    showSuccess('Status Updated', `Appointment marked as ${newStatus}`);
  };

  const handleDeleteAppointment = (appId: string, clientName: string) => {
    if (confirm(`Cancel and remove appointment for ${clientName}?`)) {
      db.deleteSalonAppointment(business.id, appId);
      showSuccess('Appointment Removed', `Booking cancelled for ${clientName}.`);
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter(a => {
    const matchesDate = a.date === selectedDate;
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesSearch = a.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.staffName && a.staffName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesDate && matchesStatus && matchesSearch;
  });

  // Date Nav Helper
  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-purple-600" /> Salon Appointment System
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Book appointments, assign preferred stylists, track daily client schedules, and send push updates.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Book Appointment
        </button>
      </div>

      {/* Date Navigation & Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Date Selector Controls */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80 w-full md:w-auto">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 hover:bg-white text-slate-600 rounded-xl transition cursor-pointer shadow-xs"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 px-3">
              <CalendarIcon className="h-4 w-4 text-purple-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-900 outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => shiftDate(1)}
              className="p-2 hover:bg-white text-slate-600 rounded-xl transition cursor-pointer shadow-xs"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10px] font-extrabold rounded-xl transition cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search appointments by client, service, or stylist..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold transition cursor-pointer whitespace-nowrap ${
                statusFilter === st 
                  ? 'bg-purple-700 text-white shadow-sm' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <CalendarIcon className="h-12 w-12 mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-500">
            No appointments scheduled for {selectedDate} ({statusFilter !== 'All' ? statusFilter : 'All Statuses'}).
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            + Book Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map(app => {
            const statusBadgeClasses = {
              Pending: 'bg-amber-100 text-amber-800 border-amber-200',
              Confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
              'In Progress': 'bg-purple-100 text-purple-800 border-purple-200',
              Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              Cancelled: 'bg-rose-100 text-rose-800 border-rose-200'
            };

            return (
              <div 
                key={app.id} 
                className="bg-white p-5 rounded-3xl border border-slate-200/80 hover:border-purple-300 transition shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-purple-100 text-purple-900 rounded-2xl shrink-0 font-extrabold text-center min-w-[70px]">
                    <div className="text-sm uppercase tracking-wider">{app.time}</div>
                    <div className="text-[10px] text-purple-600 font-medium mt-0.5">Time</div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base">{app.customerName}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusBadgeClasses[app.status]}`}>
                        {app.status}
                      </span>
                    </div>

                    <p className="text-xs text-purple-900 font-bold flex items-center gap-2">
                      <Scissors className="h-3.5 w-3.5 text-purple-600" />
                      {app.serviceName} • {formatCurrency(app.price, business.currency)}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      {app.customerPhone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" /> {app.customerPhone}
                        </span>
                      )}
                      {app.staffName && (
                        <span className="flex items-center gap-1 text-slate-700 font-semibold">
                          <UserCheck className="h-3.5 w-3.5 text-purple-600" /> Stylist: {app.staffName}
                        </span>
                      )}
                    </div>

                    {app.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl mt-1 border border-slate-100">
                        "{app.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Controls & POS Launcher */}
                <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-0 border-slate-100 justify-end">
                  {app.status === 'Pending' && (
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'Confirmed')}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition cursor-pointer"
                    >
                      Confirm
                    </button>
                  )}
                  {app.status === 'Confirmed' && (
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'In Progress')}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition cursor-pointer"
                    >
                      Start Service
                    </button>
                  )}
                  {app.status === 'In Progress' && (
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'Completed')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Complete Service
                    </button>
                  )}

                  {(app.status === 'Completed' || app.status === 'In Progress') && onNavigatePOS && (
                    <button
                      onClick={onNavigatePOS}
                      className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-2xl text-xs font-bold transition cursor-pointer"
                    >
                      Checkout in POS
                    </button>
                  )}

                  <button
                    onClick={() => openEditModal(app)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition cursor-pointer"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteAppointment(app.id, app.customerName)}
                    className="px-2.5 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl text-xs font-bold transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOOK / EDIT APPOINTMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-purple-600" /> 
                {editingAppointment ? 'Edit Salon Appointment' : 'Book New Client Appointment'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="space-y-4 mt-4 text-xs">
              {/* Client Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Select Client Profile *</label>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerModal(true)}
                    className="text-[10px] font-extrabold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="h-3 w-3" /> Register New Client
                  </button>
                </div>

                {customers.length > 0 ? (
                  <select
                    value={customerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="">-- Select Existing Client --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                    ))}
                  </select>
                ) : null}

                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Or enter client full name..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 outline-none mt-2"
                />
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Salon Service *</label>
                <select
                  value={serviceId}
                  onChange={(e) => handleSelectService(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category}) - {formatCurrency(s.price, business.currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Preferred Stylist/Barber</label>
                  <select
                    value={staffId}
                    onChange={(e) => {
                      setStaffId(e.target.value);
                      const st = staff.find(s => s.id === e.target.value);
                      if (st) setStaffName(st.name);
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="">-- Any Available Staff --</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service Fee ({business.currency || 'GH₵'})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-extrabold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Appointment Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Time Slot</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="Pending">Pending Confirmation</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="In Progress">In Progress (Client Arrived)</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Client Notes & Hair Preferences</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Sensitive scalp, prefers fade taper, likes tea..."
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
                  {editingAppointment ? 'Save Changes' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK INLINE REGISTER CLIENT MODAL */}
      {isNewCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-purple-600" /> Register Salon Client
              </h4>
              <button 
                onClick={() => setIsNewCustomerModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickCustomer} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Jessica Alba"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+233 24 123 4567"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="client@gmail.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
