import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, SalonAppointment, Service, Product, Sale } from '../types';
import { 
  Scissors, Calendar, DollarSign, Users, ShoppingBag, Clock, 
  CheckCircle2, AlertTriangle, TrendingUp, Plus, ArrowRight,
  Sparkles, Award, UserCheck, Phone, Check, RefreshCw
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';
import { QuickActionPathways } from './QuickActionPathways';

interface SalonDashboardProps {
  business: Business;
  user: User;
  onNavigate: (tab: string) => void;
}

export const SalonDashboard: React.FC<SalonDashboardProps> = ({
  business,
  user,
  onNavigate
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Load Cloud Data
  const sales = db.getSales(business.id);
  const services = db.getServices(business.id);
  const products = db.getProducts(business.id);
  const customers = db.getCustomers(business.id);
  const appointments = db.getSalonAppointments(business.id);
  const staff = db.getSalonStaff(business.id);

  // Date Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Sales filtering for today
  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr) && s.status !== 'refunded');

  let totalSalesToday = 0;
  let serviceRevenueToday = 0;
  let productSalesToday = 0;

  todaySales.forEach(sale => {
    totalSalesToday += sale.total;
    sale.items.forEach(item => {
      const itemRev = item.price * item.quantity;
      if (item.type === 'service') {
        serviceRevenueToday += itemRev;
      } else {
        productSalesToday += itemRev;
      }
    });
  });

  // Appointments Metrics
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const pendingAppointments = appointments.filter(a => a.status === 'Pending');
  const completedTodayCount = todayAppointments.filter(a => a.status === 'Completed').length;

  // Low Stock Grooming Products
  const lowStockProducts = products.filter(p => p.stockQuantity <= (p.lowStockThreshold || 5));

  // Staff Performance Today
  const staffStatsMap: Record<string, { name: string; completedServices: number; totalRevenue: number; role: string }> = {};
  
  staff.forEach(s => {
    staffStatsMap[s.id] = { name: s.name, completedServices: 0, totalRevenue: 0, role: s.role };
  });

  todayAppointments.forEach(app => {
    if (app.status === 'Completed' && app.staffId && staffStatsMap[app.staffId]) {
      staffStatsMap[app.staffId].completedServices += 1;
      staffStatsMap[app.staffId].totalRevenue += app.price;
    }
  });

  const staffPerformance = Object.values(staffStatsMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const handleUpdateStatus = (appId: string, newStatus: SalonAppointment['status']) => {
    const target = appointments.find(a => a.id === appId);
    if (!target) return;
    const updated = { ...target, status: newStatus };
    db.saveSalonAppointment(business.id, updated);
    showSuccess('Appointment Updated', `Appointment marked as ${newStatus}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Scissors className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" /> Salon & Beauty Studio Workspace
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {business.name}
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 font-medium">
              Manage client appointments, beauty services, retail products, staff stylists, and instant POS transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('Appointments')}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="h-4 w-4" /> Book Appointment
            </button>
            <button
              onClick={() => onNavigate('Salon POS')}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Scissors className="h-4 w-4" /> Launch Salon POS
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Pathways */}
      <QuickActionPathways business={business} onNavigate={onNavigate} />

      {/* Overview Metrics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Sales</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalSalesToday, business.currency)}</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> {todaySales.length} checkout sales today
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Service Revenue Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Revenue</p>
              <h3 className="text-2xl font-black text-purple-700 mt-1">{formatCurrency(serviceRevenueToday, business.currency)}</h3>
              <p className="text-[11px] text-purple-600 font-semibold mt-1">
                Haircuts, styling, spa & treatments
              </p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl">
              <Scissors className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Product Sales Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Sales</p>
              <h3 className="text-2xl font-black text-indigo-700 mt-1">{formatCurrency(productSalesToday, business.currency)}</h3>
              <p className="text-[11px] text-indigo-600 font-semibold mt-1">
                Shampoos, oils, creams & extensions
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Total Registered Clients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Clients</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{customers.length}</h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                Active customer profiles
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Appointments</p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">{todayAppointments.length}</h3>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">
                Scheduled for today
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-2xl">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Pending Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Bookings</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{pendingAppointments.length}</h3>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">
                Awaiting confirmation
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Completed Services */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Today</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">{completedTodayCount}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                Services rendered
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Alert</p>
              <h3 className={`text-2xl font-black mt-1 ${lowStockProducts.length > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {lowStockProducts.length}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">
                Grooming products at/below threshold
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${lowStockProducts.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Today's Appointments + Staff Performance Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today's Appointments Schedule */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" /> Today's Appointment Schedule
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time appointment calendar and status tracking for {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <button
              onClick={() => onNavigate('Appointments')}
              className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Calendar className="h-12 w-12 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-500">No appointments scheduled for today yet.</p>
              <button
                onClick={() => onNavigate('Appointments')}
                className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                + Book New Client Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map(app => {
                const statusColors = {
                  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
                  Confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
                  'In Progress': 'bg-purple-100 text-purple-800 border-purple-200',
                  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200'
                };

                return (
                  <div key={app.id} className="p-4 rounded-2xl border border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-purple-50/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl shrink-0 font-bold text-center min-w-[60px]">
                        <div className="text-xs uppercase">{app.time}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm">{app.customerName}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[app.status]}`}>
                            {app.status}
                          </span>
                        </div>
                        <p className="text-xs text-purple-900 font-semibold mt-0.5">
                          {app.serviceName} • {formatCurrency(app.price, business.currency)}
                        </p>
                        {app.staffName && (
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-slate-400" /> Stylist/Barber: <strong>{app.staffName}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200/60">
                      {app.status === 'Pending' && (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'Confirmed')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Confirm
                        </button>
                      )}
                      {app.status === 'Confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'In Progress')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Start Service
                        </button>
                      )}
                      {app.status === 'In Progress' && (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'Completed')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Mark Completed
                        </button>
                      )}
                      {app.status !== 'Completed' && app.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'Cancelled')}
                          className="px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Staff Performance & Low Stock Warning */}
        <div className="space-y-6">
          {/* Staff Performance Leaderboard */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" /> Staff Performance Today
              </h3>
              <button
                onClick={() => onNavigate('Staff')}
                className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
              >
                Manage Staff
              </button>
            </div>

            {staffPerformance.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No staff members registered yet.</p>
            ) : (
              <div className="space-y-3">
                {staffPerformance.slice(0, 5).map((s, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/80 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{s.name}</h4>
                        <span className="text-[10px] text-slate-500">{s.role} • {s.completedServices} services done</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 text-xs">{formatCurrency(s.totalRevenue, business.currency)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Services & Grooming Products Shortcuts */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-6 space-y-3">
            <h4 className="font-extrabold text-purple-950 text-xs uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> Salon Quick Actions
            </h4>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onNavigate('Salon Services')}
                className="p-3 bg-white hover:bg-purple-100/50 border border-purple-200/60 rounded-2xl text-left transition cursor-pointer space-y-1 shadow-sm"
              >
                <Scissors className="h-4 w-4 text-purple-700" />
                <div className="font-bold text-slate-900 text-xs">Manage Services</div>
                <div className="text-[10px] text-slate-500">{services.length} active services</div>
              </button>

              <button
                onClick={() => onNavigate('Salon Products')}
                className="p-3 bg-white hover:bg-indigo-100/50 border border-indigo-200/60 rounded-2xl text-left transition cursor-pointer space-y-1 shadow-sm"
              >
                <ShoppingBag className="h-4 w-4 text-indigo-700" />
                <div className="font-bold text-slate-900 text-xs">Retail Products</div>
                <div className="text-[10px] text-slate-500">{products.length} grooming items</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
