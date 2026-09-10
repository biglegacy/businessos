/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, Product, PharmacyBatch, Supplier } from '../types';
import {
  Pill,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle2,
  X,
  Upload,
  Calendar,
  Filter,
  ShieldCheck,
  Building2,
  ExternalLink
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface PharmacyMedicinesProps {
  business: Business;
  onNavigatePOS?: () => void;
}

const DEFAULT_DOSAGE_FORMS = [
  'Tablets',
  'Capsules',
  'Syrup',
  'Suspension',
  'Cream',
  'Ointment',
  'Drops',
  'Injection',
  'Powder',
  'Suppository',
  'Inhaler',
  'Lotion',
  'Gel',
  'Other'
];

const DEFAULT_CATEGORIES = [
  'Analgesics & Pain Relief',
  'Antibiotics & Anti-infectives',
  'Antimalarials',
  'Cardiovascular & Hypertension',
  'Respiratory & Cough',
  'Gastrointestinal & Ulcer',
  'Vitamins & Supplements',
  'Dermatologicals & Skincare',
  'First Aid & Surgical',
  'Pediatric Care',
  'Eye & Ear Drops',
  'Family Planning & Sexual Health',
  'Other Medicines'
];

export const PharmacyMedicines: React.FC<PharmacyMedicinesProps> = ({
  business,
  onNavigatePOS
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dosageFilter, setDosageFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [dosageForm, setDosageForm] = useState(DEFAULT_DOSAGE_FORMS[0]);
  const [customDosageForm, setCustomDosageForm] = useState('');
  const [strength, setStrength] = useState('');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState('Tablets');
  const [packSize, setPackSize] = useState('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<string>('0');
  const [reorderLevel, setReorderLevel] = useState<string>('10');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Batch Modal Fields
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchExpiry, setNewBatchExpiry] = useState('');
  const [newBatchQuantity, setNewBatchQuantity] = useState<string>('');
  const [newBatchCostPrice, setNewBatchCostPrice] = useState<string>('');
  const [newBatchSupplier, setNewBatchSupplier] = useState('');

  // Load Data
  const products = db.getProducts(business.id);
  const batches = db.getPharmacyBatches(business.id);
  const suppliers = db.getSuppliers(business.id);

  const now = new Date();

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesDosage = dosageFilter === 'All' || p.dosageForm === dosageFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        (p.genericName && p.genericName.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.dosageForm && p.dosageForm.toLowerCase().includes(term));
      return matchesCategory && matchesDosage && matchesSearch;
    });
  }, [products, categoryFilter, dosageFilter, searchTerm]);

  // Open Add/Edit Modal
  const handleOpenAddModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setName(prod.name);
      setGenericName(prod.genericName || '');
      setBrand(prod.brand || '');
      setCategory(DEFAULT_CATEGORIES.includes(prod.category) ? prod.category : 'Other');
      setCustomCategory(DEFAULT_CATEGORIES.includes(prod.category) ? '' : prod.category);
      setDosageForm(DEFAULT_DOSAGE_FORMS.includes(prod.dosageForm || '') ? prod.dosageForm! : 'Other');
      setCustomDosageForm(DEFAULT_DOSAGE_FORMS.includes(prod.dosageForm || '') ? '' : (prod.dosageForm || ''));
      setStrength(prod.strength || '');
      setUnitOfMeasurement(prod.unitOfMeasurement || 'Tablets');
      setPackSize(prod.packSize || '');
      setSellingPrice(prod.sellingPrice?.toString() || '');
      setCostPrice(prod.costPrice?.toString() || '');
      setStockQuantity(prod.stockQuantity?.toString() || '0');
      setReorderLevel(prod.reorderLevel?.toString() || '10');
      setBatchNumber(prod.batchNumber || '');
      setExpiryDate(prod.expiryDate || '');
      setSupplier(prod.supplier || '');
      setDescription(prod.description || '');
      setRequiresPrescription(!!prod.requiresPrescription);
      setImageUrl(prod.imageUrl || '');
    } else {
      setEditingProduct(null);
      setName('');
      setGenericName('');
      setBrand('');
      setCategory(DEFAULT_CATEGORIES[0]);
      setCustomCategory('');
      setDosageForm(DEFAULT_DOSAGE_FORMS[0]);
      setCustomDosageForm('');
      setStrength('');
      setUnitOfMeasurement('Tablets');
      setPackSize('');
      setSellingPrice('');
      setCostPrice('');
      setStockQuantity('0');
      setReorderLevel('10');
      setBatchNumber('BCH-' + Math.floor(1000 + Math.random() * 9000));
      // Default expiry date 1 year from now
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpiryDate(nextYear.toISOString().split('T')[0]);
      setSupplier('');
      setDescription('');
      setRequiresPrescription(false);
      setImageUrl('');
    }
    setIsModalOpen(true);
  };

  // Save Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Name Required', 'Please enter medicine or trade name.');
      return;
    }

    const finalCategory = category === 'Other' && customCategory.trim() ? customCategory.trim() : category;
    const finalDosage = dosageForm === 'Other' && customDosageForm.trim() ? customDosageForm.trim() : dosageForm;
    const sPrice = parseFloat(sellingPrice) || 0;
    const cPrice = parseFloat(costPrice) || 0;
    const qty = parseInt(stockQuantity, 10) || 0;
    const reorder = parseInt(reorderLevel, 10) || 10;

    const targetProduct: Product = {
      id: editingProduct ? editingProduct.id : 'med_' + Date.now(),
      businessId: business.id,
      name: name.trim(),
      genericName: genericName.trim() || undefined,
      brand: brand.trim() || undefined,
      category: finalCategory,
      dosageForm: finalDosage,
      strength: strength.trim() || undefined,
      unitOfMeasurement: unitOfMeasurement.trim() || 'Units',
      packSize: packSize.trim() || undefined,
      sellingPrice: sPrice,
      costPrice: cPrice,
      stockQuantity: qty,
      reorderLevel: reorder,
      lowStockThreshold: reorder,
      batchNumber: batchNumber.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
      supplier: supplier.trim() || undefined,
      description: description.trim() || '',
      requiresPrescription,
      imageUrl: imageUrl || undefined,
      barcode: editingProduct?.barcode || 'MED' + Math.floor(100000 + Math.random() * 900000),
      status: 'Active',
      updatedAt: new Date().toISOString()
    };

    db.saveProduct(business.id, targetProduct);

    // Also register primary batch if provided and new
    if (!editingProduct && batchNumber.trim() && qty > 0) {
      const primaryBatch: PharmacyBatch = {
        id: 'batch_' + Date.now(),
        productId: targetProduct.id,
        businessId: business.id,
        batchNumber: batchNumber.trim(),
        expiryDate: expiryDate || new Date().toISOString().split('T')[0],
        quantity: qty,
        costPrice: cPrice,
        sellingPrice: sPrice,
        supplier: supplier.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      db.savePharmacyBatch(business.id, primaryBatch);
    }

    showSuccess(
      editingProduct ? 'Medicine Updated' : 'Medicine Added',
      `"${targetProduct.name}" saved to pharmacy registry.`
    );
    setIsModalOpen(false);
  };

  // Open Add Batch Modal for a medicine
  const handleOpenBatchModal = (prod: Product) => {
    setSelectedProductForBatch(prod);
    setNewBatchNumber('BCH-' + Math.floor(1000 + Math.random() * 9000));
    const defaultExp = new Date();
    defaultExp.setFullYear(defaultExp.getFullYear() + 1);
    setNewBatchExpiry(defaultExp.toISOString().split('T')[0]);
    setNewBatchQuantity('');
    setNewBatchCostPrice(prod.costPrice?.toString() || '');
    setNewBatchSupplier(prod.supplier || '');
    setIsBatchModalOpen(true);
  };

  // Save new batch to product
  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForBatch) return;
    if (!newBatchNumber.trim()) {
      showError('Batch # Required', 'Please enter a batch number.');
      return;
    }
    const bQty = parseInt(newBatchQuantity, 10);
    if (isNaN(bQty) || bQty <= 0) {
      showError('Quantity Invalid', 'Please enter a valid batch quantity.');
      return;
    }
    if (!newBatchExpiry) {
      showError('Expiry Date Required', 'Please provide the batch expiration date.');
      return;
    }

    const batchRecord: PharmacyBatch = {
      id: 'batch_' + Date.now(),
      productId: selectedProductForBatch.id,
      businessId: business.id,
      batchNumber: newBatchNumber.trim(),
      expiryDate: newBatchExpiry,
      quantity: bQty,
      costPrice: parseFloat(newBatchCostPrice) || selectedProductForBatch.costPrice,
      sellingPrice: selectedProductForBatch.sellingPrice,
      supplier: newBatchSupplier.trim() || selectedProductForBatch.supplier,
      createdAt: new Date().toISOString()
    };

    db.savePharmacyBatch(business.id, batchRecord);

    // Increase product stock quantity
    const updatedProd: Product = {
      ...selectedProductForBatch,
      stockQuantity: (selectedProductForBatch.stockQuantity || 0) + bQty,
      updatedAt: new Date().toISOString()
    };
    db.saveProduct(business.id, updatedProd);

    showSuccess('Batch Registered', `Added batch ${batchRecord.batchNumber} (${bQty} units) to "${selectedProductForBatch.name}".`);
    setIsBatchModalOpen(false);
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the dispensary database?`)) {
      db.deleteProduct(business.id, id);
      showSuccess('Medicine Removed', `"${name}" removed.`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-emerald-700" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Medicines & Pharmaceutical Products
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Maintain regulatory clinical registry, dosage forms, active strengths, and batch-level FEFO data.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medicine</span>
          </button>
          {onNavigatePOS && (
            <button
              onClick={onNavigatePOS}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Open Dispensary POS
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by trade name, generic chemical, brand, dosage form, or barcode..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:bg-white outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="All">All Therapeutic Classes</option>
            {DEFAULT_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Dosage Form Filter */}
          <select
            value={dosageFilter}
            onChange={e => setDosageFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="All">All Dosage Forms</option>
            {DEFAULT_DOSAGE_FORMS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">Medicine & Generic Name</th>
                <th className="py-4 px-4">Dosage & Strength</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Batch & Expiry</th>
                <th className="py-4 px-4 text-right">Stock</th>
                <th className="py-4 px-4 text-right">Price ({business.currency || 'GHC'})</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Pill className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold">No medicines match your current query.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(med => {
                  const isOutOfStock = med.stockQuantity <= 0;
                  const isLowStock = med.stockQuantity > 0 && med.stockQuantity <= (med.reorderLevel || 10);
                  const isExpired = med.expiryDate && new Date(med.expiryDate) < now;
                  const medBatches = batches.filter(b => b.productId === med.id);

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{med.name}</div>
                        {med.genericName && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">{med.genericName}</div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          {med.brand && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              Brand: {med.brand}
                            </span>
                          )}
                          {med.requiresPrescription && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded">
                              Rx Only
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-800">{med.dosageForm || 'Tablets'}</div>
                        <div className="text-slate-500 text-[11px]">{med.strength || '-'}</div>
                        {med.packSize && <div className="text-[10px] text-slate-400 mt-0.5">{med.packSize}</div>}
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold text-[11px]">
                          {med.category || 'General'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-slate-800 font-mono text-[11px]">
                          {med.batchNumber || 'Batch N/A'}
                        </div>
                        {med.expiryDate ? (
                          <div className={`text-[11px] font-bold mt-0.5 ${
                            isExpired ? 'text-rose-600 font-black' : 'text-slate-500'
                          }`}>
                            Exp: {med.expiryDate} {isExpired && '(EXPIRED)'}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[10px]">No Expiry Set</div>
                        )}
                        {medBatches.length > 0 && (
                          <div className="text-[10px] text-emerald-700 font-bold mt-1">
                            {medBatches.length} active {medBatches.length === 1 ? 'batch' : 'batches'}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className={`font-black text-sm ${
                          isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-900'
                        }`}>
                          {med.stockQuantity} {med.unitOfMeasurement || 'units'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Reorder: {med.reorderLevel || 10}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="font-extrabold text-sm text-emerald-800">
                          {formatCurrency(med.sellingPrice, business.currency || 'GHC')}
                        </div>
                        {med.costPrice ? (
                          <div className="text-[10px] text-slate-400">
                            Cost: {formatCurrency(med.costPrice, business.currency || 'GHC')}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenBatchModal(med)}
                            title="Add Batch / FEFO Stock"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                          >
                            <Layers className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAddModal(med)}
                            title="Edit Medicine"
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(med.id, med.name)}
                            title="Delete Medicine"
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Add / Edit Medicine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-700" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingProduct ? 'Edit Medicine / Pharmaceutical' : 'Register New Medicine'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Trade Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Medicine / Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Panadol Extra"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Generic Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Generic / Chemical Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol + Caffeine"
                    value={genericName}
                    onChange={e => setGenericName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Brand Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Manufacturer / Brand
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GlaxoSmithKline / Ernest Chemists"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Therapeutic Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {DEFAULT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {category === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify custom therapeutic category..."
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  )}
                </div>

                {/* Dosage Form */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Dosage Form
                  </label>
                  <select
                    value={dosageForm}
                    onChange={e => setDosageForm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {DEFAULT_DOSAGE_FORMS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {dosageForm === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify custom dosage form (e.g. Patch, Granules)..."
                      value={customDosageForm}
                      onChange={e => setCustomDosageForm(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  )}
                </div>

                {/* Strength */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Strength / Concentration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg, 10mg/5ml, 250mg"
                    value={strength}
                    onChange={e => setStrength(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Pack Size */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pack Size / Packaging
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Box of 100, Bottle of 60ml"
                    value={packSize}
                    onChange={e => setPackSize(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Selling Price ({business.currency || 'GHC'}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cost / Acquisition Price ({business.currency || 'GHC'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Stock Quantity */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Dispensary Stock Units
                  </label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Batch Number */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BCH-88219"
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Reorder Level */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Reorder Alert Level
                  </label>
                  <input
                    type="number"
                    value={reorderLevel}
                    onChange={e => setReorderLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pharmaceutical Supplier / Distributor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tobinco / Kinapharma / Ayrton"
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Prescription Requirement Checkbox */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="reqRx"
                  checked={requiresPrescription}
                  onChange={e => setRequiresPrescription(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="reqRx" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Prescription Only Medication (POM / Rx Only)
                  <span className="block text-[10px] text-slate-500 font-normal">
                    Check this if dispensing requires an approved medical prescription reference.
                  </span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Clinical Notes / Indications / Storage Directions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Store below 25°C. For bacterial infections."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Batch Modal */}
      {isBatchModalOpen && selectedProductForBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-700" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Add Stock Batch (FEFO)</h3>
                  <p className="text-[11px] text-slate-500">{selectedProductForBatch.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Batch Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCH-77123"
                  value={newBatchNumber}
                  onChange={e => setNewBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Expiration Date *</label>
                <input
                  type="date"
                  required
                  value={newBatchExpiry}
                  onChange={e => setNewBatchExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Received *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50"
                    value={newBatchQuantity}
                    onChange={e => setNewBatchQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cost Price ({business.currency || 'GHC'})</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={newBatchCostPrice}
                    onChange={e => setNewBatchCostPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Supplier</label>
                <input
                  type="text"
                  placeholder="Distributor name"
                  value={newBatchSupplier}
                  onChange={e => setNewBatchSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                >
                  Register Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
