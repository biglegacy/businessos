/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PRODUCT_BASED_TYPES = [
  'Supermarket',
  'Grocery Store',
  'Mini Mart',
  'Pharmacy & Health',
  'Pharmacies',
  'Electronics Shop',
  'Phone Shop',
  'Fashion Shop / Boutique',
  'Fashion Stores',
  'Clothing Stores',
  'Shoe Stores',
  'Cosmetic Stores',
  'Hardware Store',
  'Bookshop',
  'Bookshops',
  'Furniture Store',
  'Furniture Stores',
  'Auto Parts Shop',
  'Auto Parts Shops',
  'Agricultural Supply Stores',
  'Beverage Stores',
  'Bakeries',
  'Wholesale Businesses',
  'Distribution Companies',
  'Water & Drinks Distribution',
  'General Enterprise',
  'Restaurant / Food Business'
];

export const SERVICE_BASED_TYPES = [
  'Professional Services',
  'Consulting Firms',
  'Accounting Firms',
  'Law Firms',
  'Marketing Agencies',
  'Churches',
  'Travel Agencies',
  'Travel & Tour',
  'Laundry Services',
  'Salon & Barbers',
  'Salons',
  'Barbershops',
  'Gyms',
  'Training Centers'
];

/**
 * Determines whether a business category / business type is product-based.
 */
export function isProductBasedBusiness(category?: string, businessType?: string): boolean {
  const cat = (category || '').trim();
  const bType = (businessType || '').trim();

  // If explicitly in service list, it's service-based
  if (SERVICE_BASED_TYPES.some(s => s.toLowerCase() === cat.toLowerCase() || s.toLowerCase() === bType.toLowerCase())) {
    return false;
  }

  // If in product list or default fallback
  if (PRODUCT_BASED_TYPES.some(p => p.toLowerCase() === cat.toLowerCase() || p.toLowerCase() === bType.toLowerCase())) {
    return true;
  }

  // Fallback: Check if category string contains service keywords
  const serviceKeywords = ['service', 'consult', 'salon', 'barber', 'laundry', 'agency', 'church', 'gym', 'training'];
  const isServiceByKeyword = serviceKeywords.some(kw => cat.toLowerCase().includes(kw) || bType.toLowerCase().includes(kw));

  return !isServiceByKeyword;
}

/**
 * Returns allowed navigation tabs based on business type and user role.
 */
export function getTabsForBusiness(
  role: string,
  category?: string,
  businessType?: string
): string[] {
  const isProduct = isProductBasedBusiness(category, businessType);
  const isSalon = category === 'Salon & Barbers' || businessType === 'Salon & Barbers' || category === 'Salon' || businessType === 'Salon';
  const isLaundry = category === 'Laundry Services' || businessType === 'Laundry Services';
  const isTravel = category === 'Travel & Tour' || businessType === 'Travel & Tour' || category === 'Travel Agencies' || businessType === 'Travel Agencies';

  if (isTravel) {
    if (['owner', 'admin', 'SUPER_ADMIN', 'manager'].includes(role)) {
      return [
        'Dashboard', 'Travel Customers', 'Bookings Management', 'Flight Reservations', 'Hotel Bookings', 
        'Visa Processing', 'Passport Assistance', 'Tour Packages', 
        'Ground Transport', 'Travel Insurance', 'Travel Invoices', 'Travel Payments', 
        'Travel Suppliers', 'Travel Partners', 'Travel Documents', 'Travel Calendar', 'Travel Reports', 
        'Travel Marketing', 'Settings', 'Employees'
      ];
    }
    if (role === 'visa_officer') {
      return ['Dashboard', 'Travel Customers', 'Visa Processing', 'Passport Assistance', 'Travel Documents', 'Travel Calendar'];
    }
    if (role === 'accountant') {
      return ['Dashboard', 'Travel Customers', 'Travel Invoices', 'Travel Payments', 'Travel Suppliers', 'Travel Partners', 'Travel Reports'];
    }
    // Default staff / consultant / agent
    return [
      'Dashboard', 'Travel Customers', 'Bookings Management', 'Flight Reservations', 'Hotel Bookings', 
      'Tour Packages', 'Ground Transport', 'Travel Insurance', 'Travel Invoices', 
      'Travel Payments', 'Travel Documents', 'Travel Calendar'
    ];
  }

  if (isSalon) {
    return ['Dashboard', 'POS', 'Salon POS', 'Products', 'Customers', 'Sales', 'Expenses', 'Reports', 'Settings', 'Employees'];
  }

  if (isLaundry) {
    return ['Dashboard', 'Laundry Orders', 'POS', 'Customers', 'Sales', 'Expenses', 'Reports', 'Settings', 'Employees'];
  }

  let tabs: string[] = [];

  switch (role) {
    case 'owner':
      if (isProduct) {
        tabs = ['Dashboard', 'POS', 'Products', 'Inventory', 'Sales', 'Expenses', 'Customers', 'Employees', 'Reports', 'Settings', 'Branches', 'Returns'];
      } else {
        // Service-based business: Hide Products, Inventory, Returns by default unless manually enabled
        tabs = ['Dashboard', 'POS', 'Services', 'Sales', 'Expenses', 'Customers', 'Employees', 'Reports', 'Settings', 'Branches'];
      }
      break;
    case 'admin':
    case 'SUPER_ADMIN':
      if (isProduct) {
        tabs = ['Dashboard', 'POS', 'Products', 'Inventory', 'Sales', 'Expenses', 'Customers', 'Employees', 'Reports', 'Settings', 'Branches', 'Returns', 'Audit Logs'];
      } else {
        tabs = ['Dashboard', 'POS', 'Services', 'Sales', 'Expenses', 'Customers', 'Employees', 'Reports', 'Settings', 'Branches', 'Audit Logs'];
      }
      break;
    case 'manager':
      if (isProduct) {
        tabs = ['Dashboard', 'POS', 'Products', 'Inventory', 'Sales', 'Expenses', 'Customers', 'Reports', 'Branches', 'Returns'];
      } else {
        tabs = ['Dashboard', 'POS', 'Services', 'Sales', 'Expenses', 'Customers', 'Reports', 'Branches'];
      }
      break;
    case 'cashier':
      tabs = ['POS', 'Sales', 'Returns'];
      break;
    case 'salesperson':
      tabs = ['POS', 'Customers', 'Returns'];
      break;
    case 'inventory_staff':
      if (isProduct) {
        tabs = ['Products', 'Inventory', 'Branches', 'Returns'];
      } else {
        tabs = ['Services', 'Branches'];
      }
      break;
    default:
      tabs = [];
  }

  return tabs;
}
