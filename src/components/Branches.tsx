import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, Product, Branch, StockTransfer } from '../types';
import { 
  Building2, MapPin, Plus, Edit, Trash2, ArrowRightLeft, Users, 
  Package, Calendar, CheckCircle, AlertTriangle, RefreshCw, Layers
} from 'lucide-react';

interface BranchesProps {
  business: Business;
  user: User;
}

export function Branches({ business, user }: BranchesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'manage' | 'transfers'>('manage');

  // Prevent direct tab/URL access if stock transfer is disabled
  React.useEffect(() => {
    if (activeSubTab === 'transfers' && (!business.isStockTransferEnabled || !db.isFeatureEnabled('inter_branch_stock_transfer'))) {
      setActiveSubTab('manage');
    }
  }, [activeSubTab, business.isStockTransferEnabled]);
  
  // State for Branch CRUD
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [branchSuccess, setBranchSuccess] = useState('');
  const [branchError, setBranchError] = useState('');

  // State for Employee Assignment
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');

  // State for Stock Transfer
  const [transferFromBranch, setTransferFromBranch] = useState('');
  const [transferToBranch, setTransferToBranch] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferSuccess, setTransferSuccess] = useState('');
  const [transferError, setTransferError] = useState('');

  // Force re-renders
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  // Fetch lists
  const branches = db.getBranches(business.id);
  const employees = db.getUsers().filter(u => u.businessId === business.id);
  const products = db.getProducts(business.id);
  const sales = db.getSales(business.id);
  const transfers = db.getStockTransfers(business.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isOwnerOrAdmin = ['owner', 'admin', 'SUPER_ADMIN'].includes(user.role);

  // Filter products by transfer source branch and only display with stock > 0
  const sourceProducts = transferFromBranch 
    ? products.filter(p => p.branchId === transferFromBranch && p.stockQuantity > 0)
    : [];

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchLocation.trim()) {
      setBranchError('Please complete all fields.');
      return;
    }

    const previousValue = editingBranchId 
      ? `Branch: ${branches.find(b => b.id === editingBranchId)?.name}`
      : 'None (New Branch)';

    const branchId = editingBranchId || 'br-' + Math.random().toString(36).substr(2, 9);
    
    const targetBranch: Branch = {
      id: branchId,
      businessId: business.id,
      name: branchName.trim(),
      location: branchLocation.trim(),
      createdAt: editingBranchId 
        ? (branches.find(b => b.id === editingBranchId)?.createdAt || new Date().toISOString()) 
        : new Date().toISOString()
    };

    db.saveBranch(business.id, targetBranch);

    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: editingBranchId ? 'Branch Updated' : 'Branch Created',
      moduleAffected: 'Branches',
      itemAffected: targetBranch.name,
      previousValue,
      newValue: `Name: ${targetBranch.name}, Location: ${targetBranch.location}`,
      details: `${editingBranchId ? 'Updated details for' : 'Created new'} branch "${targetBranch.name}" located at "${targetBranch.location}".`,
      branchId: user.branchId
    });

    setBranchSuccess(`Branch "${targetBranch.name}" successfully saved!`);
    setBranchName('');
    setBranchLocation('');
    setIsAddingBranch(false);
    setEditingBranchId(null);
    forceUpdate();
  };

  const handleEditBranch = (br: Branch) => {
    setEditingBranchId(br.id);
    setBranchName(br.name);
    setBranchLocation(br.location);
    setIsAddingBranch(true);
    setBranchError('');
    setBranchSuccess('');
  };

  const handleDeleteBranch = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete branch "${name}"? Unassigning employees will occur.`)) {
      return;
    }

    db.deleteBranch(business.id, id);

    // Unassign users from this branch
    const affectedEmployees = employees.filter(e => e.branchId === id);
    affectedEmployees.forEach(emp => {
      db.saveUser({
        ...emp,
        branchId: undefined
      });
    });

    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'Branch Deleted',
      moduleAffected: 'Branches',
      itemAffected: name,
      previousValue: `Branch: ${name}`,
      newValue: 'Deleted',
      details: `Deleted branch "${name}" and unassigned ${affectedEmployees.length} employees.`,
      branchId: user.branchId
    });

    setBranchSuccess(`Branch "${name}" successfully deleted.`);
    forceUpdate();
  };

  const handleAssignEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      setAssignError('Please select an employee.');
      return;
    }

    const emp = employees.find(emp => emp.id === selectedEmpId);
    if (!emp) return;

    const previousValue = emp.branchId 
      ? `Branch: ${branches.find(b => b.id === emp.branchId)?.name || 'Unknown'}`
      : 'Unassigned';

    const branch = branches.find(b => b.id === targetBranchId);
    const newValueName = branch ? branch.name : 'Unassigned';

    db.saveUser({
      ...emp,
      branchId: targetBranchId || undefined
    });

    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'Employee Branch Assignment',
      moduleAffected: 'Branches',
      itemAffected: emp.name,
      previousValue,
      newValue: `Branch: ${newValueName}`,
      details: `Assigned employee "${emp.name}" to branch "${newValueName}".`,
      branchId: user.branchId
    });

    setAssignSuccess(`Assigned "${emp.name}" to "${newValueName}" successfully.`);
    setSelectedEmpId('');
    setTargetBranchId('');
    forceUpdate();
  };

  const handleStockTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!business.isStockTransferEnabled) {
      setTransferError('Inter-Branch Stock Transfer is disabled for this business.');
      return;
    }
    if (!transferFromBranch || !transferToBranch || !transferProductId) {
      setTransferError('Please select sending branch, receiving branch, and the product.');
      return;
    }

    if (transferFromBranch === transferToBranch) {
      setTransferError('Source branch and target branch must be different.');
      return;
    }

    const sourceProduct = products.find(p => p.id === transferProductId && p.branchId === transferFromBranch);
    if (!sourceProduct) {
      setTransferError('Selected product not found in the source branch.');
      return;
    }

    if (transferQty <= 0) {
      setTransferError('Quantity must be greater than zero.');
      return;
    }

    if (transferQty > sourceProduct.stockQuantity) {
      setTransferError(`Insufficient stock in source branch. Available: ${sourceProduct.stockQuantity}`);
      return;
    }

    // Deduct stock from source product
    const prevSourceStock = sourceProduct.stockQuantity;
    const nextSourceStock = prevSourceStock - transferQty;
    db.saveProduct(business.id, {
      ...sourceProduct,
      stockQuantity: nextSourceStock
    });

    // Add stock to target branch
    // Search if target branch already has a product with the same barcode/SKU
    const targetProduct = products.find(p => p.branchId === transferToBranch && p.barcode === sourceProduct.barcode);
    let prevTargetStock = 0;
    let nextTargetStock = transferQty;

    if (targetProduct) {
      prevTargetStock = targetProduct.stockQuantity;
      nextTargetStock = prevTargetStock + transferQty;
      db.saveProduct(business.id, {
        ...targetProduct,
        stockQuantity: nextTargetStock
      });
    } else {
      // Create a brand new product replica for target branch
      const newProductForTarget: Product = {
        id: 'p-' + Math.random().toString(36).substr(2, 9),
        businessId: business.id,
        branchId: transferToBranch,
        name: sourceProduct.name,
        category: sourceProduct.category,
        description: sourceProduct.description,
        costPrice: sourceProduct.costPrice,
        sellingPrice: sourceProduct.sellingPrice,
        stockQuantity: transferQty,
        barcode: sourceProduct.barcode,
        lowStockThreshold: sourceProduct.lowStockThreshold,
        imageUrl: sourceProduct.imageUrl
      };
      db.saveProduct(business.id, newProductForTarget);
    }

    // Log the transfer
    const fromBr = branches.find(b => b.id === transferFromBranch)!;
    const toBr = branches.find(b => b.id === transferToBranch)!;

    const newTransfer: StockTransfer = {
      id: 'st-' + Math.random().toString(36).substr(2, 9),
      businessId: business.id,
      fromBranchId: transferFromBranch,
      fromBranchName: fromBr.name,
      toBranchId: transferToBranch,
      toBranchName: toBr.name,
      productId: sourceProduct.id,
      productName: sourceProduct.name,
      quantity: transferQty,
      employeeId: user.id,
      employeeName: user.name,
      status: 'Completed',
      createdAt: new Date().toISOString()
    };

    db.saveStockTransfer(business.id, newTransfer);

    // Audit Log
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'Inter-Branch Stock Transfer',
      moduleAffected: 'Branches',
      itemAffected: sourceProduct.name,
      previousValue: `Source Stock: ${prevSourceStock}, Target Stock: ${prevTargetStock}`,
      newValue: `Source Stock: ${nextSourceStock}, Target Stock: ${nextTargetStock}`,
      details: `Transferred ${transferQty}x "${sourceProduct.name}" from branch "${fromBr.name}" to branch "${toBr.name}".`,
      branchId: user.branchId
    });

    setTransferSuccess(`Transferred ${transferQty}x "${sourceProduct.name}" to "${toBr.name}" successfully!`);
    setTransferFromBranch('');
    setTransferToBranch('');
    setTransferProductId('');
    setTransferQty(1);
    forceUpdate();
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-800" /> Multi-Branch Workspace Controller
          </h2>
          <p className="text-xs text-slate-500">Manage multiple commercial locations, staff assignments, and handle internal product transfers.</p>
        </div>

        {/* Sub-tabs selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => { setActiveSubTab('manage'); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'manage' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Manage Branches &amp; Staff
          </button>
          {business.isStockTransferEnabled && db.isFeatureEnabled('inter_branch_stock_transfer') && (
            <button
              onClick={() => { setActiveSubTab('transfers'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'transfers' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Inter-Branch Stock Transfers
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'manage' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create / Edit Branch Column */}
          {isOwnerOrAdmin && (
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-emerald-800" /> {editingBranchId ? 'Edit Location' : 'Register New Branch'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Deploy an isolated operating branch under your enterprise account.</p>
                </div>

                {branchSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                    {branchSuccess}
                  </div>
                )}

                {branchError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                    {branchError}
                  </div>
                )}

                <form onSubmit={handleSaveBranch} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Airport Residential Outlet"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Physical Location / Address</label>
                    <input
                      type="text"
                      value={branchLocation}
                      onChange={(e) => setBranchLocation(e.target.value)}
                      placeholder="e.g. Liberation Road, Accra"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    {editingBranchId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBranchId(null);
                          setBranchName('');
                          setBranchLocation('');
                        }}
                        className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      {editingBranchId ? 'Save Changes' : 'Deploy Branch'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Assign Employee to Branch Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-800" /> Assign Employee Branch
                  </h3>
                  <p className="text-[11px] text-slate-400">Lock employees to specific physical workspaces.</p>
                </div>

                {assignSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                    {assignSuccess}
                  </div>
                )}

                {assignError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                    {assignError}
                  </div>
                )}

                <form onSubmit={handleAssignEmployee} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Select Employee</label>
                    <select
                      value={selectedEmpId}
                      onChange={(e) => {
                        setSelectedEmpId(e.target.value);
                        setAssignSuccess('');
                        setAssignError('');
                      }}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                      required
                    >
                      <option value="">-- Choose Staff member --</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.role.toUpperCase()}) &bull; {e.branchId ? (branches.find(b => b.id === e.branchId)?.name || 'Assigned') : 'Unassigned'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Select Workplace Branch</label>
                    <select
                      value={targetBranchId}
                      onChange={(e) => setTargetBranchId(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Unassigned / Remote (Access All) --</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Confirm Assignment
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Branches Listing Grid */}
          <div className={`${isOwnerOrAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4`}>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Active Enterprise Outlets</h3>
              <p className="text-[11px] text-slate-400">Isolated database structures deployed under your primary workspace.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map(br => {
                const assignedStaffCount = employees.filter(e => e.branchId === br.id).length;
                const branchProds = products.filter(p => p.branchId === br.id);
                const branchSales = sales.filter(s => s.branchId === br.id);
                const salesTotal = branchSales.reduce((acc, curr) => acc + curr.total, 0);

                return (
                  <div key={br.id} className="p-4 border border-slate-200 rounded-2xl space-y-4 relative hover:border-slate-300 transition">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-emerald-800" /> {br.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" /> {br.location}
                        </p>
                      </div>

                      {isOwnerOrAdmin && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditBranch(br)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                            title="Edit details"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBranch(br.id, br.name)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                            title="Delete branch"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Staff</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{assignedStaffCount}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Products</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{branchProds.length}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Total Sales</p>
                        <p className="text-xs font-black text-emerald-800 mt-0.5">{formatCurrency(salesTotal, business.currency)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {branches.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <p className="text-xs">No physical branches deployed yet.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Deploy locations above to manage isolated warehouse stocks.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Launch Stock Transfer Column */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <ArrowRightLeft className="h-4 w-4 text-emerald-800" /> Inter-Branch Shipment
              </h3>
              <p className="text-[11px] text-slate-400">Transfer inventory securely between branch catalog locations.</p>
            </div>

            {transferSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                {transferSuccess}
              </div>
            )}

            {transferError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {transferError}
              </div>
            )}

            <form onSubmit={handleStockTransfer} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">From Branch (Source)</label>
                <select
                  value={transferFromBranch}
                  onChange={(e) => {
                    setTransferFromBranch(e.target.value);
                    setTransferProductId('');
                    setTransferError('');
                    setTransferSuccess('');
                  }}
                  className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Origin Outlet --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                  ))}
                  {isOwnerOrAdmin && (
                    <option value="main">Main Corporate Repository (All-branch)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">To Branch (Destination)</label>
                <select
                  value={transferToBranch}
                  onChange={(e) => {
                    setTransferToBranch(e.target.value);
                    setTransferError('');
                    setTransferSuccess('');
                  }}
                  className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Destination Outlet --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                  ))}
                  {isOwnerOrAdmin && (
                    <option value="main">Main Corporate Repository (All-branch)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Select Product to Ship</label>
                <select
                  value={transferProductId}
                  onChange={(e) => {
                    setTransferProductId(e.target.value);
                    setTransferQty(1);
                  }}
                  className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500"
                  required
                  disabled={!transferFromBranch || sourceProducts.length === 0}
                >
                  <option value="">
                    {transferFromBranch 
                      ? sourceProducts.length === 0 
                        ? "-- No available products in this branch for transfer --" 
                        : "-- Select Product --"
                      : "-- Choose Origin Outlet First --"}
                  </option>
                  {sourceProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stockQuantity} &bull; SKU: {p.barcode})
                    </option>
                  ))}
                </select>
                {transferFromBranch && sourceProducts.length === 0 && (
                  <p className="mt-1 text-xs text-rose-600 font-semibold">
                    No available products in this branch for transfer.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={transferProductId ? (products.find(p => p.id === transferProductId)?.stockQuantity || 1) : undefined}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-emerald-500"
                  required
                  disabled={!transferProductId}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#064E3B] hover:bg-[#032e23] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <ArrowRightLeft className="h-4 w-4" /> Ship Inventory Stock
              </button>
            </form>
          </div>

          {/* Transfers History Column */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Logistics Transfer History</h3>
              <p className="text-[11px] text-slate-400">Audit logs of finished products transferred between multiple locations.</p>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Inter-Branch Route</th>
                    <th className="py-3 px-4">Product details</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs">
                  {transfers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {new Date(t.createdAt).toLocaleDateString()} <span className="text-[10px] text-slate-500 font-normal">{new Date(t.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span>{t.fromBranchId === 'main' ? 'Corporate' : t.fromBranchName}</span>
                          <span className="text-emerald-700 font-bold">&rarr;</span>
                          <span>{t.toBranchId === 'main' ? 'Corporate' : t.toBranchName}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">Dispatched by: {t.employeeName}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {t.productName}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-800 text-center">
                        {t.quantity}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="h-2.5 w-2.5" /> {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                    <tr key="empty-transfers">
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No inventory stock transfers logged yet.
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
