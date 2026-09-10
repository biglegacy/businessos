/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Pill,
  AlertTriangle,
  FileText,
  Users,
  Truck,
  Receipt,
  TrendingDown,
  TrendingUp,
  Settings as SettingsIcon,
  Sparkles,
  Scissors,
  Calendar,
  Wrench,
  Grid,
  Building2,
  Shirt,
  ClipboardList,
  Flame,
  Plane,
  Shield,
  FileCheck,
  Compass,
  CreditCard,
  Send,
  Briefcase
} from 'lucide-react';

export type IndustryArchetype =
  | 'pharmacy'
  | 'beauty_cosmetics'
  | 'salon'
  | 'restaurant'
  | 'fast_food'
  | 'laundry'
  | 'travel'
  | 'school'
  | 'service'
  | 'other'
  | 'retail';

export interface BusinessProfile {
  archetype: IndustryArchetype;
  displayName: string;
  itemTerm: string;
  itemTermPlural: string;
  categoryTerm: string;
  posTitle: string;
  defaultCategories: string[];
  defaultDosageForms?: string[];
  defaultBeautyShades?: string[];
}

export const PRODUCT_BASED_TYPES = [
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
  'Pharmacy & Health',
  'Pharmacy',
  'Medical Supplies',
  'Health & Wellness Store',
  'Optical Shop',
  'Beauty & Cosmetics',
  'Skincare Business',
  'Perfume & Fragrance',
  'Grocery Store',
  'Phone Shop',
  'Electronics Shop',
  'Fashion Shop / Boutique',
  'Hardware Store',
  'Water & Drinks Distribution',
  'General Enterprise',
  'Restaurant / Food Business',
  'Fast Food',
  'Restaurant',
  'Bakery',
  'Catering',
  'Food & Beverage',
  'Grocery',
  'Provision & Food Store'
];

export const SERVICE_BASED_TYPES = [
  'Cleaning Services',
  'Laundry & Dry Cleaning',
  'Laundry Services',
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
  'Beauty Salon',
  'Hair Salon',
  'Barber Shop',
  'Spa & Wellness',
  'Nail Salon',
  'Makeup Artist',
  'Salon & Barbers',
  'Beauty & Wellness',
  'Salon',
  'Travel & Tours',
  'Travel & Tour',
  'Travel Agencies',
  'School / Educational Institution'
];

/**
 * Detects the industry archetype for any business category or type.
 */
export function getIndustryArchetype(category?: string, businessType?: string): IndustryArchetype {
  const cat = (category || '').trim().toLowerCase();
  const bType = (businessType || '').trim().toLowerCase();
  const combined = `${cat} ${bType}`;

  // School
  if (combined.includes('school') || combined.includes('educational')) {
    return 'school';
  }

  // Travel
  if (combined.includes('travel') || combined.includes('tour') || combined.includes('visa')) {
    return 'travel';
  }

  // Laundry
  if (combined.includes('laundry') || combined.includes('dry clean')) {
    return 'laundry';
  }

  // Fast Food (checked before restaurant)
  if (combined.includes('fast food') || combined.includes('takeaway') || combined.includes('burger')) {
    return 'fast_food';
  }

  // Restaurant & Food
  if (
    combined.includes('restaurant') ||
    combined.includes('bakery') ||
    combined.includes('catering') ||
    combined.includes('food & beverage') ||
    combined.includes('provision & food')
  ) {
    return 'restaurant';
  }

  // Pharmacy & Health
  if (
    combined.includes('pharmacy') ||
    combined.includes('medical supplies') ||
    combined.includes('optical shop') ||
    combined.includes('chemist') ||
    combined.includes('dispensary')
  ) {
    return 'pharmacy';
  }

  // Beauty & Cosmetics (Product-oriented)
  if (
    combined.includes('beauty & cosmetics') ||
    combined.includes('cosmetic') ||
    combined.includes('skincare business') ||
    combined.includes('perfume') ||
    combined.includes('fragrance')
  ) {
    return 'beauty_cosmetics';
  }

  // Salon & Personal Care (Service-oriented)
  if (
    combined.includes('salon') ||
    combined.includes('barber') ||
    combined.includes('spa & wellness') ||
    combined.includes('nail salon') ||
    combined.includes('makeup artist')
  ) {
    return 'salon';
  }

  // Service Businesses
  if (
    combined.includes('cleaning') ||
    combined.includes('repair') ||
    combined.includes('printing') ||
    combined.includes('photography') ||
    combined.includes('event services') ||
    combined.includes('consultan') ||
    combined.includes('professional services') ||
    combined.includes('transportation') ||
    combined.includes('logistics') ||
    combined.includes('car rental') ||
    combined.includes('service')
  ) {
    return 'service';
  }

  // Other Business
  if (combined.includes('other business') || combined.includes('custom business')) {
    return 'other';
  }

  // Default to General Retail
  return 'retail';
}

/**
 * Returns whether a business is product-based.
 */
export function isProductBasedBusiness(category?: string, businessType?: string): boolean {
  const archetype = getIndustryArchetype(category, businessType);
  if (['salon', 'service', 'laundry', 'travel', 'school'].includes(archetype)) {
    return false;
  }
  return true;
}

/**
 * Returns full profile details for an archetype.
 */
export function getBusinessProfile(category?: string, businessType?: string): BusinessProfile {
  const archetype = getIndustryArchetype(category, businessType);

  switch (archetype) {
    case 'pharmacy':
      return {
        archetype: 'pharmacy',
        displayName: 'Pharmacy & Health Dispensary',
        itemTerm: 'Medicine',
        itemTermPlural: 'Medicines',
        categoryTerm: 'Therapeutic Class',
        posTitle: 'Pharmacy Dispensary POS',
        defaultCategories: [
          'Analgesics & Pain Relief',
          'Antibiotics & Anti-infectives',
          'Antimalarials',
          'Cardiovascular & Hypertension',
          'Respiratory & Cough',
          'Gastrointestinal & Ulcer',
          'Vitamins & Supplements',
          'Dermatologicals & Skincare',
          'First Aid & Surgical',
          'Pediatric Care',
          'Eye & Ear Drops',
          'Family Planning & Sexual Health',
          'Other Medicines'
        ],
        defaultDosageForms: [
          'Tablets',
          'Capsules',
          'Syrup',
          'Suspension',
          'Cream',
          'Ointment',
          'Drops',
          'Injection',
          'Powder',
          'Suppository',
          'Inhaler',
          'Lotion',
          'Other'
        ]
      };

    case 'beauty_cosmetics':
      return {
        archetype: 'beauty_cosmetics',
        displayName: 'Beauty & Cosmetics Studio',
        itemTerm: 'Beauty Product',
        itemTermPlural: 'Beauty Products',
        categoryTerm: 'Category',
        posTitle: 'Beauty Counter POS',
        defaultCategories: [
          'Makeup',
          'Skincare',
          'Haircare',
          'Body Care',
          'Fragrance & Perfume',
          'Wigs & Weaves',
          'Hair Extensions',
          'Hair Accessories',
          'Nail Care & Polish',
          'Beauty Tools & Brushes',
          "Men's Grooming",
          'Baby Care',
          'Other'
        ],
        defaultBeautyShades: [
          'Fair 100',
          'Light Sand 120',
          'Natural Beige 140',
          'Warm Honey 210',
          'Golden Caramel 260',
          'Toffee 310',
          'Chestnut 330',
          'Rich Espresso 360',
          'Deep Mocha 380',
          'Universal Clear'
        ]
      };

    case 'salon':
      return {
        archetype: 'salon',
        displayName: 'Salon & Spa Studio',
        itemTerm: 'Service',
        itemTermPlural: 'Services',
        categoryTerm: 'Service Category',
        posTitle: 'Salon Terminal POS',
        defaultCategories: [
          'Haircut & Styling',
          'Braiding & Weaving',
          'Hair Treatment & Relaxer',
          'Washing & Blowdry',
          'Coloring & Highlights',
          'Manicure & Pedicure',
          'Facials & Skincare',
          'Makeup Application',
          'Spa & Massage',
          'Beard Grooming & Shaving',
          'Bridal Packages',
          'Other Services'
        ]
      };

    case 'restaurant':
    case 'fast_food':
      return {
        archetype: archetype,
        displayName: archetype === 'fast_food' ? 'Fast Food Operations' : 'Restaurant Operations',
        itemTerm: 'Menu Item',
        itemTermPlural: 'Menu Items',
        categoryTerm: 'Menu Category',
        posTitle: 'Order Terminal POS',
        defaultCategories: [
          'Main Dishes',
          'Appetizers & Starters',
          'Side Orders',
          'Beverages & Soft Drinks',
          'Alcoholic Drinks',
          'Desserts',
          'Breakfast',
          'Combos & Deals',
          'Chef Specials'
        ]
      };

    case 'service':
      return {
        archetype: 'service',
        displayName: 'Professional Services OS',
        itemTerm: 'Service Job',
        itemTermPlural: 'Service Jobs',
        categoryTerm: 'Service Type',
        posTitle: 'Service Billing Terminal',
        defaultCategories: [
          'Diagnostics & Inspection',
          'Standard Repair',
          'Express Service',
          'Maintenance & Tune-up',
          'Deep Cleaning',
          'Advisory & Consulting',
          'Installation & Setup',
          'Custom Projects'
        ]
      };

    case 'other':
      return {
        archetype: 'other',
        displayName: 'Enterprise Business OS',
        itemTerm: 'Product / Service',
        itemTermPlural: 'Products & Services',
        categoryTerm: 'Category',
        posTitle: 'Universal Counter POS',
        defaultCategories: [
          'General Products',
          'Standard Services',
          'Special Orders',
          'Custom Work',
          'Miscellaneous'
        ]
      };

    default:
      return {
        archetype: 'retail',
        displayName: 'Retail Management OS',
        itemTerm: 'Product',
        itemTermPlural: 'Products',
        categoryTerm: 'Category',
        posTitle: 'Point of Sale (POS)',
        defaultCategories: [
          'Beverages',
          'Dry Foods & Provisions',
          'Toiletries & Personal Care',
          'Household & Cleaning',
          'Electronics & Accessories',
          'Clothing & Apparel',
          'Hardware & Tools',
          'Stationery & Office',
          'General Merchandise'
        ]
      };
  }
}

/**
 * Returns the authorized tabs for a business type and user role.
 */
export function getTabsForBusiness(
  role: string,
  category?: string,
  businessType?: string
): string[] {
  const archetype = getIndustryArchetype(category, businessType);
  const isOwnerOrAdmin = ['owner', 'admin', 'SUPER_ADMIN'].includes(role);
  const isManager = role === 'manager';
  const isCashier = role === 'cashier' || role === 'salesperson';
  const isInventoryStaff = role === 'inventory_staff';

  switch (archetype) {
    case 'pharmacy':
      if (isOwnerOrAdmin) {
        return [
          'Dashboard',
          'POS',
          'Medicines & Products',
          'Inventory',
          'Expiry Tracking',
          'Prescriptions',
          'Stock Alerts',
          'Customers',
          'Suppliers',
          'Sales',
          'Reports',
          'Settings',
          'Employees',
          'Branches'
        ];
      }
      if (isManager) {
        return [
          'Dashboard',
          'POS',
          'Medicines & Products',
          'Inventory',
          'Expiry Tracking',
          'Prescriptions',
          'Stock Alerts',
          'Customers',
          'Suppliers',
          'Sales',
          'Reports'
        ];
      }
      if (isCashier) {
        return ['POS', 'Sales', 'Prescriptions', 'Customers'];
      }
      if (isInventoryStaff) {
        return ['Medicines & Products', 'Inventory', 'Expiry Tracking', 'Stock Alerts', 'Suppliers'];
      }
      return ['Dashboard', 'POS'];

    case 'beauty_cosmetics':
      if (isOwnerOrAdmin) {
        return [
          'Dashboard',
          'POS',
          'Products',
          'Categories',
          'Inventory',
          'Customers',
          'Suppliers',
          'Sales',
          'Expenses',
          'Reports',
          'Settings',
          'Employees',
          'Branches'
        ];
      }
      if (isManager) {
        return [
          'Dashboard',
          'POS',
          'Products',
          'Categories',
          'Inventory',
          'Customers',
          'Suppliers',
          'Sales',
          'Expenses',
          'Reports'
        ];
      }
      if (isCashier) {
        return ['POS', 'Sales', 'Customers'];
      }
      if (isInventoryStaff) {
        return ['Products', 'Categories', 'Inventory', 'Suppliers'];
      }
      return ['Dashboard', 'POS'];

    case 'salon':
      if (isOwnerOrAdmin) {
        return [
          'Dashboard',
          'POS',
          'Salon Services',
          'Appointments',
          'Salon Staff',
          'Products',
          'Customers',
          'Sales',
          'Expenses',
          'Reports',
          'Settings',
          'Employees'
        ];
      }
      if (isManager) {
        return [
          'Dashboard',
          'POS',
          'Salon Services',
          'Appointments',
          'Salon Staff',
          'Products',
          'Customers',
          'Sales',
          'Expenses',
          'Reports'
        ];
      }
      if (isCashier) {
        return ['POS', 'Appointments', 'Customers', 'Sales'];
      }
      return ['Dashboard', 'POS', 'Appointments'];

    case 'service':
      if (isOwnerOrAdmin) {
        return [
          'Dashboard',
          'Jobs & Orders',
          'Services',
          'Appointments',
          'Staff',
          'Customers',
          'Payments',
          'Expenses',
          'Reports',
          'Settings',
          'Employees'
        ];
      }
      if (isManager) {
        return [
          'Dashboard',
          'Jobs & Orders',
          'Services',
          'Appointments',
          'Staff',
          'Customers',
          'Payments',
          'Expenses',
          'Reports'
        ];
      }
      if (isCashier) {
        return ['Jobs & Orders', 'Payments', 'Customers'];
      }
      return ['Dashboard', 'Jobs & Orders', 'Customers'];

    case 'other':
      if (isOwnerOrAdmin) {
        return [
          'Dashboard',
          'POS',
          'Products',
          'Services',
          'Inventory',
          'Sales',
          'Expenses',
          'Customers',
          'Suppliers',
          'Reports',
          'Settings',
          'Employees',
          'Branches'
        ];
      }
      if (isManager) {
        return [
          'Dashboard',
          'POS',
          'Products',
          'Services',
          'Inventory',
          'Sales',
          'Expenses',
          'Customers',
          'Suppliers',
          'Reports'
        ];
      }
      if (isCashier) {
        return ['POS', 'Sales', 'Customers'];
      }
      return ['Dashboard', 'POS'];

    case 'restaurant':
      if (isOwnerOrAdmin) {
        return [
          'Dashboard',
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
          'Settings',
          'Employees'
        ];
      }
      if (isManager) {
        return [
          'Dashboard',
          'Restaurant POS',
          'Orders',
          'Menu Management',
          'Categories',
          'Ingredients',
          'Kitchen Display',
          'Tables',
          'Customers',
          'Suppliers',
          'Reports'
        ];
      }
      if (isCashier) {
        return ['Restaurant POS', 'Orders', 'Customers'];
      }
      if (isInventoryStaff) {
        return ['Menu Management', 'Ingredients', 'Recipe Management', 'Categories', 'Suppliers'];
      }
      return ['Restaurant POS', 'Kitchen Display'];

    case 'fast_food':
      if (isOwnerOrAdmin) {
        return [
          'Dashboard',
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
        ];
      }
      if (isManager) {
        return [
          'Dashboard',
          'Fast Food POS',
          'Menu Management',
          'Kitchen Display',
          'Ingredient Inventory',
          'Customers',
          'Suppliers',
          'Reports'
        ];
      }
      if (isCashier) {
        return ['Fast Food POS', 'Customers'];
      }
      return ['Fast Food POS', 'Kitchen Display'];

    case 'laundry':
      if (isOwnerOrAdmin) {
        return ['Dashboard', 'Laundry Orders', 'POS', 'Customers', 'Sales', 'Expenses', 'Reports', 'Settings', 'Employees'];
      }
      if (isManager) {
        return ['Dashboard', 'Laundry Orders', 'POS', 'Customers', 'Sales', 'Expenses', 'Reports'];
      }
      return ['Laundry Orders', 'POS', 'Customers'];

    case 'travel':
      if (isOwnerOrAdmin || isManager) {
        return [
          'Dashboard',
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
          'Settings',
          'Employees'
        ];
      }
      return [
        'Dashboard',
        'Travel Customers',
        'Bookings Management',
        'Flight Reservations',
        'Hotel Bookings',
        'Tour Packages',
        'Travel Documents'
      ];

    case 'retail':
    default:
      if (isOwnerOrAdmin) {
        return [
          'Dashboard',
          'POS',
          'Products',
          'Inventory',
          'Sales',
          'Expenses',
          'Customers',
          'Suppliers',
          'Employees',
          'Reports',
          'Settings',
          'Branches',
          'Returns'
        ];
      }
      if (isManager) {
        return [
          'Dashboard',
          'POS',
          'Products',
          'Inventory',
          'Sales',
          'Expenses',
          'Customers',
          'Reports',
          'Branches',
          'Returns'
        ];
      }
      if (isCashier) {
        return ['POS', 'Sales', 'Customers', 'Returns'];
      }
      if (isInventoryStaff) {
        return ['Products', 'Inventory', 'Branches', 'Returns'];
      }
      return ['Dashboard', 'POS'];
  }
}

/**
 * Returns dynamic sidebar items configured for the industry archetype.
 */
export function getSidebarItemsForArchetype(archetype: IndustryArchetype): { name: string; icon: any }[] {
  switch (archetype) {
    case 'pharmacy':
      return [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'POS', icon: ShoppingCart },
        { name: 'Medicines & Products', icon: Pill },
        { name: 'Inventory', icon: Package },
        { name: 'Expiry Tracking', icon: AlertTriangle },
        { name: 'Prescriptions', icon: FileText },
        { name: 'Stock Alerts', icon: AlertTriangle },
        { name: 'Customers', icon: Users },
        { name: 'Suppliers', icon: Truck },
        { name: 'Sales', icon: Receipt },
        { name: 'Reports', icon: TrendingUp },
        { name: 'Employees', icon: Users },
        { name: 'Branches', icon: Building2 },
        { name: 'Settings', icon: SettingsIcon }
      ];

    case 'beauty_cosmetics':
      return [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'POS', icon: ShoppingCart },
        { name: 'Products', icon: Sparkles },
        { name: 'Categories', icon: Grid },
        { name: 'Inventory', icon: Package },
        { name: 'Customers', icon: Users },
        { name: 'Suppliers', icon: Truck },
        { name: 'Sales', icon: Receipt },
        { name: 'Expenses', icon: TrendingDown },
        { name: 'Reports', icon: TrendingUp },
        { name: 'Employees', icon: Users },
        { name: 'Branches', icon: Building2 },
        { name: 'Settings', icon: SettingsIcon }
      ];

    case 'salon':
      return [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'POS', icon: ShoppingCart },
        { name: 'Salon Services', icon: Scissors },
        { name: 'Appointments', icon: Calendar },
        { name: 'Salon Staff', icon: Sparkles },
        { name: 'Products', icon: Package },
        { name: 'Customers', icon: Users },
        { name: 'Sales', icon: Receipt },
        { name: 'Expenses', icon: TrendingDown },
        { name: 'Reports', icon: FileText },
        { name: 'Employees', icon: Users },
        { name: 'Settings', icon: SettingsIcon }
      ];

    case 'service':
      return [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'Jobs & Orders', icon: Wrench },
        { name: 'Services', icon: Briefcase },
        { name: 'Appointments', icon: Calendar },
        { name: 'Staff', icon: Users },
        { name: 'Customers', icon: Users },
        { name: 'Payments', icon: CreditCard },
        { name: 'Expenses', icon: TrendingDown },
        { name: 'Reports', icon: TrendingUp },
        { name: 'Employees', icon: Users },
        { name: 'Settings', icon: SettingsIcon }
      ];

    case 'other':
      return [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'POS', icon: ShoppingCart },
        { name: 'Products', icon: Package },
        { name: 'Services', icon: Briefcase },
        { name: 'Inventory', icon: Grid },
        { name: 'Customers', icon: Users },
        { name: 'Suppliers', icon: Truck },
        { name: 'Sales', icon: Receipt },
        { name: 'Expenses', icon: TrendingDown },
        { name: 'Reports', icon: TrendingUp },
        { name: 'Employees', icon: Users },
        { name: 'Branches', icon: Building2 },
        { name: 'Settings', icon: SettingsIcon }
      ];

    case 'fast_food':
      return [
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
        { name: 'Settings', icon: SettingsIcon }
      ];

    case 'restaurant':
      return [
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
        { name: 'Reports', icon: TrendingUp },
        { name: 'Employees', icon: Users },
        { name: 'Settings', icon: SettingsIcon }
      ];

    case 'laundry':
      return [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'Laundry Orders', icon: Shirt },
        { name: 'POS', icon: ShoppingCart },
        { name: 'Customers', icon: Users },
        { name: 'Sales', icon: Receipt },
        { name: 'Expenses', icon: TrendingDown },
        { name: 'Reports', icon: FileText },
        { name: 'Employees', icon: Users },
        { name: 'Settings', icon: SettingsIcon }
      ];

    case 'travel':
      return [
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
        { name: 'Settings', icon: SettingsIcon }
      ];

    case 'retail':
    default:
      return [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'POS', icon: ShoppingCart },
        { name: 'Products', icon: Package },
        { name: 'Inventory', icon: Grid },
        { name: 'Sales', icon: Receipt },
        { name: 'Expenses', icon: TrendingDown },
        { name: 'Customers', icon: Users },
        { name: 'Suppliers', icon: Truck },
        { name: 'Employees', icon: Users },
        { name: 'Branches', icon: Building2 },
        { name: 'Reports', icon: TrendingUp },
        { name: 'Settings', icon: SettingsIcon }
      ];
  }
}

export default getIndustryArchetype;
