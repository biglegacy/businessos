/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { firestore, doc, getDoc, deleteDoc } from '../lib/firebase';
import { User, Business, PaystackSettings, GlobalSystemConfig, REQUIRED_BUSINESS_TYPES, BusinessPopupPrompt, SmsTimingDetails } from '../types';
import { 
  Building, Users, Shield, CheckCircle2, AlertTriangle, Trash2, 
  Search, Plus, X, Edit, RotateCcw, Activity, LogOut, Lock, Eye, EyeOff,
  Sliders, CreditCard, Key, Globe, Database, Upload, Download, RefreshCw,
  Settings, Check, Zap, Server, FileText, Bell, GraduationCap, Menu,
  MessageSquare, MessageSquareOff, Send, Smartphone, ShieldCheck, DollarSign, Sparkles,
  Clock, Calendar, Layers, ExternalLink, Filter, CheckCircle, Mail, Phone, GitBranch,
  LayoutGrid, Table as TableIcon, ChevronDown, ChevronUp, ArrowDown, CheckSquare, Square,
  Radio
} from 'lucide-react';
import { hashPassword } from './AuthPortal';
import { AdminFeatureChangeLog } from '../types';
import { ImageUploadInput } from './ImageUploadInput';
import { AdminNotifications } from './AdminNotifications';
import { AdminPricingManagement } from './admin/AdminPricingManagement';
import { AdminPopupManagement } from './admin/AdminPopupManagement';

interface SuperAdminProps {
  onLogout: () => void;
  onManageBusiness?: (business: Business) => void;
}

export function SuperAdmin({ onLogout, onManageBusiness }: SuperAdminProps) {
  const [activeTab, setActiveTab] = useState<
    'businesses' | 'pricing' | 'popups' | 'paynow' | 'sms' | 'users' | 'notifications' | 'registration' | 'system' | 'cloud' | 'monitoring' | 'features'
  >('businesses');

  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [bizCategoryFilter, setBizCategoryFilter] = useState<'all' | 'school' | 'other'>('all');
  const [bizViewMode, setBizViewMode] = useState<'cards' | 'table'>('cards');
  
  // Reload trigger
  const [trigger, setTrigger] = useState(0);
  const forceUpdate = () => setTrigger(prev => prev + 1);

  // Real-time listener and reactive Firestore businesses state
  const [firestoreBusinesses, setFirestoreBusinesses] = useState<Business[]>(() => db.getBusinesses());

  useEffect(() => {
    // Initial fetch directly from Firestore to ensure real database state
    db.fetchBusinessesFromFirestore().then(items => {
      setFirestoreBusinesses(items);
    }).catch(() => {});

    const unsubscribe = db.subscribe(() => {
      setFirestoreBusinesses(db.getBusinesses());
      forceUpdate();
    });
    return () => unsubscribe();
  }, []);

  // --- Paystack Settings State ---
  const [payNowState, setPayNowState] = useState<PaystackSettings>(() => db.getPaystackSettings());
  const [showPayNowSecret, setShowPayNowSecret] = useState(false);
  const [payNowTesting, setPayNowTesting] = useState(false);
  const [payNowTestResult, setPayNowTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // --- Central Arkesel SMS Settings State ---
  const [smsConfig, setSmsConfig] = useState<{
    provider: string;
    senderId: string;
    apiEndpoint: string;
    isEnabled: boolean;
    hasApiKey: boolean;
    maskedApiKey: string;
    lastTestedAt: string | null;
    lastTestStatus: string;
    lastTestMessage: string | null;
    totalSentCount: number;
  }>({
    provider: 'Arkesel',
    senderId: 'Legacy Inc',
    apiEndpoint: 'https://sms.arkesel.com/sms/api?action=send-sms',
    isEnabled: true,
    hasApiKey: false,
    maskedApiKey: '',
    lastTestedAt: null,
    lastTestStatus: 'Not Connected',
    lastTestMessage: null,
    totalSentCount: 0
  });

  const [smsApiKeyInput, setSmsApiKeyInput] = useState('');
  const [smsSenderIdInput, setSmsSenderIdInput] = useState('Legacy Inc');
  const [smsEndpointInput, setSmsEndpointInput] = useState('https://sms.arkesel.com/sms/api?action=send-sms');
  const [smsIsEnabled, setSmsIsEnabled] = useState(true);
  const [showSmsApiKey, setShowSmsApiKey] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsSaveMessage, setSmsSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test SMS & Connection States
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testSmsMessage, setTestSmsMessage] = useState('BusinessOS SMS configuration test successful.');
  const [testSmsBusinessId, setTestSmsBusinessId] = useState('');
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<{
    status: string;
    message: string;
    success: boolean;
    smsId?: string;
    recipient?: string;
    displayMessage?: string;
    deliveryStatus?: string;
    deliveredAt?: string;
    timings?: SmsTimingDetails;
  } | null>(null);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    balance?: any;
    details?: any;
  } | null>(null);

  // SMS Delivery Logs State
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [isLoadingSmsLogs, setIsLoadingSmsLogs] = useState(false);

  // Multi-Network Diagnostic & Delivery Status Polling States
  const [mtnDiagnosticNumber, setMtnDiagnosticNumber] = useState('');
  const [telecelDiagnosticNumber, setTelecelDiagnosticNumber] = useState('');
  const [airtelTigoDiagnosticNumber, setAirtelTigoDiagnosticNumber] = useState('');
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);
  const [checkingSmsId, setCheckingSmsId] = useState<string | null>(null);
  const [isSyncingStatuses, setIsSyncingStatuses] = useState(false);
  const [statusSyncMessage, setStatusSyncMessage] = useState<string | null>(null);

  // =========================================================================
  // SUPER ADMIN BUSINESS PRICING MANAGEMENT STATE
  // =========================================================================
  const [pricingList, setPricingList] = useState<any[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [pricingSearch, setPricingSearch] = useState('');
  const [editingPriceBusId, setEditingPriceBusId] = useState<string | null>(null);
  const [editingPriceAmount, setEditingPriceAmount] = useState<string>('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [pricingMessage, setPricingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPricingList = async () => {
    setIsLoadingPricing(true);
    try {
      const list = await db.getBusinessPricingList();
      setPricingList(list || []);
    } catch (err) {
      console.warn('Error loading business pricing:', err);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const handleUpdatePrice = async (businessId: string, customAmount?: number) => {
    const val = customAmount !== undefined ? customAmount : Number(editingPriceAmount);
    if (isNaN(val) || val <= 0) {
      setPricingMessage({ type: 'error', text: 'Please enter a valid positive price amount in GHS.' });
      return;
    }

    setIsSavingPrice(true);
    setPricingMessage(null);
    try {
      const res = await db.updateBusinessPrice(businessId, val, 'Super Admin');
      if (res.success) {
        setPricingMessage({ type: 'success', text: res.message || 'Pricing updated successfully!' });
        setEditingPriceBusId(null);
        setEditingPriceAmount('');
        await loadPricingList();
        forceUpdate();
      } else {
        setPricingMessage({ type: 'error', text: res.message || 'Failed to update pricing.' });
      }
    } catch (err: any) {
      setPricingMessage({ type: 'error', text: err.message || 'Network error updating price.' });
    } finally {
      setIsSavingPrice(false);
      setTimeout(() => setPricingMessage(null), 5000);
    }
  };

  // =========================================================================
  // SUPER ADMIN PER-BUSINESS & BULK SMS CONTROL (Requirement 1 & 12)
  // =========================================================================
  const [businessSmsSearch, setBusinessSmsSearch] = useState('');
  const [togglingSmsBusId, setTogglingSmsBusId] = useState<string | null>(null);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [isBulkTogglingSms, setIsBulkTogglingSms] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isGlobalSmsToggling, setIsGlobalSmsToggling] = useState(false);
  const [bulkSmsFeedback, setBulkSmsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleBusinessSms = async (busId: string, currentStatus: boolean) => {
    setTogglingSmsBusId(busId);
    const newStatus = !currentStatus;
    setFirestoreBusinesses(prev => prev.map(b => b.id === busId ? { ...b, smsEnabled: newStatus } : b));
    try {
      await db.toggleBusinessSms(busId, newStatus);
      const fresh = await db.fetchBusinessesFromFirestore();
      if (fresh && fresh.length > 0) {
        setFirestoreBusinesses(fresh);
      }
      forceUpdate();
    } catch (e) {
      console.warn('Error toggling business SMS:', e);
    } finally {
      setTogglingSmsBusId(null);
    }
  };

  const handleSetBusinessSms = async (busId: string, enable: boolean) => {
    setTogglingSmsBusId(busId);
    // Instant optimistic update
    setFirestoreBusinesses(prev => prev.map(b => b.id === busId ? { ...b, smsEnabled: enable } : b));
    try {
      await db.toggleBusinessSms(busId, enable);
      const fresh = await db.fetchBusinessesFromFirestore();
      if (fresh && fresh.length > 0) {
        setFirestoreBusinesses(fresh);
      }
      forceUpdate();
    } catch (e) {
      console.warn('Error setting business SMS:', e);
    } finally {
      setTogglingSmsBusId(null);
    }
  };

  const handleBulkToggleSms = async (enable: boolean) => {
    if (selectedBusinessIds.length === 0) return;
    setIsBulkTogglingSms(true);
    setBulkSmsFeedback(null);
    // Instant optimistic update
    setFirestoreBusinesses(prev => prev.map(b => selectedBusinessIds.includes(b.id) ? { ...b, smsEnabled: enable } : b));
    try {
      const res = await db.toggleBulkBusinessSms(selectedBusinessIds, enable);
      const fresh = await db.fetchBusinessesFromFirestore();
      if (fresh && fresh.length > 0) {
        setFirestoreBusinesses(fresh);
      }
      forceUpdate();
      const count = res.updatedCount || selectedBusinessIds.length;
      setBulkSmsFeedback({
        type: 'success',
        text: `Successfully ${enable ? 'ENABLED' : 'DISABLED'} SMS for all ${count} selected business${count === 1 ? '' : 'es'}. Status updated in database.`
      });
      setSelectedBusinessIds([]);
      setTimeout(() => setBulkSmsFeedback(null), 6000);
    } catch (e: any) {
      console.error('Error in bulk SMS toggle:', e);
      setBulkSmsFeedback({
        type: 'error',
        text: 'Failed to update SMS status for selected businesses. Please retry.'
      });
    } finally {
      setIsBulkTogglingSms(false);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedBusinessIds.length === 0 || isBulkDeleting) return;
    setIsBulkDeleting(true);
    const idsToDelete = [...selectedBusinessIds];
    setIsBulkDeleteModalOpen(false);

    // Instant optimistic removal from UI
    setFirestoreBusinesses(prev => prev.filter(b => !idsToDelete.includes(b.id)));
    setSelectedBusinessIds([]);

    try {
      const currentUser = db.getCurrentUser() || { id: 'superadmin', email: 'admin@businessos.com', name: 'Super Admin' };
      const res = await db.bulkDeleteBusinesses(idsToDelete, currentUser);

      const fresh = await db.fetchBusinessesFromFirestore();
      setFirestoreBusinesses(fresh);
      setBulkSmsFeedback({
        type: 'success',
        text: `Successfully deleted ${res.deletedCount} business${res.deletedCount === 1 ? '' : 'es'} from the database.`
      });
      forceUpdate();
      setTimeout(() => setBulkSmsFeedback(null), 6000);
    } catch (err: any) {
      console.error('Bulk deletion error:', err);
      // Revert if error
      const fresh = await db.fetchBusinessesFromFirestore();
      setFirestoreBusinesses(fresh);
      setBulkSmsFeedback({
        type: 'error',
        text: `Bulk deletion error: ${err?.message || 'Failed to delete selected businesses.'}`
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDeleteBusinesses = () => {
    if (selectedBusinessIds.length === 0 || isBulkDeleting) return;
    setIsBulkDeleteModalOpen(true);
  };

  const handleGlobalToggleSms = async (enable: boolean) => {
    if (isGlobalSmsToggling) return;
    const actionText = enable ? 'ENABLE' : 'DISABLE';
    const confirmMsg = `Are you sure you want to ${actionText} SMS messaging for ALL registered businesses? This setting saves to the database and takes effect immediately for all POS terminals.`;
    if (!window.confirm(confirmMsg)) return;

    setIsGlobalSmsToggling(true);
    setBulkSmsFeedback(null);
    try {
      const res = await db.toggleAllBusinessesSms(enable);
      const fresh = await db.fetchBusinessesFromFirestore();
      if (fresh && fresh.length > 0) {
        setFirestoreBusinesses(fresh);
      }
      forceUpdate();
      setBulkSmsFeedback({
        type: 'success',
        text: `Successfully ${enable ? 'ENABLED' : 'DISABLED'} SMS for all ${res.updatedCount} registered businesses.`
      });
      setTimeout(() => setBulkSmsFeedback(null), 6000);
    } catch (err: any) {
      console.error('Global SMS toggle error:', err);
      setBulkSmsFeedback({
        type: 'error',
        text: `Failed to update global SMS setting: ${err?.message || 'Error'}`
      });
    } finally {
      setIsGlobalSmsToggling(false);
    }
  };

  const handleToggleSelectBusiness = (busId: string) => {
    setSelectedBusinessIds(prev => 
      prev.includes(busId) ? prev.filter(id => id !== busId) : [...prev, busId]
    );
  };

  const handleSelectAllFiltered = (list: Business[]) => {
    const allIds = list.map(b => b.id);
    const isAllSelected = allIds.length > 0 && allIds.every(id => selectedBusinessIds.includes(id));
    if (isAllSelected) {
      setSelectedBusinessIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedBusinessIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  // =========================================================================
  // SUPER ADMIN POPUP PROMPTS SYSTEM STATE
  // =========================================================================
  const [popupPrompts, setPopupPrompts] = useState<BusinessPopupPrompt[]>([]);
  const [isLoadingPopups, setIsLoadingPopups] = useState(false);
  const [isPopupModalOpen, setIsPopupModalOpen] = useState(false);
  const [previewingPopup, setPreviewingPopup] = useState<BusinessPopupPrompt | null>(null);
  const [isSavingPopup, setIsSavingPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const defaultPopupFormData: Partial<BusinessPopupPrompt> = {
    title: '',
    message: '',
    daysAfterRegistration: 7, // 5 to 30 days
    targetType: 'all',
    targetBusinessIds: [],
    status: 'active',
    category: 'onboarding',
    actionButtonText: 'Learn More',
    actionUrlOrTab: '',
    allowRepeatDisplay: false,
    expirationDate: ''
  };

  const [popupFormData, setPopupFormData] = useState<Partial<BusinessPopupPrompt>>(defaultPopupFormData);

  const loadPopupPrompts = async () => {
    setIsLoadingPopups(true);
    try {
      const prompts = await db.getAdminPopupPrompts();
      setPopupPrompts(prompts || []);
    } catch (err) {
      console.warn('Error loading popup prompts:', err);
    } finally {
      setIsLoadingPopups(false);
    }
  };

  const handleSavePopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!popupFormData.title?.trim() || !popupFormData.message?.trim()) {
      setPopupMessage({ type: 'error', text: 'Title and message are required.' });
      return;
    }

    // Strict validation: daysAfterRegistration must be 5 to 30 days
    const rawDays = Number(popupFormData.daysAfterRegistration);
    const validatedDays = Math.min(30, Math.max(5, isNaN(rawDays) ? 7 : Math.round(rawDays)));

    setIsSavingPopup(true);
    setPopupMessage(null);

    try {
      const res = await db.savePopupPrompt({
        ...popupFormData,
        daysAfterRegistration: validatedDays
      });

      if (res.success) {
        setPopupMessage({ type: 'success', text: res.message || 'Popup prompt saved successfully!' });
        setIsPopupModalOpen(false);
        setPopupFormData(defaultPopupFormData);
        await loadPopupPrompts();
      } else {
        setPopupMessage({ type: 'error', text: res.message || 'Failed to save popup prompt.' });
      }
    } catch (err: any) {
      setPopupMessage({ type: 'error', text: err.message || 'Network error saving popup.' });
    } finally {
      setIsSavingPopup(false);
      setTimeout(() => setPopupMessage(null), 5000);
    }
  };

  const handleDeletePopup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled popup prompt?')) return;
    try {
      const res = await db.deletePopupPrompt(id);
      if (res.success) {
        setPopupPrompts(prev => prev.filter(p => p.id !== id));
        setPopupMessage({ type: 'success', text: 'Popup prompt deleted successfully.' });
      } else {
        setPopupMessage({ type: 'error', text: res.message || 'Failed to delete.' });
      }
    } catch (err: any) {
      setPopupMessage({ type: 'error', text: err.message || 'Error deleting popup.' });
    }
    setTimeout(() => setPopupMessage(null), 4000);
  };

  const handleTogglePopupStatus = async (prompt: BusinessPopupPrompt) => {
    const updatedStatus = prompt.status === 'active' ? 'inactive' : 'active';
    try {
      await db.savePopupPrompt({ ...prompt, status: updatedStatus });
      setPopupPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, status: updatedStatus } : p));
    } catch (err) {
      console.warn('Error toggling popup status:', err);
    }
  };

  // Initial load on mount to retrieve saved Arkesel configuration immediately
  useEffect(() => {
    loadSmsConfigAndLogs();
  }, []);

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === 'sms') {
      loadSmsConfigAndLogs();
    } else if (activeTab === 'pricing') {
      loadPricingList();
    } else if (activeTab === 'popups') {
      loadPopupPrompts();
    }
  }, [activeTab]);

  const loadSmsConfigAndLogs = async () => {
    setIsLoadingSmsLogs(true);
    try {
      const data = await db.getSmsSettings();
      if (data) {
        setSmsConfig(data);
        setSmsSenderIdInput(data.senderId || 'Legacy Inc');
        setSmsEndpointInput(data.apiEndpoint || 'https://sms.arkesel.com/sms/api?action=send-sms');
        setSmsIsEnabled(data.isEnabled !== undefined ? data.isEnabled : true);
        if (data.maskedApiKey) {
          setSmsApiKeyInput(data.maskedApiKey);
        }
      }
      const logs = await db.getSmsLogs();
      setSmsLogs(logs || []);
    } catch (err) {
      console.warn('Error loading SMS configuration:', err);
    } finally {
      setIsLoadingSmsLogs(false);
    }
  };

  const handleSaveSmsConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSmsSaving(true);
    setSmsSaveMessage(null);

    try {
      const result = await db.saveSmsSettings({
        apiKey: smsApiKeyInput,
        senderId: smsSenderIdInput,
        apiEndpoint: smsEndpointInput,
        isEnabled: smsIsEnabled
      });

      if (result.success) {
        setSmsSaveMessage({ type: 'success', text: 'Arkesel API settings saved successfully.' });
        if (result.config) {
          setSmsConfig(prev => ({ ...prev, ...result.config }));
          if (result.config.maskedApiKey) {
            setSmsApiKeyInput(result.config.maskedApiKey);
          }
        }
        await loadSmsConfigAndLogs();
      } else {
        setSmsSaveMessage({ type: 'error', text: result.message || 'Failed to save Arkesel API settings. Please try again.' });
      }
    } catch (err: any) {
      setSmsSaveMessage({ type: 'error', text: 'Failed to save Arkesel API settings. Please try again.' });
    } finally {
      setSmsSaving(false);
      setTimeout(() => setSmsSaveMessage(null), 6000);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await db.testSmsConnection(smsApiKeyInput);
      setConnectionTestResult(res);
      const updatedConfig = await db.getSmsSettings();
      if (updatedConfig) setSmsConfig(updatedConfig);
    } catch (err: any) {
      setConnectionTestResult({
        success: false,
        message: 'Arkesel connection failed. Please check your API key and configuration.'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleToggleGlobalSms = async (enabled: boolean) => {
    try {
      const res = await db.toggleGlobalSms(enabled);
      setSmsIsEnabled(res.isEnabled);
      setSmsConfig(prev => ({ ...prev, isEnabled: res.isEnabled }));
      setSmsSaveMessage({
        type: 'success',
        text: res.isEnabled ? '✓ Arkesel SMS service enabled globally.' : '✓ Arkesel SMS service disabled globally.'
      });
      setTimeout(() => setSmsSaveMessage(null), 5000);
    } catch (e) {
      console.warn('Error toggling global SMS:', e);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhoneNumber.trim()) {
      setTestSmsResult({
        success: false,
        status: 'Invalid phone number',
        message: '✕ Test SMS failed. Please provide a valid recipient phone number.'
      });
      return;
    }

    setIsSendingTestSms(true);
    setTestSmsResult(null);

    const targetBus = businesses.find(b => b.id === testSmsBusinessId) || businesses[0];
    const clientTriggerTime = Date.now();
    try {
      const res = await db.sendTestSms(
        testPhoneNumber.trim(), 
        testSmsMessage.trim(), 
        clientTriggerTime,
        targetBus?.id,
        targetBus?.name
      );
      setTestSmsResult(res);

      // Refresh configuration and logs immediately without artificial delays
      db.getSmsSettings().then(cfg => { if (cfg) setSmsConfig(cfg); });
      db.getSmsLogs().then(logs => { if (logs) setSmsLogs(logs); });

      // Automatically track delivery status from Arkesel until terminal status is reached (Requirement 7)
      if (res.success && res.smsId) {
        let attempts = 0;
        const targetId = res.smsId;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await db.checkSmsDeliveryStatus(targetId);
            if (statusRes && statusRes.success && statusRes.status) {
              const upper = statusRes.status.toUpperCase();
              const isTerminal = ['DELIVERED', 'NOT_DELIVERED', 'EXPIRED', 'PROHIBITED'].includes(upper);

              if (isTerminal || attempts >= 8) {
                clearInterval(pollInterval);
                let newMsg = 'SMS submitted successfully to Arkesel. Delivery confirmation pending.';
                if (upper === 'DELIVERED') {
                  newMsg = '✓ SMS delivered successfully';
                } else if (upper === 'NOT_DELIVERED') {
                  newMsg = '✕ SMS not delivered';
                } else if (upper === 'EXPIRED') {
                  newMsg = '⚠ SMS expired before delivery';
                } else if (upper === 'PROHIBITED') {
                  newMsg = '✕ SMS delivery prohibited';
                }

                setTestSmsResult(prev => prev ? {
                  ...prev,
                  status: upper,
                  deliveryStatus: statusRes.deliveryStatus || upper.toLowerCase(),
                  displayMessage: newMsg,
                  deliveredAt: upper === 'DELIVERED' ? (statusRes.data?.sent_at_time || new Date().toLocaleTimeString()) : prev.deliveredAt
                } : null);

                const refreshedLogs = await db.getSmsLogs();
                if (refreshedLogs) setSmsLogs(refreshedLogs);
              }
            }
          } catch (e) {}
          if (attempts >= 8) {
            clearInterval(pollInterval);
          }
        }, 2200);
      }
    } catch (err: any) {
      setTestSmsResult({
        success: false,
        status: 'Network error',
        message: '✕ Test SMS failed. Please check your Arkesel configuration.'
      });
    } finally {
      setIsSendingTestSms(false);
    }
  };

  const handleCheckSmsStatus = async (smsId: string) => {
    if (!smsId) return;
    setCheckingSmsId(smsId);
    try {
      const res = await db.checkSmsDeliveryStatus(smsId);
      if (res && res.success) {
        setSmsLogs(prevLogs => prevLogs.map(l => {
          if (l.smsId === smsId) {
            return {
              ...l,
              status: res.status || l.status,
              deliveryStatus: res.deliveryStatus || l.deliveryStatus,
              deliveredAt: res.deliveryStatus === 'delivered' ? (l.deliveredAt || new Date().toISOString()) : l.deliveredAt,
              response: res.data?.status || res.data?.message || l.response
            };
          }
          return l;
        }));
      }
    } catch (err) {
      console.warn('Error checking SMS status:', err);
    } finally {
      setCheckingSmsId(null);
    }
  };

  const handleSyncSmsStatuses = async () => {
    setIsSyncingStatuses(true);
    setStatusSyncMessage(null);
    try {
      const res = await db.refreshPendingSmsStatuses();
      setStatusSyncMessage(res.message || 'Delivery statuses synchronized with Arkesel.');
      const updatedLogs = await db.getSmsLogs();
      if (updatedLogs) setSmsLogs(updatedLogs);
    } catch (err: any) {
      setStatusSyncMessage('Failed to sync statuses: ' + (err.message || 'Network error'));
    } finally {
      setIsSyncingStatuses(false);
      setTimeout(() => setStatusSyncMessage(null), 5000);
    }
  };

  const handleRunMultiNetworkDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunningDiagnostic(true);
    setDiagnosticResult(null);
    try {
      const res = await db.runSmsDiagnostic({
        mtnNumber: mtnDiagnosticNumber.trim() || undefined,
        telecelNumber: telecelDiagnosticNumber.trim() || undefined,
        airtelTigoNumber: airtelTigoDiagnosticNumber.trim() || undefined,
        senderId: smsConfig.senderId || 'Legacy Inc'
      });
      setDiagnosticResult(res);
      const updatedLogs = await db.getSmsLogs();
      if (updatedLogs) setSmsLogs(updatedLogs);

      // Auto-poll terminal delivery status for diagnostic SMS IDs
      if (res && Array.isArray(res.results)) {
        const pendingSmsIds = res.results.filter((r: any) => r.accepted && r.smsId).map((r: any) => r.smsId);
        if (pendingSmsIds.length > 0) {
          let diagAttempts = 0;
          const diagPoll = setInterval(async () => {
            diagAttempts++;
            let allFinished = true;
            for (const id of pendingSmsIds) {
              try {
                const sRes = await db.checkSmsDeliveryStatus(id);
                if (sRes && sRes.success && sRes.status) {
                  const upper = sRes.status.toUpperCase();
                  setDiagnosticResult((prev: any) => {
                    if (!prev || !prev.results) return prev;
                    return {
                      ...prev,
                      results: prev.results.map((item: any) => {
                        if (item.smsId === id) {
                          return {
                            ...item,
                            currentDeliveryStatus: upper,
                            deliveryStatus: sRes.deliveryStatus || upper.toLowerCase(),
                            deliveredAt: upper === 'DELIVERED' ? (sRes.data?.sent_at_time || new Date().toLocaleTimeString()) : item.deliveredAt
                          };
                        }
                        return item;
                      })
                    };
                  });
                  if (!['DELIVERED', 'NOT_DELIVERED', 'EXPIRED', 'PROHIBITED'].includes(upper)) {
                    allFinished = false;
                  }
                }
              } catch (e) {}
            }
            if (allFinished || diagAttempts >= 8) {
              clearInterval(diagPoll);
              const refreshedLogs = await db.getSmsLogs();
              if (refreshedLogs) setSmsLogs(refreshedLogs);
            }
          }, 2200);
        }
      }
    } catch (err: any) {
      setDiagnosticResult({
        success: false,
        error: err.message || 'Failed to execute diagnostic'
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

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
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>('');
  const [isDeletingInProgress, setIsDeletingInProgress] = useState<boolean>(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const deleteModalScrollRef = useRef<HTMLDivElement>(null);
  const [deleteModalAtBottom, setDeleteModalAtBottom] = useState<boolean>(false);

  const handleScrollDeleteModal = () => {
    if (!deleteModalScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = deleteModalScrollRef.current;
    setDeleteModalAtBottom(scrollTop + clientHeight >= scrollHeight - 30);
  };

  const toggleDeleteModalScroll = () => {
    if (!deleteModalScrollRef.current) return;
    if (deleteModalAtBottom) {
      deleteModalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      deleteModalScrollRef.current.scrollTo({ 
        top: deleteModalScrollRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

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

  // Fetch current data from reactive Firestore state
  const businesses = firestoreBusinesses;
  const validBusinessIds = new Set(businesses.map(b => b.id));
  const users = db.getUsers().filter(u => 
    u && u.role !== 'admin' && 
    ((u.businessId && validBusinessIds.has(u.businessId)) || (u.schoolId && validBusinessIds.has(u.schoolId)))
  );
  const logs = db.getAllLogs().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Platform Metrics
  const totalBusinesses = businesses.length;
  const totalUsers = users.length;
  const activeBusinesses = businesses.filter(b => b.status === 'active').length;

  // Retrieve pricing plans for plan resolution
  const pricingPlans = db.getPricingPlans() || [];

  // Helper to compile comprehensive business dossier details
  const getBusinessDetails = (bus: Business) => {
    const isSchool = bus.category?.toLowerCase().includes('school') || bus.businessType?.toLowerCase().includes('school');
    const matchedPlan = pricingPlans.find(p => p.id === bus.pricingPlanId);
    const planName = matchedPlan?.name || bus.subscriptionPlan || (isSchool ? 'School Standard' : 'BusinessOS Standard');
    const priceDisplay = (bus.subscriptionAmount !== undefined && bus.subscriptionAmount !== null)
      ? `${bus.currency || 'GHS'} ${bus.subscriptionAmount}/mo`
      : (matchedPlan ? `${matchedPlan.currency || bus.currency || 'GHS'} ${matchedPlan.price}/mo` : 'Free / Included');
    const subStatus = bus.subscriptionStatus || (bus.status === 'active' ? 'active' : 'trial');
    
    // Branches
    const branches = db.getBranches(bus.id);
    const branchCount = Array.isArray(branches) && branches.length > 0 ? branches.length : 1;

    // Users / Employees
    const busUsers = users.filter(u => u && (u.businessId === bus.id || u.schoolId === bus.id));
    const staffCount = busUsers.length;

    // Registration Date
    const regDateVal = bus.registrationDate || bus.createdAt;
    const formattedRegDate = regDateVal
      ? new Date(regDateVal).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : 'N/A';

    // Last Activity / Login
    const lastActVal = bus.updatedAt || bus.lastPaymentDate || bus.createdAt;
    const formattedLastAct = lastActVal
      ? new Date(lastActVal).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : 'Recent';

    // Next Payment / Expiry
    const nextPayVal = bus.nextPaymentDate || bus.trialEndDate || bus.subscriptionCycleEndDate;
    const formattedNextPay = nextPayVal
      ? new Date(nextPayVal).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : null;

    return {
      isSchool,
      planName,
      priceDisplay,
      subStatus,
      branchCount,
      staffCount,
      formattedRegDate,
      formattedLastAct,
      formattedNextPay,
      busUsers
    };
  };

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

  const handleDeleteBusiness = (targetOrId: Business | string) => {
    const bus = typeof targetOrId === 'string' ? businesses.find(b => b.id === targetOrId) : targetOrId;
    if (!bus) return;
    setDeleteErrorMessage(null);
    setDeleteConfirmInput('');
    setDeleteModalAtBottom(false);
    setDeletingBusinessTarget(bus);
  };

  const executeDeleteBusiness = async () => {
    if (!deletingBusinessTarget || isDeletingInProgress) return;

    const target = deletingBusinessTarget;
    const busId = target.id;
    const busName = target.name || busId;

    setIsDeletingInProgress(true);
    setDeleteErrorMessage(null);

    // Instant optimistic update for immediate feedback
    setFirestoreBusinesses(prev => prev.filter(b => b.id !== busId));
    if (viewingBusiness?.id === busId) {
      setViewingBusiness(null);
    }

    try {
      // 1. Purge via db.deleteBusinessPermanent (handles Firestore doc + subcollections + tombstone + backend call)
      const currentUser = db.getCurrentUser() || { id: 'superadmin', email: 'admin@businessos.com', name: 'Super Admin' };
      await db.deleteBusinessPermanent(busId, currentUser);

      // 2. Query Firestore directly to verify business document no longer exists
      try {
        const checkDoc = await getDoc(doc(firestore, 'bos_businesses', busId));
        if (checkDoc.exists()) {
          await deleteDoc(doc(firestore, 'bos_businesses', busId));
        }
      } catch (e) {}

      // 3. Immediately query Firestore to refresh businesses list
      const freshBusinesses = await db.fetchBusinessesFromFirestore();
      setFirestoreBusinesses(freshBusinesses);

      setDeletingBusinessTarget(null);
      setDeleteConfirmInput('');
      setDeleteSuccessMessage(`Business / School "${busName}" and all associated database records have been permanently deleted.`);
      setTimeout(() => setDeleteSuccessMessage(null), 6000);
      forceUpdate();
    } catch (err: any) {
      console.error('Delete business error:', err);
      // If failed, keep the affected business visible and show clear error message
      const freshBusinesses = await db.fetchBusinessesFromFirestore();
      setFirestoreBusinesses(freshBusinesses);
      const msg = err?.message || 'Business deletion failed. Please try again.';
      setDeleteErrorMessage(msg);
    } finally {
      setIsDeletingInProgress(false);
    }
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
  const filteredBusinesses = businesses.filter(b => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = b.name?.toLowerCase().includes(term) ||
      b.ownerName?.toLowerCase().includes(term) ||
      b.email?.toLowerCase().includes(term) ||
      (b.phone && b.phone.toLowerCase().includes(term)) ||
      b.category?.toLowerCase().includes(term) ||
      (b.businessType && b.businessType.toLowerCase().includes(term)) ||
      b.id?.toLowerCase().includes(term);

    const isSchool = (b.category === 'School / Educational Institution' || b.businessType === 'School / Educational Institution' || b.category?.toLowerCase().includes('school'));
    if (bizCategoryFilter === 'school') return matchesSearch && isSchool;
    if (bizCategoryFilter === 'other') return matchesSearch && !isSchool;
    return matchesSearch;
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesBus = userBusFilter === 'all' || u.businessId === userBusFilter;
    return matchesSearch && matchesRole && matchesBus;
  });

  const superAdminNavContent = (
    <>
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-xs shadow-emerald-500/20">
            S
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-base tracking-tight leading-none">SuperAdmin</h1>
            <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-bold">BOS Global Control</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileNavOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <button
          onClick={() => { setActiveTab('businesses'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'businesses' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="h-4 w-4 text-current" /> Businesses &amp; Schools
        </button>

        <button
          onClick={() => { setActiveTab('pricing'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'pricing' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="h-4 w-4 text-current" /> Pricing Management
        </button>

        <button
          onClick={() => { setActiveTab('popups'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'popups' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="h-4 w-4 text-current" /> Popup Prompts (5-30d)
        </button>

        <button
          onClick={() => { setActiveTab('paynow'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'paynow' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="h-4 w-4 text-current" /> Paystack API Settings
        </button>

        <button
          id="nav-superadmin-sms"
          onClick={() => { setActiveTab('sms'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'sms' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="h-4 w-4 text-current" /> SMS / Arkesel
        </button>

        <button
          onClick={() => { setActiveTab('users'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'users' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4 text-current" /> Global User Directory
        </button>

        <button
          onClick={() => { setActiveTab('notifications'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'notifications' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="h-4 w-4 text-current" /> Push Notifications
        </button>

        <button
          onClick={() => { setActiveTab('registration'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'registration' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="h-4 w-4 text-current" /> Registration Control
        </button>

        <button
          onClick={() => { setActiveTab('system'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'system' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="h-4 w-4 text-current" /> System Configuration
        </button>

        <button
          onClick={() => { setActiveTab('cloud'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'cloud' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="h-4 w-4 text-current" /> Cloud &amp; Storage
        </button>

        <button
          onClick={() => { setActiveTab('monitoring'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'monitoring' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="h-4 w-4 text-current" /> Platform Monitoring
        </button>

        <button
          onClick={() => { setActiveTab('features'); setSearchTerm(''); setIsMobileNavOpen(false); }}
          className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeTab === 'features' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="h-4 w-4 text-current" /> Feature Gates
        </button>
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
          <div className="truncate">
            <p className="text-xs font-bold text-slate-900 truncate">Administrator</p>
            <p className="text-[10px] text-slate-500 truncate font-mono">admin@business.os</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Secure Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div id="superadmin-root" className="min-h-screen lg:h-screen bg-slate-50 flex flex-col lg:flex-row font-sans lg:overflow-hidden">
      {/* Mobile Drawer Overlay */}
      {isMobileNavOpen && (
        <div 
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 lg:hidden"
        />
      )}

      {/* Mobile Slide-Out Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white text-slate-700 border-r border-slate-200 flex flex-col shadow-2xl transition-transform duration-200 ease-in-out lg:hidden ${
        isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {superAdminNavContent}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white text-slate-700 border-r border-slate-200 flex-col shrink-0 lg:h-full shadow-xs">
        {superAdminNavContent}
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 lg:h-full lg:overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-white text-slate-900 border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              S
            </div>
            <div>
              <h2 className="text-xs font-black tracking-tight leading-none text-slate-900">SuperAdmin</h2>
              <span className="text-[9px] text-blue-600 font-bold uppercase">Control Panel</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between shrink-0">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            {activeTab === 'businesses' && <><Building className="h-4 w-4 text-emerald-600" /> Business Tenants Management</>}
            {activeTab === 'pricing' && <><DollarSign className="h-4 w-4 text-emerald-600" /> Super Admin Business Pricing Management</>}
            {activeTab === 'popups' && <><Sparkles className="h-4 w-4 text-amber-500" /> Registration-Based Popup Prompts (5-30 Days)</>}
            {activeTab === 'paynow' && <><CreditCard className="h-4 w-4 text-emerald-600" /> Paystack API Gateway Settings</>}
            {activeTab === 'sms' && <><MessageSquare className="h-4 w-4 text-emerald-600" /> Central SMS Gateway (Arkesel)</>}
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
        <div id="superadmin-scroll-container" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Deletion Success Toast Banner */}
          {deleteSuccessMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-emerald-900 font-bold shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{deleteSuccessMessage}</span>
              </div>
              <button 
                onClick={() => setDeleteSuccessMessage(null)}
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Businesses</p>
                <h3 className="text-xl font-black text-slate-800 mt-1">{totalBusinesses}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Building className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Workspaces</p>
                <h3 className="text-xl font-black text-emerald-700 mt-1">{activeBusinesses}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Users</p>
                <h3 className="text-xl font-black text-slate-800 mt-1">{totalUsers}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paystack Gateway</p>
                <h3 className="text-xs font-extrabold text-emerald-800 uppercase mt-1 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {payNowState.environment}
                </h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </section>

          {/* TAB 1: Businesses */}
          {activeTab === 'businesses' && (
            <div className="space-y-4">
              {/* Category Filter Chips & Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                  <button
                    onClick={() => setBizCategoryFilter('all')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[38px] ${
                      bizCategoryFilter === 'all' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({businesses.length})
                  </button>
                  <button
                    onClick={() => setBizCategoryFilter('school')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 min-h-[38px] ${
                      bizCategoryFilter === 'school' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" /> Schools ({businesses.filter(b => b.category?.toLowerCase().includes('school')).length})
                  </button>
                  <button
                    onClick={() => setBizCategoryFilter('other')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[38px] ${
                      bizCategoryFilter === 'other' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Retail &amp; Other ({businesses.filter(b => !b.category?.toLowerCase().includes('school')).length})
                  </button>

                  {/* Quick Select All Toggle for Bulk Actions */}
                  <button
                    type="button"
                    onClick={() => handleSelectAllFiltered(filteredBusinesses)}
                    className={`ml-1 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[38px] border ${
                      filteredBusinesses.length > 0 && filteredBusinesses.every(b => selectedBusinessIds.includes(b.id))
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Select or deselect all visible businesses for bulk actions"
                  >
                    {filteredBusinesses.length > 0 && filteredBusinesses.every(b => selectedBusinessIds.includes(b.id)) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>
                      {filteredBusinesses.length > 0 && filteredBusinesses.every(b => selectedBusinessIds.includes(b.id))
                        ? 'Deselect All'
                        : `Select All (${filteredBusinesses.length})`}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Global SMS Controls */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                    <button
                      type="button"
                      id="btn-global-enable-sms"
                      disabled={isGlobalSmsToggling}
                      onClick={() => handleGlobalToggleSms(true)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[36px] bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200/60 shadow-xs disabled:opacity-50"
                      title="Enable SMS for all registered businesses in the system"
                    >
                      {isGlobalSmsToggling ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />}
                      <span className="hidden md:inline">Enable SMS All</span>
                    </button>
                    <button
                      type="button"
                      id="btn-global-disable-sms"
                      disabled={isGlobalSmsToggling}
                      onClick={() => handleGlobalToggleSms(false)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[36px] bg-white text-rose-700 hover:bg-rose-50 border border-slate-200/60 shadow-xs disabled:opacity-50"
                      title="Disable SMS for all registered businesses in the system"
                    >
                      {isGlobalSmsToggling ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <MessageSquareOff className="h-3.5 w-3.5 text-rose-600" />}
                      <span className="hidden md:inline">Disable SMS All</span>
                    </button>
                  </div>

                  {/* View Mode Switcher: Cards vs Table */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBizViewMode('cards')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                        bizViewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Card Layout View"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setBizViewMode('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                        bizViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Table Layout View"
                    >
                      <TableIcon className="h-3.5 w-3.5" /> Table
                    </button>
                  </div>

                  <button
                    onClick={handleOpenRegisterBusiness}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition min-h-[44px]"
                  >
                    <Plus className="h-4 w-4" /> Register Business
                  </button>
                </div>
              </div>

              {/* BULK ACTION TOOLBAR (When businesses are selected) */}
              {selectedBusinessIds.length > 0 && (
                <div id="bulk-sms-action-bar" className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                      {selectedBusinessIds.length}
                    </div>
                    <div>
                      <p className="font-extrabold text-blue-950 text-sm">
                        {selectedBusinessIds.length} {selectedBusinessIds.length === 1 ? 'Business' : 'Businesses'} Selected
                      </p>
                      <p className="text-[11px] text-blue-700 font-medium">
                        Apply bulk actions across all selected businesses at once.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                    <button
                      type="button"
                      id="btn-bulk-enable-sms"
                      disabled={isBulkTogglingSms || isBulkDeleting}
                      onClick={() => handleBulkToggleSms(true)}
                      className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer min-h-[40px]"
                      title="Enable SMS for all selected businesses"
                    >
                      {isBulkTogglingSms ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                      <span>Enable SMS ({selectedBusinessIds.length})</span>
                    </button>

                    <button
                      type="button"
                      id="btn-bulk-disable-sms"
                      disabled={isBulkTogglingSms || isBulkDeleting}
                      onClick={() => handleBulkToggleSms(false)}
                      className="flex-1 md:flex-initial px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer min-h-[40px]"
                      title="Disable SMS for all selected businesses"
                    >
                      {isBulkTogglingSms ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquareOff className="h-4 w-4" />
                      )}
                      <span>Disable SMS ({selectedBusinessIds.length})</span>
                    </button>

                    <button
                      type="button"
                      id="btn-bulk-delete-selected"
                      disabled={isBulkDeleting || isBulkTogglingSms}
                      onClick={handleBulkDeleteBusinesses}
                      className="flex-1 md:flex-initial px-4 py-2.5 bg-rose-800 hover:bg-rose-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer min-h-[40px]"
                      title="Permanently delete all selected businesses"
                    >
                      {isBulkDeleting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span>Delete Selected ({selectedBusinessIds.length})</span>
                    </button>

                    <button
                      type="button"
                      id="btn-bulk-clear-selection"
                      onClick={() => setSelectedBusinessIds([])}
                      className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px]"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              {/* Bulk Action Feedback Banner */}
              {bulkSmsFeedback && (
                <div id="bulk-sms-feedback-banner" className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold ${
                  bulkSmsFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {bulkSmsFeedback.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                    )}
                    <span>{bulkSmsFeedback.text}</span>
                  </div>
                  <button 
                    onClick={() => setBulkSmsFeedback(null)} 
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* CARDS VIEW: Responsive across all screen sizes (Desktop, Tablet, Mobile) */}
              {bizViewMode === 'cards' && (
                <div className="space-y-4">
                  {filteredBusinesses.map(bus => {
                    const details = getBusinessDetails(bus);
                    const isSelected = selectedBusinessIds.includes(bus.id);

                    return (
                      <div 
                        key={bus.id} 
                        id={`business-card-${bus.id}`}
                        className={`bg-white p-4 sm:p-5 rounded-2xl border ${
                          isSelected ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm' : 'border-slate-200 shadow-xs'
                        } space-y-4 transition hover:border-slate-300`}
                      >
                        {/* Card Header: Identity & Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            {/* Checkbox for Bulk Multi-Select */}
                            <input
                              type="checkbox"
                              id={`chk-select-card-${bus.id}`}
                              checked={isSelected}
                              onChange={() => handleToggleSelectBusiness(bus.id)}
                              className="h-5 w-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0 accent-blue-600"
                              title={`Select ${bus.name} for bulk SMS action`}
                            />

                            <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm ${
                              details.isSchool ? 'bg-indigo-600 shadow-indigo-100' : 'bg-emerald-600 shadow-emerald-100'
                            }`}>
                              {details.isSchool ? <GraduationCap className="h-5 w-5" /> : bus.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-base leading-tight">{bus.name}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                  ID: {bus.id}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  details.isSchool ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {bus.category || bus.businessType || 'General'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Account & Sub Status Badges */}
                          <div className="flex items-center sm:flex-col sm:items-end gap-1.5 shrink-0">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              bus.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${bus.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                              {bus.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              details.subStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                              details.subStatus === 'trial' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              Sub: {details.subStatus}
                            </span>
                          </div>
                        </div>

                        {/* VISIBLE ACTION AREA: Positioned UP right below the card header for immediate accessibility */}
                        <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/80">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                              Business Management Actions
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {details.isSchool ? 'School Tenant' : 'Commercial Tenant'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                            {/* 1. Open Workspace Dashboard */}
                            {onManageBusiness && (
                              <button
                                type="button"
                                id={`btn-open-${bus.id}`}
                                onClick={() => onManageBusiness(bus)}
                                className="col-span-2 sm:col-span-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer min-h-[44px]"
                                title={`Open ${details.isSchool ? 'School' : 'Business'} Workspace Dashboard`}
                              >
                                <Building className="h-4 w-4 shrink-0" />
                                <span className="truncate">Open {details.isSchool ? 'School' : 'Dashboard'}</span>
                              </button>
                            )}

                            {/* 2. View Details */}
                            <button
                              type="button"
                              id={`btn-view-${bus.id}`}
                              onClick={() => setViewingBusiness(bus)}
                              className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition cursor-pointer min-h-[44px] shadow-2xs"
                              title="View full business details and credentials"
                            >
                              <Eye className="h-4 w-4 text-slate-600 shrink-0" />
                              <span className="truncate">View Details</span>
                            </button>

                            {/* 3. Edit Details */}
                            <button
                              type="button"
                              id={`btn-edit-${bus.id}`}
                              onClick={() => handleEditBusinessClick(bus)}
                              className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 transition cursor-pointer min-h-[44px]"
                              title="Edit business parameters and contact information"
                            >
                              <Edit className="h-4 w-4 shrink-0" />
                              <span className="truncate">Edit Details</span>
                            </button>

                            {/* 4. Suspend / Activate */}
                            <button
                              type="button"
                              id={`btn-toggle-status-${bus.id}`}
                              onClick={() => handleToggleBusinessStatus(bus.id, bus.status)}
                              className={`py-2.5 px-3 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[44px] border ${
                                bus.status === 'active'
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                              }`}
                              title={bus.status === 'active' ? 'Suspend Business Workspace' : 'Activate Business Workspace'}
                            >
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span className="truncate">{bus.status === 'active' ? 'Suspend' : 'Activate'}</span>
                            </button>

                            {/* 5. DELETE BUSINESS BUTTON - High visibility, red styling, immediately accessible */}
                            <button
                              type="button"
                              id={`btn-delete-business-${bus.id}`}
                              onClick={() => handleDeleteBusiness(bus.id)}
                              className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-rose-200 transition cursor-pointer min-h-[44px] shadow-2xs hover:border-rose-300"
                              title={`Permanently Delete ${details.isSchool ? 'School' : 'Business'} and its records`}
                            >
                              <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
                              <span className="truncate">Delete Business</span>
                            </button>
                          </div>
                        </div>

                        {/* DEDICATED BUSINESS-SPECIFIC SMS CONTROLS (Directly attached to each business card) */}
                        <div id={`sms-controls-${bus.id}`} className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              bus.smsEnabled !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {bus.smsEnabled !== false ? <MessageSquare className="h-4 w-4" /> : <MessageSquareOff className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-slate-800">SMS Status:</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  bus.smsEnabled !== false ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${bus.smsEnabled !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                  {bus.smsEnabled !== false ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {bus.smsEnabled !== false 
                                  ? 'Automatic SMS receipts & POS messages are active' 
                                  : 'SMS messaging disabled for this business'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              id={`btn-enable-sms-${bus.id}`}
                              disabled={togglingSmsBusId === bus.id || bus.smsEnabled !== false}
                              onClick={() => handleSetBusinessSms(bus.id, true)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[36px] ${
                                bus.smsEnabled !== false
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                              title={`Enable SMS for ${bus.name}`}
                            >
                              {togglingSmsBusId === bus.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              <span>Enable SMS</span>
                            </button>

                            <button
                              type="button"
                              id={`btn-disable-sms-${bus.id}`}
                              disabled={togglingSmsBusId === bus.id || bus.smsEnabled === false}
                              onClick={() => handleSetBusinessSms(bus.id, false)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[36px] ${
                                bus.smsEnabled === false
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                              }`}
                              title={`Disable SMS for ${bus.name}`}
                            >
                              {togglingSmsBusId === bus.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              <span>Disable SMS</span>
                            </button>
                          </div>
                        </div>

                        {/* Comprehensive Business Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                          {/* Owner & Contact */}
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {details.isSchool ? 'Principal / Head' : 'Business Owner'}
                            </p>
                            <p className="font-bold text-slate-800 text-sm">{bus.ownerName}</p>
                            <p className="text-slate-600 font-mono text-[11px] flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{bus.email}</span>
                            </p>
                            <p className="text-slate-700 font-mono text-[11px] flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{bus.phone || 'No phone recorded'}</span>
                            </p>
                          </div>

                          {/* Subscription & Pricing */}
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subscription &amp; Plan</p>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-800 text-xs">{details.planName}</span>
                              <span className="font-black text-emerald-800 text-xs bg-emerald-100/70 px-1.5 py-0.2 rounded">
                                {details.priceDisplay}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[11px]">
                              Cycle/Expiry: <strong className="text-slate-700 font-mono">{details.formattedNextPay || 'Active'}</strong>
                            </p>
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="text-[10px] text-slate-400 font-mono">Currency: {bus.currency || 'GHC'}</span>
                            </div>
                          </div>

                          {/* Scale & Activity */}
                          <div className="space-y-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scale &amp; Capacity</p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-700 font-semibold">
                              <span className="flex items-center gap-1">
                                <GitBranch className="h-3.5 w-3.5 text-slate-400" /> {details.branchCount} {details.branchCount === 1 ? 'Branch' : 'Branches'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-slate-400" /> {details.staffCount} {details.staffCount === 1 ? 'Staff' : 'Staff'}
                              </span>
                            </div>
                          </div>

                          {/* Dates & Timeline */}
                          <div className="space-y-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Timeline &amp; Activity</p>
                            <p className="text-[11px] text-slate-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                              Registered: <span className="font-semibold text-slate-700">{details.formattedRegDate}</span>
                            </p>
                            <p className="text-[11px] text-slate-600 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                              Last Activity: <span className="font-semibold text-slate-700">{details.formattedLastAct}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredBusinesses.length === 0 && (
                    <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                      No registered {bizCategoryFilter === 'school' ? 'schools' : 'businesses'} match your filter criteria.
                    </div>
                  )}
                </div>
              )}

              {/* TABLE VIEW: Responsive Table with Sticky Action Column */}
              {bizViewMode === 'table' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1240px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-3.5 px-3 w-12 text-center">
                          <input
                            type="checkbox"
                            id="chk-table-select-all"
                            checked={filteredBusinesses.length > 0 && filteredBusinesses.every(b => selectedBusinessIds.includes(b.id))}
                            onChange={() => handleSelectAllFiltered(filteredBusinesses)}
                            className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            title="Select all filtered businesses"
                          />
                        </th>
                        <th className="py-3.5 px-4">Business &amp; Identifier</th>
                        <th className="py-3.5 px-4">Owner &amp; Contact</th>
                        <th className="py-3.5 px-4">Category &amp; Scale</th>
                        <th className="py-3.5 px-4">Plan &amp; Subscription</th>
                        <th className="py-3.5 px-4">SMS Status &amp; Controls</th>
                        <th className="py-3.5 px-4">Account Status</th>
                        <th className="py-3.5 px-4">Dates &amp; Activity</th>
                        <th className="py-3.5 px-4 text-center min-w-[360px] bg-slate-100/90 border-l border-slate-200 sticky right-0 z-10 shadow-xs">Super Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                      {filteredBusinesses.map(bus => {
                        const details = getBusinessDetails(bus);
                        const isSelected = selectedBusinessIds.includes(bus.id);

                        return (
                          <tr key={bus.id} className={`transition ${isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50/70'}`}>
                            {/* Checkbox */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                id={`chk-table-bus-${bus.id}`}
                                checked={isSelected}
                                onChange={() => handleToggleSelectBusiness(bus.id)}
                                className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                title={`Select ${bus.name}`}
                              />
                            </td>

                            {/* 1. Name & ID */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm ${
                                  details.isSchool ? 'bg-indigo-600' : 'bg-emerald-600'
                                }`}>
                                  {details.isSchool ? <GraduationCap className="h-4 w-4" /> : bus.name.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-900 block text-sm">{bus.name}</span>
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded border border-slate-200">
                                    {bus.id}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 2. Owner & Contact */}
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-800 block">{bus.ownerName}</span>
                              <span className="text-slate-500 font-mono text-[11px] block">{bus.email}</span>
                              <span className="text-slate-500 font-mono text-[11px] block">{bus.phone || '—'}</span>
                            </td>

                            {/* 3. Category & Scale */}
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                details.isSchool ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {bus.category || bus.businessType || 'General'}
                              </span>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                                <span>{details.branchCount} {details.branchCount === 1 ? 'branch' : 'branches'}</span>
                                <span>•</span>
                                <span>{details.staffCount} staff</span>
                              </div>
                            </td>

                            {/* 4. Plan & Sub */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-800">{details.planName}</span>
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1 rounded text-[10px]">
                                  {details.priceDisplay}
                                </span>
                              </div>
                              <div className="mt-1">
                                <span className="text-[10px] text-slate-400 font-mono">Currency: {bus.currency || 'GHC'}</span>
                              </div>
                            </td>

                            {/* 4.5 Dedicated SMS Status & Controls */}
                            <td className="py-3 px-4">
                              <div className="space-y-1.5 min-w-[150px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">Status:</span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    bus.smsEnabled !== false ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${bus.smsEnabled !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                    {bus.smsEnabled !== false ? 'Enabled' : 'Disabled'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    id={`tbl-enable-sms-${bus.id}`}
                                    disabled={togglingSmsBusId === bus.id || bus.smsEnabled !== false}
                                    onClick={() => handleSetBusinessSms(bus.id, true)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                      bus.smsEnabled !== false 
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' 
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    }`}
                                    title="Enable SMS"
                                  >
                                    {togglingSmsBusId === bus.id && bus.smsEnabled === false ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Enable'}
                                  </button>
                                  <button
                                    type="button"
                                    id={`tbl-disable-sms-${bus.id}`}
                                    disabled={togglingSmsBusId === bus.id || bus.smsEnabled === false}
                                    onClick={() => handleSetBusinessSms(bus.id, false)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                      bus.smsEnabled === false 
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' 
                                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                    }`}
                                    title="Disable SMS"
                                  >
                                    {togglingSmsBusId === bus.id && bus.smsEnabled !== false ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Disable'}
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* 5. Account Status */}
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  bus.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${bus.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                  {bus.status === 'active' ? 'Active' : 'Suspended'}
                                </span>
                                <div>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                    details.subStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                                    details.subStatus === 'trial' ? 'bg-blue-100 text-blue-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {details.subStatus}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 6. Dates & Timeline */}
                            <td className="py-3 px-4">
                              <div className="text-[11px] text-slate-500 space-y-0.5">
                                <div>Reg: <span className="font-semibold text-slate-700">{details.formattedRegDate}</span></div>
                                <div>Act: <span className="font-semibold text-slate-700">{details.formattedLastAct}</span></div>
                              </div>
                            </td>

                            {/* 7. Super Admin Actions (Sticky Right) */}
                            <td className="py-3 px-4 bg-slate-50/80 border-l border-slate-200 sticky right-0 z-10">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {/* Action 1: View */}
                                <button
                                  type="button"
                                  id={`table-btn-view-${bus.id}`}
                                  onClick={() => setViewingBusiness(bus)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[36px]"
                                  title="View Full Profile & Credentials"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-500" /> View
                                </button>

                                {/* Action 2: Open Workspace */}
                                {onManageBusiness && (
                                  <button
                                    type="button"
                                    id={`table-btn-open-${bus.id}`}
                                    onClick={() => onManageBusiness(bus)}
                                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs min-h-[36px]"
                                    title={`Open ${details.isSchool ? 'School' : 'Business'} Workspace Dashboard`}
                                  >
                                    <Building className="h-3.5 w-3.5" /> Open
                                  </button>
                                )}

                                {/* Action 3: Edit */}
                                <button
                                  type="button"
                                  id={`table-btn-edit-${bus.id}`}
                                  onClick={() => handleEditBusinessClick(bus)}
                                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[36px]"
                                  title="Edit Business Parameters & Configuration"
                                >
                                  <Edit className="h-3.5 w-3.5 text-indigo-600" /> Edit
                                </button>

                                {/* Action 4: Suspend / Activate */}
                                <button
                                  type="button"
                                  id={`table-btn-toggle-status-${bus.id}`}
                                  onClick={() => handleToggleBusinessStatus(bus.id, bus.status)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border min-h-[36px] ${
                                    bus.status === 'active' 
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' 
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                                  }`}
                                  title={bus.status === 'active' ? 'Suspend Business Workspace' : 'Activate Business Workspace'}
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {bus.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>

                                {/* Action 5: Delete Business */}
                                <button
                                  type="button"
                                  id={`table-btn-delete-${bus.id}`}
                                  onClick={() => handleDeleteBusiness(bus.id)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[36px]"
                                  title={`Permanently Delete ${details.isSchool ? 'School' : 'Business'} and its records`}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Delete Business
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredBusinesses.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            No registered {bizCategoryFilter === 'school' ? 'schools' : 'business tenants'} match your search query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: Business Pricing Management */}
          {activeTab === 'pricing' && (
            <AdminPricingManagement />
          )}

          {/* TAB: Registration-Based Popup Prompts */}
          {activeTab === 'popups' && (
            <AdminPopupManagement />
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

          {/* TAB: Central Arkesel SMS Settings */}
          {activeTab === 'sms' && (
            <div className="space-y-6">
              {/* Header & Status Overview */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                        <MessageSquare className="h-5 w-5 text-emerald-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400">Settings</span>
                          <span className="text-slate-300">/</span>
                          <h3 className="font-extrabold text-slate-900 text-base">
                            SMS / Arkesel
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Official Arkesel SMS Gateway Integration &amp; Platform-Wide Delivery
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* SMS Service: Enabled / Disabled Badge */}
                    <div className="flex items-center gap-2 mr-2">
                      <span className="text-xs font-bold text-slate-600">SMS Service:</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                        smsIsEnabled 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        <span className={`h-2 w-2 rounded-full ${smsIsEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {smsIsEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    {/* Enable SMS Button */}
                    <button
                      type="button"
                      id="btn-enable-sms"
                      onClick={() => handleToggleGlobalSms(true)}
                      disabled={smsIsEnabled}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[40px] ${
                        smsIsEnabled 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Enable SMS
                    </button>

                    {/* Disable SMS Button */}
                    <button
                      type="button"
                      id="btn-disable-sms"
                      onClick={() => handleToggleGlobalSms(false)}
                      disabled={!smsIsEnabled}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[40px] ${
                        !smsIsEnabled 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                      }`}
                    >
                      <X className="h-3.5 w-3.5" />
                      Disable SMS
                    </button>

                    <button
                      type="button"
                      onClick={loadSmsConfigAndLogs}
                      disabled={isLoadingSmsLogs}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[40px]"
                      title="Refresh status & logs"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSmsLogs ? 'animate-spin text-emerald-600' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMS Provider</p>
                    <p className="font-extrabold text-slate-800 text-sm mt-0.5">Arkesel</p>
                    <p className="text-[10px] text-emerald-700 font-semibold">Official Gateway v2</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sender ID</p>
                    <p className="font-extrabold text-slate-800 text-sm mt-0.5 font-mono">{smsConfig.senderId || 'Legacy Inc'}</p>
                    <p className="text-[10px] text-slate-500">Max 11 Alphanumeric</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMS Service Status</p>
                    <p className={`font-extrabold text-sm mt-0.5 ${smsIsEnabled ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {smsIsEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <p className="text-[10px] text-slate-500">Global Service State</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Test Status</p>
                    <p className={`font-extrabold text-sm mt-0.5 ${
                      smsConfig.lastTestStatus === 'Success' ? 'text-emerald-700' : 
                      smsConfig.lastTestStatus === 'Not Connected' ? 'text-slate-500' : 'text-rose-600'
                    }`}>
                      {smsConfig.lastTestStatus || 'Not Connected'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {smsConfig.lastTestedAt ? new Date(smsConfig.lastTestedAt).toLocaleDateString() : 'Never tested'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Controls Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Arkesel Configuration Form */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Key className="h-4 w-4 text-emerald-700" /> Arkesel Configuration
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure Arkesel SMS gateway credentials. Saved securely to Firestore as source of truth.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg uppercase">
                      Firestore Synced
                    </span>
                  </div>

                  {smsSaveMessage && (
                    <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      smsSaveMessage.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}>
                      {smsSaveMessage.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span>{smsSaveMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveSmsConfig} className="space-y-4 text-xs">
                    {/* SMS Provider */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        SMS Provider
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Arkesel"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm cursor-not-allowed"
                      />
                    </div>

                    {/* Arkesel API Key */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                          Arkesel API Key <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSmsApiKey(!showSmsApiKey)}
                          className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {showSmsApiKey ? (
                            <><EyeOff className="h-3 w-3" /> Hide Key</>
                          ) : (
                            <><Eye className="h-3 w-3" /> Reveal Key</>
                          )}
                        </button>
                      </div>
                      <input
                        type={showSmsApiKey ? 'text' : 'password'}
                        id="input-arkesel-api-key"
                        value={smsApiKeyInput}
                        onChange={(e) => setSmsApiKeyInput(e.target.value)}
                        placeholder="e.g. b291... or leave masked to retain existing key"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        autoComplete="off"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Obtained from your Arkesel account dashboard. Kept securely on the server; never exposed to browser bundles.
                      </p>
                    </div>

                    {/* Sender ID */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Default System Sender ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="input-arkesel-sender-id"
                        maxLength={11}
                        value={smsSenderIdInput}
                        onChange={(e) => setSmsSenderIdInput(e.target.value)}
                        placeholder="BusinessOS"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm uppercase focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      />
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        <span className="font-semibold text-emerald-700">Dynamic Sender Name:</span> When SMS are sent, the sender name is dynamically set to the registered business name (e.g. POS receipts, invoices, pharmacy, school notices). This input serves as the system default fallback.
                      </p>
                    </div>

                    {/* API Endpoint */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        API Endpoint
                      </label>
                      <input
                        type="url"
                        id="input-arkesel-endpoint"
                        value={smsEndpointInput}
                        onChange={(e) => setSmsEndpointInput(e.target.value)}
                        placeholder="https://sms.arkesel.com/sms/api?action=send-sms"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        High-speed Arkesel direct carrier gateway for instant delivery across MTN, Telecel, and AirtelTigo.
                      </p>
                    </div>

                    {/* SMS Service: Enabled / Disabled Selector */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-xs">
                          SMS Service: <span className={smsIsEnabled ? "text-emerald-700 font-extrabold" : "text-rose-600 font-extrabold"}>{smsIsEnabled ? "Enabled" : "Disabled"}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Toggle whether the system actively dispatches SMS receipts and notifications.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id="btn-enable-sms"
                          onClick={() => {
                            setSmsIsEnabled(true);
                            handleToggleGlobalSms(true);
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                            smsIsEnabled ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                          Enable SMS
                        </button>
                        <button
                          type="button"
                          id="btn-disable-sms"
                          onClick={() => {
                            setSmsIsEnabled(false);
                            handleToggleGlobalSms(false);
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                            !smsIsEnabled ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          <X className="h-3 w-3" />
                          Disable SMS
                        </button>
                      </div>
                    </div>

                    {/* Form Action Buttons */}
                    <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {/* Test Connection Button */}
                        <button
                          type="button"
                          id="btn-test-connection"
                          onClick={handleTestConnection}
                          disabled={isTestingConnection}
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow transition cursor-pointer flex items-center gap-2 min-h-[44px]"
                        >
                          {isTestingConnection ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                          ) : (
                            <Zap className="h-4 w-4 text-emerald-400" />
                          )}
                          Test Connection
                        </button>
                      </div>

                      {/* Save SMS Settings Button */}
                      <button
                        type="submit"
                        id="btn-save-sms-config"
                        disabled={smsSaving}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2 min-h-[44px]"
                      >
                        {smsSaving ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Save SMS Settings
                      </button>
                    </div>

                    {/* Connection Test Result Box */}
                    {isTestingConnection && (
                      <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                        <span>Testing Arkesel connection...</span>
                      </div>
                    )}

                    {connectionTestResult && !isTestingConnection && (
                      <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        connectionTestResult.success 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                          : 'bg-rose-50 border-rose-200 text-rose-950'
                      }`}>
                        <div className="flex items-center gap-2 font-bold">
                          {connectionTestResult.success ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                          )}
                          <span>
                            {connectionTestResult.message || (connectionTestResult.success 
                              ? 'Arkesel connection successful.' 
                              : 'Arkesel connection failed. Please check your API key and configuration.')}
                          </span>
                        </div>
                        {connectionTestResult.balance !== undefined && (
                          <p className="text-[11px] text-emerald-800 font-mono pl-6">
                            Current SMS Balance: {connectionTestResult.balance} units
                          </p>
                        )}
                      </div>
                    )}
                  </form>
                </div>

                {/* Right Column: Test SMS Sandbox */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-emerald-700" /> Send Test SMS
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Verify real live dispatch to a Ghanaian mobile number.
                      </p>
                    </div>

                    <form onSubmit={handleSendTestSms} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Sender Name (Registered Business)
                        </label>
                        {businesses.length > 0 ? (
                          <select
                            id="select-test-sms-business"
                            value={testSmsBusinessId || businesses[0]?.id || ''}
                            onChange={(e) => {
                              const chosenId = e.target.value;
                              setTestSmsBusinessId(chosenId);
                              const b = businesses.find(x => x.id === chosenId);
                              if (b) {
                                setTestSmsMessage(`${b.name}: SMS configuration test successful.`);
                              }
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-medium text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition bg-white cursor-pointer"
                          >
                            {businesses.map((b) => {
                              const previewId = b.name.length <= 11 ? b.name : b.name.replace(/\s+/g, '').slice(0, 11);
                              return (
                                <option key={b.id} value={b.id}>
                                  {b.name} (Sender ID: {previewId})
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div className="px-3.5 py-2 bg-slate-100 rounded-xl text-slate-600 text-xs">
                            No businesses registered yet. Using system default ({smsSenderIdInput || 'BusinessOS'}).
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 mt-1">
                          The SMS recipient will see this registered business name as the message Sender.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Test Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          id="input-test-phone"
                          value={testPhoneNumber}
                          onChange={(e) => setTestPhoneNumber(e.target.value)}
                          placeholder="e.g. 0244123456 or +233244123456"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Ghana local numbers (024, 055, etc.) are auto-normalized to international format (+233...).
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Test Message
                        </label>
                        <textarea
                          rows={3}
                          id="input-test-message"
                          value={testSmsMessage}
                          onChange={(e) => setTestSmsMessage(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        />
                      </div>

                      {/* Send Test SMS Button */}
                      <button
                        type="submit"
                        id="btn-send-test-sms"
                        disabled={isSendingTestSms || !testPhoneNumber.trim()}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                      >
                        {isSendingTestSms ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {isSendingTestSms ? 'Sending test SMS...' : 'Send Test SMS'}
                      </button>
                    </form>

                    {/* Test In Progress Notification */}
                    {isSendingTestSms && (
                      <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                        <span>Sending test SMS...</span>
                      </div>
                    )}

                    {/* Test Result Display */}
                    {testSmsResult && !isSendingTestSms && (
                      <div className={`p-4 rounded-xl border text-xs space-y-2 mt-4 transition-all ${
                        testSmsResult.status === 'DELIVERED' || testSmsResult.deliveryStatus === 'delivered'
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : testSmsResult.status === 'NOT_DELIVERED' || testSmsResult.status === 'PROHIBITED'
                            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                            : testSmsResult.status === 'EXPIRED'
                              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                              : testSmsResult.success
                                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                                : 'bg-rose-50/80 border-rose-200 text-rose-950'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                            testSmsResult.status === 'DELIVERED' || testSmsResult.deliveryStatus === 'delivered'
                              ? 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                              : testSmsResult.status === 'NOT_DELIVERED' || testSmsResult.status === 'PROHIBITED'
                                ? 'bg-rose-200 text-rose-900 border border-rose-300'
                                : testSmsResult.status === 'EXPIRED'
                                  ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                  : testSmsResult.success
                                    ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                    : 'bg-rose-200 text-rose-900 border border-rose-300'
                          }`}>
                            {testSmsResult.status === 'DELIVERED' || testSmsResult.deliveryStatus === 'delivered'
                              ? 'DELIVERED'
                              : testSmsResult.status === 'NOT_DELIVERED'
                                ? 'NOT DELIVERED'
                                : testSmsResult.status === 'EXPIRED'
                                  ? 'EXPIRED'
                                  : testSmsResult.status === 'PROHIBITED'
                                    ? 'PROHIBITED'
                                    : testSmsResult.success
                                      ? 'SUBMITTED'
                                      : 'FAILED'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="font-bold text-xs leading-relaxed flex items-center gap-1.5">
                          {testSmsResult.status === 'DELIVERED' || testSmsResult.deliveryStatus === 'delivered' ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="text-emerald-900">✓ SMS delivered successfully</span>
                            </>
                          ) : testSmsResult.status === 'NOT_DELIVERED' ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                              <span className="text-rose-900">✕ SMS not delivered</span>
                            </>
                          ) : testSmsResult.status === 'EXPIRED' ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                              <span className="text-amber-900">⚠ SMS expired before delivery</span>
                            </>
                          ) : testSmsResult.status === 'PROHIBITED' ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                              <span className="text-rose-900">✕ SMS delivery prohibited</span>
                            </>
                          ) : testSmsResult.success ? (
                            <>
                              <RefreshCw className="h-4 w-4 text-amber-600 animate-spin shrink-0" />
                              <span className="text-amber-900">SMS submitted successfully to Arkesel. Delivery confirmation pending.</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                              <span className="text-rose-900">✕ Test SMS failed. Please check your Arkesel configuration.</span>
                            </>
                          )}
                        </p>
                        {testSmsResult.recipient && (
                          <p className="text-[11px] text-slate-600 font-mono">
                            Target: {testSmsResult.recipient}
                          </p>
                        )}
                        {testSmsResult.smsId && (
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            Arkesel ID: {testSmsResult.smsId}
                          </p>
                        )}
                        {testSmsResult.timings && (
                          <div className="pt-2 border-t border-slate-200/60 mt-2 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-slate-700 flex items-center gap-1">
                                <Zap className="h-3.5 w-3.5 text-amber-600" /> Submission Speed:
                              </span>
                              <span className="bg-slate-200 text-slate-900 px-2 py-0.5 rounded-full font-mono">
                                {(testSmsResult.timings.totalSubmissionMs / 1000).toFixed(1)} seconds
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 pt-1">
                              <div className="bg-white/60 p-1.5 rounded border border-slate-200">
                                <span className="text-slate-400 block">Arkesel Gateway:</span>
                                <span className="font-mono font-bold text-slate-800">{testSmsResult.timings.arkeselLatencyMs} ms</span>
                              </div>
                              <div className="bg-white/60 p-1.5 rounded border border-slate-200">
                                <span className="text-slate-400 block">Delivery Status:</span>
                                <span className={`font-mono font-bold ${
                                  testSmsResult.status === 'DELIVERED' || testSmsResult.deliveryStatus === 'delivered'
                                    ? 'text-emerald-700'
                                    : testSmsResult.status === 'NOT_DELIVERED' || testSmsResult.status === 'PROHIBITED'
                                      ? 'text-rose-700'
                                      : 'text-amber-700'
                                }`}>
                                  {testSmsResult.status === 'DELIVERED' || testSmsResult.deliveryStatus === 'delivered'
                                    ? 'Delivered'
                                    : testSmsResult.status === 'NOT_DELIVERED'
                                      ? 'Not Delivered'
                                      : testSmsResult.status === 'EXPIRED'
                                        ? 'Expired'
                                        : testSmsResult.status === 'PROHIBITED'
                                          ? 'Prohibited'
                                          : 'Pending'}
                                </span>
                              </div>
                            </div>
                            {testSmsResult.deliveredAt && (
                              <div className="text-[10px] text-emerald-800 font-semibold pt-0.5">
                                Delivery Confirmed: {testSmsResult.deliveredAt}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Multi-Network Universal Diagnostic Tool (MTN, Telecel, AirtelTigo) */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                          <Radio className="h-4 w-4 text-emerald-700" /> Multi-Carrier Diagnostic Test
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Simultaneously test universal delivery across all Ghanaian telecom networks (MTN, Telecel, AirtelTigo).
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-lg uppercase">
                        Universal Delivery
                      </span>
                    </div>

                    <form onSubmit={handleRunMultiNetworkDiagnostic} className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-500" /> MTN Phone
                          </label>
                          <input
                            type="tel"
                            value={mtnDiagnosticNumber}
                            onChange={(e) => setMtnDiagnosticNumber(e.target.value)}
                            placeholder="0244123456"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-rose-800 uppercase mb-1 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-rose-500" /> Telecel Phone
                          </label>
                          <input
                            type="tel"
                            value={telecelDiagnosticNumber}
                            onChange={(e) => setTelecelDiagnosticNumber(e.target.value)}
                            placeholder="0208002240"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-blue-500" /> AirtelTigo Phone
                          </label>
                          <input
                            type="tel"
                            value={airtelTigoDiagnosticNumber}
                            onChange={(e) => setAirtelTigoDiagnosticNumber(e.target.value)}
                            placeholder="0277653421"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isRunningDiagnostic}
                        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-2 cursor-pointer min-h-[42px]"
                      >
                        {isRunningDiagnostic ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                            <span>Running multi-network carrier diagnostics...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 text-emerald-400" />
                            <span>Run Multi-Carrier Diagnostic (MTN, Telecel, AirtelTigo)</span>
                          </>
                        )}
                      </button>
                    </form>

                    {diagnosticResult && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Diagnostic Results:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            diagnosticResult.allAccepted 
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {diagnosticResult.allAccepted ? '✓ All Carriers Accepted' : 'Partial / Errors Detected'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {diagnosticResult.results?.map((res: any, idx: number) => {
                            const netBg = res.network === 'MTN' 
                              ? 'bg-amber-50 border-amber-200 text-amber-900' 
                              : res.network === 'Telecel' 
                                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                                : 'bg-blue-50 border-blue-200 text-blue-900';
                            
                            const badgeBg = res.network === 'MTN' 
                              ? 'bg-amber-200 text-amber-900' 
                              : res.network === 'Telecel' 
                                ? 'bg-rose-200 text-rose-900' 
                                : 'bg-blue-200 text-blue-900';

                            return (
                              <div key={idx} className={`p-3 rounded-xl border ${netBg} space-y-1.5 text-xs`}>
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${badgeBg}`}>
                                    {res.network}
                                  </span>
                                  <span className={`text-[10px] font-bold ${res.accepted ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {res.accepted ? 'Accepted' : 'Failed'}
                                  </span>
                                </div>
                                <p className="font-mono text-[11px] font-bold truncate">
                                  {res.normalizedNumber || res.rawNumber}
                                </p>
                                <div className="text-[10px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200/60">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Carrier:</span>
                                    <span className="font-semibold">{res.detectedCarrier} ({res.carrierPrefix || '233'})</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Arkesel ID:</span>
                                    <span className="font-mono font-semibold truncate max-w-[120px]">{res.smsId || 'None'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Status:</span>
                                    <span className={`font-extrabold uppercase ${
                                      res.currentDeliveryStatus === 'DELIVERED' || res.deliveryStatus === 'delivered'
                                        ? 'text-emerald-700'
                                        : res.currentDeliveryStatus === 'NOT_DELIVERED' || res.currentDeliveryStatus === 'PROHIBITED'
                                          ? 'text-rose-700'
                                          : 'text-amber-700'
                                    }`}>
                                      {res.currentDeliveryStatus === 'DELIVERED' || res.deliveryStatus === 'delivered'
                                        ? '✓ DELIVERED'
                                        : res.currentDeliveryStatus === 'NOT_DELIVERED'
                                          ? '✕ NOT DELIVERED'
                                          : res.currentDeliveryStatus === 'EXPIRED'
                                            ? '⚠ EXPIRED'
                                            : res.currentDeliveryStatus === 'PROHIBITED'
                                              ? '✕ PROHIBITED'
                                              : res.accepted
                                                ? 'SUBMITTED (Pending)'
                                                : 'FAILED'}
                                    </span>
                                  </div>
                                  {res.latencyMs && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Submission:</span>
                                      <span className="font-mono font-medium text-slate-700">{(res.latencyMs / 1000).toFixed(1)}s</span>
                                    </div>
                                  )}
                                  {res.deliveredAt && (
                                    <div className="text-[10px] text-emerald-800 font-semibold pt-0.5">
                                      Delivered: {res.deliveredAt}
                                    </div>
                                  )}
                                  {res.specificFailureReason && (
                                    <div className="text-rose-700 text-[10px] pt-1">
                                      Error: {res.specificFailureReason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Per-Business SMS Status & Control (Requirement 11 & 12) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-700" /> Per-Business SMS Gateway Control
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enable or disable SMS dispatch capability per registered business tenant. Enforced server-side.
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={businessSmsSearch}
                      onChange={(e) => setBusinessSmsSearch(e.target.value)}
                      placeholder="Search business..."
                      className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500 outline-none w-full sm:w-56"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-4">Business Name</th>
                        <th className="py-2.5 px-4">Industry / Type</th>
                        <th className="py-2.5 px-4">Owner Email</th>
                        <th className="py-2.5 px-4">SMS Status</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {businesses
                        .filter(b => 
                          !businessSmsSearch.trim() ||
                          b.name?.toLowerCase().includes(businessSmsSearch.toLowerCase()) ||
                          b.category?.toLowerCase().includes(businessSmsSearch.toLowerCase()) ||
                          b.email?.toLowerCase().includes(businessSmsSearch.toLowerCase())
                        )
                        .map(bus => {
                          const isSmsOn = bus.smsEnabled !== false;
                          const isToggling = togglingSmsBusId === bus.id;

                          return (
                            <tr key={bus.id} className="hover:bg-slate-50/60 transition">
                              <td className="py-2.5 px-4 font-bold text-slate-900">
                                {bus.name}
                                <span className="block text-[10px] text-slate-400 font-mono font-normal">ID: {bus.id}</span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                                  {bus.category || bus.businessType || 'Retail'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                                {bus.email || 'N/A'}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                  isSmsOn
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${isSmsOn ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  {isSmsOn ? 'SMS Enabled' : 'SMS Disabled'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={() => handleToggleBusinessSms(bus.id, isSmsOn)}
                                  disabled={isToggling}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[36px] ${
                                    isSmsOn
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  }`}
                                >
                                  {isToggling ? (
                                    <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Updating...</span>
                                  ) : isSmsOn ? (
                                    'Disable SMS'
                                  ) : (
                                    'Enable SMS'
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      {businesses.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            No registered businesses found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SMS Delivery Audit Logs with Live Arkesel Status Polling */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-700" /> Recent SMS Delivery Log &amp; Audit Trail
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Live telemetry across MTN, Telecel, and AirtelTigo with Arkesel delivery status synchronization.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusSyncMessage && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        {statusSyncMessage}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSyncSmsStatuses}
                      disabled={isSyncingStatuses}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[36px]"
                      title="Poll Arkesel for real delivery reports"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncingStatuses ? 'animate-spin text-emerald-600' : ''}`} />
                      {isSyncingStatuses ? 'Syncing...' : 'Sync Delivery Statuses'}
                    </button>
                    <span className="text-xs font-bold text-slate-500">
                      {smsLogs.length} Messages Logged
                    </span>
                  </div>
                </div>

                {/* Scannable Telemetry Summary Badges */}
                {smsLogs.length > 0 && (() => {
                  const deliveredCount = smsLogs.filter((l: any) => (l.status || '').toUpperCase() === 'DELIVERED' || l.deliveryStatus === 'delivered').length;
                  const submittedCount = smsLogs.filter((l: any) => {
                    const st = (l.status || '').toUpperCase();
                    return st === 'SUBMITTED' || st === 'QUEUED' || l.deliveryStatus === 'submitted' || l.deliveryStatus === 'queued';
                  }).length;
                  const failedCount = smsLogs.filter((l: any) => {
                    const st = (l.status || '').toUpperCase();
                    return st === 'FAILED' || st === 'NOT_DELIVERED' || st === 'PROHIBITED' || st === 'EXPIRED' || l.deliveryStatus === 'failed';
                  }).length;
                  const latencies = smsLogs.map((l: any) => l.latencyMs || l.timings?.arkeselLatencyMs || l.timings?.totalSubmissionMs).filter((n: any) => typeof n === 'number' && n > 0);
                  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : null;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Dispatched</span>
                        <p className="text-base font-extrabold text-slate-800 mt-0.5">{smsLogs.length}</p>
                      </div>
                      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Delivered</span>
                        <p className="text-base font-extrabold text-emerald-800 mt-0.5">{deliveredCount}</p>
                      </div>
                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
                        <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Submitted / In-Flight</span>
                        <p className="text-base font-extrabold text-blue-800 mt-0.5">{submittedCount}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Failed / Undelivered</span>
                        <p className={`text-base font-extrabold mt-0.5 ${failedCount > 0 ? 'text-rose-700' : 'text-slate-600'}`}>{failedCount}</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4">Recipient &amp; Network</th>
                        <th className="py-3 px-4">Sender ID</th>
                        <th className="py-3 px-4">Message Content</th>
                        <th className="py-3 px-4">Arkesel SMS ID</th>
                        <th className="py-3 px-4">Delivery Status</th>
                        <th className="py-3 px-4">Speed</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {smsLogs.map((log: any) => {
                        const rawStatus = (log.status || (log.success ? 'SUBMITTED' : 'FAILED')).toUpperCase();
                        const isDelivered = rawStatus === 'DELIVERED' || log.deliveryStatus === 'delivered';
                        const isSubmitted = rawStatus === 'SUBMITTED' || rawStatus === 'QUEUED' || log.deliveryStatus === 'submitted' || log.deliveryStatus === 'queued';
                        const latency = log.latencyMs || log.timings?.arkeselLatencyMs || log.timings?.totalSubmissionMs || 0;
                        const network = log.network || 'Ghana';
                        const smsId = log.smsId || null;
                        const isCheckingThis = checkingSmsId === smsId;

                        const networkPill = network === 'MTN'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : network === 'Telecel'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : network === 'AirtelTigo'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200';

                        const statusBadge = isDelivered
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isSubmitted
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : rawStatus === 'EXPIRED'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : rawStatus === 'PROHIBITED'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200';

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">
                              <div>{log.recipient}</div>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border mt-0.5 ${networkPill}`}>
                                {network}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-700 font-semibold">
                              {log.senderId || log.sender || 'Legacy Inc'}
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={log.message}>
                              {log.message}
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                              {smsId ? (
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-mono truncate block max-w-[110px]" title={smsId}>
                                  {smsId}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">None</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${statusBadge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  isDelivered ? 'bg-emerald-500' : isSubmitted ? 'bg-blue-500' : 'bg-rose-500'
                                }`} />
                                {rawStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                                <Zap className="h-2.5 w-2.5 text-emerald-600" />
                                {latency ? `${latency}ms` : 'Instant'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                              {new Date(log.timestamp || log.sentAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {smsId ? (
                                <button
                                  type="button"
                                  onClick={() => handleCheckSmsStatus(smsId)}
                                  disabled={isCheckingThis}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ml-auto"
                                  title="Check real delivery status from Arkesel"
                                >
                                  <RefreshCw className={`h-2.5 w-2.5 ${isCheckingThis ? 'animate-spin text-emerald-600' : ''}`} />
                                  {isCheckingThis ? 'Checking...' : 'Check Status'}
                                </button>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {smsLogs.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No SMS messages have been dispatched through the gateway yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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

              {/* Mobile Phone Cards for Users */}
              <div className="block lg:hidden space-y-3">
                {filteredUsers.map(user => {
                  const busName = businesses.find(b => b.id === user.businessId)?.name || 'Unknown Workspace';
                  return (
                    <div key={user.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{user.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                          user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          {user.status === 'active' ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Tenant Workspace:</span>
                          <span className="font-bold text-slate-800 text-xs">{busName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Role Permission:</span>
                          <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-md font-bold uppercase">
                            {user.role}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setResettingUserPass(user);
                            setNewPassVal('');
                          }}
                          className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition cursor-pointer min-h-[44px]"
                        >
                          <Lock className="h-3.5 w-3.5" /> Reset Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(user.id, user.status)}
                          className={`py-2.5 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition cursor-pointer min-h-[44px] ${
                            user.status === 'active' ? 'bg-amber-50 text-amber-800 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {user.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          className="col-span-2 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition cursor-pointer min-h-[44px]"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete User Account
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    No tenant user accounts match your filter.
                  </div>
                )}
              </div>

              {/* Desktop Table for Users */}
              <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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

            {(() => {
              const details = getBusinessDetails(viewingBusiness);
              const bizBranches = db.getBranches(viewingBusiness.id);
              const bizStaff = db.getUsers().filter(u => u.businessId === viewingBusiness.id);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Owner & Contact */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {details.isSchool ? 'Principal / Institution Head' : 'Business Owner'}
                      </p>
                      <p className="font-extrabold text-slate-800 text-sm">{viewingBusiness.ownerName}</p>
                      <p className="text-slate-600 font-mono text-[11px] flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{viewingBusiness.email}</span>
                      </p>
                      <p className="text-slate-700 font-mono text-[11px] flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{viewingBusiness.phone || 'No phone recorded'}</span>
                      </p>
                    </div>

                    {/* Subscription & Pricing */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subscription &amp; Billing</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{details.planName}</span>
                        <span className="text-emerald-800 font-black bg-emerald-100/70 px-2 py-0.5 rounded text-xs">
                          {details.priceDisplay}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          details.subStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                          details.subStatus === 'trial' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          Status: {details.subStatus}
                        </span>
                        {details.formattedNextPay && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Next: {details.formattedNextPay}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Default Currency: <strong className="text-slate-600 font-mono">{viewingBusiness.currency || 'GHC'}</strong>
                      </p>
                    </div>

                    {/* Scale: Branches & Staff */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branches &amp; Organization</p>
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                        <GitBranch className="h-4 w-4 text-slate-500" />
                        <span>{details.branchCount} {details.branchCount === 1 ? 'Registered Branch' : 'Registered Branches'}</span>
                      </div>
                      {bizBranches.length > 0 ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {bizBranches.map(b => (
                            <span key={b.id} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-700 font-medium">
                              {b.name} {b.isMain ? '(Main)' : ''}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Primary headquarters (default branch)</p>
                      )}
                    </div>

                    {/* Users & Staff Directory */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Users &amp; Staff Members</p>
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                        <Users className="h-4 w-4 text-slate-500" />
                        <span>{bizStaff.length} Total Users / Staff</span>
                      </div>
                      {bizStaff.length > 0 ? (
                        <div className="max-h-24 overflow-y-auto space-y-1 pt-1 pr-1">
                          {bizStaff.map(u => (
                            <div key={u.id} className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-200">
                              <span className="font-semibold text-slate-700 truncate max-w-[140px]">{u.name}</span>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded uppercase">{u.role}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No subordinate staff accounts</p>
                      )}
                    </div>
                  </div>

                  {/* Dates, System Features & Receipt Config */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registration &amp; Activity</p>
                      <p className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Registered On: <strong className="text-slate-800">{details.formattedRegDate}</strong>
                      </p>
                      <p className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Last Activity: <strong className="text-slate-800">{details.formattedLastAct}</strong>
                      </p>
                      <p className="text-[11px] text-slate-600 pt-1">
                        SMS Gateway: <strong className={viewingBusiness.smsEnabled !== false ? 'text-emerald-700' : 'text-slate-500'}>
                          {viewingBusiness.smsEnabled !== false ? 'Enabled' : 'Disabled'}
                        </strong>
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receipt Configuration</p>
                      <p className="text-slate-800 font-bold">{viewingBusiness.receiptConfig?.businessName || viewingBusiness.name}</p>
                      <p className="text-slate-500 text-[11px] whitespace-pre-line">{viewingBusiness.receiptConfig?.contactInfo || viewingBusiness.phone || 'No custom receipt header'}</p>
                    </div>
                  </div>

                  {/* System Features */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Enabled Capabilities &amp; Features</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(viewingBusiness.enabledFeatures || ["sales", "inventory", "customers", "suppliers", "reports"]).map(feat => (
                        <span key={feat} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded font-mono text-[10px] uppercase font-bold">
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {onManageBusiness && (
                  <button
                    type="button"
                    onClick={() => {
                      onManageBusiness(viewingBusiness);
                      setViewingBusiness(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition min-h-[40px]"
                  >
                    <Building className="h-4 w-4" /> Open Workspace
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const busToEdit = viewingBusiness;
                    setViewingBusiness(null);
                    handleEditBusinessClick(busToEdit);
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition min-h-[40px]"
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
                  className={`px-3.5 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition min-h-[40px] border ${
                    viewingBusiness.status === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
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
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition min-h-[40px]"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
                <button
                  type="button"
                  onClick={() => setViewingBusiness(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer min-h-[40px]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Permanent Business Deletion Confirmation Modal - Bounded size for mobile and PC with scroll button */}
      {deletingBusinessTarget && (
        <div 
          id="delete-business-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingInProgress) {
              setDeletingBusinessTarget(null);
            }
          }}
        >
          <div 
            id="delete-business-modal-card"
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[85vh] sm:max-h-[80vh] border border-slate-200 shadow-2xl relative flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-business-modal-title"
          >
            {/* Header: Fixed top with Scroll Button & Close */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <h3 id="delete-business-modal-title" className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                    Delete Business?
                  </h3>
                  <p className="text-[11px] text-rose-600 font-semibold truncate">Permanent Database Deletion</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Scroll Button in Header */}
                <button
                  type="button"
                  id="btn-scroll-delete-modal-header"
                  onClick={toggleDeleteModalScroll}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer min-h-[36px]"
                  title={deleteModalAtBottom ? "Scroll to top of modal" : "Scroll down to confirmation input"}
                >
                  {deleteModalAtBottom ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5 text-slate-600" />
                      <span className="hidden xs:inline">Top</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                      <span className="hidden xs:inline">Scroll</span>
                    </>
                  )}
                </button>

                {!isDeletingInProgress && (
                  <button
                    type="button"
                    onClick={() => setDeletingBusinessTarget(null)}
                    className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Content Body with smooth scrolling */}
            <div 
              ref={deleteModalScrollRef}
              onScroll={handleScrollDeleteModal}
              className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-3.5 text-xs text-slate-700 overscroll-contain"
            >
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-bold leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>
                    This will permanently delete the business and all of its associated data. This action cannot be undone.
                  </strong>
                  <p className="text-rose-700 font-normal mt-1">
                    All records for &ldquo;{deletingBusinessTarget.name}&rdquo; (ID: <span className="font-mono font-bold text-rose-900">{deletingBusinessTarget.id}</span>) will be permanently erased from Firestore.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">{deletingBusinessTarget.category === 'school' ? 'School Name:' : 'Business Name:'}</span>
                  <span className="font-extrabold text-slate-800 text-right truncate">{deletingBusinessTarget.name}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">Tenant ID:</span>
                  <span className="font-mono text-slate-700 text-[11px] font-bold">{deletingBusinessTarget.id}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">Owner / Principal:</span>
                  <span className="font-bold text-slate-800 text-right truncate">{deletingBusinessTarget.ownerName}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <span className="font-semibold text-slate-700 uppercase">{deletingBusinessTarget.category || deletingBusinessTarget.type}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
                <p className="font-bold text-amber-950 uppercase tracking-wider text-[10px]">
                  Data to be permanently wiped for this tenant only:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-900 font-medium">
                  <li>Workspace configuration, settings, and branding</li>
                  <li>All tenant users, roles, staff profiles &amp; credentials</li>
                  {deletingBusinessTarget.category === 'school' ? (
                    <>
                      <li>Student profiles, teachers, classes &amp; timetables</li>
                      <li>Tuition invoices, fee payments &amp; receipts</li>
                      <li>Daily attendance logs, exam grades &amp; reports</li>
                    </>
                  ) : (
                    <>
                      <li>All products, inventory, services &amp; stock movements</li>
                      <li>All POS sales, invoices, receipts &amp; payments</li>
                      <li>All customers, suppliers, expenses &amp; logs</li>
                    </>
                  )}
                  <li>All Firestore documents, subcollections &amp; attachments</li>
                </ul>
                <p className="text-[10px] text-emerald-800 font-bold pt-1">
                  ✓ Isolated tenant scope: Other businesses or schools are NOT affected.
                </p>
              </div>

              {/* Businesses count indicator */}
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Businesses being deleted:</span>
                <span className="font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                  1 Business
                </span>
              </div>

              {deleteErrorMessage && (
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold">
                  Error: {deleteErrorMessage}
                </div>
              )}

              {/* Progress indicator during deletion */}
              {isDeletingInProgress && (
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center gap-3 text-left">
                  <RefreshCw className="h-5 w-5 text-rose-500 animate-spin shrink-0" />
                  <div>
                    <p className="font-bold text-xs">Permanently deleting business and purging records...</p>
                    <p className="text-[10px] text-slate-400">Erasing Firestore documents, collections, and authentication credentials.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Action buttons */}
            <div className="flex items-center justify-end px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0 gap-2">
              <button
                type="button"
                id="btn-cancel-delete-biz"
                disabled={isDeletingInProgress}
                onClick={() => {
                  setDeletingBusinessTarget(null);
                  setDeleteConfirmInput('');
                  setDeleteErrorMessage(null);
                }}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-biz"
                disabled={isDeletingInProgress}
                onClick={executeDeleteBusiness}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs shadow-md shadow-rose-900/20 flex items-center gap-1.5 cursor-pointer transition min-h-[40px]"
              >
                {isDeletingInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION DIALOG */}
      {isBulkDeleteModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-modal-title"
        >
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-rose-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="bulk-delete-modal-title" className="font-extrabold text-slate-900 text-base">
                    Delete Multiple Businesses?
                  </h3>
                  <p className="text-[11px] text-rose-600 font-semibold">Permanent Database Deletion</p>
                </div>
              </div>
              {!isBulkDeleting && (
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    This will permanently delete {selectedBusinessIds.length} selected businesses and all associated records.
                  </p>
                  <p className="text-[11px] text-rose-700 mt-1">
                    This action cannot be undone. All tenant data, products, orders, inventory, and users will be purged from the database.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-semibold text-slate-700">Total businesses being deleted:</span>
                <span className="font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-lg text-sm border border-rose-200">
                  {selectedBusinessIds.length} Businesses
                </span>
              </div>

              {/* List of affected businesses */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-40 overflow-y-auto space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Businesses:</p>
                {selectedBusinessIds.map(id => {
                  const b = businesses.find(item => item.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-b-0">
                      <span className="font-bold text-slate-800">{b?.name || id}</span>
                      <span className="font-mono text-[10px] text-slate-500">{id}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-5 py-3.5 border-t border-slate-100 bg-slate-50 gap-2">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 font-bold rounded-xl text-xs text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-bulk-delete"
                disabled={isBulkDeleting}
                onClick={executeBulkDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-md shadow-rose-900/20 flex items-center gap-1.5 transition"
              >
                {isBulkDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Deleting {selectedBusinessIds.length} Businesses...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Delete {selectedBusinessIds.length} Businesses Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
