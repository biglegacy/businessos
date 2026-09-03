import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ArrowUpRight, ArrowDownLeft, FileCheck, Hotel, ChevronLeft, ChevronRight } from 'lucide-react';
import { Business } from '../../types';
import { db } from '../../lib/db';

interface TravelCalendarProps {
  business: Business;
}

export const TravelCalendar: React.FC<TravelCalendarProps> = ({ business }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);

  const loadData = () => {
    const bookings = db.getTravelBookings(business.id);
    const visas = db.getTravelVisas(business.id);
    const hotels = db.getTravelHotels(business.id);

    const list: any[] = [];

    bookings.forEach(b => {
      if (b.departureDate) {
        list.push({
          date: b.departureDate.split('T')[0],
          type: 'Departure',
          title: `Departure: ${b.customerName} → ${b.destination}`,
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        });
      }
      if (b.returnDate) {
        list.push({
          date: b.returnDate.split('T')[0],
          type: 'Return',
          title: `Return: ${b.customerName} from ${b.destination}`,
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        });
      }
    });

    visas.forEach(v => {
      if (v.appointmentDate) {
        list.push({
          date: v.appointmentDate.split('T')[0],
          type: 'Visa Appt',
          title: `Visa Appt: ${v.customerName} (${v.country})`,
          color: 'bg-sky-100 text-sky-800 border-sky-200',
        });
      }
    });

    hotels.forEach(h => {
      if (h.checkIn) {
        list.push({
          date: h.checkIn.split('T')[0],
          type: 'Hotel Check-in',
          title: `Hotel Check-in: ${h.guestName || 'Guest'} @ ${h.hotelName}`,
          color: 'bg-violet-100 text-violet-800 border-violet-200',
        });
      }
    });

    setEvents(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" /> Departure & Operations Calendar
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Visual calendar for upcoming departures, returns, embassy biometric appointments, and hotel check-ins
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-slate-900 text-sm w-36 text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-600">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-500 uppercase py-2 border-b border-slate-100">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-28 bg-slate-50/50 rounded-xl"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dayStr);

            return (
              <div key={dayNum} className="h-28 bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col justify-between overflow-hidden">
                <div className="font-bold text-xs text-slate-700">{dayNum}</div>
                <div className="space-y-1 overflow-y-auto max-h-20 text-[10px]">
                  {dayEvents.map((ev, i) => (
                    <div key={i} className={`p-1 rounded border font-medium truncate ${ev.color}`}>
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
