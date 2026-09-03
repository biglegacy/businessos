import React, { useState } from 'react';
import { 
  ShoppingCart, Barcode, PlusCircle, Package, Truck, ShoppingBag, 
  Users, FileText, DollarSign, Calendar, Scissors, Shirt, Sparkles, 
  Utensils, ChefHat, Receipt, AlertCircle, Clock, ShieldCheck, Box, 
  Layers, ChevronRight, CheckCircle2, ArrowUpRight, Zap
} from 'lucide-react';
import { Business } from '../types';

interface QuickActionPathwaysProps {
  business: Business;
  onNavigate: (tab: string) => void;
  onTriggerAction?: (actionKey: string) => void;
}

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  targetTab?: string;
  actionKey?: string;
  description?: string;
}

export const QuickActionPathways: React.FC<QuickActionPathwaysProps> = ({
  business,
  onNavigate,
  onTriggerAction
}) => {
  const [activePipelineStep, setActivePipelineStep] = useState<string | null>(null);

  const category = (business.category || business.businessType || 'General Enterprise').trim();

  // Helper to resolve pathways per business type
  const getActionPathways = (): { title: string; subtitle: string; actions: ActionItem[]; pipeline?: string[] } => {
    const catLower = category.toLowerCase();

    if (catLower.includes('supermarket')) {
      return {
        title: 'Supermarket Operations Pathway',
        subtitle: 'High-speed checkout, barcode scanning & bulk inventory actions',
        actions: [
          { id: 'pos', label: 'New Sale (POS)', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
          { id: 'scan', label: 'Scan Barcode', icon: <Barcode className="h-5 w-5" />, color: 'bg-indigo-600 text-white', actionKey: 'scan_barcode', targetTab: 'POS' },
          { id: 'add_product', label: 'Add Product', icon: <PlusCircle className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'Products' },
          { id: 'inventory', label: 'Manage Inventory', icon: <Package className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Inventory' },
          { id: 'receive_stock', label: 'Receive Stock', icon: <Truck className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Inventory' },
          { id: 'view_sales', label: 'View Sales', icon: <Receipt className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'Sales' },
          { id: 'low_stock', label: 'Low Stock Items', icon: <AlertCircle className="h-5 w-5" />, color: 'bg-rose-600 text-white', targetTab: 'Products' },
          { id: 'customers', label: 'Customer Records', icon: <Users className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Customers' }
        ]
      };
    }

    if (catLower.includes('grocery')) {
      return {
        title: 'Grocery Store Quick Pathways',
        subtitle: 'Fresh produce, fast sales, supplier restocking & expense entries',
        actions: [
          { id: 'pos', label: 'New Sale', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
          { id: 'add_grocery', label: 'Add Grocery Item', icon: <PlusCircle className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'Products' },
          { id: 'stock_update', label: 'Stock Update', icon: <Package className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Inventory' },
          { id: 'suppliers', label: 'Supplier Orders', icon: <Truck className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Suppliers' },
          { id: 'customers', label: 'Customer Records', icon: <Users className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Customers' },
          { id: 'reports', label: 'Sales Report', icon: <FileText className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'Reports' },
          { id: 'expenses', label: 'Expense Entry', icon: <DollarSign className="h-5 w-5" />, color: 'bg-rose-600 text-white', targetTab: 'Expenses' }
        ]
      };
    }

    if (catLower.includes('phone')) {
      return {
        title: 'Phone Shop Quick Pathways',
        subtitle: 'IMEI scanning, devices, accessories & warranty registration',
        actions: [
          { id: 'pos', label: 'New Sale', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
          { id: 'add_phone', label: 'Add Phone Device', icon: <Box className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'Products' },
          { id: 'scan_imei', label: 'Scan IMEI', icon: <Barcode className="h-5 w-5" />, color: 'bg-indigo-600 text-white', actionKey: 'scan_imei', targetTab: 'POS' },
          { id: 'accessories', label: 'Add Accessories', icon: <Layers className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'Products' },
          { id: 'stock', label: 'Check Stock', icon: <Package className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Inventory' },
          { id: 'customers', label: 'Customer Records', icon: <Users className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Customers' },
          { id: 'warranty', label: 'Warranty Tracking', icon: <ShieldCheck className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Returns' }
        ]
      };
    }

    if (catLower.includes('electronics')) {
      return {
        title: 'Electronics Shop Operations',
        subtitle: 'Serial logs, supplier management & warranty tracking',
        actions: [
          { id: 'pos', label: 'New Sale', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
          { id: 'add_elec', label: 'Add Electronics Product', icon: <PlusCircle className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'Products' },
          { id: 'inventory', label: 'Inventory Check', icon: <Package className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Inventory' },
          { id: 'warranty', label: 'Warranty Records', icon: <ShieldCheck className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Returns' },
          { id: 'suppliers', label: 'Supplier Management', icon: <Truck className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Suppliers' },
          { id: 'reports', label: 'Sales Report', icon: <FileText className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'Reports' }
        ]
      };
    }

    if (catLower.includes('fashion') || catLower.includes('boutique')) {
      return {
        title: 'Fashion & Boutique Pathways',
        subtitle: 'Sizes, colors, clothing lines & customer VIP logs',
        actions: [
          { id: 'pos', label: 'New Sale', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
          { id: 'add_clothing', label: 'Add Clothing Item', icon: <Shirt className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Products' },
          { id: 'sizes', label: 'Manage Sizes', icon: <Layers className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Products' },
          { id: 'colors', label: 'Manage Colors', icon: <Sparkles className="h-5 w-5" />, color: 'bg-pink-600 text-white', targetTab: 'Products' },
          { id: 'stock', label: 'Stock Update', icon: <Package className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Inventory' },
          { id: 'customers', label: 'Customer Records', icon: <Users className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'Customers' },
          { id: 'reports', label: 'Sales Report', icon: <FileText className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Reports' }
        ]
      };
    }

    if (catLower.includes('pharmacy') || catLower.includes('health')) {
      return {
        title: 'Pharmacy & Health Pathways',
        subtitle: 'Medicine logs, expiry alerts, batch numbers & prescription sales',
        actions: [
          { id: 'pos', label: 'New Sale', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
          { id: 'add_med', label: 'Add Medicine', icon: <PlusCircle className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'Products' },
          { id: 'expiry', label: 'Check Expiry Dates', icon: <Clock className="h-5 w-5" />, color: 'bg-rose-600 text-white', targetTab: 'Products' },
          { id: 'batch', label: 'Batch Management', icon: <Box className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Inventory' },
          { id: 'stock_alert', label: 'Stock Alert', icon: <AlertCircle className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Products' },
          { id: 'suppliers', label: 'Supplier Management', icon: <Truck className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Suppliers' },
          { id: 'reports', label: 'Sales Report', icon: <FileText className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'Reports' }
        ]
      };
    }

    if (catLower.includes('restaurant') || catLower.includes('food') || catLower.includes('fast food')) {
      return {
        title: 'Restaurant & Food Pathways',
        subtitle: 'KDS kitchen orders, table menus, ingredient stocks & quick billing',
        actions: [
          { id: 'new_order', label: 'New Order', icon: <Utensils className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
          { id: 'pos', label: 'Restaurant POS', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'POS' },
          { id: 'menu', label: 'Manage Menu', icon: <Receipt className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Products' },
          { id: 'kds', label: 'Kitchen Orders', icon: <ChefHat className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Kitchen KDS' },
          { id: 'ingredients', label: 'Add Ingredient Stock', icon: <Package className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Inventory' },
          { id: 'reports', label: 'Sales Report', icon: <FileText className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Reports' },
          { id: 'expenses', label: 'Expense Entry', icon: <DollarSign className="h-5 w-5" />, color: 'bg-rose-600 text-white', targetTab: 'Expenses' }
        ]
      };
    }

    if (catLower.includes('hardware')) {
      return {
        title: 'Hardware Store Operations',
        subtitle: 'Building supplies, bulk items, contractor customer logs & suppliers',
        actions: [
          { id: 'pos', label: 'New Sale', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
          { id: 'add_hw', label: 'Add Hardware Item', icon: <PlusCircle className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'Products' },
          { id: 'stock', label: 'Stock Management', icon: <Package className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Inventory' },
          { id: 'suppliers', label: 'Supplier Orders', icon: <Truck className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Suppliers' },
          { id: 'reports', label: 'Inventory Report', icon: <FileText className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'Reports' },
          { id: 'customers', label: 'Customer Records', icon: <Users className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Customers' }
        ]
      };
    }

    if (catLower.includes('salon') || catLower.includes('barber')) {
      return {
        title: 'Salon & Barbers Quick Pathways',
        subtitle: 'Appointments, client styling logs, grooming product sales & revenue',
        actions: [
          { id: 'new_customer', label: 'New Customer', icon: <Users className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'Customers' },
          { id: 'appointment', label: 'Book Appointment', icon: <Calendar className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Dashboard' },
          { id: 'add_service', label: 'Add Service', icon: <Scissors className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Products' },
          { id: 'record_payment', label: 'Record Payment', icon: <DollarSign className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'POS' },
          { id: 'prod_sales', label: 'Product Sales', icon: <ShoppingBag className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'POS' },
          { id: 'history', label: 'Customer History', icon: <Receipt className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Customers' },
          { id: 'reports', label: 'Revenue Report', icon: <FileText className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Reports' }
        ]
      };
    }

    if (catLower.includes('laundry')) {
      return {
        title: 'Laundry Services Operations & Pipeline',
        subtitle: 'Order tracking, garment stage management & client pickup receipts',
        pipeline: ['Received', 'Washing', 'Drying', 'Ironing', 'Ready for Pickup', 'Delivered'],
        actions: [
          { id: 'new_order', label: 'New Laundry Order', icon: <Shirt className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Laundry Orders' },
          { id: 'add_cust', label: 'Add Customer', icon: <Users className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'Customers' },
          { id: 'status', label: 'Update Laundry Status', icon: <Clock className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Laundry Orders' },
          { id: 'payment', label: 'Receive Payment', icon: <DollarSign className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'POS' },
          { id: 'receipt', label: 'Print Receipt', icon: <Receipt className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Sales' },
          { id: 'pending', label: 'Pending Orders', icon: <Layers className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Laundry Orders' },
          { id: 'delivery', label: 'Delivery Tracking', icon: <Truck className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'Laundry Orders' }
        ]
      };
    }

    if (catLower.includes('professional') || catLower.includes('services')) {
      return {
        title: 'Professional Services Pathways',
        subtitle: 'Client billing, invoices, consultation schedules & financial reports',
        actions: [
          { id: 'client', label: 'New Client', icon: <Users className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'Customers' },
          { id: 'invoice', label: 'Create Invoice', icon: <Receipt className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'POS' },
          { id: 'payment', label: 'Record Payment', icon: <DollarSign className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'POS' },
          { id: 'schedule', label: 'Schedule Appointment', icon: <Calendar className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Dashboard' },
          { id: 'services', label: 'Manage Services', icon: <Layers className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Products' },
          { id: 'expenses', label: 'Expense Entry', icon: <DollarSign className="h-5 w-5" />, color: 'bg-rose-600 text-white', targetTab: 'Expenses' },
          { id: 'financial', label: 'Financial Report', icon: <FileText className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Reports' }
        ]
      };
    }

    if (catLower.includes('water') || catLower.includes('drinks') || catLower.includes('distribution')) {
      return {
        title: 'Water & Drinks Distribution Pathways',
        subtitle: 'Crate tracking, bulk delivery routes, customer orders & bottle deposits',
        actions: [
          { id: 'pos', label: 'New Sale', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
          { id: 'delivery', label: 'Record Delivery', icon: <Truck className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'Sales' },
          { id: 'add_water', label: 'Add Water/Drink Product', icon: <PlusCircle className="h-5 w-5" />, color: 'bg-teal-600 text-white', targetTab: 'Products' },
          { id: 'stock', label: 'Manage Stock', icon: <Package className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Inventory' },
          { id: 'crates', label: 'Track Crates/Bottles', icon: <Box className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Inventory' },
          { id: 'orders', label: 'Customer Orders', icon: <Receipt className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Sales' },
          { id: 'suppliers', label: 'Supplier Management', icon: <Truck className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Suppliers' },
          { id: 'reports', label: 'Sales Report', icon: <FileText className="h-5 w-5" />, color: 'bg-rose-600 text-white', targetTab: 'Reports' }
        ]
      };
    }

    // Default: General Enterprise
    return {
      title: 'General Enterprise Operations Pathway',
      subtitle: 'Universal shortcuts for sales, inventory, customers, suppliers & accounting',
      actions: [
        { id: 'pos', label: 'New Sale', icon: <ShoppingCart className="h-5 w-5" />, color: 'bg-emerald-600 text-white', targetTab: 'POS' },
        { id: 'add_item', label: 'Add Product/Service', icon: <PlusCircle className="h-5 w-5" />, color: 'bg-blue-600 text-white', targetTab: 'Products' },
        { id: 'inventory', label: 'Inventory', icon: <Package className="h-5 w-5" />, color: 'bg-slate-700 text-white', targetTab: 'Inventory' },
        { id: 'customers', label: 'Customer Management', icon: <Users className="h-5 w-5" />, color: 'bg-purple-600 text-white', targetTab: 'Customers' },
        { id: 'suppliers', label: 'Supplier Management', icon: <Truck className="h-5 w-5" />, color: 'bg-indigo-600 text-white', targetTab: 'Suppliers' },
        { id: 'expenses', label: 'Expense Entry', icon: <DollarSign className="h-5 w-5" />, color: 'bg-rose-600 text-white', targetTab: 'Expenses' },
        { id: 'reports', label: 'Reports', icon: <FileText className="h-5 w-5" />, color: 'bg-amber-600 text-white', targetTab: 'Reports' }
      ]
    };
  };

  const pathwayData = getActionPathways();

  const handleActionClick = (item: ActionItem) => {
    if (item.actionKey && onTriggerAction) {
      onTriggerAction(item.actionKey);
    }
    if (item.targetTab) {
      onNavigate(item.targetTab);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
            <Zap className="h-3 w-3 text-emerald-600 fill-emerald-600" /> Quick Action Pathways
          </div>
          <h2 className="text-lg font-black text-slate-800 mt-1 tracking-tight">{pathwayData.title}</h2>
          <p className="text-xs text-slate-500">{pathwayData.subtitle}</p>
        </div>
        <div className="text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 self-start sm:self-auto">
          Business Category: <span className="text-slate-800">{category}</span>
        </div>
      </div>

      {/* Laundry Status Pathway Visualizer if Laundry */}
      {pathwayData.pipeline && (
        <div className="p-3 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-blue-50/70 rounded-2xl border border-indigo-100/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
            <span className="flex items-center gap-1.5">
              <Shirt className="h-4 w-4 text-indigo-600" /> Laundry Order Status Pipeline
            </span>
            <span className="text-[10px] text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Automatic Workflow
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
            {pathwayData.pipeline.map((step, idx) => (
              <button
                key={step}
                onClick={() => {
                  setActivePipelineStep(step);
                  onNavigate('Laundry Orders');
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  activePipelineStep === step 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-[1.02]' 
                    : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold ${activePipelineStep === step ? 'text-indigo-200' : 'text-slate-400'}`}>
                    0{idx + 1}
                  </span>
                  <ChevronRight className={`h-3 w-3 ${activePipelineStep === step ? 'text-white' : 'text-slate-300'}`} />
                </div>
                <span className="font-extrabold text-xs mt-1 leading-tight">{step}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid of Large Quick Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {pathwayData.actions.map((item) => (
          <button
            key={item.id}
            onClick={() => handleActionClick(item)}
            className="group relative p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-center text-center justify-between cursor-pointer min-h-[90px]"
          >
            <div className={`p-2.5 rounded-xl ${item.color} shadow-sm group-hover:scale-110 transition-transform mb-2`}>
              {item.icon}
            </div>
            <span className="font-bold text-xs text-slate-800 group-hover:text-emerald-800 transition-colors leading-tight">
              {item.label}
            </span>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
