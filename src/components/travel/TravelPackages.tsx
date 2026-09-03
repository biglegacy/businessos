import React, { useState, useEffect } from 'react';
import { Compass, Search, Plus, Edit, Trash2, MapPin, Calendar, DollarSign, Users, CheckCircle, X } from 'lucide-react';
import { Business, TravelPackage } from '../../types';
import { db, getCurrencySymbol } from '../../lib/db';

interface TravelPackagesProps {
  business: Business;
}

export const TourPackages: React.FC<TravelPackagesProps> = ({ business }) => {
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null);

  const currency = getCurrencySymbol(business.currency);

  const [formData, setFormData] = useState<Partial<TravelPackage>>({
    packageName: '',
    destination: '',
    durationDays: 7,
    inclusions: ['Flight', 'Hotel', 'Transfers', 'Guided Tours'],
    pricePerPerson: 1200,
    maxCapacity: 20,
    description: '',
  });

  const loadData = () => {
    const list = db.getTravelPackages(business.id);
    setPackages(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [business.id]);

  const handleOpenAdd = () => {
    setSelectedPackage(null);
    setFormData({
      packageName: '',
      destination: '',
      durationDays: 7,
      inclusions: ['Flight', 'Hotel', 'Transfers', 'Guided Tours'],
      pricePerPerson: 1200,
      maxCapacity: 20,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: TravelPackage) => {
    setSelectedPackage(p);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.packageName || !formData.destination) {
      alert('Package Name and Destination are required.');
      return;
    }

    const record: TravelPackage = {
      id: selectedPackage ? selectedPackage.id : `tpk-${Date.now()}`,
      businessId: business.id,
      name: formData.packageName || '',
      duration: `${formData.durationDays || 1} Days`,
      price: Number(formData.pricePerPerson) || 0,
      includedServices: typeof formData.inclusions === 'string' ? [formData.inclusions] : (Array.isArray(formData.inclusions) ? formData.inclusions : []),
      excludedServices: [],
      hotel: 'Included',
      meals: 'Included',
      transportation: 'Included',
      guide: 'Available',
      availableSeats: Number(formData.maxCapacity) || 10,
      packageName: formData.packageName || '',
      destination: formData.destination || '',
      durationDays: Number(formData.durationDays) || 1,
      inclusions: Array.isArray(formData.inclusions) ? formData.inclusions.join(', ') : (formData.inclusions || ''),
      pricePerPerson: Number(formData.pricePerPerson) || 0,
      maxCapacity: Number(formData.maxCapacity) || 10,
      description: formData.description || '',
      createdAt: selectedPackage ? selectedPackage.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveTravelPackage(record);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tour package?')) {
      db.deleteTravelPackage(id);
    }
  };

  const toggleInclusion = (inc: string) => {
    const current = formData.inclusions || [];
    if (current.includes(inc)) {
      setFormData({ ...formData, inclusions: current.filter(i => i !== inc) });
    } else {
      setFormData({ ...formData, inclusions: [...current, inc] });
    }
  };

  const filtered = packages.filter(p => 
    p.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-orange-600" /> Tour Packages Catalog
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Create and manage vacation deals, group tours, honeymoon packages, and itineraries
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Tour Package
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search tour packages by title, destination, description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
        />
      </div>

      {/* Grid view of packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
            No tour packages created. Click "Create Tour Package" to add your first offer.
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-base">{p.packageName}</h3>
                  <span className="px-2.5 py-1 bg-orange-50 text-orange-700 font-bold text-xs rounded-full">
                    {currency}{p.pricePerPerson.toLocaleString()} / person
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {p.destination}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {p.durationDays} Days</span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                  {p.description || 'All-inclusive tour package with flights, accommodation, and city excursions.'}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.inclusions.map((inc, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md">
                      ✓ {inc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedPackage ? 'Edit Tour Package' : 'Create Tour Package'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Package Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.packageName}
                    onChange={e => setFormData({ ...formData, packageName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="e.g. Dubai Summer Special 7-Day Tour"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={e => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Dubai, UAE"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.durationDays}
                    onChange={e => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price Per Person ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pricePerPerson}
                    onChange={e => setFormData({ ...formData, pricePerPerson: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Package Inclusions</label>
                  <div className="flex flex-wrap gap-2">
                    {['Flight', 'Hotel', 'Transfers', 'Meals', 'Guided Tours', 'Visa Support', 'Insurance'].map(inc => {
                      const isInc = (formData.inclusions || []).includes(inc);
                      return (
                        <button
                          key={inc}
                          type="button"
                          onClick={() => toggleInclusion(inc)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                            isInc
                              ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isInc ? '✓ ' : '+ '}{inc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Package Itinerary / Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Day-by-day itinerary highlights, included excursions, hotel stars..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium shadow-sm"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
