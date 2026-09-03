import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, Product } from '../types';
import { ImageUploadInput } from './ImageUploadInput';
import { 
  ShoppingBag, Plus, Search, Edit3, Trash2, AlertTriangle, 
  Barcode, CheckCircle2, X, Filter, Package, ArrowUpRight
} from 'lucide-react';
import { showSuccess, showError } from '../lib/toast';

interface SalonProductsProps {
  business: Business;
  onNavigatePOS?: () => void;
}

const SALON_PRODUCT_CATEGORIES = [
  'Hair Care & Shampoos', 'Hair Creams & Conditioners', 'Hair Oils & Serums',
  'Wigs & Weaves', 'Hair Extensions', 'Beard Grooming Products',
  'Cosmetics & Makeup', 'Skincare & Facials', 'Nail Care & Polish',
  'Styling Tools & Accessories', 'General Grooming'
];

export const SalonProducts: React.FC<SalonProductsProps> = ({
  business,
  onNavigatePOS
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState(SALON_PRODUCT_CATEGORIES[0]);
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [barcode, setBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  // Load Cloud Data
  const products = db.getProducts(business.id);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory(SALON_PRODUCT_CATEGORIES[0]);
    setPrice(0);
    setCostPrice(0);
    setStockQuantity(10);
    setLowStockThreshold(5);
    setBarcode('');
    setImageUrl('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategory(SALON_PRODUCT_CATEGORIES.includes(product.category) ? product.category : SALON_PRODUCT_CATEGORIES[0]);
    setPrice(product.sellingPrice || product.price || 0);
    setCostPrice(product.costPrice || 0);
    setStockQuantity(product.stockQuantity);
    setLowStockThreshold(product.lowStockThreshold || 5);
    setBarcode(product.barcode || '');
    setImageUrl(product.imageUrl || '');
    setDescription(product.description || '');
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Validation Error', 'Please enter a valid product name.');
      return;
    }
    if (price <= 0) {
      showError('Validation Error', 'Please specify a product selling price above 0.');
      return;
    }

    const prodObj: Product = {
      id: editingProduct ? editingProduct.id : 'prd_' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: name.trim(),
      category,
      sellingPrice: Number(price),
      price: Number(price),
      costPrice: Number(costPrice),
      stockQuantity: Number(stockQuantity),
      lowStockThreshold: Number(lowStockThreshold),
      barcode: barcode.trim() || undefined,
      imageUrl: imageUrl || undefined,
      description: description.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    db.saveProduct(business.id, prodObj);
    showSuccess(editingProduct ? 'Product Updated' : 'Product Created', `${name} inventory record saved successfully.`);
    setIsModalOpen(false);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (confirm(`Are you sure you want to delete product "${productName}"?`)) {
      db.deleteProduct(business.id, productId);
      showSuccess('Product Deleted', `${productName} was removed from catalog.`);
    }
  };

  const allCategories = ['All', ...Array.from(new Set([...SALON_PRODUCT_CATEGORIES, ...products.map(p => p.category)]))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Title Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-indigo-600" /> Salon Grooming Products Inventory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track retail beauty products, hair oils, extensions, cosmetics, barcodes, and real-time stock levels.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Product Item
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by name, barcode, category..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <Package className="h-12 w-12 mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-500">No grooming products found in catalog.</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            + Add First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map(prod => {
            const isLowStock = prod.stockQuantity <= (prod.lowStockThreshold || 5);

            return (
              <div 
                key={prod.id} 
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-300 transition shadow-xs hover:shadow-md overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {prod.imageUrl ? (
                      <img 
                        src={prod.imageUrl} 
                        alt={prod.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-indigo-300" />
                      </div>
                    )}

                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-md text-slate-800 rounded-full text-[10px] font-bold shadow-xs">
                      {prod.category}
                    </span>

                    {isLowStock && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-sm animate-pulse">
                        <AlertTriangle className="h-3 w-3" /> Low Stock ({prod.stockQuantity})
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1">{prod.name}</h3>
                    <div className="flex justify-between items-baseline pt-1">
                      <div className="font-black text-slate-900 text-base">{formatCurrency(prod.sellingPrice || prod.price || 0, business.currency)}</div>
                      <div className={`text-xs font-extrabold ${isLowStock ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {prod.stockQuantity} in stock
                      </div>
                    </div>

                    {prod.barcode && (
                      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 pt-1">
                        <Barcode className="h-3 w-3" /> {prod.barcode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {onNavigatePOS && (
                    <button
                      onClick={onNavigatePOS}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      Sell in POS
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-indigo-600" /> 
                {editingProduct ? 'Edit Grooming Product' : 'Add Grooming Product'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Argan Oil Hair Serum 100ml"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    {SALON_PRODUCT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selling Price ({business.currency || 'GH₵'}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-extrabold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Low Stock Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cost Price (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Barcode / SKU (Optional)</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter barcode number..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <ImageUploadInput
                  value={imageUrl}
                  onChange={setImageUrl}
                  label="Product Photo Upload"
                  placeholder="Upload product photo or URL"
                  businessId={business.id}
                />
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-md transition cursor-pointer"
                >
                  {editingProduct ? 'Save Product Changes' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
