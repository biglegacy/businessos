/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, Business, User } from '../types';
import { db, getCurrencySymbol, formatCurrency } from '../lib/db';
import { 
  AlertTriangle, PackageX, PackagePlus, ArrowRight, 
  ChevronDown, ChevronUp, X, Check, Eye, SlidersHorizontal,
  Plus, RefreshCw, Store, Edit2
} from 'lucide-react';

interface DashboardInventoryAlertProps {
  products: Product[];
  business: Business;
  user: User;
  onNavigate: (tab: string) => void;
  onStockAdjust: (productId: string, delta: number) => void;
  onThresholdAdjust?: (productId: string, newThreshold: number) => void;
}

export function DashboardInventoryAlert({
  products,
  business,
  user,
  onNavigate,
  onStockAdjust,
  onThresholdAdjust
}: DashboardInventoryAlertProps) {
  // If there are no low stock or depleted products, do not display notification
  if (!products || products.length === 0) {
    return null;
  }

  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'depleted' | 'low'>('all');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [customDelta, setCustomDelta] = useState<number>(10);
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [newThresholdVal, setNewThresholdVal] = useState<number>(5);

  // Split and categorize urgent items
  const depletedItems = useMemo(() => {
    return products.filter(p => p.stockQuantity <= 0);
  }, [products]);

  const lowStockItems = useMemo(() => {
    return products.filter(p => p.stockQuantity > 0);
  }, [products]);

  // Filtered and sorted products (Depleted/0 items first, then lowest stock)
  const displayItems = useMemo(() => {
    let list = products;
    if (activeFilter === 'depleted') {
      list = depletedItems;
    } else if (activeFilter === 'low') {
      list = lowStockItems;
    }
    return [...list].sort((a, b) => {
      if (a.stockQuantity <= 0 && b.stockQuantity > 0) return -1;
      if (b.stockQuantity <= 0 && a.stockQuantity > 0) return 1;
      return a.stockQuantity - b.stockQuantity;
    });
  }, [products, activeFilter, depletedItems, lowStockItems]);

  const branches = useMemo(() => {
    return db.getBranches(business.id) || [];
  }, [business.id]);

  const getBranchName = (branchId?: string) => {
    if (!branchId || branchId === 'All') return null;
    const found = branches.find(b => b.id === branchId);
    return found ? found.name : null;
  };

  const handleQuickRestock = (productId: string, delta: number) => {
    onStockAdjust(productId, delta);
    setFeedbackMap(prev => ({ ...prev, [productId]: `+${delta} Added` }));
    setTimeout(() => {
      setFeedbackMap(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }, 2200);
  };

  // If user dismissed notification for the current session, show a sleek reminder bar
  if (isDismissed) {
    return (
      <div className="mb-6 px-4 py-2.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-xs transition">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="font-semibold">
            {products.length} {products.length === 1 ? 'item requires' : 'items require'} urgent inventory attention
          </span>
          <span className="text-amber-700 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-amber-700 hidden sm:inline">
            {depletedItems.length} depleted, {lowStockItems.length} below minimum threshold
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDismissed(false)}
            className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[11px] transition cursor-pointer"
          >
            Review Urgent Items
          </button>
          <button
            type="button"
            onClick={() => onNavigate('Products')}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition cursor-pointer"
          >
            Go to Inventory
          </button>
        </div>
      </div>
    );
  }

  const isSevere = depletedItems.length > 0;

  return (
    <div className={`mb-6 rounded-3xl bg-white border shadow-xs transition overflow-hidden ${
      isSevere ? 'border-rose-200 shadow-rose-50/50' : 'border-amber-200 shadow-amber-50/50'
    }`}>
      {/* Top Urgent Status Banner / Header */}
      <div className={`px-5 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isSevere ? 'bg-rose-50/70 border-rose-100' : 'bg-amber-50/70 border-amber-100'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-2xl shrink-0 ${
            isSevere ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
          }`}>
            {isSevere ? <PackageX className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                Urgent Inventory Attention
              </h3>
              <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isSevere ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {products.length} {products.length === 1 ? 'Item Needs Restock' : 'Items Need Restock'}
              </span>
            </div>

            <p className="text-slate-600 text-xs mt-0.5">
              {depletedItems.length > 0 && (
                <span className="font-semibold text-rose-700 mr-2">
                  {depletedItems.length} completely out of stock
                </span>
              )}
              {lowStockItems.length > 0 && (
                <span className="text-slate-600">
                  {lowStockItems.length} approaching stockout threshold
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center p-1 bg-white/90 border border-slate-200 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('depleted')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                activeFilter === 'depleted'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Depleted ({depletedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('low')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                activeFilter === 'low'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-amber-800'
              }`}
            >
              Low ({lowStockItems.length})
            </button>
          </div>

          {/* Manage in Inventory Button */}
          <button
            type="button"
            onClick={() => onNavigate('Products')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs shrink-0"
          >
            <span>Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
            title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>

          {/* Dismiss for Session */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 hover:bg-rose-100/60 text-slate-400 hover:text-rose-700 rounded-xl transition cursor-pointer"
            title="Dismiss notification for this session"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area (Hidden if Collapsed) */}
      {!isCollapsed && (
        <div className="p-5 space-y-3">
          {displayItems.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              No items match the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayItems.slice(0, 6).map(item => {
                const defaultThreshold = typeof business.defaultLowStockThreshold === 'number' ? business.defaultLowStockThreshold : 5;
                const threshold = typeof item.lowStockThreshold === 'number' ? item.lowStockThreshold : defaultThreshold;
                const isOutOfStock = item.stockQuantity <= 0;
                const percent = Math.min(100, Math.max(0, Math.round((item.stockQuantity / threshold) * 100)));
                const branchName = getBranchName(item.branchId);
                const feedback = feedbackMap[item.id];

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition hover:shadow-sm flex flex-col justify-between ${
                      isOutOfStock 
                        ? 'bg-rose-50/30 border-rose-200/80 hover:border-rose-300' 
                        : 'bg-amber-50/20 border-amber-200/70 hover:border-amber-300'
                    }`}
                  >
                    <div>
                      {/* Product Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-xs truncate" title={item.name}>
                            {item.name}
                          </h4>
                          {/* Unboxed Metadata Line with typographic separators */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                            <span>{item.category || 'Standard'}</span>
                            {item.barcode && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-slate-600">{item.barcode}</span>
                              </>
                            )}
                            {branchName && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-slate-600">{branchName}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Stock Metric Indicator & Threshold */}
                        <div className="text-right shrink-0">
                          <div className={`font-mono font-extrabold text-xs ${
                            isOutOfStock ? 'text-rose-600' : 'text-amber-700'
                          }`}>
                            {item.stockQuantity} {item.unitOfMeasurement || 'units'}
                          </div>

                          {/* Low Stock Threshold with inline quick editor */}
                          {editingThresholdId === item.id ? (
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              <span className="text-[10px] text-slate-500 font-bold">Limit:</span>
                              <input
                                type="number"
                                min="0"
                                value={newThresholdVal}
                                onChange={(e) => setNewThresholdVal(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-12 px-1 py-0.5 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-800 text-center"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (onThresholdAdjust) {
                                    onThresholdAdjust(item.id, newThresholdVal);
                                  }
                                  setEditingThresholdId(null);
                                }}
                                className="p-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                title="Save new threshold"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingThresholdId(null)}
                                className="p-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingThresholdId(item.id);
                                setNewThresholdVal(threshold);
                              }}
                              className="group flex items-center gap-1 text-[10px] text-slate-500 font-medium hover:text-slate-800 transition cursor-pointer mt-0.5 ml-auto"
                              title="Click to edit Low Stock Threshold"
                            >
                              <span>Alert Limit: <strong className="text-slate-700">{threshold}</strong></span>
                              <Edit2 className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100 text-slate-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Stock Level Visual Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOutOfStock 
                                ? 'bg-rose-500 w-full' 
                                : percent <= 30 
                                  ? 'bg-rose-500' 
                                  : 'bg-amber-500'
                            }`}
                            style={{ width: isOutOfStock ? '100%' : `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] mt-1 text-slate-400">
                          <span>
                            {isOutOfStock ? '0% Remaining' : `${percent}% of minimum target`}
                          </span>
                          <span>
                            Selling: {formatCurrency(item.sellingPrice || item.price || 0, business.currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Restock Action Row */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      {feedback ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>{feedback}</span>
                        </div>
                      ) : adjustingId === item.id ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="number"
                            min="1"
                            value={customDelta}
                            onChange={(e) => setCustomDelta(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800"
                            placeholder="Qty"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleQuickRestock(item.id, customDelta);
                              setAdjustingId(null);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustingId(null)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Quick Restock
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(item.id, 5)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs hover:border-slate-300"
                              title="Instantly add 5 units to stock"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(item.id, 10)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs hover:border-slate-300"
                              title="Instantly add 10 units to stock"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingId(item.id);
                                setCustomDelta(15);
                              }}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                              title="Enter custom restock quantity"
                            >
                              Custom
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Navigation Link when more than 6 items exist */}
          {displayItems.length > 6 && (
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
              <span>
                Showing 6 of {displayItems.length} urgent inventory items
              </span>
              <button
                type="button"
                onClick={() => onNavigate('Products')}
                className="font-bold text-slate-900 hover:text-emerald-700 flex items-center gap-1 transition cursor-pointer"
              >
                <span>View All {displayItems.length} Urgent Items in Inventory</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
