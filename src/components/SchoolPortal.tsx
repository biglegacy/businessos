import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraduationCap, Users, BookOpen, Receipt, CalendarCheck, 
  Award, Clock, Send, Settings, Plus, Search, Filter, 
  Phone, Mail, CheckCircle2, AlertCircle, Trash2, Edit2, 
  Download, Printer, Share2, DollarSign, Calendar, ChevronRight,
  UserCheck, X, RefreshCw, MessageSquare, Smartphone, ShieldCheck
} from 'lucide-react';
import { 
  Business, User, Student, Teacher, SchoolClass, 
  FeeInvoice, FeePayment, AttendanceRecord, ExamGrade, 
  SchoolTimetableEntry, SchoolAnnouncement, SmsSettings, WhatsAppSettings 
} from '../types';
import { db, formatCurrency } from '../lib/db';

interface SchoolPortalProps {
  business: Business;
  currentUser: User;
  onNavigate?: (tab: string) => void;
  activeTab?: string;
}

export function SchoolPortal({ business, currentUser, onNavigate, activeTab: externalTab }: SchoolPortalProps) {
  const [activeTab, setActiveTab] = useState<string>(externalTab || 'overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  
  // Data from db
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [grades, setGrades] = useState<ExamGrade[]>([]);
  const [timetable, setTimetable] = useState<SchoolTimetableEntry[]>([]);
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>([]);
  const [smsSettings, setSmsSettings] = useState<SmsSettings>(db.getLocalSmsSettings());
  const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppSettings>(db.getWhatsAppSettings());

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<FeeInvoice | null>(null);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceClassId, setAttendanceClassId] = useState<string>('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync external tab if provided
  useEffect(() => {
    if (externalTab) {
      const map: Record<string, string> = {
        'School Dashboard': 'overview',
        'Dashboard': 'overview',
        'Students': 'students',
        'Teachers & Staff': 'teachers',
        'Classes & Courses': 'classes',
        'School Fees & Invoices': 'fees',
        'Attendance': 'attendance',
        'Exams & Grades': 'grades',
        'Timetable': 'timetable',
        'Announcements & SMS': 'announcements',
        'Settings': 'settings',
        'Parent Portal': 'parent',
        'Student Portal': 'student_view'
      };
      if (map[externalTab]) {
        setActiveTab(map[externalTab]);
      }
    }
  }, [externalTab]);

  // Load and seed initial data if fresh
  const reloadData = () => {
    let curClasses = db.getClasses(business.id);
    let curStudents = db.getStudents(business.id);
    let curTeachers = db.getTeachers(business.id);
    let curInvoices = db.getFeeInvoices(business.id);

    // Initial seeding if school is completely empty
    if (curClasses.length === 0 && curStudents.length === 0) {
      const seedClasses: SchoolClass[] = [
        { id: 'cls-p1', businessId: business.id, name: 'Primary 1 Gold', gradeLevel: 'Primary 1', capacity: 35, currentEnrollment: 18, academicYear: '2025/2026', roomNumber: 'Block A-01', createdAt: new Date().toISOString() },
        { id: 'cls-p2', businessId: business.id, name: 'Primary 2 Ruby', gradeLevel: 'Primary 2', capacity: 35, currentEnrollment: 22, academicYear: '2025/2026', roomNumber: 'Block A-02', createdAt: new Date().toISOString() },
        { id: 'cls-jhs1', businessId: business.id, name: 'JHS 1 Diamond', gradeLevel: 'JHS 1', capacity: 40, currentEnrollment: 25, academicYear: '2025/2026', roomNumber: 'Block B-01', createdAt: new Date().toISOString() }
      ];
      seedClasses.forEach(c => db.saveClass(business.id, c));
      curClasses = seedClasses;

      const seedTeachers: Teacher[] = [
        { id: 'tch-1', businessId: business.id, staffId: 'SCH-T01', name: 'Kwame Mensah', email: 'kmensah@school.edu', phone: '+233244112233', gender: 'male', subjects: ['Mathematics', 'Integrated Science'], classes: ['Primary 1 Gold', 'JHS 1 Diamond'], employmentDate: '2023-09-01', status: 'active', qualification: 'B.Ed Mathematics', createdAt: new Date().toISOString() },
        { id: 'tch-2', businessId: business.id, staffId: 'SCH-T02', name: 'Abena Osei', email: 'aosei@school.edu', phone: '+233201998877', gender: 'female', subjects: ['English Language', 'Social Studies'], classes: ['Primary 2 Ruby'], employmentDate: '2022-01-15', status: 'active', qualification: 'B.A. English Education', createdAt: new Date().toISOString() }
      ];
      seedTeachers.forEach(t => db.saveTeacher(business.id, t));
      curTeachers = seedTeachers;

      const seedStudents: Student[] = [
        { id: 'std-1', businessId: business.id, studentId: 'ADM-2025-001', firstName: 'Kofi', lastName: 'Appiah', gender: 'male', classId: 'cls-p1', className: 'Primary 1 Gold', parentName: 'Mr. Emmanuel Appiah', parentPhone: '+233244001122', parentEmail: 'eappiah@gmail.com', admissionDate: '2025-01-10', status: 'active', createdAt: new Date().toISOString() },
        { id: 'std-2', businessId: business.id, studentId: 'ADM-2025-002', firstName: 'Ama', lastName: 'Serwaa', gender: 'female', classId: 'cls-p1', className: 'Primary 1 Gold', parentName: 'Mrs. Grace Serwaa', parentPhone: '+233501234567', parentEmail: 'gserwaa@yahoo.com', admissionDate: '2025-01-11', status: 'active', createdAt: new Date().toISOString() },
        { id: 'std-3', businessId: business.id, studentId: 'ADM-2025-003', firstName: 'Yaw', lastName: 'Boakye', gender: 'male', classId: 'cls-p2', className: 'Primary 2 Ruby', parentName: 'Dr. Frank Boakye', parentPhone: '+233277889900', admissionDate: '2024-09-01', status: 'active', createdAt: new Date().toISOString() }
      ];
      seedStudents.forEach(s => db.saveStudent(business.id, s));
      curStudents = seedStudents;

      const seedInvoices: FeeInvoice[] = [
        { id: 'inv-1', businessId: business.id, invoiceNumber: 'INV-2026-001', studentId: 'std-1', studentName: 'Kofi Appiah', classId: 'cls-p1', className: 'Primary 1 Gold', term: 'Term 1', academicYear: '2025/2026', feeItems: [{ title: 'Tuition & Academic Levy', amount: 1200 }, { title: 'ICT & STEM Lab Fee', amount: 150 }, { title: 'PTA Dues', amount: 50 }], totalAmount: 1400, paidAmount: 800, balance: 600, status: 'partial', dueDate: '2026-04-30', issueDate: '2026-01-15', createdAt: new Date().toISOString() },
        { id: 'inv-2', businessId: business.id, invoiceNumber: 'INV-2026-002', studentId: 'std-2', studentName: 'Ama Serwaa', classId: 'cls-p1', className: 'Primary 1 Gold', term: 'Term 1', academicYear: '2025/2026', feeItems: [{ title: 'Tuition & Academic Levy', amount: 1200 }, { title: 'ICT & STEM Lab Fee', amount: 150 }], totalAmount: 1350, paidAmount: 1350, balance: 0, status: 'paid', dueDate: '2026-04-30', issueDate: '2026-01-15', createdAt: new Date().toISOString() }
      ];
      seedInvoices.forEach(i => db.saveFeeInvoice(business.id, i));
      curInvoices = seedInvoices;

      const seedAnnounce: SchoolAnnouncement = {
        id: 'anc-1',
        businessId: business.id,
        title: 'Mid-Term Break & Open Day Notice',
        content: 'Dear Parents & Guardians, please be informed that our Mid-Term Open Day and Parents-Teachers Consultations will take place this Friday at 9:00 AM.',
        targetAudience: 'all',
        channel: 'both',
        date: new Date().toISOString().split('T')[0],
        authorName: 'Principal Office',
        smsStatus: 'sent',
        recipientCount: 45,
        createdAt: new Date().toISOString()
      };
      db.saveSchoolAnnouncement(business.id, seedAnnounce);
    }

    setClasses(curClasses);
    setStudents(curStudents);
    setTeachers(curTeachers);
    setInvoices(curInvoices);
    setPayments(db.getFeePayments(business.id));
    setAttendance(db.getAttendance(business.id));
    setGrades(db.getExamGrades(business.id));
    setTimetable(db.getTimetable(business.id));
    setAnnouncements(db.getSchoolAnnouncements(business.id));
    setSmsSettings(db.getLocalSmsSettings());
    setWhatsAppSettings(db.getWhatsAppSettings());

    if (curClasses.length > 0 && !attendanceClassId) {
      setAttendanceClassId(curClasses[0].id);
    }
  };

  useEffect(() => {
    reloadData();
  }, [business.id]);

  // Sync attendance state when class/date changes
  useEffect(() => {
    if (!attendanceClassId) return;
    const existing = db.getAttendance(business.id, attendanceDate, attendanceClassId);
    const map: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    existing.forEach(rec => {
      map[rec.studentId] = rec.status;
    });
    setAttendanceMap(map);
  }, [attendanceDate, attendanceClassId, business.id]);

  // Aggregate stats
  const totalStudents = students.filter(s => s.status === 'active').length;
  const totalTeachers = teachers.filter(t => t.status === 'active').length;
  const totalClassesCount = classes.length;
  const totalFeesInvoiced = invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const totalFeesCollected = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const totalOutstandingBalance = Math.max(0, totalFeesInvoiced - totalFeesCollected);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = (s.firstName + ' ' + s.lastName + ' ' + s.studentId + ' ' + s.parentName).toLowerCase().includes(searchQuery.toLowerCase());
      const matchClass = selectedClassFilter === 'all' || s.classId === selectedClassFilter;
      return matchSearch && matchClass;
    });
  }, [students, searchQuery, selectedClassFilter]);

  // Quick action: Save batch attendance
  const handleSaveAttendance = () => {
    const cls = classes.find(c => c.id === attendanceClassId);
    const clsName = cls ? cls.name : 'Class';
    const classStudents = students.filter(s => s.classId === attendanceClassId);

    const records: AttendanceRecord[] = classStudents.map(s => ({
      id: `att-${attendanceDate}-${s.id}`,
      businessId: business.id,
      date: attendanceDate,
      classId: attendanceClassId,
      className: clsName,
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      status: attendanceMap[s.id] || 'present',
      recordedBy: currentUser.name,
      createdAt: new Date().toISOString()
    }));

    db.saveAttendanceBatch(business.id, records);
    setAttendance(db.getAttendance(business.id));
    showToast(`Attendance saved successfully for ${clsName} (${records.length} students).`);
  };

  const handleMarkAllPresent = () => {
    const classStudents = students.filter(s => s.classId === attendanceClassId);
    const newMap = { ...attendanceMap };
    classStudents.forEach(s => {
      newMap[s.id] = 'present';
    });
    setAttendanceMap(newMap);
  };

  // Quick action: Record payment
  const handleRecordPaymentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInvoiceForPay) return;
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string) || 0;
    const method = formData.get('paymentMethod') as any || 'mobile_money';
    const ref = formData.get('transactionRef') as string || `TXN-${Date.now()}`;

    if (amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const payment: FeePayment = {
      id: `pay-${Date.now()}`,
      businessId: business.id,
      invoiceId: selectedInvoiceForPay.id,
      studentId: selectedInvoiceForPay.studentId,
      studentName: selectedInvoiceForPay.studentName,
      amount,
      paymentMethod: method,
      transactionRef: ref,
      receiptNumber: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      paidDate: new Date().toISOString().split('T')[0],
      receivedBy: currentUser.name,
      notes: formData.get('notes') as string || '',
      createdAt: new Date().toISOString()
    };

    db.saveFeePayment(business.id, payment);
    reloadData();
    setIsPaymentModalOpen(false);
    setSelectedInvoiceForPay(null);
    showToast(`Payment of ${formatCurrency(amount, business.currency)} recorded. Receipt: ${payment.receiptNumber}`);
  };

  // Render navigation bar
  const navTabs = [
    { id: 'overview', label: 'Overview', icon: GraduationCap },
    { id: 'students', label: 'Students', icon: Users, badge: students.length },
    { id: 'teachers', label: 'Teachers', icon: BookOpen, badge: teachers.length },
    { id: 'classes', label: 'Classes', icon: CheckCircle2 },
    { id: 'fees', label: 'Fees & Billing', icon: Receipt },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'grades', label: 'Report Cards', icon: Award },
    { id: 'announcements', label: 'SMS & WhatsApp', icon: Send },
    { id: 'settings', label: 'Institution Settings', icon: Settings }
  ];

  return (
    <div id="school-portal-root" className="min-h-full flex flex-col font-sans pb-16 md:pb-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Mobile/Desktop Header */}
      <div className="bg-white border-b border-slate-200 -mx-4 sm:-mx-6 lg:-mx-10 -mt-4 sm:-mt-6 lg:-mt-10 px-4 sm:px-8 py-4 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-indigo-200">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-none">
                  {business.name}
                </h1>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-full uppercase">
                  School Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Term 1 &bull; Academic Year 2025/2026 &bull; Active Enrolment: <strong className="text-slate-800">{totalStudents} Students</strong>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => { setEditingStudent(null); setIsStudentModalOpen(true); }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer min-h-[44px]"
            >
              <Plus className="h-4 w-4" /> Enroll Student
            </button>
            <button
              onClick={() => { setIsNoticeModalOpen(true); }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer min-h-[44px]"
            >
              <Send className="h-4 w-4" /> Broadcast SMS
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Pills (Scrollable on Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto mt-4 pt-2 border-t border-slate-100 no-scrollbar">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer min-h-[40px] ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Students</span>
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalStudents}</span>
                <span className="text-[11px] font-bold text-emerald-600">Active</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Teaching Staff</span>
                <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BookOpen className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalTeachers}</span>
                <span className="text-[11px] font-bold text-slate-400">Across {totalClassesCount} classes</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Fees Collected</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-black text-emerald-700">
                  {formatCurrency(totalFeesCollected, business.currency)}
                </span>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-1.5 rounded-full" 
                    style={{ width: `${totalFeesInvoiced > 0 ? (totalFeesCollected / totalFeesInvoiced) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Outstanding Fees</span>
                <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-black text-rose-600">
                  {formatCurrency(totalOutstandingBalance, business.currency)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Pending payment collection</span>
              </div>
            </div>
          </div>

          {/* Quick Action Banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => setActiveTab('attendance')} 
              className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-5 rounded-2xl cursor-pointer hover:shadow-md transition relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase">
                  <CalendarCheck className="h-4 w-4" /> Daily Register
                </div>
                <h3 className="text-base font-extrabold mt-1">Take Class Attendance</h3>
                <p className="text-xs text-indigo-200/80 mt-1">1-tap roll call with auto parent SMS notifications.</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-300 group-hover:translate-x-1 transition-transform">
                  Launch Attendance Register &rarr;
                </div>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('fees')} 
              className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-5 rounded-2xl cursor-pointer hover:shadow-md transition relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase">
                  <Receipt className="h-4 w-4" /> Fee Collection
                </div>
                <h3 className="text-base font-extrabold mt-1">Collect Fees &amp; Issue Receipt</h3>
                <p className="text-xs text-emerald-200/80 mt-1">Record Cash or Mobile Money with instant printable slip.</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-300 group-hover:translate-x-1 transition-transform">
                  Manage Fee Payments &rarr;
                </div>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('announcements')} 
              className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl cursor-pointer hover:shadow-md transition relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
                  <MessageSquare className="h-4 w-4" /> Parent Broadcasts
                </div>
                <h3 className="text-base font-extrabold mt-1">Send SMS / WhatsApp</h3>
                <p className="text-xs text-slate-300 mt-1">Reach 100% of parents with fee reminders and school alerts.</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                  Broadcast Message &rarr;
                </div>
              </div>
            </div>
          </div>

          {/* Recent Admissions & Recent Fee Invoices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student List Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" /> Recent Student Admissions
                </h3>
                <button 
                  onClick={() => setActiveTab('students')}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  View All ({students.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {students.slice(0, 4).map(s => (
                  <div key={s.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl flex items-center justify-between transition">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {s.firstName.charAt(0)}{s.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{s.firstName} {s.lastName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{s.studentId} &bull; {s.className}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                        {s.status}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.parentPhone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Fee Notices */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600" /> School Fee Invoices
                </h3>
                <button 
                  onClick={() => setActiveTab('fees')}
                  className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  View All ({invoices.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {invoices.slice(0, 4).map(inv => (
                  <div key={inv.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl flex items-center justify-between transition">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{inv.studentName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{inv.invoiceNumber} &bull; {inv.className}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-xs text-slate-900">{formatCurrency(inv.totalAmount, business.currency)}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {inv.status === 'paid' ? 'Fully Paid' : `Bal: ${formatCurrency(inv.balance, business.currency)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: STUDENTS DIRECTORY */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, admission #, or parent phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedClassFilter}
                onChange={e => setSelectedClassFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer min-h-[40px]"
              >
                <option value="all">All Classes ({classes.length})</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button
                onClick={() => { setEditingStudent(null); setIsStudentModalOpen(true); }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer min-h-[40px]"
              >
                <Plus className="h-4 w-4" /> Enroll Student
              </button>
            </div>
          </div>

          {/* Responsive Students: Card List on Mobile, Table on Desktop */}
          <div className="block lg:hidden space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No students found matching filters.</p>
              </div>
            ) : (
              filteredStudents.map(s => (
                <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-sm">
                        {s.firstName.charAt(0)}{s.lastName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{s.firstName} {s.lastName}</h4>
                        <span className="text-[11px] font-mono text-slate-500">{s.studentId} &bull; {s.className}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full uppercase">
                      {s.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Parent / Guardian:</span>
                      <strong className="text-slate-800">{s.parentName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact:</span>
                      <strong className="text-slate-800">{s.parentPhone}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <a
                      href={`tel:${s.parentPhone}`}
                      className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call Parent
                    </a>
                    <a
                      href={`https://wa.me/${s.parentPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                    <button
                      onClick={() => setSelectedStudentForReport(s)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                      title="View Report Card"
                    >
                      <Award className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setEditingStudent(s); setIsStudentModalOpen(true); }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                      title="Edit Student"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-6">Admission # &amp; Student</th>
                  <th className="py-3 px-6">Class / Grade</th>
                  <th className="py-3 px-6">Parent / Guardian</th>
                  <th className="py-3 px-6">Parent Phone</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredStudents.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {s.firstName.charAt(0)}{s.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">{s.firstName} {s.lastName}</p>
                          <p className="text-[10px] font-mono text-slate-400">{s.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-800">{s.className}</td>
                    <td className="py-3.5 px-6 text-slate-800">{s.parentName}</td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-700">{s.parentPhone}</span>
                        <a href={`tel:${s.parentPhone}`} className="p-1 hover:bg-emerald-50 rounded text-emerald-600">
                          <Phone className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedStudentForReport(s)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Award className="h-3.5 w-3.5" /> Report Card
                        </button>
                        <button
                          onClick={() => { setEditingStudent(s); setIsStudentModalOpen(true); }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Permanently remove student ${s.firstName} ${s.lastName}?`)) {
                              db.deleteStudent(business.id, s.id);
                              reloadData();
                              showToast('Student deleted successfully.');
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: TEACHERS & FACULTY */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Academic Faculty &amp; Staff</h3>
              <p className="text-xs text-slate-500">Manage instructors, subject allocations, and staff records.</p>
            </div>
            <button
              onClick={() => { setEditingTeacher(null); setIsTeacherModalOpen(true); }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Teacher
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{t.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">{t.staffId} &bull; {t.qualification || 'Educator'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                    {t.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <strong className="font-mono text-slate-800">{t.phone}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-slate-700 truncate max-w-[160px]">{t.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subjects:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                      {t.subjects?.join(', ') || 'General'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <a
                    href={`tel:${t.phone}`}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                  <button
                    onClick={() => { setEditingTeacher(t); setIsTeacherModalOpen(true); }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove teacher ${t.name}?`)) {
                        db.deleteTeacher(business.id, t.id);
                        reloadData();
                        showToast('Teacher removed.');
                      }
                    }}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: CLASSES & COURSES */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Classes &amp; Grade Levels</h3>
              <p className="text-xs text-slate-500">Configure academic streams, classrooms, and student allocations.</p>
            </div>
            <button
              onClick={() => { setEditingClass(null); setIsClassModalOpen(true); }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Class
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classes.map(c => {
              const enrolled = students.filter(s => s.classId === c.id).length;
              return (
                <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">{c.name}</h4>
                      <p className="text-xs text-slate-500">{c.gradeLevel} &bull; Room {c.roomNumber || 'N/A'}</p>
                    </div>
                    <span className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {c.gradeLevel.slice(0, 2)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-500">Enrolment:</span>
                      <strong className="text-slate-900">{enrolled} / {c.capacity} students</strong>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-1.5 rounded-full" 
                        style={{ width: `${Math.min(100, (enrolled / (c.capacity || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => {
                        setSelectedClassFilter(c.id);
                        setActiveTab('students');
                      }}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      View Students ({enrolled}) &rarr;
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete class ${c.name}?`)) {
                          db.deleteClass(business.id, c.id);
                          reloadData();
                          showToast('Class deleted.');
                        }
                      }}
                      className="p-1 hover:bg-rose-50 text-rose-600 rounded transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: FEES & BILLING */}
      {activeTab === 'fees' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">School Fees Invoicing &amp; Receipts</h3>
              <p className="text-xs text-slate-500">Track tuition payments, issue official receipts, and manage student balances.</p>
            </div>
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" /> Create Fee Invoice
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{inv.invoiceNumber}</span>
                    <h4 className="font-extrabold text-slate-900 text-sm">{inv.studentName}</h4>
                    <p className="text-xs text-slate-500">{inv.className} &bull; {inv.term}</p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                    inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {inv.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Fee Bill:</span>
                    <strong className="text-slate-900">{formatCurrency(inv.totalAmount, business.currency)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(inv.paidAmount, business.currency)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-extrabold border-t border-slate-200 pt-1 mt-1">
                    <span>Remaining Balance:</span>
                    <span>{formatCurrency(inv.balance, business.currency)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {inv.balance > 0 && (
                    <button
                      onClick={() => {
                        setSelectedInvoiceForPay(inv);
                        setIsPaymentModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <DollarSign className="h-3.5 w-3.5" /> Record Payment
                    </button>
                  )}
                  <button
                    onClick={() => {
                      alert(`Receipt generated for ${inv.studentName}. Total paid: ${formatCurrency(inv.paidAmount, business.currency)}`);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" /> Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 6: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
              <select
                value={attendanceClassId}
                onChange={e => setAttendanceClassId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Mark All Present
              </button>
              <button
                onClick={handleSaveAttendance}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                Save Register
              </button>
            </div>
          </div>

          {/* Student Attendance List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
            {students.filter(s => s.classId === attendanceClassId).map(s => {
              const currentStatus = attendanceMap[s.id] || 'present';
              return (
                <div key={s.id} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between transition">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {s.firstName.charAt(0)}{s.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">{s.firstName} {s.lastName}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{s.studentId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(['present', 'absent', 'late', 'excused'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setAttendanceMap(prev => ({ ...prev, [s.id]: status }))}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                          currentStatus === status
                            ? status === 'present' ? 'bg-emerald-600 text-white shadow-xs'
                              : status === 'absent' ? 'bg-rose-600 text-white shadow-xs'
                              : status === 'late' ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 7: ANNOUNCEMENTS & SMS BROADCASTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Parent &amp; Staff Communication</h3>
              <p className="text-xs text-slate-500">Send bulk SMS reminders, portal announcements, and WhatsApp notifications.</p>
            </div>
            <button
              onClick={() => setIsNoticeModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Send className="h-4 w-4" /> Send Announcement
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map(a => (
              <div key={a.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">{a.title}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full uppercase">
                    {a.targetAudience}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{a.content}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span>Channel: <strong className="text-slate-700 uppercase">{a.channel}</strong></span>
                  <span>{a.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 8: INSTITUTION SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-2xl">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">School Configuration</h3>
            <p className="text-xs text-slate-500">Update academic term credentials, communication providers, and portal branding.</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const provider = form.get('smsProvider') as any;
            const apiKey = form.get('smsApiKey') as string;
            const senderId = form.get('smsSenderId') as string;
            db.saveLocalSmsSettings({
              provider,
              apiKey,
              senderId,
              isActive: true,
              balance: smsSettings.balance || 1000
            });
            showToast('School & SMS settings saved successfully.');
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Institution Name</label>
              <input 
                type="text" 
                defaultValue={business.name} 
                disabled 
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMS Gateway Provider</label>
                <select name="smsProvider" defaultValue={smsSettings.provider} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                  <option value="hubtel">Hubtel SMS (Ghana)</option>
                  <option value="arkesel">Arkesel SMS</option>
                  <option value="mnotify">mNotify SMS</option>
                  <option value="twilio">Twilio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMS Sender ID (Crest)</label>
                <input 
                  type="text" 
                  name="smsSenderId" 
                  defaultValue={smsSettings.senderId || 'SchoolOS'} 
                  maxLength={11}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SMS API Key</label>
              <input 
                type="password" 
                name="smsApiKey" 
                defaultValue={smsSettings.apiKey || ''} 
                placeholder="Enter SMS provider API Key"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono" 
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              Save Configuration
            </button>
          </form>
        </div>
      )}

      {/* MODAL: ENROLL / EDIT STUDENT */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingStudent ? 'Edit Student Details' : 'New Student Admission'}
              </h3>
              <button onClick={() => setIsStudentModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const classId = f.get('classId') as string;
              const cls = classes.find(c => c.id === classId);

              const student: Student = {
                id: editingStudent?.id || `std-${Date.now()}`,
                businessId: business.id,
                studentId: f.get('studentId') as string || `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
                firstName: f.get('firstName') as string,
                lastName: f.get('lastName') as string,
                gender: f.get('gender') as any,
                classId,
                className: cls ? cls.name : 'Class',
                parentName: f.get('parentName') as string,
                parentPhone: f.get('parentPhone') as string,
                parentEmail: f.get('parentEmail') as string || '',
                admissionDate: f.get('admissionDate') as string || new Date().toISOString().split('T')[0],
                status: 'active',
                createdAt: editingStudent?.createdAt || new Date().toISOString()
              };

              db.saveStudent(business.id, student);
              reloadData();
              setIsStudentModalOpen(false);
              showToast(`Student ${student.firstName} ${student.lastName} enrolled.`);
            }} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input required name="firstName" defaultValue={editingStudent?.firstName} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                  <input required name="lastName" defaultValue={editingStudent?.lastName} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admission #</label>
                  <input name="studentId" defaultValue={editingStudent?.studentId || `ADM-2026-${Math.floor(100 + Math.random() * 900)}`} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select name="gender" defaultValue={editingStudent?.gender || 'male'} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Class *</label>
                <select name="classId" defaultValue={editingStudent?.classId || classes[0]?.id} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
                <p className="font-extrabold text-indigo-950 text-[11px] uppercase tracking-wider">Parent / Guardian Contact</p>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Parent Name *</label>
                  <input required name="parentName" defaultValue={editingStudent?.parentName} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Phone Number *</label>
                    <input required name="parentPhone" defaultValue={editingStudent?.parentPhone} placeholder="+233..." className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Email (Optional)</label>
                    <input name="parentEmail" defaultValue={editingStudent?.parentEmail} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer mt-2"
              >
                {editingStudent ? 'Save Student Changes' : 'Confirm Admission'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT */}
      {isPaymentModalOpen && selectedInvoiceForPay && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Record Fee Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p className="font-extrabold text-slate-900">{selectedInvoiceForPay.studentName}</p>
              <p className="text-slate-500 font-mono">{selectedInvoiceForPay.invoiceNumber} &bull; {selectedInvoiceForPay.className}</p>
              <p className="text-rose-600 font-bold">Outstanding Balance: {formatCurrency(selectedInvoiceForPay.balance, business.currency)}</p>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount Paying *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="amount" 
                  required 
                  defaultValue={selectedInvoiceForPay.balance} 
                  max={selectedInvoiceForPay.balance}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm text-slate-900" 
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Channel</label>
                <select name="paymentMethod" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800">
                  <option value="mobile_money">Mobile Money (MTN / Telecel / AT)</option>
                  <option value="cash">Cash In Hand</option>
                  <option value="bank_transfer">Bank Transfer / Deposit</option>
                  <option value="cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reference / Transaction ID</label>
                <input name="transactionRef" placeholder="e.g. MOMO-982142" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                Confirm Payment &amp; Issue Slip
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST NOTICE */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Broadcast SMS / School Notice</h3>
              <button onClick={() => setIsNoticeModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const announcement: SchoolAnnouncement = {
                id: `anc-${Date.now()}`,
                businessId: business.id,
                title: f.get('title') as string,
                content: f.get('content') as string,
                targetAudience: f.get('targetAudience') as any || 'parents',
                channel: f.get('channel') as any || 'both',
                date: new Date().toISOString().split('T')[0],
                authorName: currentUser.name,
                smsStatus: 'sent',
                recipientCount: students.length,
                createdAt: new Date().toISOString()
              };

              db.saveSchoolAnnouncement(business.id, announcement);
              reloadData();
              setIsNoticeModalOpen(false);
              showToast(`Broadcast sent to ${announcement.recipientCount} recipients via ${announcement.channel}.`);
            }} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Headline *</label>
                <input required name="title" placeholder="e.g. End of Term Examination Timetable" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Audience</label>
                  <select name="targetAudience" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="parents">All Parents</option>
                    <option value="teachers">Teaching Staff</option>
                    <option value="all">Entire School Community</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dispatch Mode</label>
                  <select name="channel" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="both">SMS &amp; Portal Notification</option>
                    <option value="sms">Direct SMS Gateway</option>
                    <option value="portal">School Portal Notice Board</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Message *</label>
                <textarea 
                  required 
                  name="content" 
                  rows={4} 
                  placeholder="Type your official announcement here..." 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                Send Broadcast Now
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT REPORT CARD */}
      {selectedStudentForReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Terminal Academic Report</h3>
                <p className="text-xs text-slate-500">{business.name}</p>
              </div>
              <button onClick={() => setSelectedStudentForReport(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <strong className="text-slate-900">{selectedStudentForReport.firstName} {selectedStudentForReport.lastName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Admission #:</span>
                <span className="font-mono text-slate-800">{selectedStudentForReport.studentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Class:</span>
                <strong className="text-slate-900">{selectedStudentForReport.className}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Academic Term:</span>
                <span className="text-slate-800">Term 1 (2025/2026)</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Score</th>
                    <th className="py-2.5 px-4">Grade</th>
                    <th className="py-2.5 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-4 font-bold text-slate-800">Mathematics</td>
                    <td className="py-2 px-4">88/100</td>
                    <td className="py-2 px-4 font-black text-emerald-600">A+</td>
                    <td className="py-2 px-4 text-slate-500">Excellent performance</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-bold text-slate-800">English Language</td>
                    <td className="py-2 px-4">82/100</td>
                    <td className="py-2 px-4 font-black text-emerald-600">A</td>
                    <td className="py-2 px-4 text-slate-500">Very good expression</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-bold text-slate-800">Integrated Science</td>
                    <td className="py-2 px-4">79/100</td>
                    <td className="py-2 px-4 font-black text-indigo-600">B+</td>
                    <td className="py-2 px-4 text-slate-500">Good comprehension</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-bold text-slate-800">ICT / Computing</td>
                    <td className="py-2 px-4">94/100</td>
                    <td className="py-2 px-4 font-black text-emerald-600">A+</td>
                    <td className="py-2 px-4 text-slate-500">Exceptional aptitude</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  alert('Printing terminal report card...');
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Report Card
              </button>
              <button
                onClick={() => setSelectedStudentForReport(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Phones only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 flex justify-around items-center md:hidden shadow-lg">
        {[
          { id: 'overview', label: 'Overview', icon: GraduationCap },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'fees', label: 'Fees', icon: Receipt },
          { id: 'attendance', label: 'Roll Call', icon: CalendarCheck },
          { id: 'announcements', label: 'SMS', icon: Send }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition min-w-[56px] min-h-[44px] cursor-pointer ${
                isActive ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span className="mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
