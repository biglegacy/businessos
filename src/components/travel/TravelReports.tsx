import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart, DollarSign, Plane, Compass, FileCheck, Award, ArrowUpRight } from 'lucide-react';
import { Business } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelReportsProps {
  business: Business;
}

export const TravelReports: React.FC<TravelReportsProps> = ({ business }) => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    flightRevenue: 0,
    hotelRevenue: 0,
    visaRevenue: 0,
    packageRevenue: 0,
    otherRevenue: 0,
    totalBookingsCount: 0,
    approvedVisasCount: 0,
    totalVisasCount: 0,
  });

  const currency = getCurrencySymbol(business.currency);

  const loadData = () => {
    const bookings = db.getTravelBookings(business.id);
    const visas = db.getTravelVisas(business.id);

    let tot = 0;
    let flightRev = 0;
    let hotelRev = 0;
    let visaRev = 0;
    let pkgRev = 0;
    let othRev = 0;

    bookings.forEach(b => {
      const paid = b.paidAmount || 0;
      tot += paid;
      if (b.serviceType === 'Flight') flightRev += paid;
      else if (b.serviceType === 'Hotel') hotelRev += paid;
      else if (b.serviceType === 'Visa') visaRev += paid;
      else if (b.serviceType === 'Tour Package') pkgRev += paid;
      else othRev += paid;
    });

    const approvedV = visas.filter(v => v.status === 'Approved' || v.status === 'Collected').length;

    setStats({
      totalRevenue: tot,
      flightRevenue: flightRev,
      hotelRevenue: hotelRev,
      visaRevenue: visaRev,
      packageRevenue: pkgRev,
      otherRevenue: othRev,
      totalBookingsCount: bookings.length,
      approvedVisasCount: approvedV,
      totalVisasCount: visas.length,
    });
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const visaSuccessRate = stats.totalVisasCount > 0 
    ? ((stats.approvedVisasCount / stats.totalVisasCount) * 100).toFixed(1)
    : '100.0';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" /> Travel Business Analytics & Reports
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Real-time performance metrics, revenue by service category, and visa success ratios
          </p>
        </div>
      </div>

      {stats.totalBookingsCount === 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs font-bold text-amber-900">No data available for the selected period.</p>
          <p className="text-[11px] text-amber-700">Add travel bookings to view live analytics and revenue breakdowns.</p>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Business Revenue</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {currency}{stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Synchronized with Cloud
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Total Travel Reservations</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {stats.totalBookingsCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">All booking categories</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Visa Success Rate</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {visaSuccessRate}%
          </div>
          <div className="text-xs text-slate-400 mt-1">{stats.approvedVisasCount} of {stats.totalVisasCount} approved</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Tour Package Revenue</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {currency}{stats.packageRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Vacation packages</div>
        </div>
      </div>

      {/* Breakdown by Service Category */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-indigo-600" /> Revenue Breakdown by Service
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Flight Reservations</span>
              <span>{currency}{stats.flightRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${stats.totalRevenue > 0 ? (stats.flightRevenue / stats.totalRevenue) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Hotel Bookings</span>
              <span>{currency}{stats.hotelRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-violet-500 h-2.5 rounded-full" style={{ width: `${stats.totalRevenue > 0 ? (stats.hotelRevenue / stats.totalRevenue) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Visa Processing Fees</span>
              <span>{currency}{stats.visaRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${stats.totalRevenue > 0 ? (stats.visaRevenue / stats.totalRevenue) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Tour Packages</span>
              <span>{currency}{stats.packageRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${stats.totalRevenue > 0 ? (stats.packageRevenue / stats.totalRevenue) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
