/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, Product, Customer, Sale, Prescription, PharmacyBatch } from '../types';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Pill,
  User as UserIcon,
  CreditCard,
  Printer,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  ShieldAlert,
  Sparkles,
  Barcode
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface PharmacyPOSProps {
  business: Business;
  user: User;
  onNavigate?: (tab: string) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedBatch?: PharmacyBatch;
  price: number;
  dosageForm?: string;
  strength?: string;
}

export const PharmacyPOS: React.FC<PharmacyPOSProps> = ({
  business,
  user,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Patient / Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Prescription Link
  const [prescriptionRef, setPrescriptionRef] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');

  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile' | 'card' | 'bank'>('cash');
  const [mobileNetwork, setMobileNetwork] = useState<'MTN' | 'Telecel' | 'AT'>('MTN');
  const [mobileNumber, setMobileNumber] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsPhoneInput, setSmsPhoneInput] = useState('');

  // Load live tenant data
  const products = db.getProducts(business.id);
  const customers = db.getCustomers(business.id);
  const batches = db.getPharmacyBatches(business.id);

  const now = new Date();

  // Filtered Medicines
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        (p.genericName && p.genericName.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.dosageForm && p.dosageForm.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  }, [products]);

  // FEFO Helper: Find batches for product and sort by expiry date (earliest first)
  const getProductBatchesFEFO = (productId: string): PharmacyBatch[] => {
    return batches
      .filter(b => b.productId === productId && b.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  };

  // Add to Cart with FEFO auto-selection
  const handleAddToCart = (product: Product) => {
    // Check if overall product is expired
    if (product.expiryDate && new Date(product.expiryDate) < now) {
      showError('Expired Medicine Blocked', `Cannot dispense "${product.name}" as it expired on ${product.expiryDate}.`);
      return;
    }

    if (product.stockQuantity <= 0) {
      showError('Out of Stock', `"${product.name}" has 0 stock units in the dispensary.`);
      return;
    }

    // Get FEFO batches
    const prodBatches = getProductBatchesFEFO(product.id);
    let bestBatch = prodBatches.length > 0 ? prodBatches[0] : undefined;

    // Check if best batch is expired
    if (bestBatch && new Date(bestBatch.expiryDate) < now) {
      // Look for first non-expired batch
      bestBatch = prodBatches.find(b => new Date(b.expiryDate) >= now);
      if (!bestBatch) {
        showError('Expired Batches', `All registered batches for "${product.name}" have expired.`);
        return;
      }
    }

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id);
      if (existingIdx >= 0) {
        const item = prev[existingIdx];
        if (item.quantity >= product.stockQuantity) {
          showError('Stock Limit', `Cannot add more units than the current stock (${product.stockQuantity}).`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = { ...item, quantity: item.quantity + 1 };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            selectedBatch: bestBatch,
            price: product.sellingPrice,
            dosageForm: product.dosageForm,
            strength: product.strength
          }
        ];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stockQuantity) {
              showError('Stock Limit', `Dispensary limit reached (${item.product.stockQuantity} available).`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Handle Quick Create Patient
  const handleCreateCustomer = () => {
    if (!newCustomerName.trim()) {
      showError('Name Required', 'Please provide the patient / customer full name.');
      return;
    }
    const newCust: Customer = {
      id: 'cust_' + Date.now(),
      businessId: business.id,
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      totalSpent: 0,
      visitCount: 0,
      createdAt: new Date().toISOString()
    };
    db.saveCustomer(business.id, newCust);
    setSelectedCustomer(newCust);
    setIsCustomerModalOpen(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    showSuccess('Patient Registered', `Patient record created for ${newCust.name}.`);
  };

  // Complete Sale and record prescription / batches
  const handleCompleteSale = () => {
    if (cart.length === 0) {
      showError('Empty Cart', 'Please add medicines to dispense.');
      return;
    }

    const paidNum = parseFloat(amountPaidInput) || grandTotal;

    const saleRecord: Sale = {
      id: 'DISP-' + Date.now(),
      businessId: business.id,
      items: cart.map(item => ({
        itemId: item.product.id,
        name: `${item.product.name}${item.strength ? ' (' + item.strength + ')' : ''}`,
        type: 'product',
        price: item.price,
        quantity: item.quantity
      })),
      total: grandTotal,
      discount: discountAmount,
      amountPaid: paidNum,
      change: Math.max(0, paidNum - grandTotal),
      paymentMethod,
      paymentStatus: paidNum >= grandTotal ? 'paid' : 'partial',
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Patient',
      customerPhone: selectedCustomer ? selectedCustomer.phone : '',
      createdAt: new Date().toISOString(),
      cashierName: user.name,
      notes: prescriptionRef
        ? `Rx Ref: ${prescriptionRef} | Prescriber: ${doctorName || 'N/A'}${clinicName ? ' (' + clinicName + ')' : ''}`
        : notes
    };

    // Deduct inventory
    cart.forEach(item => {
      const prod = item.product;
      const updatedQty = Math.max(0, prod.stockQuantity - item.quantity);
      db.saveProduct(business.id, {
        ...prod,
        stockQuantity: updatedQty
      });

      // Deduct from batch if selected
      if (item.selectedBatch) {
        const batch = item.selectedBatch;
        const updatedBatchQty = Math.max(0, batch.quantity - item.quantity);
        db.savePharmacyBatch(business.id, {
          ...batch,
          quantity: updatedBatchQty
        });
      }
    });

    // Save sale
    db.saveSale(business.id, saleRecord);

    // If prescription details were provided, link or update prescription
    if (prescriptionRef || doctorName) {
      const rx: Prescription = {
        id: 'rx_' + Date.now(),
        businessId: business.id,
        prescriptionNumber: prescriptionRef || 'RX-' + Math.floor(1000 + Math.random() * 9000),
        patientName: selectedCustomer ? selectedCustomer.name : 'Walk-in Patient',
        patientPhone: selectedCustomer?.phone,
        doctorName: doctorName || 'Physician',
        clinicOrHospital: clinicName || 'Health Center',
        prescribedDate: new Date().toISOString(),
        status: 'Dispensed',
        medicines: cart.map(item => ({
          productId: item.product.id,
          medicineName: item.product.name,
          dosage: item.dosageForm || 'Tablets',
          quantity: item.quantity,
          batchNumber: item.selectedBatch?.batchNumber || item.product.batchNumber
        })),
        saleId: saleRecord.id,
        dispensedAt: new Date().toISOString(),
        dispensedBy: user.name,
        createdAt: new Date().toISOString()
      };
      db.savePrescription(business.id, rx);
    }

    // Customer spend update
    if (selectedCustomer) {
      db.saveCustomer(business.id, {
        ...selectedCustomer,
        totalSpent: (selectedCustomer.totalSpent || 0) + grandTotal,
        visitCount: (selectedCustomer.visitCount || 0) + 1
      });
    }

    showSuccess('Dispensation Complete', `Sale ${saleRecord.id} recorded successfully.`);
    setCompletedSale(saleRecord);
    setSmsPhoneInput(selectedCustomer?.phone || '');
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true);
    setCart([]);
    setPrescriptionRef('');
    setDoctorName('');
    setClinicName('');
    setAmountPaidInput('');
    setDiscountPercent(0);
  };

  const handleSendSmsReceipt = async () => {
    const targetPhone = smsPhoneInput.trim() || completedSale?.customerPhone;
    if (!completedSale || !targetPhone) {
      showError('Phone Required', 'Please provide a valid recipient phone number.');
      return;
    }

    setIsSendingSms(true);
    try {
      const itemsSummary = completedSale.items.map(i => `${i.quantity}x ${i.name}`).slice(0, 2).join(', ');
      const msg = `${business.name}: Dispensation #${completedSale.id.slice(-6)} confirmed! Items: ${itemsSummary}. Total: ${formatCurrency(completedSale.total, business.currency || 'GHC')}. Thank you!`;
      
      const res = await db.sendSms({
        recipient: targetPhone,
        message: msg,
        businessId: business.id,
        type: 'receipt'
      });

      if (res.success) {
        showSuccess('SMS Sent', `Receipt SMS delivered to ${targetPhone}.`);
      } else {
        showError('SMS Not Sent', res.message || 'Unable to send SMS receipt.');
      }
    } catch (e: any) {
      showError('SMS Error', e?.message || 'Network error dispatching SMS receipt.');
    } finally {
      setIsSendingSms(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full pb-10">
      {/* Left Column: Medicine Catalog & Search */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Search and Category Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search medicine by trade name, generic name, brand, or dosage form..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Medicines Grid */}
        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-3">
              <Pill className="h-10 w-10 mx-auto text-slate-300" />
              <h3 className="font-bold text-sm text-slate-700">No medicines found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No items match your search term or selected category.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('Medicines & Products')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Add Medicine to Catalog
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stockQuantity <= 0;
                const isExpired = product.expiryDate && new Date(product.expiryDate) < now;
                const isExpiringSoon =
                  product.expiryDate &&
                  !isExpired &&
                  new Date(product.expiryDate) <= new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (!isOutOfStock && !isExpired) {
                        handleAddToCart(product);
                      }
                    }}
                    className={`bg-white p-4 rounded-2xl border transition-all flex flex-col justify-between select-none ${
                      isExpired
                        ? 'border-red-200 bg-red-50/40 opacity-75 cursor-not-allowed'
                        : isOutOfStock
                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 hover:border-emerald-400 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase truncate">
                          {product.category || 'General'}
                        </span>
                        {isExpired ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 font-extrabold rounded-md text-[10px] flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            EXPIRED
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-extrabold rounded-md text-[10px] flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            EXPIRING SOON
                          </span>
                        ) : product.requiresPrescription ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-extrabold rounded-md text-[10px]">
                            Rx Only
                          </span>
                        ) : null}
                      </div>

                      {/* Name & Generic Name */}
                      <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                        {product.name}
                      </h4>
                      {product.genericName && (
                        <p className="text-[11px] text-slate-500 italic truncate mt-0.5">
                          ({product.genericName})
                        </p>
                      )}

                      {/* Dosage Form & Strength */}
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-600 font-medium">
                        {product.dosageForm && (
                          <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold text-[10px]">
                            {product.dosageForm}
                          </span>
                        )}
                        {product.strength && <span>{product.strength}</span>}
                        {product.packSize && <span className="text-slate-400">&bull; {product.packSize}</span>}
                      </div>

                      {/* Batch & Expiry Date */}
                      {(product.batchNumber || product.expiryDate) && (
                        <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-2">
                          {product.batchNumber && <span>Batch: {product.batchNumber}</span>}
                          {product.expiryDate && <span>Exp: {product.expiryDate}</span>}
                        </div>
                      )}
                    </div>

                    {/* Bottom Price & Stock */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-base font-extrabold text-emerald-800">
                          {formatCurrency(product.sellingPrice, business.currency || 'GHC')}
                        </div>
                        <div className={`text-[10px] font-bold ${
                          isOutOfStock ? 'text-rose-600' : product.stockQuantity <= 5 ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {isOutOfStock ? 'Out of Stock' : `${product.stockQuantity} in stock`}
                        </div>
                      </div>

                      <button
                        disabled={isOutOfStock || isExpired}
                        className={`p-2 rounded-xl transition ${
                          isOutOfStock || isExpired
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Dispensary Cart & Checkout Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4 shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-700" />
            <h3 className="font-extrabold text-base text-slate-900">Dispensary Cart</h3>
          </div>
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full">
            {cart.reduce((acc, i) => acc + i.quantity, 0)} items
          </span>
        </div>

        {/* Patient / Customer Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Patient / Customer
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <select
                value={selectedCustomer ? selectedCustomer.id : ''}
                onChange={e => {
                  const cust = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(cust || null);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Walk-in Patient</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              title="Add New Patient"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Prescription Reference Input (Collapsible/Optional) */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-emerald-700" />
              Prescription Details (Optional)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Rx Ref #"
              value={prescriptionRef}
              onChange={e => setPrescriptionRef(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="Doctor / Prescriber"
              value={doctorName}
              onChange={e => setDoctorName(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto max-h-[340px] space-y-2.5 pr-1">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingCart className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium">Cart is currently empty</p>
              <p className="text-[10px] text-slate-400">Select medicines from the left to begin</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.product.id}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {item.product.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {item.strength && <span className="mr-1">{item.strength}</span>}
                    {item.dosageForm && <span>&bull; {item.dosageForm}</span>}
                  </div>
                  {item.selectedBatch && (
                    <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                      FEFO Batch: {item.selectedBatch.batchNumber} (Exp: {item.selectedBatch.expiryDate})
                    </div>
                  )}
                  <div className="font-extrabold text-xs text-emerald-800 mt-1">
                    {formatCurrency(item.price * item.quantity, business.currency || 'GHC')}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, -1)}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, 1)}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleRemoveFromCart(item.product.id)}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer ml-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary */}
        <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-bold text-slate-800">
              {formatCurrency(subtotal, business.currency || 'GHC')}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <span>Discount (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercent || ''}
              onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              placeholder="0"
              className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-slate-800 text-xs outline-none"
            />
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Discount Applied</span>
              <span>-{formatCurrency(discountAmount, business.currency || 'GHC')}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
            <span>Total Payable</span>
            <span className="text-emerald-800">
              {formatCurrency(grandTotal, business.currency || 'GHC')}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          disabled={cart.length === 0}
          onClick={() => {
            setAmountPaidInput(grandTotal.toString());
            setIsPaymentModalOpen(true);
          }}
          className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
            cart.length === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Checkout ({formatCurrency(grandTotal, business.currency || 'GHC')})</span>
        </button>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Process Pharmacy Payment</h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Amount Due</span>
              <div className="text-2xl font-black text-emerald-900">
                {formatCurrency(grandTotal, business.currency || 'GHC')}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash' },
                  { id: 'mobile', label: 'Mobile Money' },
                  { id: 'card', label: 'Card' },
                  { id: 'bank', label: 'Bank' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                      paymentMethod === m.id
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Money Details */}
            {paymentMethod === 'mobile' && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {(['MTN', 'Telecel', 'AT'] as const).map(net => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setMobileNetwork(net)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        mobileNetwork === net
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {net} MoMo
                    </button>
                  ))}
                </div>
                <input
                  type="tel"
                  placeholder="Subscriber Phone Number (e.g. 0244123456)"
                  value={mobileNumber}
                  onChange={e => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Amount Paid Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Amount Tendered ({business.currency || 'GHC'})</label>
              <input
                type="number"
                step="any"
                value={amountPaidInput}
                onChange={e => setAmountPaidInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              {parseFloat(amountPaidInput) > grandTotal && (
                <div className="text-xs text-emerald-700 font-bold">
                  Change to give: {formatCurrency(parseFloat(amountPaidInput) - grandTotal, business.currency || 'GHC')}
                </div>
              )}
            </div>

            <button
              onClick={handleCompleteSale}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-lg"
            >
              Confirm & Dispense Medicines
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Patient Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Register Patient Record</h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kwame Mensah"
                  value={newCustomerName}
                  onChange={e => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number (for SMS Receipts)</label>
                <input
                  type="tel"
                  placeholder="e.g. 0244123456"
                  value={newCustomerPhone}
                  onChange={e => setNewCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <button
              onClick={handleCreateCustomer}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Save Patient Profile
            </button>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {isReceiptModalOpen && completedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="text-center space-y-1">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="font-black text-lg text-slate-900">Dispensation Completed</h3>
              <p className="text-xs text-slate-500">{completedSale.id}</p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 font-mono">
              <div className="text-center font-bold text-slate-900">{business.name}</div>
              <div className="text-center text-[10px] text-slate-500">{business.phone}</div>
              <div className="border-b border-dashed border-slate-300 my-2"></div>
              <div>Patient: {completedSale.customerName}</div>
              <div>Dispenser: {completedSale.cashierName}</div>
              <div>Date: {new Date(completedSale.createdAt).toLocaleString()}</div>
              <div className="border-b border-dashed border-slate-300 my-2"></div>
              {completedSale.items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>{it.name} x {it.quantity}</span>
                  <span>{formatCurrency(it.price * it.quantity, business.currency || 'GHC')}</span>
                </div>
              ))}
              <div className="border-b border-dashed border-slate-300 my-2"></div>
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>TOTAL:</span>
                <span>{formatCurrency(completedSale.total, business.currency || 'GHC')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Payment Method:</span>
                <span className="uppercase">{completedSale.paymentMethod}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Dispensation Receipt</span>
              </button>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={smsPhoneInput}
                    onChange={e => setSmsPhoneInput(e.target.value)}
                    placeholder="Patient Phone (e.g. 0244123456)"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleSendSmsReceipt}
                    disabled={isSendingSms}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {isSendingSms ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send SMS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close & Next Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
