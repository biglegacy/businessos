import React, { useState } from 'react';
import { db } from '../lib/db';
import { Business, User, ActivityLog } from '../types';
import { 
  History, Search, Filter, Calendar, FileDown, ShieldAlert,
  UserCheck, AlertCircle, RefreshCw, ClipboardList, Info, X
} from 'lucide-react';

interface AuditLogsProps {
  business: Business;
  user: User;
}

export function AuditLogs({ business, user }: AuditLogsProps) {
  if (user.role === 'owner') {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4 font-sans">
        <ShieldAlert className="h-12 w-12 text-rose-600 mx-auto" />
        <h3 className="font-bold text-slate-800 text-lg">Access Restricted</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Activity and audit logs are restricted from the Owner role.
        </p>
      </div>
    );
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('All');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('All');
  const [selectedActionFilter, setSelectedActionFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLog | null>(null);

  // Force re-renders
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  // Fetch lists
  const rawLogs = db.getLogs(business.id);
  const employees = db.getUsers().filter(u => u.businessId === business.id);

  // Derive unique modules and action types for filters
  const uniqueModules = Array.from(new Set(rawLogs.map(l => l.moduleAffected).filter(Boolean)));
  const uniqueActions = Array.from(new Set(rawLogs.map(l => l.action).filter(Boolean)));

  // Filter logs
  const filteredLogs = rawLogs.filter(log => {
    // Search query
    const matchSearch = searchQuery.trim() === '' || 
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.itemAffected && log.itemAffected.toLowerCase().includes(searchQuery.toLowerCase()));

    // User filter
    const matchUser = selectedUserFilter === 'All' || log.userId === selectedUserFilter;

    // Module filter
    const matchModule = selectedModuleFilter === 'All' || log.moduleAffected === selectedModuleFilter;

    // Action filter
    const matchAction = selectedActionFilter === 'All' || log.action === selectedActionFilter;

    // Date range filter
    let matchDate = true;
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      matchDate = matchDate && new Date(log.createdAt).getTime() >= sDate.getTime();
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      matchDate = matchDate && new Date(log.createdAt).getTime() <= eDate.getTime();
    }

    return matchSearch && matchUser && matchModule && matchAction && matchDate;
  });

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedUserFilter('All');
    setSelectedModuleFilter('All');
    setSelectedActionFilter('All');
    setStartDate('');
    setEndDate('');
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    // CSV header row matching exact requested fields
    const headers = [
      'Timestamp',
      'User Name',
      'User ID',
      'User Role',
      'Action Performed',
      'Module Affected',
      'Item Affected',
      'Previous Value',
      'New Value',
      'Details'
    ];

    const rows = filteredLogs.map(l => [
      l.createdAt,
      l.userName,
      l.userId,
      l.userRole || 'N/A',
      l.action,
      l.moduleAffected || 'System',
      l.itemAffected || 'N/A',
      l.previousValue || 'N/A',
      l.newValue || 'N/A',
      l.details.replace(/"/g, '""') // Escape quotes
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BOS_AuditLog_${business.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-800" /> Enterprise Audit Trail &amp; Logs
          </h2>
          <p className="text-xs text-slate-500">Tamper-resistant database audit tracking all inventory modifications, sales, returns, and administrative configurations.</p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm self-stretch md:self-auto justify-center"
        >
          <FileDown className="h-4 w-4" /> Export CSV Audit Trail
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Filter Logs ({filteredLogs.length} found)
          </span>
          <button 
            onClick={handleClearFilters}
            className="text-[10px] font-bold text-emerald-800 hover:underline"
          >
            Clear All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Search Keyword</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="User name, details, action..."
                className="pl-8 pr-3 py-1.5 w-full border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">By User</label>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="block w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-800 text-xs font-medium cursor-pointer focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All">All Users</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.role.toUpperCase()})</option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">By Module</label>
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="block w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-800 text-xs font-medium cursor-pointer focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All">All Modules</option>
              {uniqueModules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="Products">Products</option>
              <option value="Sales">Sales</option>
              <option value="Returns">Returns</option>
              <option value="Employees">Employees</option>
              <option value="Branches">Branches</option>
              <option value="Settings">Settings</option>
            </select>
          </div>

          {/* Date Picker Start */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Date Picker End */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-4 w-1/6">Date &amp; Time</th>
                <th className="py-3 px-4 w-1/6">Responsible User</th>
                <th className="py-3 px-4 w-1/6">Action Performed</th>
                <th className="py-3 px-4 w-[12%]">Module</th>
                <th className="py-3 px-4 w-[15%]">Item Affected</th>
                <th className="py-3 px-4 w-1/4">Audit Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.map(log => (
                <tr 
                  key={log.id} 
                  onClick={() => setSelectedLogDetail(log)}
                  className="hover:bg-slate-50/70 transition cursor-pointer"
                >
                  <td className="py-3 px-4 font-medium text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800 truncate">{log.userName}</p>
                    <p className="text-[9px] text-slate-400 capitalize">{log.userRole || 'Role N/A'}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[9px] tracking-wide border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block font-semibold text-[10px] text-slate-500">
                      {log.moduleAffected || 'System'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 truncate font-semibold">
                    {log.itemAffected || 'Global'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 truncate text-[11px] font-normal">
                    {log.details}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr key="empty-logs">
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    No matching workspace audit records found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 relative font-sans space-y-6 animate-in fade-in zoom-in duration-150">
            <button 
              onClick={() => setSelectedLogDetail(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base">Detailed Audit Record</h4>
                <p className="text-[10px] text-slate-400">Unique Stamp: {selectedLogDetail.id}</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl bg-slate-50/50 text-xs">
              <div className="grid grid-cols-3 p-3">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Date &amp; Time</span>
                <span className="col-span-2 text-slate-800 font-medium">{new Date(selectedLogDetail.createdAt).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 p-3">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Operator Identity</span>
                <span className="col-span-2 text-slate-800 font-medium">{selectedLogDetail.userName} (ID: {selectedLogDetail.userId})</span>
              </div>
              <div className="grid grid-cols-3 p-3">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Operator Role</span>
                <span className="col-span-2 text-slate-800 font-bold uppercase text-[10px] text-emerald-800">{selectedLogDetail.userRole || 'None'}</span>
              </div>
              <div className="grid grid-cols-3 p-3">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Event Action</span>
                <span className="col-span-2 font-bold text-slate-800">{selectedLogDetail.action}</span>
              </div>
              <div className="grid grid-cols-3 p-3">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Affected Module</span>
                <span className="col-span-2 text-slate-800 font-semibold">{selectedLogDetail.moduleAffected || 'System'}</span>
              </div>
              <div className="grid grid-cols-3 p-3">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Item / Entity</span>
                <span className="col-span-2 text-slate-800 font-bold">{selectedLogDetail.itemAffected || 'Global Settings'}</span>
              </div>
              <div className="grid grid-cols-3 p-3">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Previous Value</span>
                <span className="col-span-2 font-mono text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-[10px] overflow-x-auto max-w-xs inline-block whitespace-pre-wrap">{selectedLogDetail.previousValue || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-3 p-3">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">New Value</span>
                <span className="col-span-2 font-mono text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[10px] overflow-x-auto max-w-xs inline-block whitespace-pre-wrap">{selectedLogDetail.newValue || 'N/A'}</span>
              </div>
              <div className="p-3 space-y-1 bg-white rounded-b-2xl">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Full Narrative Detail</span>
                <span className="text-slate-600 block text-[11px] leading-relaxed font-normal">{selectedLogDetail.details}</span>
              </div>
            </div>

            <div className="text-right">
              <button 
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Record View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
