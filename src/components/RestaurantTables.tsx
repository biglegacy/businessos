import React, { useState, useEffect } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, RestaurantTable, RestaurantOrder } from '../types';
import { 
  Plus, 
  Trash2, 
  Layers, 
  X, 
  Grid, 
  Shuffle, 
  Divide, 
  CheckCircle, 
  UserPlus, 
  Coffee, 
  Users 
} from 'lucide-react';

interface RestaurantTablesProps {
  business: Business;
  currentUser: any;
}

export const RestaurantTables: React.FC<RestaurantTablesProps> = ({ business, currentUser }) => {
  const [tables, setTables] = useState<RestaurantTable[]>(() => db.getRestaurantTables(business.id));
  const [activeOrders, setActiveOrders] = useState<RestaurantOrder[]>(() => db.getRestaurantOrders(business.id).filter(o => o.status !== 'Completed' && o.status !== 'Cancelled'));

  // Table drafting state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');

  // Interative Table Management states
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  
  // Actions states
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [targetTableId, setTargetTableId] = useState('');

  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeTargetTableId, setMergeTargetTableId] = useState('');

  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [splitCount, setSplitCount] = useState('2');

  const refreshData = () => {
    setTables(db.getRestaurantTables(business.id));
    setActiveOrders(db.getRestaurantOrders(business.id).filter(o => o.status !== 'Completed' && o.status !== 'Cancelled'));
  };

  useEffect(() => {
    refreshData();
  }, [business.id]);

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim() || !capacity) {
      alert('Please fill in all fields.');
      return;
    }

    // Prevent duplicate table numbers
    if (tables.some(t => t.number.toLowerCase() === tableNumber.trim().toLowerCase())) {
      alert('A table with this number/name already exists.');
      return;
    }

    const newTable: RestaurantTable = {
      id: 'tbl-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      number: tableNumber.trim(),
      capacity: parseInt(capacity),
      status: 'Available',
      updatedAt: new Date().toISOString()
    };

    db.saveRestaurantTable(business.id, newTable);
    alert(`Table "${newTable.number}" created successfully.`);
    setTableNumber('');
    setIsAddModalOpen(false);
    refreshData();
  };

  const handleDeleteTable = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this table configuration?')) {
      db.deleteRestaurantTable(business.id, id);
      alert('Table deleted successfully.');
      refreshData();
    }
  };

  // Toggle Table status to Reserved or Available (if unoccupied)
  const handleToggleReserved = (tbl: RestaurantTable, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tbl.status === 'Occupied') return;
    const nextStatus = tbl.status === 'Reserved' ? 'Available' : 'Reserved';
    db.saveRestaurantTable(business.id, { ...tbl, status: nextStatus });
    refreshData();
  };

  // Initiate Open / Occupy empty table
  const handleOpenTableTicket = (tbl: RestaurantTable) => {
    if (tbl.status === 'Occupied') {
      setSelectedTable(tbl);
      return;
    }

    const orderNo = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    const draftOrder: RestaurantOrder = {
      id: 'ord_tbl-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      orderNumber: orderNo,
      tableId: tbl.id,
      tableNumber: tbl.number,
      customerName: `Table ${tbl.number} Guest`,
      orderType: 'Dine-in',
      items: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      paymentMethod: 'cash',
      paymentStatus: 'unpaid',
      status: 'Preparing',
      kitchenStatus: 'NEW',
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    // Save ticket and occupy table
    db.saveRestaurantOrder(business.id, draftOrder);
    db.saveRestaurantTable(business.id, {
      ...tbl,
      status: 'Occupied',
      currentOrderId: draftOrder.id
    });

    alert(`Opened ticket ${orderNo} for Table ${tbl.number}. Place orders in POS console.`);
    refreshData();
  };

  // Transfer Ticket
  const handleTransferTicket = () => {
    if (!selectedTable || !targetTableId) return;
    const currentTbl = tables.find(t => t.id === selectedTable.id);
    const targetTbl = tables.find(t => t.id === targetTableId);

    if (!currentTbl || !targetTbl || !currentTbl.currentOrderId) return;

    // Update target order representation
    const activeOrder = activeOrders.find(o => o.id === currentTbl.currentOrderId);
    if (activeOrder) {
      db.saveRestaurantOrder(business.id, {
        ...activeOrder,
        tableId: targetTbl.id,
        tableNumber: targetTbl.number
      });
    }

    // Free current table, occupy target table
    db.saveRestaurantTable(business.id, { ...currentTbl, status: 'Available', currentOrderId: undefined });
    db.saveRestaurantTable(business.id, { ...targetTbl, status: 'Occupied', currentOrderId: currentTbl.currentOrderId });

    alert(`Ticket successfully transferred from Table ${currentTbl.number} to Table ${targetTbl.number}.`);
    setIsTransferOpen(false);
    setSelectedTable(null);
    refreshData();
  };

  // Merge tickets of Table A and Table B
  const handleMergeTickets = () => {
    if (!selectedTable || !mergeTargetTableId) return;
    const currentTbl = tables.find(t => t.id === selectedTable.id);
    const targetTbl = tables.find(t => t.id === mergeTargetTableId);

    if (!currentTbl || !targetTbl || !currentTbl.currentOrderId || !targetTbl.currentOrderId) return;

    const orderA = activeOrders.find(o => o.id === currentTbl.currentOrderId);
    const orderB = activeOrders.find(o => o.id === targetTbl.currentOrderId);

    if (!orderA || !orderB) return;

    // Combine order lists
    const mergedItems = [...orderB.items];
    orderA.items.forEach(itemA => {
      const existing = mergedItems.find(itemB => itemB.menuItemId === itemA.menuItemId);
      if (existing) {
        existing.quantity += itemA.quantity;
      } else {
        mergedItems.push({ ...itemA });
      }
    });

    const subtotal = mergedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal; // Simulating simple tax-free merge

    // Save combined order onto target table (Order B)
    db.saveRestaurantOrder(business.id, {
      ...orderB,
      items: mergedItems,
      subtotal,
      total
    });

    // Delete order A, free Table A
    db.deleteRestaurantOrder(business.id, orderA.id);
    db.saveRestaurantTable(business.id, { ...currentTbl, status: 'Available', currentOrderId: undefined });

    alert(`Tables merged. All items combined onto Table ${targetTbl.number}'s ticket.`);
    setIsMergeOpen(false);
    setSelectedTable(null);
    refreshData();
  };

  // Close table directly (marks order as paid/completed and frees table)
  const handleCloseTable = (tbl: RestaurantTable) => {
    if (!tbl.currentOrderId) return;
    const order = activeOrders.find(o => o.id === tbl.currentOrderId);
    if (!order) return;

    if (confirm(`Close service for Table ${tbl.number} and settle total bill of ${formatCurrency(order.total || 0, business.currency)}?`)) {
      // Settle Order
      db.saveRestaurantOrder(business.id, {
        ...order,
        status: 'Completed',
        paymentStatus: 'paid'
      });

      // Free table
      db.saveRestaurantTable(business.id, {
        ...tbl,
        status: 'Available',
        currentOrderId: undefined
      });

      alert(`Table ${tbl.number} closed and marked paid.`);
      setSelectedTable(null);
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Visual Table Management</h2>
          <p className="text-xs text-slate-500 mt-1">Configure layout, view guest densities, track open checks, split tickets, and direct service traffic.</p>
        </div>
        {['owner', 'manager', 'waiter'].includes(currentUser.role) && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Service Table</span>
          </button>
        )}
      </div>

      {/* Tables layout grid */}
      {tables.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
          <Grid className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-700">No tables configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Create table configurations representing your dining room floor, bars, or private lounges.</p>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 cursor-pointer"
          >
            Add Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {tables.map(tbl => {
            const activeOrder = activeOrders.find(o => o.id === tbl.currentOrderId);
            let colorClass = 'border-emerald-100 bg-emerald-50/70 text-emerald-800'; // Available
            if (tbl.status === 'Occupied') colorClass = 'border-rose-100 bg-rose-50 text-rose-800';
            if (tbl.status === 'Reserved') colorClass = 'border-amber-100 bg-amber-50/70 text-amber-800';

            return (
              <button 
                key={tbl.id}
                id={`table_grid_${tbl.id}`}
                onClick={() => handleOpenTableTicket(tbl)}
                className={`p-5 rounded-3xl border shadow-xs text-center flex flex-col justify-between items-center h-48 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md select-none group relative ${colorClass}`}
              >
                {/* Delete button (owner only) */}
                {['owner', 'manager'].includes(currentUser.role) && (
                  <button 
                    onClick={(e) => handleDeleteTable(tbl.id, e)}
                    className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Table"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Status indicator */}
                <span className="text-[9px] font-black uppercase tracking-widest bg-white/70 px-2 py-0.5 rounded-full border border-black/5">
                  {tbl.status}
                </span>

                {/* Table icon with number */}
                <div className="flex flex-col items-center space-y-1 my-3">
                  <span className="text-2xl font-black tracking-tight">{tbl.number}</span>
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Max: {tbl.capacity}
                  </span>
                </div>

                {/* Bill preview or actions */}
                {tbl.status === 'Occupied' && activeOrder ? (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold block truncate max-w-[120px]">{activeOrder.orderNumber}</span>
                    <span className="text-xs font-black text-rose-600 block">{formatCurrency(activeOrder.total, business.currency)}</span>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => handleToggleReserved(tbl, e)}
                    disabled={tbl.status === 'Occupied'}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-white/50 hover:bg-white border border-slate-200/50 py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {tbl.status === 'Reserved' ? 'Unreserve' : 'Reserve'}
                  </button>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* POPUP DETAIL DRAWER ON OCCUPIED TABLES */}
      {selectedTable && selectedTable.status === 'Occupied' && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-rose-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Table {selectedTable.number} Ticket</h3>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Active Dine-in Order</span>
              </div>
              <button 
                onClick={() => setSelectedTable(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Active Ticket summary */}
              {(() => {
                const order = activeOrders.find(o => o.id === selectedTable.currentOrderId);
                if (!order) return <p className="text-xs text-slate-400">Order not loaded. Please re-open.</p>;
                return (
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                      <div className="flex justify-between text-xs text-slate-500 font-bold">
                        <span>Invoice: {order.orderNumber}</span>
                        <span className="text-rose-600 uppercase tracking-widest font-black">{order.status}</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {order.items.length === 0 ? (
                          <p className="py-2 text-slate-400 text-center font-semibold italic">No food items added to table. Go to POS screen to append.</p>
                        ) : (
                          order.items.map((it, idx) => (
                            <div key={idx} className="py-2 flex justify-between">
                              <span>{it.name} (x{it.quantity})</span>
                              <span className="font-bold">{formatCurrency(it.price * it.quantity, business.currency)}</span>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-800">
                        <span>Bill Total:</span>
                        <span>{formatCurrency(order.total, business.currency)}</span>
                      </div>
                    </div>

                    {/* ACTIONS CONTAINER */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <button 
                        onClick={() => setIsTransferOpen(true)}
                        className="py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <Shuffle className="h-4.5 w-4.5 text-slate-400" />
                        <span>Transfer Table</span>
                      </button>

                      <button 
                        onClick={() => setIsMergeOpen(true)}
                        className="py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <Layers className="h-4.5 w-4.5 text-slate-400" />
                        <span>Merge Tables</span>
                      </button>

                      <button 
                        onClick={() => setIsSplitBillOpen(true)}
                        className="py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <Divide className="h-4.5 w-4.5 text-slate-400" />
                        <span>Split Bill</span>
                      </button>

                      <button 
                        onClick={() => handleCloseTable(selectedTable)}
                        className="py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex flex-col items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                        <span>Close & Pay</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ADD TABLE CONFIG MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">Add Restaurant Table</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Table Name / Number *</label>
                <input 
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. Table 1, VIP Board, Bar Counter"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sitting Capacity (Pax) *</label>
                <input 
                  type="number"
                  required
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="4"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER ACTION POPUP */}
      {isTransferOpen && selectedTable && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm">Transfer Table {selectedTable.number} Ticket</h3>
              <button onClick={() => setIsTransferOpen(false)} className="p-1.5 text-slate-400 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Target Empty Table</label>
                <select 
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
                >
                  <option value="">-- Choose Empty Table --</option>
                  {tables.filter(t => t.id !== selectedTable.id && t.status === 'Available').map(t => (
                    <option key={t.id} value={t.id}>Table {t.number} (Cap: {t.capacity})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsTransferOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleTransferTicket}
                  disabled={!targetTableId}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MERGE ACTION POPUP */}
      {isMergeOpen && selectedTable && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm">Merge Tickets</h3>
              <button onClick={() => setIsMergeOpen(false)} className="p-1.5 text-slate-400 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-400 leading-normal">
                Combine the active food list of Table {selectedTable.number} onto another occupied table. Once combined, Table {selectedTable.number} is released back to active available pool.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Occupied Table</label>
                <select 
                  value={mergeTargetTableId}
                  onChange={(e) => setMergeTargetTableId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
                >
                  <option value="">-- Choose Occupied Table --</option>
                  {tables.filter(t => t.id !== selectedTable.id && t.status === 'Occupied').map(t => (
                    <option key={t.id} value={t.id}>Table {t.number}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsMergeOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleMergeTickets}
                  disabled={!mergeTargetTableId}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Confirm Merge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT BILL POPUP */}
      {isSplitBillOpen && selectedTable && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm">Split Guests Bill</h3>
              <button onClick={() => setIsSplitBillOpen(false)} className="p-1.5 text-slate-400 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-6 space-y-4">
              {(() => {
                const order = activeOrders.find(o => o.id === selectedTable.currentOrderId);
                if (!order) return null;
                const count = parseInt(splitCount) || 2;
                const splitTotal = order.total / count;

                return (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">Bill Split Breakdown</span>
                      <p className="font-extrabold text-slate-700">Total Check: {formatCurrency(order.total, business.currency)}</p>
                      <p className="text-sm font-black text-emerald-600">Each Pays: {formatCurrency(splitTotal, business.currency)}</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Number of Guests</label>
                      <input 
                        type="number"
                        min="2"
                        value={splitCount}
                        onChange={(e) => setSplitCount(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 font-bold text-center"
                      />
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsSplitBillOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    alert('Bill split calculations updated. Process payment directly in POS terminal with split payment option.');
                    setIsSplitBillOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
