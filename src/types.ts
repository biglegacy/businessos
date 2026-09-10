/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export { getIndustryArchetype, type IndustryArchetype } from './lib/businessType';

export interface IndustryGroup {
  name: string;
  types: string[];
}

export const BUSINESS_TYPE_GROUPS: IndustryGroup[] = [
  {
    name: 'Retail & General Businesses',
    types: [
      'General Retail',
      'Supermarket',
      'Mini Mart',
      'Provision Store',
      'Electronics & Appliances',
      'Clothing & Fashion',
      'Footwear',
      'Mobile Phone & Accessories',
      'Computer & IT Accessories',
      'Hardware & Building Materials',
      'Auto Parts',
      'Furniture & Home Appliances',
      'Stationery & Bookshop',
      'Wholesale',
      'Import & Distribution',
      // Backward compatibility aliases
      'Grocery Store',
      'Phone Shop',
      'Electronics Shop',
      'Fashion Shop / Boutique',
      'Hardware Store',
      'Water & Drinks Distribution',
      'General Enterprise'
    ]
  },
  {
    name: 'Food & Hospitality',
    types: [
      'Restaurant',
      'Fast Food',
      'Food & Beverage',
      'Bakery',
      'Catering',
      'Grocery',
      'Provision & Food Store',
      'Restaurant / Food Business'
    ]
  },
  {
    name: 'Beauty & Personal Care',
    types: [
      'Beauty & Cosmetics',
      'Beauty Salon',
      'Hair Salon',
      'Barber Shop',
      'Spa & Wellness',
      'Nail Salon',
      'Makeup Artist',
      'Skincare Business',
      'Perfume & Fragrance',
      'Salon & Barbers',
      'Beauty & Wellness',
      'Salon'
    ]
  },
  {
    name: 'Health',
    types: [
      'Pharmacy',
      'Medical Supplies',
      'Health & Wellness Store',
      'Optical Shop',
      'Pharmacy & Health'
    ]
  },
  {
    name: 'Services',
    types: [
      'Cleaning Services',
      'Laundry & Dry Cleaning',
      'Repair Services',
      'Phone Repair',
      'Computer Repair',
      'Printing & Design',
      'Photography',
      'Event Services',
      'Consultancy',
      'Professional Services',
      'Transportation & Logistics',
      'Car Rental',
      'Travel & Tours',
      'Travel & Tour',
      'Travel Agencies',
      'Laundry Services',
      'School / Educational Institution'
    ]
  },
  {
    name: 'Other',
    types: [
      'Other Business'
    ]
  }
];

export const REQUIRED_BUSINESS_TYPES = Array.from(
  new Set(BUSINESS_TYPE_GROUPS.flatMap(g => g.types))
);

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  category: string;
  businessType?: string;
  status: 'active' | 'suspended';
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  rejectionReason?: string;
  schoolType?: 'creche' | 'primary' | 'jhs' | 'shs' | 'tertiary' | 'vocational' | 'k12';
  studentCount?: number;
  staffCount?: number;
  createdAt: string;
  logoUrl?: string; // base64 representation of custom logo
  currency?: string; // e.g. 'GHC', 'USD', 'GBP', 'EUR'
  taxId?: string; // tax registration number
  isStockTransferEnabled?: boolean; // Control for Inter-Branch stock transfers
  smsEnabled?: boolean; // Super Admin per-business SMS control (default: true)
  pricingPlanId?: string; // Assigned pricing plan ID
  subscriptionAmount?: number; // Custom per-business monthly subscription amount in GHS
  priceUpdatedAt?: string; // Timestamp when Super Admin last set/updated the price
  priceUpdatedBy?: string; // Who updated the pricing (e.g. 'Super Admin')
  updatedAt?: string; // Last update timestamp
  receiptConfig: {
    logoUrl?: string;
    businessName?: string;
    contactInfo?: string;
    footerMessage?: string;
    layout?: 'standard' | 'compact' | 'elegant';
  };
  subscriptionStatus?: 'trial' | 'active' | 'unpaid' | 'suspended';
  registrationDate?: string;
  trialEndDate?: string;
  subscriptionCycleStartDate?: string;
  subscriptionCycleEndDate?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  paymentHistory?: { date: string; amount: number; transactionId: string }[];
  subscriptionStartDate?: string;
  nextPaymentDate?: string;
  paymentReminderStatus?: 'not_sent' | 'sent' | 'completed';
  enabledFeatures?: string[];
}

export type UserRole = 
  | 'owner' 
  | 'manager' 
  | 'cashier' 
  | 'salesperson' 
  | 'inventory_staff' 
  | 'admin' 
  | 'SUPER_ADMIN'
  | 'principal'
  | 'administrator'
  | 'accountant'
  | 'teacher'
  | 'parent'
  | 'student';

export interface User {
  id: string;
  businessId: string; // 'platform' for Super Admin
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'disabled';
  password?: string; // for security representation
  authProvider?: string; // 'password'
  createdAt: string;
  branchId?: string; // Optional branch assignment
  branchIds?: string[]; // Multiple branch assignments for roles like manager
}

export interface PharmacyBatch {
  id: string;
  productId: string;
  businessId: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD or ISO
  quantity: number;
  costPrice?: number;
  sellingPrice?: number;
  supplier?: string;
  createdAt: string;
}

export interface Prescription {
  id: string;
  businessId: string;
  prescriptionNumber: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  doctorName: string;
  clinicOrHospital?: string;
  prescribedDate: string;
  diagnosisNotes?: string;
  status: 'Pending' | 'Dispensed' | 'Cancelled';
  medicines: {
    productId?: string;
    medicineName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity: number;
    batchNumber?: string;
  }[];
  saleId?: string;
  dispensedAt?: string;
  dispensedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  imageUrl?: string; // base64 representation
  category: string;
  description: string;
  costPrice?: number;
  sellingPrice: number;
  wholesalePrice?: number;
  price?: number; // fallback alias for sellingPrice
  stockQuantity: number;
  barcode: string; // SKU or barcode (Required SKU)
  lowStockThreshold?: number;
  reorderLevel?: number;
  branchId?: string; // Optional branch assignment
  brand?: string; // Optional Brand
  unitOfMeasurement?: string; // Unit of measurement
  supplier?: string; // Optional Supplier
  supplierContact?: string;
  warehouseLocation?: string;
  expiryDate?: string;
  batchNumber?: string;
  serialNumberSupport?: boolean;
  serialNumbers?: string[];
  weight?: string;
  dimensions?: string;
  variants?: string;
  notes?: string;
  productWeight?: string;
  productDimensions?: string;
  productVariants?: string;
  productNotes?: string;
  qrCode?: string;
  returnEligible?: boolean;
  refundEligible?: boolean;
  taxRate?: number; // Optional Tax
  status?: 'Active' | 'Draft' | 'Discontinued' | 'Inactive'; // Product status
  barcodeOptional?: string; // Optional barcode
  updatedAt?: string; // Last updated timestamp
  // Pharmacy & Health specialized fields
  genericName?: string;
  dosageForm?: string; // e.g. Tablets, Capsules, Syrup, Cream, Ointment, Drops, Injection, Powder, Suppository, Other
  strength?: string; // e.g. 500mg, 10mg/5ml
  packSize?: string; // e.g. Pack of 30, Bottle 100ml
  requiresPrescription?: boolean;
  batches?: PharmacyBatch[];
  // Beauty & Personal Care specialized fields
  shade?: string;
  color?: string;
  size?: string;
  fragrance?: string;
  volume?: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  code?: string;
  duration?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  taxRate?: number;
  status?: 'Active' | 'Inactive';
  notes?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  email?: string;
  phone: string;
  balance?: number;
  createdAt: string;
  profileImage?: string;
  notes?: string;
  preferences?: string;
  totalSpent?: number;
  visitCount?: number;
}

export interface CartItem {
  id: string;
  name: string;
  type: 'product' | 'service';
  price: number;
  quantity: number;
  stockLimit?: number; // Only for products
  jobId?: string; // Associated professional service job if any
  imageUrl?: string;
  taxRate?: number;
}

export interface Sale {
  id: string;
  businessId: string;
  branchId?: string; // Optional branch isolation
  items: {
    itemId: string;
    name: string;
    type: 'product' | 'service';
    price: number;
    quantity: number;
  }[];
  subtotal?: number;
  discount: number; // percentage or fixed
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'other';
  paymentStatus?: 'paid' | 'partial' | 'pending' | 'unpaid';
  amountPaid?: number;
  amountReceived?: number;
  change?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  employeeId?: string;
  employeeName?: string;
  cashierName?: string;
  notes?: string;
  createdAt: string;
  status?: 'completed' | 'refunded';
  currency?: string;
}

export type SaleItem = Sale['items'][number];

export interface Expense {
  id: string;
  businessId: string;
  branchId?: string; // Optional branch isolation
  category: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'other';
  description: string;
  date: string;
  createdAt: string;
  currency?: string;
  receiptImage?: string;
}

export interface ActivityLog {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
  // Audit Log details
  userRole?: string;
  moduleAffected?: string;
  itemAffected?: string;
  previousValue?: string;
  newValue?: string;
  branchId?: string;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  location: string;
  createdAt: string;
}

export interface StockTransfer {
  id: string;
  businessId: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  productId: string;
  productName: string;
  quantity: number;
  employeeId: string;
  employeeName: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
  createdAt: string;
}

export interface CustomerReturn {
  id: string;
  businessId: string;
  branchId?: string;
  saleId: string;
  customerId?: string;
  customerName?: string;
  productId: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  reason: 'Damaged item' | 'Wrong item supplied' | 'Customer changed mind' | 'Other';
  employeeId: string;
  employeeName: string;
  createdAt: string;
  currency?: string;
}

export interface SupplierReturn {
  id: string;
  businessId: string;
  branchId?: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  employeeId: string;
  employeeName: string;
  createdAt: string;
}

export interface PlatformStats {
  totalBusinesses: number;
  totalUsers: number;
  activeBusinesses: number;
}

export interface GlobalFeature {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  lastChanged: string;
  changedBy: string;
}

export interface AdminFeatureChangeLog {
  id: string;
  featureId: string;
  featureName: string;
  previousStatus: boolean;
  newStatus: boolean;
  changedBy: string;
  timestamp: string;
}

export interface BusinessDeleteAuditLog {
  id: string;
  action: string;
  businessId: string;
  businessName: string;
  superAdminId: string;
  superAdminEmail: string;
  timestamp: string;
  ipAddress?: string;
  status: 'Success' | 'Failed';
  details?: string;
}

export interface ProfessionalServiceJob {
  id: string; // e.g., SRV-12345
  jobNumber?: string;
  title?: string;
  businessId: string;
  branchId?: string;
  customerName: string;
  customerPhone: string;
  serviceName?: string;
  serviceDescription?: string;
  description?: string;
  serviceCategory?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedStaffName?: string;
  servicePrice?: number;
  totalPrice?: number;
  amountPaid?: number;
  quantity?: number;
  startDate?: string;
  scheduledDate?: string;
  expectedCompletionDate?: string;
  customerNotes?: string;
  paymentMethod?: 'cash' | 'card' | 'mobile' | 'other';
  paymentStatus: 'paid' | 'unpaid';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  completedByEmployeeId?: string;
  completedByEmployeeName?: string;
}

export interface MenuItem {
  id: string;
  businessId: string;
  name: string;
  imageUrl?: string;
  description: string;
  category: string;
  sellingPrice: number;
  prepTime: number; // in minutes
  isAvailable: boolean;
  taxRate?: number;
  updatedAt?: string;
}

export interface Ingredient {
  id: string;
  businessId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  costPrice: number;
  supplier?: string;
  minStockLevel: number;
  updatedAt?: string;
}

export interface RecipeItem {
  ingredientId: string;
  ingredientName: string;
  quantityNeeded: number;
}

export interface Recipe {
  id: string;
  businessId: string;
  menuItemId: string;
  menuItemName: string;
  items: RecipeItem[];
  updatedAt?: string;
}

export interface RestaurantTable {
  id: string;
  businessId: string;
  number: string;
  capacity?: number;
  status: 'Available' | 'Occupied' | 'Reserved';
  currentOrderId?: string;
  updatedAt?: string;
}

export interface RestaurantOrder {
  id: string;
  businessId: string;
  orderNumber: string;
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  orderType: 'Dine-in' | 'Takeaway' | 'Delivery';
  items: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod?: 'cash' | 'card' | 'mobile' | 'other' | 'split';
  splitPayments?: { method: string; amount: number }[];
  paymentStatus: 'unpaid' | 'paid';
  status: 'Pending' | 'Confirmed' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
  kitchenStatus: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
  employeeId: string;
  employeeName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Reservation {
  id: string;
  businessId: string;
  customerName: string;
  customerPhone: string;
  tableId: string;
  tableNumber: string;
  dateTime: string;
  guestsCount: number;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  address: string;
  productsSupplied: string;
  createdAt: string;
}

export interface Notification {
  notificationId: string;
  id?: string;
  businessId: string; // 'global' or specific business ID
  targetUserId?: string; // 'all' or specific user ID
  userId?: string;
  title: string;
  message: string;
  type: 'sales' | 'inventory' | 'kitchen' | 'staff' | 'customer' | 'subscription' | 'system' | 'emergency' | 'maintenance' | 'general' | 'announcement' | string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
  createdAt: string;
  status: 'active' | 'dismissed';
  readStatus: 'unread' | 'read';
  actionType?: 'payment' | 'info' | 'order' | 'inventory' | 'url' | string;
  actionUrl?: string;
  senderName?: string;
  scheduledFor?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'failed' | 'scheduled';
}

export interface NotificationPreferences {
  id?: string;
  businessId: string;
  userId?: string;
  enableWebPush: boolean;
  enableSoundAlerts: boolean;
  salesAlerts: boolean;
  inventoryAlerts: boolean;
  kitchenAlerts: boolean;
  staffAlerts: boolean;
  customerAlerts: boolean;
  subscriptionAlerts: boolean;
  systemAlerts: boolean;
  updatedAt: string;
}

export interface PushDeviceToken {
  id: string;
  businessId: string;
  userId: string;
  token: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  userAgent: string;
  createdAt: string;
  lastActive: string;
}

export interface NotificationLog {
  id: string;
  notificationId: string;
  sender: string;
  recipient: string;
  title: string;
  message: string;
  type: string;
  deliveryStatus: 'sent' | 'delivered' | 'scheduled' | 'failed';
  timestamp: string;
}

export interface PaystackSettings {
  apiKey?: string;
  publicKey: string;
  secretKey: string;
  environment: 'production' | 'test';
  currency?: string;
  merchantId?: string;
  apiEndpoint?: string;
  callbackUrl?: string;
  webhookUrl?: string;
  verificationEndpoint?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface PaymentTransaction {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  currency: string;
  reference: string;
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  gateway: string;
  gatewayResponse?: any;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface GlobalSystemConfig {
  defaultCurrency: string;
  defaultTaxRate: number;
  enableNewRegistrations: boolean;
  allowedBusinessTypes: string[];
  systemBrandingName: string;
  systemLogoUrl: string;
  passwordMinLength: number;
  passwordRequireNumbers: boolean;
  defaultSubscriptionAmount?: number;
  updatedAt: string;
}

export interface PrinterSettings {
  printerId: string;
  businessId: string;
  printerName: string;
  printerType: 'Thermal Receipt Printer' | 'Standard Printer' | 'Laser Printer' | 'Inkjet Printer' | 'Network Printer' | 'Bluetooth Printer' | 'USB Printer' | 'Kitchen Printer';
  connectionType: 'USB' | 'Bluetooth' | 'WiFi' | 'LAN Network' | 'Serial' | 'System Printer';
  paperSize: '58mm' | '80mm' | 'A4' | 'A5' | 'Letter';
  isDefault: boolean;
  receiptTemplate?: {
    logoUrl?: string;
    businessName?: string;
    address?: string;
    phone?: string;
    taxNumber?: string;
    footerMessage?: string;
  };
  createdAt: string;
}

export interface SalonAppointment {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceId: string;
  serviceName: string;
  staffId?: string;
  staffName?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes?: number;
  price: number;
  status: 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: string;
}

export interface SalonStaff {
  id: string;
  businessId: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  imageUrl?: string;
  avatarUrl?: string;
  specialties: string[];
  commissionRate: number; // percentage e.g. 15
  status: 'Active' | 'On Leave' | 'Inactive';
  createdAt: string;
}

export interface LaundryService {
  id: string;
  businessId: string;
  name: string;
  category: string;
  garmentType?: string; // e.g. 'Wash & Fold', 'Shirts & Tops', 'Suits & Jackets', 'Bedding & Linens', 'Footwear', 'General / All Items'
  itemType: string; // Unit of charge: 'Per Piece' | 'Per Kilogram' | 'Per Pair' | 'Per Set' | 'Flat Fee' | 'Per Meter'
  price: number;
  estimatedTurnaround?: string; // e.g. '24 Hours', '48 Hours', '3 Days', 'Same Day (12 Hours)'
  expressAvailable?: boolean;
  expressPrice?: number;
  minOrderQty?: number;
  maxWeightKg?: number;
  stainTreatmentAvailable?: boolean;
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
  fabricCareNotes?: string;
  specialHandlingInstructions?: string;
  description?: string;
  enabled: boolean;
  isPreset?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LaundryOrderItem {
  id: string;
  name: string;
  category?: string;
  itemType?: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface LaundryOrder {
  id: string;
  businessId: string;
  branchId?: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: LaundryOrderItem[];
  totalPieces: number;
  subtotal: number;
  discount?: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: 'Paid' | 'Partial' | 'Pending';
  status: 'Received' | 'Washing' | 'Drying' | 'Ironing' | 'Ready for Pickup' | 'Delivered' | 'Cancelled';
  receivedDate: string;
  estimatedPickupDate: string;
  deliveredDate?: string;
  specialInstructions?: string;
  createdAt: string;
  createdBy: string;
}

export interface ScannerSession {
  sessionId: string;
  businessId: string;
  userId?: string;
  branchId?: string;
  status: 'waiting' | 'connected' | 'disconnected' | 'expired' | 'active';
  createdAt: string;
  expiresAt: string;
}

export interface ScannedItemPayload {
  id: string;
  sessionId: string;
  businessId: string;
  barcode: string;
  timestamp: string;
}

export interface PrintCommand {
  id: string;
  sessionId: string;
  businessId: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  timestamp: string;
}

// --- TRAVEL & TOUR TYPES ---

export interface TravelCustomer {
  id: string;
  businessId: string;
  fullName: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  address: string;
  emergencyContact: string;
  customerNotes?: string;
  preferredDestination?: string;
  travelHistory?: string;
  passportCopyUrl?: string;
  visaDocumentsUrls?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface TravelBooking {
  id: string;
  bookingNumber: string; // e.g. TB-10023
  businessId: string;
  customerId: string;
  customerName: string;
  serviceType: 'Flight' | 'Hotel' | 'Visa' | 'Tour Package' | 'Transportation' | 'Insurance' | 'Multiple Services';
  destination: string;
  departureDate: string;
  returnDate: string;
  airline?: string;
  hotel?: string;
  numberOfTravelers: number;
  bookingStatus: 'Pending' | 'Confirmed' | 'Processing' | 'Ticketed' | 'Completed' | 'Cancelled';
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid' | 'Refunded';
  assignedStaff: string;
  notes?: string;
  totalAmount: number;
  paidAmount: number;
  servicesIncluded?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface TravelFlight {
  id: string;
  bookingId?: string;
  businessId: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  ticketClass: 'Economy' | 'Premium Economy' | 'Business' | 'First Class';
  seatPreference?: string;
  ticketCost: number;
  sellingPrice: number;
  bookingReference: string;
  passengerName?: string;
  status?: 'Reserved' | 'Ticketed' | 'Cancelled' | 'In Flight' | 'Arrived';
  createdAt: string;
  updatedAt?: string;
}

export interface TravelHotel {
  id: string;
  bookingId?: string;
  businessId: string;
  hotelName: string;
  city: string;
  country: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  numberOfGuests: number;
  bookingReference: string;
  cost: number;
  sellingPrice: number;
  guestName?: string;
  status?: 'Reserved' | 'Checked In' | 'Checked Out' | 'Cancelled';
  createdAt: string;
  updatedAt?: string;
}

export interface TravelVisa {
  id: string;
  bookingId?: string;
  businessId: string;
  customerId: string;
  customerName: string;
  country: string;
  visaType: string; // Tourist, Business, Student, Work, Transit
  submissionDate?: string;
  appointmentDate?: string;
  interviewDate?: string;
  status: 'New' | 'Waiting for Documents' | 'Submitted' | 'Appointment Scheduled' | 'Under Review' | 'Approved' | 'Rejected' | 'Collected';
  documentsSubmitted?: string[];
  assignedOfficer: string;
  embassy: string;
  processingFee: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TravelPassport {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  serviceType: 'New Passport' | 'Renewal' | 'Lost Passport' | 'Expedited Service';
  passportNumber?: string;
  expiryDate?: string;
  submissionDate: string;
  collectionDate?: string;
  status: 'Processing' | 'Ready for Collection' | 'Collected' | 'On Hold';
  notes?: string;
  fee: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TravelPackage {
  id: string;
  businessId: string;
  name: string;
  packageName?: string;
  description?: string;
  destination: string;
  duration: string; // e.g. "7 Days / 6 Nights"
  durationDays?: number;
  price: number;
  pricePerPerson?: number;
  includedServices: string[];
  excludedServices: string[];
  inclusions?: string;
  hotel: string;
  meals: string;
  transportation: string;
  guide: string;
  availableSeats: number;
  maxCapacity?: number;
  isArchived?: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TravelTransport {
  id: string;
  bookingId?: string;
  bookingReference?: string;
  businessId: string;
  type: 'Airport Pickup' | 'Airport Drop-off' | 'Car Rental' | 'Bus Booking' | 'Chauffeur Service' | string;
  vehicleType?: string;
  driver: string;
  driverName?: string;
  passengerName?: string;
  vehicle: string;
  pickupTime: string;
  dropOffTime: string;
  pickupLocation: string;
  dropoffLocation?: string;
  destination: string;
  cost: number;
  sellingPrice: number;
  status?: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | string;
  createdAt: string;
  updatedAt?: string;
}

export interface TravelInsurance {
  id: string;
  bookingId?: string;
  businessId: string;
  customerId?: string;
  customerName?: string;
  travelerName?: string;
  insuranceProvider: string;
  provider?: string;
  policyNumber: string;
  coverage: string;
  coverageType?: string;
  premium: number;
  premiumAmount?: number;
  startDate?: string;
  endDate?: string;
  expiryDate: string;
  status?: 'Active' | 'Expired' | 'Claimed' | 'Pending' | string;
  createdAt: string;
  updatedAt?: string;
}

export interface TravelSupplier {
  id: string;
  businessId: string;
  name: string;
  category: 'Airlines' | 'Hotels' | 'Transport Companies' | 'Insurance Companies' | 'Tour Operators' | 'Airline' | 'Hotel Chain' | 'Visa Agency' | 'Consolidator' | string;
  contactPerson: string;
  phone: string;
  email: string;
  website?: string;
  address?: string;
  contractDetails?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TravelPartner {
  id: string;
  businessId: string;
  name: string;
  category?: 'International Partners' | 'Local Partners' | 'Visa Centers' | 'Embassies' | string;
  partnerType?: 'Sub-Agent' | 'Referral Partner' | 'Corporate Account' | 'Affiliate' | string;
  contactPerson: string;
  phone: string;
  email: string;
  commissionRate?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TravelDocument {
  id: string;
  businessId: string;
  customerId?: string;
  customerName?: string;
  bookingId?: string;
  docType?: 'Passport' | 'Visa' | 'Tickets' | 'Hotel Voucher' | 'Insurance Certificate' | 'Receipt' | 'Agreement' | string;
  documentType?: string;
  documentName?: string;
  title?: string;
  fileUrl: string; // base64 or storage url
  fileName?: string;
  notes?: string;
  uploadedAt: string;
}

export interface TravelMarketing {
  id: string;
  businessId: string;
  title?: string;
  campaignName?: string;
  channel?: string;
  content?: string;
  scheduledDate?: string;
  type?: 'Tour Promotion' | 'Holiday Deal' | 'Discount Campaign' | 'Customer Email Campaign' | 'SMS Campaign' | string;
  status?: 'Draft' | 'Active' | 'Completed' | 'Paused' | 'Scheduled' | 'Sent' | string;
  targetAudience: string;
  budget?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// --- SCHOOL & EDUCATIONAL INSTITUTION INTERFACES ---

export interface Student {
  id: string;
  businessId: string;
  studentId: string; // Admission number (e.g. RCA-2026-001)
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  classId: string;
  className: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address?: string;
  admissionDate: string;
  status: 'active' | 'graduated' | 'suspended' | 'withdrawn';
  photoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  businessId: string;
  staffId: string;
  name: string;
  email: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  qualification?: string;
  subjects: string[];
  classes: string[];
  roleTitle?: string;
  employmentDate: string;
  status: 'active' | 'on_leave' | 'terminated';
  salary?: number;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SchoolClass {
  id: string;
  businessId: string;
  name: string; // e.g. "Primary 4A", "Form 2 Science"
  gradeLevel: string; // e.g. "Primary 4", "JHS 2", "SHS 2"
  classTeacherId?: string;
  classTeacherName?: string;
  roomNumber?: string;
  capacity: number;
  currentEnrollment: number;
  academicYear: string;
  term?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FeeInvoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  term: string; // e.g. "Term 1", "Semester 1"
  academicYear: string; // e.g. "2025/2026"
  feeItems: { title: string; amount: number }[];
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  dueDate: string;
  issueDate: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FeePayment {
  id: string;
  businessId: string;
  invoiceId: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'cheque';
  transactionRef?: string;
  receiptNumber: string;
  paidDate: string;
  receivedBy: string;
  notes?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  businessId: string;
  date: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  recordedBy: string;
  createdAt: string;
}

export interface ExamGrade {
  id: string;
  businessId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className?: string;
  subject: string;
  examName: string; // e.g. "Mid-Term Exam", "End of Term Examination"
  term: string;
  academicYear: string;
  score: number;
  maxScore: number;
  grade: string; // e.g. "A+", "B", "1"
  remarks?: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SchoolTimetableEntry {
  id: string;
  businessId: string;
  classId: string;
  className: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "09:00"
  subject: string;
  teacherName: string;
  room?: string;
  createdAt: string;
}

export interface SchoolAnnouncement {
  id: string;
  businessId: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'teachers' | 'parents' | 'students';
  channel: 'portal' | 'sms' | 'whatsapp' | 'both';
  date: string;
  authorName: string;
  smsStatus?: 'sent' | 'failed' | 'simulated';
  whatsAppStatus?: 'sent' | 'failed' | 'simulated';
  recipientCount?: number;
  createdAt: string;
}

export interface SmsSettings {
  id?: string;
  businessId?: string; // 'platform' or specific business
  provider: 'hubtel' | 'arkesel' | 'mnotify' | 'twilio' | string;
  apiKey: string;
  apiSecret?: string;
  senderId: string;
  apiEndpoint?: string;
  isEnabled?: boolean;
  hasApiKey?: boolean;
  maskedApiKey?: string;
  lastTestedAt?: string | null;
  lastTestStatus?: string;
  lastTestMessage?: string | null;
  totalSentCount?: number;
  balance?: number;
  isActive?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface WhatsAppSettings {
  id?: string;
  businessId?: string;
  provider: 'meta' | 'twilio' | 'infobip';
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken: string;
  senderPhoneNumber?: string;
  isActive: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SmsTimingDetails {
  clientTriggerTime?: number;
  backendReceivedTime?: number;
  arkeselRequestStartTime?: number;
  arkeselResponseTime?: number;
  submissionCompletionTime?: number;
  arkeselLatencyMs?: number;
  totalSubmissionMs?: number;
}

export interface BusinessPopupPrompt {
  id: string;
  title: string;
  message: string;
  daysAfterRegistration: number; // 5 to 30 days
  targetType: 'all' | 'selected';
  targetBusinessIds?: string[];
  status: 'active' | 'inactive';
  category?: 'onboarding' | 'subscription' | 'promotional' | 'announcement' | 'instructional';
  actionButtonText?: string;
  actionUrlOrTab?: string;
  allowRepeatDisplay?: boolean;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}








