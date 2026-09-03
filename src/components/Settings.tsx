/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Business, User } from '../types';
import { PrinterManagement } from './PrinterManagement';
import { ImageUploadInput } from './ImageUploadInput';
import { InstallAppButton } from './InstallAppButton';
import { 
  Settings as SettingsIcon, Building, Shield, Bell, 
  Download, Laptop, Smartphone, Check, Sparkles, Upload,
  CreditCard, Clock, Calendar
} from 'lucide-react';

interface SettingsProps {
  business: Business;
  user: User;
  onUpdateBusiness: (b: Business) => void;
}

export function Settings({ business, user, onUpdateBusiness }: SettingsProps) {
  // PWA Prompt installer trigger
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'printers'>('profile');

  // Forms
  const [busName, setBusName] = useState(business.name);
  const [busOwner, setBusOwner] = useState(business.ownerName);
  const [busEmail, setBusEmail] = useState(business.email);
  const [busPhone, setBusPhone] = useState(business.phone);
  const [busCategory, setBusCategory] = useState(business.category);
  const [logoBase64, setLogoBase64] = useState(business.logoUrl || '');
  const [selectedCurrency, setSelectedCurrency] = useState(business.currency || 'GHC');

  // Receipts Config
  const [recName, setRecName] = useState(business.receiptConfig.businessName || business.name);
  const [recContact, setRecContact] = useState(business.receiptConfig.contactInfo || business.phone);
  const [recFooter, setRecFooter] = useState(business.receiptConfig.footerMessage || 'Thank you!');
  const [recLayout, setRecLayout] = useState<'standard' | 'compact' | 'elegant'>(business.receiptConfig.layout || 'standard');

  // Change password
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Notifications toggles
  const [notiLowStock, setNotiLowStock] = useState(true);
  const [notiDailySummary, setNotiDailySummary] = useState(true);

  useEffect(() => {
    // Listen for custom installation prompts
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleCustomInstallable = () => {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-installable', handleCustomInstallable);
    
    // Check if app is running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if the global variable already has the prompt
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-installable', handleCustomInstallable);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.deferredPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      }
      setDeferredPrompt(null);
      window.deferredPrompt = null;
    } else {
      // Mark as installed directly without showing guides, instructions or alerts
      setIsInstalled(true);
    }
  };

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busName || !busOwner || !busEmail || !busPhone) {
      alert('Please fill in all mandatory workspace profile details.');
      return;
    }

    const updated: Business = {
      ...business,
      name: busName,
      ownerName: busOwner,
      email: busEmail,
      phone: busPhone,
      category: busCategory,
      logoUrl: logoBase64 || undefined,
      currency: selectedCurrency,
      receiptConfig: {
        ...business.receiptConfig,
        businessName: recName,
        contactInfo: recContact,
        footerMessage: recFooter,
        layout: recLayout
      }
    };

    db.saveBusiness(updated);
    onUpdateBusiness(updated);

    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: 'Settings Modified',
      details: `Updated workspace profiles, receipt headers and set currency to ${selectedCurrency}.`
    });

    alert('Cloud workspace profiles successfully saved.');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const cloudUrl = await db.uploadFile(file.name, base64);
          setLogoBase64(cloudUrl);
        } catch (err) {
          console.error("Cloud upload failed, falling back to local encoding", err);
          setLogoBase64(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) {
      alert('Both password fields are required.');
      return;
    }

    const fullUsers = db.getUsers();
    const matched = fullUsers.find(u => u.id === user.id && u.password === currentPass);
    if (!matched) {
      alert('Incorrect current password.');
      return;
    }

    db.saveUser({
      ...user,
      password: newPass
    });

    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: 'Password Altered',
      details: 'Securely updated account sign-in password.'
    });

    setCurrentPass('');
    setNewPass('');
    alert('Sign-in password updated successfully.');
  };

  const handleTriggerBackup = () => {
    // Generate JSON download for localized data
    const exportData = {
      business,
      products: db.getProducts(business.id),
      services: db.getServices(business.id),
      customers: db.getCustomers(business.id),
      sales: db.getSales(business.id),
      expenses: db.getExpenses(business.id),
      logs: db.getLogs(business.id)
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BOS_CloudBackup_${business.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: 'Backup Generated',
      details: 'Created full database JSON snapshot download.'
    });
  };

  const canEditWorkspace = ['owner', 'admin', 'SUPER_ADMIN'].includes(user.role);

  const handleTimeTravel = (mode: string) => {
    const now = new Date();
    let updated: Business = { ...business };

    if (mode === 'trial_day1') {
      const reg = now.toISOString();
      const trial = new Date();
      trial.setDate(now.getDate() + 30);
      updated = {
        ...business,
        registrationDate: reg,
        trialEndDate: trial.toISOString(),
        subscriptionStatus: 'trial',
        status: 'active'
      };
    } else if (mode === 'trial_day5') {
      const reg = new Date();
      reg.setDate(now.getDate() - 5);
      const trial = new Date(reg);
      trial.setDate(reg.getDate() + 30);
      updated = {
        ...business,
        registrationDate: reg.toISOString(),
        trialEndDate: trial.toISOString(),
        subscriptionStatus: 'trial',
        status: 'active'
      };
    } else if (mode === 'trial_expired') {
      const reg = new Date();
      reg.setDate(now.getDate() - 31);
      const trial = new Date(reg);
      trial.setDate(reg.getDate() + 30);
      updated = {
        ...business,
        registrationDate: reg.toISOString(),
        trialEndDate: trial.toISOString(),
        subscriptionStatus: 'suspended',
        status: 'active'
      };
    } else if (mode === 'active_28days') {
      const cycleStart = new Date();
      cycleStart.setDate(now.getDate() - 3);
      const cycleEnd = new Date(cycleStart);
      cycleEnd.setDate(cycleStart.getDate() + 31);
      updated = {
        ...business,
        subscriptionStatus: 'active',
        subscriptionCycleStartDate: cycleStart.toISOString(),
        subscriptionCycleEndDate: cycleEnd.toISOString(),
        status: 'active'
      };
    } else if (mode === 'active_2days') {
      const cycleStart = new Date();
      cycleStart.setDate(now.getDate() - 29);
      const cycleEnd = new Date(cycleStart);
      cycleEnd.setDate(cycleStart.getDate() + 31);
      updated = {
        ...business,
        subscriptionStatus: 'active',
        subscriptionCycleStartDate: cycleStart.toISOString(),
        subscriptionCycleEndDate: cycleEnd.toISOString(),
        status: 'active'
      };
    } else if (mode === 'active_expired') {
      const cycleStart = new Date();
      cycleStart.setDate(now.getDate() - 32);
      const cycleEnd = new Date(cycleStart);
      cycleEnd.setDate(cycleStart.getDate() + 31);
      updated = {
        ...business,
        subscriptionStatus: 'suspended',
        subscriptionCycleStartDate: cycleStart.toISOString(),
        subscriptionCycleEndDate: cycleEnd.toISOString(),
        status: 'active'
      };
    }

    db.saveBusiness(updated);
    onUpdateBusiness(updated);

    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: 'Time Travel Simulation',
      details: `Simulated subscription mode: ${mode}.`
    });

    alert(`Simulated subscription state set: ${mode}. Workspace state synchronized.`);
  };

  return (
    <div className="flex flex-col gap-5 h-auto lg:h-[calc(100vh-12rem)] font-sans">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 shrink-0">
        <button
          type="button"
          onClick={() => setActiveSettingsTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSettingsTab === 'profile' 
              ? 'bg-[#064E3B] text-white shadow' 
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
          }`}
        >
          <Building className="h-4 w-4" /> Workspace & Business Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('printers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSettingsTab === 'printers' 
              ? 'bg-[#064E3B] text-white shadow' 
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
          }`}
        >
          <Laptop className="h-4 w-4" /> Printer Management Settings
        </button>
      </div>

      {activeSettingsTab === 'printers' ? (
        <PrinterManagement business={business} user={user} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
      {/* Left Columns Form */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0">
        <header className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-slate-800">
            <Building className="h-5 w-5 text-emerald-800" />
            <h3 className="font-bold text-sm">Workspace Profile Settings</h3>
          </div>
        </header>

        <form onSubmit={handleSaveWorkspace} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Logo Builder */}
          <div>
            <ImageUploadInput
              label="Corporate Branding Logo (URL or Upload)"
              value={logoBase64}
              onChange={(url) => setLogoBase64(url)}
              placeholder="Paste logo URL or click Upload Image"
              businessId={business.id}
              previewHeightClass="h-20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Company / Business Name</label>
              <input
                type="text"
                required
                disabled={!canEditWorkspace}
                value={busName}
                onChange={(e) => setBusName(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Owner Full Name</label>
              <input
                type="text"
                required
                disabled={!canEditWorkspace}
                value={busOwner}
                onChange={(e) => setBusOwner(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Business Primary Email</label>
              <input
                type="email"
                required
                disabled={!canEditWorkspace}
                value={busEmail}
                onChange={(e) => setBusEmail(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Contact Telephone</label>
              <input
                type="text"
                required
                disabled={!canEditWorkspace}
                value={busPhone}
                onChange={(e) => setBusPhone(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">System Base Currency</label>
              <select
                disabled={!canEditWorkspace}
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 bg-white font-bold focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 text-xs cursor-pointer"
              >
                <option value="GHC">GH₵ - Ghana Cedi (GHC)</option>
                <option value="USD">$ - United States Dollar (USD)</option>
                <option value="GBP">£ - British Pound (GBP)</option>
                <option value="EUR">€ - Euro (EUR)</option>
              </select>
            </div>
          </div>

          {/* Receipt Invoicing Metadata Customizer */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              Receipt Header & Customization
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Invoicing Business Name</label>
                <input
                  type="text"
                  required
                  disabled={!canEditWorkspace}
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Receipt Footer Line Message</label>
                <input
                  type="text"
                  required
                  disabled={!canEditWorkspace}
                  value={recFooter}
                  onChange={(e) => setRecFooter(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-500 font-bold uppercase mb-1">Invoicing Header Address Details</label>
                <textarea
                  rows={2}
                  required
                  disabled={!canEditWorkspace}
                  value={recContact}
                  onChange={(e) => setRecContact(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 text-xs"
                />
              </div>
            </div>
          </div>

          {canEditWorkspace && (
            <div className="pt-6 border-t border-slate-150 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl font-bold cursor-pointer shadow transition-colors"
              >
                Save Workspace Configurations
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Right Column utilities: PWA Installer, Backups, Password change */}
      <div className="space-y-6">
        {/* PWA INSTALLATION PANEL */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <Smartphone className="h-4.5 w-4.5 text-emerald-800" /> WebApp PWA Installation
          </h4>
          <p className="text-slate-500 leading-normal">
            Run **BusinessOS** directly on your desktop, tablet, or smartphone as a native, fully secure standalone application workspace.
          </p>

          <div className="pt-2">
            <InstallAppButton className="w-full justify-center" />
          </div>
        </div>

        {/* SECURE PASSWORDS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <Shield className="h-4.5 w-4.5 text-indigo-700" /> Change Login Password
          </h4>
          
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold uppercase mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-1.5 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold rounded-xl cursor-pointer transition-colors text-xs"
            >
              Update Security Credentials
            </button>
          </form>
        </div>

        {/* SUBSCRIPTION MANAGEMENT & TIME TRAVEL SIMULATOR */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <CreditCard className="h-4.5 w-4.5 text-emerald-800" /> Subscription & Licensing
          </h4>
          
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">License Status:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                business.subscriptionStatus === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : business.subscriptionStatus === 'trial' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                    : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                {business.subscriptionStatus || 'trial'}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Registration Date:</span>
              <span className="font-mono text-slate-700">
                {new Date(business.registrationDate || business.createdAt).toLocaleDateString()}
              </span>
            </div>

            {business.subscriptionStatus === 'active' ? (
              <>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Cycle Started:</span>
                  <span className="font-mono text-slate-700">
                    {business.subscriptionCycleStartDate ? new Date(business.subscriptionCycleStartDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Cycle Ends (31 Days):</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {business.subscriptionCycleEndDate ? new Date(business.subscriptionCycleEndDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Trial Ends (30 Days):</span>
                <span className="font-mono text-slate-800 font-bold">
                  {business.trialEndDate ? new Date(business.trialEndDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            )}
          </div>

          {/* Payment History Log */}
          {business.paymentHistory && business.paymentHistory.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Payment Transaction History</p>
              <div className="max-h-24 overflow-y-auto space-y-1 divide-y divide-slate-100">
                {business.paymentHistory.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center pt-1.5 text-[10px]">
                    <span className="text-slate-500">{new Date(p.date).toLocaleDateString()}</span>
                    <span className="font-mono text-slate-400">ID: {p.transactionId.slice(-6)}</span>
                    <span className="font-bold text-emerald-700">{p.amount} GHC</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Travel Simulation Controls */}
          <div className="pt-3 border-t border-slate-150 space-y-2">
            <p className="font-bold text-slate-400 uppercase text-[9px] tracking-widest flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-600" /> Time Travel Testing Suite
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleTimeTravel('trial_day1')}
                className="py-1 px-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-700 transition"
              >
                Trial Day 1 (Reset)
              </button>
              <button
                onClick={() => handleTimeTravel('trial_day5')}
                className="py-1 px-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-700 transition"
              >
                Trial Day 5 (Reminder)
              </button>
              <button
                onClick={() => handleTimeTravel('trial_expired')}
                className="py-1 px-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-[9px] font-bold text-rose-700 transition"
              >
                Trial Expired (Lockout)
              </button>
              <button
                onClick={() => handleTimeTravel('active_28days')}
                className="py-1 px-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[9px] font-bold text-emerald-700 transition"
              >
                Active Sub (28d Left)
              </button>
              <button
                onClick={() => handleTimeTravel('active_2days')}
                className="py-1 px-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg text-[9px] font-bold text-amber-700 transition"
              >
                Active Sub (2d Reminder)
              </button>
              <button
                onClick={() => handleTimeTravel('active_expired')}
                className="py-1 px-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-[9px] font-bold text-rose-700 transition"
              >
                Sub Expired (Lockout)
              </button>
            </div>
          </div>
        </div>

        {/* SYSTEM BACKUP */}
        {canEditWorkspace && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Download className="h-4.5 w-4.5 text-emerald-800" /> Backup Database Snapshot
            </h4>
            <p className="text-slate-500 leading-normal">
              Download a complete offline JSON snapshot of your products, service listings, active employees, outstanding balance tabs, and purchase histories securely.
            </p>
            <button
              onClick={handleTriggerBackup}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-800 font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors text-xs"
            >
              🚀 Download JSON Backup
            </button>
          </div>
        )}

        {/* ABOUT & PUBLISHER METADATA */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> About BusinessOS
            </h4>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
              v4.2 Cloud
            </span>
          </div>
          <div className="space-y-1.5 text-slate-300 font-mono text-[11px] border-t border-slate-800 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Publisher:</span>
              <span className="font-bold text-white">Legacy Inc</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Architecture:</span>
              <span className="text-slate-300">Cloud-Connected Enterprise OS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Workspace Type:</span>
              <span className="text-emerald-400 font-bold">{business.category || business.businessType || 'General Retail'}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}
