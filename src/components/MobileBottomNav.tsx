/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Home, ShoppingCart, Package, Receipt, MoreHorizontal, 
  RotateCcw, ClipboardList, Utensils, Users, LayoutDashboard
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  authorizedTabs: string[];
  userRole: string;
  cartCount?: number;
}

interface NavItemDef {
  id: string;
  targetTab: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  matchTabs?: string[];
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  authorizedTabs,
  userRole,
  cartCount = 0
}) => {
  // Determine suitable POS tab for this business
  const posTargetTab = authorizedTabs.find(t => 
    t === 'POS' || t === 'Fast Food POS' || t === 'Restaurant POS' || t === 'Salon POS'
  ) || 'POS';

  // Determine suitable Products tab
  const productsTargetTab = authorizedTabs.find(t => 
    t === 'Products' || t === 'Services' || t === 'Menu Management' || t === 'Inventory'
  ) || 'Products';

  // Determine suitable Sales tab
  const salesTargetTab = authorizedTabs.find(t => 
    t === 'Sales' || t === 'Orders' || t === 'Laundry Orders'
  ) || 'Sales';

  // Base list of candidate navigation items
  const allCandidates: NavItemDef[] = [];

  // 1. Home / Dashboard (if authorized)
  if (authorizedTabs.includes('Dashboard')) {
    allCandidates.push({
      id: 'home',
      targetTab: 'Dashboard',
      label: 'Home',
      icon: Home,
      matchTabs: ['Dashboard']
    });
  }

  // 2. POS (if authorized)
  if (authorizedTabs.some(t => t.includes('POS'))) {
    allCandidates.push({
      id: 'pos',
      targetTab: posTargetTab,
      label: 'POS',
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : undefined,
      matchTabs: ['POS', 'Fast Food POS', 'Restaurant POS', 'Salon POS']
    });
  }

  // 3. Products (ONLY if authorized!)
  if (
    authorizedTabs.includes('Products') || 
    authorizedTabs.includes('Services') || 
    authorizedTabs.includes('Menu Management') ||
    authorizedTabs.includes('Ingredients')
  ) {
    allCandidates.push({
      id: 'products',
      targetTab: productsTargetTab,
      label: authorizedTabs.includes('Services') && !authorizedTabs.includes('Products') ? 'Services' : 'Products',
      icon: Package,
      matchTabs: ['Products', 'Services', 'Menu Management', 'Ingredients', 'Categories']
    });
  }

  // 4. Sales History (ONLY if authorized!)
  if (authorizedTabs.includes('Sales') || authorizedTabs.includes('Orders') || authorizedTabs.includes('Laundry Orders')) {
    allCandidates.push({
      id: 'sales',
      targetTab: salesTargetTab,
      label: 'Sales',
      icon: Receipt,
      matchTabs: ['Sales', 'Orders', 'Laundry Orders']
    });
  }

  // If cashier has Returns, but not products, show Returns
  if (!authorizedTabs.includes('Products') && authorizedTabs.includes('Returns')) {
    allCandidates.push({
      id: 'returns',
      targetTab: 'Returns',
      label: 'Returns',
      icon: RotateCcw,
      matchTabs: ['Returns']
    });
  }

  // 5. Always include "More" for secondary features, profile & sign out
  allCandidates.push({
    id: 'more',
    targetTab: 'More',
    label: 'More',
    icon: MoreHorizontal,
    matchTabs: [
      'More', 'Customers', 'Expenses', 'Accounts Receivable', 'Inventory', 
      'Reports', 'Employees', 'Branches', 'Settings', 'Audit Logs'
    ]
  });

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] lg:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around px-2 pt-1.5 max-w-lg mx-auto">
        {allCandidates.map(item => {
          const isActive = 
            activeTab === item.targetTab || 
            (item.matchTabs && item.matchTabs.includes(activeTab));
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.targetTab)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl min-h-[50px] transition-all cursor-pointer relative select-none touch-manipulation active:scale-95 ${
                isActive 
                  ? 'text-blue-600 font-bold' 
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : ''}`}>
                  <IconComponent className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-blue-600 text-white rounded-full text-[9px] font-black h-4 w-4 flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-extrabold text-blue-600' : 'text-slate-500'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
