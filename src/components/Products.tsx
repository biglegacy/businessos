/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { db, getProductPlaceholderSvg, getCurrencySymbol, formatCurrency } from '../lib/db';
import { Product, Service, Business, User } from '../types';
import { ImageUploadInput } from './ImageUploadInput';
import { 
  Package, Plus, Edit, Trash2, Search, X, 
  Upload, Image as ImageIcon, AlertCircle, Sparkles, Filter, FileDown, Building2
} from 'lucide-react';
import { exportProductsToCSV, exportServicesToCSV } from '../lib/csvExport';

interface ProductsProps {
  business: Business;
  user: User;
  onCatalogChanged: () => void;
}

export function Products({ business, user, onCatalogChanged }: ProductsProps) {
  const isServiceBusiness = business.category === 'Professional Services' || business.category === 'Beauty & Wellness';
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'services'>(isServiceBusiness ? 'services' : 'products');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState<string>(
    ['owner', 'admin', 'SUPER_ADMIN'].includes(user.role) ? 'All' : (user.branchId || 'All')
  );

  // Trigger state updates
  const [trigger, setTrigger] = useState(0);
  const forceUpdate = () => {
    setTrigger(prev => prev + 1);
    onCatalogChanged();
  };

  // Modals
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [editingServ, setEditingServ] = useState<Service | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states - Products
  const [prodName, setProdName] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCost, setProdCost] = useState<number | ''>('');
  const [prodSelling, setProdSelling] = useState(0);
  const [prodWholesale, setProdWholesale] = useState<number | ''>('');
  const [prodStock, setProdStock] = useState(0);
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodImage, setProdImage] = useState<string | null>(null);
  const [prodLowStockThreshold, setProdLowStockThreshold] = useState<number | ''>('');
  const [prodBranchId, setProdBranchId] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodUnit, setProdUnit] = useState('pcs');
  const [prodSupplier, setProdSupplier] = useState('');
  const [prodSupplierContact, setProdSupplierContact] = useState('');
  const [prodWarehouseLocation, setProdWarehouseLocation] = useState('');
  const [prodExpiryDate, setProdExpiryDate] = useState('');
  const [prodBatchNumber, setProdBatchNumber] = useState('');
  const [prodSerialNumberSupport, setProdSerialNumberSupport] = useState(false);
  const [prodWeight, setProdWeight] = useState('');
  const [prodDimensions, setProdDimensions] = useState('');
  const [prodVariants, setProdVariants] = useState('');
  const [prodNotes, setProdNotes] = useState('');
  const [prodTax, setProdTax] = useState<number | ''>('');
  const [prodStatus, setProdStatus] = useState<'Active' | 'Draft' | 'Discontinued' | 'Inactive'>('Active');
  const [prodOptionalBarcode, setProdOptionalBarcode] = useState('');
  const [prodReturnEligible, setProdReturnEligible] = useState(true);
  const [prodQrCode, setProdQrCode] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const handleGenerateBarcode = () => {
    const generatedSku = 'SKU-' + Math.floor(10000000 + Math.random() * 90000000);
    setProdBarcode(generatedSku);
    if (!prodOptionalBarcode) {
      setProdOptionalBarcode('EAN-' + Math.floor(100000000000 + Math.random() * 900000000000));
    }
  };

  const handleGenerateQrCode = () => {
    const qr = 'QR-' + Math.floor(100000 + Math.random() * 900000);
    setProdQrCode(qr);
  };

  // Form states - Services
  const [servName, setServName] = useState('');
  const [servCat, setServCat] = useState('');
  const [servDesc, setServDesc] = useState('');
  const [servPrice, setServPrice] = useState(0);
  const [servCode, setServCode] = useState('');
  const [servDuration, setServDuration] = useState('');
  const [servEmployeeId, setServEmployeeId] = useState('');
  const [servTaxRate, setServTaxRate] = useState<number | ''>('');
  const [servStatus, setServStatus] = useState<'Active' | 'Inactive'>('Active');
  const [servNotes, setServNotes] = useState('');

  // File drag state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = db.getProducts(business.id);
  const services = db.getServices(business.id);

  // Categories
  const categories = ['All', ...Array.from(new Set([
    ...products.map(p => p.category),
    ...services.map(s => s.category)
  ]))];

  const handleEditProductClick = (p: Product) => {
    setEditingProd(p);
    setProdName(p.name);
    setProdCat(p.category);
    setProdDesc(p.description);
    setProdCost(p.costPrice !== undefined && p.costPrice !== null ? p.costPrice : '');
    setProdSelling(p.sellingPrice);
    setProdWholesale(p.wholesalePrice !== undefined && p.wholesalePrice !== null ? p.wholesalePrice : '');
    setProdStock(p.stockQuantity);
    setProdBarcode(p.barcode);
    setProdImage(p.imageUrl || null);
    setProdLowStockThreshold(p.lowStockThreshold !== undefined && p.lowStockThreshold !== null ? p.lowStockThreshold : '');
    setProdBranchId(p.branchId || '');
    setProdBrand(p.brand || '');
    setProdUnit(p.unitOfMeasurement || 'pcs');
    setProdSupplier(p.supplier || '');
    setProdSupplierContact(p.supplierContact || '');
    setProdWarehouseLocation(p.warehouseLocation || '');
    setProdExpiryDate(p.expiryDate || '');
    setProdBatchNumber(p.batchNumber || '');
    setProdSerialNumberSupport(!!p.serialNumberSupport);
    setProdWeight(p.productWeight || '');
    setProdDimensions(p.productDimensions || '');
    setProdVariants(p.productVariants || '');
    setProdNotes(p.productNotes || '');
    setProdTax(p.taxRate !== undefined && p.taxRate !== null ? p.taxRate : '');
    setProdStatus(p.status || 'Active');
    setProdOptionalBarcode(p.barcodeOptional || '');
    setProdReturnEligible(p.returnEligible !== undefined ? p.returnEligible : true);
    setProdQrCode(p.qrCode || '');
    setIsCreatingNew(false);
  };

  const handleEditServiceClick = (s: Service) => {
    setEditingServ(s);
    setServName(s.name);
    setServCat(s.category);
    setServDesc(s.description);
    setServPrice(s.price);
    setServCode(s.code || '');
    setServDuration(s.duration || '');
    setServEmployeeId(s.assignedEmployeeId || '');
    setServTaxRate(s.taxRate !== undefined && s.taxRate !== null ? s.taxRate : '');
    setServStatus(s.status || 'Active');
    setServNotes(s.notes || '');
    setIsCreatingNew(false);
  };

  const handleCreateNewClick = () => {
    setIsCreatingNew(true);

    // Reset Forms
    setProdName('');
    setProdCat('Retail');
    setProdDesc('');
    setProdCost('');
    setProdSelling(0);
    setProdWholesale('');
    setProdStock(0);
    setProdBarcode('BOS-' + Math.floor(Math.random()*900000+100000));
    setProdImage(null);
    setProdLowStockThreshold('');
    setProdBrand('');
    setProdUnit('pcs');
    setProdSupplier('');
    setProdSupplierContact('');
    setProdWarehouseLocation('');
    setProdExpiryDate('');
    setProdBatchNumber('');
    setProdSerialNumberSupport(false);
    setProdWeight('');
    setProdDimensions('');
    setProdVariants('');
    setProdNotes('');
    setProdTax('');
    setProdStatus('Active');
    setProdOptionalBarcode('');
    setProdReturnEligible(true);
    setProdQrCode('');
    setProdBranchId('');

    setServName('');
    setServCat('Custom');
    setServDesc('');
    setServPrice(0);
    setServCode('SRV-' + Math.floor(Math.random()*900000+100000));
    setServDuration('1 hr');
    setServEmployeeId('');
    setServTaxRate('');
    setServStatus('Active');
    setServNotes('');

    if (isServiceBusiness) {
      setEditingProd(null);
      setEditingServ({} as any);
    } else {
      if (activeSubTab === 'services') {
        setEditingProd(null);
        setEditingServ({} as any);
      } else {
        // DIRECT TO PHYSICAL PRODUCT FORM - bypass selection modal entirely
        setEditingProd({} as any);
        setEditingServ(null);
      }
    }
  };

  // Drag and drop image parser with local optimization / compression
  const processFile = (file: File) => {
    if (!file.type.match('image.*')) {
      alert('Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP images.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400; // Optimal scale for performance
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG is highly lightweight
          db.uploadFile(file.name, optimizedBase64).then(url => {
            setProdImage(url);
          }).catch(() => {
            setProdImage(optimizedBase64);
          });
        } else {
          db.uploadFile(file.name, img.src).then(url => {
            setProdImage(url);
          }).catch(() => {
            setProdImage(img.src);
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product listing? This will also remove its stock counts from POS checkout.')) {
      db.deleteProduct(business.id, id);
      alert('Product deleted successfully.');
      forceUpdate();
    }
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Are you sure you want to delete this service listing?')) {
      db.deleteService(business.id, id);
      alert('Service deleted successfully.');
      forceUpdate();
    }
  };

  const handleSubmitProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit Validation Rules
    if (!prodName.trim()) {
      alert('Product Name is required.');
      return;
    }
    if (!prodBarcode.trim()) {
      alert('SKU / Product Code is required.');
      return;
    }
    if (prodSelling <= 0 || isNaN(prodSelling)) {
      alert('Selling price must be a valid number greater than 0.');
      return;
    }
    if (prodStock < 0 || isNaN(prodStock)) {
      alert('Stock quantity cannot be negative.');
      return;
    }

    const isEdit = editingProd && editingProd.id;
    const targetId = isEdit ? editingProd.id : 'p-' + Math.random().toString(36).substring(2, 9);

    // Branch selection validation
    const branches = db.getBranches(business.id);
    const resolvedBranchId = prodBranchId || user.branchId || '';
    if (branches.length > 0) {
      if (!resolvedBranchId) {
        alert('Branch selection is required.');
        return;
      }
    }

    // SKU Code duplication check (only within the same branch store)
    const isDuplicate = products.some(p => 
      p.id !== targetId && 
      p.barcode.toLowerCase() === prodBarcode.trim().toLowerCase() &&
      (p.branchId || '') === resolvedBranchId
    );
    if (isDuplicate) {
      alert(`SKU/Product Code "${prodBarcode}" already exists in the selected branch store. Please specify a unique SKU / Product Code.`);
      return;
    }

    const productData: Product = {
      id: targetId,
      businessId: business.id,
      branchId: resolvedBranchId || undefined,
      name: prodName.trim(),
      imageUrl: prodImage || getProductPlaceholderSvg(prodCat, prodName),
      category: prodCat.trim() || 'Retail',
      description: prodDesc.trim(),
      costPrice: prodCost !== '' ? Number(prodCost) : undefined,
      sellingPrice: prodSelling,
      wholesalePrice: prodWholesale !== '' ? Number(prodWholesale) : undefined,
      stockQuantity: prodStock,
      barcode: prodBarcode.trim(),
      brand: prodBrand.trim() || undefined,
      unitOfMeasurement: prodUnit.trim() || undefined,
      supplier: prodSupplier.trim() || undefined,
      supplierContact: prodSupplierContact.trim() || undefined,
      warehouseLocation: prodWarehouseLocation.trim() || undefined,
      expiryDate: prodExpiryDate || undefined,
      batchNumber: prodBatchNumber.trim() || undefined,
      serialNumberSupport: prodSerialNumberSupport,
      productWeight: prodWeight.trim() || undefined,
      productDimensions: prodDimensions.trim() || undefined,
      productVariants: prodVariants.trim() || undefined,
      productNotes: prodNotes.trim() || undefined,
      taxRate: prodTax !== '' ? Number(prodTax) : undefined,
      status: prodStatus,
      barcodeOptional: prodOptionalBarcode.trim() || undefined,
      returnEligible: prodReturnEligible,
      qrCode: prodQrCode.trim() || undefined,
      updatedAt: new Date().toISOString(),
      ...(prodLowStockThreshold !== '' ? { lowStockThreshold: Number(prodLowStockThreshold) } : {})
    };

    db.saveProduct(business.id, productData);
    alert(`Product "${prodName.trim()}" saved successfully.`);
    
    // Log
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: isEdit ? 'Product Updated' : 'Product Added',
      moduleAffected: 'Products',
      itemAffected: prodName,
      previousValue: isEdit ? JSON.stringify(editingProd) : '',
      newValue: JSON.stringify(productData),
      details: `${isEdit ? 'Modified' : 'Created'} physical product catalog entry for "${prodName}" (SKU: ${prodBarcode}) with stock ${prodStock}.`,
      branchId: user.branchId
    });

    setEditingProd(null);
    setIsCreatingNew(false);
    forceUpdate();
  };

  const handleSubmitServiceForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!servName || !servCat || servPrice <= 0) {
      alert('Please fill out all service details.');
      return;
    }

    const isEdit = editingServ && editingServ.id;
    const targetId = isEdit ? editingServ.id : 's-' + Math.random().toString(36).substring(2, 9);
    
    // Resolve employee name
    const employees = db.getUsers().filter(u => u.businessId === business.id);
    const matchedEmp = employees.find(emp => emp.id === servEmployeeId);

    const serviceData: Service = {
      id: targetId,
      businessId: business.id,
      name: servName,
      description: servDesc,
      category: servCat,
      price: servPrice,
      code: servCode || undefined,
      duration: servDuration || undefined,
      assignedEmployeeId: servEmployeeId || undefined,
      assignedEmployeeName: matchedEmp ? matchedEmp.name : undefined,
      taxRate: servTaxRate !== '' ? Number(servTaxRate) : undefined,
      status: servStatus,
      notes: servNotes || undefined
    };

    db.saveService(business.id, serviceData);
    alert(`Service "${servName}" saved successfully.`);

    // Log
    db.addActivityLog(business.id, {
      userId: user.id,
      userName: user.name,
      action: isEdit ? 'Service Updated' : 'Service Added',
      details: `${isEdit ? 'Modified' : 'Created'} service entry for "${servName}".`
    });

    setEditingServ(null);
    setIsCreatingNew(false);
    forceUpdate();
  };

  // Filter lists
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                        p.barcode.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All' || p.category === catFilter;
    const matchBranch = branchFilter === 'All' || p.branchId === branchFilter;
    return matchSearch && matchCat && matchBranch;
  });

  const filteredServices = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All' || s.category === catFilter;
    return matchSearch && matchCat;
  });

  // Check role authorization to edit catalog
  const canEditCatalog = ['owner', 'manager', 'inventory_staff', 'pos_inventory_staff', 'admin', 'SUPER_ADMIN'].includes(user.role) || (user.permissions && (user.permissions.includes('Products') || user.permissions.includes('Inventory')));

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header controls */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm shrink-0">
        {/* Toggle buttons for SubTabs or Title for Service business */}
        {isServiceBusiness ? (
          <div className="flex items-center gap-2 px-2">
            <Sparkles className="h-5 w-5 text-emerald-800" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Professional Services Catalog</h3>
          </div>
        ) : (
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl max-w-xs select-none">
            <button
              onClick={() => { setActiveSubTab('products'); setSearch(''); }}
              className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
                activeSubTab === 'products' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Products / Goods
            </button>
            <button
              onClick={() => { setActiveSubTab('services'); setSearch(''); }}
              className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
                activeSubTab === 'services' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Services Catalog
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder={`Search ${activeSubTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-48 pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Category Filter */}
          <div className="relative flex items-center">
            <Filter className="h-3.5 w-3.5 text-slate-400 mr-1 shrink-0" />
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="py-1.5 pl-2 pr-8 border border-slate-200 bg-white rounded-lg text-slate-700 text-xs"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          {db.getBranches(business.id).length > 0 && (
            <div className="relative flex items-center">
              <Building2 className="h-3.5 w-3.5 text-slate-400 mr-1 shrink-0" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                disabled={!['owner', 'admin', 'SUPER_ADMIN'].includes(user.role)}
                className="py-1.5 pl-2 pr-8 border border-slate-200 bg-white rounded-lg text-slate-700 text-xs disabled:bg-slate-50 disabled:text-slate-400 font-medium"
              >
                {['owner', 'admin', 'SUPER_ADMIN'].includes(user.role) && <option value="All">All Branches</option>}
                {db.getBranches(business.id).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Export Catalog Button */}
          <button
            onClick={() => activeSubTab === 'products' ? exportProductsToCSV(products, business.name) : exportServicesToCSV(services, business.name)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
          >
            <FileDown className="h-4 w-4" /> Export CSV
          </button>

          {/* Create Button */}
          {canEditCatalog && (
            <button
              onClick={handleCreateNewClick}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors active:scale-95"
            >
              <Plus className="h-4 w-4" /> Add to Catalog
            </button>
          )}
        </div>
      </header>

      {/* Grid listing */}
      {activeSubTab === 'products' ? (
        <div className="space-y-4">
          {/* Mobile Product Cards (< md) */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map(p => {
              const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5;
              const isLow = p.stockQuantity <= threshold;
              const isOut = p.stockQuantity <= 0;
              return (
                <div key={`m-prod-${p.id}`} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-start gap-3">
                    {p.imageUrl ? (
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        className="h-14 w-14 rounded-xl bg-slate-50 object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-lg shrink-0">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.category}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] leading-none ${
                          isOut ? 'bg-red-50 text-red-700 border border-red-100' : isLow ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isOut ? 'bg-red-600' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          {isOut ? 'Out of stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5 leading-snug">{p.name}</h4>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-slate-500">
                        <span>SKU: <strong className="text-slate-700">{p.barcode}</strong></span>
                        <span>&bull;</span>
                        <span>Stock: <strong className={isOut ? 'text-rose-600 font-black' : isLow ? 'text-amber-600 font-black' : 'text-slate-700'}>{p.stockQuantity}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Selling Price</span>
                      <span className="text-base font-black text-blue-600">{formatCurrency(p.sellingPrice, business.currency)}</span>
                    </div>

                    {canEditCatalog && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditProductClick(p)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer"
                          title="Delete Listing"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No products found</p>
                <p className="text-[11px] text-slate-400 mt-1">Try another search or add a product to the catalog.</p>
              </div>
            )}
          </div>

          {/* Desktop Products list table (>= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <th className="py-4 px-6">Product Item</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Branch Store</th>
                <th className="py-4 px-6">Cost Price</th>
                <th className="py-4 px-6">Selling Price</th>
                <th className="py-4 px-6">Stock Status</th>
                <th className="py-4 px-6">SKU Code</th>
                {canEditCatalog && <th className="py-4 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
              {filteredProducts.map(p => {
                const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5;
                const isLow = p.stockQuantity <= threshold;
                const isOut = p.stockQuantity <= 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/30 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {p.imageUrl && (
                          <img 
                            src={p.imageUrl} 
                            alt={p.name} 
                            className="h-10 w-10 rounded-lg bg-slate-50 object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-800">{p.name}</p>
                            {p.status === 'Inactive' && (
                              <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[8px] font-bold uppercase border border-rose-100">Inactive</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">
                            {p.description || 'No description provided.'}
                            {p.brand && ` • Brand: ${p.brand}`}
                            {p.unitOfMeasurement && ` • Unit: ${p.unitOfMeasurement}`}
                            {p.supplier && ` • Supplier: ${p.supplier}`}
                            {p.taxRate !== undefined && p.taxRate !== null && ` • Tax: ${p.taxRate}%`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium uppercase text-[9px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded font-bold text-[9px]">
                        {db.getBranches(business.id).find(b => b.id === p.branchId)?.name || 'Main Store'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-500">
                      {p.costPrice !== undefined && p.costPrice !== null ? formatCurrency(p.costPrice, business.currency) : '—'}
                    </td>
                    <td className="py-4 px-6 font-black text-slate-800">
                      {formatCurrency(p.sellingPrice, business.currency)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] leading-none w-fit ${
                          isOut ? 'bg-red-50 text-red-700' : isLow ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isOut ? 'bg-red-600' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          {isOut ? 'Out of stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                        <div className="text-[10px] text-slate-400 font-medium">
                          <p>Current: <strong className="text-slate-600">{p.stockQuantity}</strong></p>
                          <p>Alert Level: <strong className="text-slate-600">{threshold}</strong></p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-mono text-slate-700 uppercase font-bold">{p.barcode}</p>
                      {p.barcodeOptional && <p className="text-[10px] text-slate-400 font-mono">BC: {p.barcodeOptional}</p>}
                    </td>
                    {canEditCatalog && (
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleEditProductClick(p)}
                          className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                          title="Edit Details"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                          title="Delete Listing"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {products.length === 0 ? (
                <tr key="empty-products-row">
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <p className="font-bold text-slate-600 mb-2">No products available.</p>
                    {canEditCatalog && (
                      <button
                        onClick={() => setIsCreatingNew(true)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Product
                      </button>
                    )}
                  </td>
                </tr>
              ) : filteredProducts.length === 0 && (
                <tr key="empty-products-filter-row">
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No matching products found in catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Services Cards (< md) */}
          <div className="md:hidden space-y-3">
            {filteredServices.map(s => (
              <div key={`m-serv-${s.id}`} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.category}</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5 leading-snug">{s.name}</h4>
                    {s.code && <p className="text-[10px] font-mono text-slate-400 mt-0.5">CODE: {s.code}</p>}
                  </div>
                  <span className="text-base font-black text-blue-600 shrink-0">
                    {formatCurrency(s.price, business.currency)}
                  </span>
                </div>

                {s.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{s.description}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="text-[11px] text-slate-500 space-x-2">
                    {s.duration && <span>⏱️ {s.duration}</span>}
                    {s.assignedEmployeeName && <span>👤 {s.assignedEmployeeName}</span>}
                  </div>

                  {canEditCatalog && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditServiceClick(s)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteService(s.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer"
                        title="Delete Service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredServices.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                <Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No services found</p>
                <p className="text-[11px] text-slate-400 mt-1">Try another search or add a service package.</p>
              </div>
            )}
          </div>

          {/* Desktop Services table (>= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <th className="py-4 px-6">Service Package</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Standard Price</th>
                <th className="py-4 px-6">Duration</th>
                <th className="py-4 px-6">Assigned Employee</th>
                <th className="py-4 px-6">Tax Rate</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Description / Notes</th>
                {canEditCatalog && <th className="py-4 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="text-slate-700 text-xs divide-y divide-slate-100">
              {filteredServices.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/30 transition">
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-bold text-slate-800">{s.name}</p>
                      {s.code && <p className="text-[10px] text-slate-400 font-mono mt-0.5">CODE: {s.code}</p>}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium uppercase text-[9px]">
                      {s.category}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-black text-slate-800">{formatCurrency(s.price, business.currency)}</td>
                  <td className="py-4 px-6 font-semibold text-slate-500">{s.duration || '—'}</td>
                  <td className="py-4 px-6 font-medium text-slate-600">{s.assignedEmployeeName || 'Unassigned'}</td>
                  <td className="py-4 px-6 text-slate-500">{s.taxRate !== undefined && s.taxRate !== null ? `${s.taxRate}%` : '—'}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] leading-none ${
                      s.status === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'Inactive' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                      {s.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 max-w-xs">
                    <p className="truncate font-medium">{s.description}</p>
                    {s.notes && <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">Notes: {s.notes}</p>}
                  </td>
                  {canEditCatalog && (
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleEditServiceClick(s)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                        title="Edit Listing"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(s.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                        title="Delete Listing"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {services.length === 0 ? (
                <tr key="empty-services-row">
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    <p className="font-bold text-slate-600 mb-2">No services have been created.</p>
                    {canEditCatalog && (
                      <button
                        onClick={() => setIsCreatingNew(true)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Service
                      </button>
                    )}
                  </td>
                </tr>
              ) : filteredServices.length === 0 && (
                <tr key="empty-services-filter-row">
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No matching services found in catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(isCreatingNew || editingProd || editingServ) && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Package className="h-4.5 w-4.5 text-emerald-800" />
                {isCreatingNew ? 'Add to Catalog (Physical Product)' : editingProd ? 'Modify Product Listing' : 'Modify Service Listing'}
              </h4>
              <button 
                onClick={() => { setIsCreatingNew(false); setEditingProd(null); setEditingServ(null); }} 
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* If creating new, let user choose first */}
            {isCreatingNew && !editingProd && !editingServ ? (
              <div className="space-y-6 mt-4">
                <p className="text-xs text-slate-500">What type of listing would you like to catalog in your private workspace?</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setEditingProd({} as any);
                    }}
                    className="p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-600 text-center space-y-2 hover:bg-emerald-50/30 transition cursor-pointer"
                  >
                    <Package className="h-8 w-8 text-emerald-700 mx-auto" />
                    <p className="font-bold text-xs text-slate-800">Physical Product</p>
                    <p className="text-[10px] text-slate-400 leading-normal">Trackable inventory, cost margins, SKU barcode.</p>
                  </button>

                  <button
                    onClick={() => {
                      setEditingServ({} as any);
                    }}
                    className="p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-600 text-center space-y-2 hover:bg-emerald-50/30 transition cursor-pointer"
                  >
                    <Sparkles className="h-8 w-8 text-emerald-700 mx-auto" />
                    <p className="font-bold text-xs text-slate-800">Service Package</p>
                    <p className="text-[10px] text-slate-400 leading-normal">Billed experience/labor, catalog price list.</p>
                  </button>
                </div>
              </div>
            ) : editingProd || (isCreatingNew && editingProd !== null) ? (
              /* PRODUCT FORM - Simple, Clean, Fast & Essential */
              <form onSubmit={handleSubmitProductForm} className="space-y-4 mt-4 text-xs">
                {/* Product Image */}
                <div>
                  <ImageUploadInput
                    label="Product Image (URL or Upload)"
                    value={prodImage || ''}
                    onChange={(url) => setProdImage(url || null)}
                    placeholder="Paste image URL or click Upload Image"
                    businessId={business.id}
                  />
                </div>

                {/* ESSENTIAL FIELDS (Visible by Default) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 font-bold uppercase mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="e.g. Premium White Rice 5kg"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Category *</label>
                    <input
                      type="text"
                      required
                      value={prodCat}
                      onChange={(e) => setProdCat(e.target.value)}
                      placeholder="e.g. Groceries"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Unit of Measure</label>
                    <select
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
                    >
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="box">box (Box / Carton)</option>
                      <option value="pack">pack (Pack)</option>
                      <option value="kg">kg (Kilogram)</option>
                      <option value="g">g (Gram)</option>
                      <option value="ltr">ltr (Litre)</option>
                      <option value="pair">pair (Pair)</option>
                      <option value="bottle">bottle (Bottle)</option>
                    </select>
                  </div>
                </div>

                {/* SKU & Barcode with Generate / Scan options */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-600 font-bold uppercase text-[10px]">Barcode &amp; SKU Identifier *</label>
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" /> Auto Generate Code
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value)}
                      placeholder="SKU / Barcode *"
                      className="block w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-800 font-mono font-bold focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                    <input
                      type="text"
                      value={prodOptionalBarcode}
                      onChange={(e) => setProdOptionalBarcode(e.target.value)}
                      placeholder="Optional Alt Barcode"
                      className="block w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                {/* Pricing & Stock */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Cost Price ({getCurrencySymbol(business.currency)})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={prodCost}
                      onChange={(e) => setProdCost(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                      placeholder="0.00"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Selling Price ({getCurrencySymbol(business.currency)}) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={prodSelling || ''}
                      onChange={(e) => setProdSelling(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      value={prodStock || ''}
                      onChange={(e) => setProdStock(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Supplier & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Supplier (Optional)</label>
                    <input
                      type="text"
                      value={prodSupplier}
                      onChange={(e) => setProdSupplier(e.target.value)}
                      placeholder="Acme Wholesalers"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Product Status</label>
                    <select
                      value={prodStatus}
                      onChange={(e) => setProdStatus(e.target.value as any)}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                      <option value="Discontinued">Discontinued</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* COLLAPSIBLE MORE DETAILS SECTION */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 font-bold flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <span>{showMoreDetails ? '▲ Hide Optional Details' : '▼ More Details (Description, Brand, Wholesale, Tax, Location, Expiry, QR)'}</span>
                    <span className="text-[10px] uppercase font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {showMoreDetails ? 'Expanded' : 'Optional'}
                    </span>
                  </button>
                </div>

                {showMoreDetails && (
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
                    <div>
                      <label className="block text-slate-500 font-bold uppercase mb-1">Product Description</label>
                      <textarea
                        rows={2}
                        value={prodDesc}
                        onChange={(e) => setProdDesc(e.target.value)}
                        placeholder="Detailed description for catalog and receipts..."
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Brand</label>
                        <input
                          type="text"
                          value={prodBrand}
                          onChange={(e) => setProdBrand(e.target.value)}
                          placeholder="e.g. Nestlé"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Wholesale Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={prodWholesale}
                          onChange={(e) => setProdWholesale(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                          placeholder="0.00"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Tax Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={prodTax}
                          onChange={(e) => setProdTax(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                          placeholder="15"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Warehouse / Store Location</label>
                        <input
                          type="text"
                          value={prodWarehouseLocation}
                          onChange={(e) => setProdWarehouseLocation(e.target.value)}
                          placeholder="Aisle 4, Shelf B"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Reorder Level (Alert)</label>
                        <input
                          type="number"
                          value={prodLowStockThreshold}
                          onChange={(e) => setProdLowStockThreshold(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                          placeholder="e.g. 10"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={prodExpiryDate}
                          onChange={(e) => setProdExpiryDate(e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Batch Number</label>
                        <input
                          type="text"
                          value={prodBatchNumber}
                          onChange={(e) => setProdBatchNumber(e.target.value)}
                          placeholder="BATCH-2026-X"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 font-mono bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-500 font-bold uppercase text-[10px]">QR Code Identifier</label>
                          <button
                            type="button"
                            onClick={handleGenerateQrCode}
                            className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Auto Generate
                          </button>
                        </div>
                        <input
                          type="text"
                          value={prodQrCode}
                          onChange={(e) => setProdQrCode(e.target.value)}
                          placeholder="e.g. QR-9012"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Product Variants</label>
                        <input
                          type="text"
                          value={prodVariants}
                          onChange={(e) => setProdVariants(e.target.value)}
                          placeholder="e.g. Red, XL, 64GB"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Product Weight</label>
                        <input
                          type="text"
                          value={prodWeight}
                          onChange={(e) => setProdWeight(e.target.value)}
                          placeholder="e.g. 500g, 1.2kg"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold uppercase mb-1">Dimensions</label>
                        <input
                          type="text"
                          value={prodDimensions}
                          onChange={(e) => setProdDimensions(e.target.value)}
                          placeholder="L x W x H cm"
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={prodSerialNumberSupport}
                          onChange={(e) => setProdSerialNumberSupport(e.target.checked)}
                          className="rounded text-emerald-800 focus:ring-emerald-500 h-4 w-4"
                        />
                        <span className="font-bold text-slate-700 text-xs">Enable Serial Number tracking</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={prodReturnEligible}
                          onChange={(e) => setProdReturnEligible(e.target.checked)}
                          className="rounded text-emerald-800 focus:ring-emerald-500 h-4 w-4"
                        />
                        <span className="font-bold text-slate-700 text-xs">Eligible for Customer Returns</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold uppercase mb-1">Product Handling Notes</label>
                      <textarea
                        rows={2}
                        value={prodNotes}
                        onChange={(e) => setProdNotes(e.target.value)}
                        placeholder="Internal inventory handling or store notes..."
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {['owner', 'admin', 'manager'].includes(user.role) && db.getBranches(business.id).length > 0 && (
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Branch Store Assignment *</label>
                    <select
                      required
                      value={prodBranchId}
                      onChange={(e) => setProdBranchId(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Select Branch * --</option>
                      {db.getBranches(business.id).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setIsCreatingNew(false); setEditingProd(null); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            ) : (
              /* SERVICE FORM */
              <form onSubmit={handleSubmitServiceForm} className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Service Name / Title</label>
                    <input
                      type="text"
                      required
                      value={servName}
                      onChange={(e) => setServName(e.target.value)}
                      placeholder="Massage 60min"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Service Code</label>
                    <input
                      type="text"
                      required
                      value={servCode}
                      onChange={(e) => setServCode(e.target.value)}
                      placeholder="e.g. SRV-10020"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Category</label>
                    <input
                      type="text"
                      required
                      value={servCat}
                      onChange={(e) => setServCat(e.target.value)}
                      placeholder="Wellness Treatments"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Standard Price ({getCurrencySymbol(business.currency)})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={servPrice || ''}
                      onChange={(e) => setServPrice(parseFloat(e.target.value) || 0)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Estimated Duration</label>
                    <input
                      type="text"
                      value={servDuration}
                      onChange={(e) => setServDuration(e.target.value)}
                      placeholder="e.g. 45 mins, 1.5 hrs"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Tax Rate (%) (Optional)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={servTaxRate}
                      onChange={(e) => setServTaxRate(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 15 (blank for none)"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Assigned Employee (Optional)</label>
                    <select
                      value={servEmployeeId}
                      onChange={(e) => setServEmployeeId(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 cursor-pointer w-full"
                    >
                      <option value="">No preference / Unassigned</option>
                      {db.getUsers()
                        .filter(u => u.businessId === business.id)
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold uppercase mb-1">Service Status</label>
                    <select
                      value={servStatus}
                      onChange={(e) => setServStatus(e.target.value as 'Active' | 'Inactive')}
                      className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-800 font-semibold focus:ring-1 focus:ring-emerald-500 cursor-pointer w-full"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1">Service Description</label>
                  <textarea
                    rows={2}
                    value={servDesc}
                    onChange={(e) => setServDesc(e.target.value)}
                    placeholder="Detailed explanation of experiences or packages billed..."
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 w-full"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold uppercase mb-1">Private Notes / Prep Guidelines</label>
                  <textarea
                    rows={2}
                    value={servNotes}
                    onChange={(e) => setServNotes(e.target.value)}
                    placeholder="Internal checklist, required equipment, or notes..."
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-emerald-500 w-full"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setIsCreatingNew(false); setEditingServ(null); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Save Service
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
