import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, MenuItem } from '../types';
import { ImageUploadInput } from './ImageUploadInput';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Filter, 
  Check, 
  X, 
  Clock, 
  FileText, 
  Image as ImageIcon 
} from 'lucide-react';

interface RestaurantMenuProps {
  business: Business;
  currentUser: any;
}

const CATEGORIES = ['Meals', 'Drinks', 'Breakfast', 'Lunch', 'Dinner', 'Desserts', 'Specials'];

export const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ business, currentUser }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => db.getMenuItems(business.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Edit/Create Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [sellingPrice, setSellingPrice] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [taxRate, setTaxRate] = useState('0');

  const refreshData = () => {
    const list = db.getMenuItems(business.id);
    setMenuItems(list);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setImageUrl('');
    setDescription('');
    setCategory(CATEGORIES[0]);
    setSellingPrice('');
    setPrepTime('');
    setIsAvailable(true);
    setTaxRate('0');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setImageUrl(item.imageUrl || '');
    setDescription(item.description);
    setCategory(item.category);
    setSellingPrice(item.sellingPrice.toString());
    setPrepTime(item.prepTime.toString());
    setIsAvailable(item.isAvailable);
    setTaxRate((item.taxRate || 0).toString());
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this menu item? This will also affect connected recipe sheets.')) {
      db.deleteMenuItem(business.id, id);
      db.addActivityLog(business.id, {
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'Delete Menu Item',
        details: `Deleted menu item ID: ${id}`
      });
      alert('Menu item deleted successfully.');
      refreshData();
    }
  };

  const handleToggleAvailability = (item: MenuItem) => {
    const updated = { ...item, isAvailable: !item.isAvailable };
    db.saveMenuItem(business.id, updated);
    refreshData();
  };

  // Handle image upload (base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const cloudUrl = await db.uploadFile(file.name, base64);
          setImageUrl(cloudUrl);
        } catch (err) {
          console.error("Cloud menu image upload failed, falling back to local base64", err);
          setImageUrl(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sellingPrice || !prepTime) {
      alert('Please fill in all required fields.');
      return;
    }

    const newItem: MenuItem = {
      id: editingItem ? editingItem.id : 'men-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: name.trim(),
      imageUrl: imageUrl || undefined,
      description: description.trim(),
      category,
      sellingPrice: parseFloat(sellingPrice),
      prepTime: parseInt(prepTime),
      isAvailable,
      taxRate: parseFloat(taxRate) || 0,
      updatedAt: new Date().toISOString()
    };

    db.saveMenuItem(business.id, newItem);

    db.addActivityLog(business.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      action: editingItem ? 'Edit Menu Item' : 'Add Menu Item',
      details: `${editingItem ? 'Updated' : 'Added'} menu item "${newItem.name}"`
    });

    alert(`Menu item "${newItem.name}" saved successfully.`);
    setIsModalOpen(false);
    refreshData();
  };

  // Filter & Search logic
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Menu & Catalog Management</h2>
          <p className="text-xs text-slate-500 mt-1">Configure your restaurant food categories, descriptions, preparation times, and prices.</p>
        </div>
        {['owner', 'manager'].includes(currentUser.role) && (
          <button 
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Menu Item</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button 
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'All' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Cards */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-slate-700">No menu items found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Create beautiful food and drink configurations to start taking POS orders at the service counter.</p>
          {['owner', 'manager'].includes(currentUser.role) && (
            <button 
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Get Started
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              id={item.id}
              className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all duration-250 ${
                !item.isAvailable ? 'opacity-65 grayscale bg-slate-50' : 'hover:-translate-y-0.5'
              }`}
            >
              {/* Image box */}
              <div className="h-40 bg-slate-50 relative flex items-center justify-center overflow-hidden border-b border-slate-50">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon className="h-10 w-10 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.category}</span>
                  </div>
                )}
                <span className="absolute top-3 right-3 bg-slate-900/85 text-white font-black text-xs px-2.5 py-1.5 rounded-lg shadow-sm">
                  {formatCurrency(item.sellingPrice, business.currency)}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{item.category}</span>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.prepTime} mins
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm truncate">{item.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[2rem] leading-normal">{item.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleAvailability(item)}
                      disabled={!['owner', 'manager'].includes(currentUser.role)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                        item.isAvailable 
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                          : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                      }`}
                    >
                      {item.isAvailable ? 'In Stock' : 'Sold Out'}
                    </button>
                    {item.taxRate && item.taxRate > 0 ? (
                      <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                        Tax: {item.taxRate}%
                      </span>
                    ) : null}
                  </div>

                  {['owner', 'manager'].includes(currentUser.role) && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">{editingItem ? 'Modify Menu Listing' : 'New Menu Listing'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-slate-100 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Item Name *</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chicken Jollof Rice"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category *</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Selling Price (GHC) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="25.00"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prep Time (mins) *</label>
                  <input 
                    type="number"
                    required
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="15"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tax Rate (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe meal ingredients, allergies, side dishes..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <ImageUploadInput
                  label="Food Image (URL or Upload)"
                  value={imageUrl}
                  onChange={(url) => setImageUrl(url)}
                  placeholder="Paste URL or click Upload"
                  businessId={business.id}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="isAvailable"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.checked || e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="isAvailable" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">Make this menu item immediately available for checkout</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer text-center"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
