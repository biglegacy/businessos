import React from 'react';
import { db } from '../lib/db';
import { Business } from '../types';
import { 
  Utensils, 
  CupSoda, 
  Coffee, 
  Sun, 
  Moon, 
  Cake, 
  Sparkles,
  ChevronRight,
  Plus
} from 'lucide-react';

interface RestaurantCategoriesProps {
  business: Business;
  onViewCategory: (catName: string) => void;
}

const CATEGORIES_METADATA = [
  { name: 'Meals', icon: Utensils, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', desc: 'Main courses, platters, and heavy dishes.' },
  { name: 'Drinks', icon: CupSoda, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', desc: 'Fresh juices, carbonated beverages, sodas, and wines.' },
  { name: 'Breakfast', icon: Coffee, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', desc: 'Morning specials, pancakes, hot tea, coffee, and toasts.' },
  { name: 'Lunch', icon: Sun, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', desc: 'Midday combination sets, lunch bowls, and wraps.' },
  { name: 'Dinner', icon: Moon, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', desc: 'Elegant dinner options, steaks, soups, and shareable plates.' },
  { name: 'Desserts', icon: Cake, bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100', desc: 'Sweet treats, ice creams, pies, and cakes.' },
  { name: 'Specials', icon: Sparkles, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', desc: 'Limited edition seasonal dishes and chef-curated meals.' },
];

export const RestaurantCategories: React.FC<RestaurantCategoriesProps> = ({ business, onViewCategory }) => {
  const menuItems = db.getMenuItems(business.id);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Menu Categories</h2>
          <p className="text-xs text-slate-500 mt-1">Browse and filter your restaurant dishes and drinks categorized by menus.</p>
        </div>
      </div>

      {/* Grid List of Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {CATEGORIES_METADATA.map((meta) => {
          const count = menuItems.filter(item => item.category === meta.name).length;
          const IconComp = meta.icon;

          return (
            <div 
              key={meta.name}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="space-y-4">
                {/* Category Icon and count */}
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${meta.bg} ${meta.text} border ${meta.border}`}>
                    <IconComp className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 font-extrabold px-2.5 py-1 rounded-full">
                    {count} {count === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-extrabold text-slate-800">{meta.name}</h3>
                  <p className="text-xs text-slate-400 leading-normal min-h-[2.5rem]">{meta.desc}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 mt-4">
                <button
                  onClick={() => onViewCategory(meta.name)}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Browse Category</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
