import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, Ingredient } from '../types';
import { showSuccess, showError } from '../lib/toast';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Truck, 
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface FastFoodIngredientsProps {
  business: Business;
  user: any;
}

export const FastFoodIngredients: React.FC<FastFoodIngredientsProps> = ({ business, user }) => {
  const currency = business.currency || 'GHC';
  const ingredients = db.getFastFoodIngredients(business.id);
  const suppliers = db.getSuppliers(business.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);

  // Form Fields
  const [ingName, setIngName] = useState('');
  const [category, setCategory] = useState('Meat & Poultry');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [costPrice, setCostPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('10');

  const handleOpenAdd = () => {
    setEditingIng(null);
    setIngName('');
    setCategory('Meat & Poultry');
    setQuantity('');
    setUnit('pcs');
    setCostPrice('');
    setSupplier(suppliers[0]?.name || '');
    setMinStockLevel('10');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ing: Ingredient) => {
    setEditingIng(ing);
    setIngName(ing.name);
    setCategory(ing.category);
    setQuantity(ing.quantity.toString());
    setUnit(ing.unit);
    setCostPrice(ing.costPrice.toString());
    setSupplier(ing.supplier || '');
    setMinStockLevel(ing.minStockLevel.toString());
    setIsModalOpen(true);
  };

  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();

    const qtyNum = parseFloat(quantity);
    const costNum = parseFloat(costPrice);
    const minNum = parseFloat(minStockLevel);

    if (isNaN(qtyNum) || qtyNum < 0) {
      showError('Invalid Quantity', 'Please enter a valid non-negative quantity.');
      return;
    }

    const ingData: Ingredient = {
      id: editingIng ? editingIng.id : 'ing-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: ingName,
      category,
      quantity: qtyNum,
      unit,
      costPrice: isNaN(costNum) ? 0 : costNum,
      supplier,
      minStockLevel: isNaN(minNum) ? 5 : minNum,
      updatedAt: new Date().toISOString()
    };

    db.saveFastFoodIngredient(business.id, ingData);
    showSuccess('Ingredient Saved', `${ingName} inventory updated.`);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete ingredient ${name}?`)) {
      db.deleteFastFoodIngredient(business.id, id);
      showSuccess('Ingredient Deleted', `${name} removed from stock.`);
    }
  };

  const filteredIngredients = ingredients.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        i.category.toLowerCase().includes(searchTerm.toLowerCase());
    if (selectedFilter === 'LOW') return matchSearch && i.quantity <= i.minStockLevel && i.quantity > 0;
    if (selectedFilter === 'OUT') return matchSearch && i.quantity <= 0;
    return matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" /> Ingredient Inventory Management
          </h1>
          <p className="text-xs text-slate-500">Track raw food materials, reorder levels, cost valuations and supplier linkage</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 bg-[#064E3B] hover:bg-[#032e23] text-white font-bold text-xs rounded-2xl shadow transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add New Ingredient
        </button>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search raw ingredients..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'LOW', 'OUT'] as const).map(st => (
            <button
              key={st}
              onClick={() => setSelectedFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedFilter === st ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {st === 'ALL' ? 'All Ingredients' : st === 'LOW' ? 'Low Stock Warnings' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE LIST */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider">
                <th className="py-4 px-6">Ingredient</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Stock Quantity</th>
                <th className="py-4 px-6">Cost Price</th>
                <th className="py-4 px-6">Valuation</th>
                <th className="py-4 px-6">Supplier</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredIngredients.map(ing => {
                const isLow = ing.quantity <= ing.minStockLevel && ing.quantity > 0;
                const isOut = ing.quantity <= 0;

                return (
                  <tr key={ing.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {ing.name}
                    </td>
                    <td className="py-4 px-6 text-slate-500">{ing.category}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold ${
                        isOut ? 'bg-rose-100 text-rose-800' :
                        isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ing.quantity} {ing.unit}
                        {isOut && '(Out of Stock)'}
                        {isLow && '(Low Stock)'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold">{formatCurrency(ing.costPrice, currency)} / {ing.unit}</td>
                    <td className="py-4 px-6 font-black text-emerald-700">
                      {formatCurrency(ing.costPrice * ing.quantity, currency)}
                    </td>
                    <td className="py-4 px-6 text-slate-500">{ing.supplier || 'N/A'}</td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(ing)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer inline-block"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ing.id, ing.name)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer inline-block"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredIngredients.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No ingredients found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
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
                {editingIng ? 'Edit Raw Ingredient' : 'Add Raw Ingredient'}
              </h3>
              <p className="text-xs text-slate-500">Configure stock level, cost price, unit and minimum reorder alert</p>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  placeholder="e.g. Beef Patties / Cheese Slices / Flour"
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
                    <option value="Meat & Poultry">Meat & Poultry</option>
                    <option value="Dairy & Cheese">Dairy & Cheese</option>
                    <option value="Bakery & Buns">Bakery & Buns</option>
                    <option value="Produce & Vegetables">Produce & Vegetables</option>
                    <option value="Oils & Sauces">Oils & Sauces</option>
                    <option value="Beverages & Syrups">Beverages & Syrups</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Unit of Measure</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs cursor-pointer"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="g">g (Grams)</option>
                    <option value="L">L (Liters)</option>
                    <option value="ml">ml (Milliliters)</option>
                    <option value="packs">packs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Current Stock Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Min Alert Level</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Cost Price per {unit} ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="15.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Supplier</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Supplier name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
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
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
