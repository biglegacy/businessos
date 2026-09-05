/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../lib/db';
import { User, Business, UserRole } from '../types';
import { 
  Users, Plus, Trash2, Shield, Lock, Activity, 
  X, Check, AlertCircle, Eye, RefreshCw
} from 'lucide-react';

interface EmployeesProps {
  business: Business;
  currentUser: User;
}

// Map roles to descriptive permission capabilities
const ROLE_PERMISSIONS: Record<UserRole, { title: string; caps: string[] }> = {
  owner: {
    title: 'Owner / Administrator',
    caps: ['Point of Sale (POS)', 'Inventory & Stock Refilling', 'Advanced Business Reports', 'Employee Roster Directory', 'Custom Receipts & Portals']
  },
  manager: {
    title: 'Operational Manager',
    caps: ['Point of Sale (POS)', 'Inventory & Stock Refilling', 'Customer Relations Directory', 'General Reports']
  },
  cashier: {
    title: 'Cashier Clerk',
    caps: ['Point of Sale (POS)', 'Recent Transaction History', 'Invoice Reprinting']
  },
  salesperson: {
    title: 'Sales Associate',
    caps: ['Point of Sale (POS)', 'Customer Relations Directory']
  },
  inventory_staff: {
    title: 'Inventory Specialist',
    caps: ['Inventory Catalog Listing', 'Stock Level Adjustment']
  },
  admin: {
    title: 'Platform Super Admin',
    caps: ['Full Global System Control']
  },
  SUPER_ADMIN: {
    title: 'Platform Super Admin',
    caps: ['Full Global System Control']
  },
  principal: {
    title: 'School Principal',
    caps: ['Full School Oversight', 'Student Admissions', 'Staff & Faculty Management', 'Fee & Invoice Tracking', 'Academics & Reports']
  },
  administrator: {
    title: 'School Administrator',
    caps: ['Admissions & Records', 'Class Schedules', 'Fee Collection', 'Attendance Audits', 'SMS Broadcasts']
  },
  accountant: {
    title: 'School Bursar / Accountant',
    caps: ['Fee Invoicing', 'Payment Processing', 'Salaries & Payroll', 'Expense Auditing', 'Financial Statements']
  },
  teacher: {
    title: 'Teacher / Faculty',
    caps: ['Class Attendance', 'Grading & Report Cards', 'Timetable Viewer', 'Class Announcements']
  },
  parent: {
    title: 'Parent / Guardian',
    caps: ['Student Profile', 'Fee Statements & Pay', 'Attendance History', 'Academic Reports Cards', 'School Notices']
  },
  student: {
    title: 'Enrolled Student',
    caps: ['Class Schedule', 'My Attendance', 'Grades & Results', 'School Notices']
  }
};

export function Employees({ business, currentUser }: EmployeesProps) {
  const [trigger, setTrigger] = useState(0);
  const forceUpdate = () => setTrigger(prev => prev + 1);

  const branches = db.getBranches(business.id);

  // Forms
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editRoleValue, setEditRoleValue] = useState<UserRole>('cashier');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);

  React.useEffect(() => {
    setIsEditingRole(false);
    if (selectedStaff) {
      setEditRoleValue(selectedStaff.role);
      setEditBranchIds(selectedStaff.branchIds || (selectedStaff.branchId ? [selectedStaff.branchId] : []));
    }
  }, [selectedStaff?.id]);

  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('cashier');

  const employees = db.getUsers().filter(u => u.businessId === business.id);
  const logs = db.getLogs(business.id);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffPassword) {
      alert('Please fill out all employee account fields.');
      return;
    }

    // Check email uniqueness
    const allUsers = db.getUsers();
    if (allUsers.some(u => u.email.toLowerCase() === staffEmail.toLowerCase())) {
      alert('This email address is already registered on BusinessOS.');
      return;
    }

    const newEmp: User = {
      id: 'u-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: staffName,
      email: staffEmail,
      role: staffRole,
      status: 'active',
      password: staffPassword,
      createdAt: new Date().toISOString(),
      branchId: selectedBranchIds[0] || '',
      branchIds: selectedBranchIds
    };

    db.saveUser(newEmp);
    alert(`Employee profile "${staffName}" created successfully.`);

    // Audit log
    db.addActivityLog(business.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'Staff Onboarded',
      details: `Created new employee profile "${staffName}" assigned to role: ${staffRole} with branch access.`
    });

    setIsCreating(false);
    setStaffName('');
    setStaffEmail('');
    setStaffPassword('');
    setSelectedBranchIds([]);
    forceUpdate();
  };

  const handleToggleStatus = (emp: User) => {
    if (emp.id === currentUser.id) {
      alert('Authorization block: You cannot disable your own active login profile.');
      return;
    }

    const nextStatus = emp.status === 'active' ? 'disabled' : 'active';
    db.saveUser({ ...emp, status: nextStatus });
    alert(`Employee profile status updated successfully to ${nextStatus}.`);

    db.addActivityLog(business.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'Staff Status Altered',
      details: `Changed account status of ${emp.name} to ${nextStatus}.`
    });

    forceUpdate();
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (id === currentUser.id) {
      alert('Authorization block: Self-deletion is disabled.');
      return;
    }

    if (confirm("Are you sure you want to delete this employee?")) {
      db.deleteUser(id);
      alert('Employee profile deleted successfully.');
      db.addActivityLog(business.id, {
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'Staff Removed',
        details: `Deleted employee record for "${name}".`
      });
      if (selectedStaff?.id === id) {
        setSelectedStaff(null);
      }
      forceUpdate();
    }
  };

  // Authorization level Check
  const canModifyStaff = currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'SUPER_ADMIN';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[calc(100vh-12rem)] font-sans">
      {/* Left Roster list */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0">
        <header className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-slate-800">
            <Users className="h-5 w-5 text-emerald-800" />
            <h3 className="font-bold text-sm">Isolated Employee Roster</h3>
          </div>

          {canModifyStaff && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Employee Account
            </button>
          )}
        </header>

        {/* Scrollable grid Roster */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {employees.map(emp => {
              const pInfo = ROLE_PERMISSIONS[emp.role] || { title: 'Unknown Role', caps: [] };
              const isSelf = emp.id === currentUser.id;
              return (
                <div 
                  key={emp.id} 
                  onClick={() => setSelectedStaff(emp)}
                  className={`p-4 rounded-3xl border transition text-xs flex flex-col justify-between hover:shadow-md cursor-pointer ${
                    selectedStaff?.id === emp.id 
                      ? 'border-[#064E3B] bg-emerald-50/20' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs uppercase select-none">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-1">
                            {emp.name} {isSelf && <span className="text-[9px] px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full font-bold uppercase">You</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">{emp.email}</p>
                        </div>
                      </div>
                      
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] rounded-full font-bold uppercase">
                        {emp.role}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Joined: {new Date(emp.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-1.5 text-[10px] text-slate-500 font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider">Assigned Branches:</span>
                      <div className="text-slate-700 font-semibold mt-0.5">
                        {(() => {
                          const assignedIds = emp.branchIds && emp.branchIds.length > 0 
                            ? emp.branchIds 
                            : (emp.branchId ? [emp.branchId] : []);
                          if (assignedIds.length === 0) {
                            return <span className="text-rose-500 text-[9px] uppercase font-bold">Unassigned (Full Access)</span>;
                          }
                          const assignedNames = assignedIds.map(id => branches.find(b => b.id === id)?.name || id);
                          return <span>{assignedNames.join(', ')}</span>;
                        })()}
                      </div>
                    </div>
                  </div>

                  {canModifyStaff && !isSelf && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(emp); }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition ${
                          emp.status === 'active' 
                            ? 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100' 
                            : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {emp.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteStaff(emp.id, emp.name); }}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column Details Pane */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0">
        {selectedStaff ? (
          /* Staff Permission / Logs Review */
          <div className="flex-1 flex flex-col min-h-0">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-sm text-slate-800 leading-none">{selectedStaff.name}</h4>
                  <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 inline-block">Authorized Permissions Profile</span>
                </div>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Permissions list */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Workspace Access Level</h5>
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/60 space-y-2">
                  <p className="font-bold text-indigo-700 uppercase">{selectedStaff.role} permissions matrix</p>
                  <ul className="space-y-1.5 mt-2">
                    {(ROLE_PERMISSIONS[selectedStaff.role]?.caps || []).map((cap, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-slate-600 font-semibold">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {cap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Role Management for Owner / Admin */}
              {canModifyStaff && selectedStaff.id !== currentUser.id && (
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Role & Branch Management</h5>
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/60 space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Current Role</p>
                      <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] rounded-full font-bold uppercase inline-block">
                        {selectedStaff.role}
                      </span>
                    </div>

                    {!isEditingRole && (
                      <div className="mt-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Assigned Branches</p>
                        {(() => {
                          const assignedIds = selectedStaff.branchIds && selectedStaff.branchIds.length > 0 
                            ? selectedStaff.branchIds 
                            : (selectedStaff.branchId ? [selectedStaff.branchId] : []);
                          if (assignedIds.length === 0) {
                            return <span className="text-rose-500 font-bold text-[10px] uppercase">Unassigned (Full Access)</span>;
                          }
                          const assignedNames = assignedIds.map(id => branches.find(b => b.id === id)?.name || id);
                          return <span className="font-bold text-slate-700 text-[11px]">{assignedNames.join(', ')}</span>;
                        })()}
                      </div>
                    )}

                    {isEditingRole ? (
                      <div className="space-y-2">
                        <label className="block text-[10px] text-slate-400 uppercase font-bold">Select New Role</label>
                        <select
                          value={editRoleValue}
                          onChange={(e) => {
                            setEditRoleValue(e.target.value as UserRole);
                            setEditBranchIds([]); // reset on role change
                          }}
                          className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="manager">Operational Manager</option>
                          <option value="cashier">Cashier Clerk</option>
                          <option value="salesperson">Sales Associate</option>
                          <option value="inventory_staff">Inventory Specialist</option>
                        </select>

                        <div className="mt-2.5">
                          <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Edit Branch Assignment</label>
                          {branches.length === 0 ? (
                            <p className="text-slate-400 text-[10px]">No branches defined.</p>
                          ) : ['owner', 'manager'].includes(editRoleValue) ? (
                            <div className="space-y-1 max-h-[100px] overflow-y-auto p-2 border border-slate-200 rounded-xl bg-white">
                              {branches.map(b => (
                                <label key={b.id} className="flex items-center gap-1.5 cursor-pointer select-none text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={editBranchIds.includes(b.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditBranchIds([...editBranchIds, b.id]);
                                      } else {
                                        setEditBranchIds(editBranchIds.filter(id => id !== b.id));
                                      }
                                    }}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3 w-3"
                                  />
                                  <span className="text-slate-700 font-semibold">{b.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <select
                              value={editBranchIds[0] || ''}
                              onChange={(e) => setEditBranchIds(e.target.value ? [e.target.value] : [])}
                              className="block w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl text-slate-800 text-[10px] font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">Select branch assignment...</option>
                              {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const originalBranches = selectedStaff.branchIds || (selectedStaff.branchId ? [selectedStaff.branchId] : []);
                              const branchesChanged = JSON.stringify(editBranchIds.sort()) !== JSON.stringify(originalBranches.sort());
                              if (editRoleValue === selectedStaff.role && !branchesChanged) {
                                alert("No changes were made to role or branch assignments.");
                                return;
                              }
                              if (confirm("Are you sure you want to save employee profile updates?")) {
                                const updatedUser: User = { 
                                  ...selectedStaff, 
                                  role: editRoleValue,
                                  branchId: editBranchIds[0] || '',
                                  branchIds: editBranchIds
                                };
                                db.saveUser(updatedUser);

                                db.addActivityLog(business.id, {
                                  userId: currentUser.id,
                                  userName: currentUser.name,
                                  action: 'Staff Record Altered',
                                  details: `Updated role and branch assignments of employee "${selectedStaff.name}".`
                                });

                                setSelectedStaff(updatedUser);
                                setIsEditingRole(false);
                                forceUpdate();
                              }
                            }}
                            className="flex-1 py-1.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-[10px] font-bold cursor-pointer transition-colors text-center"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingRole(false)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditRoleValue(selectedStaff.role);
                          setEditBranchIds(selectedStaff.branchIds || (selectedStaff.branchId ? [selectedStaff.branchId] : []));
                          setIsEditingRole(true);
                        }}
                        className="w-full py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Shield className="h-3 w-3" /> Edit Employee Role / Branches
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Individual activities */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Session Activity Audits</h5>
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {logs.filter(l => l.userId === selectedStaff.id).map(log => (
                    <div key={log.id} className="p-2.5 bg-[#F8FAFC] border border-slate-200/60 rounded-xl space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>{log.action}</span>
                        <span className="text-slate-400 font-mono text-[9px]">{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-500 text-[10px] leading-normal">{log.details}</p>
                    </div>
                  ))}

                  {logs.filter(l => l.userId === selectedStaff.id).length === 0 && (
                    <p className="text-center py-6 text-slate-400">No session telemetry recorded for this staff profile.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isCreating && canModifyStaff ? (
          /* Add Staff Form */
          <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h4 className="font-bold text-sm text-slate-800">Add Employee Profile</h4>
              <button type="button" onClick={() => setIsCreating(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Staff Member Name</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Mike Peterson"
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Email / Login Username</label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="mike@business.os"
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Access Role & Permission Level</label>
                <select
                  value={staffRole}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setStaffRole(newRole);
                    setSelectedBranchIds([]); // reset selection on role change
                  }}
                  className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs cursor-pointer"
                >
                  <option value="manager">Operational Manager (Full Reports & Catalog)</option>
                  <option value="cashier">Cashier Clerk (POS Checkout Only)</option>
                  <option value="salesperson">Sales Associate (POS & Customer Tabs)</option>
                  <option value="inventory_staff">Inventory Staff (Catalog & Stock Adjustment)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Branch Assignment</label>
                {branches.length === 0 ? (
                  <p className="text-slate-400 text-[10px]">No branches defined. Please create a branch in the Branches tab first.</p>
                ) : ['owner', 'manager'].includes(staffRole) ? (
                  <div className="space-y-2 max-h-[120px] overflow-y-auto p-2.5 border border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-[10px] text-slate-400 mb-1">Select one or multiple branches for this Operational Manager:</p>
                    {branches.map(b => (
                      <label key={b.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedBranchIds.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBranchIds([...selectedBranchIds, b.id]);
                            } else {
                              setSelectedBranchIds(selectedBranchIds.filter(id => id !== b.id));
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <span className="text-slate-700 font-medium">{b.name} ({b.location})</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <select
                    value={selectedBranchIds[0] || ''}
                    onChange={(e) => setSelectedBranchIds(e.target.value ? [e.target.value] : [])}
                    className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs cursor-pointer"
                  >
                    <option value="">Select branch assignment...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Onboard Employee
              </button>
            </div>
          </form>
        ) : (
          /* Empty default state */
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-slate-400 space-y-2 select-none">
            <Users className="h-12 w-12 text-slate-200 animate-pulse" />
            <h4 className="font-bold text-xs text-slate-700">No profile selected</h4>
            <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
              Choose an employee from the workspace roster card list to verify their role, authorize permissions, or review audit history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
