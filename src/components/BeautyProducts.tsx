/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, Product } from '../types';
import {
  Sparkles,
  Plus,
  Search,
  Edit,
  Trash2,
  Clock,
  Package,
  X,
  Tag,
  Palette,
  Droplets,
  Layers
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface BeautyProductsProps {
  business: Business;
  onNavigatePOS?: () => void;
}

const DEFAULT_BEAUTY_CATEGORIES = [
  'Makeup',
  'Skincare',
  'Haircare',
  'Body Care',
  'Fragrance & Perfume',
  'Wigs & Weaves',
  'Hair Extensions',
  'Hair Accessories',
  'Nail Care & Polish',
  'Beauty Tools & Brushes',
  "Men's Grooming",
  'Baby Care',
  'Other'
];

export const BeautyProducts: React.FC<BeautyProductsProps> = ({
  business,
  onNavigatePOS
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState(DEFAULT_BEAUTY_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [shade, setShade] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [volume, setVolume] = useState('');
  const [fragrance, setFragrance] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const products = db.getProducts(business.id);
  const now = new Date();

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.shade && p.shade.toLowerCase().includes(term)) ||
        (p.color && p.color.toLowerCase().includes(term)) ||
        (p.fragrance && p.fragrance.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [products, categoryFilter, searchTerm]);

  const handleOpenAddModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setName(prod.name);
      setBrand(prod.brand || '');
      setCategory(DEFAULT_BEAUTY_CATEGORIES.includes(prod.category) ? prod.category : 'Other');
      setCustomCategory(DEFAULT_BEAUTY_CATEGORIES.includes(prod.category) ? '' : prod.category);
      setShade(prod.shade || '');
      setColor(prod.color || '');
      setSize(prod.size || '');
      setVolume(prod.volume || '');
      setFragrance(prod.fragrance || '');
      setSellingPrice(prod.sellingPrice?.toString() || '');
      setCostPrice(prod.costPrice?.toString() || '');
      setStockQuantity(prod.stockQuantity?.toString() || '0');
      setLowStockThreshold(prod.lowStockThreshold?.toString() || '5');
      setBatchNumber(prod.batchNumber || '');
      setExpiryDate(prod.expiryDate || '');
      setSupplier(prod.supplier || '');
      setDescription(prod.description || '');
      setImageUrl(prod.imageUrl || '');
    } else {
      setEditingProduct(null);
      setName('');
      setBrand('');
      setCategory(DEFAULT_BEAUTY_CATEGORIES[0]);
      setCustomCategory('');
      setShade('');
      setColor('');
      setSize('');
      setVolume('');
      setFragrance('');
      setSellingPrice('');
      setCostPrice('');
      setStockQuantity('0');
      setLowStockThreshold('5');
      setBatchNumber('BTY-' + Math.floor(1000 + Math.random() * 9000));
      setExpiryDate('');
      setSupplier('');
      setDescription('');
      setImageUrl('');
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('Name Required', 'Please enter beauty product name.');
      return;
    }

    const finalCat = category === 'Other' && customCategory.trim() ? customCategory.trim() : category;

    const targetProduct: Product = {
      id: editingProduct ? editingProduct.id : 'bty_' + Date.now(),
      businessId: business.id,
      name: name.trim(),
      brand: brand.trim() || undefined,
      category: finalCat,
      shade: shade.trim() || undefined,
      color: color.trim() || undefined,
      size: size.trim() || undefined,
      volume: volume.trim() || undefined,
      fragrance: fragrance.trim() || undefined,
      sellingPrice: parseFloat(sellingPrice) || 0,
      costPrice: parseFloat(costPrice) || 0,
      stockQuantity: parseInt(stockQuantity, 10) || 0,
      lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
      reorderLevel: parseInt(lowStockThreshold, 10) || 5,
      batchNumber: batchNumber.trim() || undefined,
      expiryDate: expiryDate.trim() || undefined,
      supplier: supplier.trim() || undefined,
      description: description.trim() || '',
      imageUrl: imageUrl.trim() || undefined,
      barcode: editingProduct?.barcode || 'BTY' + Math.floor(100000 + Math.random() * 900000),
      status: 'Active',
      updatedAt: new Date().toISOString()
    };

    db.saveProduct(business.id, targetProduct);
    showSuccess(
      editingProduct ? 'Product Updated' : 'Product Added',
      `"${targetProduct.name}" saved to beauty catalog.`
    );
    setIsModalOpen(false);
  };

  const handleDeleteProduct = (id: string, prodName: string) => {
    if (confirm(`Delete "${prodName}" from beauty catalog?`)) {
      db.deleteProduct(business.id, id);
      showSuccess('Product Removed', `"${prodName}" deleted.`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-rose-600" />
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Cosmetics, Skincare & Beauty Catalog
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Manage shade numbers, fragrances, volume sizes, cosmetic formulations, and expiration dates.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Beauty Item</span>
          </button>
          {onNavigatePOS && (
            <button
              onClick={onNavigatePOS}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Open Beauty POS
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name, brand, shade, color, or fragrance..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer w-full sm:w-auto"
        >
          <option value="All">All Categories</option>
          {DEFAULT_BEAUTY_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Products Grid / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-800">No beauty items found.</p>
            <button
              onClick={() => handleOpenAddModal()}
              className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
            >
              Add First Beauty Product
            </button>
          </div>
        ) : (
          filteredProducts.map(prod => {
            const isOutOfStock = prod.stockQuantity <= 0;
            const isLowStock = prod.stockQuantity > 0 && prod.stockQuantity <= (prod.lowStockThreshold || 5);
            const isExpired = prod.expiryDate && new Date(prod.expiryDate) < now;

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between hover:border-rose-300 hover:shadow-md transition space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md">
                      {prod.category}
                    </span>
                    {isExpired && (
                      <span className="text-[10px] font-extrabold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                        Expired
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{prod.name}</h4>
                  {prod.brand && (
                    <p className="text-[11px] text-slate-500 font-semibold">{prod.brand}</p>
                  )}

                  {/* Attributes chips: Shade, Color, Volume, Fragrance */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {prod.shade && (
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        Shade: {prod.shade}
                      </span>
                    )}
                    {prod.color && (
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        {prod.color}
                      </span>
                    )}
                    {prod.volume && (
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        {prod.volume}
                      </span>
                    )}
                    {prod.fragrance && (
                      <span className="text-[10px] bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded font-medium">
                        {prod.fragrance}
                      </span>
                    )}
                  </div>

                  {prod.expiryDate && (
                    <div className="text-[10px] text-slate-400 mt-2">
                      Exp: {prod.expiryDate}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-rose-700">
                      {formatCurrency(prod.sellingPrice, business.currency || 'GHC')}
                    </div>
                    <div className={`text-[10px] font-bold ${
                      isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                      {isOutOfStock ? 'Out of stock' : `${prod.stockQuantity} in stock`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenAddModal(prod)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Beauty Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingProduct ? 'Edit Beauty Product' : 'Add New Beauty Product'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pro Filt'r Soft Matte Foundation"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Fenty Beauty, Maybelline, Nivea"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                  >
                    {DEFAULT_BEAUTY_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Shade / Tone</label>
                  <input
                    type="text"
                    placeholder="e.g. 360 Rich Espresso, Ivory 110"
                    value={shade}
                    onChange={e => setShade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Crimson Red, Velvet Plum"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Volume / Content</label>
                  <input
                    type="text"
                    placeholder="e.g. 30ml, 100ml, 250g"
                    value={volume}
                    onChange={e => setVolume(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Fragrance / Scent</label>
                  <input
                    type="text"
                    placeholder="e.g. Vanilla Blossom, Unscented"
                    value={fragrance}
                    onChange={e => setFragrance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Selling Price ({business.currency || 'GHC'}) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cost Price ({business.currency || 'GHC'})</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Stock Units</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Expiry Date (Skincare/Perfume)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Save Beauty Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
