import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, MenuItem } from '../types';
import { showSuccess, showError } from '../lib/toast';
import { ImageUploadInput } from './ImageUploadInput';
import { 
  Utensils, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  X, 
  Image as ImageIcon, 
  Layers,
  Filter
} from 'lucide-react';

interface FastFoodMenuProps {
  business: Business;
  user: any;
}

export const FastFoodMenu: React.FC<FastFoodMenuProps> = ({ business, user }) => {
  const currency = business.currency || 'GHC';
  const menuItems = db.getFastFoodMenuItems(business.id);

  const defaultCategories = ['Burgers', 'Chicken', 'Pizza', 'Rice Meals', 'Drinks', 'Snacks', 'Desserts', 'Specials'];
  const customCategories = Array.from(new Set(menuItems.map(m => m.category))).filter((c): c is string => typeof c === 'string' && !defaultCategories.includes(c));
  const categories = [...defaultCategories, ...customCategories];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form Fields
  const [foodName, setFoodName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Burgers');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [prepTime, setPrepTime] = useState('10');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFoodName('');
    setDescription('');
    setCategory('Burgers');
    setCustomCategoryInput('');
    setSellingPrice('');
    setPrepTime('10');
    setImageUrl('');
    setIsAvailable(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFoodName(item.name);
    setDescription(item.description);
    setCategory(categories.includes(item.category) ? item.category : 'Custom');
    setCustomCategoryInput(!categories.includes(item.category) ? item.category : '');
    setSellingPrice(item.sellingPrice.toString());
    setPrepTime(item.prepTime?.toString() || '10');
    setImageUrl(item.imageUrl || '');
    setIsAvailable(item.isAvailable);
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(sellingPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      showError('Invalid Price', 'Please enter a valid selling price.');
      return;
    }

    const finalCategory = category === 'Custom' ? (customCategoryInput || 'General') : category;

    const itemData: MenuItem = {
      id: editingItem ? editingItem.id : 'm-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: foodName,
      description,
      category: finalCategory,
      sellingPrice: priceNum,
      prepTime: parseInt(prepTime) || 10,
      imageUrl: imageUrl || undefined,
      isAvailable,
      updatedAt: new Date().toISOString()
    };

    db.saveFastFoodMenuItem(business.id, itemData);
    showSuccess('Menu Updated', `${foodName} saved successfully.`);
    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name} from the menu?`)) {
      db.deleteFastFoodMenuItem(business.id, id);
      showSuccess('Item Deleted', `${name} removed from menu.`);
    }
  };

  const handleToggleAvailability = (item: MenuItem) => {
    const updated = { ...item, isAvailable: !item.isAvailable };
    db.saveFastFoodMenuItem(business.id, updated);
  };

  const filteredItems = menuItems.filter(m => {
    const matchCat = selectedCategoryFilter === 'All' || m.category === selectedCategoryFilter;
    const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        m.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Utensils className="h-6 w-6 text-emerald-600" /> Fast Food Menu Management
          </h1>
          <p className="text-xs text-slate-500">Add, edit, organize and control availability of fast food items</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3 bg-[#064E3B] hover:bg-[#032e23] text-white font-bold text-xs rounded-2xl shadow transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Food Menu Item
        </button>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search menu items..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategoryFilter('All')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              selectedCategoryFilter === 'All' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            All Categories
          </button>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategoryFilter(c)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                selectedCategoryFilter === c ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ITEMS CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              
              {/* IMAGE / ICON */}
              <div className="h-36 w-full bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <Utensils className="h-12 w-12 text-slate-300" />
                )}

                <span className={`absolute top-2 right-2 px-2.5 py-1 rounded-xl text-[10px] font-black ${
                  item.isAvailable ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  {item.isAvailable ? 'Available' : 'Out of Stock'}
                </span>

                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg">
                  {item.category}
                </span>
              </div>

              {/* DETAILS */}
              <div>
                <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{item.description || 'No description provided.'}</p>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-black text-emerald-700 text-base">{formatCurrency(item.sellingPrice, currency)}</span>
                <span className="text-slate-500 font-semibold flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Clock className="h-3 w-3" /> {item.prepTime || 10} min
                </span>
              </div>
            </div>

            {/* CARD ACTIONS */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleToggleAvailability(item)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-bold cursor-pointer transition ${
                  item.isAvailable ? 'bg-amber-50 hover:bg-amber-100 text-amber-800' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                }`}
              >
                {item.isAvailable ? 'Mark Out of Stock' : 'Mark Available'}
              </button>

              <button
                onClick={() => handleOpenEditModal(item)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                <Edit className="h-4 w-4" />
              </button>

              <button
                onClick={() => handleDeleteItem(item.id, item.name)}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
            <Utensils className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No menu items found</h3>
            <p className="text-xs text-slate-400">Click "Add Food Menu Item" to create your first item.</p>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {editingItem ? 'Edit Food Menu Item' : 'Add Food Menu Item'}
              </h3>
              <p className="text-xs text-slate-500">Configure item details, price, category, image and prep duration</p>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Food Name *</label>
                <input
                  type="text"
                  required
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. Double Beef Cheeseburger"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Two flame-grilled beef patties with melted cheddar, pickles and secret sauce."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Custom">+ Create Custom Category</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Selling Price ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="45.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-xs"
                  />
                </div>
              </div>

              {category === 'Custom' && (
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    required
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="e.g. Wraps & Rolls"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Preparation Time (Mins)</label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="10"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div>
                <ImageUploadInput
                  label="Food Item Image"
                  value={imageUrl}
                  onChange={(url) => setImageUrl(url)}
                  placeholder="Paste image URL or click Upload"
                  businessId={business.id}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded"
                  />
                  <span className="font-bold text-slate-700">Currently Available for Ordering</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#064E3B] hover:bg-[#032e23] text-white font-bold rounded-2xl cursor-pointer shadow"
                >
                  Save Food Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
