import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, LaundryOrder, LaundryOrderItem, Customer, LaundryService } from '../types';
import { 
  Shirt, Plus, Search, Filter, Printer, CheckCircle2, Clock, 
  Trash2, Edit3, X, AlertCircle, DollarSign, Calendar, UserPlus, FileText
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface LaundryOrdersProps {
  business: Business;
  user: User;
  onNavigateToPriceList?: () => void;
}

export const LaundryOrders: React.FC<LaundryOrdersProps> = ({
  business,
  user,
  onNavigateToPriceList
}) => {
  const [orders, setOrders] = useState<LaundryOrder[]>(() => db.getLaundryOrders(business.id));
  const customers = db.getCustomers(business.id);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modal state
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<LaundryOrder | null>(null);

  // New Order Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [orderItems, setOrderItems] = useState<LaundryOrderItem[]>([]);
  const [estimatedPickupDate, setEstimatedPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  // Custom item inputs
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<string>('');
  const [customItemQty, setCustomItemQty] = useState<number>(1);

  const refreshOrders = () => {
    setOrders(db.getLaundryOrders(business.id));
  };

  // Dynamic Price List state
  const laundryServices = db.getLaundryServices(business.id).filter(s => s.enabled);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('All');

  const filteredServices = laundryServices.filter(svc => {
    const matchesSearch = svc.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
      (svc.description && svc.description.toLowerCase().includes(serviceSearchTerm.toLowerCase()));
    const matchesCat = serviceCategoryFilter === 'All' || svc.category === serviceCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleAddItemService = (svc: LaundryService) => {
    if (svc.price === undefined || svc.price === null || svc.price <= 0) {
      showError('Price Required', 'Please set a price for this service before creating an order.');
      return;
    }
    const existing = orderItems.find(i => i.name === svc.name);
    if (existing) {
      setOrderItems(orderItems.map(i => i.name === svc.name ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setOrderItems([
        ...orderItems,
        {
          id: 'item-' + Math.random().toString(36).substring(2, 7),
          name: svc.name,
          category: `${svc.category} (${svc.itemType || 'Per Piece'})`,
          quantity: 1,
          price: svc.price
        }
      ]);
    }
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) {
      showError('Input Required', 'Please enter garment item name.');
      return;
    }
    const price = parseFloat(customItemPrice);
    if (isNaN(price) || price <= 0) {
      showError('Price Required', 'Please set a price for this service before creating an order.');
      return;
    }
    setOrderItems([
      ...orderItems,
      {
        id: 'item-' + Math.random().toString(36).substring(2, 7),
        name: customItemName.trim(),
        category: 'Custom Service',
        quantity: customItemQty || 1,
        price
      }
    ]);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty(1);
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter(i => i.id !== id));
  };

  const handleUpdateItemQty = (id: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(id);
      return;
    }
    setOrderItems(orderItems.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalPieces = orderItems.reduce((acc, item) => acc + item.quantity, 0);
    const finalTotal = Math.max(0, subtotal - discount);
    const balanceDue = Math.max(0, finalTotal - amountPaid);
    let paymentStatus: 'Paid' | 'Partial' | 'Pending' = 'Pending';
    if (amountPaid >= finalTotal && finalTotal > 0) {
      paymentStatus = 'Paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'Partial';
    }
    return { subtotal, totalPieces, finalTotal, balanceDue, paymentStatus };
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (laundryServices.length === 0) {
      showError('No Services Available', 'No laundry services available. Please create a service and set your own price first.');
      return;
    }
    if (orderItems.length === 0) {
      showError('Order Empty', 'Please add at least one garment item to the order.');
      return;
    }
    const unpricedItem = orderItems.find(item => item.price === undefined || item.price === null || item.price <= 0);
    if (unpricedItem) {
      showError('Price Required', 'Please set a price for this service before creating an order.');
      return;
    }

    let custName = newCustomerName.trim();
    let custPhone = newCustomerPhone.trim();
    let custId = selectedCustomerId;

    if (selectedCustomerId) {
      const found = customers.find(c => c.id === selectedCustomerId);
      if (found) {
        custName = found.name;
        custPhone = found.phone;
      }
    } else if (custName) {
      // Save new customer automatically
      const newCust: Customer = {
        id: 'cust-' + Math.random().toString(36).substring(2, 9),
        businessId: business.id,
        name: custName,
        email: `${custName.toLowerCase().replace(/\s+/g, '')}@client.com`,
        phone: custPhone || '0000000000',
        balance: 0,
        createdAt: new Date().toISOString()
      };
      db.saveCustomer(business.id, newCust);
      custId = newCust.id;
    } else {
      custName = 'Walk-in Laundry Client';
      custId = 'walk-in';
    }

    const { subtotal, totalPieces, finalTotal, balanceDue, paymentStatus } = calculateTotals();
    const orderNumber = 'LND-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder: LaundryOrder = {
      id: 'lnd-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      orderNumber,
      customerId: custId,
      customerName: custName,
      customerPhone: custPhone,
      items: orderItems,
      totalPieces,
      subtotal,
      discount,
      total: finalTotal,
      amountPaid,
      balanceDue,
      paymentStatus,
      status: 'Received',
      receivedDate: new Date().toISOString(),
      estimatedPickupDate,
      specialInstructions,
      createdAt: new Date().toISOString(),
      createdBy: user.name
    };

    db.saveLaundryOrder(business.id, newOrder);
    showSuccess('Order Created', `Laundry ticket ${orderNumber} created successfully!`);

    // Reset form
    setIsNewOrderModalOpen(false);
    setOrderItems([]);
    setSelectedCustomerId('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setAmountPaid(0);
    setDiscount(0);
    setSpecialInstructions('');
    refreshOrders();
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: LaundryOrder['status']) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    let updated: LaundryOrder = {
      ...target,
      status: newStatus
    };

    if (newStatus === 'Delivered') {
      updated.deliveredDate = new Date().toISOString();
    }

    db.saveLaundryOrder(business.id, updated);
    showSuccess('Status Updated', `Order ${target.orderNumber} updated to ${newStatus}`);
    refreshOrders();
  };

  const handleSettleBalance = (order: LaundryOrder) => {
    if (order.balanceDue <= 0) return;
    const updated: LaundryOrder = {
      ...order,
      amountPaid: order.total,
      balanceDue: 0,
      paymentStatus: 'Paid'
    };
    db.saveLaundryOrder(business.id, updated);
    showSuccess('Payment Received', `Balance settled for ticket ${order.orderNumber}`);
    refreshOrders();
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerPhone && o.customerPhone.includes(searchTerm));

    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusesList: LaundryOrder['status'][] = [
    'Received', 'Washing', 'Drying', 'Ironing', 'Ready for Pickup', 'Delivered', 'Cancelled'
  ];

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shirt className="h-6 w-6 text-cyan-600" /> Laundry Services & Dry Cleaning Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create garment tickets, track status stages, collect deposits, and print pickup receipts.
          </p>
        </div>

        <button
          onClick={() => {
            if (laundryServices.length === 0) {
              showError('No Services Available', 'No laundry services available. Please create a service and set your own price first.');
            }
            setIsNewOrderModalOpen(true);
          }}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-2xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer self-start sm:self-center"
        >
          <Plus className="h-4 w-4" /> New Laundry Intake Ticket
        </button>
      </div>

      {laundryServices.length === 0 && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-900">No laundry services available. Please create a service and set your own price first.</p>
            </div>
          </div>
          {onNavigateToPriceList && (
            <button
              onClick={onNavigateToPriceList}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Service
            </button>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search ticket #, client or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-400 font-bold uppercase text-[10px] shrink-0">Stage:</span>
          <button
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs shrink-0 ${statusFilter === 'All' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All
          </button>
          {statusesList.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs shrink-0 ${statusFilter === st ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <th className="py-4 px-6">Ticket #</th>
                <th className="py-4 px-6">Client Info</th>
                <th className="py-4 px-6">Garment Items</th>
                <th className="py-4 px-6 text-center">Pieces</th>
                <th className="py-4 px-6 text-right">Total / Balance</th>
                <th className="py-4 px-6 text-center">Current Status</th>
                <th className="py-4 px-6 text-center">Pickup Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-700 divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    No laundry orders matching filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const statusColors: Record<string, string> = {
                    Received: 'bg-slate-100 text-slate-800 border-slate-200',
                    Washing: 'bg-blue-100 text-blue-800 border-blue-200',
                    Drying: 'bg-amber-100 text-amber-800 border-amber-200',
                    Ironing: 'bg-purple-100 text-purple-800 border-purple-200',
                    'Ready for Pickup': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    Delivered: 'bg-teal-100 text-teal-800 border-teal-200',
                    Cancelled: 'bg-rose-100 text-rose-800 border-rose-200'
                  };

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-mono font-black text-slate-900">{o.orderNumber}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{o.customerName}</div>
                        <div className="text-[10px] text-slate-400">{o.customerPhone || 'No phone'}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="max-w-xs truncate text-slate-600 font-medium">
                          {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-slate-900">{o.totalPieces}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="font-black text-slate-900">{formatCurrency(o.total, business.currency)}</div>
                        {o.balanceDue > 0 ? (
                          <div className="text-[10px] text-rose-600 font-extrabold">Due: {formatCurrency(o.balanceDue, business.currency)}</div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 font-bold">Paid in full</div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as LaundryOrder['status'])}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border cursor-pointer ${statusColors[o.status]}`}
                        >
                          {statusesList.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-6 text-center font-medium text-slate-600">
                        {new Date(o.estimatedPickupDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {o.balanceDue > 0 && (
                            <button
                              onClick={() => handleSettleBalance(o)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition cursor-pointer text-[10px]"
                              title="Settle balance"
                            >
                              Settle
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPrintOrder(o)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                            title="Print Intake Tag"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW LAUNDRY INTAKE MODAL */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setIsNewOrderModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Shirt className="h-5 w-5 text-cyan-600" /> New Laundry Intake Ticket
              </h3>
              <p className="text-xs text-slate-500">Record customer garments, pricing per item, deposits and pickup date.</p>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-6 text-xs">
              {/* Customer Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Registered Customer</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs"
                  >
                    <option value="">+ Walk-in or New Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                {!selectedCustomerId && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. David Mensah"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-800 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="024 123 4567"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-800 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Laundry Service Price List Quick Select */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Select Service from Price List ({laundryServices.length} Active Services)
                  </label>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search service..."
                      value={serviceSearchTerm}
                      onChange={(e) => setServiceSearchTerm(e.target.value)}
                      className="py-1 px-2.5 border border-slate-200 rounded-lg text-[11px] bg-white w-full sm:w-36 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <select
                      value={serviceCategoryFilter}
                      onChange={(e) => setServiceCategoryFilter(e.target.value)}
                      className="py-1 px-2 border border-slate-200 rounded-lg text-[11px] bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="All">All Categories</option>
                      <option value="Washing & Ironing">Washing & Ironing</option>
                      <option value="Dry Cleaning">Dry Cleaning</option>
                      <option value="Bedding & Household">Bedding & Household</option>
                      <option value="Specialty & Footwear">Specialty & Footwear</option>
                      <option value="Logistics & Express">Logistics & Express</option>
                    </select>
                  </div>
                </div>

                {laundryServices.length === 0 ? (
                  <div className="py-6 px-4 text-center space-y-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                    <AlertCircle className="h-8 w-8 mx-auto text-amber-600" />
                    <p className="text-xs font-bold text-amber-900">
                      No laundry services available. Please create a service and set your own price first.
                    </p>
                    {onNavigateToPriceList && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewOrderModalOpen(false);
                          onNavigateToPriceList();
                        }}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" /> Add Service
                      </button>
                    )}
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    No active laundry services found matching filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredServices.map((svc) => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => handleAddItemService(svc)}
                        className="p-2.5 bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-400 rounded-xl text-left transition cursor-pointer space-y-0.5 shadow-xs group"
                      >
                        <div className="font-extrabold text-slate-800 text-[11px] truncate group-hover:text-cyan-900">{svc.name}</div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium">{svc.itemType || 'Per Piece'}</span>
                          <span className="text-cyan-700 font-extrabold">{formatCurrency(svc.price, business.currency)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Item Row Input */}
              <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Custom Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Leather Jacket"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="w-full py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Price</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    className="w-full py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div className="w-16">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(parseInt(e.target.value) || 1)}
                    className="w-full py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs bg-white text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition cursor-pointer"
                >
                  + Add Item
                </button>
              </div>

              {/* Selected Order Items List */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Garments in Ticket ({orderItems.length})</label>
                {orderItems.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No garments added to this intake ticket yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {orderItems.map(item => (
                      <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-400">{item.category} • {formatCurrency(item.price, business.currency)} each</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-slate-200 rounded-lg">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, item.quantity - 1)}
                              className="px-2 py-1 hover:bg-slate-100 font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, item.quantity + 1)}
                              className="px-2 py-1 hover:bg-slate-100 font-bold"
                            >
                              +
                            </button>
                          </div>

                          <div className="font-black text-slate-900 w-16 text-right">
                            {formatCurrency(item.price * item.quantity, business.currency)}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pickup & Special Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estimated Ready Pickup Date</label>
                  <input
                    type="date"
                    required
                    value={estimatedPickupDate}
                    onChange={(e) => setEstimatedPickupDate(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-800 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Special Instructions / Stains</label>
                  <input
                    type="text"
                    placeholder="e.g. Delicate silk, stain on collar"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-800 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Financial Calculation Bar */}
              {(() => {
                const { subtotal, totalPieces, finalTotal, balanceDue, paymentStatus } = calculateTotals();
                return (
                  <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-b border-slate-800 pb-3">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Total Pieces</div>
                        <div className="text-lg font-black text-white">{totalPieces}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Subtotal</div>
                        <div className="text-lg font-black text-slate-200">{formatCurrency(subtotal, business.currency)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Final Amount</div>
                        <div className="text-lg font-black text-cyan-400">{formatCurrency(finalTotal, business.currency)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Balance Due</div>
                        <div className={`text-lg font-black ${balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formatCurrency(balanceDue, business.currency)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deposit / Amount Paid Now</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={amountPaid || ''}
                          onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Discount Amount</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={discount || ''}
                          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl shadow-lg transition cursor-pointer text-xs uppercase tracking-wide"
              >
                Create & Issue Laundry Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT INVOICE MODAL */}
      {selectedPrintOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 font-mono text-xs">
            <button
              onClick={() => setSelectedPrintOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center pb-3 border-b border-dashed border-slate-200 space-y-1">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase">{business.name}</h3>
              <p className="text-[10px] text-slate-500 uppercase">LAUNDRY INTAKE TICKET</p>
              <p className="text-xs font-bold text-cyan-800">{selectedPrintOrder.orderNumber}</p>
            </div>

            <div className="space-y-1 text-[10px] text-slate-600">
              <p>CUSTOMER: <strong>{selectedPrintOrder.customerName}</strong></p>
              <p>PHONE: {selectedPrintOrder.customerPhone || 'N/A'}</p>
              <p>RECEIVED: {new Date(selectedPrintOrder.receivedDate).toLocaleString()}</p>
              <p>EST. PICKUP: <strong>{new Date(selectedPrintOrder.estimatedPickupDate).toLocaleDateString()}</strong></p>
              <p>STATUS: <span className="font-bold uppercase text-cyan-700">{selectedPrintOrder.status}</span></p>
            </div>

            <div className="border-t border-b border-dashed border-slate-200 py-2 space-y-1">
              {selectedPrintOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{formatCurrency(item.price * item.quantity, business.currency)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-right">
              <div className="flex justify-between font-bold text-slate-900">
                <span>TOTAL ({selectedPrintOrder.totalPieces} pcs):</span>
                <span>{formatCurrency(selectedPrintOrder.total, business.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>PAID:</span>
                <span>{formatCurrency(selectedPrintOrder.amountPaid, business.currency)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-rose-600">
                <span>BALANCE DUE:</span>
                <span>{formatCurrency(selectedPrintOrder.balanceDue, business.currency)}</span>
              </div>
            </div>

            {selectedPrintOrder.specialInstructions && (
              <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                <strong>NOTE:</strong> {selectedPrintOrder.specialInstructions}
              </div>
            )}

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Printer className="h-4 w-4" /> Print Ticket Tag
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
