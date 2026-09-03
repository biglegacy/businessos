import React, { useState } from 'react';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { Business, User, Sale, Product, CustomerReturn, SupplierReturn } from '../types';
import { 
  RotateCcw, Search, Calendar, User as UserIcon, Shield, CreditCard,
  AlertTriangle, CheckCircle, Package, ArrowRight, Truck, Info, CornerDownLeft
} from 'lucide-react';

interface ReturnsProps {
  business: Business;
  user: User;
}

export function Returns({ business, user }: ReturnsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'customer' | 'supplier'>('customer');
  
  // State for Customer Returns
  const [saleSearchQuery, setSaleSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState<'Damaged item' | 'Wrong item supplied' | 'Customer changed mind' | 'Other'>('Customer changed mind');
  const [customReason, setCustomReason] = useState('');
  const [refundOverride, setRefundOverride] = useState<string>('');
  const [custReturnSuccess, setCustReturnSuccess] = useState('');
  const [custReturnError, setCustReturnError] = useState('');

  // State for Supplier Returns
  const [selectedProductId, setSelectedProductId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierQty, setSupplierQty] = useState(1);
  const [supplierReason, setSupplierReason] = useState('');
  const [suppReturnSuccess, setSuppReturnSuccess] = useState('');
  const [suppReturnError, setSuppReturnError] = useState('');

  // Force re-renders when db updates
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  // Fetch lists
  const sales = db.getSales(business.id);
  const products = db.getProducts(business.id);
  const customerReturns = db.getCustomerReturns(business.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const supplierReturns = db.getSupplierReturns(business.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Search Sales
  const filteredSales = sales.filter(s => {
    if (s.status === 'refunded') return false; // Fully refunded sales are skipped
    const query = saleSearchQuery.trim().toLowerCase();
    if (!query) return false;
    return s.id.toLowerCase().includes(query) || 
           (s.customerName && s.customerName.toLowerCase().includes(query));
  });

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedItemId(sale.items[0]?.itemId || '');
    setReturnQty(1);
    setRefundOverride('');
    setCustReturnError('');
    setCustReturnSuccess('');
  };

  const handleProcessCustomerReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !selectedItemId) return;

    const saleItem = selectedSale.items.find(i => i.itemId === selectedItemId);
    if (!saleItem) {
      setCustReturnError('Selected product is not part of this sale.');
      return;
    }

    if (returnQty <= 0) {
      setCustReturnError('Return quantity must be greater than zero.');
      return;
    }

    if (returnQty > saleItem.quantity) {
      setCustReturnError(`Return quantity exceeds the purchased quantity of ${saleItem.quantity}.`);
      return;
    }

    // Proportional Refund calculation
    const baseItemTotal = saleItem.price * returnQty;
    // Account for sale discount proportion
    const calculatedRefund = selectedSale.discount > 0 
      ? Number((baseItemTotal * (1 - selectedSale.discount / 100)).toFixed(2))
      : Number(baseItemTotal.toFixed(2));

    const finalRefund = refundOverride !== '' ? Number(refundOverride) : calculatedRefund;

    if (isNaN(finalRefund) || finalRefund < 0) {
      setCustReturnError('Please enter a valid refund amount.');
      return;
    }

    // Execute Refund / Return
    const product = products.find(p => p.id === selectedItemId);
    const prevStock = product ? product.stockQuantity : 0;
    const nextStock = prevStock + returnQty;

    // 1. Save Return record
    const newReturn: CustomerReturn = {
      id: 'cret-' + Math.random().toString(36).substr(2, 9),
      businessId: business.id,
      branchId: user.branchId, // Track branch if assigned
      saleId: selectedSale.id,
      customerId: selectedSale.customerId,
      customerName: selectedSale.customerName || 'Walk-in Customer',
      productId: selectedItemId,
      productName: saleItem.name,
      quantity: returnQty,
      refundAmount: finalRefund,
      reason: returnReason,
      employeeId: user.id,
      employeeName: user.name,
      currency: business.currency || 'GHC',
      createdAt: new Date().toISOString()
    };

    db.saveCustomerReturn(business.id, newReturn);

    // 2. Adjust stock inventory if product exists
    if (product) {
      db.saveProduct(business.id, {
        ...product,
        stockQuantity: nextStock
      });
    }

    // 3. Log Audit Activity with comprehensive details
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'Customer Return Logged',
      moduleAffected: 'Returns',
      itemAffected: saleItem.name,
      previousValue: `Stock: ${prevStock}`,
      newValue: `Stock: ${nextStock} (Refunded ${formatCurrency(finalRefund, business.currency)})`,
      details: `Processed customer return for ${returnQty}x "${saleItem.name}" from Sale #${selectedSale.id}. Reason: ${returnReason}. Refunded: ${formatCurrency(finalRefund, business.currency)}.`,
      branchId: user.branchId
    });

    setCustReturnSuccess(`Successfully returned ${returnQty}x "${saleItem.name}". ${formatCurrency(finalRefund, business.currency)} refunded.`);
    setSelectedSale(null);
    setSaleSearchQuery('');
    forceUpdate();
  };

  const handleProcessSupplierReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setSuppReturnError('Please select a product.');
      return;
    }

    if (!supplierName.trim()) {
      setSuppReturnError('Please enter supplier details.');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      setSuppReturnError('Product not found.');
      return;
    }

    if (supplierQty <= 0) {
      setSuppReturnError('Quantity must be greater than zero.');
      return;
    }

    if (supplierQty > product.stockQuantity) {
      setSuppReturnError(`Quantity exceeds available stock of ${product.stockQuantity}.`);
      return;
    }

    const prevStock = product.stockQuantity;
    const nextStock = prevStock - supplierQty;

    // 1. Create Supplier Return record
    const newReturn: SupplierReturn = {
      id: 'sret-' + Math.random().toString(36).substr(2, 9),
      businessId: business.id,
      branchId: user.branchId,
      supplierName: supplierName.trim(),
      productId: product.id,
      productName: product.name,
      quantity: supplierQty,
      reason: supplierReason.trim() || 'Returned to vendor',
      employeeId: user.id,
      employeeName: user.name,
      createdAt: new Date().toISOString()
    };

    db.saveSupplierReturn(business.id, newReturn);

    // 2. Adjust stock
    db.saveProduct(business.id, {
      ...product,
      stockQuantity: nextStock
    });

    // 3. Log Activity
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'Supplier Return Logged',
      moduleAffected: 'Returns',
      itemAffected: product.name,
      previousValue: `Stock: ${prevStock}`,
      newValue: `Stock: ${nextStock}`,
      details: `Returned ${supplierQty}x "${product.name}" to supplier "${supplierName}". Reason: ${supplierReason}.`,
      branchId: user.branchId
    });

    setSuppReturnSuccess(`Successfully returned ${supplierQty}x "${product.name}" to "${supplierName}".`);
    setSelectedProductId('');
    setSupplierName('');
    setSupplierQty(1);
    setSupplierReason('');
    forceUpdate();
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-emerald-800" /> Returns &amp; Refunds Management
          </h2>
          <p className="text-xs text-slate-500">Manage client refunds, damaged items, and inventory return workflows.</p>
        </div>

        {/* Sub-tabs selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => { setActiveSubTab('customer'); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'customer' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Customer Returns
          </button>
          <button
            onClick={() => { setActiveSubTab('supplier'); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'supplier' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Supplier Returns
          </button>
        </div>
      </div>

      {activeSubTab === 'customer' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* New Customer Return Form Column */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <CornerDownLeft className="h-4 w-4 text-emerald-800" /> Log Customer Return
              </h3>
              <p className="text-[11px] text-slate-400">Search sale orders to initialize a customer refund request.</p>
            </div>

            {custReturnSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                {custReturnSuccess}
              </div>
            )}

            {custReturnError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {custReturnError}
              </div>
            )}

            {!selectedSale ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={saleSearchQuery}
                    onChange={(e) => {
                      setSaleSearchQuery(e.target.value);
                      setCustReturnError('');
                      setCustReturnSuccess('');
                    }}
                    placeholder="Search Sale ID or Customer Name..."
                    className="pl-9 pr-4 py-3 w-full border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>

                {filteredSales.length > 0 && (
                  <div className="border border-slate-100 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-50 bg-white shadow-inner">
                    {filteredSales.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSale(s)}
                        className="w-full text-left p-3 hover:bg-slate-50 transition flex justify-between items-center text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate">Sale #{s.id}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{s.customerName || 'Walk-in Customer'} &bull; {s.employeeName}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-bold text-slate-800">{formatCurrency(s.total, s.currency || business.currency)}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {saleSearchQuery.trim() !== '' && filteredSales.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No active or matching sale transactions found.
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleProcessCustomerReturn} className="space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5 relative">
                  <button
                    type="button"
                    onClick={() => setSelectedSale(null)}
                    className="absolute right-3 top-3 text-[10px] font-bold text-emerald-800 hover:underline"
                  >
                    Change Order
                  </button>
                  <p className="font-bold text-slate-700">Selected Sale Order</p>
                  <p className="text-slate-500"><strong className="text-slate-800">ID:</strong> #{selectedSale.id}</p>
                  <p className="text-slate-500"><strong className="text-slate-800">Client:</strong> {selectedSale.customerName || 'Walk-in Customer'}</p>
                  <p className="text-slate-500"><strong className="text-slate-800">Total Charged:</strong> {formatCurrency(selectedSale.total, selectedSale.currency || business.currency)} (Discount: {selectedSale.discount}%)</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Select Product to Return</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setReturnQty(1);
                      setRefundOverride('');
                    }}
                    className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                  >
                    {selectedSale.items.map(item => (
                      <option key={item.itemId} value={item.itemId}>
                        {item.name} ({formatCurrency(item.price, selectedSale.currency || business.currency)} x {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Return Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={selectedSale.items.find(i => i.itemId === selectedItemId)?.quantity || 1}
                      value={returnQty}
                      onChange={(e) => {
                        setReturnQty(Math.max(1, Number(e.target.value)));
                        setRefundOverride('');
                      }}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Refund Amount ({getCurrencySymbol(business.currency)})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Auto-calculated"
                      value={refundOverride}
                      onChange={(e) => setRefundOverride(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Return Reason</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Damaged item">Damaged item</option>
                    <option value="Wrong item supplied">Wrong item supplied</option>
                    <option value="Customer changed mind">Customer changed mind</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <RotateCcw className="h-4 w-4" /> Process Return &amp; Refund
                </button>
              </form>
            )}
          </div>

          {/* Customer Return History Column */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Customer Returns History</h3>
              <p className="text-[11px] text-slate-400">View logs of items returned by clients and corresponding refunds.</p>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-4">Date &amp; ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Product &amp; Qty</th>
                    <th className="py-3 px-4">Refund</th>
                    <th className="py-3 px-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs">
                  {customerReturns.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{new Date(r.createdAt).toLocaleDateString()}</p>
                        <p className="text-[9px] font-mono text-slate-400">Sale: #{r.saleId}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-700">{r.customerName}</p>
                        <p className="text-[9px] text-slate-400">Staff: {r.employeeName}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        <p className="font-bold text-slate-800">{r.productName}</p>
                        <p className="text-slate-400 text-[10px]">Returned: <strong className="text-slate-600">{r.quantity} pcs</strong></p>
                      </td>
                      <td className="py-3.5 px-4 font-black text-rose-700">
                        {formatCurrency(r.refundAmount, r.currency || business.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 font-semibold text-[9px] rounded-full">
                          {r.reason}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {customerReturns.length === 0 && (
                    <tr key="empty-customer-returns">
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No customer refunds or product returns recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* New Supplier Return Form Column */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-amber-600" /> Log Supplier Return
              </h3>
              <p className="text-[11px] text-slate-400">Return catalog products to vendor/supplier and deduct inventory.</p>
            </div>

            {suppReturnSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                {suppReturnSuccess}
              </div>
            )}

            {suppReturnError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {suppReturnError}
              </div>
            )}

            <form onSubmit={handleProcessSupplierReturn} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Select Product to Return</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSupplierQty(1);
                    setSuppReturnError('');
                    setSuppReturnSuccess('');
                  }}
                  className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stockQuantity} &bull; Code: {p.barcode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Supplier Name &amp; Info</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Acme Wholesale Ltd."
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Return Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={selectedProductId ? (products.find(p => p.id === selectedProductId)?.stockQuantity || 1) : undefined}
                  value={supplierQty}
                  onChange={(e) => setSupplierQty(Math.max(1, Number(e.target.value)))}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Reason for Supplier Return</label>
                <textarea
                  value={supplierReason}
                  onChange={(e) => setSupplierReason(e.target.value)}
                  placeholder="Provide detailed description (e.g. Defective batch, overstock, wrong item)..."
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 h-20 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Truck className="h-4 w-4" /> Ship Supplier Return
              </button>
            </form>
          </div>

          {/* Supplier Return History Column */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Supplier Returns History</h3>
              <p className="text-[11px] text-slate-400">Logs of defective/surplus inventory shipped back to vendors.</p>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Product &amp; Qty</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs">
                  {supplierReturns.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-700">{r.supplierName}</p>
                        <p className="text-[9px] text-slate-400">Responsible: {r.employeeName}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        <p className="font-bold text-slate-800">{r.productName}</p>
                        <p className="text-slate-500 text-[10px]">Quantity: <strong className="text-slate-700">{r.quantity} pcs</strong></p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs">
                        {r.reason}
                      </td>
                    </tr>
                  ))}
                  {supplierReturns.length === 0 && (
                    <tr key="empty-supplier-returns">
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No supplier returns logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
