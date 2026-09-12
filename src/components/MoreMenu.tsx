/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Business, User } from '../types';
import { db } from '../lib/db';
import { 
  Users, TrendingDown, CreditCard, Package, BarChart3, 
  UserCheck, Building2, MessageSquare, Settings as SettingsIcon, 
  HelpCircle, LogOut, ChevronRight, Store, ShieldCheck, 
  Phone, Mail, CheckCircle2, ExternalLink, X, Smartphone
} from 'lucide-react';
import { InstallAppButton } from './InstallAppButton';

interface MoreMenuProps {
  business: Business;
  currentUser: User;
  authorizedTabs: string[];
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({
  business,
  currentUser,
  authorizedTabs,
  onNavigate,
  onLogout
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isOwnerOrAdmin = ['owner', 'admin', 'SUPER_ADMIN'].includes(currentUser.role);
  const isManager = currentUser.role === 'manager';

  // Accounts Receivable permitted roles or explicit permission
  const canAccessReceivables = ['owner', 'manager', 'admin', 'SUPER_ADMIN', 'accountant'].includes(currentUser.role) || 
    Boolean(currentUser.permissions?.includes('Accounts Receivable'));

  // Filter items strictly based on role permissions and authorized tabs
  const secondaryItems = [
    {
      id: 'Customers',
      label: 'Customers & CRM',
      description: 'Customer directory, contact profiles & loyalty',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      allowed: authorizedTabs.includes('Customers') || authorizedTabs.includes('Travel Customers')
    },
    {
      id: 'Expenses',
      label: 'Expenses & Overhead',
      description: 'Track operating costs, bills, and payouts',
      icon: TrendingDown,
      color: 'bg-rose-50 text-rose-600',
      allowed: authorizedTabs.includes('Expenses')
    },
    {
      id: 'Accounts Receivable',
      label: 'Accounts Receivable',
      description: 'Customer credit tabs, debts & debt collections',
      icon: CreditCard,
      color: 'bg-indigo-50 text-indigo-600',
      allowed: canAccessReceivables
    },
    {
      id: 'Inventory',
      label: 'Inventory & Stock Alerts',
      description: 'Stock levels, reorder alerts & item tracking',
      icon: Package,
      color: 'bg-amber-50 text-amber-600',
      allowed: authorizedTabs.includes('Inventory') || authorizedTabs.includes('Ingredient Inventory')
    },
    {
      id: 'Reports',
      label: 'Reports & Analytics',
      description: 'Sales summaries, revenue analysis & charts',
      icon: BarChart3,
      color: 'bg-emerald-50 text-emerald-600',
      allowed: authorizedTabs.includes('Reports') || authorizedTabs.includes('Travel Reports')
    },
    {
      id: 'Employees',
      label: 'Employees & Staff',
      description: 'Team members, cashier roles & permissions',
      icon: UserCheck,
      color: 'bg-purple-50 text-purple-600',
      allowed: authorizedTabs.includes('Employees')
    },
    {
      id: 'Branches',
      label: 'Branch Outlets',
      description: 'Multi-location store locations & counters',
      icon: Building2,
      color: 'bg-sky-50 text-sky-600',
      allowed: authorizedTabs.includes('Branches')
    },
    {
      id: 'Returns',
      label: 'Returns & Refunds',
      description: 'Process product returns and item exchanges',
      icon: Package,
      color: 'bg-teal-50 text-teal-600',
      allowed: authorizedTabs.includes('Returns')
    },
    {
      id: 'Settings',
      label: 'Business Settings',
      description: 'Receipt headers, currency, tax rates & print formats',
      icon: SettingsIcon,
      color: 'bg-slate-100 text-slate-700',
      allowed: authorizedTabs.includes('Settings')
    }
  ].filter(item => item.allowed);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-28">
      {/* User & Business Profile Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          {business.logoUrl ? (
            <img 
              src={business.logoUrl} 
              alt={business.name} 
              className="w-14 h-14 rounded-2xl object-cover bg-white border border-slate-200 shadow-xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xs">
              {business.name.charAt(0)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate leading-tight">
              {business.name}
            </h2>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {business.category || business.businessType || 'General Enterprise'} Workspace
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase tracking-wide border border-blue-100">
                {currentUser.role}
              </span>
              <span className="text-[11px] text-slate-500 font-medium truncate">
                {currentUser.name}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-100 text-xs">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-center transition cursor-pointer border border-slate-200/60"
          >
            Business Profile
          </button>
          <button
            onClick={() => setIsHelpOpen(true)}
            className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-center transition cursor-pointer border border-slate-200/60 flex items-center justify-center gap-1.5"
          >
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <span>Help & Support</span>
          </button>
        </div>
      </div>

      {/* Secondary Features Grid */}
      {secondaryItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
            Management & Tools
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {secondaryItems.map(item => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="bg-white hover:bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between text-left transition-all cursor-pointer group active:scale-98"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`p-3 rounded-2xl ${item.color} shrink-0 shadow-2xs`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                        {item.label}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs font-medium">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* App & Session Controls */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
          App & Account
        </h3>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {/* PWA Install Button */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">Install to Home Screen</p>
                <p className="text-xs text-slate-400">Add BusinessOS to your Android or iPhone</p>
              </div>
            </div>
            <InstallAppButton variant="secondary" />
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onLogout}
            className="w-full p-4 flex items-center justify-between hover:bg-rose-50/40 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-100 transition-colors">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-rose-600">Sign Out</p>
                <p className="text-xs text-slate-400">Safely log out of your session on this device</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-rose-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* Tenant Verification Footer */}
      <div className="text-center text-xs text-slate-400 py-4 space-y-1">
        <p className="font-semibold text-slate-500">BusinessOS &bull; Version 2.6 Cloud</p>
        <p className="font-mono text-[10px]">Tenant: BOS-{business.id.slice(2).toUpperCase()}</p>
      </div>

      {/* Help & Support Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-up relative">
            <button
              onClick={() => setIsHelpOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Support Center
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Help & Assistance</h3>
              <p className="text-xs text-slate-500">
                Need guidance using BusinessOS? Our support channels are available 24/7.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span>Helpline / WhatsApp</span>
                </div>
                <p className="text-slate-500">
                  Call or WhatsApp our business advisory team for instant setup or hardware assistance.
                </p>
                <a
                  href="tel:+233244000000"
                  className="inline-block font-bold text-blue-600 hover:text-blue-700"
                >
                  +233 (0) 244 000 000
                </a>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  <span>Email Support</span>
                </div>
                <p className="text-slate-500">
                  Submit technical requests or enterprise queries via email.
                </p>
                <p className="font-bold text-slate-700">support@businessos.cloud</p>
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 rounded-2xl border border-blue-100 flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Cloud offline caching ensures your sales continue even with low network.</span>
              </div>
            </div>

            <button
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Business Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-up relative">
            <button
              onClick={() => setIsProfileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Workspace Identity
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Business Profile</h3>
              <p className="text-xs text-slate-500">
                Registered identity details under secure multi-tenant isolation.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Business Name</span>
                <span className="font-bold text-slate-800">{business.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Category</span>
                <span className="font-bold text-slate-800">{business.category || business.businessType}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Operating Currency</span>
                <span className="font-bold text-slate-800">{business.currency || 'GHC'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-medium">Phone Contact</span>
                <span className="font-bold text-slate-800">{business.phone || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-medium">Tenant ID</span>
                <span className="font-mono font-bold text-blue-700">BOS-{business.id.slice(2).toUpperCase()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {authorizedTabs.includes('Settings') && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onNavigate('Settings');
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                >
                  Edit in Settings
                </button>
              )}
              <button
                onClick={() => setIsProfileOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
