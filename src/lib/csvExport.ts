/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sale, Product, Service, Customer, Expense, ActivityLog } from '../types';

/**
 * Generic core function to convert headers and raw matrix rows into a clean CSV Blob
 * and initiate a secure client-side browser file download.
 */
export function downloadCSV(filename: string, headers: string[], rows: any[][]) {
  // Format each cell safely escaping quotes and handling comma separators
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(val => {
      if (val === null || val === undefined) return '""';
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export Sales Transactions Ledger
 */
export function exportSalesToCSV(sales: Sale[], businessName: string) {
  const headers = [
    'Receipt ID',
    'Date & Time',
    'Customer Profile',
    'Cashier Staff',
    'Items Sold Summary',
    'Subtotal ($)',
    'Discount ($)',
    'Gross Total ($)',
    'Payment Method',
    'Transaction Status'
  ];

  const rows = sales.map(s => {
    const itemsSummary = s.items.map(item => `${item.name} (${item.quantity}x @ $${item.price.toFixed(2)})`).join(' | ');
    const customerProfile = s.customerName ? `${s.customerName} (${s.customerId || 'ID Unlinked'})` : 'Walk-in Customer';
    return [
      s.id,
      new Date(s.createdAt).toLocaleString(),
      customerProfile,
      s.employeeName,
      itemsSummary,
      s.subtotal,
      s.discount,
      s.total,
      s.paymentMethod.toUpperCase(),
      s.status.toUpperCase()
    ];
  });

  downloadCSV(`${businessName}_sales_ledger_${new Date().toISOString().split('T')[0]}`, headers, rows);
}

/**
 * Export Products Catalog & Stock Inventory levels
 */
export function exportProductsToCSV(products: Product[], businessName: string) {
  const headers = [
    'Product ID',
    'Name',
    'Category',
    'SKU / Barcode',
    'Cost Price ($)',
    'Selling Price ($)',
    'Margin Percentage (%)',
    'Stock Quantity',
    'Cost Inventory Valuation ($)',
    'Retail Inventory Valuation ($)',
    'Description'
  ];

  const rows = products.map(p => {
    const hasCost = p.costPrice !== undefined && p.costPrice !== null;
    const marginPercent = hasCost && p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice!) / p.sellingPrice * 100).toFixed(1) : 'N/A';
    const costValuation = hasCost ? p.costPrice! * p.stockQuantity : 0;
    const retailValuation = p.sellingPrice * p.stockQuantity;
    return [
      p.id,
      p.name,
      p.category,
      p.barcode,
      hasCost ? p.costPrice : 'N/A',
      p.sellingPrice,
      marginPercent === 'N/A' ? 'N/A' : `${marginPercent}%`,
      p.stockQuantity,
      costValuation,
      retailValuation,
      p.description
    ];
  });

  downloadCSV(`${businessName}_products_catalog_${new Date().toISOString().split('T')[0]}`, headers, rows);
}

/**
 * Export Services Catalog
 */
export function exportServicesToCSV(services: Service[], businessName: string) {
  const headers = [
    'Service ID',
    'Service Code',
    'Name',
    'Category',
    'Retail Price ($)',
    'Estimated Duration',
    'Assigned Employee',
    'Tax Rate (%)',
    'Status',
    'Description',
    'Private Notes'
  ];

  const rows = services.map(s => [
    s.id,
    s.code || 'N/A',
    s.name,
    s.category,
    s.price,
    s.duration || 'N/A',
    s.assignedEmployeeName || 'N/A',
    s.taxRate !== undefined && s.taxRate !== null ? `${s.taxRate}%` : 'N/A',
    s.status || 'Active',
    s.description || 'N/A',
    s.notes || 'N/A'
  ]);

  downloadCSV(`${businessName}_services_catalog_${new Date().toISOString().split('T')[0]}`, headers, rows);
}

/**
 * Export Customers Accounts Profiles
 */
export function exportCustomersToCSV(customers: Customer[], businessName: string) {
  const headers = [
    'Customer ID',
    'Full Name',
    'Email Address',
    'Phone Number',
    'Store Credit / Balance ($)',
    'Created Timestamp'
  ];

  const rows = customers.map(c => [
    c.id,
    c.name,
    c.email || 'N/A',
    c.phone || 'N/A',
    c.balance,
    new Date(c.createdAt).toLocaleString()
  ]);

  downloadCSV(`${businessName}_customers_accounts_${new Date().toISOString().split('T')[0]}`, headers, rows);
}

/**
 * Export Business Operating Expenses Ledger
 */
export function exportExpensesToCSV(expenses: Expense[], businessName: string) {
  const headers = [
    'Expense ID',
    'Operating Date',
    'Expense Category',
    'Amount Outlay ($)',
    'Payment Channel',
    'Usage Description',
    'Recorded Timestamp'
  ];

  const rows = expenses.map(e => [
    e.id,
    e.date,
    e.category,
    e.amount,
    e.paymentMethod.toUpperCase(),
    e.description,
    new Date(e.createdAt).toLocaleString()
  ]);

  downloadCSV(`${businessName}_expenses_ledger_${new Date().toISOString().split('T')[0]}`, headers, rows);
}

/**
 * Export Activity logs audit trails
 */
export function exportLogsToCSV(logs: ActivityLog[], businessName: string) {
  const headers = [
    'Log Entry ID',
    'Timestamp Date',
    'Operator Username',
    'Workspace Action',
    'Detailed Audit Log'
  ];

  const rows = logs.map(l => [
    l.id,
    new Date(l.createdAt).toLocaleString(),
    l.userName,
    l.action,
    l.details
  ]);

  downloadCSV(`${businessName}_workspace_logs_${new Date().toISOString().split('T')[0]}`, headers, rows);
}
