import React, { useState, useEffect } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, User, LaundryService } from '../types';
import { 
  Shirt, Plus, Search, Filter, Edit3, Trash2, CheckCircle2, XCircle, 
  RefreshCw, Sparkles, Tag, DollarSign, Layers, Check, Power, AlertCircle, Info,
  Clock, Zap, Droplets, Truck, ShieldCheck, FileText, Scale, ChevronRight
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface LaundryPriceListProps {
  business: Business;
  user: User;
  onServicesUpdated?: () => void;
}

const CATEGORIES = [
  'All Categories',
  'Washing & Ironing',
  'Dry Cleaning',
  'Bedding & Household',
  'Specialty & Footwear',
  'Logistics & Express',
  'Custom'
];

const GARMENT_TYPES = [
  'General / All Items',
  'Shirts & Tops',
  'Trousers & Jeans',
  'Suits & Formal Wear',
  'Dresses & Gowns',
  'Bedding & Linens',
  'Curtains & Drapes',
  'Shoes & Footwear',
  'Leather & Bags',
  'Delicates & Silk'
];

const ITEM_TYPES = [
  'Per Piece',
  'Per Kilogram',
  'Per Pair',
  'Per Set',
  'Flat Fee',
  'Per Meter',
  'Per Square Foot'
];

const TURNAROUND_OPTIONS = [
  '12 Hours (Same Day)',
  '24 Hours (1 Day)',
  '48 Hours (2 Days)',
  '3 Days',
  '4-5 Days',
  '1 Week'
];

export const LaundryPriceList: React.FC<LaundryPriceListProps> = ({
  business,
  user,
  onServicesUpdated
}) => {
  const [services, setServices] = useState<LaundryService[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<LaundryService | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Washing & Ironing',
    garmentType: 'General / All Items',
    itemType: 'Per Piece',
    price: '',
    estimatedTurnaround: '24 Hours (1 Day)',
    expressAvailable: false,
    expressPrice: '',
    minOrderQty: '1',
    maxWeightKg: '',
    stainTreatmentAvailable: false,
    pickupAvailable: true,
    deliveryAvailable: true,
    fabricCareNotes: '',
    specialHandlingInstructions: '',
    description: '',
    enabled: true
  });

  // Inline Price Edit state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlinePriceValue, setInlinePriceValue] = useState<string>('');

  const loadServices = () => {
    const list = db.getLaundryServices(business.id);
    setServices(list);
    if (onServicesUpdated) onServicesUpdated();
  };

  useEffect(() => {
    loadServices();
  }, [business.id]);

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: 'Washing & Ironing',
      garmentType: 'General / All Items',
      itemType: 'Per Piece',
      price: '',
      estimatedTurnaround: '24 Hours (1 Day)',
      expressAvailable: false,
      expressPrice: '',
      minOrderQty: '1',
      maxWeightKg: '',
      stainTreatmentAvailable: false,
      pickupAvailable: true,
      deliveryAvailable: true,
      fabricCareNotes: '',
      specialHandlingInstructions: '',
      description: '',
      enabled: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: LaundryService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category || 'Washing & Ironing',
      garmentType: service.garmentType || 'General / All Items',
      itemType: service.itemType || 'Per Piece',
      price: service.price.toString(),
      estimatedTurnaround: service.estimatedTurnaround || '24 Hours (1 Day)',
      expressAvailable: !!service.expressAvailable,
      expressPrice: service.expressPrice ? service.expressPrice.toString() : '',
      minOrderQty: service.minOrderQty ? service.minOrderQty.toString() : '1',
      maxWeightKg: service.maxWeightKg ? service.maxWeightKg.toString() : '',
      stainTreatmentAvailable: !!service.stainTreatmentAvailable,
      pickupAvailable: service.pickupAvailable !== undefined ? service.pickupAvailable : true,
      deliveryAvailable: service.deliveryAvailable !== undefined ? service.deliveryAvailable : true,
      fabricCareNotes: service.fabricCareNotes || '',
      specialHandlingInstructions: service.specialHandlingInstructions || '',
      description: service.description || '',
      enabled: service.enabled
    });
    setIsModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation
    if (!formData.name.trim()) {
      showError('Name Required', 'Please enter a laundry service name.');
      return;
    }
    const numericPrice = parseFloat(formData.price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      showError('Invalid Price', 'Please enter a valid base price.');
      return;
    }

    let parsedExpressPrice: number | undefined = undefined;
    if (formData.expressAvailable) {
      if (formData.expressPrice.trim() !== '') {
        const val = parseFloat(formData.expressPrice);
        if (isNaN(val) || val < 0) {
          showError('Invalid Express Price', 'Please enter a valid express price or clear the field.');
          return;
        }
        parsedExpressPrice = val;
      }
    }

    const minQtyVal = parseInt(formData.minOrderQty, 10);
    const maxKgVal = formData.maxWeightKg.trim() !== '' ? parseFloat(formData.maxWeightKg) : undefined;

    const now = new Date().toISOString();
    const serviceToSave: LaundryService = {
      id: editingService ? editingService.id : `lnd-svc-custom-${Math.random().toString(36).substring(2, 9)}`,
      businessId: business.id,
      name: formData.name.trim(),
      category: formData.category,
      garmentType: formData.garmentType,
      itemType: formData.itemType,
      price: numericPrice,
      estimatedTurnaround: formData.estimatedTurnaround,
      expressAvailable: formData.expressAvailable,
      expressPrice: parsedExpressPrice,
      minOrderQty: !isNaN(minQtyVal) && minQtyVal > 0 ? minQtyVal : 1,
      maxWeightKg: maxKgVal && !isNaN(maxKgVal) ? maxKgVal : undefined,
      stainTreatmentAvailable: formData.stainTreatmentAvailable,
      pickupAvailable: formData.pickupAvailable,
      deliveryAvailable: formData.deliveryAvailable,
      fabricCareNotes: formData.fabricCareNotes.trim(),
      specialHandlingInstructions: formData.specialHandlingInstructions.trim(),
      description: formData.description.trim(),
      enabled: formData.enabled,
      isPreset: editingService ? editingService.isPreset : false,
      createdAt: editingService ? editingService.createdAt : now,
      updatedAt: now
    };

    db.saveLaundryService(business.id, serviceToSave);
    showSuccess(
      editingService ? 'Laundry Service Updated' : 'Laundry Service Added',
      `"${serviceToSave.name}" details saved to active laundry service price catalog!`
    );
    setIsModalOpen(false);
    loadServices();
  };

  const handleToggleEnabled = (service: LaundryService) => {
    db.toggleLaundryServiceEnabled(business.id, service.id);
    showSuccess(
      service.enabled ? 'Service Disabled' : 'Service Enabled',
      `"${service.name}" is now ${service.enabled ? 'disabled' : 'enabled'}.`
    );
    loadServices();
  };

  const handleDeleteService = (service: LaundryService) => {
    if (window.confirm(`Are you sure you want to delete "${service.name}" from your price list?`)) {
      db.deleteLaundryService(business.id, service.id);
      showSuccess('Service Deleted', `"${service.name}" removed from laundry price catalog.`);
      loadServices();
    }
  };

  const handleStartInlineEdit = (service: LaundryService) => {
    setInlineEditingId(service.id);
    setInlinePriceValue(service.price.toString());
  };

  const handleSaveInlinePrice = (service: LaundryService) => {
    const val = parseFloat(inlinePriceValue);
    if (isNaN(val) || val < 0) {
      showError('Invalid Price', 'Please enter a valid positive number.');
      return;
    }
    const updated = { ...service, price: val, updatedAt: new Date().toISOString() };
    db.saveLaundryService(business.id, updated);
    showSuccess('Price Saved', `Base price for "${service.name}" updated to ${formatCurrency(val, business.currency)}.`);
    setInlineEditingId(null);
    loadServices();
  };

  const handleClearCatalog = () => {
    if (window.confirm('Clear all services from your Laundry Price List? This cannot be undone.')) {
      db.resetLaundryServicesToDefault(business.id);
      showSuccess('Catalog Cleared', 'Laundry Price List has been cleared.');
      loadServices();
    }
  };

  // Filtered Services
  const filteredServices = services.filter(svc => {
    const matchesSearch = 
      svc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (svc.description && svc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (svc.garmentType && svc.garmentType.toLowerCase().includes(searchTerm.toLowerCase())) ||
      svc.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'All Categories' || 
      svc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Metrics
  const activeCount = services.filter(s => s.enabled).length;
  const disabledCount = services.filter(s => !s.enabled).length;
  const avgPrice = services.length > 0 
    ? services.reduce((acc, s) => acc + s.price, 0) / services.length 
    : 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 border border-cyan-200 rounded-full text-cyan-800 text-xs font-bold">
            <Shirt className="h-3.5 w-3.5 text-cyan-600" />
            Laundry Service Catalog
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Laundry Service Price List</h2>
          <p className="text-xs text-slate-500">
            Configure laundry operations, garment charges, turnaround times, express rates, and care instructions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-2xl text-xs shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search laundry services or garment types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-2xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Services List / Grid */}
        {services.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <Info className="h-10 w-10 mx-auto text-slate-300 stroke-1" />
            <h3 className="text-base font-bold text-slate-800">No Services Added Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have not created any laundry services. Add your first service to start managing laundry orders.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Service
            </button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <Info className="h-10 w-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-xs font-semibold text-slate-500">No laundry services match your search filter.</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('All Categories'); }}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="py-3 px-4">Laundry Service</th>
                  <th className="py-3 px-4">Category & Garment</th>
                  <th className="py-3 px-4">Charge Unit</th>
                  <th className="py-3 px-4">Turnaround & Express</th>
                  <th className="py-3 px-4 text-right">Base Price</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map(svc => {
                  const isEditingInline = inlineEditingId === svc.id;

                  return (
                    <tr 
                      key={svc.id} 
                      className={`hover:bg-cyan-50/20 transition ${!svc.enabled ? 'bg-slate-50/60 opacity-75' : ''}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                          <Shirt className={`h-4 w-4 ${svc.enabled ? 'text-cyan-600' : 'text-slate-400'}`} />
                          <span>{svc.name}</span>
                          {svc.isPreset && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-semibold">
                              Preset
                            </span>
                          )}
                        </div>
                        {svc.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 pl-6">{svc.description}</p>
                        )}
                        {/* Features Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pl-6 mt-1">
                          {svc.stainTreatmentAvailable && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded text-[9px] font-bold inline-flex items-center gap-1">
                              <Droplets className="h-2.5 w-2.5 text-amber-600" /> Stain Care
                            </span>
                          )}
                          {svc.pickupAvailable && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded text-[9px] font-bold inline-flex items-center gap-1">
                              <Truck className="h-2.5 w-2.5 text-indigo-600" /> Pickup
                            </span>
                          )}
                          {svc.deliveryAvailable && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded text-[9px] font-bold inline-flex items-center gap-1">
                              <Truck className="h-2.5 w-2.5 text-emerald-600" /> Delivery
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold">
                          <Layers className="h-3 w-3 text-slate-400" />
                          {svc.category}
                        </span>
                        {svc.garmentType && (
                          <div className="text-[10px] text-slate-500 font-medium">
                            {svc.garmentType}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-800 border border-cyan-100 rounded-xl text-[10px] font-bold">
                          {svc.itemType || 'Per Piece'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {svc.estimatedTurnaround || '24 Hours'}
                        </div>
                        {svc.expressAvailable && (
                          <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                            Express: {svc.expressPrice ? formatCurrency(svc.expressPrice, business.currency) : 'Available'}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isEditingInline ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={inlinePriceValue}
                              onChange={(e) => setInlinePriceValue(e.target.value)}
                              className="w-24 py-1 px-2 border border-cyan-500 rounded-lg text-xs font-black text-slate-900 bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveInlinePrice(svc)}
                              className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition cursor-pointer"
                              title="Save Price"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setInlineEditingId(null)}
                              className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition cursor-pointer"
                              title="Cancel"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => handleStartInlineEdit(svc)}
                            className="group inline-flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg hover:bg-cyan-100/50 transition"
                            title="Click to edit price directly"
                          >
                            <span className="font-black text-slate-900 text-sm">
                              {formatCurrency(svc.price, business.currency)}
                            </span>
                            <Edit3 className="h-3 w-3 text-slate-300 group-hover:text-cyan-600 transition" />
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleEnabled(svc)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition cursor-pointer inline-flex items-center gap-1 ${
                            svc.enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <Power className={`h-3 w-3 ${svc.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                          {svc.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(svc)}
                            className="p-1.5 text-slate-600 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit Laundry Service Details"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(svc)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete Service"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LAUNDRY-SPECIFIC ADD / EDIT SERVICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 relative animate-in fade-in zoom-in duration-150 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-cyan-50 border border-cyan-200 rounded-full text-cyan-800 text-[11px] font-bold">
                  <Shirt className="h-3.5 w-3.5 text-cyan-600" />
                  Laundry Operations Catalog
                </div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  {editingService ? 'Edit Laundry Service' : 'Add New Laundry Service'}
                </h3>
                <p className="text-xs text-slate-500">
                  Define laundry service options, turnaround times, garment charges, and garment care instructions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveService} className="space-y-5 overflow-y-auto pr-1 flex-1 text-xs">
              
              {/* Quick Fill Presets */}
              {/* SECTION 1: Service Information */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Shirt className="h-4 w-4 text-cyan-600" />
                    1. Service Information
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="h-4 w-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span className="font-extrabold text-slate-800 text-xs">Active Service</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Laundry Service Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Wash & Fold, Suit Dry Cleaning, Curtain Washing"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Service Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 font-medium bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      >
                        {CATEGORIES.filter(c => c !== 'All Categories').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Garment / Item Category</label>
                      <select
                        value={formData.garmentType}
                        onChange={(e) => setFormData({ ...formData, garmentType: e.target.value })}
                        className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 font-medium bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      >
                        {GARMENT_TYPES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Pricing & Turnaround */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    2. Pricing & Turnaround
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit of Charge *</label>
                    <select
                      value={formData.itemType}
                      onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 font-medium bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      {ITEM_TYPES.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Base Service Price ({business.currency}) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                        {business.currency}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full py-2 pl-10 pr-3 border border-slate-200 rounded-xl text-slate-900 font-black focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Est. Completion Time</label>
                    <select
                      value={formData.estimatedTurnaround}
                      onChange={(e) => setFormData({ ...formData, estimatedTurnaround: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 font-medium bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                      {TURNAROUND_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Express Service Sub-section */}
                <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.expressAvailable}
                        onChange={(e) => setFormData({ ...formData, expressAvailable: e.target.checked })}
                        className="h-4 w-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                      Express / Same-Day Fast-Track Option Available
                    </label>
                    <span className="text-[10px] font-semibold text-amber-700">Priority Processing</span>
                  </div>

                  {formData.expressAvailable && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block font-bold text-amber-900 mb-1 text-[11px]">
                          Express Service Price ({business.currency})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 15.00"
                          value={formData.expressPrice}
                          onChange={(e) => setFormData({ ...formData, expressPrice: e.target.value })}
                          className="w-full py-1.5 px-3 border border-amber-300 rounded-xl bg-white text-slate-900 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="text-[11px] text-amber-800 flex items-center pt-4">
                        <Info className="h-3.5 w-3.5 text-amber-600 mr-1.5 shrink-0" />
                        Charged when customers select fast-track rush processing at intake.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: Laundry & Care Options */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Droplets className="h-4 w-4 text-cyan-600" />
                    3. Laundry & Care Options
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Minimum Order Qty / Weight</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1 (Item) or 3 (Kg)"
                      value={formData.minOrderQty}
                      onChange={(e) => setFormData({ ...formData, minOrderQty: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Maximum Weight Limit (Kg) [Optional]</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 15.0"
                      value={formData.maxWeightKg}
                      onChange={(e) => setFormData({ ...formData, maxWeightKg: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <input
                      type="checkbox"
                      checked={formData.stainTreatmentAvailable}
                      onChange={(e) => setFormData({ ...formData, stainTreatmentAvailable: e.target.checked })}
                      className="h-4 w-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 text-xs block">Stain Treatment Available</span>
                      <span className="text-[10px] text-slate-500 block">Offer specialized pre-spotting for collar stains, grease, or wine.</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fabric Care Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Cold water wash 30°C, air dry, silk safe, starch options available"
                    value={formData.fabricCareNotes}
                    onChange={(e) => setFormData({ ...formData, fabricCareNotes: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION 4: Pickup & Delivery Logistics */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-indigo-600" />
                    4. Pickup & Delivery Availability
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <input
                      type="checkbox"
                      checked={formData.pickupAvailable}
                      onChange={(e) => setFormData({ ...formData, pickupAvailable: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-extrabold text-indigo-950 text-xs">Doorstep Pickup Available</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <input
                      type="checkbox"
                      checked={formData.deliveryAvailable}
                      onChange={(e) => setFormData({ ...formData, deliveryAvailable: e.target.checked })}
                      className="h-4 w-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-extrabold text-emerald-950 text-xs">Doorstep Delivery Available</span>
                  </label>
                </div>
              </div>

              {/* SECTION 5: Additional Notes & Instructions */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-600" />
                    5. Additional Notes & Instructions
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Special Handling Instructions</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Separate light and dark garments, delicate embroidery care, custom hanger delivery"
                      value={formData.specialHandlingInstructions}
                      onChange={(e) => setFormData({ ...formData, specialHandlingInstructions: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Service Description</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Comprehensive laundry processing including eco-friendly detergent wash, steam press, and anti-allergen sanitization."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full py-2 px-3 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Form Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {editingService ? 'Save Changes' : 'Create Laundry Service'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
