import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, Service, SalonStaff } from '../types';
import { ImageUploadInput } from './ImageUploadInput';
import { 
  Scissors, Plus, Search, Edit3, Trash2, Clock, CheckCircle2, 
  X, Filter, Sparkles, UserCheck, DollarSign, Image as ImageIcon
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface SalonServicesProps {
  business: Business;
  onNavigatePOS?: () => void;
}

const DEFAULT_CATEGORIES = [
  'Haircut', 'Hair Styling', 'Braiding', 'Washing & Drying', 'Coloring & Highlights', 
  'Shaving', 'Beard Grooming', 'Facial Treatment', 'Manicure', 'Pedicure', 
  'Makeup', 'Massage', 'Spa Treatment', 'Other'
];

export const SalonServices: React.FC<SalonServicesProps> = ({
  business,
  onNavigatePOS
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Haircut');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [duration, setDuration] = useState<string>('30 mins');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>('');
  const [assignedEmployeeName, setAssignedEmployeeName] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Load Data
  const services = db.getServices(business.id);
  const staff = db.getSalonStaff(business.id);

  const openAddModal = () => {
    setEditingService(null);
    setName('');
    setCategory('Haircut');
    setCustomCategory('');
    setDescription('');
    setPrice(0);
    setDuration('30 mins');
    setAssignedEmployeeId('');
    setAssignedEmployeeName('');
    setImageUrl('');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setCategory(DEFAULT_CATEGORIES.includes(service.category) ? service.category : 'Other');
    if (!DEFAULT_CATEGORIES.includes(service.category)) {
      setCustomCategory(service.category);
    } else {
      setCustomCategory('');
    }
    setDescription(service.description || '');
    setPrice(service.price);
    setDuration(service.duration || '30 mins');
    setAssignedEmployeeId(service.assignedEmployeeId || '');
    setAssignedEmployeeName(service.assignedEmployeeName || '');
    setImageUrl(service.code || ''); // code field used as image representation or custom storage
    setStatus(service.status || 'Active');
    setIsModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Validation Error', 'Please enter a valid service name.');
      return;
    }
    if (price <= 0) {
      showError('Validation Error', 'Please specify a valid price above 0.');
      return;
    }

    const finalCategory = category === 'Other' && customCategory.trim() ? customCategory.trim() : category;

    let staffNameFound = assignedEmployeeName;
    if (assignedEmployeeId) {
      const match = staff.find(s => s.id === assignedEmployeeId);
      if (match) staffNameFound = match.name;
    }

    const serviceObj: Service = {
      id: editingService ? editingService.id : 'srv_' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: name.trim(),
      category: finalCategory,
      description: description.trim(),
      price: Number(price),
      duration: duration.trim(),
      assignedEmployeeId: assignedEmployeeId || undefined,
      assignedEmployeeName: staffNameFound || undefined,
      code: imageUrl, // store image URL
      status,
      updatedAt: new Date().toISOString()
    };

    db.saveService(business.id, serviceObj);
    showSuccess(editingService ? 'Service Updated' : 'Service Created', `${name} has been saved successfully.`);
    setIsModalOpen(false);
  };

  const handleDeleteService = (serviceId: string, serviceName: string) => {
    if (confirm(`Are you sure you want to delete service "${serviceName}"?`)) {
      db.deleteService(business.id, serviceId);
      showSuccess('Service Removed', `${serviceName} was deleted.`);
    }
  };

  // Categories list
  const allCategories = ['All', ...Array.from(new Set([...DEFAULT_CATEGORIES, ...services.map(s => s.category)]))];

  // Filtered Services
  const filteredServices = services.filter(srv => {
    const matchesSearch = srv.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          srv.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (srv.description && srv.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || srv.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Title & Quick Action */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Scissors className="h-6 w-6 text-purple-600" /> Salon Services Catalogue
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure haircuts, styling, grooming treatments, pricing, durations, and assign staff members.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Add New Service
        </button>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search salon services by name, category, description..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-purple-700 text-white shadow-sm' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <Scissors className="h-12 w-12 mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-500">No services found matching your criteria.</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            + Create Service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map(srv => (
            <div 
              key={srv.id} 
              className={`bg-white rounded-3xl border transition hover:shadow-md overflow-hidden flex flex-col justify-between ${
                srv.status === 'Inactive' ? 'border-slate-200 opacity-60' : 'border-slate-200/90'
              }`}
            >
              <div>
                {/* Image Header or Gradient Header */}
                <div className="h-36 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  {srv.code ? (
                    <img 
                      src={srv.code} 
                      alt={srv.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                      <Scissors className="h-12 w-12 text-purple-400/60" />
                    </div>
                  )}

                  <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-md text-purple-900 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                    {srv.category}
                  </span>

                  <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                    srv.status === 'Inactive' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {srv.status || 'Active'}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">{srv.name}</h3>
                    <div className="text-right shrink-0">
                      <div className="font-black text-purple-700 text-base">{formatCurrency(srv.price, business.currency)}</div>
                    </div>
                  </div>

                  {srv.description && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {srv.description}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 font-semibold text-purple-900">
                      <Clock className="h-3.5 w-3.5 text-purple-600" /> {srv.duration || '30 mins'}
                    </div>

                    {srv.assignedEmployeeName && (
                      <div className="flex items-center gap-1 font-medium text-slate-600">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400" /> {srv.assignedEmployeeName}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(srv)}
                    className="p-2 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition cursor-pointer"
                    title="Edit Service"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(srv.id, srv.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Delete Service"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {onNavigatePOS && (
                  <button
                    onClick={onNavigatePOS}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Sell in POS
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT SERVICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Scissors className="h-5 w-5 text-purple-600" /> 
                {editingService ? 'Edit Salon Service' : 'Add New Salon Service'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Executive Haircut & Beard Trim"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price ({business.currency || 'GH₵'}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-extrabold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {category === 'Other' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estimated Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="15 mins">15 mins</option>
                    <option value="30 mins">30 mins</option>
                    <option value="45 mins">45 mins</option>
                    <option value="1 hour">1 hour</option>
                    <option value="1.5 hours">1.5 hours</option>
                    <option value="2 hours">2 hours</option>
                    <option value="3 hours+">3 hours+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Stylist/Barber</label>
                  <select
                    value={assignedEmployeeId}
                    onChange={(e) => setAssignedEmployeeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-medium focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  >
                    <option value="">-- Any Available Staff --</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the treatment or haircut service..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-2xl text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Service Image Upload */}
              <div>
                <ImageUploadInput
                  value={imageUrl}
                  onChange={setImageUrl}
                  label="Service Image Upload"
                  placeholder="Upload service banner or hairstyle picture"
                  businessId={business.id}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="Active">Active (Available for booking & POS)</option>
                  <option value="Inactive">Inactive (Disabled)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold shadow-md transition cursor-pointer"
                >
                  {editingService ? 'Save Service Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
