import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, Service, Product, Sale, SaleItem, Customer, SalonStaff } from '../types';
import { dispatchPushNotification } from '../lib/pushNotifications';
import { 
  Scissors, ShoppingBag, Search, Plus, Minus, Trash2, 
  CreditCard, Smartphone, DollarSign, CheckCircle2, 
  UserCheck, Printer, X, Sparkles, RefreshCw, UserPlus,
  Receipt, ArrowRight, Tag
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface SalonPOSProps {
  business: Business;
  user: User;
}

interface CartItem {
  id: string; // service or product ID
  type: 'service' | 'product';
  name: string;
  category: string;
  price: number;
  quantity: number;
  staffId?: string;
  staffName?: string;
  stockAvailable?: number;
}

export const SalonPOS: React.FC<SalonPOSProps> = ({ business, user }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'services' | 'products'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('Walk-in Client');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card' | 'bank_transfer'>('cash');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState<'MTN' | 'Telecel' | 'AT'>('MTN');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Completed Receipt Modal State
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Quick New Client Registration State
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Load Cloud Data
  const services = db.getServices(business.id).filter(s => s.status !== 'Inactive');
  const products = db.getProducts(business.id);
  const customers = db.getCustomers(business.id);
  const staff = db.getSalonStaff(business.id).filter(s => s.status === 'Active');

  // Unified items list
  const serviceItems: (Service & { itemType: 'service' })[] = services.map(s => ({ ...s, itemType: 'service' }));
  const productItems: (Product & { itemType: 'product' })[] = products.map(p => ({ ...p, itemType: 'product' }));

  let combinedItems: ( (Service & { itemType: 'service' }) | (Product & { itemType: 'product' }) )[] = [];
  if (activeTab === 'services') combinedItems = serviceItems;
  else if (activeTab === 'products') combinedItems = productItems;
  else combinedItems = [...serviceItems, ...productItems];

  // Filtering
  const filteredItems = combinedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart Calculations
  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const taxAmount = (subtotal * (business.taxRate || 0)) / 100;
  const total = Math.max(0, subtotal + taxAmount - discountAmount);

  // Cart Operations
  const addToCart = (item: (Service & { itemType: 'service' }) | (Product & { itemType: 'product' })) => {
    const isService = item.itemType === 'service';
    
    // If product, check stock
    if (!isService) {
      const prod = item as Product;
      const existingInCart = cart.find(c => c.id === prod.id && c.type === 'product');
      const qtyInCart = existingInCart ? existingInCart.quantity : 0;
      if (qtyInCart >= prod.stockQuantity) {
        showError('Out of Stock', `Only ${prod.stockQuantity} units available for ${prod.name}`);
        return;
      }
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(c => c.id === item.id && c.type === item.itemType);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex].quantity += 1;
        return copy;
      }

      const itemPrice = isService ? (item as Service).price : ((item as Product).sellingPrice || (item as Product).price || 0);
      const newItem: CartItem = {
        id: item.id,
        type: item.itemType,
        name: item.name,
        category: item.category,
        price: itemPrice,
        quantity: 1,
        stockAvailable: !isService ? (item as Product).stockQuantity : undefined,
        staffId: isService && (item as Service).assignedEmployeeId ? (item as Service).assignedEmployeeId : undefined,
        staffName: isService && (item as Service).assignedEmployeeName ? (item as Service).assignedEmployeeName : undefined
      };
      return [...prev, newItem];
    });
  };

  const updateQuantity = (id: string, type: 'service' | 'product', delta: number) => {
    setCart(prev => {
      return prev.map(c => {
        if (c.id === id && c.type === type) {
          const newQty = c.quantity + delta;
          if (type === 'product' && c.stockAvailable !== undefined && newQty > c.stockAvailable) {
            showError('Stock Limit', `Maximum available stock reached (${c.stockAvailable})`);
            return c;
          }
          return newQty > 0 ? { ...c, quantity: newQty } : null;
        }
        return c;
      }).filter(Boolean) as CartItem[];
    });
  };

  const updateItemStaff = (id: string, type: 'service' | 'product', stId: string) => {
    const stMatch = staff.find(s => s.id === stId);
    setCart(prev => prev.map(c => {
      if (c.id === id && c.type === type) {
        return {
          ...c,
          staffId: stId,
          staffName: stMatch ? stMatch.name : undefined
        };
      }
      return c;
    }));
  };

  const removeFromCart = (id: string, type: 'service' | 'product') => {
    setCart(prev => prev.filter(c => !(c.id === id && c.type === type)));
  };

  const handleQuickRegisterClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust: Customer = {
      id: 'cust_' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: newCustName.trim(),
      email: `${newCustName.toLowerCase().replace(/\s+/g, '')}@client.com`,
      phone: newCustPhone.trim(),
      balance: 0,
      createdAt: new Date().toISOString()
    };

    db.saveCustomer(business.id, newCust);
    setSelectedCustomerId(newCust.id);
    setCustomerNameInput(newCust.name);
    setIsNewCustModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    showSuccess('Client Registered', `${newCust.name} attached to checkout.`);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      showError('Empty Cart', 'Please add services or products to cart before checkout.');
      return;
    }

    if (paymentMethod === 'mobile_money' && !momoNumber.trim()) {
      showError('Validation Error', 'Please enter Mobile Money account number.');
      return;
    }

    // Deduct physical stock for products
    cart.forEach(item => {
      if (item.type === 'product') {
        const targetProd = products.find(p => p.id === item.id);
        if (targetProd) {
          const updatedStock = Math.max(0, targetProd.stockQuantity - item.quantity);
          db.saveProduct(business.id, {
            ...targetProd,
            stockQuantity: updatedStock
          });
        }
      }
    });

    // Construct Sale record
    const saleItemsArr: SaleItem[] = cart.map(c => ({
      id: c.id,
      type: c.type,
      name: c.name,
      category: c.category,
      price: c.price,
      quantity: c.quantity,
      subtotal: c.price * c.quantity,
      staffId: c.staffId,
      staffName: c.staffName
    }));

    let finalClientName = customerNameInput.trim() || 'Walk-in Client';
    if (selectedCustomerId) {
      const matchCust = customers.find(c => c.id === selectedCustomerId);
      if (matchCust) finalClientName = matchCust.name;
    }

    const saleRecord: Sale = {
      id: 'SLN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      businessId: business.id,
      employeeId: user.id,
      employeeName: user.name,
      customerId: selectedCustomerId || undefined,
      customerName: finalClientName,
      items: saleItemsArr,
      subtotal,
      discount: discountAmount,
      total,
      paymentMethod: paymentMethod === 'mobile_money' ? 'mobile' : paymentMethod === 'card' ? 'card' : paymentMethod === 'cash' ? 'cash' : 'other',
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    db.saveSale(business.id, saleRecord);

    // Push notification for checkout completion
    dispatchPushNotification({
      businessId: business.id,
      title: `💈 Salon Payment Received (${formatCurrency(total, business.currency)})`,
      message: `Completed sale for ${finalClientName} via ${paymentMethod.replace('_', ' ').toUpperCase()}.`,
      type: 'sales',
      soundType: 'sale'
    });

    setLastSale(saleRecord);
    setIsReceiptModalOpen(true);

    // Reset Cart
    setCart([]);
    setDiscountAmount(0);
    setMomoNumber('');
    showSuccess('Checkout Complete', `Payment of ${formatCurrency(total, business.currency)} recorded!`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Scissors className="h-6 w-6 text-purple-600" /> Salon & Beauty POS Terminal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Instant point-of-sale for salon services, hair styling, treatments, and retail beauty products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'all' ? 'bg-purple-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'services' ? 'bg-purple-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Services Only
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'products' ? 'bg-indigo-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Retail Products
          </button>
        </div>
      </div>

      {/* POS Grid: Items Selector (Left 2 cols) + Cart Panel (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items Selector */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search Box */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search haircuts, spa treatments, shampoos, hair oils..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Items Catalogue Grid */}
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <p className="text-sm font-semibold">No services or products found matching search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredItems.map(item => {
                const isService = item.itemType === 'service';
                const prodItem = !isService ? (item as Product) : null;
                const isOut = prodItem ? prodItem.stockQuantity <= 0 : false;

                return (
                  <button
                    key={`${item.itemType}_${item.id}`}
                    disabled={isOut}
                    onClick={() => addToCart(item)}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      isOut 
                        ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' 
                        : isService 
                          ? 'bg-white border-slate-200 hover:border-purple-400 hover:shadow-md' 
                          : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          isService ? 'bg-purple-100 text-purple-900' : 'bg-indigo-100 text-indigo-900'
                        }`}>
                          {isService ? 'Service' : 'Product'}
                        </span>

                        {!isService && prodItem && (
                          <span className={`text-[10px] font-bold ${isOut ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {isOut ? 'Out of stock' : `${prodItem.stockQuantity} in stock`}
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-xs leading-snug line-clamp-2">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.category}</p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-black text-slate-900 text-sm">{formatCurrency(isService ? (item as Service).price : ((item as Product).sellingPrice || (item as Product).price || 0), business.currency)}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${
                        isService ? 'bg-purple-600' : 'bg-indigo-600'
                      }`}>
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Cart & Checkout Panel */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 space-y-4 flex flex-col justify-between self-start">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-600" /> Current Checkout Cart ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Client Profile Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Attach Client</label>
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(true)}
                  className="text-[10px] font-extrabold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="h-3 w-3" /> Quick Add Client
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const cust = customers.find(c => c.id === e.target.value);
                  if (cust) setCustomerNameInput(cust.name);
                  else if (!e.target.value) setCustomerNameInput('Walk-in Client');
                }}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="">Walk-in Client (Guest)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Scissors className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Cart is currently empty.</p>
                <p className="text-[10px] text-slate-400">Click on services or products on the left to add.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {cart.map(c => (
                  <div key={`${c.type}_${c.id}`} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          c.type === 'service' ? 'bg-purple-100 text-purple-900' : 'bg-indigo-100 text-indigo-900'
                        }`}>
                          {c.type}
                        </span>
                        <h5 className="font-extrabold text-slate-900 mt-1">{c.name}</h5>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-slate-900">{formatCurrency(c.price * c.quantity, business.currency)}</span>
                        <button
                          onClick={() => removeFromCart(c.id, c.type)}
                          className="block ml-auto text-slate-400 hover:text-rose-600 mt-0.5 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quantity Controls & Assign Stylist for Services */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(c.id, c.type, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-extrabold text-slate-900">{c.quantity}</span>
                        <button
                          onClick={() => updateQuantity(c.id, c.type, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {c.type === 'service' && staff.length > 0 && (
                        <select
                          value={c.staffId || ''}
                          onChange={(e) => updateItemStaff(c.id, c.type, e.target.value)}
                          className="px-2 py-1 border border-slate-200 bg-white rounded-lg text-[10px] font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="">-- Assign Stylist --</option>
                          {staff.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method Selector & Totals */}
          {cart.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              {/* Payment Method Tabs */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === 'cash' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === 'mobile_money' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Mobile Money
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === 'card' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Card / POS
                  </button>
                  <button
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      paymentMethod === 'bank_transfer' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Receipt className="h-3.5 w-3.5" /> Transfer
                  </button>
                </div>
              </div>

              {paymentMethod === 'mobile_money' && (
                <div className="space-y-2 bg-amber-50 p-3 rounded-2xl border border-amber-200">
                  <div className="flex gap-2">
                    {['MTN', 'Telecel', 'AT'].map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => setMomoProvider(prov as any)}
                        className={`flex-1 py-1 rounded-lg font-black text-[10px] cursor-pointer ${
                          momoProvider === prov ? 'bg-amber-600 text-white' : 'bg-white text-slate-700'
                        }`}
                      >
                        {prov}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    placeholder="Mobile Money Account Number..."
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-mono text-xs text-slate-900 outline-none"
                  />
                </div>
              )}

              {/* Discount Input */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold text-[11px] flex items-center gap-1">
                  <Tag className="h-3 w-3 text-purple-600" /> Discount:
                </span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border border-slate-200 rounded-xl text-right font-bold text-slate-800 outline-none"
                />
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">{formatCurrency(subtotal, business.currency)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>VAT / Tax ({business.taxRate}%)</span>
                    <span className="font-bold text-slate-800">{formatCurrency(taxAmount, business.currency)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 text-[11px] font-bold">
                    <span>Discount</span>
                    <span>-{formatCurrency(discountAmount, business.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-purple-700">{formatCurrency(total, business.currency)}</span>
                </div>
              </div>

              {/* Complete Checkout Button */}
              <button
                onClick={handleCheckout}
                className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-2xl text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <CheckCircle2 className="h-5 w-5" /> Complete Payment & Print
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {isReceiptModalOpen && lastSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
              <Scissors className="h-8 w-8 mx-auto text-purple-700" />
              <h3 className="font-black text-slate-900 text-lg">{business.name}</h3>
              <p className="text-[10px] text-slate-500 font-mono">Receipt #{lastSale.id}</p>
              <p className="text-[10px] text-slate-400">{new Date(lastSale.createdAt).toLocaleString()}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Client:</span>
                <span className="font-extrabold text-slate-900">{lastSale.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment:</span>
                <span className="font-extrabold text-slate-900 uppercase">{lastSale.paymentMethod.replace('_', ' ')}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                {lastSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between font-medium text-slate-800">
                    <span>{it.quantity}x {it.name} {it.staffName ? `(${it.staffName})` : ''}</span>
                    <span className="font-extrabold">{formatCurrency(it.subtotal, business.currency)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-dashed border-slate-300 space-y-1 text-right">
                <div className="flex justify-between font-black text-slate-900 text-sm">
                  <span>TOTAL PAID:</span>
                  <span className="text-purple-700">{formatCurrency(lastSale.total, business.currency)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK NEW CLIENT MODAL */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-purple-600" /> Quick Add Client
              </h4>
              <button 
                onClick={() => setIsNewCustModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickRegisterClient} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Client Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Sandra Bullock"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Attach to Checkout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
