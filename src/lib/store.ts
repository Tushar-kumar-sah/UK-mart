import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

export interface OrderSuccessData {
  orderId: string;
}

export type Language = 'en' | 'hi' | 'bn';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'customer' | 'admin';
}

export interface StoreState {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartItem: (productId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  getMinOrderRemaining: () => number;

  // UI toggles
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  checkoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
  orderSuccessData: OrderSuccessData | null;
  setOrderSuccessData: (data: OrderSuccessData | null) => void;

  // Category selection
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  selectedSubcategory: string | null;
  setSelectedSubcategory: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // ── Location and min order (will NOT be persisted) ──
  userLocation: string | null;
  setUserLocation: (location: string | null) => void;
  effectiveMinOrder: number;
  setEffectiveMinOrder: (minOrder: number) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),

      cart: [],
      addToCart: (item) => {
        const existing = get().cart.find((i) => i.productId === item.productId && i.unit === item.unit);
        if (existing) {
          set({
            cart: get().cart.map((i) =>
              i.productId === item.productId && i.unit === item.unit
                ? { ...i, quantity: i.quantity + item.quantity, totalPrice: (i.quantity + item.quantity) * i.pricePerUnit }
                : i
            ),
          });
        } else {
          set({ cart: [...get().cart, item] });
        }
      },
      removeFromCart: (productId) => {
        set({ cart: get().cart.filter((i) => i.productId !== productId) });
      },
      updateCartItem: (productId, updates) => {
        set({
          cart: get().cart.map((i) =>
            i.productId === productId ? { ...i, ...updates } : i
          ),
        });
      },
      clearCart: () => set({ cart: [] }),
      getCartTotal: () => {
        return get().cart.reduce((sum, i) => sum + i.totalPrice, 0);
      },
      getCartCount: () => {
        return get().cart.reduce((count, i) => count + i.quantity, 0);
      },
      getMinOrderRemaining: () => {
        const total = get().getCartTotal();
        const minOrder = get().effectiveMinOrder || 2500;
        return Math.max(0, minOrder - total);
      },

      cartOpen: false,
      setCartOpen: (open) => set({ cartOpen: open }),
      checkoutOpen: false,
      setCheckoutOpen: (open) => set({ checkoutOpen: open }),
      orderSuccessData: null,
      setOrderSuccessData: (data) => set({ orderSuccessData: data }),

      selectedCategory: null,
      setSelectedCategory: (id) => set({ selectedCategory: id }),
      selectedSubcategory: null,
      setSelectedSubcategory: (id) => set({ selectedSubcategory: id }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      user: null,
      setUser: (user) => set({ user }),

      // Location – these will NOT be persisted
      userLocation: null,
      setUserLocation: (location) => set({ userLocation: location }),
      effectiveMinOrder: 2500,
      setEffectiveMinOrder: (minOrder) => set({ effectiveMinOrder: minOrder }),
    }),
    {
      name: 'uk-mart-store',
      // ✅ Exclude location-related fields from persistence
      partialize: (state) => {
        const { userLocation, effectiveMinOrder, ...rest } = state;
        return rest;
      },
    }
  )
);