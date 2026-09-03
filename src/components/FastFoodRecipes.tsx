import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, Recipe, MenuItem, Ingredient } from '../types';
import { showSuccess, showError } from '../lib/toast';
import { 
  Utensils, 
  Package, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Sparkles, 
  DollarSign, 
  Percent,
  Layers,
  X
} from 'lucide-react';

interface FastFoodRecipesProps {
  business: Business;
  user: any;
}

export const FastFoodRecipes: React.FC<FastFoodRecipesProps> = ({ business, user }) => {
  const currency = business.currency || 'GHC';

  const menuItems = db.getFastFoodMenuItems(business.id);
  const ingredients = db.getFastFoodIngredients(business.id);
  const recipes = db.getFastFoodRecipes(business.id);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  
  // Recipe Items in Modal
  const [recipeItems, setRecipeItems] = useState<{
    ingredientId: string;
    quantityNeeded: number;
  }[]>([]);

  const handleOpenRecipeModal = (menuItem: MenuItem) => {
    setSelectedMenuItemId(menuItem.id);
    const existingRecipe = recipes.find(r => r.menuItemId === menuItem.id);
    if (existingRecipe) {
      setRecipeItems(existingRecipe.items.map(it => ({ ingredientId: it.ingredientId, quantityNeeded: it.quantityNeeded })));
    } else {
      setRecipeItems([]);
    }
    setIsModalOpen(true);
  };

  const addIngredientToRecipe = () => {
    if (ingredients.length === 0) {
      showError('No Ingredients', 'Please register raw ingredients first.');
      return;
    }
    setRecipeItems(prev => [...prev, { ingredientId: ingredients[0].id, quantityNeeded: 1 }]);
  };

  const removeIngredientFromRecipe = (idx: number) => {
    setRecipeItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRecipeIngredient = (idx: number, field: 'ingredientId' | 'quantityNeeded', val: any) => {
    setRecipeItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMenuItemId) return;

    const menuItem = menuItems.find(m => m.id === selectedMenuItemId);
    if (!menuItem) return;

    const recipeData: Recipe = {
      id: 'rec-' + selectedMenuItemId,
      businessId: business.id,
      menuItemId: selectedMenuItemId,
      menuItemName: menuItem.name,
      items: recipeItems.map(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        return {
          ingredientId: ri.ingredientId,
          ingredientName: ing ? ing.name : 'Unknown Ingredient',
          quantityNeeded: ri.quantityNeeded
        };
      }),
      updatedAt: new Date().toISOString()
    };

    db.saveFastFoodRecipe(business.id, recipeData);
    showSuccess('Recipe Saved', `Recipe for ${menuItem.name} configured.`);
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Utensils className="h-6 w-6 text-emerald-600" /> Recipe & Food Cost Management
          </h1>
          <p className="text-xs text-slate-500">Link menu food items to ingredient usage for automatic inventory deduction & food cost margin calculation</p>
        </div>
      </div>

      {/* RECIPES LIST BY MENU ITEM */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map(item => {
          const recipe = recipes.find(r => r.menuItemId === item.id);
          
          // Calculate Food Cost
          let totalCost = 0;
          if (recipe) {
            recipe.items.forEach(ri => {
              const ing = ingredients.find(i => i.id === ri.ingredientId);
              if (ing) {
                totalCost += (ing.costPrice * ri.quantityNeeded);
              }
            });
          }

          const profit = item.sellingPrice - totalCost;
          const profitMargin = item.sellingPrice > 0 ? (profit / item.sellingPrice) * 100 : 0;

          return (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</span>
                  </div>
                  <span className="text-sm font-black text-emerald-700">{formatCurrency(item.sellingPrice, currency)}</span>
                </div>

                {/* RECIPE INGREDIENTS BREAKDOWN */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipe Ingredients</span>
                  {recipe && recipe.items.length > 0 ? (
                    recipe.items.map((ri, idx) => {
                      const ing = ingredients.find(i => i.id === ri.ingredientId);
                      return (
                        <div key={idx} className="flex justify-between items-center text-slate-700 font-medium">
                          <span>{ri.quantityNeeded} {ing?.unit || 'pcs'} {ri.ingredientName}</span>
                          <span className="text-slate-500">{ing ? formatCurrency(ing.costPrice * ri.quantityNeeded, currency) : ''}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-amber-600 font-semibold italic">No recipe ingredients configured.</p>
                  )}
                </div>

                {/* FINANCIAL ANALYSIS */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-100 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold block">Raw Food Cost</span>
                    <span className="text-xs font-black text-slate-800">{formatCurrency(totalCost, currency)}</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl">
                    <span className="text-[10px] text-emerald-700 font-bold block">Profit Margin</span>
                    <span className="text-xs font-black text-emerald-900">{profitMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenRecipeModal(item)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Edit className="h-4 w-4" /> {recipe ? 'Configure Recipe' : 'Add Recipe Link'}
              </button>
            </div>
          );
        })}
      </div>

      {/* RECIPE EDIT MODAL */}
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
                Recipe Configuration
              </h3>
              <p className="text-xs text-slate-500">Specify exact ingredient quantities needed per portion sold</p>
            </div>

            <form onSubmit={handleSaveRecipe} className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-500 uppercase tracking-wider">Required Ingredients</label>
                  <button
                    type="button"
                    onClick={addIngredientToRecipe}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Ingredient
                  </button>
                </div>

                {recipeItems.map((ri, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                    <select
                      value={ri.ingredientId}
                      onChange={(e) => updateRecipeIngredient(idx, 'ingredientId', e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800 font-medium cursor-pointer"
                    >
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      value={ri.quantityNeeded}
                      onChange={(e) => updateRecipeIngredient(idx, 'quantityNeeded', parseFloat(e.target.value) || 0)}
                      placeholder="Qty"
                      className="w-20 bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800"
                    />

                    <button
                      type="button"
                      onClick={() => removeIngredientFromRecipe(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {recipeItems.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-2xl">
                    No ingredients added yet. Click "+ Add Ingredient" above.
                  </p>
                )}
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
                  Save Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
