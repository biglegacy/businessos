import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, MenuItem, Customer } from '../types';
import { showSuccess, showError } from '../lib/toast';
import { notifyNewKitchenOrder, notifyNewSale } from '../lib/pushNotifications';
import { 
  Utensils, 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  Smartphone, 
  DollarSign, 
  Building2, 
  X, 
  Printer, 
  User, 
  Phone, 
  FileText, 
  Sparkles,
  Flame,
  ChevronRight,
  Send
} from 'lucide-react';

interface FastFoodPOSProps {
  business: Business;
  user: any;
  onOrderCompleted?: () => void;
}

export const FastFoodPOS: React.FC<FastFoodPOSProps> = ({ business, user, onOrderCompleted }) => {
  const currency = business.currency || 'GHC';

  // Fetch menu items & ingredients
  const menuItems = db.getFastFoodMenuItems(business.id);
  const customers = db.getCustomers(business.id);

  // Default fast food categories
  const defaultCategories = ['All', 'Burgers', 'Chicken', 'Pizza', 'Rice Meals', 'Drinks', 'Snacks', 'Desserts', 'Specials'];
  const customCategories = Array.from(new Set(menuItems.map(m => m.category))).filter((c): c is string => typeof c === 'string' && !defaultCategories.includes(c));
  const allCategories = [...defaultCategories, ...customCategories];

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Cart / Order State
  const [cartItems, setCartItems] = useState<{
    menuItem: MenuItem;
    quantity: number;
    notes: string;
  }[]>([]);

  // Customer & Order Metadata
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<'Takeaway' | 'Delivery' | 'Dine-In'>('Takeaway');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile' | 'card' | 'bank'>('cash');
  const [amountPaidInput, setAmountPaidInput] = useState('');

  // Success Modal & Receipt
  const [lastOrder, setLastOrder] = useState<any | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Filter menu items
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart helper functions
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) {
      showError('Unavailable Item', `${item.name} is currently out of stock.`);
      return;
    }

    setCartItems(prev => {
      const existingIdx = prev.findIndex(ci => ci.menuItem.id === item.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        return [...prev, { menuItem: item, quantity: 1, notes: '' }];
      }
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(ci => {
        if (ci.menuItem.id === itemId) {
          const newQty = ci.quantity + delta;
          return newQty > 0 ? { ...ci, quantity: newQty } : null;
        }
        return ci;
      }).filter(Boolean) as any;
    });
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCartItems(prev => prev.map(ci => ci.menuItem.id === itemId ? { ...ci, notes } : ci));
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(ci => ci.menuItem.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setAmountPaidInput('');
  };

  // Subtotal & Totals
  const subtotal = cartItems.reduce((sum, ci) => sum + (ci.menuItem.sellingPrice * ci.quantity), 0);
  const total = subtotal; // can add tax if needed
  const amountPaid = parseFloat(amountPaidInput) || total;
  const changeDue = Math.max(0, amountPaid - total);

  // Complete Order
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      showError('Empty Order', 'Please add at least one fast food item to the order.');
      return;
    }

    const orderNumber = 'FF-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    const orderData = {
      id: 'ffo-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      orderNumber,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || 'N/A',
      orderType,
      items: cartItems.map(ci => ({
        menuItemId: ci.menuItem.id,
        name: ci.notes ? `${ci.menuItem.name} (${ci.notes})` : ci.menuItem.name,
        price: ci.menuItem.sellingPrice,
        quantity: ci.quantity
      })),
      subtotal,
      discount: 0,
      tax: 0,
      total,
      paymentMethod: paymentMethod === 'bank' ? 'other' : paymentMethod,
      paymentStatus: 'paid' as const,
      status: 'Pending' as const,
      kitchenStatus: 'NEW' as const,
      employeeId: user.id,
      employeeName: user.name,
      createdAt: nowIso
    };

    // 1. Save Fast Food / Restaurant Order (This automatically deducts recipe ingredients in db.ts!)
    db.saveFastFoodOrder(business.id, orderData as any);

    // Notify Kitchen Display System
    notifyNewKitchenOrder(business.id, {
      orderNumber: orderNumber.toString(),
      type: orderType,
      totalItems: cartItems.reduce((acc, i) => acc + i.quantity, 0)
    });

    // 2. Also register in general Sales for financial tracking
    const newSale = {
      id: 'sale-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      items: cartItems.map(ci => ({
        itemId: ci.menuItem.id,
        name: ci.menuItem.name,
        type: 'product',
        price: ci.menuItem.sellingPrice,
        quantity: ci.quantity
      })),
      subtotal,
      discount: 0,
      total,
      paymentMethod: (paymentMethod === 'bank' ? 'other' : paymentMethod) as any,
      amountReceived: amountPaid,
      change: changeDue,
      customerName: customerName || 'Walk-in Customer',
      employeeId: user.id,
      employeeName: user.name,
      createdAt: nowIso,
      status: 'completed' as const,
      currency
    };
    db.saveSale(business.id, newSale);

    // Notify new sale
    notifyNewSale(business.id, {
      receiptNumber: orderNumber.toString(),
      totalAmount: total,
      itemCount: cartItems.reduce((acc, i) => acc + i.quantity, 0)
    });

    // 3. Save or update customer record if customer name provided
    if (customerName) {
      const existingCust = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (existingCust) {
        db.saveCustomer(business.id, {
          ...existingCust,
          balance: existingCust.balance + total
        });
      } else {
        db.saveCustomer(business.id, {
          id: 'cust-' + Math.random().toString(36).substring(2, 9),
          businessId: business.id,
          name: customerName,
          email: '',
          phone: customerPhone || '',
          balance: total,
          createdAt: nowIso
        });
      }
    }

    // 4. Log activity
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: 'Fast Food Order Created',
      details: `Order #${orderNumber} (${orderType}) created for ${formatCurrency(total, currency)}. Ingredients auto-deducted.`
    });

    setLastOrder(orderData);
    setShowSuccessModal(true);
    clearCart();

    if (onOrderCompleted) {
      onOrderCompleted();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Utensils className="h-6 w-6 text-emerald-600" /> Fast Food POS Terminal
          </h1>
          <p className="text-xs text-slate-500">Quick service order entry, live preparation notes & kitchen dispatch</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-emerald-600 animate-pulse" /> Kitchen Live Connected
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: MENU ITEMS & CATEGORIES (7 or 8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          
          {/* SEARCH & CATEGORY SELECTOR */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search fast food menu (e.g. Burger, Pizza, Chicken, Drinks)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 text-sm shadow-sm"
              />
            </div>

            {/* CATEGORY PILLS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {allCategories.map(cat => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[#064E3B] text-white shadow-md' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MENU CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => {
              const inCart = cartItems.find(ci => ci.menuItem.id === item.id);
              return (
                <div 
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative group ${
                    !item.isAvailable ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200/90 hover:border-emerald-500/80'
                  }`}
                >
                  {/* In Cart Badge */}
                  {inCart && (
                    <div className="absolute top-2 right-2 h-6 w-6 bg-emerald-600 text-white font-black text-xs rounded-full flex items-center justify-center shadow">
                      {inCart.quantity}
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Image / Icon */}
                    <div className="h-28 w-full bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <Utensils className="h-10 w-10 text-slate-400 group-hover:scale-110 transition-transform" />
                      )}

                      {/* Availability Tag */}
                      <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.isAvailable ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
                      }`}>
                        {item.isAvailable ? 'Available' : 'Out of Stock'}
                      </span>
                    </div>

                    {/* Details */}
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.description || item.category}</p>
                    </div>
                  </div>

                  {/* Price & Prep Time */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-black text-emerald-700">{formatCurrency(item.sellingPrice, currency)}</span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                      <Clock className="h-3 w-3 text-slate-400" /> {item.prepTime || 10}m
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
                <Utensils className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No menu items found</h3>
                <p className="text-xs text-slate-400">Try selecting a different category or search term.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ORDER CART & CHECKOUT (5 or 4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-md p-5 space-y-5 sticky top-4">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" /> Current Order
            </h2>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear All
              </button>
            )}
          </div>

          <form onSubmit={handleCheckout} className="space-y-4">
            
            {/* ORDER TYPE SELECTION */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Order Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Takeaway', 'Delivery', 'Dine-In'] as const).map(type => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition cursor-pointer ${
                      orderType === type
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* CUSTOMER DETAILS */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0550000000"
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* CART ITEMS LIST */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {cartItems.map(ci => (
                <div key={ci.menuItem.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-slate-900">{ci.menuItem.name}</h4>
                      <div className="text-[11px] text-emerald-700 font-bold">
                        {formatCurrency(ci.menuItem.sellingPrice * ci.quantity, currency)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(ci.menuItem.id, -1)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-black px-1.5">{ci.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(ci.menuItem.id, 1)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(ci.menuItem.id)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* PREPARATION NOTES (e.g. Extra Cheese, No Onions, Spicy) */}
                  <input
                    type="text"
                    value={ci.notes}
                    onChange={(e) => updateItemNotes(ci.menuItem.id, e.target.value)}
                    placeholder="Prep notes e.g. Extra cheese, No onions, Extra spicy..."
                    className="w-full text-[10px] px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              ))}

              {cartItems.length === 0 && (
                <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-1">
                  <ShoppingBag className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Order cart is empty</p>
                  <p className="text-[10px] text-slate-400">Click items on the left to add to order.</p>
                </div>
              )}
            </div>

            {/* PAYMENT METHOD SELECTION */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'cash', label: 'Cash', icon: DollarSign },
                  { id: 'mobile', label: 'MoMo', icon: Smartphone },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'bank', label: 'Bank', icon: Building2 },
                ].map(pm => {
                  const Icon = pm.icon;
                  return (
                    <button
                      type="button"
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id as any)}
                      className={`p-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        paymentMethod === pm.id
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AMOUNT PAID (IF CASH) */}
            {paymentMethod === 'cash' && cartItems.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount Paid</label>
                  <input
                    type="number"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    placeholder={total.toString()}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Change Due</label>
                  <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-emerald-700">
                    {formatCurrency(changeDue, currency)}
                  </div>
                </div>
              </div>
            )}

            {/* TOTAL & SUBMIT BUTTON */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-600">Total Payable:</span>
                <span className="text-xl font-black text-emerald-700">{formatCurrency(total, currency)}</span>
              </div>

              <button
                type="submit"
                disabled={cartItems.length === 0}
                className="w-full py-3.5 bg-[#064E3B] hover:bg-[#032e23] disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                Complete Order & Dispatch to Kitchen
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* SUCCESS MODAL POPUP */}
      {showSuccessModal && lastOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Order #{lastOrder.orderNumber} Created!</h3>
              <p className="text-xs text-slate-500 leading-relaxed px-2">
                Order successfully dispatched to kitchen. Ingredients automatically deducted from inventory.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{lastOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order Type:</span>
                <span className="font-bold text-slate-900">{lastOrder.orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-black text-emerald-700">{formatCurrency(lastOrder.total, currency)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setIsReceiptModalOpen(true);
                }}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </button>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Next Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {isReceiptModalOpen && lastOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 font-mono text-xs">
            <div className="text-center border-b pb-3 space-y-1">
              <h2 className="font-black text-base">{business.name}</h2>
              <p className="text-[10px] text-slate-500">{business.phone || 'Fast Food Terminal'}</p>
              <p className="text-[10px] text-slate-400">Order #{lastOrder.orderNumber} - {lastOrder.orderType}</p>
            </div>

            <div className="space-y-1 text-[11px]">
              {lastOrder.items.map((it: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span>{it.quantity}x {it.name}</span>
                  <span>{formatCurrency(it.price * it.quantity, currency)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-2 space-y-1 text-right">
              <div className="font-black text-sm flex justify-between">
                <span>TOTAL:</span>
                <span>{formatCurrency(lastOrder.total, currency)}</span>
              </div>
            </div>

            <div className="border-t pt-3 text-center text-[10px] text-slate-400">
              Thank you for dining with us!
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  window.print();
                  setIsReceiptModalOpen(false);
                }}
                className="flex-1 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Print
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 py-2 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
