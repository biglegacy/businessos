import React, { useState } from 'react';
import { db, formatCurrency } from '../lib/db';
import { Business, Ingredient, Recipe, RecipeItem, MenuItem, Supplier } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  AlertTriangle, 
  Check, 
  X, 
  PlusCircle,
  FileText,
  Bookmark,
  TrendingUp,
  Coins,
  ChevronRight,
  Truck,
  Phone,
  MapPin
} from 'lucide-react';

interface RestaurantInventoryProps {
  business: Business;
  currentUser: any;
  initialSubTab?: 'ingredients' | 'recipes' | 'suppliers';
}

const INGREDIENT_CATEGORIES = ['Poultry & Meat', 'Grains & Pasta', 'Oils & Spices', 'Vegetables & Fruits', 'Dairy', 'Beverages & Drinks', 'Packaging & Other'];

export const RestaurantInventory: React.FC<RestaurantInventoryProps> = ({ business, currentUser, initialSubTab }) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'ingredients' | 'recipes' | 'suppliers'>(() => initialSubTab || 'ingredients');

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [searchQuery, setSearchQuery] = useState('');

  // Local state retrieved from db helpers
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => db.getIngredients(business.id));
  const [recipes, setRecipes] = useState<Recipe[]>(() => db.getRecipes(business.id));
  const [menuItems] = useState<MenuItem[]>(() => db.getMenuItems(business.id));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => db.getSuppliers(business.id));

  // Ingredient Form State
  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingCategory, setIngCategory] = useState(INGREDIENT_CATEGORIES[0]);
  const [ingQty, setIngQty] = useState('');
  const [ingUnit, setIngUnit] = useState('pcs');
  const [ingCost, setIngCost] = useState('');
  const [ingSupplier, setIngSupplier] = useState('');
  const [ingMinStock, setIngMinStock] = useState('5');

  // Recipe Form State
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<Recipe | null>(null);
  const [recMenuItemId, setRecMenuItemId] = useState('');
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);

  // Supplier Form State
  const [isSupModalOpen, setIsSupModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supProducts, setSupProducts] = useState('');

  // Helpers for live calculation
  const [selectedIngredientToAdd, setSelectedIngredientToAdd] = useState('');
  const [ingredientAmountToAdd, setIngredientAmountToAdd] = useState('');

  const refreshData = () => {
    setIngredients(db.getIngredients(business.id));
    setRecipes(db.getRecipes(business.id));
    setSuppliers(db.getSuppliers(business.id));
  };

  // --- INGREDIENT MANAGEMENT ---
  const handleOpenAddIng = () => {
    setEditingIng(null);
    setIngName('');
    setIngCategory(INGREDIENT_CATEGORIES[0]);
    setIngQty('');
    setIngUnit('pcs');
    setIngCost('');
    setIngSupplier('');
    setIngMinStock('5');
    setIsIngModalOpen(true);
  };

  const handleOpenEditIng = (ing: Ingredient) => {
    setEditingIng(ing);
    setIngName(ing.name);
    setIngCategory(ing.category);
    setIngQty(ing.quantity.toString());
    setIngUnit(ing.unit);
    setIngCost(ing.costPrice.toString());
    setIngSupplier(ing.supplier || '');
    setIngMinStock(ing.minStockLevel.toString());
    setIsIngModalOpen(true);
  };

  const handleDeleteIng = (id: string) => {
    if (confirm('Are you sure you want to delete this raw material? If linked to recipes, they will lose this ingredient reference.')) {
      db.deleteIngredient(business.id, id);
      refreshData();
    }
  };

  const handleSaveIngSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim() || !ingQty || !ingCost) {
      alert('Please fill in all required fields.');
      return;
    }

    const newItem: Ingredient = {
      id: editingIng ? editingIng.id : 'ing-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: ingName.trim(),
      category: ingCategory,
      quantity: parseFloat(ingQty),
      unit: ingUnit,
      costPrice: parseFloat(ingCost),
      supplier: ingSupplier.trim() || undefined,
      minStockLevel: parseFloat(ingMinStock) || 0,
      updatedAt: new Date().toISOString()
    };

    db.saveIngredient(business.id, newItem);
    setIsIngModalOpen(false);
    refreshData();
  };

  // --- RECIPE MANAGEMENT ---
  const handleOpenAddRec = () => {
    setEditingRec(null);
    setRecMenuItemId(menuItems[0]?.id || '');
    setRecipeItems([]);
    setSelectedIngredientToAdd('');
    setIngredientAmountToAdd('');
    setIsRecModalOpen(true);
  };

  const handleOpenEditRec = (rec: Recipe) => {
    setEditingRec(rec);
    setRecMenuItemId(rec.menuItemId);
    setRecipeItems(rec.items);
    setSelectedIngredientToAdd('');
    setIngredientAmountToAdd('');
    setIsRecModalOpen(true);
  };

  const handleAddIngredientToRecipe = () => {
    if (!selectedIngredientToAdd || !ingredientAmountToAdd) {
      alert('Please select an ingredient and input portion amount.');
      return;
    }
    const matchIng = ingredients.find(i => i.id === selectedIngredientToAdd);
    if (!matchIng) return;

    // Check if ingredient already added
    if (recipeItems.some(item => item.ingredientId === selectedIngredientToAdd)) {
      alert('Ingredient already added to recipe sheet. Edit its portion size instead.');
      return;
    }

    const newItem: RecipeItem = {
      ingredientId: matchIng.id,
      ingredientName: matchIng.name,
      quantityNeeded: parseFloat(ingredientAmountToAdd)
    };

    setRecipeItems([...recipeItems, newItem]);
    setSelectedIngredientToAdd('');
    setIngredientAmountToAdd('');
  };

  const handleRemoveIngredientFromRecipe = (idx: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== idx));
  };

  const handleDeleteRec = (id: string) => {
    if (confirm('Are you sure you want to delete this recipe sheet? Order deductions for this item will stop.')) {
      db.deleteRecipe(business.id, id);
      refreshData();
    }
  };

  // Recipe live analytics calculators
  const calculateFoodCost = (items: RecipeItem[]) => {
    return items.reduce((sum, item) => {
      const matchIng = ingredients.find(i => i.id === item.ingredientId);
      if (matchIng) {
        return sum + (matchIng.costPrice * item.quantityNeeded);
      }
      return sum;
    }, 0);
  };

  const getMenuItemPrice = (itemId: string) => {
    const match = menuItems.find(m => m.id === itemId);
    return match ? match.sellingPrice : 0;
  };

  const getMenuItemName = (itemId: string) => {
    const match = menuItems.find(m => m.id === itemId);
    return match ? match.name : 'Unknown Item';
  };

  const handleSaveRecSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recMenuItemId) {
      alert('Please select a menu item.');
      return;
    }

    const isDuplicate = recipes.some(r => r.menuItemId === recMenuItemId && (!editingRec || editingRec.id !== r.id));
    if (isDuplicate) {
      alert('A recipe sheet already exists for this menu item. Please edit the existing one.');
      return;
    }

    const targetName = getMenuItemName(recMenuItemId);
    const newRecipe: Recipe = {
      id: editingRec ? editingRec.id : 'rec-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      menuItemId: recMenuItemId,
      menuItemName: targetName,
      items: recipeItems,
      updatedAt: new Date().toISOString()
    };

    db.saveRecipe(business.id, newRecipe);
    setIsRecModalOpen(false);
    refreshData();
  };

  // --- SUPPLIER MANAGEMENT ---
  const handleOpenAddSup = () => {
    setEditingSup(null);
    setSupName('');
    setSupPhone('');
    setSupAddress('');
    setSupProducts('');
    setIsSupModalOpen(true);
  };

  const handleOpenEditSup = (sup: Supplier) => {
    setEditingSup(sup);
    setSupName(sup.name);
    setSupPhone(sup.phone);
    setSupAddress(sup.address);
    setSupProducts(sup.productsSupplied);
    setIsSupModalOpen(true);
  };

  const handleDeleteSup = (id: string) => {
    if (confirm('Are you sure you want to delete this supplier record?')) {
      db.deleteSupplier(business.id, id);
      refreshData();
    }
  };

  const handleSaveSupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      alert('Supplier Name is required.');
      return;
    }

    const newSup: Supplier = {
      id: editingSup ? editingSup.id : 'sup-' + Math.random().toString(36).substring(2, 9),
      businessId: business.id,
      name: supName.trim(),
      phone: supPhone.trim(),
      address: supAddress.trim(),
      productsSupplied: supProducts.trim(),
      createdAt: editingSup ? editingSup.createdAt : new Date().toISOString()
    };

    db.saveSupplier(business.id, newSup);
    setIsSupModalOpen(false);
    refreshData();
  };

  // Filters
  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecipes = recipes.filter(r => 
    r.menuItemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.productsSupplied.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Upper sub-header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Operational Sheets</h2>
          <p className="text-xs text-slate-500 mt-1">Manage kitchen raw stock levels, compile recipe portion lists, and coordinate with supply vendors.</p>
        </div>
        
        {/* Sub-tab control */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center self-start sm:self-auto border border-slate-200">
          <button 
            onClick={() => { setActiveSubTab('ingredients'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-tight transition-colors cursor-pointer ${
              activeSubTab === 'ingredients' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ingredients Inventory
          </button>
          <button 
            onClick={() => { setActiveSubTab('recipes'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-tight transition-colors cursor-pointer ${
              activeSubTab === 'recipes' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Recipe Sheets
          </button>
          <button 
            onClick={() => { setActiveSubTab('suppliers'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-tight transition-colors cursor-pointer ${
              activeSubTab === 'suppliers' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Suppliers
          </button>
        </div>
      </div>

      {/* Main filter container */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder={
              activeSubTab === 'ingredients' 
                ? "Search raw ingredients (e.g. Rice, Chicken)..." 
                : activeSubTab === 'recipes' 
                  ? "Search recipe menu items..." 
                  : "Search suppliers..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {['owner', 'manager'].includes(currentUser.role) && (
          <button 
            onClick={
              activeSubTab === 'ingredients' 
                ? handleOpenAddIng 
                : activeSubTab === 'recipes' 
                  ? handleOpenAddRec 
                  : handleOpenAddSup
            }
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>
              {activeSubTab === 'ingredients' 
                ? 'Add Ingredient' 
                : activeSubTab === 'recipes' 
                  ? 'Create Recipe' 
                  : 'Add Supplier'}
            </span>
          </button>
        )}
      </div>

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      {activeSubTab === 'ingredients' ? (
        // INGREDIENTS TABLE VIEW
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredIngredients.length === 0 ? (
            <div className="p-16 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No ingredients configured</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Add raw ingredients to map recipes, log supplier prices, and set automatic low stock kitchen alerts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Ingredient Name</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6 text-right">In Stock</th>
                    <th className="py-4 px-6">Unit</th>
                    <th className="py-4 px-6 text-right">Cost Price / Unit</th>
                    <th className="py-4 px-6">Supplier</th>
                    <th className="py-4 px-6 text-right">Min Level</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    {['owner', 'manager'].includes(currentUser.role) && <th className="py-4 px-6 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredIngredients.map((ing) => {
                    const isLow = ing.quantity <= ing.minStockLevel;
                    return (
                      <tr key={ing.id} id={ing.id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-6 font-extrabold text-slate-800">{ing.name}</td>
                        <td className="py-4 px-6">
                          <span className="bg-slate-100 text-slate-500 font-bold text-[9px] uppercase px-2 py-0.5 rounded">
                            {ing.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-slate-800">{ing.quantity}</td>
                        <td className="py-4 px-6 text-slate-400 font-semibold">{ing.unit}</td>
                        <td className="py-4 px-6 text-right font-semibold text-slate-600">{formatCurrency(ing.costPrice, business.currency)}</td>
                        <td className="py-4 px-6 text-slate-500">{ing.supplier || 'N/A'}</td>
                        <td className="py-4 px-6 text-right text-slate-400 font-bold">{ing.minStockLevel}</td>
                        <td className="py-4 px-6 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold text-[10px] border border-amber-100 uppercase tracking-widest">
                              <AlertTriangle className="h-3 w-3" />
                              Low Alert
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-emerald-100 uppercase tracking-widest">
                              In Stock
                            </span>
                          )}
                        </td>
                        {['owner', 'manager'].includes(currentUser.role) && (
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={() => handleOpenEditIng(ing)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteIng(ing.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeSubTab === 'recipes' ? (
        // RECIPE SHEETS LIST VIEW
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center col-span-full shadow-sm">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-slate-700">No recipe sheets created</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Link menu dishes to ingredients. Once mapped, the stock quantities of these ingredients automatically decrease upon order checkouts.</p>
            </div>
          ) : (
            filteredRecipes.map((rec) => {
              const cost = calculateFoodCost(rec.items);
              const price = getMenuItemPrice(rec.menuItemId);
              const profit = price - cost;
              const margin = price > 0 ? (profit / price) * 100 : 0;

              return (
                <div key={rec.id} id={rec.id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4 hover:-translate-y-0.5 transition-transform flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm leading-snug">{rec.menuItemName}</h3>
                        <span className="text-[10px] text-slate-400 font-semibold">{rec.items.length} mapped ingredients</span>
                      </div>
                      {['owner', 'manager'].includes(currentUser.role) && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleOpenEditRec(rec)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteRec(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mapped ingredients list */}
                    <div className="bg-slate-50 rounded-xl p-3.5 space-y-1.5 text-[11px] text-slate-600 font-medium">
                      {rec.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span>{item.ingredientName}</span>
                          <span className="font-black text-slate-800">{item.quantityNeeded} {ingredients.find(i => i.id === item.ingredientId)?.unit || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial projections of recipe */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-50 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Cost</span>
                      <span className="text-xs font-bold text-slate-700 mt-0.5 block">{formatCurrency(cost, business.currency)}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Price</span>
                      <span className="text-xs font-bold text-emerald-600 mt-0.5 block">{formatCurrency(price, business.currency)}</span>
                    </div>
                    <div className={`p-2 rounded-xl ${margin > 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      <span className="text-[9px] font-extrabold uppercase tracking-wide block">Margin</span>
                      <span className="text-xs font-black mt-0.5 block">{margin.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        // SUPPLIERS LIST VIEW
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredSuppliers.length === 0 ? (
            <div className="p-16 text-center">
              <Truck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No supply partners configured</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Add supply partners to coordinate direct bulk ingredients acquisitions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Supplier / Vendor</th>
                    <th className="py-4 px-6">Contact Phone</th>
                    <th className="py-4 px-6">Location Address</th>
                    <th className="py-4 px-6">Supplied Items</th>
                    {['owner', 'manager'].includes(currentUser.role) && <th className="py-4 px-6 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredSuppliers.map((sup) => (
                    <tr key={sup.id} id={sup.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 font-extrabold text-slate-800 flex items-center gap-2">
                        <Truck className="h-4.5 w-4.5 text-indigo-500" />
                        <span>{sup.name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{sup.phone || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{sup.address || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded text-[10px] uppercase">
                          {sup.productsSupplied || 'All Raw Goods'}
                        </span>
                      </td>
                      {['owner', 'manager'].includes(currentUser.role) && (
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => handleOpenEditSup(sup)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Edit Supplier"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteSup(sup.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Delete Supplier"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INGREDIENT ADD / EDIT MODAL */}
      {isIngModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">{editingIng ? 'Modify Ingredient Record' : 'Log New Raw Ingredient'}</h3>
              <button 
                onClick={() => setIsIngModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-slate-100 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIngSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ingredient Name *</label>
                <input 
                  type="text"
                  required
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  placeholder="e.g. Rice, Chicken fillet, Cooking Oil"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category *</label>
                  <select 
                    value={ingCategory}
                    onChange={(e) => setIngCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white cursor-pointer"
                  >
                    {INGREDIENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier / Vendor</label>
                  <select
                    value={ingSupplier}
                    onChange={(e) => setIngSupplier(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white cursor-pointer"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.name}>{sup.name}</option>
                    ))}
                    <option value="Direct Acquisition">Direct Acquisition</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">In Stock Qty *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={ingQty}
                    onChange={(e) => setIngQty(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit *</label>
                  <input 
                    type="text"
                    required
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value)}
                    placeholder="kg"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cost Price / Unit *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={ingCost}
                    onChange={(e) => setIngCost(e.target.value)}
                    placeholder="5.50"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min Level Warning *</label>
                  <input 
                    type="number"
                    step="0.1"
                    required
                    value={ingMinStock}
                    onChange={(e) => setIngMinStock(e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsIngModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer text-center"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECIPE BUILDER MODAL */}
      {isRecModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">{editingRec ? 'Modify Recipe Sheet' : 'Draft Menu Recipe Sheet'}</h3>
              <button 
                onClick={() => setIsRecModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-slate-100 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Menu Meal / Drink *</label>
                <select 
                  value={recMenuItemId}
                  onChange={(e) => setRecMenuItemId(e.target.value)}
                  disabled={!!editingRec}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {menuItems.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
                  ))}
                </select>
              </div>

              {/* Recipe Ingredients assembly lines */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Add Ingredient to Plate</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Select Raw Item</label>
                    <select 
                      value={selectedIngredientToAdd}
                      onChange={(e) => setSelectedIngredientToAdd(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer"
                    >
                      <option value="">-- Choose Ingredient --</option>
                      {ingredients.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Portion Size</label>
                    <input 
                      type="number"
                      step="0.001"
                      placeholder="e.g. 0.25"
                      value={ingredientAmountToAdd}
                      onChange={(e) => setIngredientAmountToAdd(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-slate-800 text-[11px] focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={handleAddIngredientToRecipe}
                    className="sm:col-span-3 py-2 bg-slate-900 text-white rounded-lg text-[11px] font-black hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Map Ingredient</span>
                  </button>
                </div>
              </div>

              {/* Plate Ingredient list */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipe Plate Composition</span>
                {recipeItems.length === 0 ? (
                  <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-semibold">
                    No ingredient portion rules drafted yet. Use the assembler above to build the portion cost list.
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {recipeItems.map((item, idx) => {
                      const matchIng = ingredients.find(i => i.id === item.ingredientId);
                      const pieceCost = matchIng ? matchIng.costPrice * item.quantityNeeded : 0;
                      return (
                        <div key={idx} className="p-3 bg-white flex justify-between items-center text-xs">
                          <div>
                            <span className="font-extrabold text-slate-700">{item.ingredientName}</span>
                            <span className="text-[10px] text-slate-400 font-bold block">
                              Portion: {item.quantityNeeded} {matchIng?.unit || ''} &bull; Cost: {formatCurrency(pieceCost, business.currency)}
                            </span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleRemoveIngredientFromRecipe(idx)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recipe Live Financial Projections */}
              {recMenuItemId && recipeItems.length > 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs text-emerald-800 font-bold shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-emerald-600/80 tracking-widest block font-black">Recipe Analysis</span>
                    <p className="text-slate-600 leading-normal">
                      Food Cost: <span className="text-slate-800 font-black">{formatCurrency(calculateFoodCost(recipeItems), business.currency)}</span> &bull; 
                      Selling Price: <span className="text-slate-800 font-black">{formatCurrency(getMenuItemPrice(recMenuItemId), business.currency)}</span>
                    </p>
                  </div>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-center self-stretch sm:self-auto flex flex-col justify-center">
                    <span className="text-[9px] font-black uppercase tracking-wider block">Est. Profit Margin</span>
                    <span className="text-sm font-black tracking-tight block">
                      {getMenuItemPrice(recMenuItemId) > 0 
                        ? (((getMenuItemPrice(recMenuItemId) - calculateFoodCost(recipeItems)) / getMenuItemPrice(recMenuItemId)) * 100).toFixed(0) 
                        : '0'}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsRecModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer text-center"
                >
                  Close Draft
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer text-center"
                >
                  Save Recipe Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER ADD / EDIT MODAL */}
      {isSupModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">{editingSup ? 'Modify Supplier Record' : 'Register New Supplier'}</h3>
              <button 
                onClick={() => setIsSupModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-slate-100 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier Name *</label>
                <input 
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Accra Central Farms"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone Number</label>
                <input 
                  type="tel"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="e.g. +233 24 123 4567"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location Address</label>
                <input 
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="e.g. Market Square Lane, Accra"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Products Supplied</label>
                <input 
                  type="text"
                  value={supProducts}
                  onChange={(e) => setSupProducts(e.target.value)}
                  placeholder="e.g. Rice, Fresh Poultry, Spices"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsSupModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer text-center"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
