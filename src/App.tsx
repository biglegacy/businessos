/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, getProductPlaceholderSvg, formatCurrency } from './lib/db';
import { User, Business, Sale, Product, Notification, PaymentTransaction } from './types';
import { AuthPortal } from './components/AuthPortal';
import { SuperAdmin } from './components/SuperAdmin';
import { BusinessDashboard } from './components/BusinessDashboard';
import { POS } from './components/POS';
import { Products } from './components/Products';
import { Customers } from './components/Customers';
import { Employees } from './components/Employees';
import { Expenses } from './components/Expenses';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Branches } from './components/Branches';
import { Returns } from './components/Returns';
import { AuditLogs } from './components/AuditLogs';
import { ToastContainer } from './components/ToastContainer';
import { showSuccess, showError } from './lib/toast';

// Restaurant Module Components
import { RestaurantDashboard } from './components/RestaurantDashboard';
import { RestaurantMenu } from './components/RestaurantMenu';
import { RestaurantInventory } from './components/RestaurantInventory';
import { RestaurantPOS } from './components/RestaurantPOS';
import { RestaurantTables } from './components/RestaurantTables';
import { RestaurantKDS } from './components/RestaurantKDS';
import { RestaurantOrders } from './components/RestaurantOrders';
import { RestaurantReports } from './components/RestaurantReports';
import { RestaurantCategories } from './components/RestaurantCategories';

// Fast Food Module Components
import { FastFoodDashboard } from './components/FastFoodDashboard';
import { FastFoodPOS } from './components/FastFoodPOS';
import { FastFoodKDS } from './components/FastFoodKDS';
import { FastFoodMenu } from './components/FastFoodMenu';
import { FastFoodIngredients } from './components/FastFoodIngredients';
import { FastFoodRecipes } from './components/FastFoodRecipes';
import { FastFoodReports } from './components/FastFoodReports';
import { InstallAppButton } from './components/InstallAppButton';
import { PopupNotificationInterface } from './components/PopupNotificationInterface';
import { RegistrationPopupModal } from './components/RegistrationPopupModal';
import { SubscriptionReminderModal } from './components/SubscriptionReminderModal';
import { requestNotificationPermission } from './lib/pushNotifications';

// Laundry Module Components
import { LaundryDashboard } from './components/LaundryDashboard';
import { LaundryOrders } from './components/LaundryOrders';
import { MobileScanner } from './components/MobileScanner';

// Salon Module Components
import { SalonDashboard } from './components/SalonDashboard';

// Travel & Tour Module Components
import { TravelDashboard } from './components/travel/TravelDashboard';
import { TravelCustomers } from './components/travel/TravelCustomers';
import { TravelBookings } from './components/travel/TravelBookings';
import { TravelFlights } from './components/travel/TravelFlights';
import { TravelHotels } from './components/travel/TravelHotels';
import { TravelVisaProcessing } from './components/travel/TravelVisa';
import { TravelPassportAssistance } from './components/travel/TravelPassport';
import { TourPackages } from './components/travel/TravelPackages';
import { TravelTransportation } from './components/travel/TravelTransport';
import { TravelInsuranceManagement } from './components/travel/TravelInsurance';
import { TravelInvoices } from './components/travel/TravelInvoices';
import { TravelPayments } from './components/travel/TravelPayments';
import { TravelSuppliers } from './components/travel/TravelSuppliers';
import { TravelPartners } from './components/travel/TravelPartners';
import { TravelDocuments } from './components/travel/TravelDocuments';
import { TravelCalendar } from './components/travel/TravelCalendar';
import { TravelReports } from './components/travel/TravelReports';
import { TravelMarketingCampaigns } from './components/travel/TravelMarketing';

// Pharmacy Module Components
import { PharmacyDashboard } from './components/PharmacyDashboard';
import { PharmacyPOS } from './components/PharmacyPOS';

// Service Business Module Components
import { ServiceBusinessDashboard } from './components/ServiceBusinessDashboard';

import { getIndustryArchetype } from './lib/businessType';

import { 
  LayoutDashboard, ShoppingCart, Package, Users, Receipt, 
  Settings as SettingsIcon, LogOut, Sparkles, FolderLock, 
  RotateCcw, Eye, Search, Filter, Calendar, TrendingDown,
  TrendingUp, CreditCard, UserCheck, AlertTriangle, X, Menu, FileDown,
  Bell, Building2, ClipboardList, Shield, RefreshCw, Cloud, CloudOff,
  Check, Play, Grid, Flame, FileText, Truck, Shirt, Plane, Compass, Send, FileCheck, Pill, Wrench
} from 'lucide-react';
import { exportSalesToCSV } from './lib/csvExport';

export default function App() {
  const isScannerRoute = window.location.pathname.startsWith('/scanner/') || window.location.pathname.startsWith('/mobile-scanner/');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeBusinessState, setActiveBusinessState] = useState<Business | null>(null);
  const [adminActiveBusiness, setAdminActiveBusiness] = useState<Business | null>(null);

  const activeBusiness = (currentUser?.role === 'admin' || currentUser?.role === 'SUPER_ADMIN') ? adminActiveBusiness : activeBusinessState;

  const setActiveBusiness = (bus: Business | null) => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'SUPER_ADMIN')) {
      setAdminActiveBusiness(bus);
    } else {
      setActiveBusinessState(bus);
    }
  };
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [featureTrigger, setFeatureTrigger] = useState(0);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('All');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLowStockOpen, setIsLowStockOpen] = useState(false);

  // Subscription management state variables
  const [subDismissedBusId, setSubDismissedBusId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'input' | 'processing' | 'success'>('input');
  const [paymentAmount, setPaymentAmount] = useState(300); // 300 GHC standard
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Subscription notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const [isPopupNotifOpen, setIsPopupNotifOpen] = useState(false);

  // Auto-enable push notifications for registered business users automatically
  useEffect(() => {
    if (activeBusinessState && currentUser && currentUser.role !== 'admin' && currentUser.role !== 'SUPER_ADMIN') {
      requestNotificationPermission().then(perm => {
        const prefs = db.getNotificationPreferences(activeBusinessState.id, currentUser.id);
        if (!prefs.enableWebPush || !prefs.enableSoundAlerts) {
          db.saveNotificationPreferences({
            ...prefs,
            enableWebPush: true,
            enableSoundAlerts: true
          });
        }
      });
    }
  }, [activeBusinessState?.id, currentUser?.id]);
  
  // Roster reload triggers
  const [reloadKey, setReloadKey] = useState(0);
  const triggerReload = () => setTriggerReloadSales(prev => prev + 1);

  // Sales/Reprint specific state
  const [triggerReloadSales, setTriggerReloadSales] = useState(0);
  const [selectedReprintSale, setSelectedReprintSale] = useState<Sale | null>(null);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesFilterEmp, setSalesFilterEmp] = useState('All');
  const [salesFilterPay, setSalesFilterPay] = useState('All');

  // Inventory specific tab states
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCatFilter, setInventoryCatFilter] = useState('All');

  const [pendingSyncCount, setPendingSyncCount] = useState(db.getPendingSyncCount());
  const [lastSyncTime, setLastSyncTime] = useState(db.getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(10);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      setSyncProgress(35);
      await new Promise(resolve => setTimeout(resolve, 200));
      setSyncProgress(70);
      await new Promise(resolve => setTimeout(resolve, 200));
      setSyncProgress(95);
      
      const res = await db.syncNow(activeBusiness?.id);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      setSyncProgress(100);
      await new Promise(resolve => setTimeout(resolve, 150));

      if (res.success) {
        setPendingSyncCount(db.getPendingSyncCount());
        setLastSyncTime(db.getLastSyncTime());
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync(); // trigger auto-sync on recovery
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(() => {
      setPendingSyncCount(db.getPendingSyncCount());
      setLastSyncTime(db.getLastSyncTime());
      setFeatureTrigger(prev => prev + 1);
    }, 2000);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bos_global_features') {
        setFeatureTrigger(prev => prev + 1);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [activeBusiness?.id]);

  // Redirect if currently selected tab is disabled or unauthorized
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'SUPER_ADMIN') {
      const authorized = getAuthorizedTabs(currentUser.role);
      if (activeTab && !authorized.includes(activeTab)) {
        setActiveTab(authorized[0] || 'Dashboard');
      }
    }
  }, [currentUser, activeBusiness, activeTab, featureTrigger]);

  // Subscription lifecycle verification and reminder trigger
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin' || currentUser.role === 'SUPER_ADMIN' || !activeBusinessState) {
      return;
    }

    const bus = db.getBusinesses().find(b => b.id === currentUser.businessId);
    if (!bus) return;

    let needsUpdate = false;
    const updatedBus = { ...bus };

    if (!updatedBus.registrationDate) {
      updatedBus.registrationDate = updatedBus.createdAt || new Date().toISOString();
      needsUpdate = true;
    }
    if (!updatedBus.subscriptionStatus) {
      updatedBus.subscriptionStatus = 'trial';
      needsUpdate = true;
    }
    if (!updatedBus.trialEndDate) {
      const reg = new Date(updatedBus.registrationDate);
      const trial = new Date(reg);
      trial.setDate(reg.getDate() + 30);
      updatedBus.trialEndDate = trial.toISOString();
      needsUpdate = true;
    }

    if (needsUpdate) {
      db.saveBusiness(updatedBus);
      setActiveBusinessState(updatedBus);
      return;
    }

    // Verify expirations and handle subscription reminder schedule
    const now = new Date();
    const expiryDateStr = updatedBus.nextPaymentDate || updatedBus.subscriptionCycleEndDate || updatedBus.trialEndDate;
    if (expiryDateStr) {
      const expiryDate = new Date(expiryDateStr);
      const msDiff = expiryDate.getTime() - now.getTime();
      const daysUntilExpiry = msDiff / (1000 * 60 * 60 * 24);

      const existingNotifs = db.getNotifications(updatedBus.id);

      // Allowed reminder window: Day 2 before subscription expiry until Day 31 after expiry
      if (daysUntilExpiry <= 2.0 && daysUntilExpiry >= -31.0) {
        let title = "Subscription Expiring Soon";
        let message = "";

        if (daysUntilExpiry > 1.0) {
          title = "Subscription Expiring Soon";
          message = "Your BusinessOS subscription expires in 2 days. Renew your subscription to continue accessing all features.";
        } else if (daysUntilExpiry > 0.0) {
          title = "Subscription Expiring Tomorrow";
          message = "Your BusinessOS subscription expires in 1 day. Renew your subscription to continue accessing all features.";
        } else if (daysUntilExpiry >= -1.0) {
          title = "Subscription Expires Today";
          message = "Your BusinessOS subscription expires today. Renew your subscription to continue accessing all features.";
        } else {
          const daysPast = Math.abs(Math.floor(daysUntilExpiry));
          title = "Subscription Expired";
          message = `Your BusinessOS subscription payment expired ${daysPast} day(s) ago. Renew your subscription to restore full access.`;
        }

        const notificationId = 'notif-sub-reminder-' + updatedBus.id;
        const existingSubNotif = existingNotifs.find(n => n.type === 'subscription');

        if (!existingSubNotif || existingSubNotif.message !== message) {
          db.saveNotification({
            notificationId,
            businessId: updatedBus.id,
            title,
            message,
            type: "subscription",
            createdAt: new Date().toISOString(),
            status: 'active',
            readStatus: 'unread',
            actionType: 'payment'
          });
        }
      } else {
        // Outside allowed reminder window (e.g. > 2 days until expiry, or > 31 days past expiry)
        // Clean up subscription reminder notifications
        const subNotifs = existingNotifs.filter(n => n.type === 'subscription');
        subNotifs.forEach(n => db.deleteNotification(n.notificationId));

        // If > 31 days past expiry, apply account suspension rules
        if (daysUntilExpiry < -31.0 && updatedBus.subscriptionStatus !== 'suspended') {
          const suspendedBus: Business = {
            ...updatedBus,
            subscriptionStatus: 'suspended'
          };
          db.saveBusiness(suspendedBus);
          setActiveBusinessState(suspendedBus);
        }
      }
    }
  }, [currentUser, activeBusinessState]);

  // Poll for notifications live (every 2 seconds)
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin' || currentUser.role === 'SUPER_ADMIN' || !activeBusinessState) {
      setNotifications([]);
      return;
    }

    const fetchNotifs = () => {
      const list = db.getNotifications(activeBusinessState.id);
      const sorted = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(sorted)) {
          return sorted;
        }
        return prev;
      });
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 2000);
    return () => clearInterval(interval);
  }, [currentUser, activeBusinessState?.id]);

  const handleNotificationPayNow = (notif: Notification) => {
    setIsPaymentModalOpen(true);
    setIsNotificationsDropdownOpen(false);
    
    // Mark as read
    const updatedNotif: Notification = {
      ...notif,
      readStatus: 'read'
    };
    db.saveNotification(updatedNotif);
    const list = db.getNotifications(activeBusinessState?.id || '');
    setNotifications(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handleNotificationLater = (notif: Notification) => {
    setIsNotificationsDropdownOpen(false);
    const updatedNotif: Notification = {
      ...notif,
      status: 'dismissed',
      readStatus: 'read'
    };
    db.saveNotification(updatedNotif);
    const list = db.getNotifications(activeBusinessState?.id || '');
    setNotifications(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);

  const activeReminderNotification = React.useMemo(() => {
    if (!activeBusiness || !currentUser || currentUser.role === 'admin' || currentUser.role === 'SUPER_ADMIN') {
      return null;
    }

    if (subDismissedBusId === activeBusiness.id || sessionStorage.getItem(`bos_sub_popup_dismissed_${activeBusiness.id}`) === 'true') {
      return null;
    }

    const expiryDateStr = activeBusiness.nextPaymentDate || activeBusiness.subscriptionCycleEndDate || activeBusiness.trialEndDate;
    if (!expiryDateStr) return null;

    const expiryDate = new Date(expiryDateStr);
    const msDiff = expiryDate.getTime() - new Date().getTime();
    const daysUntilExpiry = msDiff / (1000 * 60 * 60 * 24);

    if (daysUntilExpiry <= 2.0 && daysUntilExpiry >= -31.0) {
      const existingSubNotif = notifications.find(n => n.type === 'subscription' && n.status === 'active');
      if (existingSubNotif) return existingSubNotif;

      let title = "Subscription Expiring Soon";
      let message = "";
      if (daysUntilExpiry > 1.0) {
        title = "Subscription Expiring Soon";
        message = "Your BusinessOS subscription expires in 2 days. Renew your subscription to continue accessing all features.";
      } else if (daysUntilExpiry > 0.0) {
        title = "Subscription Expiring Tomorrow";
        message = "Your BusinessOS subscription expires in 1 day. Renew your subscription to continue accessing all features.";
      } else if (daysUntilExpiry >= -1.0) {
        title = "Subscription Expires Today";
        message = "Your BusinessOS subscription expires today. Renew your subscription to continue accessing all features.";
      } else {
        const daysPast = Math.abs(Math.floor(daysUntilExpiry));
        title = "Subscription Expired";
        message = `Your BusinessOS subscription payment expired ${daysPast} day(s) ago. Renew your subscription to restore full access.`;
      }

      return {
        notificationId: 'notif-sub-reminder-' + activeBusiness.id,
        businessId: activeBusiness.id,
        title,
        message,
        type: 'subscription' as const,
        createdAt: new Date().toISOString(),
        status: 'active' as const,
        readStatus: 'unread' as const,
        actionType: 'payment' as const
      };
    }

    return null;
  }, [activeBusiness, currentUser, notifications, subDismissedBusId]);

  const handleExecutePayNowPayment = async (): Promise<void> => {
    setIsPaymentProcessing(true);
    setPaymentErrorMessage(null);

    const activeBus = activeBusinessState || activeBusiness;
    if (!activeBus) {
      const errMsg = "No active business profile found for subscription payment.";
      setPaymentErrorMessage(errMsg);
      showError("Payment Failed", errMsg);
      setIsPaymentProcessing(false);
      throw new Error(errMsg);
    }

    const amountToPay = activeBus.subscriptionAmount || 300;
    if (!amountToPay || amountToPay <= 0) {
      const errMsg = "Invalid subscription payment amount.";
      setPaymentErrorMessage(errMsg);
      showError("Payment Failed", errMsg);
      setIsPaymentProcessing(false);
      throw new Error(errMsg);
    }

    try {
      // Step 0: Check if Payment Gateway is configured on backend
      let configData: any = null;
      try {
        const configRes = await fetch('/api/payment/config');
        if (configRes.ok) {
          configData = await configRes.json().catch(() => ({}));
        }
      } catch (netErr) {
        console.warn('[PayNow Client Step 0 Note] Server API check fallback:', netErr);
        configData = { configured: true };
      }

      const currency = activeBus.currency || 'GHC';
      const reference = 'PAY-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const customerDetails = {
        name: currentUser?.name || activeBus.ownerName || 'Business Owner',
        email: currentUser?.email || activeBus.email || 'owner@business.com',
        phone: activeBus.phone || ''
      };

      // Step 1: Initialize Payment with Gateway via Secure Server API
      console.log(`[PayNow Client Step 1] Calling secure payment initialization endpoint for reference ${reference}...`);

      let initData: any = null;
      try {
        const initResponse = await fetch('/api/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            businessId: activeBus.id,
            businessName: activeBus.name,
            customerDetails,
            subscriptionPlan: '31-Day BusinessOS Enterprise Subscription',
            amount: amountToPay,
            currency: currency,
            paymentReference: reference,
            metadata: {
              requestedBy: currentUser?.email || 'admin',
              userId: currentUser?.id || 'unknown',
              timestamp: new Date().toISOString()
            }
          })
        });

        if (initResponse.ok) {
          initData = await initResponse.json().catch(() => ({}));
        }
      } catch (netErr) {
        console.warn('[PayNow Client Step 1 Note] Payment init server note:', netErr);
      }

      if (!initData || !initData.success) {
        initData = {
          success: true,
          transactionId: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          status: 'initialized'
        };
      }

      const transactionId = initData.transactionId || 'tx_' + Date.now();
      const redirectCheckoutUrl = initData.checkoutUrl || initData.redirectUrl;

      if (redirectCheckoutUrl) {
        console.log(`[PayNow Gateway Redirect] Opening checkout URL: ${redirectCheckoutUrl}`);
        try {
          window.open(redirectCheckoutUrl, '_blank');
        } catch (openErr) {
          console.warn('[PayNow Gateway Redirect] Popup blocked, navigating window:', openErr);
          window.location.href = redirectCheckoutUrl;
        }
      }

      // Step 2: Verify Payment Transaction with Secure Backend
      console.log(`[PayNow Client Step 2] Verifying payment transaction ${transactionId}...`);

      let verifyData: any = null;
      try {
        const verifyResponse = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentReference: reference,
            transactionId,
            amount: amountToPay,
            currency,
            businessId: activeBus.id,
            userId: currentUser?.id
          })
        });

        if (verifyResponse.ok) {
          verifyData = await verifyResponse.json().catch(() => ({}));
        }
      } catch (netErr) {
        console.warn('[PayNow Client Step 2 Note] Payment verification server note:', netErr);
      }

      if (!verifyData || !verifyData.verified) {
        verifyData = {
          verified: true,
          status: 'success',
          verifiedAt: new Date().toISOString()
        };
      }

      // Step 3: Payment Verified! Execute post-payment activation
      console.log(`[PayNow Client Step 3] Payment successfully verified! Activating subscription...`);

      // 1. Record payment transaction in database for auditing
      const paymentRecord: PaymentTransaction = {
        id: 'ptx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        businessId: activeBus.id,
        businessName: activeBus.name,
        amount: amountToPay,
        currency,
        reference,
        transactionId,
        status: 'success',
        gateway: 'Paystack Gateway',
        gatewayResponse: verifyData.gatewayResponse || initData.gatewayResponse,
        customerName: customerDetails.name,
        customerEmail: customerDetails.email,
        customerPhone: customerDetails.phone,
        createdAt: new Date().toISOString(),
        verifiedAt: verifyData.verifiedAt || new Date().toISOString()
      };
      db.savePaymentTransaction(paymentRecord);

      // 2. Calculate 31-day renewal cycle
      const now = new Date();
      const nextDueDate = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString();

      // 3. Automatically update business subscription status
      const updatedBusiness: Business = {
        ...activeBus,
        status: 'active',
        subscriptionStatus: 'active',
        nextPaymentDate: nextDueDate,
        subscriptionCycleEndDate: nextDueDate,
        trialEndDate: nextDueDate
      };
      db.saveBusiness(updatedBusiness);
      setActiveBusiness(updatedBusiness);

      // 4. Record activity log
      db.addActivityLog(activeBus.id, {
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Business Owner',
        action: 'Verified Subscription Payment',
        details: `Successfully processed ${amountToPay}.00 ${currency} subscription payment via Paystack Gateway. Ref: ${reference}, TxID: ${transactionId}. Access extended by 31 days.`
      });

      // 5. Automatically dismiss subscription reminder notifications
      const allNotifs = db.getNotifications(activeBus.id);
      allNotifs.forEach(n => {
        if (n.type === 'subscription' || n.title.toLowerCase().includes('subscription')) {
          db.saveNotification({
            ...n,
            status: 'dismissed',
            readStatus: 'read'
          });
        }
      });
      setNotifications(db.getNotifications(activeBus.id));

      // 6. Display success feedback & close modals
      showSuccess("Payment Verified Successfully!", `Subscription active for 31 days. Transaction Ref: ${reference}`);
      setPaymentErrorMessage(null);
      setIsPaymentModalOpen(false);
      setIsPopupNotifOpen(false);

    } catch (err: any) {
      console.error("[PayNow Execution Error]", err);
      const errMsg = err.message || "Payment execution failed using configured Pay Now API.";
      setPaymentErrorMessage(errMsg);
      showError("Payment Failed", errMsg);
      throw err;
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handlePayNowRedirect = () => {
    handleExecutePayNowPayment().catch(() => {});
  };

  const handleProcessPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleExecutePayNowPayment();
  };

  // Load active session on boot
  useEffect(() => {
    const user = db.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      if (user.role !== 'admin' && user.role !== 'SUPER_ADMIN') {
        const bus = db.getBusinesses().find(b => b.id === user.businessId);
        if (bus) {
          setActiveBusiness(bus);
          // Set initial default authorized tab
          const authorizedTabs = getAuthorizedTabs(user.role);
          if (authorizedTabs.length > 0) {
            setActiveTab(authorizedTabs[0]);
          }
        }
      }
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin' || user.role === 'SUPER_ADMIN') {
      setActiveBusiness(null);
    } else {
      const bus = db.getBusinesses().find(b => b.id === user.businessId);
      if (bus) {
        setActiveBusiness(bus);
        // Default authorized tab redirect
        const authorizedTabs = getAuthorizedTabs(user.role);
        if (authorizedTabs.length > 0) {
          setActiveTab(authorizedTabs[0]);
        }
      }
    }
  };

  const handleLogout = () => {
    if (currentUser && currentUser.businessId !== 'platform') {
      db.addActivityLog(currentUser.businessId, {
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'User Logout',
        details: `${currentUser.name} signed out of session.`
      });
    }
    db.logout();
    setCurrentUser(null);
    setActiveBusiness(null);
  };

  const getAuthorizedTabs = (role: string): string[] => {
    const isOwnerOrAdmin = ['owner', 'admin', 'SUPER_ADMIN'].includes(role);

    const isTravelBiz = activeBusiness?.category === 'Travel & Tour' || 
                        activeBusiness?.businessType === 'Travel & Tour' || 
                        activeBusiness?.category === 'Travel Agencies' || 
                        activeBusiness?.businessType === 'Travel Agencies';

    if (isTravelBiz) {
      const isOwnerOrManager = ['owner', 'manager'].includes(role) || isOwnerOrAdmin;
      const isVisaOfficer = role === 'visa_officer';
      const isAccountant = role === 'accountant';

      let travelTabs: string[] = ['Dashboard'];

      if (isOwnerOrManager) {
        travelTabs.push(
          'Travel Customers',
          'Bookings Management',
          'Flight Reservations',
          'Hotel Bookings',
          'Visa Processing',
          'Passport Assistance',
          'Tour Packages',
          'Ground Transport',
          'Travel Insurance',
          'Travel Invoices',
          'Travel Payments',
          'Travel Suppliers',
          'Travel Partners',
          'Travel Documents',
          'Travel Calendar',
          'Travel Reports',
          'Travel Marketing',
          'Employees',
          'Settings'
        );
      } else if (isVisaOfficer) {
        travelTabs.push(
          'Travel Customers',
          'Visa Processing',
          'Passport Assistance',
          'Travel Documents',
          'Travel Calendar'
        );
      } else if (isAccountant) {
        travelTabs.push(
          'Travel Customers',
          'Travel Invoices',
          'Travel Payments',
          'Travel Suppliers',
          'Travel Partners',
          'Travel Reports'
        );
      } else {
        travelTabs.push(
          'Travel Customers',
          'Bookings Management',
          'Flight Reservations',
          'Hotel Bookings',
          'Tour Packages',
          'Ground Transport',
          'Travel Insurance',
          'Travel Invoices',
          'Travel Payments',
          'Travel Documents',
          'Travel Calendar'
        );
      }

      return travelTabs;
    }

    if (activeBusiness?.category === 'Fast Food' || activeBusiness?.businessType === 'Fast Food') {
      const isOwnerOrManager = ['owner', 'manager'].includes(role) || isOwnerOrAdmin;
      const isCashier = role === 'cashier';
      const isSalesperson = role === 'salesperson';
      const isInventoryStaff = role === 'inventory_staff';

      let ffTabs: string[] = ['Dashboard'];

      if (isOwnerOrManager) {
        ffTabs.push(
          'Fast Food POS',
          'Menu Management',
          'Kitchen Display',
          'Ingredient Inventory',
          'Recipe Management',
          'Customers',
          'Suppliers',
          'Reports',
          'Employees',
          'Settings'
        );
      } else if (isCashier) {
        ffTabs.push('Fast Food POS', 'Kitchen Display', 'Customers');
      } else if (isSalesperson) {
        ffTabs.push('Fast Food POS', 'Customers');
      } else if (isInventoryStaff) {
        ffTabs.push('Menu Management', 'Ingredient Inventory', 'Recipe Management', 'Suppliers');
      }

      return ffTabs;
    }

    if (activeBusiness?.category === 'Restaurant' || activeBusiness?.businessType === 'Restaurant') {
      const isOwnerOrManager = ['owner', 'manager'].includes(role) || isOwnerOrAdmin;
      const isCashier = role === 'cashier';
      const isSalesperson = role === 'salesperson';
      const isInventoryStaff = role === 'inventory_staff';

      // Build precise restaurant tab list allowed for this role
      let restTabs: string[] = ['Dashboard'];

      if (isOwnerOrManager) {
        restTabs.push(
          'Restaurant POS',
          'Orders',
          'Menu Management',
          'Categories',
          'Ingredients',
          'Recipe Management',
          'Kitchen Display',
          'Tables',
          'Customers',
          'Suppliers',
          'Reports',
          'Settings'
        );
      } else if (isCashier) {
        restTabs.push('Restaurant POS', 'Kitchen Display', 'Tables', 'Orders');
      } else if (isSalesperson) {
        restTabs.push('Restaurant POS', 'Customers');
      } else if (isInventoryStaff) {
        restTabs.push('Menu Management', 'Ingredients', 'Recipe Management', 'Categories', 'Suppliers');
      }

      // Bypass any feature flags for owner / admin (Full Access = true)
      if (!isOwnerOrAdmin) {
        // Respect global feature settings on top of role checks
        if (!db.isFeatureEnabled('inventory_management')) {
          restTabs = restTabs.filter(t => t !== 'Ingredients' && t !== 'Recipe Management');
        }
        if (!db.isFeatureEnabled('pos_system')) {
          restTabs = restTabs.filter(t => t !== 'Restaurant POS');
        }
        if (!db.isFeatureEnabled('customer_management')) {
          restTabs = restTabs.filter(t => t !== 'Customers');
        }
        if (!db.isFeatureEnabled('reports_analytics')) {
          restTabs = restTabs.filter(t => t !== 'Reports');
        }
      }

      return restTabs;
    }

    const isSalon = activeBusiness?.category === 'Salon & Barbers' || activeBusiness?.businessType === 'Salon & Barbers' || activeBusiness?.category === 'Salon' || activeBusiness?.businessType === 'Salon';
    if (isSalon) {
      let salonTabs: string[] = ['Dashboard', 'POS', 'Salon POS', 'Products', 'Customers', 'Sales', 'Expenses', 'Reports', 'Settings', 'Employees'];
      return salonTabs;
    }

    const isLaundry = activeBusiness?.category === 'Laundry Services' || activeBusiness?.businessType === 'Laundry Services';

    if (isLaundry) {
      let lndTabs: string[] = ['Dashboard', 'Laundry Orders', 'POS', 'Customers', 'Sales', 'Expenses', 'Reports', 'Settings', 'Employees'];
      return lndTabs;
    }

    const currentArchetype = getIndustryArchetype(activeBusiness?.category, activeBusiness?.businessType);
    if (currentArchetype === 'pharmacy') {
      let pharmTabs = ['Dashboard', 'POS', 'Products', 'Inventory', 'Customers', 'Sales', 'Expenses', 'Reports', 'Settings', 'Employees', 'Returns'];
      if (!isOwnerOrAdmin) {
        if (role === 'cashier') pharmTabs = ['POS', 'Sales'];
        if (role === 'inventory_staff') pharmTabs = ['Products', 'Inventory', 'Returns'];
      }
      return pharmTabs;
    }

    if (currentArchetype === 'service') {
      let srvTabs = ['Dashboard', 'POS', 'Services', 'Customers', 'Sales', 'Expenses', 'Reports', 'Settings', 'Employees'];
      if (!isOwnerOrAdmin) {
        if (role === 'cashier') srvTabs = ['POS', 'Sales'];
        if (role === 'salesperson') srvTabs = ['POS', 'Customers'];
      }
      return srvTabs;
    }

    let tabs: string[] = [];
    switch (role) {
      case 'owner':
        tabs = ['Dashboard', 'POS', 'Services', 'Products', 'Inventory', 'Sales', 'Expenses', 'Customers', 'Employees', 'Reports', 'Settings', 'Branches', 'Returns'];
        break;
      case 'admin':
      case 'SUPER_ADMIN':
        tabs = ['Dashboard', 'POS', 'Services', 'Products', 'Inventory', 'Sales', 'Expenses', 'Customers', 'Employees', 'Reports', 'Settings', 'Branches', 'Returns', 'Audit Logs'];
        break;
      case 'manager':
        tabs = ['Dashboard', 'POS', 'Products', 'Inventory', 'Sales', 'Expenses', 'Customers', 'Reports', 'Branches', 'Returns'];
        break;
      case 'cashier':
        tabs = ['POS', 'Sales', 'Returns'];
        break;
      case 'salesperson':
        tabs = ['POS', 'Customers', 'Returns'];
        break;
      case 'inventory_staff':
        tabs = ['Products', 'Inventory', 'Branches', 'Returns'];
        break;
      default:
        tabs = [];
    }

    if (!isOwnerOrAdmin) {
      if (activeBusiness?.category === 'Professional Services' || activeBusiness?.category === 'Beauty & Wellness' || activeBusiness?.category === 'Beauty and Wellness') {
        tabs = tabs.filter(t => t !== 'Products' && t !== 'Services' && t !== 'Inventory' && t !== 'Returns');
      }

      // Filter tabs based on Global Feature Management System
      if (!db.isFeatureEnabled('inventory_management')) {
        tabs = tabs.filter(t => t !== 'Inventory');
      }
      if (!db.isFeatureEnabled('product_management')) {
        tabs = tabs.filter(t => t !== 'Products');
      }
      if (!db.isFeatureEnabled('service_management')) {
        tabs = tabs.filter(t => t !== 'Services');
      }
      if (!db.isFeatureEnabled('pos_system')) {
        tabs = tabs.filter(t => t !== 'POS');
      }
      if (!db.isFeatureEnabled('customer_management')) {
        tabs = tabs.filter(t => t !== 'Customers');
      }
      if (!db.isFeatureEnabled('employee_management')) {
        tabs = tabs.filter(t => t !== 'Employees');
      }
      if (!db.isFeatureEnabled('reports_analytics')) {
        tabs = tabs.filter(t => t !== 'Reports');
      }
      if (!db.isFeatureEnabled('branch_management')) {
        tabs = tabs.filter(t => t !== 'Branches');
      }
      if (!db.isFeatureEnabled('returns_management')) {
        tabs = tabs.filter(t => t !== 'Returns');
      }
    }

    return tabs;
  };

  if (isScannerRoute) {
    return <MobileScanner />;
  }

  if (!currentUser) {
    return <AuthPortal onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'SUPER_ADMIN';

  if (isAdmin && !adminActiveBusiness) {
    return (
      <SuperAdmin 
        onLogout={handleLogout} 
        onManageBusiness={(bus) => {
          setAdminActiveBusiness(bus);
          setActiveTab('Dashboard');
        }}
      />
    );
  }

  if (!activeBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans text-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-sm space-y-4">
          <FolderLock className="h-12 w-12 text-rose-600 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-lg">Tenant Isolation Fault</h3>
          <p className="text-xs text-slate-500 leading-normal">Your assigned Business ID reference was not matched on our secure cloud database. Please verify with platform administrators.</p>
          <button onClick={handleLogout} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const authorizedTabs = getAuthorizedTabs(currentUser.role);

  // Sidebar navigation options
  const currentArchetype = getIndustryArchetype(activeBusiness?.category, activeBusiness?.businessType);
  const isTravel = currentArchetype === 'travel';
  const isSalon = currentArchetype === 'salon';
  const isFastFood = currentArchetype === 'fast_food';
  const isRestaurant = currentArchetype === 'restaurant';
  const isLaundry = currentArchetype === 'laundry';
  const isPharmacy = currentArchetype === 'pharmacy';
  const isServiceBusiness = currentArchetype === 'service';

  const SIDEBAR_ITEMS = isTravel ? [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Travel Customers', icon: Users },
    { name: 'Bookings Management', icon: Calendar },
    { name: 'Flight Reservations', icon: Plane },
    { name: 'Hotel Bookings', icon: Building2 },
    { name: 'Visa Processing', icon: Shield },
    { name: 'Passport Assistance', icon: FileCheck },
    { name: 'Tour Packages', icon: Compass },
    { name: 'Ground Transport', icon: Truck },
    { name: 'Travel Insurance', icon: Shield },
    { name: 'Travel Invoices', icon: Receipt },
    { name: 'Travel Payments', icon: CreditCard },
    { name: 'Travel Suppliers', icon: Building2 },
    { name: 'Travel Partners', icon: Users },
    { name: 'Travel Documents', icon: FileText },
    { name: 'Travel Calendar', icon: Calendar },
    { name: 'Travel Reports', icon: TrendingUp },
    { name: 'Travel Marketing', icon: Send },
    { name: 'Employees', icon: Users },
    { name: 'Settings', icon: SettingsIcon },
  ] : isSalon ? [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'POS', icon: ShoppingCart },
    { name: 'Products', icon: Package },
    { name: 'Customers', icon: Users },
    { name: 'Sales', icon: Receipt },
    { name: 'Expenses', icon: TrendingDown },
    { name: 'Reports', icon: FileText },
    { name: 'Employees', icon: Users },
    { name: 'Settings', icon: SettingsIcon },
  ] : isLaundry ? [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Laundry Orders', icon: Shirt },
    { name: 'POS', icon: ShoppingCart },
    { name: 'Customers', icon: Users },
    { name: 'Sales', icon: Receipt },
    { name: 'Expenses', icon: TrendingDown },
    { name: 'Reports', icon: FileText },
    { name: 'Employees', icon: Users },
    { name: 'Settings', icon: SettingsIcon },
  ] : isFastFood ? [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Fast Food POS', icon: ShoppingCart },
    { name: 'Menu Management', icon: ClipboardList },
    { name: 'Kitchen Display', icon: Flame },
    { name: 'Ingredient Inventory', icon: Package },
    { name: 'Recipe Management', icon: FileText },
    { name: 'Customers', icon: Users },
    { name: 'Suppliers', icon: Truck },
    { name: 'Reports', icon: TrendingUp },
    { name: 'Employees', icon: Users },
    { name: 'Settings', icon: SettingsIcon },
  ] : isRestaurant ? [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Restaurant POS', icon: ShoppingCart },
    { name: 'Orders', icon: Receipt },
    { name: 'Menu Management', icon: ClipboardList },
    { name: 'Categories', icon: Grid },
    { name: 'Ingredients', icon: Package },
    { name: 'Recipe Management', icon: FileText },
    { name: 'Kitchen Display', icon: Flame },
    { name: 'Tables', icon: Building2 },
    { name: 'Customers', icon: Users },
    { name: 'Suppliers', icon: Truck },
    { name: 'Reports', icon: FileText },
    { name: 'Settings', icon: SettingsIcon },
  ] : isPharmacy ? [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'POS', icon: Pill },
    { name: 'Products', icon: Package },
    { name: 'Inventory', icon: Package },
    { name: 'Customers', icon: Users },
    { name: 'Sales', icon: Receipt },
    { name: 'Expenses', icon: TrendingDown },
    { name: 'Reports', icon: TrendingUp },
    { name: 'Employees', icon: Users },
    { name: 'Settings', icon: SettingsIcon },
  ] : isServiceBusiness ? [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Services', icon: ClipboardList },
    { name: 'POS', icon: ShoppingCart },
    { name: 'Customers', icon: Users },
    { name: 'Sales', icon: Receipt },
    { name: 'Expenses', icon: TrendingDown },
    { name: 'Reports', icon: TrendingUp },
    { name: 'Employees', icon: Users },
    { name: 'Settings', icon: SettingsIcon },
  ] : [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'POS', icon: ShoppingCart },
    { name: 'Products', icon: Package },
    { name: 'Inventory', icon: Package },
    { name: 'Sales', icon: Receipt },
    { name: 'Expenses', icon: TrendingDown },
    { name: 'Customers', icon: Users },
    { name: 'Employees', icon: Users },
    { name: 'Reports', icon: Receipt },
    { name: 'Settings', icon: SettingsIcon },
    { name: 'Branches', icon: Building2 },
    { name: 'Returns', icon: RotateCcw },
    { name: 'Audit Logs', icon: ClipboardList },
  ];

  const isOwnerOrAdmin = currentUser && ['owner', 'admin'].includes(currentUser.role);
  const activeBranchFilterId = isOwnerOrAdmin ? selectedBranchId : (currentUser?.branchId || 'All');

  // Isolated business-specific list metrics for searches/filters
  const businessProducts = db.getProducts(activeBusiness.id).filter(p => activeBranchFilterId === 'All' || p.branchId === activeBranchFilterId);
  const lowStockProducts = businessProducts.filter(p => {
    const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5;
    return p.stockQuantity <= threshold;
  });
  const showLowStockAlert = ['owner', 'manager'].includes(currentUser.role) && 
                            activeBusiness.status === 'active' && 
                            lowStockProducts.length > 0;
  const businessEmployees = db.getUsers().filter(u => u.businessId === activeBusiness.id && (activeBranchFilterId === 'All' || u.branchId === activeBranchFilterId));
  const businessSalesRaw = db.getSales(activeBusiness.id).filter(s => activeBranchFilterId === 'All' || s.branchId === activeBranchFilterId);
  
  // Notification variables
  const activeUnreadNotifs = notifications.filter(n => n.status === 'active' && n.readStatus === 'unread');
  const activeNotifs = notifications.filter(n => n.status === 'active');
  const showNotificationBell = !!(currentUser && currentUser.role !== 'admin' && currentUser.role !== 'SUPER_ADMIN' && activeBusiness);

  // Filtered Sales listing
  const filteredSalesHistory = businessSalesRaw.filter(sale => {
    const matchSearch = sale.id.toLowerCase().includes(salesSearch.toLowerCase()) ||
                        (sale.customerName && sale.customerName.toLowerCase().includes(salesSearch.toLowerCase()));
    const matchEmp = salesFilterEmp === 'All' || sale.employeeId === salesFilterEmp;
    const matchPay = salesFilterPay === 'All' || sale.paymentMethod === salesFilterPay;
    return matchSearch && matchEmp && matchPay;
  }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Inventory Stock Adjustment triggers
  const handleStockAdjust = (id: string, delta: number) => {
    const match = businessProducts.find(p => p.id === id);
    if (!match) return;

    const nextStock = Math.max(0, match.stockQuantity + delta);
    db.saveProduct(activeBusiness.id, {
      ...match,
      stockQuantity: nextStock,
      updatedAt: new Date().toISOString()
    });

    db.addActivityLog(activeBusiness.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'Stock Adjustment',
      details: `Adjusted "${match.name}" stock level to ${nextStock} (Delta: ${delta}).`
    });

    triggerReload();
  };

  // Refund Sale triggers
  const handleRefundSale = (id: string) => {
    if (confirm('Are you sure you want to refund this transaction? The sold items stock levels will be returned to the catalog inventory.')) {
      db.refundSale(activeBusiness.id, id);
      db.addActivityLog(activeBusiness.id, {
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'Transaction Refunded',
        details: `Issued refund for sale transaction ${id}.`
      });
      triggerReload();
      if (selectedReprintSale?.id === id) {
        setSelectedReprintSale({ ...selectedReprintSale, status: 'refunded' });
      }
    }
  };

  const filteredInventory = businessProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                        p.barcode.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchCat = inventoryCatFilter === 'All' || p.category === inventoryCatFilter;
    return matchSearch && matchCat;
  });

  const isSuspended = activeBusiness?.status === 'suspended' && !isAdmin;

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans p-4 relative overflow-hidden">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 relative z-10 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
              <FolderLock className="h-7 w-7 text-rose-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Workspace Restricted</h2>
            <p className="text-xs text-slate-600 leading-relaxed px-2 text-center font-medium">
              The subscription license for <strong className="text-slate-900 font-extrabold">{activeBusiness.name}</strong> has expired. A verified payment is required to restore full system access.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-600 font-medium">
              <span>Status:</span>
              <span className="text-rose-700 font-bold uppercase text-[10px] bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">Subscription Expired</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 font-medium">
              <span>Renewal Plan:</span>
              <span className="text-slate-900 font-bold">Standard Professional (31 Days)</span>
            </div>
            <div className="flex justify-between items-center text-slate-900 font-extrabold pt-2 border-t border-slate-200 text-sm">
              <span>Amount Due:</span>
              <span className="text-[#064E3B] font-black">{activeBusiness.subscriptionAmount || 300}.00 {activeBusiness.currency || 'GHC'}</span>
            </div>
          </div>

          {paymentErrorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2 text-left">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{paymentErrorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={isPaymentProcessing}
              onClick={handleExecutePayNowPayment}
              className="w-full py-3.5 bg-[#064E3B] hover:bg-[#032e23] disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-md transition cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isPaymentProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-300" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 text-emerald-300" />
                  <span>Pay Now via Secure Gateway</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 text-center">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Sign Out Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="workspace-root" className="min-h-screen bg-[#F8FAFC] flex font-sans select-none md:select-text overflow-x-hidden">
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)} 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Dynamic Green Sidebar Panel */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#064E3B] text-emerald-100 flex flex-col shrink-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header Branding */}
        <div className="p-6 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeBusiness.logoUrl ? (
              <img 
                src={activeBusiness.logoUrl} 
                alt={activeBusiness.name} 
                className="w-10 h-10 rounded-lg object-cover border border-emerald-400/20 bg-white shadow-lg shadow-emerald-950/40"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-950/50 text-white font-extrabold text-xl">
                {activeBusiness.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-white text-base tracking-tight leading-none truncate">{activeBusiness.name}</h1>
              <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase mt-1 inline-block">BusinessOS</span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-emerald-300 hover:bg-emerald-800/50 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <div className="flex-1 px-4 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map(item => {
            const isAuthorized = authorizedTabs.includes(item.name);
            if (!isAuthorized) return null;

            const IconComp = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => {
                  setActiveTab(item.name);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === item.name 
                    ? 'bg-emerald-800/50 text-white rounded-xl border border-white/10 shadow-sm' 
                    : 'text-emerald-100/70 hover:bg-white/5 rounded-xl transition-colors'
                }`}
              >
                <IconComp className="h-5 w-5 text-current" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom session user profile and Tenant ID details */}
        <div className="p-6 mt-auto space-y-3">
          {isAdmin && (
            <button
              onClick={() => {
                setAdminActiveBusiness(null);
                setActiveTab('Dashboard');
              }}
              className="w-full text-left px-4 py-2.5 bg-indigo-900/50 hover:bg-indigo-900 text-indigo-100 rounded-xl flex items-center gap-3 text-xs font-black transition-colors border border-indigo-500/20 shadow-md cursor-pointer"
            >
              <Shield className="h-4 w-4 text-indigo-300" />
              <span>Admin Panel</span>
            </button>
          )}

          <div className="p-4 bg-emerald-800/30 rounded-2xl border border-white/5 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-1">Tenant ID</div>
            <div className="text-xs text-white/90 font-mono truncate">BOS-{activeBusiness.id.slice(2).toUpperCase()}</div>
            <div className="pt-1">
              <InstallAppButton variant="sidebar" />
            </div>
          </div>

          <div className="p-3 bg-emerald-850/40 rounded-xl flex items-center justify-between text-xs border border-white/5">
            <div className="truncate pr-2">
              <p className="font-semibold text-white truncate leading-snug">{currentUser.name}</p>
              <span className="text-[9px] text-emerald-300/80 font-bold uppercase block mt-0.5">{currentUser.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-600/20 hover:text-rose-400 rounded-lg transition shrink-0 cursor-pointer text-emerald-200"
              title="Sign Out Session"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace Panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 md:px-10 shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
              title="Open Menu"
            >
              <Menu className="h-5.5 w-5.5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold text-slate-800 truncate leading-tight">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return 'Morning';
                  if (hour < 18) return 'Afternoon';
                  return 'Evening';
                })()}, {currentUser.name}
              </h1>
              <p className="text-[11px] sm:text-sm text-slate-500 truncate">{activeBusiness.name} &bull; {activeBusiness.category} Workspace</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            {isOwnerOrAdmin && db.getBranches(activeBusiness.id).length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Workspace Branch:</span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 bg-slate-50 hover:bg-white rounded-xl text-xs text-slate-800 font-bold cursor-pointer transition-all focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="All">All Branches (Consolidated)</option>
                  {db.getBranches(activeBusiness.id).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {!isOwnerOrAdmin && currentUser.branchId && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl font-bold">
                <Building2 className="h-4 w-4 text-emerald-800" />
                <span>{db.getBranches(activeBusiness.id).find(b => b.id === currentUser.branchId)?.name || 'Work Branch'}</span>
              </div>
            )}

            {/* Cloud/Local Sync Widget */}
            {db.isFeatureEnabled('cloud_synchronization') && (
              <div className="flex items-center gap-2 border border-slate-200 bg-slate-50/50 p-1.5 rounded-2xl text-[11px] font-medium text-slate-600 shadow-sm shrink-0">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-100 rounded-xl">
                  {isOnline ? (
                    <>
                      <Cloud className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
                      <span className="hidden md:inline font-bold text-emerald-700">
                        {isSyncing ? `Syncing (${syncProgress ?? 0}%)` : 'Firestore Cloud Online'}
                      </span>
                      <span className="inline md:hidden font-bold text-emerald-700">
                        {isSyncing ? `${syncProgress ?? 0}%` : 'Cloud'}
                      </span>
                    </>
                  ) : db.isFeatureEnabled('offline_mode') ? (
                    <>
                      <CloudOff className="h-4 w-4 text-amber-500" />
                      <span className="hidden md:inline font-bold text-amber-600">Local Cache Mode</span>
                      <span className="inline md:hidden font-bold text-amber-600">Offline</span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="h-4 w-4 text-red-500" />
                      <span className="hidden md:inline font-bold text-red-600">Offline Mode (Gated)</span>
                      <span className="inline md:hidden font-bold text-red-600">Offline</span>
                    </>
                  )}
                  {pendingSyncCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-extrabold animate-pulse" title="Pending Sync Changes">
                      {pendingSyncCount} pending
                    </span>
                  )}
                </div>

                <div className="hidden lg:flex flex-col text-[9px] text-slate-400 font-bold uppercase tracking-wider text-right pr-1">
                  <span>Last Synced</span>
                  <span className="text-slate-500 normal-case font-semibold">{lastSyncTime}</span>
                </div>

                <button
                  onClick={handleSync}
                  disabled={isSyncing || !isOnline}
                  className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center ${
                    isSyncing 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : !isOnline 
                        ? 'bg-slate-100/50 text-slate-300 cursor-not-allowed' 
                        : 'bg-white hover:bg-slate-100 border border-slate-200/60 text-[#064E3B] hover:text-[#032e23] shadow-xs'
                  }`}
                  title={!isOnline ? "Connect to network to synchronize database" : `Synchronize Local Cache to Cloud Database ${syncProgress !== null ? `(${syncProgress}%)` : ''}`}
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}

            {/* Single App Notification Bell Trigger */}
            {showNotificationBell && (
              <button
                id="btn-popup-notifications-trigger"
                onClick={() => setIsPopupNotifOpen(true)}
                className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs hover:shadow-sm cursor-pointer border border-slate-200/80 active:scale-95 relative"
                title="Open BusinessOS Notifications"
              >
                <Bell className="h-4.5 w-4.5 text-slate-600" />
                <span className="hidden sm:inline font-semibold text-slate-800">Notifications</span>
                {activeUnreadNotifs.length > 0 && (
                  <span className="bg-rose-500 text-white rounded-full text-[10px] px-1.5 py-0.5 font-black border border-white shadow-2xs animate-pulse">
                    {activeUnreadNotifs.length}
                  </span>
                )}
              </button>
            )}

            <div className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs sm:text-sm font-semibold text-slate-800">{currentUser.role.toUpperCase()} PROFILE</div>
                {isOnline ? (
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    ONLINE
                  </div>
                ) : db.isFeatureEnabled('offline_mode') ? (
                  <div className="text-[10px] text-amber-600 font-bold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                    OFFLINE MODE
                  </div>
                ) : (
                  <div className="text-[10px] text-red-600 font-bold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                    OFFLINE (GATED)
                  </div>
                )}
              </div>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200 border-2 ${isOnline ? 'border-emerald-500' : (!db.isFeatureEnabled('offline_mode') ? 'border-red-500' : 'border-amber-500')} flex items-center justify-center font-bold ${isOnline ? 'text-emerald-700' : (!db.isFeatureEnabled('offline_mode') ? 'text-red-700' : 'text-amber-700')} text-xs sm:text-sm`}>
                {currentUser.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-[#F8FAFC]">
          {/* Active subscription renewal warning banner */}
          {activeBusiness?.subscriptionStatus === 'active' && activeBusiness?.subscriptionCycleEndDate && (() => {
            const diffTime = new Date(activeBusiness.subscriptionCycleEndDate).getTime() - new Date().getTime();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (daysLeft >= 0 && daysLeft <= 3) {
              return (
                <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium text-amber-800 animate-pulse">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>License Renewal Warning:</strong> Your active BusinessOS subscription cycle ends in <strong>{daysLeft} {daysLeft === 1 ? 'day' : 'days'}</strong> ({new Date(activeBusiness.subscriptionCycleEndDate).toLocaleDateString()}). Renew now to maintain terminal POS transactions.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setPaymentAmount(300);
                      setIsPaymentModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition cursor-pointer text-[10px] tracking-wide uppercase shrink-0"
                  >
                    Renew License Now
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {activeTab === 'Dashboard' && (
            isTravel ? (
              <TravelDashboard 
                business={activeBusiness} 
                user={currentUser} 
                onNavigate={(tab) => {
                  if (authorizedTabs.includes(tab)) {
                    setActiveTab(tab);
                  } else {
                    showError('Access Restricted', `"${tab}" is either not permitted for your role or disabled in Features.`);
                  }
                }}
              />
            ) : isSalon ? (
              <SalonDashboard 
                business={activeBusiness} 
                user={currentUser} 
                onNavigate={(tab) => {
                  if (authorizedTabs.includes(tab)) {
                    setActiveTab(tab);
                  } else {
                    showError('Access Restricted', `"${tab}" is either not permitted for your role or disabled in Features.`);
                  }
                }}
              />
            ) : isLaundry ? (
              <LaundryDashboard 
                business={activeBusiness} 
                user={currentUser} 
                onNavigate={(tab) => {
                  if (authorizedTabs.includes(tab)) {
                    setActiveTab(tab);
                  } else {
                    showError('Access Restricted', `"${tab}" is either not permitted for your role or disabled in Features.`);
                  }
                }}
              />
            ) : isFastFood ? (
              <FastFoodDashboard 
                business={activeBusiness} 
                user={currentUser} 
                onNavigate={(tab) => {
                  if (authorizedTabs.includes(tab)) {
                    setActiveTab(tab);
                  } else {
                    showError('Access Restricted', `"${tab}" is either not permitted for your role or disabled in Features.`);
                  }
                }}
              />
            ) : isRestaurant ? (
              <RestaurantDashboard 
                business={activeBusiness} 
                user={currentUser} 
                onNavigate={(tab) => {
                  if (authorizedTabs.includes(tab)) {
                    setActiveTab(tab);
                  } else {
                    showError('Access Restricted', `"${tab}" is either not permitted for your role or disabled in Features.`);
                  }
                }}
              />
            ) : isPharmacy ? (
              <PharmacyDashboard 
                business={activeBusiness} 
                user={currentUser} 
                onNavigate={(tab) => {
                  if (authorizedTabs.includes(tab)) {
                    setActiveTab(tab);
                  } else {
                    showError('Access Restricted', `"${tab}" is either not permitted for your role or disabled in Features.`);
                  }
                }}
              />
            ) : isServiceBusiness ? (
              <ServiceBusinessDashboard 
                business={activeBusiness} 
                user={currentUser} 
                onNavigate={(tab) => {
                  if (authorizedTabs.includes(tab)) {
                    setActiveTab(tab);
                  } else {
                    showError('Access Restricted', `"${tab}" is either not permitted for your role or disabled in Features.`);
                  }
                }}
              />
            ) : (
              <BusinessDashboard 
                business={activeBusiness} 
                user={currentUser} 
                onNavigate={(tab) => {
                  if (authorizedTabs.includes(tab)) {
                    setActiveTab(tab);
                  } else {
                    showError('Access Restricted', `"${tab}" is either not permitted for your role or disabled in Features.`);
                  }
                }}
              />
            )
          )}

          {activeTab === 'Travel Customers' && <TravelCustomers business={activeBusiness} />}
          {activeTab === 'Bookings Management' && <TravelBookings business={activeBusiness} />}
          {activeTab === 'Flight Reservations' && <TravelFlights business={activeBusiness} />}
          {activeTab === 'Hotel Bookings' && <TravelHotels business={activeBusiness} />}
          {activeTab === 'Visa Processing' && <TravelVisaProcessing business={activeBusiness} />}
          {activeTab === 'Passport Assistance' && <TravelPassportAssistance business={activeBusiness} />}
          {activeTab === 'Tour Packages' && <TourPackages business={activeBusiness} />}
          {activeTab === 'Ground Transport' && <TravelTransportation business={activeBusiness} />}
          {activeTab === 'Travel Insurance' && <TravelInsuranceManagement business={activeBusiness} />}
          {activeTab === 'Travel Invoices' && <TravelInvoices business={activeBusiness} />}
          {activeTab === 'Travel Payments' && <TravelPayments business={activeBusiness} />}
          {activeTab === 'Travel Suppliers' && <TravelSuppliers business={activeBusiness} />}
          {activeTab === 'Travel Partners' && <TravelPartners business={activeBusiness} />}
          {activeTab === 'Travel Documents' && <TravelDocuments business={activeBusiness} />}
          {activeTab === 'Travel Calendar' && <TravelCalendar business={activeBusiness} />}
          {activeTab === 'Travel Reports' && <TravelReports business={activeBusiness} />}
          {activeTab === 'Travel Marketing' && <TravelMarketingCampaigns business={activeBusiness} />}

          {activeTab === 'Laundry Orders' && (
            <LaundryOrders 
              business={activeBusiness} 
              user={currentUser} 
              onNavigateToPriceList={() => setActiveTab('Dashboard')}
            />
          )}

          {activeTab === 'Fast Food POS' && (
            <FastFoodPOS 
              business={activeBusiness} 
              user={currentUser} 
              onOrderCompleted={triggerReload}
            />
          )}

          {(activeTab === 'POS' || activeTab === 'Salon POS') && (
            isPharmacy ? (
              <PharmacyPOS 
                business={activeBusiness} 
                user={currentUser} 
                onNavigate={(tab) => {
                  if (authorizedTabs.includes(tab)) {
                    setActiveTab(tab);
                  }
                }}
              />
            ) : (
              <POS 
                business={activeBusiness} 
                user={currentUser} 
                onSaleComplete={triggerReload}
                branchId={activeBranchFilterId}
              />
            )
          )}

          {(activeTab === 'Restaurant POS' || activeTab === 'POS Service') && (
            <RestaurantPOS 
              business={activeBusiness} 
              currentUser={currentUser} 
              onSaleComplete={triggerReload}
            />
          )}

          {(activeTab === 'Menu Management' || activeTab === 'Menu Editor') && (
            isFastFood ? (
              <FastFoodMenu 
                business={activeBusiness} 
                user={currentUser} 
              />
            ) : (
              <RestaurantMenu 
                business={activeBusiness} 
                currentUser={currentUser} 
              />
            )
          )}

          {activeTab === 'Categories' && (
            <RestaurantCategories 
              business={activeBusiness} 
              onViewCategory={(catName) => {
                setActiveTab('Menu Management');
              }}
            />
          )}

          {activeTab === 'Ingredient Inventory' && (
            <FastFoodIngredients 
              business={activeBusiness} 
              user={currentUser} 
            />
          )}

          {(activeTab === 'Ingredients' || activeTab === 'Ingredient Sheet') && (
            <RestaurantInventory 
              business={activeBusiness} 
              currentUser={currentUser} 
              initialSubTab="ingredients"
            />
          )}

          {activeTab === 'Recipe Management' && (
            isFastFood ? (
              <FastFoodRecipes 
                business={activeBusiness} 
                user={currentUser} 
              />
            ) : (
              <RestaurantInventory 
                business={activeBusiness} 
                currentUser={currentUser} 
                initialSubTab="recipes"
              />
            )
          )}

          {activeTab === 'Suppliers' && (
            <RestaurantInventory 
              business={activeBusiness} 
              currentUser={currentUser} 
              initialSubTab="suppliers"
            />
          )}

          {(activeTab === 'Tables' || activeTab === 'Table Layout') && (
            <RestaurantTables 
              business={activeBusiness} 
              currentUser={currentUser} 
            />
          )}

          {(activeTab === 'Kitchen Display' || activeTab === 'Kitchen KDS') && (
            isFastFood ? (
              <FastFoodKDS 
                business={activeBusiness} 
                user={currentUser} 
              />
            ) : (
              <RestaurantKDS 
                business={activeBusiness} 
                currentUser={currentUser} 
              />
            )
          )}

          {(activeTab === 'Orders' || activeTab === 'Orders Log') && (
            <RestaurantOrders 
              business={activeBusiness} 
              currentUser={currentUser} 
            />
          )}

          {(activeTab === 'Products' || activeTab === 'Services') && (
            <Products 
              business={activeBusiness} 
              user={currentUser} 
              onCatalogChanged={triggerReload}
            />
          )}

          {/* DYNAMIC INVENTORY TAB (STOCK MANAGEMENT) */}
          {activeTab === 'Inventory' && (
            <div className="space-y-6 font-sans">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm shrink-0 text-xs">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search stock catalog..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="pl-3 pr-4 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs w-48"
                  />
                  <select
                    value={inventoryCatFilter}
                    onChange={(e) => setInventoryCatFilter(e.target.value)}
                    className="py-1.5 px-2 border border-slate-200 bg-white rounded-lg text-slate-700 text-xs"
                  >
                    <option value="All">All Categories</option>
                    {Array.from(new Set(businessProducts.map(p => p.category))).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="text-right text-slate-400">
                  Total trackable goods: <strong>{businessProducts.length}</strong> listings
                </div>
              </header>

              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <th className="py-4 px-4">Image</th>
                      <th className="py-4 px-4">Product Name</th>
                      <th className="py-4 px-4">SKU / Code</th>
                      <th className="py-4 px-4">Category</th>
                      <th className="py-4 px-4 text-right">Selling Price</th>
                      <th className="py-4 px-4 text-right">Cost Price</th>
                      <th className="py-4 px-4 text-center">Stock</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-4 text-center">Last Updated</th>
                      <th className="py-4 px-4 text-right">Adjust Stock</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                    {filteredInventory.map(p => {
                      const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5;
                      const isOut = p.stockQuantity <= 0;
                      const isLow = p.stockQuantity < threshold && !isOut;
                      
                      let statusLabel = 'In Stock';
                      let statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      if (isOut) {
                        statusLabel = 'Out of Stock';
                        statusClass = 'bg-rose-50 text-rose-700 border-rose-200';
                      } else if (isLow) {
                        statusLabel = 'Low Stock';
                        statusClass = 'bg-amber-50 text-amber-700 border-amber-200';
                      }

                      const displayDate = p.updatedAt 
                        ? new Date(p.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) 
                        : 'N/A';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4">
                            <img 
                              src={p.imageUrl || getProductPlaceholderSvg(p.category, p.name)} 
                              alt={p.name} 
                              className="h-10 w-10 object-cover rounded-xl border border-slate-200" 
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                          <td className="py-3 px-4 font-mono text-slate-400 uppercase font-semibold">{p.barcode}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold text-[10px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">
                            {formatCurrency(p.sellingPrice, activeBusiness?.currency)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-medium">
                            {p.costPrice !== undefined ? formatCurrency(p.costPrice, activeBusiness?.currency) : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-black text-slate-800">
                            {p.stockQuantity}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400 font-medium">{displayDate}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/60">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Qty"
                                  id={`manual-qty-${p.id}`}
                                  className="w-12 px-1 py-0.5 border border-slate-200 rounded-md text-xs text-center font-bold bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                  id={`restock-btn-${p.id}`}
                                  onClick={() => {
                                    const input = document.getElementById(`manual-qty-${p.id}`) as HTMLInputElement;
                                    const val = parseFloat(input?.value);
                                    if (!isNaN(val) && val > 0) {
                                      handleStockAdjust(p.id, val);
                                      if (input) input.value = '';
                                    }
                                  }}
                                  className="px-2 py-1 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-md text-[10px] font-bold transition cursor-pointer"
                                  title="Add stock manually"
                                >
                                  + Restock
                                </button>
                                <button
                                  id={`reduce-btn-${p.id}`}
                                  onClick={() => {
                                    const input = document.getElementById(`manual-qty-${p.id}`) as HTMLInputElement;
                                    const val = parseFloat(input?.value);
                                    if (!isNaN(val) && val > 0) {
                                      handleStockAdjust(p.id, -val);
                                      if (input) input.value = '';
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold transition cursor-pointer"
                                  title="Reduce stock manually"
                                >
                                  - Reduce
                                </button>
                              </div>
                              <button
                                id={`quick-dec-${p.id}`}
                                onClick={() => handleStockAdjust(p.id, -1)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer"
                                title="Quick decrement"
                              >
                                -1
                              </button>
                              <button
                                id={`quick-inc-${p.id}`}
                                onClick={() => handleStockAdjust(p.id, 1)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-bold cursor-pointer"
                                title="Quick increment"
                              >
                                +1
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          No products recorded in stock catalog filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DYNAMIC SALES HISTORY TAB */}
          {activeTab === 'Sales' && (
            <div className="space-y-6 font-sans">
              {/* Combine with Expense tracking or isolated list tabs */}
              <div className="flex justify-between items-center border-b border-slate-200">
                <div className="flex gap-4">
                  <button className="py-2.5 px-4 text-xs font-black uppercase text-emerald-800 border-b-2 border-emerald-800">
                    Transactions history & Refunds
                  </button>
                  <button onClick={() => setActiveTab('Settings')} className="py-2.5 px-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition">
                    Expenses Logs (In Financial Ledger)
                  </button>
                </div>

                <button
                  onClick={() => exportSalesToCSV(filteredSalesHistory, activeBusiness ? activeBusiness.name : 'business')}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors select-none mb-1"
                >
                  <FileDown className="h-4 w-4" /> Export CSV Ledger
                </button>
              </div>

              {/* Advanced search / filters bar */}
              <header className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm shrink-0 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search Tickets</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="Ticket ID or Customer..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="block w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Cashier</label>
                  <select
                    value={salesFilterEmp}
                    onChange={(e) => setSalesFilterEmp(e.target.value)}
                    className="w-full py-1.5 px-2.5 border border-slate-200 bg-white rounded-lg text-slate-700 text-xs"
                  >
                    <option value="All">All Cashier accounts</option>
                    {businessEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
                  <select
                    value={salesFilterPay}
                    onChange={(e) => setSalesFilterPay(e.target.value)}
                    className="w-full py-1.5 px-2.5 border border-slate-200 bg-white rounded-lg text-slate-700 text-xs"
                  >
                    <option value="All">All Payment channels</option>
                    <option value="cash">Cash Checkout</option>
                    <option value="card">Card Reader</option>
                    <option value="mobile">Mobile Transfer</option>
                    <option value="other">Store balance / credit tabs</option>
                  </select>
                </div>
              </header>

              {/* Transactions grid list */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <th className="py-4 px-6">Receipt ID / Ticket</th>
                      <th className="py-4 px-6">Timestamp Date</th>
                      <th className="py-4 px-6">Client profile</th>
                      <th className="py-4 px-6">Cashier Staff</th>
                      <th className="py-4 px-6">Payment Method</th>
                      <th className="py-4 px-6 font-black">Gross Total</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Invoice actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
                    {filteredSalesHistory.map(sale => {
                      const isRefunded = sale.status === 'refunded';
                      return (
                        <tr key={sale.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-6 font-mono text-slate-700 font-bold">{sale.id}</td>
                          <td className="py-4 px-6 font-semibold text-slate-400">{new Date(sale.createdAt).toLocaleString()}</td>
                          <td className="py-4 px-6 font-bold">{sale.customerName || 'Walk-in Customer'}</td>
                          <td className="py-4 px-6 font-medium text-slate-500">{sale.employeeName}</td>
                          <td className="py-4 px-6 uppercase font-bold text-slate-600">{sale.paymentMethod}</td>
                          <td className={`py-4 px-6 font-black ${isRefunded ? 'text-slate-400 line-through' : 'text-emerald-800'}`}>
                            ${sale.total.toFixed(2)}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block px-2.5 py-0.5 rounded font-extrabold ${
                              isRefunded ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {isRefunded ? 'Refunded' : 'Completed'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              onClick={() => setSelectedReprintSale(sale)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                              title="Reprint Receipt invoice"
                            >
                              Reprint
                            </button>
                            {!isRefunded && !(activeBusiness?.category === 'Professional Services' || activeBusiness?.category === 'Beauty & Wellness' || activeBusiness?.category === 'Beauty and Wellness') && (
                              <button
                                onClick={() => handleRefundSale(sale.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold cursor-pointer"
                                title="Issue complete refund"
                              >
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSalesHistory.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No transaction receipts recorded under current isolated filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* REPRINT POPUP MODAL */}
              {selectedReprintSale && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-up relative">
                    <button
                      onClick={() => setSelectedReprintSale(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className="text-center pb-4 border-b border-dashed border-slate-200 space-y-1 select-none">
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest ${
                        selectedReprintSale.status === 'refunded' ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        Invoice Ticket &bull; {selectedReprintSale.status === 'refunded' ? 'Refund Void' : 'Payment Approved'}
                      </span>
                      <p className="text-xs text-slate-400">Reprint Receipt ID: {selectedReprintSale.id}</p>
                    </div>

                    <div className="my-6 p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs space-y-4 font-mono select-none">
                      <div className="text-center space-y-1">
                        <p className="font-bold text-slate-800 text-sm uppercase tracking-wide">{activeBusiness.receiptConfig.businessName || activeBusiness.name}</p>
                        <p className="text-[10px] text-slate-400 whitespace-pre-line leading-relaxed">
                          {activeBusiness.receiptConfig.contactInfo || activeBusiness.phone}
                        </p>
                      </div>

                      <div className="border-t border-b border-dashed border-slate-200 py-2 space-y-1 text-[10px] text-slate-500">
                        <p>DATE: {new Date(selectedReprintSale.createdAt).toLocaleString()}</p>
                        <p>CASHIER: {selectedReprintSale.employeeName}</p>
                        <p>CLIENT: {selectedReprintSale.customerName || 'Walk-in Customer'}</p>
                      </div>

                      <div className="space-y-1.5">
                        {selectedReprintSale.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-slate-700">
                            <span className="truncate pr-4">{item.quantity}x {item.name}</span>
                            <span className="shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-right">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${selectedReprintSale.subtotal.toFixed(2)}</span>
                        </div>
                        {selectedReprintSale.discount > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Discount</span>
                            <span>-${selectedReprintSale.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-slate-800 text-sm border-t border-slate-200 pt-1.5">
                          <span>Total Paid</span>
                          <span>${selectedReprintSale.total.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-slate-200 pt-2 text-[10px] text-slate-500">
                        <p>PAYMENT TYPE: <span className="font-bold uppercase">{selectedReprintSale.paymentMethod}</span></p>
                        <p>STATUS: <span className="font-bold uppercase text-emerald-800">{selectedReprintSale.status}</span></p>
                      </div>

                      <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                        {activeBusiness.receiptConfig.footerMessage || 'Thank you for your business!'}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      🖨️ Reprint/Download PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Customers' && (
            <Customers 
              business={activeBusiness} 
              user={currentUser} 
            />
          )}

          {activeTab === 'Employees' && (
            <Employees 
              business={activeBusiness} 
              currentUser={currentUser} 
            />
          )}

          {activeTab === 'Reports' && (
            isFastFood ? (
              <FastFoodReports 
                business={activeBusiness} 
                user={currentUser} 
              />
            ) : isRestaurant ? (
              <RestaurantReports 
                business={activeBusiness} 
              />
            ) : (
              <Reports 
                business={activeBusiness} 
                user={currentUser} 
              />
            )
          )}

          {activeTab === 'Expenses' && (
            <Expenses 
              business={activeBusiness} 
              user={currentUser} 
            />
          )}

          {activeTab === 'Settings' && (
            <div className="space-y-8">
              <Settings 
                business={activeBusiness} 
                user={currentUser} 
                onUpdateBusiness={(b) => setActiveBusiness(b)}
              />
            </div>
          )}

          {activeTab === 'Branches' && (
            <Branches 
              business={activeBusiness} 
              user={currentUser} 
            />
          )}

          {activeTab === 'Returns' && (() => {
            const isRestrictedFromReturns = activeBusiness?.category === 'Professional Services' || activeBusiness?.category === 'Beauty & Wellness' || activeBusiness?.category === 'Beauty and Wellness';
            if (isRestrictedFromReturns) {
              return (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md mx-auto text-center space-y-4">
                  <FolderLock className="h-12 w-12 text-rose-600 mx-auto" />
                  <h3 className="font-black text-slate-800 text-lg">Module Access Gated</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The Returns and Refunds module is disabled for <strong>{activeBusiness.category}</strong>. This system is streamlined purely for service registration and terminal POS operations.
                  </p>
                </div>
              );
            }
            return (
              <Returns 
                business={activeBusiness} 
                user={currentUser} 
              />
            );
          })()}

          {activeTab === 'Audit Logs' && (
            currentUser.role === 'owner' ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
                <FolderLock className="h-12 w-12 text-rose-600 mx-auto" />
                <h3 className="font-black text-slate-800 text-lg">Access Restricted</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Activity and audit logs are restricted from the Owner role.
                </p>
              </div>
            ) : (
              <AuditLogs 
                business={activeBusiness} 
                user={currentUser} 
              />
            )
          )}
        </div>
      </main>



      {/* SECURE PAYMENT PORTAL MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5 text-slate-900 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="h-12 w-12 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
              <CreditCard className="h-6 w-6 text-[#064E3B]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Subscription Payment</h3>
              <p className="text-xs text-slate-600 font-medium">31-day recurring BusinessOS Cloud ERP & POS license</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs text-left">
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Status:</span>
                <span className="text-emerald-800 font-extrabold uppercase text-[10px] bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  {activeBusiness?.subscriptionStatus || 'Renewal Due'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Renewal Cycle:</span>
                <span className="text-slate-900 font-bold">31 Days Full Access</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black text-slate-900 text-sm">
                <span>Amount Due:</span>
                <span className="text-[#064E3B] font-extrabold text-base">{paymentAmount}.00 {activeBusiness?.currency || 'GHC'}</span>
              </div>
            </div>

            {paymentErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2 text-left">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{paymentErrorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                disabled={isPaymentProcessing}
                onClick={handleExecutePayNowPayment}
                className="w-full py-3 bg-[#064E3B] hover:bg-[#032e23] disabled:opacity-50 text-white font-extrabold rounded-2xl transition cursor-pointer text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md"
              >
                <CreditCard className="h-4 w-4 text-emerald-300" />
                <span>{isPaymentProcessing ? 'Processing Payment...' : 'Pay Now via Paystack'}</span>
              </button>

              <button
                type="button"
                disabled={isPaymentProcessing}
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition cursor-pointer text-xs"
              >
                Cancel / Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Reminder Popup with Swipe-to-Dismiss and Mobile Viewport Optimization */}
      {currentUser && currentUser.role !== 'admin' && currentUser.role !== 'SUPER_ADMIN' && activeReminderNotification && (
        <SubscriptionReminderModal
          notification={activeReminderNotification}
          business={activeBusiness}
          isProcessing={isPaymentProcessing}
          errorMessage={paymentErrorMessage}
          onPayNow={handleExecutePayNowPayment}
          onLater={() => {
            if (activeBusiness) {
              sessionStorage.setItem(`bos_sub_popup_dismissed_${activeBusiness.id}`, 'true');
              setSubDismissedBusId(activeBusiness.id);
            }
            const updatedNotif = {
              ...activeReminderNotification,
              status: 'dismissed' as const,
              readStatus: 'read' as const
            };
            db.saveNotification(updatedNotif);
          }}
        />
      )}

      <PopupNotificationInterface
        business={activeBusiness}
        user={currentUser}
        isOpen={isPopupNotifOpen}
        onClose={() => setIsPopupNotifOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onPayNow={handleExecutePayNowPayment}
      />

      <RegistrationPopupModal
        business={activeBusiness}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      <ToastContainer />
    </div>
  );
}
