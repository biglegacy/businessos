import React, { useState, useEffect } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, MenuItem, RestaurantTable, RestaurantOrder } from '../types';
import { notifyNewKitchenOrder, notifyNewSale } from '../lib/pushNotifications';
import { 
  Search, 
  ShoppingCart, 
  Clock, 
  User, 
  Layers, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Utensils, 
  Printer, 
  X, 
  CheckCircle,
  Percent
} from 'lucide-react';

interface RestaurantPOSProps {
  business: Business;
  currentUser: any;
  onSaleComplete: () => void;
}

const CATEGORIES = ['Meals', 'Drinks', 'Breakfast', 'Lunch', 'Dinner', 'Desserts', 'Specials'];

export const RestaurantPOS: React.FC<RestaurantPOSProps> = ({ business, currentUser, onSaleComplete }) => {
  // Database data
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => db.getMenuItems(business.id));
  const [tables, setTables] = useState<RestaurantTable[]>(() => db.getRestaurantTables(business.id));
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Cart Order State
  const [cartItems, setCartItems] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [tableId, setTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<'Dine-in' | 'Takeaway' | 'Delivery'>('Dine-in');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Checkout Payment Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile' | 'other' | 'split'>('cash');
  
  // Split payments records
  const [splitCash, setSplitCash] = useState('');
  const [splitMoMo, setSplitMoMo] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitBank, setSplitBank] = useState('');

  // Post Checkout Success & Receipt
  const [completedOrder, setCompletedOrder] = useState<RestaurantOrder | null>(null);

  // Sync tables and menu on render
  useEffect(() => {
    setMenuItems(db.getMenuItems(business.id));
    setTables(db.getRestaurantTables(business.id));
  }, [business.id]);

  // Calculations
  const subtotal = cartItems.reduce((sum, entry) => sum + (entry.item.sellingPrice * entry.quantity), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  
  // Calculate average tax rate based on items in cart
  const taxAmount = cartItems.reduce((sum, entry) => {
    const rate = entry.item.taxRate || 0;
    const itemSubtotal = entry.item.sellingPrice * entry.quantity;
    return sum + (itemSubtotal * rate) / 100;
  }, 0);

  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  // Add Item to cart
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    const idx = cartItems.findIndex(entry => entry.item.id === item.id);
    if (idx >= 0) {
      const updated = [...cartItems];
      updated[idx].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { item, quantity: 1 }]);
    }
  };

  const adjustQty = (id: string, delta: number) => {
    const idx = cartItems.findIndex(entry => entry.item.id === id);
    if (idx >= 0) {
      const updated = [...cartItems];
      const nextQty = updated[idx].quantity + delta;
      if (nextQty <= 0) {
        updated.splice(idx, 1);
      } else {
        updated[idx].quantity = nextQty;
      }
      setCartItems(updated);
    }
  };

  const removeFromCart = (id: string) => {
    setCartItems(cartItems.filter(entry => entry.item.id !== id));
  };

  const handleOpenCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty. Please select menu items to draft an order.');
      return;
    }
    if (orderType === 'Dine-in' && !tableId) {
      alert('Please select an active table for dine-in orders.');
      return;
    }

    // Default split values to empty
    setSplitCash('');
    setSplitMoMo('');
    setSplitCard('');
    setSplitBank('');

    setIsCheckoutOpen(true);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();

    let splitPayments: { method: string; amount: number }[] = [];
    if (paymentMethod === 'split') {
      const cash = parseFloat(splitCash) || 0;
      const momo = parseFloat(splitMoMo) || 0;
      const card = parseFloat(splitCard) || 0;
      const bank = parseFloat(splitBank) || 0;

      const splitTotal = cash + momo + card + bank;
      if (Math.abs(splitTotal - total) > 0.05) {
        alert(`The total of your split payments (${formatCurrency(splitTotal, business.currency)}) does not match the required bill total (${formatCurrency(total, business.currency)}). Please balance the amounts.`);
        return;
      }

      if (cash > 0) splitPayments.push({ method: 'Cash', amount: cash });
      if (momo > 0) splitPayments.push({ method: 'Mobile Money', amount: momo });
      if (card > 0) splitPayments.push({ method: 'Card', amount: card });
      if (bank > 0) splitPayments.push({ method: 'Bank Transfer', amount: bank });
    }

    const orderNumber = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    const selectedTable = tables.find(t => t.id === tableId);

    const newOrder: RestaurantOrder = {
      id: 'o_pos-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      orderNumber,
      tableId: orderType === 'Dine-in' ? tableId : undefined,
      tableNumber: orderType === 'Dine-in' ? (selectedTable?.number || tableId) : undefined,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || undefined,
      orderType,
      items: cartItems.map(c => ({
        menuItemId: c.item.id,
        name: c.item.name,
        price: c.item.sellingPrice,
        quantity: c.quantity
      })),
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      paymentMethod,
      splitPayments: paymentMethod === 'split' ? splitPayments : undefined,
      paymentStatus: 'paid',
      status: 'Completed',
      kitchenStatus: 'NEW', // Sends to KDS board immediately
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    // Save Order (Automatic raw materials reduction triggers in db.ts)
    db.saveRestaurantOrder(business.id, newOrder);

    // Notify Kitchen Display System
    notifyNewKitchenOrder(business.id, {
      orderNumber,
      tableNumber: newOrder.tableNumber,
      type: orderType,
      totalItems: cartItems.reduce((acc, c) => acc + c.quantity, 0)
    });

    // If Dine-in, free table up or set occupied. In POS payment, order is completed so we set table to Available or free it
    if (orderType === 'Dine-in' && tableId) {
      const matchTbl = tables.find(t => t.id === tableId);
      if (matchTbl) {
        db.saveRestaurantTable(business.id, {
          ...matchTbl,
          status: 'Available',
          currentOrderId: undefined
        });
      }
    }

    // Save as standard sale in overall POS history to keep general reports updated
    const newSale = {
      id: newOrder.id,
      businessId: business.id,
      items: cartItems.map(c => ({
        itemId: c.item.id,
        name: c.item.name,
        type: 'product' as const,
        price: c.item.sellingPrice,
        quantity: c.quantity
      })),
      subtotal,
      discount: discountPercent,
      total,
      paymentMethod: paymentMethod === 'split' ? 'other' : (paymentMethod as any),
      customerId: customerName ? 'c-' + orderNumber : undefined,
      customerName: customerName.trim() || 'Walk-in Customer',
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      createdAt: new Date().toISOString(),
      status: 'completed' as const,
      currency: business.currency
    };
    db.saveSale(business.id, newSale);

    // Notify new sale
    notifyNewSale(business.id, {
      receiptNumber: orderNumber,
      totalAmount: total,
      itemCount: cartItems.reduce((acc, c) => acc + c.quantity, 0)
    });

    db.addActivityLog(business.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'POS Sale Created',
      details: `Completed restaurant POS order ${orderNumber} for ${formatCurrency(total, business.currency)}`
    });

    setCompletedOrder(newOrder);
    setIsCheckoutOpen(false);

    // Reset checkout POS state
    setCartItems([]);
    setTableId('');
    setCustomerName('');
    setCustomerPhone('');
    setDiscountPercent(0);
  };

  const handlePrintReceipt = () => {
    if (!completedOrder) return;
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

    // Render exact customer receipt requested
    const itemsHtml = completedOrder.items.map(item => `
      <tr>
        <td style="padding: 4px 0;">${item.name}</td>
        <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right;">GHC ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const brandName = business.receiptConfig?.businessName || business.name;
    const contactInfo = business.receiptConfig?.contactInfo || business.phone || '';
    const footerMsg = business.receiptConfig?.footerMessage || 'Thank You!\nPlease Come Again';

    doc.write(`
      <html>
        <head>
          <title>Customer Receipt</title>
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
            <h2 style="margin: 0; font-size: ${isThermal ? '16px' : '22px'}; uppercase">${brandName}</h2>
            <p style="margin: 4px 0 0 0; font-size: 10px; whitespace: pre-line;">${contactInfo}</p>
          </div>
          <hr />
          <div>
            <strong>Receipt No:</strong> #${completedOrder.orderNumber}<br />
            <strong>Date:</strong> ${new Date(completedOrder.createdAt).toLocaleString()}<br />
            <strong>Cashier:</strong> ${completedOrder.employeeName}
            ${completedOrder.tableNumber ? `<br /><strong>Table:</strong> ${completedOrder.tableNumber}` : ''}
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
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>GHC ${completedOrder.subtotal.toFixed(2)}</span>
            </div>
            ${completedOrder.discount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Discount:</span>
              <span>GHC ${completedOrder.discount.toFixed(2)}</span>
            </div>
            ` : ''}
            ${completedOrder.tax > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Tax:</span>
              <span>GHC ${completedOrder.tax.toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${isThermal ? '13px' : '16px'}; margin-top: 4px;">
              <span>TOTAL:</span>
              <span>GHC ${completedOrder.total.toFixed(2)}</span>
            </div>
          </div>
          <hr />
          <div>
            <strong>Payment:</strong><br />
            ${completedOrder.paymentMethod === 'mobile' ? 'Mobile Money' : completedOrder.paymentMethod === 'split' ? 'Split Payments' : completedOrder.paymentMethod}
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
      document.body.removeChild(iframe);
    }, 1000);
  };

  const handlePrintKitchenTicket = () => {
    if (!completedOrder) return;
    const printers = db.getPrinterSettings(business.id);
    const kitchenPrinter = printers.find(p => p.printerType === 'Kitchen Printer') || printers.find(p => p.isDefault) || null;

    const paperSize = kitchenPrinter?.paperSize || '80mm';
    const isThermal = !kitchenPrinter || kitchenPrinter.printerType === 'Kitchen Printer' || paperSize === '58mm' || paperSize === '80mm';
    const paperWidth = paperSize === '58mm' ? '58mm' : paperSize === '80mm' ? '80mm' : '210mm';

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

    // Render exact kitchen ticket structure requested
    const itemsHtml = completedOrder.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin: 6px 0;">
        <span>${item.name}</span>
        <span>x${item.quantity}</span>
      </div>
    `).join('');

    doc.write(`
      <html>
        <head>
          <title>Kitchen Order Ticket</title>
          <style>
            body {
              font-family: "Courier New", Courier, monospace;
              font-size: 13px;
              color: #000;
              margin: 0;
              padding: 10px;
              width: ${isThermal ? paperWidth : '100%'};
              background: #fff;
            }
            .center { text-align: center; }
            hr { border: 0; border-top: 2px solid #000; margin: 10px 0; }
            @media print {
              @page { margin: 0; }
            }
          </style>
        </head>
        <body onload="window.print();">
          <div style="border: 2px solid #000; padding: 10px;">
            <div class="center" style="font-size: 16px; font-weight: 900; letter-spacing: 1px;">
              ========================<br />
              KITCHEN ORDER<br />
              ========================
            </div>
            <div style="font-size: 13px; font-weight: bold; margin-top: 10px;">
              Order No: #${completedOrder.orderNumber}<br />
              ${completedOrder.tableNumber ? `Table: ${completedOrder.tableNumber}<br />` : ''}
              Time: ${new Date().toLocaleTimeString()}
            </div>
            <hr />
            <div>
              ${itemsHtml}
            </div>
            <hr />
            <div style="font-weight: bold; font-size: 11px;">
              Special Instructions:<br />
              <span style="font-size: 13px; text-transform: uppercase;">
                ${completedOrder.customerPhone ? `Contact Phone: ${completedOrder.customerPhone}<br />` : ''}
                No Pepper/Custom Notes
              </span>
            </div>
            <div style="text-align: center; margin-top: 10px; font-size: 15px; font-weight: 900;">
              ========================
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  const handleCloseSuccess = () => {
    setCompletedOrder(null);
    onSaleComplete();
  };

  // Filter & Search
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-10rem)]">
      
      {/* LEFT & MIDDLE: MENU PRODUCTS GRID (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col h-full space-y-4">
        {/* Top search & category panel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search dishes, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button 
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              All Items
            </button>
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu item cards grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredMenuItems.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm h-full flex flex-col justify-center items-center">
              <Layers className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-sm font-bold text-slate-700">No available menu items</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">Register dishes in the Menu Management tab or verify availability filters to checkout POS sales.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
              {filteredMenuItems.map(item => (
                <button 
                  key={item.id} 
                  id={`pos_item_${item.id}`}
                  onClick={() => addToCart(item)}
                  disabled={!item.isAvailable}
                  className={`bg-white p-3 rounded-2xl border border-slate-100 shadow-xs hover:border-emerald-500 text-left transition-all relative flex flex-col justify-between space-y-3 cursor-pointer group ${
                    !item.isAvailable ? 'opacity-60 cursor-not-allowed grayscale bg-slate-50' : 'hover:-translate-y-0.5'
                  }`}
                >
                  {/* Image/Icon container */}
                  <div className="h-28 bg-slate-50 rounded-xl overflow-hidden relative flex items-center justify-center">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                    )}
                    <span className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white font-black text-[10px] px-2 py-1 rounded-md">
                      {formatCurrency(item.sellingPrice, business.currency)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 text-xs truncate leading-snug">{item.name}</h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                      <span className="uppercase text-slate-400">{item.category}</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {item.prepTime}m
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: CURRENT BILL DRAFTING & PARAMS (4 Cols) */}
      <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between h-full overflow-hidden">
        
        {/* Customer / Order type Config */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
              <ShoppingCart className="h-4.5 w-4.5 text-slate-700" />
              <span>Current Order</span>
            </h3>
            <span className="bg-slate-100 text-slate-600 font-bold text-[10px] px-2.5 py-1 rounded-full">{cartItems.length} items</span>
          </div>

          {/* Dine-In, Takeaway, Delivery selector */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
            {(['Dine-in', 'Takeaway', 'Delivery'] as const).map(type => (
              <button 
                key={type}
                type="button"
                onClick={() => {
                  setOrderType(type);
                  if (type !== 'Dine-in') setTableId('');
                }}
                className={`py-1.5 rounded-lg text-[10px] font-black tracking-tight transition-colors cursor-pointer text-center ${
                  orderType === type ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-2 text-xs">
            {orderType === 'Dine-in' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Table *</label>
                <select 
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
                >
                  <option value="">-- Choose Active Table --</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>{t.number} ({t.status})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cust. Name</label>
                <input 
                  type="text"
                  placeholder="Walk-in"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                <input 
                  type="text"
                  placeholder="Optional"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mapped Order Items drafting lists */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 divide-y divide-slate-100 max-h-56">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center text-slate-300 py-10">
              <Utensils className="h-10 w-10 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Add food items to draft invoice receipt</p>
            </div>
          ) : (
            cartItems.map(entry => (
              <div key={entry.item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5 max-w-[60%]">
                  <span className="font-extrabold text-slate-700 block truncate">{entry.item.name}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">{formatCurrency(entry.item.sellingPrice, business.currency)} each</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={() => adjustQty(entry.item.id, -1)}
                      className="p-1 hover:bg-slate-100 text-slate-500 rounded-md cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-black text-slate-800 text-xs">{entry.quantity}</span>
                    <button 
                      onClick={() => adjustQty(entry.item.id, 1)}
                      className="p-1 hover:bg-slate-100 text-slate-500 rounded-md cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <button 
                    onClick={() => removeFromCart(entry.item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Payment triggers */}
        <div className="space-y-4 pt-4 border-t border-slate-100 text-xs">
          <div className="space-y-2 font-medium text-slate-500">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-700">{formatCurrency(subtotal, business.currency)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Percent className="h-3 w-3 text-slate-400" />
                <span>Discount (%)</span>
              </span>
              <input 
                type="number" 
                min="0"
                max="100"
                value={discountPercent || ''}
                onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                className="w-14 px-2 py-0.5 border border-slate-200 rounded-lg text-right text-slate-800 font-bold"
              />
            </div>

            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span>Operational Taxes</span>
                <span className="font-bold text-slate-700">{formatCurrency(taxAmount, business.currency)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-slate-100 text-slate-800 font-black text-sm">
              <span>Total Bill</span>
              <span className="text-emerald-600 text-base">{formatCurrency(total, business.currency)}</span>
            </div>
          </div>

          <button 
            onClick={handleOpenCheckout}
            disabled={cartItems.length === 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold tracking-wider shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none cursor-pointer flex items-center justify-center gap-2 uppercase"
          >
            <CreditCard className="h-4 w-4" />
            <span>Process Payment</span>
          </button>
        </div>
      </div>

      {/* CHECKOUT PAYMENT DIALOG */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Settle Bill Payment</h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block mt-0.5">Order Total: {formatCurrency(total, business.currency)}</span>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Settle Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['cash', 'mobile', 'card', 'split'] as const).map(method => (
                    <button 
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-3.5 border rounded-2xl text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        paymentMethod === method 
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-extrabold tracking-wider">{method === 'mobile' ? 'Mobile Money' : method}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SPLIT PAYMENTS COMPOSITION FORMS */}
              {paymentMethod === 'split' && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Split Payment Distribution</span>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Cash Amount</label>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Mobile Money (MoMo)</label>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={splitMoMo}
                        onChange={(e) => setSplitMoMo(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Card Swipe</label>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={splitCard}
                        onChange={(e) => setSplitCard(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Bank Transfer</label>
                      <input 
                        type="number"
                        placeholder="0.00"
                        value={splitBank}
                        onChange={(e) => setSplitBank(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-[11px] bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between font-bold">
                    <span>Distribution Sum:</span>
                    <span className={
                      Math.abs(((parseFloat(splitCash) || 0) + (parseFloat(splitMoMo) || 0) + (parseFloat(splitCard) || 0) + (parseFloat(splitBank) || 0)) - total) < 0.05
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }>
                      {formatCurrency((parseFloat(splitCash) || 0) + (parseFloat(splitMoMo) || 0) + (parseFloat(splitCard) || 0) + (parseFloat(splitBank) || 0), business.currency)} / {formatCurrency(total, business.currency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer text-center"
                >
                  Confirm Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETED ORDER RECEIPT POPUP */}
      {completedOrder && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            
            {/* Upper dialog header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
              <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5 uppercase">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Payment Confirmed
              </span>
              <button 
                onClick={handleCloseSuccess}
                className="p-1 text-emerald-800 hover:bg-emerald-100 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* PRINTABLE RECEIPT FRAME */}
            <div className="flex-1 overflow-y-auto p-6" id="printable-restaurant-receipt">
              <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-4 font-mono text-xs text-slate-700 bg-slate-50">
                
                {/* Header info */}
                <div className="space-y-1">
                  <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">
                    {business.receiptConfig?.businessName || business.name}
                  </h2>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {business.receiptConfig?.contactInfo || business.phone || 'Restaurant Service Terminal'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 border-y border-dashed border-slate-300 py-1 block">
                    Sales Invoice Receipt
                  </p>
                </div>

                {/* Metadata details */}
                <div className="text-[10px] text-left space-y-1 text-slate-500 pb-2 border-b border-slate-200">
                  <div className="flex justify-between">
                    <span>Order Number:</span>
                    <span className="font-extrabold text-slate-800">{completedOrder.orderNumber}</span>
                  </div>
                  {completedOrder.tableNumber && (
                    <div className="flex justify-between">
                      <span>Table Assigned:</span>
                      <span className="font-extrabold text-slate-800">{completedOrder.tableNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Customer Name:</span>
                    <span className="font-extrabold text-slate-800">{completedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span className="font-extrabold text-slate-800">{new Date(completedOrder.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Served By:</span>
                    <span className="font-extrabold text-slate-800">{completedOrder.employeeName}</span>
                  </div>
                </div>

                {/* Items grid */}
                <div className="space-y-1 text-left py-2 border-b border-slate-200">
                  <div className="flex justify-between font-bold text-[10px] text-slate-400 mb-1">
                    <span>Item Descr.</span>
                    <span>Qty x Price = Total</span>
                  </div>
                  {completedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>{item.name}</span>
                      <span className="font-extrabold">{item.quantity}x {formatCurrency(item.price, business.currency)} = {formatCurrency(item.price * item.quantity, business.currency)}</span>
                    </div>
                  ))}
                </div>

                {/* Calculations breakdown */}
                <div className="text-right space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(completedOrder.subtotal, business.currency)}</span>
                  </div>
                  {completedOrder.discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount Reduct:</span>
                      <span className="font-semibold">-{formatCurrency(completedOrder.discount, business.currency)}</span>
                    </div>
                  )}
                  {completedOrder.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Operations Tax:</span>
                      <span className="font-semibold">{formatCurrency(completedOrder.tax, business.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-slate-900 border-t border-dashed border-slate-300 pt-1.5 text-xs">
                    <span>Total Bill Paid:</span>
                    <span>{formatCurrency(completedOrder.total, business.currency)}</span>
                  </div>
                </div>

                {/* Payment split / method details */}
                <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-2 text-left">
                  {completedOrder.paymentMethod === 'split' ? (
                    <div className="space-y-1">
                      <span className="font-extrabold text-slate-700 block">Settle Breakdown:</span>
                      {completedOrder.splitPayments?.map((p, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>&bull; {p.method}:</span>
                          <span className="font-bold">{formatCurrency(p.amount, business.currency)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span>Paid Settle Mode:</span>
                      <span className="font-bold uppercase text-slate-800">{completedOrder.paymentMethod}</span>
                    </div>
                  )}
                </div>

                {/* Warm footer note */}
                <div className="pt-4 border-t border-dashed border-slate-300">
                  <p className="text-[10px] text-slate-500 italic font-black uppercase tracking-widest text-center">
                    {business.receiptConfig?.footerMessage || 'Thank you for dining with us! Please come again.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Receipt bottom controls */}
            <div className="p-6 border-t border-slate-100 flex flex-col gap-2.5 bg-slate-50">
              <div className="flex gap-2">
                <button 
                  onClick={handlePrintReceipt}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer uppercase shadow-xs transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Receipt</span>
                </button>
                <button 
                  onClick={handlePrintKitchenTicket}
                  className="flex-1 py-3 bg-amber-800 hover:bg-amber-950 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer uppercase shadow-xs transition"
                >
                  <Utensils className="h-4 w-4" />
                  <span>Send To Kitchen</span>
                </button>
              </div>
              <button 
                onClick={handleCloseSuccess}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold text-center cursor-pointer uppercase shadow-xs transition"
              >
                <span>New POS Bill</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
