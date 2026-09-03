import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Clock, CheckCircle, XCircle, Plane, Hotel, FileCheck, 
  CreditCard, Compass, Truck, DollarSign, TrendingUp, AlertCircle, ArrowUpRight, 
  ArrowDownLeft, Sparkles, MapPin, Search, Filter, ShieldCheck, Award, RefreshCw
} from 'lucide-react';
import { Business, User } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelDashboardProps {
  business: Business;
  user: User;
  onNavigate: (tab: string) => void;
}

export const TravelDashboard: React.FC<TravelDashboardProps> = ({ business, user, onNavigate }) => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeBookings: 0,
    pendingBookings: 0,
    completedTrips: 0,
    cancelledBookings: 0,
    flightReservations: 0,
    hotelReservations: 0,
    visaApplications: 0,
    passportRequests: 0,
    tourPackages: 0,
    vehiclesBooked: 0,
    revenueToday: 0,
    revenueThisMonth: 0,
    outstandingPayments: 0,
    upcomingDepartures: 0,
    upcomingReturns: 0,
  });

  const [todaysDepartures, setTodaysDepartures] = useState<any[]>([]);
  const [todaysArrivals, setTodaysArrivals] = useState<any[]>([]);
  const currency = getCurrencySymbol(business.currency);

  const loadData = () => {
    const customers = db.getTravelCustomers(business.id);
    const bookings = db.getTravelBookings(business.id);
    const flights = db.getTravelFlights(business.id);
    const hotels = db.getTravelHotels(business.id);
    const visas = db.getTravelVisas(business.id);
    const passports = db.getTravelPassports(business.id);
    const packages = db.getTravelPackages(business.id);
    const transports = db.getTravelTransports(business.id);

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let revToday = 0;
    let revMonth = 0;
    let outstanding = 0;
    let active = 0;
    let pending = 0;
    let completed = 0;
    let cancelled = 0;
    let upDepartures = 0;
    let upReturns = 0;

    const todayDepList: any[] = [];
    const todayArrList: any[] = [];

    bookings.forEach(b => {
      if (b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Processing' || b.bookingStatus === 'Ticketed') {
        active++;
      } else if (b.bookingStatus === 'Pending') {
        pending++;
      } else if (b.bookingStatus === 'Completed') {
        completed++;
      } else if (b.bookingStatus === 'Cancelled') {
        cancelled++;
      }

      const bal = (b.totalAmount || 0) - (b.paidAmount || 0);
      if (bal > 0 && b.bookingStatus !== 'Cancelled') {
        outstanding += bal;
      }

      const createdDate = b.createdAt ? b.createdAt.split('T')[0] : '';
      if (createdDate === todayStr) {
        revToday += b.paidAmount || 0;
      }

      if (b.createdAt && b.createdAt.startsWith(currentYearMonth)) {
        revMonth += b.paidAmount || 0;
      }

      if (b.departureDate) {
        const depTime = new Date(b.departureDate).getTime();
        if (depTime >= now.getTime() && b.bookingStatus !== 'Cancelled') {
          upDepartures++;
        }
        if (b.departureDate.startsWith(todayStr)) {
          todayDepList.push(b);
        }
      }

      if (b.returnDate) {
        const retTime = new Date(b.returnDate).getTime();
        if (retTime >= now.getTime() && b.bookingStatus !== 'Cancelled') {
          upReturns++;
        }
        if (b.returnDate.startsWith(todayStr)) {
          todayArrList.push(b);
        }
      }
    });

    setStats({
      totalCustomers: customers.length,
      activeBookings: active,
      pendingBookings: pending,
      completedTrips: completed,
      cancelledBookings: cancelled,
      flightReservations: flights.length,
      hotelReservations: hotels.length,
      visaApplications: visas.length,
      passportRequests: passports.length,
      tourPackages: packages.length,
      vehiclesBooked: transports.length,
      revenueToday: revToday,
      revenueThisMonth: revMonth,
      outstandingPayments: outstanding,
      upcomingDepartures: upDepartures,
      upcomingReturns: upReturns,
    });

    setTodaysDepartures(todayDepList);
    setTodaysArrivals(todayArrList);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const cards = [
    { title: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-200', tab: 'Travel Customers' },
    { title: 'Active Bookings', value: stats.activeBookings, icon: Calendar, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', tab: 'Bookings Management' },
    { title: 'Pending Bookings', value: stats.pendingBookings, icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200', tab: 'Bookings Management' },
    { title: 'Completed Trips', value: stats.completedTrips, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', tab: 'Bookings Management' },
    { title: 'Cancelled Bookings', value: stats.cancelledBookings, icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-200', tab: 'Bookings Management' },
    { title: 'Flight Reservations', value: stats.flightReservations, icon: Plane, color: 'text-cyan-600 bg-cyan-50 border-cyan-200', tab: 'Flight Reservations' },
    { title: 'Hotel Reservations', value: stats.hotelReservations, icon: Hotel, color: 'text-violet-600 bg-violet-50 border-violet-200', tab: 'Hotel Bookings' },
    { title: 'Visa Applications', value: stats.visaApplications, icon: FileCheck, color: 'text-sky-600 bg-sky-50 border-sky-200', tab: 'Visa Processing' },
    { title: 'Passport Requests', value: stats.passportRequests, icon: ShieldCheck, color: 'text-teal-600 bg-teal-50 border-teal-200', tab: 'Passport Assistance' },
    { title: 'Tour Packages', value: stats.tourPackages, icon: Compass, color: 'text-orange-600 bg-orange-50 border-orange-200', tab: 'Tour Packages' },
    { title: 'Vehicles Booked', value: stats.vehiclesBooked, icon: Truck, color: 'text-slate-600 bg-slate-50 border-slate-200', tab: 'Ground Transport' },
    { title: 'Revenue Today', value: `${currency}${stats.revenueToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-700 bg-emerald-50 border-emerald-300', tab: 'Travel Invoices' },
    { title: 'Revenue This Month', value: `${currency}${stats.revenueThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-blue-700 bg-blue-50 border-blue-300', tab: 'Travel Reports' },
    { title: 'Outstanding Payments', value: `${currency}${stats.outstandingPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: AlertCircle, color: 'text-amber-700 bg-amber-50 border-amber-300', tab: 'Travel Payments' },
    { title: 'Upcoming Departures', value: stats.upcomingDepartures, icon: ArrowUpRight, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', tab: 'Travel Calendar' },
    { title: 'Upcoming Returns', value: stats.upcomingReturns, icon: ArrowDownLeft, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', tab: 'Travel Calendar' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto bg-slate-50/50 min-h-screen">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-300 font-medium text-xs tracking-wider uppercase mb-1">
              <Compass className="w-4 h-4" /> Travel & Tour Agency Workspace
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {business.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              Real-time flight, hotel, visa, and tour booking operation dashboard
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('Bookings Management')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" /> New Booking
            </button>
            <button
              onClick={() => onNavigate('Visa Processing')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-sm border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" /> Visa Application
            </button>
          </div>
        </div>
      </div>

      {/* Grid of 16 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((c, idx) => {
          const IconComp = c.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(c.tab)}
              className={`p-4 rounded-xl border bg-white hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group border-slate-200/80`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">
                  {c.title}
                </span>
                <div className={`p-2 rounded-lg border ${c.color}`}>
                  <IconComp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Departures & Today's Arrivals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Departures */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Today's Departures</h3>
                <p className="text-xs text-slate-500">Clients departing today</p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">
              {todaysDepartures.length} Total
            </span>
          </div>

          {todaysDepartures.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No departures scheduled for today.
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {todaysDepartures.map((b) => (
                <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{b.customerName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-indigo-600 font-semibold">{b.bookingNumber}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.destination}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {b.serviceType}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">{b.departureDate}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Arrivals / Returns */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Today's Returns</h3>
                <p className="text-xs text-slate-500">Clients returning today</p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">
              {todaysArrivals.length} Total
            </span>
          </div>

          {todaysArrivals.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No returns scheduled for today.
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {todaysArrivals.map((b) => (
                <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{b.customerName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-emerald-600 font-semibold">{b.bookingNumber}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.destination}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                      {b.bookingStatus}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">{b.returnDate}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Business Intelligence & Quick Shortcuts */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Travel Intelligence & Management
          </h3>
          <span className="text-xs text-slate-400 font-medium">Synced with Cloud Firestore</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 font-medium">Top Destination</div>
            <div className="text-base font-bold text-slate-900 mt-1">United Kingdom / Dubai</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 font-medium">Visa Success Rate</div>
            <div className="text-base font-bold text-emerald-600 mt-1">96.4%</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 font-medium">Avg Booking Value</div>
            <div className="text-base font-bold text-slate-900 mt-1">{currency}1,450.00</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 font-medium">Repeat Travelers</div>
            <div className="text-base font-bold text-indigo-600 mt-1">42.8%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
