/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { User, Business, PaystackSettings, GlobalSystemConfig, REQUIRED_BUSINESS_TYPES } from '../types';
import { 
  Building, Users, Shield, CheckCircle2, AlertTriangle, Trash2, 
  Search, Plus, X, Edit, RotateCcw, Activity, LogOut, Lock, Eye,
  Sliders, CreditCard, Key, Globe, Database, Upload, Download, RefreshCw,
  Settings, Check, Zap, Server, FileText, Bell
} from 'lucide-react';
import { hashPassword } from './AuthPortal';
import { AdminFeatureChangeLog } from '../types';
import { ImageUploadInput } from './ImageUploadInput';
import { AdminNotifications } from './AdminNotifications';

interface SuperAdminProps {
  onLogout: () => void;
  onManageBusiness?: (business: Business) => void;
}

export function SuperAdmin({ onLogout, onManageBusiness }: SuperAdminProps) {
  const [activeTab, setActiveTab] = useState<
    'businesses' | 'paynow' | 'users' | 'notifications' | 'registration' | 'system' | 'cloud' | 'monitoring' | 'features'
  >('businesses');

  const [searchTerm, setSearchTerm] = useState('');
  
  // Reload trigger
  const [trigger, setTrigger] = useState(0);
  const forceUpdate = () => setTrigger(prev => prev + 1);

  // Real-time listener for cloud database updates
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      forceUpdate();
    });
    return () => unsubscribe();
  }, []);

  // --- Paystack Settings State ---
  const [payNowState, setPayNowState] = useState<PaystackSettings>(() => db.getPaystackSettings());
  const [showPayNowSecret, setShowPayNowSecret] = useState(false);
  const [payNowTesting, setPayNowTesting] = useState(false);
  const [payNowTestResult, setPayNowTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // --- Global System Config State ---
  const [sysConfigState, setSysConfigState] = useState<GlobalSystemConfig>(() => db.getGlobalSystemConfig());

  // --- Modals / Selection states ---
  const [viewingBusiness, setViewingBusiness] = useState<Business | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [registeringBusiness, setRegisteringBusiness] = useState(false);
  const [creatingUser, setCreatingUser] = useState<boolean>(false);
  const [resettingUserPass, setResettingUserPass] = useState<User | null>(null);
  const [resettingOwnerPass, setResettingOwnerPass] = useState<Business | null>(null);
  const [reminderBusiness, setReminderBusiness] = useState<Business | null>(null);

  // --- Business Permanent Deletion Modal State ---
  const [deletingBusinessTarget, setDeletingBusinessTarget] = useState<Business | null>(null);
  const [isDeletingInProgress, setIsDeletingInProgress] = useState<boolean>(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  // --- User Filter States ---
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userBusFilter, setUserBusFilter] = useState<string>('all');

  // --- Form States for Business Editing / Creating ---
  const [busName, setBusName] = useState('');
  const [busOwner, setBusOwner] = useState('');
  const [busEmail, setBusEmail] = useState('');
  const [busPhone, setBusPhone] = useState('');
  const [busCategory, setBusCategory] = useState('');
  const [busSubStatus, setBusSubStatus] = useState<'trial' | 'active' | 'suspended' | 'expired'>('trial');
  const [busTrialDays, setBusTrialDays] = useState('30');
  const [busStockTransferEnabled, setBusStockTransferEnabled] = useState(false);
  const [busCurrency, setBusCurrency] = useState('GHC');
  const [busSubscriptionAmount, setBusSubscriptionAmount] = useState('299');
  const [regBusPassword, setRegBusPassword] = useState('123456');

  // --- Form States for User Creation / Password Reset ---
  const [newUserBusId, setNewUserBusId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'owner' | 'manager' | 'cashier' | 'salesperson' | 'inventory_staff'>('manager');

  const [newPassVal, setNewPassVal] = useState('');
  const [newOwnerPassVal, setNewOwnerPassVal] = useState('');

  // Fetch current data
  const businesses = db.getBusinesses();
  const users = db.getUsers().filter(u => u.role !== 'admin'); // Hide admin from employee list
  const logs = db.getAllLogs().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Platform Metrics
  const totalBusinesses = businesses.length;
  const totalUsers = users.length + 1; // plus super admin
  const activeBusinesses = businesses.filter(b => b.status === 'active').length;

  // --- PAYSTACK HANDLERS ---
  const handleSavePayNowSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePublicKey = String(payNowState.publicKey || payNowState.apiKey || '').trim();
    const effectiveSecretKey = String(payNowState.secretKey || '').trim();
    const updated: PaystackSettings = {
      ...payNowState,
      apiKey: effectivePublicKey,
      publicKey: effectivePublicKey,
      secretKey: effectiveSecretKey,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin@business.os'
    };
    db.savePaystackSettings(updated);
    setPayNowState(updated);

    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'bos_paystack_settings', data: [updated] })
      });
    } catch (err) {
      console.error('Failed to sync API Key settings to server DB:', err);
    }

    db.addActivityLog('system', {
      userId: 'system',
      userName: 'Super Admin',
      action: 'Paystack API Keys Updated',
      details: `Updated API Key settings. Public Key: ${effectivePublicKey ? 'Configured' : 'Missing'}, Secret Key: ${effectiveSecretKey ? 'Configured' : 'Missing'}.`
    });
    alert('API Key Settings updated successfully.');
    forceUpdate();
  };

  const handleDeletePayNowSettings = async () => {
    if (!window.confirm('Are you sure you want to delete both Public and Secret API Keys? Payment processing will be disabled until new keys are configured.')) {
      return;
    }
    const cleared: PaystackSettings = {
      apiKey: '',
      publicKey: '',
      secretKey: '',
      merchantId: 'MCH-883920-BOS',
      apiEndpoint: '/api/payment',
      callbackUrl: '/api/payment/callback',
      webhookUrl: '/api/payment/webhook',
      verificationEndpoint: '/api/payment/verify',
      environment: 'production',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin@business.os'
    };
    db.deletePaystackSettings();
    setPayNowState(cleared);

    try {
      await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'bos_paystack_settings', data: [cleared] })
      });
    } catch (err) {
      console.error('Failed to sync cleared API Key settings to server DB:', err);
    }

    db.addActivityLog('system', {
      userId: 'system',
      userName: 'Super Admin',
      action: 'PayNow API Keys Deleted',
      details: 'Super Admin permanently deleted both Public and Secret API Keys.'
    });
    alert('API Keys deleted successfully.');
    forceUpdate();
  };

  const handleTestPayNowConnection = async () => {
    setPayNowTesting(true);
    setPayNowTestResult(null);
    try {
      const res = await fetch('/api/payment/config');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.configured && data.publicKey) {
        setPayNowTestResult({
          success: true,
          message: `Connection successful! Public Key (${data.publicKey.substring(0, 10)}...) and Secret Key are active on backend server.`
        });
      } else {
        setPayNowTestResult({
          success: false,
          message: data.error || 'Payment gateway has not been configured. Please contact the system administrator.'
        });
      }
    } catch (err: any) {
      setPayNowTestResult({
        success: false,
        message: 'Failed to contact backend payment service.'
      });
    } finally {
      setPayNowTesting(false);
    }
  };

  // --- GLOBAL SYSTEM CONFIG HANDLERS ---
  const handleSaveSystemConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: GlobalSystemConfig = {
      ...sysConfigState,
      updatedAt: new Date().toISOString()
    };
    db.saveGlobalSystemConfig(updated);
    setSysConfigState(updated);
    alert('Global System Configuration updated successfully.');
    forceUpdate();
  };

  // --- BUSINESS HANDLERS ---
  const handleOpenRegisterBusiness = () => {
    setBusName('');
    setBusOwner('');
    setBusEmail('');
    setBusPhone('');
    setBusCategory(sysConfigState.allowedBusinessTypes[0] || 'General Enterprise');
    setBusSubStatus('trial');
    setBusTrialDays('30');
    setBusStockTransferEnabled(false);
    setBusCurrency(sysConfigState.defaultCurrency || 'GHC');
    setRegBusPassword('123456');
    setRegisteringBusiness(true);
  };

  const handleRegisterBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busName || !busOwner || !busEmail || !busPhone) {
      alert('Please complete all mandatory business registration fields.');
      return;
    }

    const busId = 'bus-' + Math.random().toString(36).substring(2, 9);
    const now = new Date();
    const trialDaysNum = parseInt(busTrialDays, 10) || 30;
    const trialEnd = new Date(now);
    trialEnd.setDate(now.getDate() + trialDaysNum);

    const newBusiness: Business = {
      id: busId,
      name: busName,
      ownerName: busOwner,
      email: busEmail,
      phone: busPhone,
      category: busCategory,
      createdAt: now.toISOString(),
      registrationDate: now.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      subscriptionStatus: busSubStatus,
      subscriptionAmount: Number(busSubscriptionAmount) || sysConfigState.defaultSubscriptionAmount || 299,
      status: 'active',
      currency: busCurrency,
      isStockTransferEnabled: busStockTransferEnabled,
      receiptConfig: {
        businessName: busName,
        contactInfo: busPhone,
        footerMessage: 'Thank you for your patronage!',
        layout: 'standard'
      }
    };

    db.saveBusiness(newBusiness);

    // Register primary owner account
    const hashedPass = await hashPassword(regBusPassword || '123456');
    const ownerUser: User = {
      id: 'u-' + Math.random().toString(36).substring(2, 9),
      businessId: busId,
      name: busOwner,
      email: busEmail,
      role: 'owner',
      status: 'active',
      password: hashedPass,
      createdAt: now.toISOString()
    };
    db.saveUser(ownerUser);

    db.addActivityLog(busId, {
      userId: 'system',
      userName: 'Super Admin',
      action: 'Business Registered',
      details: `Registered new business tenant "${busName}" with owner ${busOwner}.`
    });

    alert(`Business "${busName}" registered successfully! Owner account created (${busEmail}).`);
    setRegisteringBusiness(false);
    forceUpdate();
  };

  const handleEditBusinessClick = (bus: Business) => {
    setEditingBusiness(bus);
    setBusName(bus.name);
    setBusOwner(bus.ownerName);
    setBusEmail(bus.email);
    setBusPhone(bus.phone);
    setBusCategory(bus.category);
    setBusSubStatus(bus.subscriptionStatus || 'trial');
    setBusStockTransferEnabled(!!bus.isStockTransferEnabled);
    setBusCurrency(bus.currency || 'GHC');
    setBusSubscriptionAmount(String(bus.subscriptionAmount || sysConfigState.defaultSubscriptionAmount || 299));
  };

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;

    const updated: Business = {
      ...editingBusiness,
      name: busName,
      ownerName: busOwner,
      email: busEmail,
      phone: busPhone,
      category: busCategory,
      subscriptionStatus: busSubStatus,
      currency: busCurrency,
      subscriptionAmount: Number(busSubscriptionAmount) || sysConfigState.defaultSubscriptionAmount || 299,
      isStockTransferEnabled: busStockTransferEnabled
    };

    db.saveBusiness(updated);
    alert(`Business "${busName}" updated successfully.`);
    setEditingBusiness(null);
    forceUpdate();
  };

  const handleToggleBusinessStatus = (id: string, currentStatus: 'active' | 'suspended') => {
    const bus = businesses.find(b => b.id === id);
    if (!bus) return;
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    db.saveBusiness({ ...bus, status: nextStatus });
    alert(`Business workspace status changed to ${nextStatus.toUpperCase()}.`);
    forceUpdate();
  };

  const handleDeleteBusiness = async (id: string) => {
    const bus = businesses.find(b => b.id === id);
    const busName = bus ? bus.name : id;

    const confirmDelete = window.confirm(
      "Are you sure you want to permanently delete this business?\n\nThis will remove all related business data and cannot be undone."
    );
    if (!confirmDelete) return;

    setIsDeletingInProgress(true);
    setDeleteErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/business/${id}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin': 'true'
        }
      });

      const result = await response.json();

      if (result.success) {
        db.purgeLocalBusinessData(id);
        alert("Business deleted permanently");
        setDeleteSuccessMessage(`Business "${busName}" deleted permanently.`);
        setTimeout(() => setDeleteSuccessMessage(null), 5000);
        forceUpdate();
      } else {
        throw new Error(result.error || result.message || "Failed to delete business");
      }
    } catch (err: any) {
      try {
        const currentUser = db.getCurrentUser() || { id: 'superadmin', email: 'admin@businessos.com', name: 'Super Admin' };
        await db.deleteBusinessPermanent(id, currentUser);
        alert("Business deleted permanently");
        setDeleteSuccessMessage(`Business "${busName}" deleted permanently.`);
        setTimeout(() => setDeleteSuccessMessage(null), 5000);
        forceUpdate();
      } catch (fallbackErr: any) {
        alert(`Error deleting business: ${fallbackErr.message || String(fallbackErr)}`);
        setDeleteErrorMessage(fallbackErr.message || String(fallbackErr));
      }
    } finally {
      setIsDeletingInProgress(false);
      setDeletingBusinessTarget(null);
    }
  };

  const executeDeleteBusiness = async () => {
    if (!deletingBusinessTarget) return;
    await handleDeleteBusiness(deletingBusinessTarget.id);
  };

  const handleResetOwnerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingOwnerPass || !newOwnerPassVal) return;
    const owner = db.getUsers().find(u => u.businessId === resettingOwnerPass.id && u.role === 'owner');
    if (!owner) {
      alert('No owner user account found for this business.');
      return;
    }
    const hashed = await hashPassword(newOwnerPassVal);
    db.saveUser({ ...owner, password: hashed });
    alert(`Password for owner ${owner.name} (${owner.email}) updated successfully.`);
    setResettingOwnerPass(null);
    setNewOwnerPassVal('');
    forceUpdate();
  };

  const handleConfirmReminder = () => {
    if (!reminderBusiness) return;
    const now = new Date();
    const expiryDateStr = reminderBusiness.nextPaymentDate || reminderBusiness.subscriptionCycleEndDate || reminderBusiness.trialEndDate;
    const isExpired = expiryDateStr ? (now > new Date(expiryDateStr)) : false;

    const reminderMessage = isExpired 
      ? "Your BusinessOS subscription payment has expired. Please renew to continue seamless access." 
      : "Your BusinessOS subscription payment will expire soon. Please make a renewal payment.";

    const notificationId = 'notif-manual-' + reminderBusiness.id + '-' + Date.now();
    db.saveNotification({
      notificationId,
      businessId: reminderBusiness.id,
      title: "Subscription Payment Reminder",
      message: reminderMessage,
      type: "subscription",
      createdAt: new Date().toISOString(),
      status: 'active',
      readStatus: 'unread',
      actionType: 'payment'
    });

    db.saveBusiness({
      ...reminderBusiness,
      paymentReminderStatus: 'sent'
    });

    alert(`Subscription payment reminder sent to "${reminderBusiness.name}".`);
    setReminderBusiness(null);
    forceUpdate();
  };

  // --- USER HANDLERS ---
  const handleToggleUserStatus = (id: string, currentStatus: 'active' | 'disabled') => {
    const targetUser = db.getUsers().find(u => u.id === id);
    if (!targetUser) return;
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    db.saveUser({ ...targetUser, status: nextStatus });
    alert(`User status changed to ${nextStatus.toUpperCase()}.`);
    forceUpdate();
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to remove this user profile?')) {
      db.deleteUser(id);
      alert('User deleted successfully.');
      forceUpdate();
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserBusId) {
      alert('Please fill out all user profile fields.');
      return;
    }

    const hashed = await hashPassword(newUserPassword);
    const newUser: User = {
      id: 'u-' + Math.random().toString(36).substring(2, 9),
      businessId: newUserBusId,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: 'active',
      password: hashed,
      createdAt: new Date().toISOString()
    };

    db.saveUser(newUser);
    alert(`User profile "${newUserName}" created successfully.`);
    setCreatingUser(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    forceUpdate();
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUserPass || !newPassVal) return;
    const hashed = await hashPassword(newPassVal);
    db.saveUser({
      ...resettingUserPass,
      password: hashed
    });
    setResettingUserPass(null);
    setNewPassVal('');
    alert('User password updated successfully.');
    forceUpdate();
  };

  // --- FEATURE GATE HANDLERS ---
  const handleToggleFeature = (featureId: string, isEnabled: boolean) => {
    const features = db.getGlobalFeatures();
    const featIdx = features.findIndex(f => f.id === featureId);
    if (featIdx >= 0) {
      const prevFeature = features[featIdx];
      const previousStatus = prevFeature.isEnabled;
      
      const updatedFeature = {
        ...prevFeature,
        isEnabled,
        lastChanged: new Date().toISOString(),
        changedBy: 'admin@business.os'
      };
      
      features[featIdx] = updatedFeature;
      db.saveGlobalFeatures(features);
      
      const newAuditLog: AdminFeatureChangeLog = {
        id: 'featlog-' + Math.random().toString(36).substring(2, 9),
        featureId,
        featureName: prevFeature.name,
        previousStatus,
        newStatus: isEnabled,
        changedBy: 'admin@business.os',
        timestamp: new Date().toISOString()
      };
      db.saveFeatureAuditLog(newAuditLog);
      alert(`Feature gate "${prevFeature.name}" updated successfully.`);
      forceUpdate();
    }
  };

  // --- BACKUP & RESTORE HANDLERS ---
  const handleExportDatabase = () => {
    const snapshot = db.getDatabaseSnapshot();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BOS_Global_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (confirm('CRITICAL WARNING: Restoring from backup will overwrite current database records with snapshot data. Continue?')) {
          db.restoreDatabaseSnapshot(parsed);
          alert('Database snapshot restored successfully!');
          forceUpdate();
        }
      } catch (err) {
        alert('Invalid JSON backup file uploaded.');
      }
    };
    reader.readAsText(file);
  };

  // Filters
  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesBus = userBusFilter === 'all' || u.businessId === userBusFilter;
    return matchesSearch && matchesRole && matchesBus;
  });

  return (
    <div id="superadmin-root" className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar navigation panel */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-900/30">
            S
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">SuperAdmin</h1>
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">BOS Global Control</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('businesses'); setSearchTerm(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'businesses' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Building className="h-4 w-4" /> Businesses
          </button>

          <button
            onClick={() => { setActiveTab('paynow'); setSearchTerm(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'paynow' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <CreditCard className="h-4 w-4 text-emerald-400" /> Paystack API Settings
          </button>

          <button
            onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'users' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Users className="h-4 w-4" /> Global User Directory
          </button>

          <button
            onClick={() => { setActiveTab('notifications'); setSearchTerm(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'notifications' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Bell className="h-4 w-4 text-amber-400" /> Push Notifications
          </button>

          <button
            onClick={() => { setActiveTab('registration'); setSearchTerm(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'registration' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Globe className="h-4 w-4" /> Registration Control
          </button>

          <button
            onClick={() => { setActiveTab('system'); setSearchTerm(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'system' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Settings className="h-4 w-4" /> System Configuration
          </button>

          <button
            onClick={() => { setActiveTab('cloud'); setSearchTerm(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'cloud' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Database className="h-4 w-4" /> Cloud &amp; Storage
          </button>

          <button
            onClick={() => { setActiveTab('monitoring'); setSearchTerm(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'monitoring' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Activity className="h-4 w-4" /> Platform Monitoring
          </button>

          <button
            onClick={() => { setActiveTab('features'); setSearchTerm(''); }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'features' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Sliders className="h-4 w-4" /> Feature Gates
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="p-3 bg-slate-800/60 rounded-xl flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">Administrator</p>
              <p className="text-[10px] text-slate-400 truncate font-mono">admin@business.os</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-1.5 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition cursor-pointer"
              title="Secure Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            {activeTab === 'businesses' && <><Building className="h-4 w-4 text-emerald-600" /> Business Tenants Management</>}
            {activeTab === 'paynow' && <><CreditCard className="h-4 w-4 text-emerald-600" /> Pay Now API Gateway Settings</>}
            {activeTab === 'users' && <><Users className="h-4 w-4 text-emerald-600" /> Global Tenant User Directory</>}
            {activeTab === 'notifications' && <><Bell className="h-4 w-4 text-emerald-600" /> Super Admin Push Notifications Center</>}
            {activeTab === 'registration' && <><Globe className="h-4 w-4 text-emerald-600" /> Registration &amp; Access Controls</>}
            {activeTab === 'system' && <><Settings className="h-4 w-4 text-emerald-600" /> System Configuration &amp; Branding</>}
            {activeTab === 'cloud' && <><Database className="h-4 w-4 text-emerald-600" /> Cloud Data Storage &amp; Snapshots</>}
            {activeTab === 'monitoring' && <><Activity className="h-4 w-4 text-emerald-600" /> Platform Pulse Monitor</>}
            {activeTab === 'features' && <><Sliders className="h-4 w-4 text-emerald-600" /> Feature Gates &amp; Audit Logs</>}
          </h2>

          <div className="flex items-center gap-3">
            {(activeTab === 'businesses' || activeTab === 'users') && (
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search database..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-56 pl-8 pr-3 py-1.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            )}
            
            {activeTab === 'businesses' && (
              <button
                onClick={handleOpenRegisterBusiness}
                className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition"
              >
                <Plus className="h-3.5 w-3.5" /> Register Business
              </button>
            )}

            {activeTab === 'users' && (
              <button
                onClick={() => {
                  setCreatingUser(true);
                  if (businesses.length > 0) setNewUserBusId(businesses[0].id);
                }}
                className="px-3.5 py-1.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Staff Profile
              </button>
            )}
          </div>
        </header>

        {/* Contents Wrapper */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Deletion Success Toast Banner */}
          {deleteSuccessMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 font-bold shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{deleteSuccessMessage}</span>
              </div>
              <button 
                onClick={() => setDeleteSuccessMessage(null)}
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Businesses</p>
                <h3 className="text-xl font-black text-slate-800 mt-1">{totalBusinesses}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Building className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Workspaces</p>
                <h3 className="text-xl font-black text-emerald-700 mt-1">{activeBusinesses}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Users</p>
                <h3 className="text-xl font-black text-slate-800 mt-1">{totalUsers}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paystack Gateway</p>
                <h3 className="text-xs font-extrabold text-emerald-800 uppercase mt-1 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {payNowState.environment}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </section>

          {/* TAB 1: Businesses */}
          {activeTab === 'businesses' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3.5 px-6">Business Name</th>
                    <th className="py-3.5 px-6">Owner</th>
                    <th className="py-3.5 px-6">Email</th>
                    <th className="py-3.5 px-6">Business Type</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Created Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                  {filteredBusinesses.map(bus => {
                    const subStatus = bus.subscriptionStatus || 'trial';

                    return (
                      <tr key={bus.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-6">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{bus.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {bus.id}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div>
                            <p className="font-bold text-slate-800">{bus.ownerName}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-600">{bus.email}</p>
                            {bus.phone && <p className="text-slate-400 text-[11px]">{bus.phone}</p>}
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] rounded-md font-bold uppercase">
                            {bus.category || 'General'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold leading-none ${
                            bus.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${bus.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                            {bus.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 font-medium">
                          {bus.createdAt ? new Date(bus.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleEditBusinessClick(bus)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Edit Business Details"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleToggleBusinessStatus(bus.id, bus.status)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                bus.status === 'active' 
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                              title={bus.status === 'active' ? 'Suspend Business Workspace' : 'Activate Business Workspace'}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {bus.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteBusiness(bus.id)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Delete Business Tenant"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                            <button
                              onClick={() => setViewingBusiness(bus)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="View Business Details"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBusinesses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No registered business tenants match your search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Paystack API Settings */}
          {activeTab === 'paynow' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-700" /> Paystack API Settings
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter your Paystack Public Key and Secret Key to connect payment processing.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                    API Credentials
                  </span>
                </div>

                <form onSubmit={handleSavePayNowSettings} className="space-y-5 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Public API Key
                    </label>
                    <input
                      type="text"
                      value={payNowState.publicKey || payNowState.apiKey || ''}
                      onChange={(e) => setPayNowState({ ...payNowState, apiKey: e.target.value, publicKey: e.target.value })}
                      placeholder="pk_live_..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Public payment initialization key</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Secret API Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPayNowSecret(!showPayNowSecret)}
                        className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                      >
                        {showPayNowSecret ? 'Hide Secret' : 'Reveal Secret'}
                      </button>
                    </div>
                    <input
                      type={showPayNowSecret ? 'text' : 'password'}
                      value={payNowState.secretKey || ''}
                      onChange={(e) => setPayNowState({ ...payNowState, secretKey: e.target.value })}
                      placeholder="sk_live_..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Server-side authorization key (stored securely in Admin settings)</p>
                  </div>

                  {payNowTestResult && (
                    <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                      payNowTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      {payNowTestResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />}
                      {payNowTestResult.message}
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleTestPayNowConnection}
                      disabled={payNowTesting}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      {payNowTesting ? <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" /> : <Zap className="h-4 w-4 text-amber-600" />}
                      {payNowTesting ? 'Testing Credentials...' : 'Test Connection'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeletePayNowSettings}
                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                        Delete API Keys
                      </button>

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold text-xs shadow transition cursor-pointer"
                      >
                        Apply &amp; Save Settings
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: Users */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Filters bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] mr-2">Filter Role:</span>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 cursor-pointer outline-none"
                  >
                    <option value="all">All Roles</option>
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                    <option value="salesperson">Salesperson</option>
                    <option value="inventory_staff">Inventory Staff</option>
                  </select>
                </div>

                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] mr-2">Filter Business:</span>
                  <select
                    value={userBusFilter}
                    onChange={(e) => setUserBusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-800 cursor-pointer outline-none"
                  >
                    <option value="all">All Businesses</option>
                    {businesses.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-3.5 px-6">Staff Name / Email</th>
                      <th className="py-3.5 px-6">Business Tenant Workspace</th>
                      <th className="py-3.5 px-6">Role Permission</th>
                      <th className="py-3.5 px-6">Account Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                    {filteredUsers.map(user => {
                      const busName = businesses.find(b => b.id === user.businessId)?.name || 'Unknown Workspace';
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-6">
                            <div>
                              <p className="font-bold text-slate-800">{user.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <p className="font-bold text-slate-700">{busName}</p>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-md font-bold uppercase">
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {user.status === 'active' ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setResettingUserPass(user);
                                setNewPassVal('');
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition"
                              title="Reset Password"
                            >
                              Reset Password
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(user.id, user.status)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                user.status === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {user.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer transition"
                              title="Delete Staff"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No tenant user accounts match your current filter selection.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Registration Control */}
          {activeTab === 'registration' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Globe className="h-5 w-5 text-emerald-700" /> Platform Registration Control &amp; Policies
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Manage new business self-registration permissions, allowed categories, and default trial lengths.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-extrabold text-slate-800">Public Self-Registration Portal</p>
                      <p className="text-slate-500 text-[11px]">When enabled, new business owners can register independently on the login screen.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSysConfigState({ ...sysConfigState, enableNewRegistrations: !sysConfigState.enableNewRegistrations })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        sysConfigState.enableNewRegistrations ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {sysConfigState.enableNewRegistrations ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Supported Business Categories</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {REQUIRED_BUSINESS_TYPES.map(cat => {
                        const isAllowed = sysConfigState.allowedBusinessTypes.includes(cat);
                        return (
                          <div 
                            key={cat} 
                            onClick={() => {
                              const updated = isAllowed
                                ? sysConfigState.allowedBusinessTypes.filter(c => c !== cat)
                                : [...sysConfigState.allowedBusinessTypes, cat];
                              setSysConfigState({ ...sysConfigState, allowedBusinessTypes: updated });
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              isAllowed ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            <span>{cat}</span>
                            <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                              isAllowed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {isAllowed ? '✓' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveSystemConfig}
                      className="px-5 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold shadow transition cursor-pointer"
                    >
                      Save Registration Policies
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: System Configuration */}
          {activeTab === 'system' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Settings className="h-5 w-5 text-emerald-700" /> Global System Configuration &amp; Branding
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Customize default currencies, tax rates, platform branding, and security requirements.
                  </p>
                </div>

                <form onSubmit={handleSaveSystemConfig} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">System Default Currency</label>
                      <select
                        value={sysConfigState.defaultCurrency}
                        onChange={(e) => setSysConfigState({ ...sysConfigState, defaultCurrency: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                      >
                        <option value="GHC">GH₵ - Ghana Cedi (GHC)</option>
                        <option value="USD">$ - US Dollar (USD)</option>
                        <option value="GBP">£ - British Pound (GBP)</option>
                        <option value="EUR">€ - Euro (EUR)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Default Tax Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={sysConfigState.defaultTaxRate}
                        onChange={(e) => setSysConfigState({ ...sysConfigState, defaultTaxRate: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Default Subscription Amount (GHS)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sysConfigState.defaultSubscriptionAmount || 299}
                        onChange={(e) => setSysConfigState({ ...sysConfigState, defaultSubscriptionAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">System Platform Branding Name</label>
                    <input
                      type="text"
                      required
                      value={sysConfigState.systemBrandingName}
                      onChange={(e) => setSysConfigState({ ...sysConfigState, systemBrandingName: e.target.value })}
                      placeholder="BusinessOS Cloud Enterprise"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <ImageUploadInput
                      label="System Platform Logo (URL or Upload)"
                      value={sysConfigState.systemLogoUrl || ''}
                      onChange={(url) => setSysConfigState({ ...sysConfigState, systemLogoUrl: url })}
                      placeholder="Upload system logo image or paste URL"
                      businessId="system"
                      previewHeightClass="h-16"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold shadow transition cursor-pointer"
                    >
                      Save System Configurations
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 6: Cloud & Storage */}
          {activeTab === 'cloud' && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Database className="h-5 w-5 text-emerald-700" /> Cloud Database Record Statistics &amp; Backup
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Real-time count of active database records across all isolated business tenants and snapshot tools.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {db.getDatabaseStats().map(stat => (
                    <div key={stat.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                      <p className="text-xl font-black text-slate-800 mt-1">{stat.count}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Download className="h-4 w-4 text-emerald-700" /> Export Full Database Snapshot
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Download a complete, offline JSON snapshot containing all businesses, staff users, catalog items, orders, and system configurations.
                    </p>
                    <button
                      onClick={handleExportDatabase}
                      className="w-full py-2.5 bg-[#064E3B] hover:bg-[#032e23] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow"
                    >
                      <Download className="h-4 w-4" /> Export Global Backup JSON
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Upload className="h-4 w-4 text-indigo-700" /> Restore Database Snapshot
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Upload a previously exported JSON snapshot to restore database collections and configurations instantly.
                    </p>
                    <label className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow">
                      <Upload className="h-4 w-4" /> Choose JSON Snapshot File
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleRestoreDatabase}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Platform Monitoring */}
          {activeTab === 'monitoring' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building className="h-4 w-4 text-emerald-600" /> Platform Registration &amp; Tenant Log
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {businesses.map(bus => (
                      <div key={bus.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-b border-slate-100 last:border-0">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{bus.name}</p>
                          <p className="text-slate-400 text-[11px]">{bus.ownerName} &bull; {bus.category}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <p className="font-semibold text-slate-500 text-[11px]">{new Date(bus.createdAt).toLocaleDateString()}</p>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            bus.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${bus.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {bus.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                          <button
                            onClick={() => setViewingBusiness(bus)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="View Business Details"
                          >
                            <Eye className="h-3 w-3 text-slate-600" /> View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Server className="h-4 w-4 text-indigo-600" /> Node Core Express Server Telemetry
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 space-y-2 leading-relaxed">
                    <p className="text-slate-500">// BusinessOS Core Server Status</p>
                    <p><span className="text-blue-400">[INFO]</span> Database isolation state: ENFORCED MULTI-TENANT</p>
                    <p><span className="text-blue-400">[INFO]</span> Active isolated business workspaces: {activeBusinesses}</p>
                    <p><span className="text-blue-400">[INFO]</span> PayNow API environment: {payNowState.environment.toUpperCase()}</p>
                    <p><span className="text-emerald-400">[OK]</span> Real-time synchronization engine: ONLINE</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-500 animate-pulse" /> System Audit Feed
                </h4>
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 text-xs">
                  {logs.map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{log.action}</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{log.details}</p>
                      <div className="pt-1 flex justify-between text-[9px] text-slate-400 font-bold border-t border-slate-200/60">
                        <span>{log.userName}</span>
                        <span className="uppercase text-emerald-700">Tenant: {log.businessId}</span>
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-center py-8 text-slate-400">No logs collected in system audit log.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Feature Gates */}
          {activeTab === 'features' && (
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="mb-6">
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Global Feature Gate Control</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Toggle feature availability platform-wide. Disabling a feature removes related components from all business workspaces immediately.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {db.getGlobalFeatures().map((feat) => (
                    <div 
                      key={feat.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        feat.isEnabled 
                          ? 'bg-emerald-50/20 border-emerald-100' 
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            feat.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {feat.isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <h4 className="font-bold text-slate-800 text-xs mt-1">{feat.name}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{feat.description}</p>
                          <div className="pt-2 flex flex-col text-[9px] text-slate-400 font-mono">
                            <span>Updated: {new Date(feat.lastChanged).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {feat.isEnabled ? (
                            <button
                              type="button"
                              onClick={() => handleToggleFeature(feat.id, false)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Disable
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleFeature(feat.id, true)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Enable
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: Push Notifications */}
          {activeTab === 'notifications' && (
            <AdminNotifications businesses={businesses} />
          )}
        </div>
      </main>

      {/* MODAL: Register New Business */}
      {registeringBusiness && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Building className="h-4 w-4 text-emerald-700" /> Register New Business Workspace
              </h4>
              <button onClick={() => setRegisteringBusiness(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterBusinessSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Business Name</label>
                  <input
                    type="text"
                    required
                    value={busName}
                    onChange={(e) => setBusName(e.target.value)}
                    placeholder="Grand Gourmet Diner"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    value={busOwner}
                    onChange={(e) => setBusOwner(e.target.value)}
                    placeholder="Sarah Connor"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Owner Email</label>
                  <input
                    type="email"
                    required
                    value={busEmail}
                    onChange={(e) => setBusEmail(e.target.value)}
                    placeholder="sarah@gourmet.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telephone</label>
                  <input
                    type="text"
                    required
                    value={busPhone}
                    onChange={(e) => setBusPhone(e.target.value)}
                    placeholder="+233 24 000 0000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Business Category</label>
                  <select
                    value={busCategory}
                    onChange={(e) => setBusCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    {sysConfigState.allowedBusinessTypes.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Initial Subscription Status</label>
                  <select
                    value={busSubStatus}
                    onChange={(e) => setBusSubStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="trial">Free Trial</option>
                    <option value="active">Active Subscription</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Owner Account Password</label>
                  <input
                    type="password"
                    required
                    value={regBusPassword}
                    onChange={(e) => setRegBusPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Base Currency</label>
                  <select
                    value={busCurrency}
                    onChange={(e) => setBusCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="GHC">GH₵ (GHC)</option>
                    <option value="USD">$ (USD)</option>
                    <option value="GBP">£ (GBP)</option>
                    <option value="EUR">€ (EUR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subscription Fee (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={busSubscriptionAmount}
                    onChange={(e) => setBusSubscriptionAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRegisteringBusiness(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold shadow cursor-pointer"
                >
                  Register Business Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Business Tenant */}
      {editingBusiness && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">Edit Business Tenant Details</h4>
              <button onClick={() => setEditingBusiness(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBusiness} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={busName}
                  onChange={(e) => setBusName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={busOwner}
                  onChange={(e) => setBusOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={busEmail}
                    onChange={(e) => setBusEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telephone</label>
                  <input
                    type="text"
                    required
                    value={busPhone}
                    onChange={(e) => setBusPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select
                    value={busCategory}
                    onChange={(e) => setBusCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    {REQUIRED_BUSINESS_TYPES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select
                    value={busSubStatus}
                    onChange={(e) => setBusSubStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sub Fee (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={busSubscriptionAmount}
                    onChange={(e) => setBusSubscriptionAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* READONLY SUBSCRIPTION AUDIT METRICS */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-[11px]">
                <p className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider">Subscription Audit Metrics</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 font-medium">Registration Date:</span>
                    <p className="font-bold text-slate-800">{new Date(editingBusiness.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Next Due Date:</span>
                    <p className="font-bold text-emerald-800">
                      {editingBusiness.nextPaymentDate ? new Date(editingBusiness.nextPaymentDate).toLocaleDateString() : editingBusiness.trialEndDate ? new Date(editingBusiness.trialEndDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Last Payment Date:</span>
                    <p className="font-bold text-slate-800">{editingBusiness.lastPaymentDate ? new Date(editingBusiness.lastPaymentDate).toLocaleDateString() : 'None Recorded'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Billing Cycle:</span>
                    <p className="font-bold text-slate-800">{editingBusiness.billingCycle || 'Monthly'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Outstanding Balance:</span>
                    <p className="font-bold text-rose-700">GHS {(editingBusiness.balanceDue || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Payment History:</span>
                    <p className="font-bold text-slate-800">{editingBusiness.paymentHistory?.length || 0} transaction(s)</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBusiness(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold shadow cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create User */}
      {creatingUser && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">Add Staff Account</h4>
              <button onClick={() => setCreatingUser(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateUserSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Tenant Workspace</label>
                <select
                  value={newUserBusId}
                  onChange={(e) => setNewUserBusId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Staff Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="john@gourmet.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Role Permission Level</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="salesperson">Salesperson</option>
                  <option value="inventory_staff">Inventory Staff</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreatingUser(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold shadow cursor-pointer"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Staff Password */}
      {resettingUserPass && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5"><Lock className="h-4 w-4 text-indigo-700" /> Reset Password</h4>
              <button onClick={() => setResettingUserPass(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 mt-4 text-xs">
              <p className="text-slate-500">
                Set a new password for <strong className="text-slate-800">{resettingUserPass.name}</strong> ({resettingUserPass.email}).
              </p>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassVal}
                  onChange={(e) => setNewPassVal(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResettingUserPass(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold shadow cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Owner Password */}
      {resettingOwnerPass && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5"><Lock className="h-4 w-4 text-emerald-700" /> Reset Business Owner Password</h4>
              <button onClick={() => setResettingOwnerPass(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleResetOwnerPassword} className="space-y-4 mt-4 text-xs">
              <p className="text-slate-500">
                Reset owner password for tenant <strong className="text-slate-800">{resettingOwnerPass.name}</strong> ({resettingOwnerPass.email}).
              </p>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Owner Password</label>
                <input
                  type="password"
                  required
                  value={newOwnerPassVal}
                  onChange={(e) => setNewOwnerPassVal(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResettingOwnerPass(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold shadow cursor-pointer"
                >
                  Update Owner Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Send Subscription Payment Reminder */}
      {reminderBusiness && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">Send Subscription Payment Reminder?</h4>
              <button onClick={() => setReminderBusiness(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-500">
                A system notification will be delivered directly to the workspace dashboard of <strong className="text-slate-800">{reminderBusiness.name}</strong>.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tenant:</span>
                <p className="text-sm font-extrabold text-slate-800">{reminderBusiness.name} ({reminderBusiness.ownerName})</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReminderBusiness(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReminder}
                className="px-5 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold shadow cursor-pointer"
              >
                Send Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Business Workspace Details */}
      {viewingBusiness && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-800 text-lg">{viewingBusiness.name}</h4>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    viewingBusiness.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${viewingBusiness.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                    {viewingBusiness.status === 'active' ? 'Active Tenant' : 'Suspended Workspace'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Tenant ID: {viewingBusiness.id} &bull; Category: {viewingBusiness.category}</p>
              </div>
              <button onClick={() => setViewingBusiness(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Owner</p>
                <p className="font-bold text-slate-800 text-sm">{viewingBusiness.ownerName}</p>
                <p className="text-slate-500 font-mono text-[11px]">{viewingBusiness.email}</p>
                <p className="text-slate-500 text-[11px]">{viewingBusiness.phone}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Subscription Details</p>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800 text-sm uppercase">{viewingBusiness.subscriptionStatus || 'trial'}</span>
                  <span className="text-emerald-700 font-bold">{viewingBusiness.currency || 'GHC'} {viewingBusiness.subscriptionAmount || 299}/mo</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Registered: {new Date(viewingBusiness.createdAt || viewingBusiness.registrationDate || Date.now()).toLocaleDateString()}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Next Cycle: {viewingBusiness.nextPaymentDate ? new Date(viewingBusiness.nextPaymentDate).toLocaleDateString() : 'Active'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Staff Directory</p>
                <p className="font-extrabold text-slate-800 text-sm">
                  {db.getUsers().filter(u => u.businessId === viewingBusiness.id).length} Active Accounts
                </p>
                <p className="text-slate-500 text-[11px]">Includes Owners, Managers, Cashiers &amp; Inventory Staff</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">System Features</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(viewingBusiness.enabledFeatures || ["sales", "inventory", "customers", "suppliers", "reports"]).map(feat => (
                    <span key={feat} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[9px] uppercase font-bold">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Receipt Configuration</p>
              <p className="text-slate-700 font-semibold">{viewingBusiness.receiptConfig?.businessName || viewingBusiness.name}</p>
              <p className="text-slate-500 text-[11px] whitespace-pre-line">{viewingBusiness.receiptConfig?.contactInfo || viewingBusiness.phone}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {onManageBusiness && (
                  <button
                    type="button"
                    onClick={() => {
                      onManageBusiness(viewingBusiness);
                      setViewingBusiness(null);
                    }}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                  >
                    <Eye className="h-4 w-4" /> Enter Workspace
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const busToEdit = viewingBusiness;
                    setViewingBusiness(null);
                    handleEditBusinessClick(busToEdit);
                  }}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Edit className="h-4 w-4" /> Edit Business
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleBusinessStatus(viewingBusiness.id, viewingBusiness.status);
                    setViewingBusiness(prev => prev ? { ...prev, status: prev.status === 'active' ? 'suspended' : 'active' } : null);
                  }}
                  className={`px-3 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition ${
                    viewingBusiness.status === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-800' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" /> {viewingBusiness.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const busIdToDelete = viewingBusiness.id;
                    setViewingBusiness(null);
                    handleDeleteBusiness(busIdToDelete);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
                <button
                  type="button"
                  onClick={() => setViewingBusiness(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Permanent Business Deletion Confirmation Modal */}
      {deletingBusinessTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Delete Registered Business</h3>
                  <p className="text-xs text-rose-600 font-semibold">Permanent Cloud Deletion</p>
                </div>
              </div>
              {!isDeletingInProgress && (
                <button
                  onClick={() => setDeletingBusinessTarget(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Confirmation details & warning */}
            <div className="space-y-4 mb-6">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Are you sure you want to permanently delete this business? This action cannot be undone.</strong>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Business Name:</span>
                  <span className="font-extrabold text-slate-800">{deletingBusinessTarget.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Business ID:</span>
                  <span className="font-mono text-slate-700 text-[11px]">{deletingBusinessTarget.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Owner:</span>
                  <span className="font-bold text-slate-800">{deletingBusinessTarget.ownerName} ({deletingBusinessTarget.ownerEmail || deletingBusinessTarget.email})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Category / Type:</span>
                  <span className="font-semibold text-slate-700 uppercase">{deletingBusinessTarget.category || deletingBusinessTarget.type}</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
                <p className="font-bold text-amber-950 uppercase tracking-wider text-[10px]">The following data will be permanently wiped:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-900 font-medium">
                  <li>Business workspace settings &amp; configurations</li>
                  <li>All products, inventory, services &amp; stock movements</li>
                  <li>All sales, receipts, invoices &amp; payment transactions</li>
                  <li>All customers, suppliers, expenses &amp; reports</li>
                  <li>All staff user accounts, roles &amp; auth tokens</li>
                  <li>All cloud Firestore documents, storage files &amp; images</li>
                </ul>
              </div>

              {deleteErrorMessage && (
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold">
                  Error: {deleteErrorMessage}
                </div>
              )}
            </div>

            {/* Loading Overlay or Action Buttons */}
            {isDeletingInProgress ? (
              <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
                <RefreshCw className="h-8 w-8 text-rose-500 animate-spin" />
                <div>
                  <p className="font-black text-sm">Deleting business and purging all cloud data...</p>
                  <p className="text-xs text-slate-400 mt-1">Please wait while database documents, users, files, and audit logs are permanently wiped.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingBusinessTarget(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDeleteBusiness}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-rose-900/20 flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
