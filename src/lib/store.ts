import { create } from 'zustand';
import type { Language } from './i18n';

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  phone?: string | null;
  role: string;
}

interface StoreState {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // View
  currentView: 'store' | 'admin';
  setCurrentView: (view: 'store' | 'admin') => void;

  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartItem: (productId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  getMinOrderRemaining: () => number;

  // UI
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  checkoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
  orderSuccessData: { orderId: string } | null;
  setOrderSuccessData: (data: { orderId: string } | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedSubcategory: string | null;
  setSelectedSubcategory: (id: string | null) => void;
}

const MIN_ORDER = 2500;

export const useStore = create<StoreState>((set, get) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  currentView: 'store',
  setCurrentView: (view) => set({ currentView: view }),

  user: null,
  setUser: (user) => set({ user }),

  cart: [],
  addToCart: (item) => {
    const cart = get().cart;
    const existingIndex = cart.findIndex(
      (c) => c.productId === item.productId && c.unit === item.unit
    );
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + item.quantity,
        totalPrice: (updated[existingIndex].quantity + item.quantity) * item.pricePerUnit,
      };
      set({ cart: updated });
    } else {
      set({ cart: [...cart, item] });
    }
  },
  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((c) => c.productId !== productId) });
  },
  updateCartItem: (productId, updates) => {
    set({
      cart: get().cart.map((c) =>
        c.productId === productId ? { ...c, ...updates, totalPrice: (updates.quantity ?? c.quantity) * (updates.pricePerUnit ?? c.pricePerUnit) } : c
      ),
    });
  },
  clearCart: () => set({ cart: [] }),
  getCartTotal: () => get().cart.reduce((sum, item) => sum + item.totalPrice, 0),
  getCartCount: () => get().cart.reduce((sum, item) => sum + item.quantity, 0),
  getMinOrderRemaining: () => Math.max(0, MIN_ORDER - get().cart.reduce((sum, item) => sum + item.totalPrice, 0)),

  cartOpen: false,
  setCartOpen: (open) => set({ cartOpen: open }),
  checkoutOpen: false,
  setCheckoutOpen: (open) => set({ checkoutOpen: open }),
  orderSuccessData: null,
  setOrderSuccessData: (data) => set({ orderSuccessData: data }),
  selectedCategory: null,
  setSelectedCategory: (id) => set({ selectedCategory: id, selectedSubcategory: null }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedSubcategory: null,
  setSelectedSubcategory: (id) => set({ selectedSubcategory: id }),
}));