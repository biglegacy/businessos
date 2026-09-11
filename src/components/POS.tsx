/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { isProductBasedBusiness } from '../lib/businessType';
import { Product, Service, CartItem, Customer, Sale, Business, User, ProfessionalServiceJob } from '../types';
import { notifyNewSale, notifyLowStock } from '../lib/pushNotifications';
import { showSuccess, showError } from '../lib/toast';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, Percent, 
  DollarSign, Check, FileText, X, Sparkles, Building, UserCheck,
  Calendar, Phone, User as UserIcon, Clock, ClipboardList, CheckCircle, AlertCircle, RefreshCw,
  Settings as SettingsIcon, Edit2, Trash, QrCode, Camera, Package, Send, Loader2
} from 'lucide-react';
import { MobileScanner } from './MobileScanner';
import { InAppMobileScannerModal } from './InAppMobileScannerModal';

interface POSProps {
  business: Business;
  user: User;
  onSaleComplete: () => void;
  branchId?: string;
}

export function POS({ business, user, onSaleComplete, branchId }: POSProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mobilePosTab, setMobilePosTab] = useState<'catalog' | 'cart'>('catalog');
  
  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [checkoutCustomerPhone, setCheckoutCustomerPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile' | 'other'>('cash');
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  
  // Checkout status / Active Invoice Receipt
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);
  const [isReceiptCustomizing, setIsReceiptCustomizing] = useState(false);
  const [smsReceiptPhone, setSmsReceiptPhone] = useState('');
  const [isSendingSmsReceipt, setIsSendingSmsReceipt] = useState(false);
  const [smsReceiptStatus, setSmsReceiptStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Local reload trigger for catalog template updates
  const [localReloadKey, setLocalReloadKey] = useState(0);

  // Mobile Barcode Scanner States
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [activeScannerSessionId, setActiveScannerSessionId] = useState<string | null>(null);
  const [isMobileScannerActive, setIsMobileScannerActive] = useState<boolean>(false);

  const handleOpenMobileScanner = () => {
    setIsScannerModalOpen(true);
  };

  // Active Remote Mobile Scanner Background Listener
  useEffect(() => {
    if (!activeScannerSessionId) return;

    const interval = setInterval(() => {
      // 1. Check for scanned items from mobile phone
      const items = db.getScannedItemsForSession(business.id, activeScannerSessionId);
      if (items.length > 0) {
        items.forEach(payload => {
          const barcode = payload.barcode.trim();
          if (!barcode) return;

          const products = db.getProducts(business.id);
          const services = db.getServices(business.id);

          const matchedProd = products.find(p => p.barcode === barcode || p.id === barcode);
          const matchedServ = services.find(s => s.code === barcode || s.id === barcode);

          if (matchedProd) {
            addToCart(matchedProd, 'product');
            showSuccess('Mobile Scanner Item Added', `${matchedProd.name} added to cart`);
          } else if (matchedServ) {
            addToCart(matchedServ, 'service');
            showSuccess('Mobile Scanner Item Added', `${matchedServ.name} added to cart`);
          } else {
            showError('Barcode Not Found', `Barcode ${barcode} not in inventory`);
          }
        });
        db.clearScannedItemsForSession(business.id, activeScannerSessionId);
      }

      // 2. Check for remote print requests from mobile phone
      const printCmds = db.getPrintCommandsForSession(business.id, activeScannerSessionId);
      if (printCmds.length > 0) {
        showSuccess('Remote Print Request', 'Printing sale receipt on desktop printer...');
        handlePrintSaleReceipt();
        db.clearPrintCommandsForSession(business.id, activeScannerSessionId);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [activeScannerSessionId, business.id]);


  // Toggle tab for left column if business is services: 'catalog' vs 'products' vs 'activeJobs'
  const [leftTab, setLeftTab] = useState<'catalog' | 'products' | 'activeJobs'>('catalog');

  // Service job registration modal state
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);

  // Service Template Catalog Manager States
  const [isCatalogManagerOpen, setIsCatalogManagerOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formTemplateName, setFormTemplateName] = useState('');
  const [formTemplateDesc, setFormTemplateDesc] = useState('');
  const [formTemplateCat, setFormTemplateCat] = useState('Consultation');
  const [formTemplatePrice, setFormTemplatePrice] = useState<number | ''>('');

  const handleSaveCatalogService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTemplateName || formTemplatePrice === '') {
      alert('Please fill in Name and Price.');
      return;
    }

    const template: Service = {
      id: editingTemplateId || 's-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: formTemplateName,
      description: formTemplateDesc,
      category: formTemplateCat,
      price: Number(formTemplatePrice),
      updatedAt: new Date().toISOString()
    };

    db.saveService(business.id, template);

    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: editingTemplateId ? 'Service Package Updated' : 'Service Package Created',
      details: `${editingTemplateId ? 'Updated' : 'Created'} catalog service "${formTemplateName}" with price ${formatCurrency(Number(formTemplatePrice), business.currency)}`
    });

    // Reset template form
    setEditingTemplateId(null);
    setFormTemplateName('');
    setFormTemplateDesc('');
    setFormTemplateCat('Consultation');
    setFormTemplatePrice('');
    setLocalReloadKey(prev => prev + 1);
  };

  const handleEditTemplate = (s: Service) => {
    setEditingTemplateId(s.id);
    setFormTemplateName(s.name);
    setFormTemplateDesc(s.description || '');
    setFormTemplateCat(s.category || 'Consultation');
    setFormTemplatePrice(s.price);
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the service template for "${name}"?`)) {
      db.deleteService(business.id, id);
      db.addActivityLog(business.id, {
        userId: user.id,
        userName: user.name,
        action: 'Service Package Deleted',
        details: `Deleted catalog service template "${name}".`
      });
      if (editingTemplateId === id) {
        setEditingTemplateId(null);
        setFormTemplateName('');
        setFormTemplateDesc('');
        setFormTemplatePrice('');
      }
      setLocalReloadKey(prev => prev + 1);
    }
  };

  // Form states for service registration
  const [formCustName, setFormCustName] = useState('');
  const [formCustPhone, setFormCustPhone] = useState('');
  const [formServiceName, setFormServiceName] = useState('');
  const [formServiceDesc, setFormServiceDesc] = useState('');
  const [formServiceCat, setFormServiceCat] = useState('Consultation');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formServicePrice, setFormServicePrice] = useState<number | ''>('');
  const [formServiceDate, setFormServiceDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [formExpectedComplete, setFormExpectedComplete] = useState('');
  const [formCustNotes, setFormCustNotes] = useState('');
  const [formBranchId, setFormBranchId] = useState('');

  const resetServiceForm = (preFilledService?: Service) => {
    setFormCustName('');
    setFormCustPhone('');
    setFormServiceName(preFilledService?.name || '');
    setFormServiceDesc(preFilledService?.description || '');
    setFormServiceCat(preFilledService?.category || 'Consultation');
    setFormServicePrice(preFilledService?.price !== undefined ? preFilledService.price : '');
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setFormServiceDate(now.toISOString().slice(0, 16));
    setFormExpectedComplete('');
    setFormCustNotes('');
    
    const emps = db.getUsers().filter(u => u.businessId === business.id);
    setFormEmployeeId(emps[0]?.id || '');

    const activeBranch = (branchId && branchId !== 'All') ? branchId : (user.branchId || emps[0]?.branchId || '');
    setFormBranchId(activeBranch);
  };

  // Form states for receipt customization
  const [recName, setRecName] = useState(business.receiptConfig.businessName || business.name);
  const [recContact, setRecContact] = useState(business.receiptConfig.contactInfo || business.phone);
  const [recFooter, setRecFooter] = useState(business.receiptConfig.footerMessage || 'Thank you for your business!');
  const [recLayout, setRecLayout] = useState<'standard' | 'compact' | 'elegant'>(business.receiptConfig.layout || 'standard');

  const isServiceCategory = business.category === 'Professional Services' || business.category === 'Beauty & Wellness';

  const rawProducts = db.getProducts(business.id);
  const products = rawProducts.filter(p => !branchId || branchId === 'All' || p.branchId === branchId);
  const services = db.getServices(business.id);
  const customers = db.getCustomers(business.id);

  // Fetch professional service jobs synchronously
  const rawServiceJobs = db.getServiceJobs(business.id);
  const serviceJobs = rawServiceJobs.filter(j => !branchId || branchId === 'All' || j.branchId === branchId);
  const pendingJobs = serviceJobs.filter(j => j.status === 'pending');

  // Get distinct categories
  const categories = ['All', ...Array.from(new Set([
    ...products.map(p => p.category).filter(Boolean),
    ...services.map(s => s.category).filter(Boolean)
  ]))];

  // Filter lists based on search & category pill
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                        p.barcode.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const filteredServices = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'All' || s.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const addToCart = (item: Product | Service, type: 'product' | 'service') => {
    if (isServiceCategory && type === 'service') {
      resetServiceForm(item as Service);
      setIsServiceFormOpen(true);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === type);
      if (existing) {
        // Validation check for products stock
        if (type === 'product') {
          const maxStock = (item as Product).stockQuantity;
          if (existing.quantity >= maxStock) {
            alert(`Stock limit reached! Gourmet inventory only contains ${maxStock} units of "${item.name}".`);
            return prev;
          }
        }
        return prev.map(i => i.id === item.id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, {
          id: item.id,
          name: item.name,
          type,
          price: type === 'product' ? (item as Product).sellingPrice : (item as Service).price,
          quantity: 1,
          stockLimit: type === 'product' ? (item as Product).stockQuantity : undefined,
          imageUrl: type === 'product' ? (item as Product).imageUrl : undefined,
          taxRate: item.taxRate
        }];
      }
    });
  };

  const handleRegisterServiceJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustName.trim() || !formServiceName.trim() || formServicePrice === '') {
      alert("Please fill out all required fields: Customer Name, Service Name, and Service Price.");
      return;
    }

    const emps = db.getUsers().filter(u => u.businessId === business.id);
    const emp = emps.find(u => u.id === formEmployeeId);

    const newJob: ProfessionalServiceJob = {
      id: 'SRV-' + Math.floor(Math.random() * 900000 + 100000),
      businessId: business.id,
      branchId: formBranchId || undefined,
      customerName: formCustName,
      customerPhone: formCustPhone,
      serviceName: formServiceName,
      serviceDescription: formServiceDesc,
      serviceCategory: formServiceCat,
      assignedEmployeeId: formEmployeeId,
      assignedEmployeeName: emp ? emp.name : 'Unassigned',
      servicePrice: Number(formServicePrice),
      startDate: formServiceDate,
      expectedCompletionDate: formExpectedComplete || undefined,
      customerNotes: formCustNotes,
      paymentMethod: 'cash',
      paymentStatus: 'unpaid',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    db.saveServiceJob(business.id, newJob);

    // Add activity log
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'Professional Service Job Registered',
      moduleAffected: 'POS',
      itemAffected: `Job #${newJob.id}`,
      previousValue: '',
      newValue: 'pending',
      details: `Registered pending service "${newJob.serviceName}" for customer ${newJob.customerName}. Price: ${formatCurrency(newJob.servicePrice, business.currency)}.`,
      branchId: user.branchId
    });

    setIsServiceFormOpen(false);
    resetServiceForm();
    setLeftTab('activeJobs'); // Automatically switch to Active Jobs Tracker to see the pending job!
    setLocalReloadKey(prev => prev + 1);
    alert(`Service registered successfully! Status is set to Pending.`);
  };

  const handleCompleteJob = (job: ProfessionalServiceJob) => {
    const updatedJob: ProfessionalServiceJob = {
      ...job,
      status: 'completed',
      completedAt: new Date().toISOString()
    };
    db.saveServiceJob(business.id, updatedJob);

    // Automatically add the completed service to the live POS receipt preview (cart)
    setCart(prev => {
      // Check if this job is already in the cart to avoid duplicates
      const existing = prev.find(item => item.jobId === job.id);
      if (existing) return prev;
      
      return [...prev, {
        id: job.id, // we use job.id as cart item id
        name: `${job.serviceName} (${job.customerName})`,
        type: 'service',
        price: job.servicePrice,
        quantity: 1,
        jobId: job.id
      }];
    });

    // Add activity log
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'Professional Service Completed',
      moduleAffected: 'POS',
      itemAffected: `Job #${job.id}`,
      previousValue: 'pending',
      newValue: 'completed',
      details: `Service "${job.serviceName}" completed for customer ${job.customerName}. Price: ${formatCurrency(job.servicePrice, business.currency)}.`,
      branchId: user.branchId
    });

    setLocalReloadKey(prev => prev + 1);
    alert(`Service job completed successfully! Added to the receipt preview.`);
  };

  const updateQty = (id: string, type: 'product' | 'service', delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id && item.type === type) {
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (item.stockLimit !== undefined && nextQty > item.stockLimit) {
            alert(`Stock limit reached! Gourmet inventory only has ${item.stockLimit} of this item.`);
            return item;
          }
          return { ...item, quantity: nextQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const handleManualQtyChange = (id: string, type: 'product' | 'service', val: number) => {
    if (isNaN(val) || val <= 0) {
      return;
    }
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id && item.type === type) {
          if (type === 'product' && item.stockLimit !== undefined && val > item.stockLimit) {
            alert(`Stock limit reached! Available inventory only has ${item.stockLimit} of this item.`);
            return item;
          }
          return { ...item, quantity: val };
        }
        return item;
      });
    });
  };

  const removeFromCart = (id: string, type: 'product' | 'service') => {
    setCart(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const getCartTotals = () => {
    const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const discount = (subtotal * discountPercent) / 100;
    const taxableSubtotal = subtotal - discount;
    const totalTax = cart.reduce((acc, curr) => {
      if (!curr.taxRate) return acc;
      const itemSub = curr.price * curr.quantity;
      const itemDiscounted = subtotal > 0 ? itemSub * (1 - discountPercent / 100) : itemSub;
      return acc + (itemDiscounted * curr.taxRate) / 100;
    }, 0);
    const total = taxableSubtotal + totalTax;
    return { subtotal, discount, totalTax, total };
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty.');
      return;
    }

    if (isServiceCategory) {
      const uncompletedItem = cart.find(i => i.type === 'service' && !i.jobId);
      if (uncompletedItem) {
        alert("Checkout Blocked: All services in the ticket must be registered and completed through the Active Services Tracking Panel before checkout.");
        return;
      }
    }

    const { subtotal, discount, totalTax, total } = getCartTotals();

    if (paymentMethod === 'cash') {
      if (amountReceived === '' || amountReceived < total) {
        alert(`Checkout Blocked: Please enter a valid cash Amount Received greater than or equal to the total due of ${formatCurrency(total, business.currency)}.`);
        return;
      }
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    const targetPhone = checkoutCustomerPhone.trim() || customer?.phone || undefined;
    const activeSaleBranchId = (branchId && branchId !== 'All') ? branchId : (user.branchId || undefined);

    const newSale: Sale = {
      id: 's-tr' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      branchId: activeSaleBranchId, // Set branchId on the Sale
      items: cart.map(i => ({
        itemId: i.id,
        name: i.name,
        type: i.type,
        price: i.price,
        quantity: i.quantity
      })),
      subtotal,
      discount,
      total,
      paymentMethod,
      amountReceived: paymentMethod === 'cash' ? Number(amountReceived) : undefined,
      change: paymentMethod === 'cash' ? (Number(amountReceived) - total) : undefined,
      customerId: customer?.id,
      customerName: customer?.name,
      customerPhone: targetPhone,
      employeeId: user.id,
      employeeName: user.name,
      createdAt: new Date().toISOString(),
      status: 'completed',
      currency: business.currency || 'GHC'
    };

    // Save sale to dynamic cloud store
    db.saveSale(business.id, newSale);

    // Dispatch real-time push notification for new sale
    notifyNewSale(business.id, {
      receiptNumber: newSale.id.slice(-6).toUpperCase(),
      totalAmount: total,
      itemCount: cart.reduce((acc, item) => acc + item.quantity, 0)
    });

    // Automatically trigger Arkesel SMS Receipt dispatch in background if phone was supplied
    if (targetPhone) {
      const itemsSummary = newSale.items.map(i => `${i.quantity}x ${i.name}`).slice(0, 3).join(', ');
      const msg = `${business.name}: Receipt #${newSale.id.slice(-6).toUpperCase()} confirmed! Items: ${itemsSummary}. Total: ${formatCurrency(newSale.total, newSale.currency || business.currency)}. Thank you for your patronage!`;
      setIsSendingSmsReceipt(true);
      db.sendSms({
        recipient: targetPhone,
        message: msg,
        businessId: business.id,
        type: 'receipt'
      }).then(res => {
        if (res.success) {
          setSmsReceiptStatus({ success: true, message: `Receipt SMS sent successfully to ${targetPhone}.` });
        } else {
          setSmsReceiptStatus({ success: false, message: res.message || 'Unable to deliver SMS receipt.' });
        }
      }).catch(err => {
        console.warn('SMS dispatch background notice:', err);
        setSmsReceiptStatus({ success: false, message: err?.message || 'Network error sending SMS.' });
      }).finally(() => {
        setIsSendingSmsReceipt(false);
      });
    }

    // Decrement stock levels for products in cart in real-time
    cart.forEach(item => {
      if (item.type === 'product') {
        const matchingProduct = rawProducts.find(p => p.id === item.id);
        if (matchingProduct) {
          const nextStock = Math.max(0, matchingProduct.stockQuantity - item.quantity);
          const updatedProduct = {
            ...matchingProduct,
            stockQuantity: nextStock,
            updatedAt: new Date().toISOString()
          };
          db.saveProduct(business.id, updatedProduct);

          // Trigger low stock push notification if threshold reached
          const threshold = typeof updatedProduct.lowStockThreshold === 'number' ? updatedProduct.lowStockThreshold : 5;
          if (nextStock <= threshold) {
            notifyLowStock(business.id, {
              name: updatedProduct.name,
              currentQuantity: nextStock,
              minThreshold: threshold
            });
          }
        }
      }
    });

    // If customer had pre-existing balance tab or paid via store credit, update customer
    if (customer && customer.balance > 0 && paymentMethod === 'other') {
      db.saveCustomer(business.id, {
        ...customer,
        balance: Math.max(0, customer.balance - total)
      });
    }

    // Add activity log
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'POS Transaction Completed',
      moduleAffected: 'Sales',
      itemAffected: `Sale #${newSale.id}`,
      previousValue: '',
      newValue: `Total: ${formatCurrency(total, business.currency)}`,
      details: `Completed transaction ${newSale.id} totaling ${formatCurrency(total, business.currency)} using ${paymentMethod}.`,
      branchId: user.branchId
    });

    setCreatedSale(newSale);
    setSmsReceiptPhone(targetPhone || '');
    setCart([]);
    setAmountReceived('');
    setDiscountPercent(0);
    setSelectedCustomerId('');
    setCheckoutCustomerPhone('');
    alert('POS sale completed successfully! Invoice receipt generated.');
    onSaleComplete();
  };

  const handleSendSmsReceipt = async () => {
    if (!createdSale) return;
    const phone = smsReceiptPhone.trim() || customers.find(c => c.id === createdSale.customerId)?.phone;
    if (!phone) {
      alert('Please enter a recipient phone number (e.g. 0244123456).');
      return;
    }

    setIsSendingSmsReceipt(true);
    setSmsReceiptStatus(null);
    try {
      const itemsSummary = createdSale.items.map(i => `${i.quantity}x ${i.name}`).slice(0, 3).join(', ');
      const msg = `${business.name}: Receipt #${createdSale.id.slice(-6).toUpperCase()} confirmed! Items: ${itemsSummary}. Total: ${formatCurrency(createdSale.total, createdSale.currency || business.currency)}. Thank you for your patronage!`;
      
      const res = await db.sendSms({
        recipient: phone,
        message: msg,
        businessId: business.id,
        type: 'receipt'
      });

      if (res.success) {
        setSmsReceiptStatus({ success: true, message: `Receipt SMS sent successfully to ${phone}.` });
      } else {
        setSmsReceiptStatus({ success: false, message: res.message || 'Unable to deliver SMS receipt.' });
      }
    } catch (err: any) {
      setSmsReceiptStatus({ success: false, message: err?.message || 'Network error sending SMS.' });
    } finally {
      setIsSendingSmsReceipt(false);
    }
  };

  const handleUpdateReceiptConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBusiness: Business = {
      ...business,
      receiptConfig: {
        businessName: recName,
        contactInfo: recContact,
        footerMessage: recFooter,
        layout: recLayout
      }
    };
    db.saveBusiness(updatedBusiness);
    setIsReceiptCustomizing(false);
    alert('Receipt customization saved to Cloud Business settings!');
  };

  const handlePrintSaleReceipt = () => {
    if (!createdSale) return;
    const printers = db.getPrinterSettings(business.id);
    const receiptPrinter = printers.find(p => p.isDefault && p.printerType !== 'Kitchen Printer') || printers.find(p => p.printerType === 'Thermal Receipt Printer') || null;

    const paperSize = receiptPrinter?.paperSize || '80mm';
    const isThermal = !receiptPrinter || receiptPrinter.printerType === 'Thermal Receipt Printer' || paperSize === '58mm' || paperSize === '80mm';
    const paperWidth = paperSize === '58mm' ? '58mm' : paperSize === '80mm' ? '80mm' : '210mm'; // A4 width fallback

    // Spawn virtual loopback printing iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    // Items list representation
    const itemsHtml = createdSale.items.map(item => `
      <tr>
        <td style="padding: 4px 0;">${item.name}</td>
        <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right;">GHC ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const brandName = recName || business.name;
    const contactInfo = recContact || business.phone || '';
    const footerMsg = recFooter || 'Thank you for your business!';

    const productSubtotal = createdSale.items
      .filter(i => i.type === 'product')
      .reduce((acc, i) => acc + (i.price * i.quantity), 0);

    const serviceSubtotal = createdSale.items
      .filter(i => i.type === 'service')
      .reduce((acc, i) => acc + (i.price * i.quantity), 0);

    doc.write(`
      <html>
        <head>
          <title>Sales Invoice Receipt</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600&display=swap');
            body {
              font-family: ${isThermal ? '"JetBrains Mono", monospace' : '"Inter", sans-serif'};
              font-size: ${isThermal ? '12px' : '14px'};
              color: #000;
              margin: 0;
              padding: ${isThermal ? '10px' : '25px'};
              width: ${isThermal ? paperWidth : '100%'};
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            hr { border: 0; border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            @media print {
              @page { margin: 0; size: ${isThermal ? 'auto' : 'A4'}; }
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="center">
            <h2 style="margin: 0; font-size: ${isThermal ? '16px' : '22px'}; text-transform: uppercase;">${brandName}</h2>
            <p style="margin: 4px 0 0 0; font-size: 10px; white-space: pre-line;">${contactInfo}</p>
          </div>
          <hr />
          <div>
            <strong>Transaction ID:</strong> #${createdSale.id}<br />
            <strong>Date:</strong> ${new Date(createdSale.createdAt).toLocaleString()}<br />
            <strong>Cashier:</strong> ${createdSale.employeeName || user.name}<br />
            <strong>Customer:</strong> ${createdSale.customerName || 'Walk-in Customer'}
          </div>
          <hr />
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left;">ITEM</th>
                <th style="text-align: center;">QTY</th>
                <th style="text-align: right;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <hr />
          <div style="line-height: 1.6;">
            ${productSubtotal > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Product Subtotal:</span>
              <span>GHC ${productSubtotal.toFixed(2)}</span>
            </div>
            ` : ''}
            ${serviceSubtotal > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Service Subtotal:</span>
              <span>GHC ${serviceSubtotal.toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Total Subtotal:</span>
              <span>GHC ${createdSale.subtotal.toFixed(2)}</span>
            </div>
            ${createdSale.discount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Discount:</span>
              <span>-GHC ${createdSale.discount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${isThermal ? '13px' : '16px'}; margin-top: 4px;">
              <span>TOTAL DUE:</span>
              <span>GHC ${createdSale.total.toFixed(2)}</span>
            </div>
          </div>
          <hr />
          <div>
            <strong>Payment Mode:</strong> <span style="text-transform: uppercase;">${createdSale.paymentMethod}</span>
          </div>
          <hr />
          <div class="center" style="font-size: 10px; font-style: italic; white-space: pre-line; margin-top: 10px;">
            ${footerMsg}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (err) {}
    }, 1000);
  };

  const { subtotal, discount, totalTax, total } = getCartTotals();

  return (
    <div className="flex flex-col h-auto min-h-[calc(100vh-11rem)] lg:min-h-[calc(100vh-12rem)] font-sans">
      {/* Mobile Tab switcher (only on screens < lg) */}
      <div className="lg:hidden flex gap-2 p-1.5 bg-slate-100 rounded-2xl select-none mb-4 shrink-0">
        <button
          onClick={() => setMobilePosTab('catalog')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePosTab === 'catalog' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 font-semibold'
          }`}
        >
          Browse Catalog
        </button>
        <button
          onClick={() => setMobilePosTab('cart')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePosTab === 'cart' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-600 hover:text-slate-900 font-semibold'
          }`}
        >
          Checkout Cart {cart.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-extrabold animate-pulse">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 flex-1 min-h-0">
        {/* Left Columns: Catalog Browse */}
        <div className={`lg:col-span-2 flex flex-col min-h-0 space-y-4 ${mobilePosTab === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* Search & Add controls */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder={isServiceCategory ? "Search services by name or category..." : "Search goods & services by name or category..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isMobileScannerActive && (
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black animate-pulse shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Mobile Scanner Active</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleOpenMobileScanner}
              className="px-3.5 py-2 bg-emerald-900 hover:bg-emerald-950 text-emerald-100 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm border border-emerald-800"
            >
              <QrCode className="h-4 w-4 text-emerald-400" />
              <span>Mobile Scanner</span>
            </button>
          </div>

          {isServiceCategory && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => {
                  setEditingTemplateId(null);
                  setFormTemplateName('');
                  setFormTemplateDesc('');
                  setFormTemplatePrice('');
                  setFormTemplateCat('Consultation');
                  setIsCatalogManagerOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <SettingsIcon className="h-4 w-4" /> Manage Catalog
              </button>
              <button
                onClick={() => {
                  resetServiceForm();
                  setIsServiceFormOpen(true);
                }}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Register Booking / Job
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Category/Tab Selector */}
        {isServiceCategory ? (
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl select-none shrink-0">
            <button
              onClick={() => setLeftTab('catalog')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                leftTab === 'catalog' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              <Sparkles className="h-4 w-4" /> Services
            </button>
            <button
              onClick={() => setLeftTab('products')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                leftTab === 'products' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              <Package className="h-4 w-4" /> Physical Products
            </button>
            <button
              onClick={() => setLeftTab('activeJobs')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                leftTab === 'activeJobs' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              <ClipboardList className="h-4 w-4" /> Active Jobs Tracker
              {pendingJobs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-bounce leading-none">
                  {pendingJobs.length}
                </span>
              )}
            </button>
          </div>
        ) : (
          /* Standard Products Categories Scroller */
          <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 select-none">
            {categories.map((cat, index) => (
              <button
                key={cat || index}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Workspace Display Area */}
        {isServiceCategory && leftTab === 'activeJobs' ? (
          /* Active Services Tracking Panel */
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="flex justify-between items-center pb-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Services (Pending Work orders)</h3>
            </div>
            
            {pendingJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingJobs.map(job => (
                  <div key={job.id} className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-emerald-500 transition-all shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-9 w-14 bg-amber-500 text-white flex items-center justify-center rounded-bl-3xl opacity-90 font-mono font-bold text-[9px] uppercase tracking-wider">
                      PENDING
                    </div>

                    <div className="space-y-3.5">
                      {/* Customer Details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                          <UserIcon className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          <span>{job.customerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{job.customerPhone || 'No registered contact'}</span>
                        </div>
                      </div>

                      {/* Job Details */}
                      <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-slate-800 text-[11px] leading-tight">{job.serviceName}</h4>
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold text-[8px] uppercase tracking-wider shrink-0">
                            {job.serviceCategory}
                          </span>
                        </div>
                        {job.serviceDescription && (
                          <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 font-medium">
                            {job.serviceDescription}
                          </p>
                        )}
                      </div>

                      {/* Schedule and Assignee */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
                        <div className="flex items-center gap-1 min-w-0">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate" title={job.assignedEmployeeName}>{job.assignedEmployeeName}</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end text-right min-w-0">
                          <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{job.startDate ? new Date(job.startDate).toLocaleDateString() : 'Today'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none tracking-wider">Service Fee</span>
                        <span className="text-xs font-black text-emerald-800 font-mono">{formatCurrency(job.servicePrice, business.currency)}</span>
                      </div>

                      <button
                        onClick={() => handleCompleteJob(job)}
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" /> Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs space-y-3.5">
                <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-600">No Pending Services</p>
                  <p className="text-[10px] text-slate-400 max-w-[240px] mx-auto mt-1 leading-relaxed">All registered professional services have been completed or catalogued.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Browse Catalog Area */
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Products (Goods) */}
            {(!isServiceCategory || leftTab === 'products') && filteredProducts.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Physical Products & Retail Inventory</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredProducts.map((p, index) => {
                    const isLow = p.stockQuantity < 5;
                    const isOut = p.stockQuantity <= 0;
                    return (
                      <button
                        key={p.id || `prod-${index}`}
                        disabled={isOut}
                        onClick={() => addToCart(p, 'product')}
                        className={`bg-white p-4 rounded-3xl border text-left flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group cursor-pointer ${
                          isOut ? 'opacity-50 border-slate-200 cursor-not-allowed' : 'border-slate-200 hover:border-emerald-400'
                        }`}
                      >
                        {p.imageUrl && (
                          <div className="h-24 w-full rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 mb-3 relative">
                            <img 
                              src={p.imageUrl} 
                              alt={p.name} 
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-300" 
                              referrerPolicy="no-referrer"
                            />
                            {isOut && (
                              <span className="absolute inset-0 bg-slate-950/40 flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                                Out of Stock
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{p.category}</span>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">{p.name}</h4>
                        </div>

                        <div className="flex justify-between items-end mt-4">
                          <span className="text-sm font-bold text-blue-600">{formatCurrency(p.sellingPrice, business.currency)}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            isOut ? 'bg-red-50 text-red-700 border-red-100' : isLow ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-500 border-slate-200/60'
                          }`}>
                            Qty: {p.stockQuantity}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Services / Catalog Packages */}
            {(!isServiceCategory || leftTab === 'catalog') && filteredServices.length > 0 && (
              <div className="pt-2">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">
                  {isServiceCategory ? "Predefined Service Catalog (Templates)" : "Service Packages"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredServices.map((s, index) => (
                    <button
                      key={s.id || `serv-${index}`}
                      onClick={() => addToCart(s, 'service')}
                      className="bg-white p-4 rounded-3xl border border-slate-200 text-left flex justify-between items-start hover:shadow-md hover:border-emerald-400 transition cursor-pointer"
                    >
                      <div className="space-y-1 pr-4">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.category}</span>
                        <h4 className="text-xs font-bold text-slate-800 leading-snug">{s.name}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1 leading-normal">{s.description}</p>
                      </div>
                      <span className="text-sm font-bold text-blue-600 shrink-0">{formatCurrency(s.price, business.currency)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isServiceCategory && leftTab === 'products' && filteredProducts.length === 0 && (
              <div className="py-16 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs space-y-2">
                <p className="font-bold text-slate-600">No Physical Products Available</p>
                <p className="text-[10px] text-slate-400 max-w-[240px] mx-auto">You have not added any physical items to your inventory catalog yet. Manage inventory under Products &amp; Services.</p>
              </div>
            )}

            {isServiceCategory && leftTab === 'catalog' && filteredServices.length === 0 && (
              <div className="py-16 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs space-y-2">
                <p className="font-bold text-slate-600">No Services Catalogued</p>
                <p className="text-[10px] text-slate-400 max-w-[240px] mx-auto font-sans">No matching service packages found.</p>
              </div>
            )}

            {!isServiceCategory && filteredProducts.length === 0 && filteredServices.length === 0 && (
              <div className="py-12 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs font-sans">
                No matching products or services catalogued in this workspace.
              </div>
            )}
          </div>
        )}
      </div>

        {/* Right Column: Live Receipt Preview & Checkout */}
        <div className={`space-y-6 ${mobilePosTab === 'cart' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'} lg:col-span-1`}>
          {/* Real Thermal Receipt Paper Visual Component */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 relative overflow-hidden flex flex-col min-h-[480px] h-auto transition-all duration-300">
            {/* Top jagged/tear-off edge */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[linear-gradient(45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%)] bg-[length:12px_12px]" />

            {/* Receipt Header */}
            <header className="text-center font-mono py-4 border-b border-dashed border-slate-200">
              <h3 className="font-black text-slate-800 text-sm tracking-wide uppercase">{recName}</h3>
              <p className="text-[10px] text-slate-400 whitespace-pre-line leading-relaxed mt-1">{recContact}</p>
              <div className="text-[10px] text-slate-400 pt-1 flex justify-center gap-2 font-sans">
                <span>DATE: {new Date().toLocaleDateString()}</span>
                <span>&bull;</span>
                <span>CASHIER: {user.name}</span>
              </div>
            </header>

            {/* Clear button overlay */}
            {cart.length > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Live Invoice Preview</span>
                <button
                  onClick={() => setCart([])}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1 bg-rose-50 px-2 py-1 rounded"
                >
                  <Trash2 className="h-3 w-3" /> Clear Invoice
                </button>
              </div>
            )}

            {/* Receipt Items List - dynamically expands to prevent hiding/collapsing rows */}
            <div className="space-y-3.5 py-4 flex-1">
              {cart.map((item, index) => (
                <div 
                  key={item.id ? `${item.id}-${item.type}` : `cart-${index}`} 
                  className="flex justify-between items-start text-xs text-slate-700 font-mono pb-3 border-b border-dotted border-slate-150 last:border-b-0 gap-2"
                >
                  {item.imageUrl && (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="h-8 w-8 rounded-lg object-cover border border-slate-200 shrink-0 mt-0.5" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="font-bold text-slate-800 text-xs truncate break-all">{item.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {item.quantity} x {formatCurrency(item.price, business.currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-800">
                      {formatCurrency(item.price * item.quantity, business.currency)}
                    </span>
                    
                    {/* Compact Interactive Controls inside Receipt */}
                    <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden font-sans shrink-0">
                      <button
                        onClick={() => updateQty(item.id, item.type, -1)}
                        className="p-1 hover:bg-slate-100 text-slate-500 rounded-l transition cursor-pointer"
                        title="Decrease Quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleManualQtyChange(item.id, item.type, val);
                        }}
                        className="w-10 text-center font-bold text-slate-800 text-[11px] bg-slate-50 border-x border-slate-100 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                      <button
                        onClick={() => updateQty(item.id, item.type, 1)}
                        className="p-1 hover:bg-slate-100 text-slate-500 rounded-r transition cursor-pointer"
                        title="Increase Quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id, item.type)}
                      className="p-1 hover:bg-rose-50 text-rose-500 rounded transition cursor-pointer font-sans"
                      title="Remove Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-16 text-center text-slate-400 font-sans space-y-3.5">
                  <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-600">Your Live Receipt is Empty</p>
                    <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">Select goods or professional services from the catalog on the left to instantly populate this ticket.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Totals Section */}
            <div className="border-t border-dashed border-slate-200 pt-4 space-y-2 text-right font-mono text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, business.currency)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Discount Applied ({discountPercent}%)</span>
                  <span>-{formatCurrency(discount, business.currency)}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div className="flex justify-between text-slate-600 font-bold">
                  <span>Tax/VAT</span>
                  <span>+{formatCurrency(totalTax, business.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-slate-800 text-sm border-t border-slate-200 pt-2.5">
                <span>Total Due</span>
                <span className="text-emerald-800 text-base">{formatCurrency(total, business.currency)}</span>
              </div>
            </div>

            {/* Printed Metadata */}
            <div className="border-t border-dashed border-slate-200 mt-4 pt-3 text-[10px] text-slate-500 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span>CLIENT PROFILE:</span>
                <span className="font-bold uppercase tracking-wider text-slate-700">
                  {customers.find(c => c.id === selectedCustomerId)?.name || 'Walk-in Customer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>PAYMENT TYPE:</span>
                <span className="font-bold uppercase tracking-widest text-emerald-800">{paymentMethod}</span>
              </div>
            </div>

            {/* Bottom jagged/tear-off edge */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[linear-gradient(45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#f1f5f9_33.333%,#f1f5f9_66.667%,transparent_66.667%)] bg-[length:12px_12px]" />
          </div>

          {/* Checkout Action Controls Panel below the receipt */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3.5 text-xs">
              {/* Customer Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Customer Profile</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const custId = e.target.value;
                    setSelectedCustomerId(custId);
                    if (custId) {
                      const selectedCust = customers.find(c => c.id === custId);
                      if (selectedCust?.phone) {
                        setCheckoutCustomerPhone(selectedCust.phone);
                      }
                    }
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500 cursor-pointer font-bold"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c, index) => (
                    <option key={c.id || `cust-${index}`} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Discount Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Discount (%)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Percent className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500 font-bold"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Optional Customer Phone for Automatic SMS Receipt */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Customer Phone (SMS Receipt)</span>
                <span className="text-[9px] text-emerald-600 font-semibold lowercase">optional</span>
              </label>
              <input
                type="tel"
                value={checkoutCustomerPhone}
                onChange={(e) => setCheckoutCustomerPhone(e.target.value)}
                placeholder="e.g. 0244123456"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs font-mono focus:ring-1 focus:ring-emerald-500 font-bold"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {(['cash', 'card', 'mobile', 'other'] as const).map((method, index) => (
                  <button
                    key={method || index}
                    onClick={() => {
                      setPaymentMethod(method);
                      setAmountReceived('');
                    }}
                    className={`py-2 rounded-xl text-[10px] font-bold uppercase text-center transition cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Payment & Change Calculation */}
            {paymentMethod === 'cash' && (
              <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider">Amount Received ({business.currency})</label>
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-white border border-blue-100 px-2 py-0.5 rounded">
                    Due: {formatCurrency(total, business.currency)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-bold text-slate-400 text-xs">
                    {getCurrencySymbol(business.currency)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs focus:ring-1 focus:ring-blue-500 font-bold font-mono"
                    placeholder="Enter cash amount received..."
                  />
                </div>
                {amountReceived !== '' && amountReceived >= total && (
                  <div className="flex justify-between items-center text-xs font-mono font-bold bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="text-slate-500">Change Due:</span>
                    <span className="text-blue-800 text-sm">
                      {formatCurrency(amountReceived - total, business.currency)}
                    </span>
                  </div>
                )}
                {amountReceived !== '' && amountReceived < total && (
                  <p className="text-[10px] font-bold text-rose-500">
                    Received cash is less than total due.
                  </p>
                )}
              </div>
            )}

            {/* Quick Layout Customizer & Action Trigger */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReceiptCustomizing(true)}
                className="py-2.5 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <FileText className="h-4 w-4" /> Layout
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-30 cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                Complete Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Live Invoice / Printable Receipt Preview */}
      {createdSale && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl relative border border-slate-100 my-auto max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCreatedSale(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center pb-4 border-b border-dashed border-slate-200 space-y-1">
              <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-widest flex items-center justify-center gap-1">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Order Completed Successfully
              </span>
              <p className="text-xs text-slate-400">Receipt Invoice &bull; {createdSale.id}</p>
            </div>

            {/* Simulated thermal receipt body based on customization */}
            <div className={`my-6 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs space-y-4 font-mono select-none ${
              recLayout === 'compact' ? 'space-y-2 text-[11px]' : recLayout === 'elegant' ? 'border-t-4 border-t-emerald-800 bg-white rounded-md' : ''
            }`}>
              {/* Header */}
              <div className="text-center space-y-1">
                <p className="font-bold text-slate-800 text-sm uppercase tracking-wide">{recName}</p>
                <p className="text-[10px] text-slate-400 whitespace-pre-line leading-relaxed">{recContact}</p>
              </div>

              {/* metadata */}
              <div className="border-t border-b border-dashed border-slate-200 py-2 space-y-1 text-[10px] text-slate-500">
                <p>DATE: {new Date(createdSale.createdAt).toLocaleString()}</p>
                <p>CASHIER: {createdSale.employeeName}</p>
                <p>CLIENT: {createdSale.customerName || 'Walk-in Customer'}</p>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                {createdSale.items.map((item, idx) => (
                  <div key={item.itemId ? `${item.itemId}-${idx}` : idx} className="flex justify-between text-slate-700">
                    <span className="truncate pr-4">{item.quantity}x {item.name}</span>
                    <span className="shrink-0">{formatCurrency(item.price * item.quantity, createdSale.currency || business.currency)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-right">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(createdSale.subtotal, createdSale.currency || business.currency)}</span>
                </div>
                {createdSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(createdSale.discount, createdSale.currency || business.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-800 text-sm border-t border-slate-200 pt-1.5">
                  <span>Total Due</span>
                  <span>{formatCurrency(createdSale.total, createdSale.currency || business.currency)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-2 text-[10px] text-slate-500">
                <p>PAYMENT TYPE: <span className="font-bold uppercase">{createdSale.paymentMethod}</span></p>
              </div>

              {/* Footer */}
              <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 whitespace-pre-line leading-normal">
                {recFooter}
              </div>
            </div>

            <div className="space-y-2">
              {/* SMS Receipt Quick Dispatch */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-emerald-800" /> Send Instant SMS Receipt
                </p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={smsReceiptPhone}
                    onChange={e => setSmsReceiptPhone(e.target.value)}
                    placeholder="Customer Phone (e.g. 0244123456)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleSendSmsReceipt}
                    disabled={isSendingSmsReceipt}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition shrink-0"
                  >
                    {isSendingSmsReceipt ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
                {smsReceiptStatus && (
                  <p className={`text-[10px] font-semibold ${smsReceiptStatus.success ? 'text-emerald-800' : 'text-rose-600'}`}>
                    {smsReceiptStatus.message}
                  </p>
                )}
              </div>

              <button
                onClick={handlePrintSaleReceipt}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                🖨️ Print Receipt Invoice
              </button>
              <button
                onClick={() => setCreatedSale(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close & Start New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Receipt layout Customizer */}
      {isReceiptCustomizing && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Building className="h-4 w-4 text-emerald-800" /> Customize Receipt Formats
              </h4>
              <button onClick={() => setIsReceiptCustomizing(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateReceiptConfig} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Invoicing Business Name</label>
                <input
                  type="text"
                  required
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Contact Metadata (Header Lines)</label>
                <textarea
                  rows={2}
                  required
                  value={recContact}
                  onChange={(e) => setRecContact(e.target.value)}
                  placeholder="Address lines and telephone contact..."
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Invoice Layout Design</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['standard', 'compact', 'elegant'] as const).map((l, index) => (
                    <button
                      type="button"
                      key={l || index}
                      onClick={() => setRecLayout(l)}
                      className={`py-2 rounded-xl font-bold border text-center transition cursor-pointer text-xs ${
                        recLayout === l
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase mb-1">Footer Message</label>
                <input
                  type="text"
                  required
                  value={recFooter}
                  onChange={(e) => setRecFooter(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReceiptCustomizing(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Apply Customization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Service Registration Form */}
      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-scale-up border border-slate-100 overflow-hidden text-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                <Sparkles className="h-5 w-5 text-emerald-800" /> Register Professional Service Job
              </h4>
              <button onClick={() => setIsServiceFormOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterServiceJob} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 space-y-3 text-left">
                <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Customer Information</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={formCustName}
                      onChange={(e) => setFormCustName(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Customer Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +233 24 123 4567"
                      value={formCustPhone}
                      onChange={(e) => setFormCustPhone(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 text-left">
                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Service Details</h5>
                
                {/* Predefined service selection */}
                {services.length > 0 && (
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Select Service Template (Pre-fills form)</label>
                    <select
                      onChange={(e) => {
                        const s = services.find(x => x.id === e.target.value);
                        if (s) {
                          setFormServiceName(s.name);
                          setFormServiceDesc(s.description || '');
                          setFormServiceCat(s.category || 'Consultation');
                          setFormServicePrice(s.price);
                        }
                      }}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs bg-slate-50"
                    >
                      <option value="">-- Choose a catalog service package --</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.price, business.currency)})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Service Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Graphic Design / Consultancy"
                      value={formServiceName}
                      onChange={(e) => setFormServiceName(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Service Category</label>
                    <select
                      value={formServiceCat}
                      onChange={(e) => setFormServiceCat(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    >
                      {['Consultation', 'Labor', 'Repair', 'Advisory', 'Therapy', 'Custom'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Service Description</label>
                  <textarea
                    rows={2}
                    placeholder="Provide description of the service scope..."
                    value={formServiceDesc}
                    onChange={(e) => setFormServiceDesc(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Assign to Professional *</label>
                    <select
                      required
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    >
                      <option value="">-- Choose Employee --</option>
                      {db.getUsers().filter(u => u.businessId === business.id).map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Service Price ({business.currency}) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formServicePrice}
                      onChange={(e) => setFormServicePrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Job Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formServiceDate}
                      onChange={(e) => setFormServiceDate(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Target Completion Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formExpectedComplete}
                      onChange={(e) => setFormExpectedComplete(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                {/* Owner Branch Selection */}
                {user.role === 'owner' && (
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Branch Location</label>
                    <select
                      value={formBranchId}
                      onChange={(e) => setFormBranchId(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    >
                      <option value="">All Branches</option>
                      {db.getBranches(business.id).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 shrink-0 text-right">
                <button
                  type="button"
                  onClick={() => setIsServiceFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Register Pending Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Services Catalog Manager Modal (CRUD) */}
      {isCatalogManagerOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800">
                  <SettingsIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Service Catalog Templates</h3>
                  <p className="text-[10px] text-slate-400">Manage labor rate structures, consultation offerings, and beauty therapy packages</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCatalogManagerOpen(false);
                  setEditingTemplateId(null);
                }}
                className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main content grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-8">
              {/* Left Column: List of Existing templates */}
              <div className="md:col-span-3 flex flex-col space-y-4 min-h-0">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Catalog Offerings</h4>
                
                {services.length === 0 ? (
                  <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <Sparkles className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">No Services Registered</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[240px]">Create your first catalog offering using the registration form on the right.</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1 divide-y divide-slate-100">
                    {services.map((s) => (
                      <div key={s.id} className="pt-3 flex items-start justify-between gap-4 text-xs group">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                              {s.category || 'Custom'}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">{s.name}</span>
                          </div>
                          {s.description && (
                            <p className="text-slate-500 text-[10px] leading-relaxed line-clamp-2">{s.description}</p>
                          )}
                          <p className="text-emerald-800 font-extrabold text-xs">{formatCurrency(s.price, business.currency)}</p>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleEditTemplate(s)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                            title="Edit Service"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(s.id, s.name)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Service"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Form to create or update template */}
              <div className="md:col-span-2 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-start">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                  {editingTemplateId ? '✏️ Edit Catalog Item' : '✨ Add New Catalog Item'}
                </h4>

                <form onSubmit={handleSaveCatalogService} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Deep Tissue Massage"
                      value={formTemplateName}
                      onChange={(e) => setFormTemplateName(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price ({business.currency}) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="85.00"
                      value={formTemplatePrice}
                      onChange={(e) => setFormTemplatePrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service Category</label>
                    <select
                      value={formTemplateCat}
                      onChange={(e) => setFormTemplateCat(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs cursor-pointer"
                    >
                      {['Consultation', 'Labor', 'Repair', 'Advisory', 'Therapy', 'Beauty', 'Wellness', 'Custom'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Brief details about what the package includes..."
                      value={formTemplateDesc}
                      onChange={(e) => setFormTemplateDesc(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    {editingTemplateId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplateId(null);
                          setFormTemplateName('');
                          setFormTemplateDesc('');
                          setFormTemplatePrice('');
                          setFormTemplateCat('Consultation');
                        }}
                        className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-colors"
                    >
                      {editingTemplateId ? 'Save Changes' : 'Add to Catalog'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* IN-APP MOBILE BARCODE SCANNER MODAL */}
      <InAppMobileScannerModal
        business={business}
        user={user}
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScannerConnected={(sessionId) => {
          setActiveScannerSessionId(sessionId);
          setIsMobileScannerActive(true);
        }}
        onItemScanned={(item, type) => {
          addToCart(item, type);
        }}
      />
    </div>
  );
}
