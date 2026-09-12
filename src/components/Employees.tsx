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

// Map roles to descriptive permission capabilities and default tab access
export const ROLE_PERMISSIONS: Record<string, { title: string; caps: string[]; defaultPermissions: string[] }> = {
  pos_inventory_staff: {
    title: 'POS & Inventory Staff',
    caps: ['Point of Sale (POS)', 'Products & Services Catalog', 'Inventory & Stock Level Tracking', 'Sales History & Receipts'],
    defaultPermissions: ['POS', 'Products', 'Inventory', 'Sales']
  },
  cashier: {
    title: 'Cashier Clerk',
    caps: ['Point of Sale (POS)', 'Recent Transaction History', 'Invoice Reprinting'],
    defaultPermissions: ['POS', 'Sales', 'Returns']
  },
  salesperson: {
    title: 'Sales Associate',
    caps: ['Point of Sale (POS)', 'Customer Relations Directory'],
    defaultPermissions: ['POS', 'Sales', 'Customers']
  },
  inventory_staff: {
    title: 'Inventory Specialist',
    caps: ['Inventory Catalog Listing', 'Stock Level Adjustment'],
    defaultPermissions: ['Products', 'Inventory', 'Returns']
  },
  manager: {
    title: 'Operational Manager',
    caps: ['Point of Sale (POS)', 'Inventory & Stock Refilling', 'Customer Relations Directory', 'General Reports'],
    defaultPermissions: ['Dashboard', 'POS', 'Products', 'Inventory', 'Sales', 'Accounts Receivable', 'Expenses', 'Customers', 'Reports', 'Branches', 'Returns']
  },
  owner: {
    title: 'Owner / Administrator',
    caps: ['Point of Sale (POS)', 'Inventory & Stock Refilling', 'Advanced Business Reports', 'Employee Roster Directory', 'Custom Receipts & Portals'],
    defaultPermissions: ['Dashboard', 'POS', 'Products', 'Inventory', 'Sales', 'Customers', 'Accounts Receivable', 'Expenses', 'Reports', 'Branches', 'Returns', 'Employees', 'Settings']
  },
  admin: {
    title: 'Platform Super Admin',
    caps: ['Full Global System Control'],
    defaultPermissions: ['Dashboard', 'POS', 'Products', 'Inventory', 'Sales', 'Customers', 'Accounts Receivable', 'Expenses', 'Reports', 'Branches', 'Returns', 'Employees', 'Settings']
  },
  SUPER_ADMIN: {
    title: 'Platform Super Admin',
    caps: ['Full Global System Control'],
    defaultPermissions: ['Dashboard', 'POS', 'Products', 'Inventory', 'Sales', 'Customers', 'Accounts Receivable', 'Expenses', 'Reports', 'Branches', 'Returns', 'Employees', 'Settings']
  },
  principal: {
    title: 'School Principal',
    caps: ['Full School Oversight', 'Student Admissions', 'Staff & Faculty Management', 'Fee & Invoice Tracking', 'Academics & Reports'],
    defaultPermissions: ['Dashboard', 'Employees', 'Reports', 'Settings']
  },
  administrator: {
    title: 'School Administrator',
    caps: ['Admissions & Records', 'Class Schedules', 'Fee Collection', 'Attendance Audits', 'SMS Broadcasts'],
    defaultPermissions: ['Dashboard', 'Employees', 'Reports']
  },
  accountant: {
    title: 'School Bursar / Accountant',
    caps: ['Fee Invoicing', 'Payment Processing', 'Salaries & Payroll', 'Expense Auditing', 'Financial Statements'],
    defaultPermissions: ['Dashboard', 'Expenses', 'Reports']
  },
  teacher: {
    title: 'Teacher / Faculty',
    caps: ['Class Attendance', 'Grading & Report Cards', 'Timetable Viewer', 'Class Announcements'],
    defaultPermissions: ['Dashboard']
  },
  parent: {
    title: 'Parent / Guardian',
    caps: ['Student Profile', 'Fee Statements & Pay', 'Attendance History', 'Academic Reports Cards', 'School Notices'],
    defaultPermissions: ['Dashboard']
  },
  student: {
    title: 'Enrolled Student',
    caps: ['Class Schedule', 'My Attendance', 'Grades & Results', 'School Notices'],
    defaultPermissions: ['Dashboard']
  }
};

export interface PermissionModuleItem {
  id: string;
  name: string;
  description: string;
  category: 'Core Operations' | 'Catalog & Inventory' | 'Back Office & Management';
}

export const AVAILABLE_PERMISSIONS: PermissionModuleItem[] = [
  { id: 'POS', name: 'POS', description: 'Point of Sale register, item scanning, checkout & receipts', category: 'Core Operations' },
  { id: 'Products', name: 'Products', description: 'Product and service catalog, pricing, variants & SKU management', category: 'Catalog & Inventory' },
  { id: 'Inventory', name: 'Inventory', description: 'Stock quantity audits, stock adjustments & low-stock warnings', category: 'Catalog & Inventory' },
  { id: 'Sales', name: 'Sales', description: 'Sales order history, customer invoices, reprinting & dispatch', category: 'Core Operations' },
  { id: 'Dashboard', name: 'Dashboard', description: 'Business overview, KPIs, real-time charts & summaries', category: 'Back Office & Management' },
  { id: 'Customers', name: 'Customers', description: 'Customer directory, client contact cards & purchase histories', category: 'Core Operations' },
  { id: 'Accounts Receivable', name: 'Accounts Receivable', description: 'Customer credit ledgers, debt aging & payment tracking', category: 'Catalog & Inventory' },
  { id: 'Expenses', name: 'Expenses', description: 'Business expenses, operational costs & supplier invoices', category: 'Catalog & Inventory' },
  { id: 'Reports', name: 'Reports', description: 'Sales reports, profit & loss, tax statements & analytics', category: 'Back Office & Management' },
  { id: 'Branches', name: 'Branches', description: 'Branch outlets, physical registers & branch inventory', category: 'Back Office & Management' },
  { id: 'Returns', name: 'Returns', description: 'Customer returns, product refunds & restocking', category: 'Core Operations' },
  { id: 'Employees', name: 'Employees', description: 'Team directory, employee roles & permission assignments', category: 'Back Office & Management' },
  { id: 'Settings', name: 'Settings', description: 'Store setup, currency, receipt printer & business profiles', category: 'Back Office & Management' },
];

export function Employees({ business, currentUser }: EmployeesProps) {
  const [trigger, setTrigger] = useState(0);
  const forceUpdate = () => setTrigger(prev => prev + 1);

  const branches = db.getBranches(business.id);

  // Forms & Edit State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<string>('pos_inventory_staff');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setSaveSuccessMessage(null);
    if (selectedStaff) {
      setEditRoleValue(selectedStaff.role);
      const initialPerms = selectedStaff.permissions && selectedStaff.permissions.length > 0
        ? [...selectedStaff.permissions]
        : (ROLE_PERMISSIONS[selectedStaff.role]?.defaultPermissions || ['POS', 'Products', 'Inventory', 'Sales']);
      setEditPermissions(initialPerms);
      setEditBranchIds(selectedStaff.branchIds || (selectedStaff.branchId ? [selectedStaff.branchId] : []));
    }
  }, [selectedStaff?.id]);

  const handleRoleSelectChange = (newRole: string) => {
    setEditRoleValue(newRole);
    const defaults = ROLE_PERMISSIONS[newRole]?.defaultPermissions || ['POS', 'Products', 'Inventory', 'Sales'];
    setEditPermissions([...defaults]);
  };

  const handleTogglePermission = (permId: string) => {
    setEditPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const handleSelectAllPermissions = () => {
    setEditPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
  };

  const handleClearAllPermissions = () => {
    setEditPermissions([]);
  };

  const handleResetToRoleDefaults = () => {
    const defaults = ROLE_PERMISSIONS[editRoleValue]?.defaultPermissions || ['POS', 'Products', 'Inventory', 'Sales'];
    setEditPermissions([...defaults]);
  };

  const handleSavePermissions = () => {
    if (!selectedStaff) return;

    const updatedUser: User = {
      ...selectedStaff,
      role: editRoleValue as UserRole,
      permissions: [...new Set(editPermissions)],
      branchId: editBranchIds[0] || '',
      branchIds: editBranchIds,
      updatedAt: new Date().toISOString()
    };

    db.saveUser(updatedUser);

    db.addActivityLog(business.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'Staff Role & Permissions Updated',
      details: `Saved role "${ROLE_PERMISSIONS[editRoleValue]?.title || editRoleValue}" and permissions [${editPermissions.join(', ')}] for employee "${selectedStaff.name}".`
    });

    setSelectedStaff(updatedUser);
    setSaveSuccessMessage("Employee role and permissions saved successfully.");
    forceUpdate();
  };

  const handleCancelChanges = () => {
    if (!selectedStaff) return;
    setEditRoleValue(selectedStaff.role);
    const initialPerms = selectedStaff.permissions && selectedStaff.permissions.length > 0
      ? [...selectedStaff.permissions]
      : (ROLE_PERMISSIONS[selectedStaff.role]?.defaultPermissions || ['POS', 'Products', 'Inventory', 'Sales']);
    setEditPermissions(initialPerms);
    setEditBranchIds(selectedStaff.branchIds || (selectedStaff.branchId ? [selectedStaff.branchId] : []));
    setSaveSuccessMessage(null);
  };

  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('pos_inventory_staff');

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

    const initialPermissions = ROLE_PERMISSIONS[staffRole]?.defaultPermissions || ['POS', 'Products', 'Inventory', 'Sales'];

    const newEmp: User = {
      id: 'u-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: staffName,
      email: staffEmail,
      role: staffRole,
      permissions: initialPermissions,
      status: 'active',
      password: staffPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      details: `Created new employee profile "${staffName}" assigned to role: ${ROLE_PERMISSIONS[staffRole]?.title || staffRole} with permissions [${initialPermissions.join(', ')}].`
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
              const pInfo = ROLE_PERMISSIONS[emp.role] || { title: 'Unknown Role', caps: [], defaultPermissions: [] };
              const defaultPerms = ROLE_PERMISSIONS[emp.role]?.defaultPermissions || [];
              const effectivePerms = (emp.permissions && emp.permissions.length > 0) ? emp.permissions : defaultPerms;
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
                      <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-[#064E3B] text-[10px] rounded-full font-bold">
                        {pInfo.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Joined: {new Date(emp.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1">
                      {effectivePerms.slice(0, 5).map(perm => (
                        <span key={perm} className="text-[8px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {perm}
                        </span>
                      ))}
                      {effectivePerms.length > 5 && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded">
                          +{effectivePerms.length - 5} more
                        </span>
                      )}
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
              {/* Success Notification */}
              {saveSuccessMessage && (
                <div id="save-success-banner" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                  <button type="button" onClick={() => setSaveSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100">
                    ✕
                  </button>
                </div>
              )}

              {/* Current Status Overview */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Current Role</span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-[#064E3B] text-[10px] rounded-full font-extrabold uppercase">
                    {ROLE_PERMISSIONS[selectedStaff.role]?.title || selectedStaff.role}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Account Status</span>
                  <span className={`font-bold capitalize ${selectedStaff.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ● {selectedStaff.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">Assigned Branches</span>
                  <span className="font-semibold text-slate-700">
                    {(() => {
                      const assignedIds = selectedStaff.branchIds && selectedStaff.branchIds.length > 0 
                        ? selectedStaff.branchIds 
                        : (selectedStaff.branchId ? [selectedStaff.branchId] : []);
                      if (assignedIds.length === 0) return 'All Branches (Full Access)';
                      return assignedIds.map(id => branches.find(b => b.id === id)?.name || id).join(', ');
                    })()}
                  </span>
                </div>
              </div>

              {/* Permission & Role Editor for Admin / Owner */}
              {canModifyStaff && selectedStaff.id !== currentUser.id ? (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs">Role & Module Permissions</h5>
                      <p className="text-[10px] text-slate-400">Configure what modules and operational tools this employee can access</p>
                    </div>
                  </div>

                  {/* Predefined Role Selector */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-extrabold mb-1 tracking-wider">
                        Predefined Role
                      </label>
                      <select
                        id="employee-role-selector"
                        value={editRoleValue}
                        onChange={(e) => handleRoleSelectChange(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-bold cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="pos_inventory_staff">POS & Inventory Staff (Access: POS, Products, Inventory, Sales)</option>
                        <option value="cashier">Cashier Clerk (Access: POS, Sales, Returns)</option>
                        <option value="salesperson">Sales Associate (Access: POS, Sales, Customers)</option>
                        <option value="inventory_staff">Inventory Specialist (Access: Products, Inventory, Returns)</option>
                        <option value="manager">Operational Manager (Full Reports & Catalog)</option>
                        <option value="owner">Owner / Administrator (Full System Access)</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Changing predefined role sets default permissions. You can customize individual checkboxes below.
                      </p>
                    </div>

                    {/* Module Permissions Checklist */}
                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">
                            Authorized Modules
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[#064E3B]">
                            {editPermissions.length} granted
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSelectAllPermissions}
                            className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAllPermissions}
                            className="text-[10px] font-bold text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded bg-slate-100 hover:bg-rose-50 transition cursor-pointer"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={handleResetToRoleDefaults}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
                          >
                            Defaults
                          </button>
                        </div>
                      </div>

                      {/* Permissions List */}
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                        {AVAILABLE_PERMISSIONS.map(perm => {
                          const isChecked = editPermissions.includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              id={`perm-option-${perm.id.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={() => handleTogglePermission(perm.id)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                                isChecked
                                  ? 'border-emerald-300 bg-emerald-50/60 shadow-xs'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                id={`checkbox-${perm.id}`}
                                checked={isChecked}
                                onChange={() => {}} // handled by parent div
                                className="mt-0.5 rounded border-slate-300 text-[#064E3B] focus:ring-emerald-500 h-3.5 w-3.5 shrink-0 pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className={`font-bold text-xs ${isChecked ? 'text-[#064E3B]' : 'text-slate-700'}`}>
                                    {perm.name}
                                  </span>
                                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                                    {perm.category}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                  {perm.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Branch Assignment */}
                    {branches.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 space-y-1.5">
                        <label className="block text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">
                          Branch Assignment
                        </label>
                        {['owner', 'manager'].includes(editRoleValue) ? (
                          <div className="space-y-1 max-h-[100px] overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
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
                            className="block w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">All Branches / Unrestricted</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        id="save-employee-permissions-btn"
                        type="button"
                        onClick={handleSavePermissions}
                        className="flex-1 py-2.5 px-4 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Check className="h-4 w-4 text-emerald-300" />
                        <span>Save Role & Permissions</span>
                      </button>
                      <button
                        id="cancel-employee-permissions-btn"
                        type="button"
                        onClick={handleCancelChanges}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedStaff.id === currentUser.id ? (
                <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-2">
                  <p className="font-bold text-[#064E3B] text-xs flex items-center gap-1.5">
                    <Shield className="h-4 w-4" /> Logged-in Administrator Account
                  </p>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    This account holds master administrative credentials with full privileges across all workspaces and business modules.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {AVAILABLE_PERMISSIONS.map(p => (
                      <span key={p.id} className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-[#064E3B]">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Assigned Permissions</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {((selectedStaff.permissions && selectedStaff.permissions.length > 0) 
                      ? selectedStaff.permissions 
                      : (ROLE_PERMISSIONS[selectedStaff.role]?.defaultPermissions || [])
                    ).map(perm => (
                      <span key={perm} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                        {perm}
                      </span>
                    ))}
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
                  <option value="pos_inventory_staff">POS & Inventory Staff (Access: POS, Products, Inventory, Sales)</option>
                  <option value="cashier">Cashier Clerk (Access: POS, Sales, Returns)</option>
                  <option value="salesperson">Sales Associate (Access: POS, Sales, Customers)</option>
                  <option value="inventory_staff">Inventory Specialist (Access: Products, Inventory, Returns)</option>
                  <option value="manager">Operational Manager (Full Reports & Catalog)</option>
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
