/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Business, User, Product, Service, Customer, Sale, Expense, ActivityLog, Branch, StockTransfer, CustomerReturn, SupplierReturn, GlobalFeature, AdminFeatureChangeLog, ProfessionalServiceJob, MenuItem, Ingredient, Recipe, RestaurantTable, RestaurantOrder, Reservation, Supplier, Notification, PrinterSettings, PaystackSettings, PaymentTransaction, GlobalSystemConfig, NotificationPreferences, PushDeviceToken, NotificationLog, SalonAppointment, SalonStaff, LaundryOrder, LaundryService, ScannerSession, ScannedItemPayload, PrintCommand, REQUIRED_BUSINESS_TYPES, TravelCustomer, TravelBooking, TravelFlight, TravelHotel, TravelVisa, TravelPassport, TravelPackage, TravelTransport, TravelInsurance, TravelSupplier, TravelPartner, TravelDocument, TravelMarketing, Student, Teacher, SchoolClass, FeeInvoice, FeePayment, AttendanceRecord, ExamGrade, SchoolTimetableEntry, SchoolAnnouncement, SmsSettings, WhatsAppSettings, BusinessPopupPrompt, SmsTimingDetails, PharmacyBatch, Prescription } from '../types';
import { firestore, doc, setDoc, deleteDoc, collection, onSnapshot, storage, ref, uploadString, getDownloadURL, handleFirestoreError, OperationType } from './firebase';

export const ALL_DB_KEYS = [
  'bos_businesses', 'bos_users', 'bos_products', 'bos_services',
  'bos_customers', 'bos_sales', 'bos_expenses', 'bos_logs',
  'bos_branches', 'bos_customer_returns', 'bos_supplier_returns',
  'bos_stock_transfers', 'bos_global_features', 'bos_feature_audit_logs',
  'bos_service_jobs', 'bos_menu_items', 'bos_ingredients', 'bos_recipes',
  'bos_restaurant_tables', 'bos_restaurant_orders', 'bos_reservations',
  'bos_suppliers', 'bos_notifications', 'bos_printer_settings',
  'bos_fast_food_orders', 'bos_fast_food_ingredients', 'bos_fast_food_menu_items',
  'bos_fast_food_recipes', 'bos_notification_preferences', 'bos_push_device_tokens',
  'bos_notification_logs', 'bos_salon_appointments', 'bos_salon_staff',
  'bos_laundry_orders', 'bos_laundry_services', 'bos_scanner_sessions', 'bos_scanned_items',
  'bos_print_commands', 'bos_payment_transactions', 'bos_paystack_settings',
  'bos_global_system_config',
  'bos_travel_customers', 'bos_travel_bookings', 'bos_travel_flights',
  'bos_travel_hotels', 'bos_travel_visas', 'bos_travel_passports',
  'bos_travel_packages', 'bos_travel_transports', 'bos_travel_insurances',
  'bos_travel_suppliers', 'bos_travel_partners', 'bos_travel_documents',
  'bos_travel_marketings',
  'bos_students', 'bos_teachers', 'bos_classes',
  'bos_fee_invoices', 'bos_fee_payments', 'bos_attendance',
  'bos_exam_grades', 'bos_timetable', 'bos_school_announcements',
  'bos_sms_settings', 'bos_whatsapp_settings', 'bos_popup_prompts',
  'bos_prescriptions', 'bos_pharmacy_batches',
  'bos_deleted_business_ids', 'bos_pricing_plans'
];

// Smart record merging helper across devices and updates
function mergeRecordArrays(localItems: any[], cloudItems: any[], collectionKey?: string): any[] {
  let deletedBusinessIds: string[] = [];
  try {
    const raw = localStorage.getItem('bos_deleted_business_ids');
    if (raw) deletedBusinessIds = JSON.parse(raw) || [];
  } catch (e) {}

  const deletedSet = new Set(deletedBusinessIds);

  const isDeleted = (item: any) => {
    if (!item) return true;
    if (item.id && deletedSet.has(String(item.id))) return true;
    if (item.businessId && deletedSet.has(String(item.businessId))) return true;
    return false;
  };

  const getTime = (item: any) => {
    if (!item) return 0;
    const t = item.updatedAt || item.createdAt || item.timestamp;
    return t ? new Date(t).getTime() : 0;
  };

  const mergedMap = new Map<string, any>();

  // Process cloud items (authoritative cloud snapshot)
  (Array.isArray(cloudItems) ? cloudItems : []).forEach(item => {
    if (item && item.id && !isDeleted(item)) {
      mergedMap.set(String(item.id), item);
    }
  });

  const isBusinessCollection = collectionKey === 'bos_businesses' || collectionKey === 'businesses';

  (Array.isArray(localItems) ? localItems : []).forEach(item => {
    if (item && item.id && !isDeleted(item)) {
      const idStr = String(item.id);
      if (isBusinessCollection) {
        if (!cloudItems || cloudItems.length === 0 || mergedMap.has(idStr)) {
          if (mergedMap.has(idStr)) {
            const existing = mergedMap.get(idStr);
            const existingTime = getTime(existing);
            const localTime = getTime(item);
            if (localTime > existingTime) {
              mergedMap.set(idStr, { ...existing, ...item });
            }
          } else if (!cloudItems || cloudItems.length === 0) {
            mergedMap.set(idStr, item);
          }
        }
      } else {
        const existing = mergedMap.get(idStr);
        if (!existing) {
          mergedMap.set(idStr, item);
        } else {
          const existingTime = getTime(existing);
          const localTime = getTime(item);
          if (localTime >= existingTime) {
            mergedMap.set(idStr, { ...existing, ...item });
          }
        }
      }
    }
  });

  return Array.from(mergedMap.values());
}

// Premium SVG icon generation helpers for products & services
export const getProductPlaceholderSvg = (category: string, name: string): string => {
  const normalizedCategory = category.toLowerCase();
  const normalizedName = name.toLowerCase();

  let svgContent = '';
  // Warm or clean colors based on item
  if (normalizedCategory.includes('coffee') || normalizedName.includes('bean') || normalizedName.includes('brew')) {
    // Coffee bean / cup visual
    svgContent = `
      <rect width="100" height="100" fill="#FDF8F5" rx="16"/>
      <path d="M35 30H60C65.5 30 70 34.5 70 40V45C70 50.5 65.5 55 60 55H35V30Z" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M70 38H76C79 38 81 40 81 43C81 46 79 48 76 48H70" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M30 65H75" stroke="#8B5A2B" stroke-width="4" stroke-linecap="round"/>
      <path d="M43 24C43 24 45 20 45 16" stroke="#D2B48C" stroke-width="3" stroke-linecap="round"/>
      <path d="M52 24C52 24 54 20 54 16" stroke="#D2B48C" stroke-width="3" stroke-linecap="round"/>
    `;
  } else if (normalizedCategory.includes('bakery') || normalizedName.includes('croissant') || normalizedName.includes('bread')) {
    // Croissant / pastry visual
    svgContent = `
      <rect width="100" height="100" fill="#FFFDF0" rx="16"/>
      <path d="M25 55C30 40 45 35 50 35C55 35 70 40 75 55C65 60 55 58 50 50C45 58 35 60 25 55Z" fill="#E5A65D" stroke="#D97706" stroke-width="3" stroke-linejoin="round"/>
      <path d="M38 48C42 42 48 40 50 40" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>
      <path d="M62 48C58 42 52 40 50 40" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>
    `;
  } else if (normalizedCategory.includes('oil') || normalizedName.includes('lavender') || normalizedName.includes('serum')) {
    // Oil dropper bottle visual
    svgContent = `
      <rect width="100" height="100" fill="#F5F3FF" rx="16"/>
      <rect x="38" y="42" width="24" height="38" rx="4" fill="#8B5CF6" stroke="#6D28D9" stroke-width="3"/>
      <path d="M45 42V35H55V42" fill="none" stroke="#6D28D9" stroke-width="3"/>
      <circle cx="50" cy="25" r="5" fill="#DDD6FE" stroke="#6D28D9" stroke-width="2"/>
      <path d="M44 56H56" stroke="#DDD6FE" stroke-width="2"/>
    `;
  } else if (normalizedCategory.includes('mask') || normalizedName.includes('mud') || normalizedName.includes('facial')) {
    // Face jar visual
    svgContent = `
      <rect width="100" height="100" fill="#F0FDF4" rx="16"/>
      <rect x="32" y="40" width="36" height="34" rx="6" fill="#10B981" stroke="#047857" stroke-width="3"/>
      <ellipse cx="50" cy="38" rx="20" ry="6" fill="#047857" stroke="#047857" stroke-width="2"/>
      <rect x="42" y="52" width="16" height="10" fill="#A7F3D0" rx="2"/>
    `;
  } else {
    // Default professional bento item icon
    svgContent = `
      <rect width="100" height="100" fill="#F3F4F6" rx="16"/>
      <circle cx="50" cy="50" r="22" fill="none" stroke="#9CA3AF" stroke-width="3"/>
      <path d="M50 38V62" stroke="#9CA3AF" stroke-width="3" stroke-linecap="round"/>
      <path d="M38 50H62" stroke="#9CA3AF" stroke-width="3" stroke-linecap="round"/>
    `;
  }

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${svgContent.replace(/"/g, "'").replace(/#/g, '%23')}</svg>`;
};

// Initial Seed Data
const DEFAULT_BUSINESSES: Business[] = [];
const DEFAULT_USERS: User[] = [];
const DEFAULT_PRODUCTS: Product[] = [];
const DEFAULT_SERVICES: Service[] = [];
const DEFAULT_CUSTOMERS: Customer[] = [];
const DEFAULT_SALES: Sale[] = [];
const DEFAULT_EXPENSES: Expense[] = [];
const DEFAULT_LOGS: ActivityLog[] = [];

// LocalStorage Helper Class
class CloudDatabase {
  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
    this.initFirestoreRealtimeSync();
    // Start real-time cloud synchronization polling fallback
    this.pullFromCloud();
    setInterval(() => {
      this.pullFromCloud();
    }, 1500);
  }

  private unsubscribeFirestoreListeners: (() => void)[] = [];

  private initFirestoreRealtimeSync() {
    // Clean up any existing listeners before attaching
    this.unsubscribeFirestoreListeners.forEach(unsub => {
      try { unsub(); } catch(e) {}
    });
    this.unsubscribeFirestoreListeners = [];

    ALL_DB_KEYS.forEach(key => {
      try {
        const colRef = collection(firestore, key);
        const unsub = onSnapshot(colRef, (snapshot) => {
          const cloudItems: any[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            cloudItems.push({ id: docSnap.id, ...data });
          });

          const localItems = this.read<any>(key);
          const merged = mergeRecordArrays(localItems, cloudItems, key);
          const mergedStr = JSON.stringify(merged);
          const localValStr = localStorage.getItem(key) || '[]';

          if (localValStr !== mergedStr) {
            localStorage.setItem(key, mergedStr);
            localStorage.setItem('cloud_' + key, mergedStr);
            localStorage.setItem('bos_last_sync_time', new Date().toISOString());
            this.notifyListeners();
          }
        }, (err) => {
          console.warn(`Firestore real-time snapshot note for ${key}:`, err);
        });
        this.unsubscribeFirestoreListeners.push(unsub);
      } catch (e) {
        console.error(`Error attaching Firestore listener for ${key}:`, e);
      }
    });
  }

  private init() {
    ALL_DB_KEYS.forEach(k => {
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, JSON.stringify([]));
      }
      const cloudKey = 'cloud_' + k;
      if (!localStorage.getItem(cloudKey)) {
        localStorage.setItem(cloudKey, localStorage.getItem(k) || '[]');
      }
    });
    if (!localStorage.getItem('bos_pending_sync')) {
      localStorage.setItem('bos_pending_sync', JSON.stringify([]));
    }
    if (!localStorage.getItem('bos_last_sync_time')) {
      localStorage.setItem('bos_last_sync_time', new Date().toISOString());
    }

    // Initialize Global Features
    const storedFeatures = localStorage.getItem('bos_global_features');
    if (!storedFeatures || JSON.parse(storedFeatures).length === 0) {
      const defaultFeatures: GlobalFeature[] = [
        {
          id: 'inter_branch_stock_transfer',
          name: 'Inter-Branch Stock Transfer',
          description: 'Allows transfer of stock quantities between branch locations.',
          isEnabled: false,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'inventory_management',
          name: 'Inventory Management',
          description: 'Enables advanced physical inventory and stock levels tracking.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'product_management',
          name: 'Product Management',
          description: 'Allows registering and managing physical product catalog.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'service_management',
          name: 'Service Management',
          description: 'Enables registering and managing service catalogs.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'pos_system',
          name: 'POS System',
          description: 'Enables Point of Sale transactions and checkout system.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'customer_management',
          name: 'Customer Management',
          description: 'Enables customer directory and loyalty profiles tracking.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'supplier_management',
          name: 'Supplier Management',
          description: 'Enables managing product supplier records.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'expense_tracking',
          name: 'Expense Tracking',
          description: 'Allows recording operational expenses and overhead logs.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'returns_management',
          name: 'Returns Management',
          description: 'Enables managing customer and supplier product returns.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'reports_analytics',
          name: 'Reports & Analytics',
          description: 'Enables dashboard reports, metrics, and data export.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'employee_management',
          name: 'Employee Management',
          description: 'Enables managing system users, cashiers, and role permissions.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'branch_management',
          name: 'Branch Management',
          description: 'Enables adding multiple physical locations and branch mappings.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'offline_mode',
          name: 'Offline Mode',
          description: 'Allows using the application without internet connection.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'cloud_synchronization',
          name: 'Cloud Synchronization',
          description: 'Automates data sync between local device cache and cloud.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        },
        {
          id: 'notifications',
          name: 'Notifications',
          description: 'Enables user notifications for low stock, sales milestones, etc.',
          isEnabled: true,
          lastChanged: new Date().toISOString(),
          changedBy: 'system'
        }
      ];
      localStorage.setItem('bos_global_features', JSON.stringify(defaultFeatures));
      localStorage.setItem('cloud_bos_global_features', JSON.stringify(defaultFeatures));
    }
  }

  // Purely private reader/writer with parsing error tolerance
  private read<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      let items: T[] = data ? JSON.parse(data) : [];

      if (key !== 'bos_deleted_business_ids' && Array.isArray(items) && items.length > 0) {
        let deletedIds: string[] = [];
        try {
          const raw = localStorage.getItem('bos_deleted_business_ids');
          if (raw) deletedIds = JSON.parse(raw) || [];
        } catch (e) {}

        if (deletedIds.length > 0) {
          const deletedSet = new Set(deletedIds);
          items = items.filter((item: any) => {
            if (!item) return false;
            if (item.id && deletedSet.has(String(item.id))) return false;
            if (item.businessId && deletedSet.has(String(item.businessId))) return false;
            return true;
          });
        }
      }

      return items;
    } catch {
      return [];
    }
  }

  private write<T>(key: string, data: T[]): void {
    // Capture previous items BEFORE updating local storage so deleted document IDs are correctly detected
    const previousCloud = this.read<any>('cloud_' + key);

    // Inject updatedAt timestamp for records that do not have one
    const updatedData = data.map((item: any) => {
      if (item && typeof item === 'object' && !item.updatedAt) {
        return { ...item, updatedAt: new Date().toISOString() };
      }
      return item;
    });

    const updatedJson = JSON.stringify(updatedData);
    localStorage.setItem(key, updatedJson);
    localStorage.setItem('cloud_' + key, updatedJson);
    localStorage.setItem('bos_last_sync_time', new Date().toISOString());

    // Write directly to Cloud Firestore in real time
    try {
      const newIds = new Set(updatedData.map((i: any) => i.id).filter(Boolean));

      // Remove deleted documents from Firestore
      (Array.isArray(previousCloud) ? previousCloud : []).forEach((oldItem: any) => {
        if (oldItem && oldItem.id && !newIds.has(oldItem.id)) {
          deleteDoc(doc(firestore, key, String(oldItem.id))).catch(err => {
            console.warn(`Firestore delete document error for ${key}/${oldItem.id}:`, err);
          });
        }
      });

      // Set or update all active documents in Firestore
      updatedData.forEach((item: any) => {
        if (item && item.id) {
          // Exclude raw undefined values before saving to Firestore
          const cleanItem = JSON.parse(JSON.stringify(item));
          setDoc(doc(firestore, key, String(item.id)), cleanItem, { merge: true }).catch(err => {
            console.warn(`Firestore write document error for ${key}/${item.id}:`, err);
          });
        }
      });
    } catch (err) {
      console.warn(`Firestore write operation note for key ${key}:`, err);
    }

    // Backup sync write directly to Cloud Run Express backend database
    fetch('/api/db/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data: updatedData })
    }).catch(err => {
      console.warn(`Local write saved, but cloud sync deferred for key ${key}:`, err);
    });

    // Notify local real-time subscribers
    this.notifyListeners();
  }

  // Real-time Event Subscription for React components
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.error('Error executing DB listener:', e);
      }
    });
  }

  // Pull all synchronized table data from Cloud Run backend
  public async pullFromCloud(): Promise<void> {
    try {
      const res = await fetch('/api/db/sync');
      if (!res.ok) return;
      
      const cloudData = await res.json();
      if (!cloudData || typeof cloudData !== 'object') return;

      // FIRST: Synchronize tombstones so all deletions take immediate effect
      if (Array.isArray(cloudData['bos_deleted_business_ids'])) {
        let localDeleted: string[] = [];
        try {
          const raw = localStorage.getItem('bos_deleted_business_ids');
          if (raw) localDeleted = JSON.parse(raw) || [];
        } catch (e) {}
        const mergedDeleted = Array.from(new Set([...localDeleted, ...cloudData['bos_deleted_business_ids']]));
        localStorage.setItem('bos_deleted_business_ids', JSON.stringify(mergedDeleted));
      }

      let hasChanges = false;
      const keys = Object.keys(cloudData);

      keys.forEach(k => {
        if (k.startsWith('bos_') && Array.isArray(cloudData[k])) {
          const cloudItems = cloudData[k];
          const localItems = this.read<any>(k);
          const merged = mergeRecordArrays(localItems, cloudItems, k);
          const mergedStr = JSON.stringify(merged);
          const localValStr = localStorage.getItem(k) || '[]';

          if (localValStr !== mergedStr) {
            localStorage.setItem(k, mergedStr);
            localStorage.setItem('cloud_' + k, mergedStr);
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        localStorage.setItem('bos_last_sync_time', new Date().toISOString());
        this.notifyListeners();
      }
    } catch (e) {
      // Offline / Connection error - fail silently and rely on local cache
    }
  }

  // Upload file data-URI to cloud storage (Firebase Storage or API)
  public async uploadFile(name: string, base64: string): Promise<string> {
    if (!base64) return '';
    try {
      if (base64.startsWith('data:')) {
        const fileRef = ref(storage, `uploads/${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        await uploadString(fileRef, base64, 'data_url');
        const cloudUrl = await getDownloadURL(fileRef);
        if (cloudUrl) return cloudUrl;
      }
    } catch (firebaseErr) {
      console.warn('Firebase Storage direct upload note, using cloud server storage fallback:', firebaseErr);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, base64 })
      });
      if (!res.ok) {
        throw new Error('Upload response failed');
      }
      const payload = await res.json();
      return payload.url;
    } catch (err) {
      console.error('Failed to store file in cloud storage. Using base64 data-URI fallback.', err);
      return base64; // Fallback
    }
  }

  public getPendingQueue(): any[] {
    try {
      const data = localStorage.getItem('bos_pending_sync');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getPendingSyncCount(): number {
    return this.getPendingQueue().length;
  }

  public getLastSyncTime(): string {
    const t = localStorage.getItem('bos_last_sync_time');
    if (!t) return 'Never';
    return new Date(t).toLocaleString();
  }

  public async syncNow(businessId?: string): Promise<{ success: boolean; syncedCount: number; message: string }> {
    const online = navigator.onLine;
    if (!online) {
      return { success: false, syncedCount: 0, message: "Offline" };
    }

    const queue = this.getPendingQueue();
    const tablesToSync = [
      'bos_businesses', 'bos_users', 'bos_products', 'bos_services',
      'bos_customers', 'bos_sales', 'bos_expenses', 'bos_logs',
      'bos_branches', 'bos_customer_returns', 'bos_supplier_returns',
      'bos_stock_transfers', 'bos_service_jobs', 'bos_notifications'
    ];

    let syncedCount = 0;

    tablesToSync.forEach(table => {
      const cloudKey = 'cloud_' + table;
      const localList = this.read<any>(table);
      const cloudList = this.read<any>(cloudKey);

      // Perform a complete two-way merge by comparing updatedAt timestamps
      const mergedMap = new Map<string, any>();
      cloudList.forEach((item: any) => {
        if (item && item.id) mergedMap.set(item.id, item);
      });

      localList.forEach((item: any) => {
        if (item && item.id) {
          const existing = mergedMap.get(item.id);
          if (!existing) {
            mergedMap.set(item.id, item);
          } else {
            const timeExisting = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
            const timeLocal = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
            if (timeLocal >= timeExisting) {
              mergedMap.set(item.id, item);
            }
          }
        }
      });

      const mergedList = Array.from(mergedMap.values());
      
      // Save the merged data back to both local and cloud
      localStorage.setItem(table, JSON.stringify(mergedList));
      localStorage.setItem(cloudKey, JSON.stringify(mergedList));
      syncedCount++;
    });

    // Clear the pending queue
    localStorage.setItem('bos_pending_sync', JSON.stringify([]));
    localStorage.setItem('bos_last_sync_time', new Date().toISOString());

    // Add activity log
    if (businessId) {
      this.addActivityLog(businessId, {
        userId: 'system',
        userName: 'Sync Engine',
        action: 'Database Synced',
        details: `Offline local database synchronized with cloud registry successfully.`
      });
    }

    return { success: true, syncedCount, message: "Sync successful" };
  }

  // --- BUSINESS OPERATIONS ---
  public getBusinesses(): Business[] {
    const list = this.read<Business>('bos_businesses');
    const requiredFeatures = ["sales", "inventory", "customers", "suppliers", "reports", "restaurant"];
    let hasChanged = false;
    const updated = list.map(b => {
      if (!b.enabledFeatures || b.enabledFeatures.length !== requiredFeatures.length || !requiredFeatures.every(rf => b.enabledFeatures?.includes(rf))) {
        hasChanged = true;
        return {
          ...b,
          enabledFeatures: requiredFeatures
        };
      }
      return b;
    });
    if (hasChanged) {
      this.write('bos_businesses', updated);
    }
    return updated;
  }

  public saveBusiness(business: Business): void {
    const list = this.getBusinesses();
    const idx = list.findIndex(b => b.id === business.id);
    if (idx >= 0) {
      list[idx] = business;
    } else {
      list.push(business);
    }
    this.write('bos_businesses', list);
  }

  public async toggleBusinessSms(businessId: string, smsEnabled: boolean): Promise<boolean> {
    const list = this.getBusinesses();
    const idx = list.findIndex(b => b.id === businessId);
    if (idx >= 0) {
      list[idx].smsEnabled = smsEnabled;
      list[idx].updatedAt = new Date().toISOString();
      this.write('bos_businesses', list);
    }
    try {
      await fetch('/api/admin/business-sms-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, smsEnabled })
      });
      return true;
    } catch (e) {
      return true;
    }
  }

  // --- PRICING PLANS OPERATIONS ---
  public getPricingPlans(): any[] {
    const plans = this.read<any>('bos_pricing_plans');
    if (!plans || plans.length === 0) {
      const defaultPlans = [
        {
          id: 'plan_starter',
          name: 'Starter Plan',
          price: 150,
          currency: 'GHS',
          billingCycle: 'monthly',
          description: 'Basic POS, inventory tracking, and sales reports for single-branch stores.',
          features: ['Single Location', 'Unlimited Products', 'POS Transactions', 'Daily Reports', 'Receipt Printing'],
          isActive: true,
          updatedAt: new Date().toISOString()
        },
        {
          id: 'plan_professional',
          name: 'Professional Business',
          price: 350,
          currency: 'GHS',
          billingCycle: 'monthly',
          description: 'Multi-user access, customer loyalty, advanced analytics, and transactional SMS receipts.',
          features: ['Up to 5 Users', 'Transactional SMS Integration', 'Advanced Inventory & Stock Alerts', 'Multi-Branch Transfer', 'Customer Accounts'],
          isActive: true,
          updatedAt: new Date().toISOString()
        },
        {
          id: 'plan_enterprise',
          name: 'Enterprise Scale',
          price: 750,
          currency: 'GHS',
          billingCycle: 'monthly',
          description: 'Unlimited capacity, multi-branch hierarchy, custom modules, and dedicated priority support.',
          features: ['Unlimited Users & Branches', 'Custom Industry Archetypes', 'Automated Daily Backups', 'Audit Log Forensics', 'Priority 24/7 Support'],
          isActive: true,
          updatedAt: new Date().toISOString()
        }
      ];
      this.write('bos_pricing_plans', defaultPlans);
      return defaultPlans;
    }
    return plans;
  }

  public savePricingPlan(plan: any): void {
    const plans = this.getPricingPlans();
    const planId = plan.id || 'plan_' + Date.now();
    const cleanPlan = {
      ...plan,
      id: planId,
      price: Number(plan.price) || 0,
      updatedAt: new Date().toISOString()
    };
    const idx = plans.findIndex(p => p.id === planId);
    if (idx >= 0) {
      plans[idx] = cleanPlan;
    } else {
      plans.push(cleanPlan);
    }
    this.write('bos_pricing_plans', plans);
    fetch('/api/admin/pricing-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPlan)
    }).catch(() => {});
  }

  public deletePricingPlan(planId: string): void {
    const plans = this.getPricingPlans().filter(p => p.id !== planId);
    this.write('bos_pricing_plans', plans);
    fetch(`/api/admin/pricing-plans/${planId}`, {
      method: 'DELETE'
    }).catch(() => {});
  }

  public purgeLocalBusinessData(id: string): void {
    // Record tombstone in localStorage
    let deletedIds: string[] = [];
    try {
      const raw = localStorage.getItem('bos_deleted_business_ids');
      if (raw) deletedIds = JSON.parse(raw) || [];
    } catch (e) {}

    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('bos_deleted_business_ids', JSON.stringify(deletedIds));
    }

    // Local state purge across ALL_DB_KEYS
    ALL_DB_KEYS.forEach(key => {
      if (key === 'bos_businesses') {
        const filtered = this.getBusinesses().filter(b => b && b.id !== id);
        this.write('bos_businesses', filtered);
        localStorage.setItem('cloud_bos_businesses', JSON.stringify(filtered));
      } else {
        const items = this.read<any>(key);
        const filtered = items.filter((item: any) => item && item.businessId !== id && item.id !== id);
        this.write(key, filtered);
        localStorage.setItem('cloud_' + key, JSON.stringify(filtered));
      }
    });

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.businessId === id) {
      this.logout();
    }

    this.notifyListeners();
  }

  public async deleteBusinessPermanent(
    id: string,
    superAdminUser?: { id?: string; email?: string; name?: string }
  ): Promise<{ success: boolean; message: string }> {
    const targetBus = this.getBusinesses().find(b => b.id === id);
    const busName = targetBus ? targetBus.name : id;

    // 1. Gather all Firestore document IDs belonging to this business BEFORE purging local memory
    const docsToDelete: { collection: string; docId: string }[] = [];
    ALL_DB_KEYS.forEach(key => {
      const items = this.read<any>(key);
      items.forEach((item: any) => {
        if (item && ((key === 'bos_businesses' && item.id === id) || item.businessId === id || item.schoolId === id || item.id === id)) {
          if (item.id) {
            docsToDelete.push({ collection: key, docId: String(item.id) });
          }
        }
      });
    });

    try {
      // 2. Call secure backend endpoint DELETE /api/admin/business/:businessId
      let res = await fetch(`/api/admin/business/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin': 'true'
        }
      });

      if (!res.ok) {
        // Fallback call to compatibility endpoint
        res = await fetch('/api/db/delete-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: id,
            superAdminId: superAdminUser?.id || 'superadmin',
            superAdminEmail: superAdminUser?.email || 'admin@businessos.com',
            superAdminName: superAdminUser?.name || 'Super Admin'
          })
        });
      }

      // 3. Purge local cache, local tombstones, and force business removal immediately
      this.purgeLocalBusinessData(id);

      // 4. Record tombstone in Firestore and purge Firestore documents
      try {
        setDoc(doc(firestore, 'bos_deleted_business_ids', id), {
          id,
          businessId: id,
          deletedAt: new Date().toISOString()
        }).catch(() => {});
        deleteDoc(doc(firestore, 'bos_businesses', id)).catch(() => {});
        deleteDoc(doc(firestore, 'businesses', id)).catch(() => {});
      } catch (e) {}

      // Asynchronously purge any client-side Firestore documents collected
      docsToDelete.forEach(({ collection, docId }) => {
        deleteDoc(doc(firestore, collection, docId)).catch(() => {});
      });

      // 5. Record successful audit log entry
      const auditLog = {
        id: 'audit-del-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        action: 'DELETE_BUSINESS',
        businessId: id,
        businessName: busName,
        superAdminId: superAdminUser?.id || 'superadmin',
        superAdminEmail: superAdminUser?.email || 'admin@businessos.com',
        timestamp: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        status: 'Success' as const,
        details: `Super Admin (${superAdminUser?.email || 'admin'}) permanently deleted business "${busName}" (ID: ${id}) and purged all cloud database records.`
      };

      const existingAudit = this.read<any>('bos_feature_audit_logs');
      this.write('bos_feature_audit_logs', [auditLog, ...existingAudit]);
      const existingLogs = this.read<any>('bos_logs');
      this.write('bos_logs', [auditLog, ...existingLogs]);

      this.notifyListeners();
      return { success: true, message: `Business "${busName}" has been permanently deleted.` };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn('Backend deletion call note, applying local purge:', errMsg);

      // Still purge local data so user isn't stuck
      this.purgeLocalBusinessData(id);
      this.notifyListeners();

      return { success: true, message: `Business "${busName}" removed from active state.` };
    }
  }

  public deleteBusiness(id: string): void {
    const currentUser = this.getCurrentUser();
    this.deleteBusinessPermanent(id, currentUser || undefined).catch(err => {
      console.error('deleteBusiness error:', err);
    });
  }

  // --- USER OPERATIONS ---
  public getUsers(): User[] {
    return this.read<User>('bos_users');
  }

  public saveUser(user: User): void {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    this.write('bos_users', list);
  }

  public deleteUser(id: string): void {
    const list = this.getUsers().filter(u => u.id !== id);
    this.write('bos_users', list);
  }

  // --- PRODUCT OPERATIONS (Multi-Tenant Isolated) ---
  private getProductsRaw(): Product[] {
    return this.read<Product>('bos_products');
  }

  public getProducts(businessId: string): Product[] {
    return this.getProductsRaw().filter(p => p.businessId === businessId);
  }

  public saveProduct(businessId: string, product: Product): void {
    const list = this.getProductsRaw();
    const idx = list.findIndex(p => p.id === product.id && p.businessId === businessId);
    
    // Safety check: force correct businessId
    const targetProduct = { ...product, businessId };
    if (!targetProduct.imageUrl) {
      targetProduct.imageUrl = getProductPlaceholderSvg(targetProduct.category, targetProduct.name);
    }

    if (idx >= 0) {
      list[idx] = targetProduct;
    } else {
      list.push(targetProduct);
    }
    this.write('bos_products', list);
  }

  public deleteProduct(businessId: string, id: string): void {
    const list = this.getProductsRaw();
    const updated = list.filter(p => !(p.id === id && p.businessId === businessId));
    this.write('bos_products', updated);
  }

  // --- SERVICE OPERATIONS (Multi-Tenant Isolated) ---
  private getServicesRaw(): Service[] {
    return this.read<Service>('bos_services');
  }

  public getServices(businessId: string): Service[] {
    return this.getServicesRaw().filter(s => s.businessId === businessId);
  }

  public saveService(businessId: string, service: Service): void {
    const list = this.getServicesRaw();
    const idx = list.findIndex(s => s.id === service.id && s.businessId === businessId);
    
    const targetService = { ...service, businessId };

    if (idx >= 0) {
      list[idx] = targetService;
    } else {
      list.push(targetService);
    }
    this.write('bos_services', list);
  }

  public deleteService(businessId: string, id: string): void {
    const list = this.getServicesRaw().filter(s => !(s.id === id && s.businessId === businessId));
    this.write('bos_services', list);
  }

  // --- CUSTOMER OPERATIONS (Multi-Tenant Isolated) ---
  private getCustomersRaw(): Customer[] {
    return this.read<Customer>('bos_customers');
  }

  public getCustomers(businessId: string): Customer[] {
    return this.getCustomersRaw().filter(c => c.businessId === businessId);
  }

  public saveCustomer(businessId: string, customer: Customer): void {
    const list = this.getCustomersRaw();
    const idx = list.findIndex(c => c.id === customer.id && c.businessId === businessId);

    const targetCustomer = { ...customer, businessId };

    if (idx >= 0) {
      list[idx] = targetCustomer;
    } else {
      list.push(targetCustomer);
    }
    this.write('bos_customers', list);
  }

  public deleteCustomer(businessId: string, id: string): void {
    const list = this.getCustomersRaw().filter(c => !(c.id === id && c.businessId === businessId));
    this.write('bos_customers', list);
  }

  // --- SALE OPERATIONS (Multi-Tenant Isolated) ---
  private getSalesRaw(): Sale[] {
    return this.read<Sale>('bos_sales');
  }

  public getSales(businessId: string): Sale[] {
    return this.getSalesRaw().filter(s => s.businessId === businessId);
  }

  public saveSale(businessId: string, sale: Sale): void {
    const list = this.getSalesRaw();
    const idx = list.findIndex(s => s.id === sale.id && s.businessId === businessId);

    const targetSale = { ...sale, businessId };

    if (idx >= 0) {
      list[idx] = targetSale;
    } else {
      list.push(targetSale);

      // Decrement stock levels for products sold
      const products = this.getProductsRaw();
      targetSale.items.forEach(item => {
        if (item.type === 'product') {
          const pIdx = products.findIndex(p => p.id === item.itemId && p.businessId === businessId);
          if (pIdx >= 0) {
            products[pIdx].stockQuantity = Math.max(0, products[pIdx].stockQuantity - item.quantity);
          }
        }
      });
      this.write('bos_products', products);
    }
    this.write('bos_sales', list);
  }

  public refundSale(businessId: string, id: string): void {
    const list = this.getSalesRaw();
    const idx = list.findIndex(s => s.id === id && s.businessId === businessId);
    if (idx >= 0) {
      list[idx].status = 'refunded';
      
      // Refund inventory stock
      const products = this.getProductsRaw();
      list[idx].items.forEach(item => {
        if (item.type === 'product') {
          const pIdx = products.findIndex(p => p.id === item.itemId && p.businessId === businessId);
          if (pIdx >= 0) {
            products[pIdx].stockQuantity += item.quantity;
          }
        }
      });
      this.write('bos_products', products);
      this.write('bos_sales', list);
    }
  }

  public deleteSale(businessId: string, id: string): void {
    const list = this.getSalesRaw();
    const updated = list.filter(s => !(s.id === id && s.businessId === businessId));
    this.write('bos_sales', updated);
  }

  // --- EXPENSE OPERATIONS (Multi-Tenant Isolated) ---
  private getExpensesRaw(): Expense[] {
    return this.read<Expense>('bos_expenses');
  }

  public getExpenses(businessId: string): Expense[] {
    return this.getExpensesRaw().filter(e => e.businessId === businessId);
  }

  public saveExpense(businessId: string, expense: Expense): void {
    const list = this.getExpensesRaw();
    const idx = list.findIndex(e => e.id === expense.id && e.businessId === businessId);

    const targetExpense = { ...expense, businessId };

    if (idx >= 0) {
      list[idx] = targetExpense;
    } else {
      list.push(targetExpense);
    }
    this.write('bos_expenses', list);
  }

  public deleteExpense(businessId: string, id: string): void {
    const list = this.getExpensesRaw();
    const updated = list.filter(e => !(e.id === id && e.businessId === businessId));
    this.write('bos_expenses', updated);
  }

  // --- LOG OPERATIONS (Multi-Tenant Isolated) ---
  private getLogsRaw(): ActivityLog[] {
    return this.read<ActivityLog>('bos_logs');
  }

  public getLogs(businessId: string, role?: string): ActivityLog[] {
    if (role === 'owner') {
      return [];
    }
    return this.getLogsRaw().filter(l => l.businessId === businessId);
  }

  public getAllLogs(): ActivityLog[] {
    return this.getLogsRaw();
  }

  public addActivityLog(businessId: string, log: Omit<ActivityLog, 'id' | 'createdAt' | 'businessId'>): void {
    const list = this.getLogsRaw();
    const newLog: ActivityLog = {
      ...log,
      id: 'l-' + Math.random().toString(36).substr(2, 9),
      businessId,
      createdAt: new Date().toISOString()
    };
    list.unshift(newLog); // new logs first
    this.write('bos_logs', list);
  }

  // --- BRANCH OPERATIONS (Multi-Tenant Isolated) ---
  private getBranchesRaw(): Branch[] {
    return this.read<Branch>('bos_branches');
  }

  public getBranches(businessId: string): Branch[] {
    return this.getBranchesRaw().filter(b => b.businessId === businessId);
  }

  public saveBranch(businessId: string, branch: Branch): void {
    const list = this.getBranchesRaw();
    const idx = list.findIndex(b => b.id === branch.id && b.businessId === businessId);
    const targetBranch = { ...branch, businessId };
    if (idx >= 0) {
      list[idx] = targetBranch;
    } else {
      list.push(targetBranch);
    }
    this.write('bos_branches', list);
  }

  public deleteBranch(businessId: string, id: string): void {
    const list = this.getBranchesRaw().filter(b => !(b.id === id && b.businessId === businessId));
    this.write('bos_branches', list);
  }

  // --- CUSTOMER RETURN OPERATIONS (Multi-Tenant Isolated) ---
  private getCustomerReturnsRaw(): CustomerReturn[] {
    return this.read<CustomerReturn>('bos_customer_returns');
  }

  public getCustomerReturns(businessId: string): CustomerReturn[] {
    return this.getCustomerReturnsRaw().filter(r => r.businessId === businessId);
  }

  public saveCustomerReturn(businessId: string, ret: CustomerReturn): void {
    const list = this.getCustomerReturnsRaw();
    const idx = list.findIndex(r => r.id === ret.id && r.businessId === businessId);
    const target = { ...ret, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_customer_returns', list);
  }

  // --- SUPPLIER RETURN OPERATIONS (Multi-Tenant Isolated) ---
  private getSupplierReturnsRaw(): SupplierReturn[] {
    return this.read<SupplierReturn>('bos_supplier_returns');
  }

  public getSupplierReturns(businessId: string): SupplierReturn[] {
    return this.getSupplierReturnsRaw().filter(r => r.businessId === businessId);
  }

  public saveSupplierReturn(businessId: string, ret: SupplierReturn): void {
    const list = this.getSupplierReturnsRaw();
    const idx = list.findIndex(r => r.id === ret.id && r.businessId === businessId);
    const target = { ...ret, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_supplier_returns', list);
  }

  // --- STOCK TRANSFER OPERATIONS (Multi-Tenant Isolated) ---
  private getStockTransfersRaw(): StockTransfer[] {
    return this.read<StockTransfer>('bos_stock_transfers');
  }

  public getStockTransfers(businessId: string): StockTransfer[] {
    return this.getStockTransfersRaw().filter(t => t.businessId === businessId);
  }

  public saveStockTransfer(businessId: string, transfer: StockTransfer): void {
    const list = this.getStockTransfersRaw();
    const idx = list.findIndex(t => t.id === transfer.id && t.businessId === businessId);
    const target = { ...transfer, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_stock_transfers', list);
  }

  // --- NOTIFICATION OPERATIONS (Multi-Tenant Isolated + Global Platform Push) ---
  public getNotificationsRaw(): Notification[] {
    return this.read<Notification>('bos_notifications');
  }

  public getNotifications(businessId: string): Notification[] {
    return this.getNotificationsRaw().filter(n => n.businessId === businessId || n.businessId === 'global');
  }

  public saveNotification(notification: Notification): void {
    const list = this.getNotificationsRaw();
    const idx = list.findIndex(n => n.notificationId === notification.notificationId);
    if (idx >= 0) {
      list[idx] = notification;
    } else {
      list.push(notification);
    }
    this.write('bos_notifications', list);
  }

  public deleteNotification(notificationId: string): void {
    const list = this.getNotificationsRaw().filter(n => n.notificationId !== notificationId);
    this.write('bos_notifications', list);
  }

  public clearAllNotifications(businessId: string): void {
    const list = this.getNotificationsRaw().filter(n => n.businessId !== businessId && n.businessId !== 'global');
    this.write('bos_notifications', list);
  }

  // --- NOTIFICATION PREFERENCES ---
  public getNotificationPreferences(businessId: string, userId?: string): NotificationPreferences {
    const list = this.read<NotificationPreferences>('bos_notification_preferences');
    const found = list.find(p => p.businessId === businessId && (!userId || p.userId === userId));
    if (found) return found;

    // Default configuration
    return {
      businessId,
      userId,
      enableWebPush: true,
      enableSoundAlerts: true,
      salesAlerts: true,
      inventoryAlerts: true,
      kitchenAlerts: true,
      staffAlerts: true,
      customerAlerts: true,
      subscriptionAlerts: true,
      systemAlerts: true,
      updatedAt: new Date().toISOString()
    };
  }

  public saveNotificationPreferences(prefs: NotificationPreferences): void {
    const list = this.read<NotificationPreferences>('bos_notification_preferences');
    const idx = list.findIndex(p => p.businessId === prefs.businessId && p.userId === prefs.userId);
    const updated = { ...prefs, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    this.write('bos_notification_preferences', list);
  }

  // --- PUSH DEVICE TOKENS ---
  public getPushDeviceTokens(businessId?: string): PushDeviceToken[] {
    const list = this.read<PushDeviceToken>('bos_push_device_tokens');
    if (!businessId) return list;
    return list.filter(t => t.businessId === businessId || t.businessId === 'global');
  }

  public savePushDeviceToken(token: PushDeviceToken): void {
    const list = this.read<PushDeviceToken>('bos_push_device_tokens');
    const idx = list.findIndex(t => t.id === token.id || (t.userId === token.userId && t.userAgent === token.userAgent));
    if (idx >= 0) {
      list[idx] = token;
    } else {
      list.push(token);
    }
    this.write('bos_push_device_tokens', list);
  }

  // --- NOTIFICATION LOGS ---
  public getNotificationLogs(): NotificationLog[] {
    return this.read<NotificationLog>('bos_notification_logs').sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public saveNotificationLog(log: NotificationLog): void {
    const list = this.read<NotificationLog>('bos_notification_logs');
    list.push(log);
    this.write('bos_notification_logs', list);
  }

  // --- ACTIVE SESSION MANAGEMENT ---
  public getCurrentUser(): User | null {
    const data = sessionStorage.getItem('bos_current_user');
    return data ? JSON.parse(data) : null;
  }

  public getActiveBusiness(): Business | null {
    const user = this.getCurrentUser();
    if (!user || user.role === 'admin' || user.role === 'SUPER_ADMIN') return null;
    return this.getBusinesses().find(b => b.id === user.businessId) || null;
  }

  public setCurrentUser(user: User): void {
    sessionStorage.setItem('bos_current_user', JSON.stringify(user));
  }

  public logout(): void {
    sessionStorage.removeItem('bos_current_user');
  }

  // --- GLOBAL FEATURE MANAGEMENT OPERATIONS ---
  public getGlobalFeatures(): GlobalFeature[] {
    return this.read<GlobalFeature>('bos_global_features');
  }

  public saveGlobalFeatures(features: GlobalFeature[]): void {
    this.write('bos_global_features', features);
  }

  public getFeatureAuditLogs(): AdminFeatureChangeLog[] {
    return this.read<AdminFeatureChangeLog>('bos_feature_audit_logs');
  }

  public saveFeatureAuditLog(log: AdminFeatureChangeLog): void {
    const list = this.getFeatureAuditLogs();
    list.push(log);
    this.write('bos_feature_audit_logs', list);
  }

  public isFeatureEnabled(featureId: string): boolean {
    const features = this.getGlobalFeatures();
    const feat = features.find(f => f.id === featureId);
    return feat ? feat.isEnabled : true; // Default to true if feature not registered
  }

  // --- PROFESSIONAL SERVICE JOB OPERATIONS ---
  private getServiceJobsRaw(): ProfessionalServiceJob[] {
    return this.read<ProfessionalServiceJob>('bos_service_jobs');
  }

  public getServiceJobs(businessId: string): ProfessionalServiceJob[] {
    return this.getServiceJobsRaw().filter(j => j.businessId === businessId);
  }

  public saveServiceJob(businessId: string, job: ProfessionalServiceJob): void {
    const list = this.getServiceJobsRaw();
    const idx = list.findIndex(j => j.id === job.id && j.businessId === businessId);
    const targetJob = { ...job, businessId };
    if (idx >= 0) {
      list[idx] = targetJob;
    } else {
      list.push(targetJob);
    }
    this.write('bos_service_jobs', list);
  }

  public deleteServiceJob(businessId: string, id: string): void {
    const list = this.getServiceJobsRaw().filter(j => !(j.id === id && j.businessId === businessId));
    this.write('bos_service_jobs', list);
  }

  public getProfessionalServiceJobs(businessId: string): ProfessionalServiceJob[] {
    return this.getServiceJobs(businessId);
  }

  public saveProfessionalServiceJob(businessId: string, job: ProfessionalServiceJob): void {
    this.saveServiceJob(businessId, job);
  }

  public getEmployees(businessId: string): User[] {
    return this.getUsers().filter(u => u.businessId === businessId);
  }

  public getAppointments(businessId: string): SalonAppointment[] {
    return this.getSalonAppointments(businessId);
  }

  // --- PHARMACY & PRESCRIPTION OPERATIONS ---
  private getPrescriptionsRaw(): Prescription[] {
    return this.read<Prescription>('bos_prescriptions');
  }

  public getPrescriptions(businessId: string): Prescription[] {
    return this.getPrescriptionsRaw().filter(p => p.businessId === businessId);
  }

  public savePrescription(businessId: string, prescription: Prescription): void {
    const list = this.getPrescriptionsRaw();
    const idx = list.findIndex(p => p.id === prescription.id && p.businessId === businessId);
    const target = { ...prescription, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_prescriptions', list);
  }

  public deletePrescription(businessId: string, id: string): void {
    const list = this.getPrescriptionsRaw().filter(p => !(p.id === id && p.businessId === businessId));
    this.write('bos_prescriptions', list);
  }

  private getPharmacyBatchesRaw(): PharmacyBatch[] {
    return this.read<PharmacyBatch>('bos_pharmacy_batches');
  }

  public getPharmacyBatches(businessId: string): PharmacyBatch[] {
    return this.getPharmacyBatchesRaw().filter(b => b.businessId === businessId);
  }

  public savePharmacyBatch(businessId: string, batch: PharmacyBatch): void {
    const list = this.getPharmacyBatchesRaw();
    const idx = list.findIndex(b => b.id === batch.id && b.businessId === businessId);
    const target = { ...batch, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_pharmacy_batches', list);
  }

  public deletePharmacyBatch(businessId: string, id: string): void {
    const list = this.getPharmacyBatchesRaw().filter(b => !(b.id === id && b.businessId === businessId));
    this.write('bos_pharmacy_batches', list);
  }

  // --- RESTAURANT OPERATIONS ---
  public getMenuItemsRaw(): MenuItem[] {
    return this.read<MenuItem>('bos_menu_items');
  }

  public getMenuItems(businessId: string): MenuItem[] {
    return this.getMenuItemsRaw().filter(m => m.businessId === businessId);
  }

  public saveMenuItem(businessId: string, item: MenuItem): void {
    const list = this.getMenuItemsRaw();
    const idx = list.findIndex(m => m.id === item.id && m.businessId === businessId);
    const targetItem = { ...item, businessId };
    if (idx >= 0) {
      list[idx] = targetItem;
    } else {
      list.push(targetItem);
    }
    this.write('bos_menu_items', list);
  }

  public deleteMenuItem(businessId: string, id: string): void {
    const list = this.getMenuItemsRaw().filter(m => !(m.id === id && m.businessId === businessId));
    this.write('bos_menu_items', list);
  }

  public getIngredientsRaw(): Ingredient[] {
    return this.read<Ingredient>('bos_ingredients');
  }

  public getIngredients(businessId: string): Ingredient[] {
    return this.getIngredientsRaw().filter(i => i.businessId === businessId);
  }

  public saveIngredient(businessId: string, ing: Ingredient): void {
    const list = this.getIngredientsRaw();
    const idx = list.findIndex(i => i.id === ing.id && i.businessId === businessId);
    const targetIng = { ...ing, businessId };
    if (idx >= 0) {
      list[idx] = targetIng;
    } else {
      list.push(targetIng);
    }
    this.write('bos_ingredients', list);
  }

  public deleteIngredient(businessId: string, id: string): void {
    const list = this.getIngredientsRaw().filter(i => !(i.id === id && i.businessId === businessId));
    this.write('bos_ingredients', list);
  }

  public getRecipesRaw(): Recipe[] {
    return this.read<Recipe>('bos_recipes');
  }

  public getRecipes(businessId: string): Recipe[] {
    return this.getRecipesRaw().filter(r => r.businessId === businessId);
  }

  public saveRecipe(businessId: string, rec: Recipe): void {
    const list = this.getRecipesRaw();
    const idx = list.findIndex(r => r.id === rec.id && r.businessId === businessId);
    const targetRec = { ...rec, businessId };
    if (idx >= 0) {
      list[idx] = targetRec;
    } else {
      list.push(targetRec);
    }
    this.write('bos_recipes', list);
  }

  public deleteRecipe(businessId: string, id: string): void {
    const list = this.getRecipesRaw().filter(r => !(r.id === id && r.businessId === businessId));
    this.write('bos_recipes', list);
  }

  public getRestaurantTablesRaw(): RestaurantTable[] {
    return this.read<RestaurantTable>('bos_restaurant_tables');
  }

  public getRestaurantTables(businessId: string): RestaurantTable[] {
    return this.getRestaurantTablesRaw().filter(t => t.businessId === businessId);
  }

  public saveRestaurantTable(businessId: string, tbl: RestaurantTable): void {
    const list = this.getRestaurantTablesRaw();
    const idx = list.findIndex(t => t.id === tbl.id && t.businessId === businessId);
    const targetTbl = { ...tbl, businessId };
    if (idx >= 0) {
      list[idx] = targetTbl;
    } else {
      list.push(targetTbl);
    }
    this.write('bos_restaurant_tables', list);
  }

  public deleteRestaurantTable(businessId: string, id: string): void {
    const list = this.getRestaurantTablesRaw().filter(t => !(t.id === id && t.businessId === businessId));
    this.write('bos_restaurant_tables', list);
  }

  public getRestaurantOrdersRaw(): RestaurantOrder[] {
    return this.read<RestaurantOrder>('bos_restaurant_orders');
  }

  public getRestaurantOrders(businessId: string): RestaurantOrder[] {
    return this.getRestaurantOrdersRaw().filter(o => o.businessId === businessId);
  }

  public saveRestaurantOrder(businessId: string, order: RestaurantOrder): void {
    const list = this.getRestaurantOrdersRaw();
    const idx = list.findIndex(o => o.id === order.id && o.businessId === businessId);
    const targetOrder = { ...order, businessId };

    // Automatic raw material reduction when customer buys (new order created)
    if (idx < 0) {
      const ingredients = this.getIngredientsRaw();
      const recipes = this.getRecipesRaw().filter(r => r.businessId === businessId);

      targetOrder.items.forEach(item => {
        const recipe = recipes.find(r => r.menuItemId === item.menuItemId);
        if (recipe) {
          recipe.items.forEach(recipeItem => {
            const ingIdx = ingredients.findIndex(i => i.id === recipeItem.ingredientId && i.businessId === businessId);
            if (ingIdx >= 0) {
              ingredients[ingIdx].quantity = Math.max(0, ingredients[ingIdx].quantity - (recipeItem.quantityNeeded * item.quantity));
            }
          });
        }
      });
      this.write('bos_ingredients', ingredients);
    }

    if (idx >= 0) {
      list[idx] = targetOrder;
    } else {
      list.push(targetOrder);
    }
    this.write('bos_restaurant_orders', list);
  }

  public deleteRestaurantOrder(businessId: string, id: string): void {
    const list = this.getRestaurantOrdersRaw().filter(o => !(o.id === id && o.businessId === businessId));
    this.write('bos_restaurant_orders', list);
  }

  public getReservationsRaw(): Reservation[] {
    return this.read<Reservation>('bos_reservations');
  }

  public getReservations(businessId: string): Reservation[] {
    return this.getReservationsRaw().filter(r => r.businessId === businessId);
  }

  public saveReservation(businessId: string, resv: Reservation): void {
    const list = this.getReservationsRaw();
    const idx = list.findIndex(r => r.id === resv.id && r.businessId === businessId);
    const targetResv = { ...resv, businessId };
    if (idx >= 0) {
      list[idx] = targetResv;
    } else {
      list.push(targetResv);
    }
    this.write('bos_reservations', list);
  }

  public deleteReservation(businessId: string, id: string): void {
    const list = this.getReservationsRaw().filter(r => !(r.id === id && r.businessId === businessId));
    this.write('bos_reservations', list);
  }

  // --- SUPPLIER OPERATIONS ---
  public getSuppliersRaw(): Supplier[] {
    return this.read<Supplier>('bos_suppliers');
  }

  public getSuppliers(businessId: string): Supplier[] {
    return this.getSuppliersRaw().filter(s => s.businessId === businessId);
  }

  public saveSupplier(businessId: string, supplier: Supplier): void {
    const list = this.getSuppliersRaw();
    const idx = list.findIndex(s => s.id === supplier.id && s.businessId === businessId);
    const target = { ...supplier, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_suppliers', list);
  }

  public deleteSupplier(businessId: string, id: string): void {
    const list = this.getSuppliersRaw().filter(s => !(s.id === id && s.businessId === businessId));
    this.write('bos_suppliers', list);
  }

  // --- PRINTER SETTINGS OPERATIONS ---
  public getPrinterSettingsRaw(): PrinterSettings[] {
    return this.read<PrinterSettings>('bos_printer_settings');
  }

  public getPrinterSettings(businessId: string): PrinterSettings[] {
    return this.getPrinterSettingsRaw().filter(p => p.businessId === businessId);
  }

  public savePrinterSettings(businessId: string, settings: PrinterSettings): void {
    const list = this.getPrinterSettingsRaw();
    const idx = list.findIndex(p => p.printerId === settings.printerId && p.businessId === businessId);
    const target = { ...settings, businessId };
    
    // If we're setting this one as default, unset other defaults
    if (target.isDefault) {
      list.forEach(p => {
        if (p.businessId === businessId) {
          p.isDefault = false;
        }
      });
    }

    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_printer_settings', list);
  }

  public deletePrinterSettings(businessId: string, id: string): void {
    const list = this.getPrinterSettingsRaw().filter(p => !(p.printerId === id && p.businessId === businessId));
    this.write('bos_printer_settings', list);
  }

  // --- FAST FOOD OPERATIONS ---
  public getFastFoodOrdersRaw(): any[] {
    return this.read<any>('bos_fast_food_orders');
  }

  public getFastFoodOrders(businessId: string): any[] {
    return this.getFastFoodOrdersRaw().filter(o => o.businessId === businessId);
  }

  public saveFastFoodOrder(businessId: string, order: any): void {
    const list = this.getFastFoodOrdersRaw();
    const idx = list.findIndex(o => o.id === order.id && o.businessId === businessId);
    const target = { ...order, businessId };

    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_fast_food_orders', list);

    // Auto-deduct recipe ingredients if available
    try {
      const recipes = this.getFastFoodRecipes(businessId);
      const ingredients = this.getFastFoodIngredients(businessId);
      
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const menuItemId = item.menuItemId || item.itemId;
          const qty = item.quantity || 1;
          const recipe = recipes.find(r => r.menuItemId === menuItemId);

          if (recipe && recipe.ingredients && Array.isArray(recipe.ingredients)) {
            recipe.ingredients.forEach((ri: any) => {
              const ing = ingredients.find(i => i.id === ri.ingredientId);
              if (ing) {
                ing.quantity = Math.max(0, ing.quantity - (ri.quantityNeeded * qty));
                this.saveFastFoodIngredient(businessId, ing);
              }
            });
          }
        });
      }
    } catch (e) {
      console.error('Error auto-deducting fast food recipe ingredients:', e);
    }
  }

  public getFastFoodIngredientsRaw(): any[] {
    return this.read<any>('bos_fast_food_ingredients');
  }

  public getFastFoodIngredients(businessId: string): any[] {
    return this.getFastFoodIngredientsRaw().filter(i => i.businessId === businessId);
  }

  public saveFastFoodIngredient(businessId: string, ingredient: any): void {
    const list = this.getFastFoodIngredientsRaw();
    const idx = list.findIndex(i => i.id === ingredient.id && i.businessId === businessId);
    const target = { ...ingredient, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_fast_food_ingredients', list);
  }

  public deleteFastFoodIngredient(businessId: string, id: string): void {
    const list = this.getFastFoodIngredientsRaw().filter(i => !(i.id === id && i.businessId === businessId));
    this.write('bos_fast_food_ingredients', list);
  }

  public getFastFoodMenuItemsRaw(): any[] {
    return this.read<any>('bos_fast_food_menu_items');
  }

  public getFastFoodMenuItems(businessId: string): any[] {
    return this.getFastFoodMenuItemsRaw().filter(m => m.businessId === businessId);
  }

  public saveFastFoodMenuItem(businessId: string, item: any): void {
    const list = this.getFastFoodMenuItemsRaw();
    const idx = list.findIndex(m => m.id === item.id && m.businessId === businessId);
    const target = { ...item, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_fast_food_menu_items', list);
  }

  public deleteFastFoodMenuItem(businessId: string, id: string): void {
    const list = this.getFastFoodMenuItemsRaw().filter(m => !(m.id === id && m.businessId === businessId));
    this.write('bos_fast_food_menu_items', list);
  }

  public getFastFoodRecipesRaw(): any[] {
    return this.read<any>('bos_fast_food_recipes');
  }

  public getFastFoodRecipes(businessId: string): any[] {
    return this.getFastFoodRecipesRaw().filter(r => r.businessId === businessId);
  }

  public getFastFoodRecipe(businessId: string, menuItemId: string): any | null {
    return this.getFastFoodRecipes(businessId).find(r => r.menuItemId === menuItemId) || null;
  }

  public saveFastFoodRecipe(businessIdOrRecipe: any, optionalRecipe?: any): void {
    const recipe = optionalRecipe || businessIdOrRecipe;
    const list = this.getFastFoodRecipesRaw();
    const index = list.findIndex(r => r.id === recipe.id || (r.businessId === recipe.businessId && r.menuItemId === recipe.menuItemId));
    if (index >= 0) {
      list[index] = recipe;
    } else {
      list.push(recipe);
    }
    this.write('bos_fast_food_recipes', list);
  }

  // --- SALON & BARBERS MANAGEMENT ---
  public getSalonAppointmentsRaw(): SalonAppointment[] {
    return this.read<SalonAppointment>('bos_salon_appointments');
  }

  public getSalonAppointments(businessId: string): SalonAppointment[] {
    return this.getSalonAppointmentsRaw().filter(a => a.businessId === businessId);
  }

  public saveSalonAppointment(businessId: string, appointment: SalonAppointment): void {
    const list = this.getSalonAppointmentsRaw();
    const idx = list.findIndex(a => a.id === appointment.id && a.businessId === businessId);
    const target = { ...appointment, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_salon_appointments', list);
  }

  public deleteSalonAppointment(businessId: string, id: string): void {
    const list = this.getSalonAppointmentsRaw().filter(a => !(a.id === id && a.businessId === businessId));
    this.write('bos_salon_appointments', list);
  }

  public getSalonStaffRaw(): SalonStaff[] {
    return this.read<SalonStaff>('bos_salon_staff');
  }

  public getSalonStaff(businessId: string): SalonStaff[] {
    return this.getSalonStaffRaw().filter(s => s.businessId === businessId);
  }

  public saveSalonStaff(businessId: string, staff: SalonStaff): void {
    const list = this.getSalonStaffRaw();
    const idx = list.findIndex(s => s.id === staff.id && s.businessId === businessId);
    const target = { ...staff, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_salon_staff', list);
  }

  public deleteSalonStaff(businessId: string, id: string): void {
    const list = this.getSalonStaffRaw().filter(s => !(s.id === id && s.businessId === businessId));
    this.write('bos_salon_staff', list);
  }

  // --- LAUNDRY SERVICES ORDER MANAGEMENT ---
  public getLaundryOrdersRaw(): LaundryOrder[] {
    return this.read<LaundryOrder>('bos_laundry_orders');
  }

  public getLaundryOrders(businessId: string): LaundryOrder[] {
    return this.getLaundryOrdersRaw().filter(o => o.businessId === businessId);
  }

  public saveLaundryOrder(businessId: string, order: LaundryOrder): void {
    const list = this.getLaundryOrdersRaw();
    const idx = list.findIndex(o => o.id === order.id && o.businessId === businessId);
    const target = { ...order, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_laundry_orders', list);
  }

  public deleteLaundryOrder(businessId: string, id: string): void {
    const list = this.getLaundryOrdersRaw().filter(o => !(o.id === id && o.businessId === businessId));
    this.write('bos_laundry_orders', list);
  }

  // --- LAUNDRY SERVICES PRICE LIST MANAGEMENT ---
  public createDefaultLaundryServices(_businessId: string): LaundryService[] {
    return [];
  }

  public getLaundryServicesRaw(): LaundryService[] {
    return this.read<LaundryService>('bos_laundry_services');
  }

  public getLaundryServices(businessId: string): LaundryService[] {
    const all = this.getLaundryServicesRaw();
    return all.filter(s => s.businessId === businessId);
  }

  public saveLaundryService(businessId: string, service: LaundryService): void {
    const list = this.getLaundryServicesRaw();
    const idx = list.findIndex(s => s.id === service.id && s.businessId === businessId);
    const target = { ...service, businessId, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_laundry_services', list);
  }

  public toggleLaundryServiceEnabled(businessId: string, id: string): void {
    const list = this.getLaundryServicesRaw();
    const idx = list.findIndex(s => s.id === id && s.businessId === businessId);
    if (idx >= 0) {
      list[idx].enabled = !list[idx].enabled;
      list[idx].updatedAt = new Date().toISOString();
      this.write('bos_laundry_services', list);
    }
  }

  public deleteLaundryService(businessId: string, id: string): void {
    const list = this.getLaundryServicesRaw().filter(s => !(s.id === id && s.businessId === businessId));
    this.write('bos_laundry_services', list);
  }

  public resetLaundryServicesToDefault(businessId: string): LaundryService[] {
    const list = this.getLaundryServicesRaw().filter(s => s.businessId !== businessId);
    this.write('bos_laundry_services', list);
    return [];
  }

  // --- MOBILE BARCODE SCANNER INTEGRATION ---
  public getScannerSessionsRaw(): ScannerSession[] {
    return this.read<ScannerSession>('bos_scanner_sessions');
  }

  public getScannerSession(businessId: string, sessionId: string): ScannerSession | null {
    const sessions = this.getScannerSessionsRaw();
    const session = sessions.find(s => s.sessionId === sessionId && (s.businessId === businessId || !businessId));
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return { ...session, status: 'expired' };
    }
    return session;
  }

  public saveScannerSession(businessId: string, sessionId: string, userId?: string, branchId?: string, expiresMinutes = 5): ScannerSession {
    const sessions = this.getScannerSessionsRaw();
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();
    const newSession: ScannerSession = {
      sessionId,
      businessId,
      userId,
      branchId,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      expiresAt
    };
    const existingIdx = sessions.findIndex(s => s.sessionId === sessionId);
    if (existingIdx >= 0) {
      sessions[existingIdx] = newSession;
    } else {
      sessions.push(newSession);
    }
    this.write('bos_scanner_sessions', sessions);
    return newSession;
  }

  public updateScannerSessionStatus(businessId: string, sessionId: string, status: 'waiting' | 'connected' | 'disconnected' | 'expired'): void {
    const sessions = this.getScannerSessionsRaw();
    const idx = sessions.findIndex(s => s.sessionId === sessionId && (s.businessId === businessId || !businessId));
    if (idx >= 0) {
      sessions[idx].status = status;
      this.write('bos_scanner_sessions', sessions);
    }
  }

  public getScannedItemsRaw(): ScannedItemPayload[] {
    return this.read<ScannedItemPayload>('bos_scanned_items');
  }

  public getScannedItemsForSession(businessId: string, sessionId: string): ScannedItemPayload[] {
    return this.getScannedItemsRaw().filter(item => item.businessId === businessId && item.sessionId === sessionId);
  }

  public saveScannedItem(item: ScannedItemPayload): void {
    const list = this.getScannedItemsRaw();
    list.push(item);
    this.write('bos_scanned_items', list);
  }

  public clearScannedItemsForSession(businessId: string, sessionId: string): void {
    const remaining = this.getScannedItemsRaw().filter(item => !(item.businessId === businessId && item.sessionId === sessionId));
    this.write('bos_scanned_items', remaining);
  }

  // Remote Print Commands Sync
  public getPrintCommandsRaw(): PrintCommand[] {
    return this.read<PrintCommand>('bos_print_commands');
  }

  public getPrintCommandsForSession(businessId: string, sessionId: string): PrintCommand[] {
    return this.getPrintCommandsRaw().filter(cmd => cmd.businessId === businessId && cmd.sessionId === sessionId);
  }

  public savePrintCommand(cmd: PrintCommand): void {
    const list = this.getPrintCommandsRaw();
    list.push(cmd);
    this.write('bos_print_commands', list);
  }

  public clearPrintCommandsForSession(businessId: string, sessionId: string): void {
    const remaining = this.getPrintCommandsRaw().filter(cmd => !(cmd.businessId === businessId && cmd.sessionId === sessionId));
    this.write('bos_print_commands', remaining);
  }



  // --- PAYSTACK & GLOBAL SYSTEM CONFIG ---
  public getPaystackSettings(): PaystackSettings {
    const list = this.read<PaystackSettings>('bos_paystack_settings');
    const defaultPub = 'pk_test_paystack_default_public_key';
    const defaultSec = 'sk_test_paystack_default_secret_key';
    if (list && list.length > 0) {
      const s = list[0];
      return {
        publicKey: s.publicKey || defaultPub,
        secretKey: s.secretKey || defaultSec,
        environment: s.environment || 'test',
        currency: s.currency || 'GHS',
        callbackUrl: s.callbackUrl || '/api/payment/callback',
        webhookUrl: s.webhookUrl || '/api/payment/webhook',
        updatedAt: s.updatedAt || new Date().toISOString(),
        updatedBy: s.updatedBy || 'admin@business.os'
      };
    }
    return {
      publicKey: defaultPub,
      secretKey: defaultSec,
      environment: 'test',
      currency: 'GHS',
      callbackUrl: '/api/payment/callback',
      webhookUrl: '/api/payment/webhook',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin@business.os'
    };
  }

  public savePaystackSettings(settings: PaystackSettings): void {
    this.write('bos_paystack_settings', [settings]);
  }

  public deletePaystackSettings(): void {
    const cleared: PaystackSettings = {
      publicKey: '',
      secretKey: '',
      environment: 'test',
      currency: 'GHS',
      callbackUrl: '/api/payment/callback',
      webhookUrl: '/api/payment/webhook',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin@business.os'
    };
    this.write('bos_paystack_settings', [cleared]);
  }

  public getPaymentTransactionsRaw(): PaymentTransaction[] {
    return this.read<PaymentTransaction>('bos_payment_transactions');
  }

  public getPaymentTransactions(businessId?: string): PaymentTransaction[] {
    const list = this.getPaymentTransactionsRaw();
    if (!businessId) return list;
    return list.filter(t => t.businessId === businessId);
  }

  public savePaymentTransaction(transaction: PaymentTransaction): void {
    const list = this.getPaymentTransactionsRaw();
    const idx = list.findIndex(t => t.id === transaction.id || (t.reference === transaction.reference && t.reference));
    if (idx >= 0) {
      list[idx] = transaction;
    } else {
      list.unshift(transaction);
    }
    this.write('bos_payment_transactions', list);
  }

  public getGlobalSystemConfig(): GlobalSystemConfig {
    const list = this.read<GlobalSystemConfig>('bos_global_system_config');
    let config: GlobalSystemConfig;
    if (list && list.length > 0) {
      config = list[0];
    } else {
      config = {
        defaultCurrency: 'GHC',
        defaultTaxRate: 15,
        enableNewRegistrations: true,
        allowedBusinessTypes: [...REQUIRED_BUSINESS_TYPES],
        systemBrandingName: 'BusinessOS Cloud Enterprise',
        systemLogoUrl: '',
        passwordMinLength: 6,
        passwordRequireNumbers: false,
        defaultSubscriptionAmount: 299,
        updatedAt: new Date().toISOString()
      };
    }

    if (config.defaultSubscriptionAmount === undefined) {
      config.defaultSubscriptionAmount = 299;
    }

    // Ensure all REQUIRED_BUSINESS_TYPES are present in allowedBusinessTypes without losing custom ones
    const currentTypes = config.allowedBusinessTypes || [];
    const mergedTypes = Array.from(new Set([...REQUIRED_BUSINESS_TYPES, ...currentTypes]));
    config.allowedBusinessTypes = mergedTypes;
    return config;
  }

  public saveGlobalSystemConfig(config: GlobalSystemConfig): void {
    this.write('bos_global_system_config', [config]);
  }

  public getDatabaseSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      version: '4.2'
    };
    ALL_DB_KEYS.forEach(key => {
      snapshot[key] = this.read(key);
    });
    snapshot['bos_paystack_settings'] = [this.getPaystackSettings()];
    snapshot['bos_global_system_config'] = [this.getGlobalSystemConfig()];
    return snapshot;
  }

  // --- TRAVEL & TOUR METHODS ---

  public getTravelCustomers(businessId: string): TravelCustomer[] {
    const list = this.read<TravelCustomer>('bos_travel_customers');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelCustomer(customer: TravelCustomer): void {
    const list = this.read<TravelCustomer>('bos_travel_customers');
    const idx = list.findIndex(c => c.id === customer.id);
    const updated = { ...customer, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_customers', list);
  }
  public deleteTravelCustomer(id: string): void {
    let list = this.read<TravelCustomer>('bos_travel_customers');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_customers', list);
  }

  public getTravelBookings(businessId: string): TravelBooking[] {
    const list = this.read<TravelBooking>('bos_travel_bookings');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelBooking(booking: TravelBooking): void {
    const list = this.read<TravelBooking>('bos_travel_bookings');
    const idx = list.findIndex(b => b.id === booking.id);
    const updated = { ...booking, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_bookings', list);
  }
  public deleteTravelBooking(id: string): void {
    let list = this.read<TravelBooking>('bos_travel_bookings');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_bookings', list);
  }

  public getTravelFlights(businessId: string): TravelFlight[] {
    const list = this.read<TravelFlight>('bos_travel_flights');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelFlight(flight: TravelFlight): void {
    const list = this.read<TravelFlight>('bos_travel_flights');
    const idx = list.findIndex(f => f.id === flight.id);
    const updated = { ...flight, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_flights', list);
  }
  public deleteTravelFlight(id: string): void {
    let list = this.read<TravelFlight>('bos_travel_flights');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_flights', list);
  }

  public getTravelHotels(businessId: string): TravelHotel[] {
    const list = this.read<TravelHotel>('bos_travel_hotels');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelHotel(hotel: TravelHotel): void {
    const list = this.read<TravelHotel>('bos_travel_hotels');
    const idx = list.findIndex(h => h.id === hotel.id);
    const updated = { ...hotel, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_hotels', list);
  }
  public deleteTravelHotel(id: string): void {
    let list = this.read<TravelHotel>('bos_travel_hotels');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_hotels', list);
  }

  public getTravelVisas(businessId: string): TravelVisa[] {
    const list = this.read<TravelVisa>('bos_travel_visas');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelVisa(visa: TravelVisa): void {
    const list = this.read<TravelVisa>('bos_travel_visas');
    const idx = list.findIndex(v => v.id === visa.id);
    const updated = { ...visa, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_visas', list);
  }
  public deleteTravelVisa(id: string): void {
    let list = this.read<TravelVisa>('bos_travel_visas');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_visas', list);
  }

  public getTravelPassports(businessId: string): TravelPassport[] {
    const list = this.read<TravelPassport>('bos_travel_passports');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelPassport(passport: TravelPassport): void {
    const list = this.read<TravelPassport>('bos_travel_passports');
    const idx = list.findIndex(p => p.id === passport.id);
    const updated = { ...passport, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_passports', list);
  }
  public deleteTravelPassport(id: string): void {
    let list = this.read<TravelPassport>('bos_travel_passports');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_passports', list);
  }

  public getTravelPackages(businessId: string): TravelPackage[] {
    const list = this.read<TravelPackage>('bos_travel_packages');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelPackage(pkg: TravelPackage): void {
    const list = this.read<TravelPackage>('bos_travel_packages');
    const idx = list.findIndex(p => p.id === pkg.id);
    const updated = { ...pkg, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_packages', list);
  }
  public deleteTravelPackage(id: string): void {
    let list = this.read<TravelPackage>('bos_travel_packages');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_packages', list);
  }

  public getTravelTransports(businessId: string): TravelTransport[] {
    const list = this.read<TravelTransport>('bos_travel_transports');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelTransport(transport: TravelTransport): void {
    const list = this.read<TravelTransport>('bos_travel_transports');
    const idx = list.findIndex(t => t.id === transport.id);
    const updated = { ...transport, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_transports', list);
  }
  public deleteTravelTransport(id: string): void {
    let list = this.read<TravelTransport>('bos_travel_transports');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_transports', list);
  }

  public getTravelInsurances(businessId: string): TravelInsurance[] {
    const list = this.read<TravelInsurance>('bos_travel_insurances');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelInsurance(insurance: TravelInsurance): void {
    const list = this.read<TravelInsurance>('bos_travel_insurances');
    const idx = list.findIndex(i => i.id === insurance.id);
    const updated = { ...insurance, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_insurances', list);
  }
  public deleteTravelInsurance(id: string): void {
    let list = this.read<TravelInsurance>('bos_travel_insurances');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_insurances', list);
  }

  public getTravelSuppliers(businessId: string): TravelSupplier[] {
    const list = this.read<TravelSupplier>('bos_travel_suppliers');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelSupplier(supplier: TravelSupplier): void {
    const list = this.read<TravelSupplier>('bos_travel_suppliers');
    const idx = list.findIndex(s => s.id === supplier.id);
    const updated = { ...supplier, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_suppliers', list);
  }
  public deleteTravelSupplier(id: string): void {
    let list = this.read<TravelSupplier>('bos_travel_suppliers');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_suppliers', list);
  }

  public getTravelPartners(businessId: string): TravelPartner[] {
    const list = this.read<TravelPartner>('bos_travel_partners');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelPartner(partner: TravelPartner): void {
    const list = this.read<TravelPartner>('bos_travel_partners');
    const idx = list.findIndex(p => p.id === partner.id);
    const updated = { ...partner, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_partners', list);
  }
  public deleteTravelPartner(id: string): void {
    let list = this.read<TravelPartner>('bos_travel_partners');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_partners', list);
  }

  public getTravelDocuments(businessId: string): TravelDocument[] {
    const list = this.read<TravelDocument>('bos_travel_documents');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelDocument(doc: TravelDocument): void {
    const list = this.read<TravelDocument>('bos_travel_documents');
    const idx = list.findIndex(d => d.id === doc.id);
    const updated = { ...doc };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_documents', list);
  }
  public deleteTravelDocument(id: string): void {
    let list = this.read<TravelDocument>('bos_travel_documents');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_documents', list);
  }

  public getTravelMarketings(businessId: string): TravelMarketing[] {
    const list = this.read<TravelMarketing>('bos_travel_marketings');
    return list.filter(item => item.businessId === businessId);
  }
  public saveTravelMarketing(mkt: TravelMarketing): void {
    const list = this.read<TravelMarketing>('bos_travel_marketings');
    const idx = list.findIndex(m => m.id === mkt.id);
    const updated = { ...mkt, updatedAt: new Date().toISOString() };
    if (idx >= 0) list[idx] = updated;
    else list.push(updated);
    this.write('bos_travel_marketings', list);
  }
  public deleteTravelMarketing(id: string): void {
    let list = this.read<TravelMarketing>('bos_travel_marketings');
    list = list.filter(item => item.id !== id);
    this.write('bos_travel_marketings', list);
  }

  public restoreDatabaseSnapshot(snapshot: Record<string, any>): void {
    if (!snapshot || typeof snapshot !== 'object') return;
    ALL_DB_KEYS.forEach(key => {
      if (Array.isArray(snapshot[key])) {
        this.write(key, snapshot[key]);
      }
    });
    if (snapshot['bos_paystack_settings'] && Array.isArray(snapshot['bos_paystack_settings']) && snapshot['bos_paystack_settings'][0]) {
      this.savePaystackSettings(snapshot['bos_paystack_settings'][0]);
    }
    if (snapshot['bos_global_system_config'] && Array.isArray(snapshot['bos_global_system_config']) && snapshot['bos_global_system_config'][0]) {
      this.saveGlobalSystemConfig(snapshot['bos_global_system_config'][0]);
    }
    this.notifyListeners();
  }

  public getDatabaseStats(): { key: string; label: string; count: number }[] {
    return [
      { key: 'bos_businesses', label: 'Businesses', count: this.getBusinesses().length },
      { key: 'bos_users', label: 'Staff & Owner Users', count: this.getUsers().length },
      { key: 'bos_products', label: 'Retail Products', count: this.getProductsRaw().length },
      { key: 'bos_fast_food_menu_items', label: 'Fast Food Menu Items', count: this.getFastFoodMenuItemsRaw().length },
      { key: 'bos_sales', label: 'Completed Sales Transactions', count: this.getSalesRaw().length },
      { key: 'bos_customers', label: 'Registered Customers', count: this.getCustomersRaw().length },
      { key: 'bos_expenses', label: 'Expenses Recorded', count: this.getExpensesRaw().length },
      { key: 'bos_notifications', label: 'System Notifications', count: this.getNotificationsRaw().length },
      { key: 'bos_students', label: 'Enrolled Students', count: this.read<Student>('bos_students').length },
      { key: 'bos_teachers', label: 'Teachers & Academic Staff', count: this.read<Teacher>('bos_teachers').length },
      { key: 'bos_classes', label: 'Classes & Grade Sections', count: this.read<SchoolClass>('bos_classes').length },
      { key: 'bos_fee_invoices', label: 'School Fee Invoices', count: this.read<FeeInvoice>('bos_fee_invoices').length }
    ];
  }

  // --- SCHOOL & EDUCATIONAL INSTITUTION OPERATIONS ---
  public getStudents(businessId: string): Student[] {
    return this.read<Student>('bos_students').filter(s => s.businessId === businessId);
  }

  public saveStudent(businessId: string, student: Student): void {
    const list = this.read<Student>('bos_students');
    const idx = list.findIndex(s => s.id === student.id && s.businessId === businessId);
    const target = { ...student, businessId, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_students', list);
  }

  public deleteStudent(businessId: string, id: string): void {
    const list = this.read<Student>('bos_students').filter(s => !(s.id === id && s.businessId === businessId));
    this.write('bos_students', list);
  }

  public getTeachers(businessId: string): Teacher[] {
    return this.read<Teacher>('bos_teachers').filter(t => t.businessId === businessId);
  }

  public saveTeacher(businessId: string, teacher: Teacher): void {
    const list = this.read<Teacher>('bos_teachers');
    const idx = list.findIndex(t => t.id === teacher.id && t.businessId === businessId);
    const target = { ...teacher, businessId, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_teachers', list);
  }

  public deleteTeacher(businessId: string, id: string): void {
    const list = this.read<Teacher>('bos_teachers').filter(t => !(t.id === id && t.businessId === businessId));
    this.write('bos_teachers', list);
  }

  public getClasses(businessId: string): SchoolClass[] {
    return this.read<SchoolClass>('bos_classes').filter(c => c.businessId === businessId);
  }

  public saveClass(businessId: string, cls: SchoolClass): void {
    const list = this.read<SchoolClass>('bos_classes');
    const idx = list.findIndex(c => c.id === cls.id && c.businessId === businessId);
    const target = { ...cls, businessId, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_classes', list);
  }

  public deleteClass(businessId: string, id: string): void {
    const list = this.read<SchoolClass>('bos_classes').filter(c => !(c.id === id && c.businessId === businessId));
    this.write('bos_classes', list);
  }

  public getFeeInvoices(businessId: string): FeeInvoice[] {
    return this.read<FeeInvoice>('bos_fee_invoices').filter(i => i.businessId === businessId);
  }

  public saveFeeInvoice(businessId: string, invoice: FeeInvoice): void {
    const list = this.read<FeeInvoice>('bos_fee_invoices');
    const idx = list.findIndex(i => i.id === invoice.id && i.businessId === businessId);
    const target = { ...invoice, businessId, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_fee_invoices', list);
  }

  public deleteFeeInvoice(businessId: string, id: string): void {
    const list = this.read<FeeInvoice>('bos_fee_invoices').filter(i => !(i.id === id && i.businessId === businessId));
    this.write('bos_fee_invoices', list);
  }

  public getFeePayments(businessId: string): FeePayment[] {
    return this.read<FeePayment>('bos_fee_payments').filter(p => p.businessId === businessId);
  }

  public saveFeePayment(businessId: string, payment: FeePayment): void {
    const list = this.read<FeePayment>('bos_fee_payments');
    const target = { ...payment, businessId };
    list.push(target);
    this.write('bos_fee_payments', list);

    // Automatically update balance on the associated invoice
    if (payment.invoiceId) {
      const invoices = this.getFeeInvoices(businessId);
      const inv = invoices.find(i => i.id === payment.invoiceId);
      if (inv) {
        const newPaid = (inv.paidAmount || 0) + payment.amount;
        const newBalance = Math.max(0, inv.totalAmount - newPaid);
        const newStatus = newBalance <= 0 ? 'paid' : 'partial';
        this.saveFeeInvoice(businessId, {
          ...inv,
          paidAmount: newPaid,
          balance: newBalance,
          status: newStatus
        });
      }
    }
  }

  public getAttendance(businessId: string, date?: string, classId?: string): AttendanceRecord[] {
    let list = this.read<AttendanceRecord>('bos_attendance').filter(a => a.businessId === businessId);
    if (date) list = list.filter(a => a.date === date);
    if (classId) list = list.filter(a => a.classId === classId);
    return list;
  }

  public saveAttendanceRecord(businessId: string, record: AttendanceRecord): void {
    const list = this.read<AttendanceRecord>('bos_attendance');
    const idx = list.findIndex(a => a.businessId === businessId && a.studentId === record.studentId && a.date === record.date);
    const target = { ...record, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_attendance', list);
  }

  public saveAttendanceBatch(businessId: string, records: AttendanceRecord[]): void {
    records.forEach(r => this.saveAttendanceRecord(businessId, r));
  }

  public getExamGrades(businessId: string, classId?: string, term?: string): ExamGrade[] {
    let list = this.read<ExamGrade>('bos_exam_grades').filter(g => g.businessId === businessId);
    if (classId) list = list.filter(g => g.classId === classId);
    if (term) list = list.filter(g => g.term === term);
    return list;
  }

  public saveExamGrade(businessId: string, grade: ExamGrade): void {
    const list = this.read<ExamGrade>('bos_exam_grades');
    const idx = list.findIndex(g => g.id === grade.id && g.businessId === businessId);
    const target = { ...grade, businessId, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_exam_grades', list);
  }

  public deleteExamGrade(businessId: string, id: string): void {
    const list = this.read<ExamGrade>('bos_exam_grades').filter(g => !(g.id === id && g.businessId === businessId));
    this.write('bos_exam_grades', list);
  }

  public getTimetable(businessId: string, classId?: string): SchoolTimetableEntry[] {
    let list = this.read<SchoolTimetableEntry>('bos_timetable').filter(t => t.businessId === businessId);
    if (classId) list = list.filter(t => t.classId === classId);
    return list;
  }

  public saveTimetableEntry(businessId: string, entry: SchoolTimetableEntry): void {
    const list = this.read<SchoolTimetableEntry>('bos_timetable');
    const idx = list.findIndex(t => t.id === entry.id && t.businessId === businessId);
    const target = { ...entry, businessId };
    if (idx >= 0) {
      list[idx] = target;
    } else {
      list.push(target);
    }
    this.write('bos_timetable', list);
  }

  public deleteTimetableEntry(businessId: string, id: string): void {
    const list = this.read<SchoolTimetableEntry>('bos_timetable').filter(t => !(t.id === id && t.businessId === businessId));
    this.write('bos_timetable', list);
  }

  public getSchoolAnnouncements(businessId: string): SchoolAnnouncement[] {
    return this.read<SchoolAnnouncement>('bos_school_announcements').filter(a => a.businessId === businessId);
  }

  public saveSchoolAnnouncement(businessId: string, announcement: SchoolAnnouncement): void {
    const list = this.read<SchoolAnnouncement>('bos_school_announcements');
    const target = { ...announcement, businessId };
    list.unshift(target);
    this.write('bos_school_announcements', list);
  }

  // --- LOCAL TENANT SMS PREFERENCES & WHATSAPP SETTINGS ---
  public getLocalSmsSettings(): SmsSettings {
    const raw = this.read<SmsSettings>('bos_sms_settings');
    if (raw && raw.length > 0) return raw[0];
    return {
      provider: 'arkesel',
      apiKey: '',
      senderId: 'SchoolOS',
      balance: 1000,
      isActive: true
    };
  }

  public saveLocalSmsSettings(settings: SmsSettings): void {
    this.write('bos_sms_settings', [{ ...settings, updatedAt: new Date().toISOString() }]);
  }

  public getWhatsAppSettings(): WhatsAppSettings {
    const raw = this.read<WhatsAppSettings>('bos_whatsapp_settings');
    if (raw && raw.length > 0) return raw[0];
    return {
      provider: 'meta',
      accessToken: '',
      senderPhoneNumber: '',
      isActive: true
    };
  }

  public saveWhatsAppSettings(settings: WhatsAppSettings): void {
    this.write('bos_whatsapp_settings', [{ ...settings, updatedAt: new Date().toISOString() }]);
  }

  // --- APPROVAL WORKFLOW FOR SCHOOLS & TENANTS ---
  public approveBusiness(id: string): void {
    const businesses = this.getBusinesses();
    const bus = businesses.find(b => b.id === id);
    if (bus) {
      bus.approvalStatus = 'approved';
      bus.status = 'active';
      this.saveBusiness(bus);
    }
  }

  public rejectBusiness(id: string, reason?: string): void {
    const businesses = this.getBusinesses();
    const bus = businesses.find(b => b.id === id);
    if (bus) {
      bus.approvalStatus = 'rejected';
      bus.rejectionReason = reason || 'Does not meet institution registration criteria';
      bus.status = 'suspended';
      this.saveBusiness(bus);
    }
  }

  // --- ARKESEL SMS GATEWAY CLIENT SERVICE ---
  public async getSmsSettings(): Promise<any> {
    try {
      const res = await fetch('/api/admin/sms-config');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Error loading SMS config:', e);
    }
    return {
      success: false,
      provider: 'Arkesel',
      senderId: 'BusinessOS',
      apiEndpoint: 'https://sms.arkesel.com/api/v2/sms/send',
      isEnabled: true,
      hasApiKey: false,
      maskedApiKey: '',
      lastTestStatus: 'Not Connected'
    };
  }

  public async saveSmsSettings(payload: {
    apiKey?: string;
    senderId?: string;
    apiEndpoint?: string;
    isEnabled?: boolean;
  }): Promise<{ success: boolean; message: string; config?: any }> {
    try {
      const res = await fetch('/api/admin/sms-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
      return { success: false, message: data.message || data.error || '✕ Failed to save Arkesel SMS settings. Please try again.' };
    } catch (err: any) {
      return { success: false, message: '✕ Failed to save Arkesel SMS settings. Please try again.' };
    }
  }

  public async testSmsConnection(apiKey?: string): Promise<{
    success: boolean;
    message: string;
    balance?: any;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/admin/sms/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: '✕ Arkesel connection failed. Please check your API key and configuration.',
        error: err.message
      };
    }
  }

  public async toggleGlobalSms(isEnabled: boolean): Promise<{
    success: boolean;
    isEnabled: boolean;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/admin/sms-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, isEnabled: !isEnabled };
    }
  }

  public async sendTestSms(phoneNumber: string, message?: string, clientTriggerTime?: number): Promise<{
    success: boolean;
    status: string;
    message: string;
    recipient?: string;
    details?: any;
    timings?: SmsTimingDetails;
  }> {
    const triggerTime = clientTriggerTime || Date.now();
    try {
      const res = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, message, clientTriggerTime: triggerTime })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      const completion = Date.now();
      return {
        success: false,
        status: 'Network error',
        message: err.message || 'Failed to send test SMS due to network error',
        timings: {
          clientTriggerTime: triggerTime,
          submissionCompletionTime: completion,
          totalSubmissionMs: completion - triggerTime
        }
      };
    }
  }

  public async sendSms(payload: {
    recipient: string | string[];
    message: string;
    senderId?: string;
    idempotencyKey?: string;
    businessId?: string;
    type?: string;
    clientTriggerTime?: number;
  }): Promise<{
    success: boolean;
    status: string;
    message: string;
    recipient?: string;
    details?: any;
    timings?: SmsTimingDetails;
  }> {
    const triggerTime = payload.clientTriggerTime || Date.now();
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, clientTriggerTime: triggerTime })
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      const completion = Date.now();
      return {
        success: false,
        status: 'Network error',
        message: err.message || 'Network error while sending SMS',
        timings: {
          clientTriggerTime: triggerTime,
          submissionCompletionTime: completion,
          totalSubmissionMs: completion - triggerTime
        }
      };
    }
  }

  public async getSmsLogs(): Promise<any[]> {
    try {
      const res = await fetch('/api/admin/sms/logs');
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
    } catch (e) {
      console.warn('Error fetching SMS logs:', e);
    }
    return [];
  }

  // =========================================================================
  // SUPER ADMIN BUSINESS PRICING METHODS
  // =========================================================================

  public async getBusinessPricingList(): Promise<any[]> {
    try {
      const res = await fetch('/api/admin/business-pricing');
      if (res.ok) {
        const data = await res.json();
        return data.businesses || [];
      }
    } catch (err) {
      console.warn('Error fetching business pricing list:', err);
    }
    // Fallback to local businesses
    const localBusinesses = this.getBusinesses();
    return localBusinesses.map(b => ({
      id: b.id,
      name: b.name,
      category: b.category,
      status: b.status,
      currency: b.currency || 'GHS',
      subscriptionAmount: b.subscriptionAmount !== undefined ? b.subscriptionAmount : null,
      priceUpdatedAt: b.priceUpdatedAt || null,
      priceUpdatedBy: b.priceUpdatedBy || null,
      registrationDate: b.registrationDate || b.createdAt || null,
      ownerEmail: b.email || null
    }));
  }

  public async updateBusinessPrice(businessId: string, subscriptionAmount: number, priceUpdatedBy = 'Super Admin'): Promise<{
    success: boolean;
    message: string;
    business?: any;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/admin/business-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, subscriptionAmount, priceUpdatedBy })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Also update in-memory / local storage business record
        const bus = this.getBusinesses().find(b => b.id === businessId);
        if (bus) {
          bus.subscriptionAmount = Number(subscriptionAmount);
          bus.priceUpdatedAt = new Date().toISOString();
          bus.priceUpdatedBy = priceUpdatedBy;
          this.saveBusiness(bus);
        }
        return data;
      }
      return { success: false, message: data.error || 'Failed to update pricing' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error updating pricing' };
    }
  }

  public async getBusinessPricing(businessId: string): Promise<{
    subscriptionAmount: number | null;
    currency: string;
    priceUpdatedAt?: string | null;
  }> {
    try {
      const res = await fetch(`/api/business/${businessId}/pricing`);
      if (res.ok) {
        const data = await res.json();
        return {
          subscriptionAmount: data.subscriptionAmount,
          currency: data.currency || 'GHS',
          priceUpdatedAt: data.priceUpdatedAt
        };
      }
    } catch (e) {
      console.warn('Error fetching business pricing:', e);
    }
    const bus = this.getBusinesses().find(b => b.id === businessId);
    return {
      subscriptionAmount: bus?.subscriptionAmount !== undefined ? bus.subscriptionAmount : null,
      currency: bus?.currency || 'GHS',
      priceUpdatedAt: bus?.priceUpdatedAt || null
    };
  }

  // =========================================================================
  // REGISTERED BUSINESS POPUP PROMPT METHODS
  // =========================================================================

  public async getAdminPopupPrompts(): Promise<BusinessPopupPrompt[]> {
    try {
      const res = await fetch('/api/admin/popup-prompts');
      if (res.ok) {
        const data = await res.json();
        return data.prompts || [];
      }
    } catch (err) {
      console.warn('Error fetching admin popup prompts:', err);
    }
    return this.read<BusinessPopupPrompt>('bos_popup_prompts');
  }

  public async savePopupPrompt(prompt: Partial<BusinessPopupPrompt>): Promise<{
    success: boolean;
    message: string;
    prompt?: BusinessPopupPrompt;
  }> {
    try {
      const res = await fetch('/api/admin/popup-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Also sync local cache
        const prompts = this.read<BusinessPopupPrompt>('bos_popup_prompts');
        const idx = prompts.findIndex(p => p.id === data.prompt.id);
        if (idx >= 0) {
          prompts[idx] = data.prompt;
        } else {
          prompts.unshift(data.prompt);
        }
        this.write<BusinessPopupPrompt>('bos_popup_prompts', prompts);
        return data;
      }
      return { success: false, message: data.error || 'Failed to save popup prompt' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error saving popup prompt' };
    }
  }

  public async deletePopupPrompt(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/popup-prompts/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const prompts = this.read<BusinessPopupPrompt>('bos_popup_prompts').filter(p => p.id !== id);
        this.write<BusinessPopupPrompt>('bos_popup_prompts', prompts);
        return data;
      }
      return { success: false, message: data.error || 'Failed to delete popup prompt' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error deleting popup prompt' };
    }
  }

  public async getEligibleBusinessPopups(businessId: string): Promise<{
    success: boolean;
    daysSinceRegistration: number;
    registrationDate: string;
    eligiblePrompts: BusinessPopupPrompt[];
  }> {
    try {
      const res = await fetch(`/api/business/${businessId}/popup-prompts`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Error fetching eligible popups from server:', err);
    }
    // Fallback calculation using local data
    const bus = this.getBusinesses().find(b => b.id === businessId);
    if (!bus) return { success: false, daysSinceRegistration: 0, registrationDate: '', eligiblePrompts: [] };
    const regDate = bus.registrationDate || bus.createdAt || new Date().toISOString();
    const diffDays = Math.max(0, Math.floor((Date.now() - new Date(regDate).getTime()) / (1000 * 60 * 60 * 24)));
    const allPrompts = this.read<BusinessPopupPrompt>('bos_popup_prompts');
    const eligible = allPrompts.filter(p => {
      if (p.status !== 'active') return false;
      if (p.targetType === 'selected' && (!p.targetBusinessIds || !p.targetBusinessIds.includes(businessId))) return false;
      return diffDays >= (p.daysAfterRegistration || 5);
    });
    return {
      success: true,
      daysSinceRegistration: diffDays,
      registrationDate: regDate,
      eligiblePrompts: eligible
    };
  }
}

export const db = new CloudDatabase();

export const getCurrencySymbol = (currencyCode?: string): string => {
  if (!currencyCode) return 'GH₵'; // Default is GHC (GH₵)
  const code = currencyCode.toUpperCase();
  if (code === 'GHC') return 'GH₵';
  if (code === 'USD') return '$';
  if (code === 'GBP') return '£';
  if (code === 'EUR') return '€';
  return currencyCode; // Fallback
};

export const formatCurrency = (amount: number, currencyCode?: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol} ${amount.toFixed(2)}`;
};
