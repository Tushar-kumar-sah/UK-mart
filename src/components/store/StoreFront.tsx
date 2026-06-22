'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingCart, X, Minus, Plus, Trash2, ChevronRight, ChevronDown,
  ShoppingBag, Globe, LogOut, User, Package, MapPin, Phone,
  CreditCard, CheckCircle2, Menu, ArrowRight, Loader2, AlertCircle,
  MapPin as MapPinIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useStore, type CartItem } from '@/lib/store';
import { calculatePrice } from '@/lib/price-utils';
import { t, type Language } from '@/lib/i18n';
import { useSession, signIn, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import Image from 'next/image';

// ─── Helpers ────────────────────────────────────────────
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Types ──────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  nameHi: string | null;
  nameBn: string | null;
  description: string;
  descriptionHi: string | null;
  descriptionBn: string | null;
  categoryId: string;
  subcategoryId: string | null;
  basePrice: number;
  baseUnit: string;
  availableUnits: string;
  imageUrl: string | null;
  isActive: boolean;
  stock: number;
  unitType: 'weight' | 'piece';
  category: { id: string; name: string; nameHi: string | null; nameBn: string | null };
  subcategory: { id: string; name: string; nameHi: string | null; nameBn: string | null } | null;
}

interface Category {
  id: string;
  name: string;
  nameHi: string | null;
  nameBn: string | null;
  image: string | null;
  parentId: string | null;
  children: Category[];
  isActive: boolean;
  sortOrder: number;
}

interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
  user: { id: string; name: string; email: string; phone: string } | null;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

interface Offer {
  id: string;
  name: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ─── Constants ──────────────────────────────────────────
const DEFAULT_MIN_ORDER = 2500;
const LOCAL_MIN_ORDER = 1000;
const LOCAL_RADIUS_KM = 13;
const FREE_DELIVERY_THRESHOLD = 5000;
const DELIVERY_CHARGE = 50;

const CATEGORY_EMOJI: Record<string, string> = {
  'Fruits & Vegetables': '🍎',
  'Fruits': '🍇',
  'Vegetables': '🥦',
  'Dairy & Breakfast': '🥛',
  'Dairy': '🧀',
  'Breakfast': '🍳',
  'Staples': '🌾',
  'Atta': '🌾',
  'Rice': '🍚',
  'Flour': '🌾',
  'Pulses': '🫘',
  'Dal': '🫘',
  'Lentils': '🫘',
  'Spices & Masala': '🌶️',
  'Spices': '🌶️',
  'Masala': '🌶️',
  'Condiments': '🧂',
  'Oil & Ghee': '🧴',
  'Edible Oil': '🧴',
  'Ghee': '🧈',
  'Snacks & Beverages': '🍿',
  'Snacks': '🍪',
  'Beverages': '🥤',
  'Tea & Coffee': '☕',
  'Tea': '🍵',
  'Coffee': '☕',
  'Bakery': '🍞',
  'Sweets': '🍬',
  'Frozen Food': '🧊',
  'Meat & Seafood': '🍗',
  'Meat': '🍖',
  'Fish': '🐟',
  'Seafood': '🦐',
  'Eggs': '🥚',
  'Personal Care': '💄',
  'Baby Care': '🍼',
  'Health Care': '💊',
  'Household': '🏠',
  'Cleaning': '🧹',
  'Detergent': '🧼',
  'Pet Care': '🐾',
  'Stationery': '✏️',
};

const PASTEL_COLORS = [
  'bg-[#D7CCC8]',
  'bg-[#FFB300]/30',
  'bg-[#8D6E63]/20',
  'bg-[#FFB300]/20',
  'bg-[#D7CCC8]/60',
  'bg-[#8D6E63]/10',
];

const LANG_MAP: Record<string, { value: Language; label: string; flag: string }> = {
  en: { value: 'en', label: 'English', flag: '🇬🇧' },
  hi: { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  bn: { value: 'bn', label: 'বাংলা', flag: '🇧🇩' },
};

// ─── Helpers ────────────────────────────────────────────
function getLocalName(item: { name: string; nameHi: string | null; nameBn: string | null }, lang: Language): string {
  if (lang === 'hi' && item.nameHi) return item.nameHi;
  if (lang === 'bn' && item.nameBn) return item.nameBn;
  return item.name;
}

function getLocalDescription(item: { description: string; descriptionHi: string | null; descriptionBn: string | null }, lang: Language): string {
  if (lang === 'hi' && item.descriptionHi) return item.descriptionHi;
  if (lang === 'bn' && item.descriptionBn) return item.descriptionBn;
  return item.description;
}

function getPastelColor(name: string): string {
  return PASTEL_COLORS[name.length % PASTEL_COLORS.length];
}

function getCategoryEmoji(catName: string): string {
  const lower = catName.toLowerCase();
  const keys = Object.keys(CATEGORY_EMOJI).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key.toLowerCase())) return CATEGORY_EMOJI[key];
  }
  return '🛒';
}

function formatPrice(price: number): string {
  return `₹${price.toFixed(0)}`;
}

function formatCustomWeight(raw: string, unitType: string): string {
  const val = parseFloat(raw);
  if (isNaN(val) || val <= 0) return '';
  if (unitType === 'piece') return `${val}pc`;
  if (val >= 1000) {
    const kgVal = val / 1000;
    const suffix = unitType === 'weight' ? 'kg' : 'L';
    return kgVal === Math.floor(kgVal) ? `${kgVal}${suffix}` : `${kgVal.toFixed(1).replace(/\.0$/, '')}${suffix}`;
  }
  const suffix = unitType === 'weight' ? 'g' : 'ml';
  return `${val}${suffix}`;
}

function getCustomInputPlaceholder(unitType: string): string {
  switch (unitType) {
    case 'weight': return 'e.g. 750';
    case 'piece': return 'e.g. 3';
    default: return 'e.g. 750';
  }
}

function getCustomInputLabel(unitType: string): string {
  switch (unitType) {
    case 'weight': return 'grams';
    case 'piece': return 'pieces';
    default: return 'ml';
  }
}

// ─── Main Component ──────────────────────────────────────
export default function StoreFront() {
  const {
    language, setLanguage,
    cart, addToCart, removeFromCart, updateCartItem, clearCart, getCartTotal, getCartCount, getMinOrderRemaining,
    cartOpen, setCartOpen,
    checkoutOpen, setCheckoutOpen,
    orderSuccessData, setOrderSuccessData,
    selectedCategory, setSelectedCategory,
    selectedSubcategory, setSelectedSubcategory,
    searchQuery, setSearchQuery,
    user, setUser,
    userLocation,
    effectiveMinOrder,
    setUserLocation,
    setEffectiveMinOrder,
  } = useStore();

  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;

  // ── Local state (declared before use) ──────────────────
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [isLocalDelivery, setIsLocalDelivery] = useState(false);

  // ── Persist location in localStorage ──
  useEffect(() => {
    // Load from localStorage on mount
    const storedLocation = localStorage.getItem('userLocation');
    const storedMinOrder = localStorage.getItem('effectiveMinOrder');
    const storedDistance = localStorage.getItem('deliveryDistance');
    const storedIsLocal = localStorage.getItem('isLocalDelivery');

    console.log('🔍 Loading from localStorage:', { storedLocation, storedMinOrder, storedDistance, storedIsLocal });

    if (storedLocation) {
      setUserLocation(storedLocation);
    }
    if (storedMinOrder) {
      setEffectiveMinOrder(Number(storedMinOrder));
    }
    if (storedDistance) {
      setDeliveryDistance(Number(storedDistance));
    }
    if (storedIsLocal) {
      setIsLocalDelivery(storedIsLocal === 'true');
    }
  }, []);

  // Save to localStorage whenever these values change
  useEffect(() => {
    if (userLocation) {
      localStorage.setItem('userLocation', userLocation);
    } else {
      localStorage.removeItem('userLocation');
    }
    localStorage.setItem('effectiveMinOrder', String(effectiveMinOrder));
    if (deliveryDistance !== null) {
      localStorage.setItem('deliveryDistance', String(deliveryDistance));
    } else {
      localStorage.removeItem('deliveryDistance');
    }
    localStorage.setItem('isLocalDelivery', String(isLocalDelivery));

    console.log('💾 Saved to localStorage:', { userLocation, effectiveMinOrder, deliveryDistance, isLocalDelivery });
  }, [userLocation, effectiveMinOrder, deliveryDistance, isLocalDelivery]);

  // ── Sync session ──
  useEffect(() => {
    if (session?.user) {
      setUser({
        id: (session.user as any).id,
        name: session.user.name || 'User',
        email: session.user.email || '',
        avatar: session.user.image || undefined,
        role: 'customer',
      });
    } else {
      setUser(null);
    }
  }, [session, setUser]);

  // ── Razorpay script loader ──
  const [razorpayScriptLoaded, setRazorpayScriptLoaded] = useState(false);
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayScriptLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // ── Hero banner carousel ──
  const HERO_BANNERS = ['/banner.png', '/banner2.png', '/banner3.png'];
  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ── Data state ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI states ──
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Checkout ──
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [deliveryForm, setDeliveryForm] = useState({
    name: '', phone: '', address: '', pincode: '', notes: '',
  });
  const [placingOrder, setPlacingOrder] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');

  // ── Location dialog ──
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationPrompted, setLocationPrompted] = useState(false);

  // ── Profile dialog ──
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ── Product unit selections ──
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [selectedQtys, setSelectedQtys] = useState<Record<string, number>>({});
  const [addedProducts, setAddedProducts] = useState<Record<string, boolean>>({});
  const [customWeights, setCustomWeights] = useState<Record<string, string>>({});

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, prodRes, offRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products'),
        fetch('/api/offers'),
      ]);
      if (!catRes.ok || !prodRes.ok || !offRes.ok) throw new Error('Failed to fetch');
      const [catData, prodData, offData] = await Promise.all([
        catRes.json(), prodRes.json(), offRes.json(),
      ]);
      setCategories(catData || []);
      setProducts(prodData || []);
      setOffers(offData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Location pop‑up after 7 seconds ──
  useEffect(() => {
    if (!loading && !userLocation && !locationPrompted) {
      const timer = setTimeout(() => {
        setLocationPrompted(true);
        setLocationDialogOpen(true);
        toast.info('Please set your delivery location to place orders.');
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [loading, userLocation, locationPrompted]);

  // ── Restore pending checkout after sign‑in ──
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingCheckout');
    if (pending === 'true' && isAuthenticated) {
      const savedCart = sessionStorage.getItem('pendingCart');
      if (savedCart) {
        const items = JSON.parse(savedCart) as CartItem[];
        clearCart();
        items.forEach((item) => addToCart(item));
      }
      const savedDelivery = sessionStorage.getItem('pendingDeliveryForm');
      if (savedDelivery) {
        setDeliveryForm(JSON.parse(savedDelivery));
      }
      setCheckoutStep(3);
      setCheckoutOpen(true);
      sessionStorage.removeItem('pendingCheckout');
      sessionStorage.removeItem('pendingCart');
      sessionStorage.removeItem('pendingDeliveryForm');
    }
  }, [isAuthenticated]);

  // ── Fetch user orders for profile ──
  const fetchUserOrders = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        let ordersList = Array.isArray(data) ? data : (data.orders || []);
        const userOrdersList = ordersList.filter((order: Order) => order.userId === user.id);
        setUserOrders(userOrdersList);
      } else {
        toast.error('Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('Could not load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // ── Filtered products (shuffled) ──
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => p.isActive);
    if (selectedCategory) {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }
    if (selectedSubcategory) {
      result = result.filter((p) => p.subcategoryId === selectedSubcategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.nameHi && p.nameHi.toLowerCase().includes(q)) ||
          (p.nameBn && p.nameBn.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q) ||
          getLocalName(p.category, language).toLowerCase().includes(q)
      );
    }
    return shuffleArray(result);
  }, [products, selectedCategory, selectedSubcategory, searchQuery, language]);

  // ── Parent categories ──
  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentId && c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const currentSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = categories.find((c) => c.id === selectedCategory);
    return (cat?.children || []).filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, selectedCategory]);

  // ── Products grouped by category (shuffled per category) ──
  const productsByCategory = useMemo(() => {
    const activeProducts = products.filter((p) => p.isActive);
    const groups: { category: Category; items: Product[] }[] = [];
    for (const cat of parentCategories) {
      let items = activeProducts.filter((p) => p.categoryId === cat.id);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.nameHi && p.nameHi.toLowerCase().includes(q)) ||
            (p.nameBn && p.nameBn.toLowerCase().includes(q)) ||
            p.description.toLowerCase().includes(q)
        );
      }
      if (items.length > 0) {
        groups.push({ category: cat, items: shuffleArray(items) });
      }
    }
    return groups;
  }, [products, parentCategories, searchQuery]);

  const isBrowseAllView = !selectedCategory && !selectedSubcategory;

  // ── Cart totals ──
  const cartTotal = getCartTotal();
  const cartCount = getCartCount();
  const minOrderRemaining = getMinOrderRemaining();
  const deliveryCharge = cartTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const grandTotal = cartTotal + deliveryCharge;

  // ── Location functions ──
  const updateLocationAndMinOrder = useCallback(async (address: string) => {
    if (!address || address.length < 3) {
      setUserLocation(null);
      setEffectiveMinOrder(DEFAULT_MIN_ORDER);
      setDeliveryDistance(null);
      setIsLocalDelivery(false);
      toast.info('Location cleared');
      return;
    }

    setLocationLoading(true);
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        toast.error('Could not find this address. Please check it.');
        return;
      }
      const { lat, lng } = geoData.results[0].geometry.location;

      const distRes = await fetch('/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const distData = await distRes.json();
      if (distRes.ok) {
        const distance = distData.distance; // in km
        const isLocal = distance <= LOCAL_RADIUS_KM;
        const minOrder = isLocal ? LOCAL_MIN_ORDER : DEFAULT_MIN_ORDER;
        setUserLocation(address);
        setEffectiveMinOrder(minOrder);
        setDeliveryDistance(distance);
        setIsLocalDelivery(isLocal);
        toast.success(
          isLocal
            ? `✅ Local! Min order ₹${LOCAL_MIN_ORDER} (${distance.toFixed(1)} km)`
            : `📍 Standard min order ₹${DEFAULT_MIN_ORDER} (${distance.toFixed(1)} km)`
        );
        setLocationDialogOpen(false);
      } else {
        toast.error('Could not calculate distance. Please try again.');
      }
    } catch (error) {
      console.error('Location error:', error);
      toast.error('Failed to set location');
    } finally {
      setLocationLoading(false);
    }
  }, [setUserLocation, setEffectiveMinOrder]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const distRes = await fetch('/api/distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });
          const distData = await distRes.json();
          if (distRes.ok) {
            const distance = distData.distance;
            const isLocal = distance <= LOCAL_RADIUS_KM;
            const minOrder = isLocal ? LOCAL_MIN_ORDER : DEFAULT_MIN_ORDER;
            setUserLocation(`📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            setEffectiveMinOrder(minOrder);
            setDeliveryDistance(distance);
            setIsLocalDelivery(isLocal);
            toast.success(
              isLocal
                ? `✅ Local! Min order ₹${LOCAL_MIN_ORDER} (${distance.toFixed(1)} km)`
                : `📍 Standard min order ₹${DEFAULT_MIN_ORDER} (${distance.toFixed(1)} km)`
            );
            setLocationDialogOpen(false);
          } else {
            toast.error('Could not calculate distance.');
          }
        } catch (error) {
          console.error('Distance error:', error);
          toast.error('Failed to get location');
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        toast.error('Unable to access location. Please allow location permissions.');
        setLocationLoading(false);
      }
    );
  }, [setUserLocation, setEffectiveMinOrder]);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setEffectiveMinOrder(DEFAULT_MIN_ORDER);
    setDeliveryDistance(null);
    setIsLocalDelivery(false);
    localStorage.removeItem('userLocation');
    localStorage.removeItem('deliveryDistance');
    localStorage.setItem('effectiveMinOrder', String(DEFAULT_MIN_ORDER));
    localStorage.setItem('isLocalDelivery', 'false');
    toast.info('Location removed');
    setLocationDialogOpen(true);
  }, [setUserLocation, setEffectiveMinOrder]);

  // ── Add to cart ──
  const handleAddToCart = (product: Product) => {
    let unit = selectedUnits[product.id] || product.baseUnit;
    const qty = selectedQtys[product.id] || 1;
    if (unit === 'custom') {
      const raw = customWeights[product.id];
      if (!raw || parseFloat(raw) <= 0) return;
      unit = formatCustomWeight(raw, product.unitType);
    }
    const price = calculatePrice(product.basePrice, product.baseUnit, unit);
    addToCart({
      productId: product.id,
      productName: getLocalName(product, language),
      productImage: product.imageUrl,
      quantity: qty,
      unit,
      pricePerUnit: price,
      totalPrice: price * qty,
    });
    setAddedProducts((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => setAddedProducts((prev) => ({ ...prev, [product.id]: false })), 1200);
  };

  // ── Update cart quantity ──
  const handleUpdateCartQty = (item: CartItem, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(item.productId);
    } else {
      updateCartItem(item.productId, { quantity: newQty, totalPrice: newQty * item.pricePerUnit });
    }
  };

  // ── Place order (handles both Razorpay and COD) ──
  const handlePlaceOrder = async () => {
    // 🔍 Debug: log current state
    console.log('📦 Placing order with:', {
      userLocation,
      effectiveMinOrder,
      cartTotal,
      selectedPaymentMethod,
    });

    // If location is missing, prompt
    if (!userLocation) {
      toast.error('Please set your delivery location first.');
      setLocationDialogOpen(true);
      return;
    }

    // Fallback: if effectiveMinOrder is still default but location is set, reload from localStorage
    if (effectiveMinOrder === DEFAULT_MIN_ORDER && userLocation) {
      const storedMinOrder = localStorage.getItem('effectiveMinOrder');
      if (storedMinOrder) {
        const parsed = Number(storedMinOrder);
        if (parsed !== DEFAULT_MIN_ORDER) {
          setEffectiveMinOrder(parsed);
          toast.info('Reloaded minimum order from saved location.');
          // re-check after state update
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    if (!isAuthenticated) {
      sessionStorage.setItem('pendingCheckout', 'true');
      sessionStorage.setItem('pendingCart', JSON.stringify(cart));
      sessionStorage.setItem('pendingDeliveryForm', JSON.stringify(deliveryForm));
      signIn('google', { callbackUrl: window.location.pathname });
      return;
    }

    if (!deliveryForm.name || !deliveryForm.phone || !deliveryForm.address) {
      toast.error('Please fill all delivery details');
      return;
    }

    // Now check min order with the (possibly updated) effectiveMinOrder
    if (cartTotal < effectiveMinOrder) {
      toast.error(`Minimum order is ₹${effectiveMinOrder} for your location`);
      return;
    }

    if (selectedPaymentMethod === 'COD') {
      await placeOrderCOD();
      return;
    }

    // Razorpay flow
    if (!razorpayScriptLoaded) {
      toast.error('Payment gateway is loading, please try again');
      return;
    }

    setRazorpayLoading(true);
    try {
      const orderData = {
        userId: user?.id || 'guest',
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.totalPrice,
        })),
        totalAmount: cartTotal,
        discountAmount: 0,
        finalAmount: grandTotal,
        customerName: deliveryForm.name,
        customerPhone: deliveryForm.phone,
        deliveryAddress: deliveryForm.address,
        pincode: deliveryForm.pincode,
        notes: deliveryForm.notes,
        paymentMethod: 'RAZORPAY',
      };

      const razorpayRes = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: grandTotal,
          currency: 'INR',
          receipt: `order_${Date.now()}`,
        }),
      });
      const razorpayData = await razorpayRes.json();
      if (!razorpayRes.ok) throw new Error(razorpayData.error || 'Failed to create payment order');

      const options = {
        key: razorpayData.keyId,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        name: 'UK MART',
        description: 'Order Payment',
        order_id: razorpayData.orderId,
        prefill: {
          name: deliveryForm.name,
          contact: deliveryForm.phone,
          email: user?.email || '',
        },
        theme: {
          color: '#8D6E63',
        },
        modal: {
          ondismiss: () => {
            setRazorpayLoading(false);
            toast.info('Payment cancelled');
          },
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...orderData,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              toast.error(verifyData.error || 'Payment verification failed');
              return;
            }
            setOrderSuccessData({ orderId: verifyData.order.id });
            clearCart();
            setCheckoutOpen(false);
            setCheckoutStep(1);
            setDeliveryForm({ name: '', phone: '', address: '', pincode: '', notes: '' });
            sessionStorage.removeItem('pendingCheckout');
            sessionStorage.removeItem('pendingCart');
            sessionStorage.removeItem('pendingDeliveryForm');
            toast.success('Payment successful! Order placed.');
          } catch (err) {
            console.error('Verification error:', err);
            toast.error('Payment verification failed');
          } finally {
            setRazorpayLoading(false);
          }
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Razorpay error:', error);
      toast.error('Payment initiation failed');
      setRazorpayLoading(false);
    }
  };

  // ── Place order with COD ──
  const placeOrderCOD = async () => {
    setPlacingOrder(true);
    try {
      const orderData = {
        userId: user?.id || 'guest',
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.totalPrice,
        })),
        totalAmount: cartTotal,
        discountAmount: 0,
        finalAmount: grandTotal,
        customerName: deliveryForm.name,
        customerPhone: deliveryForm.phone,
        deliveryAddress: deliveryForm.address,
        pincode: deliveryForm.pincode,
        notes: deliveryForm.notes,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      const orderId = data?.order?.id || data?.id;
      if (!orderId) {
        console.error('Unexpected order response:', data);
        throw new Error('Invalid order response');
      }

      setOrderSuccessData({ orderId });
      clearCart();
      setCheckoutOpen(false);
      setCheckoutStep(1);
      setDeliveryForm({ name: '', phone: '', address: '', pincode: '', notes: '' });
      sessionStorage.removeItem('pendingCheckout');
      sessionStorage.removeItem('pendingCart');
      sessionStorage.removeItem('pendingDeliveryForm');
      toast.success('Order placed successfully! Pay on delivery.');
    } catch (error) {
      console.error('COD order error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Scroll to products on category select ──
  useEffect(() => {
    if (selectedCategory) {
      document.getElementById('product-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCategory, selectedSubcategory]);

  const toggleCategory = (catId: string) => {
    if (selectedCategory === catId) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(catId);
      setSelectedSubcategory(null);
    }
  };

  const scrollToCategorySection = (catId: string) => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSearchQuery('');
    setTimeout(() => {
      document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const renderProductGrid = (items: Product[]) => (
    <motion.div
      className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.02 } },
      }}
    >
      {items.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          language={language}
          selectedUnit={selectedUnits[product.id] || product.baseUnit}
          selectedQty={selectedQtys[product.id] || 1}
          isAdded={!!addedProducts[product.id]}
          customWeight={customWeights[product.id] || ''}
          onUnitChange={(unit) => setSelectedUnits((prev) => ({ ...prev, [product.id]: unit }))}
          onQtyChange={(qty) => setSelectedQtys((prev) => ({ ...prev, [product.id]: qty }))}
          onCustomWeightChange={(val) => setCustomWeights((prev) => ({ ...prev, [product.id]: val }))}
          onAddToCart={() => handleAddToCart(product)}
        />
      ))}
    </motion.div>
  );

  // ──────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden w-full">
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Logo */}
            <div
              className="flex items-center gap-2 shrink-0 cursor-pointer"
              onClick={() => {
                setSelectedCategory(null);
                setSelectedSubcategory(null);
                setSearchQuery('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="relative h-9 w-9 sm:h-12 sm:w-12 shrink-0">
                <Image
                  src="/logo.png"
                  alt="UK MART"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-base sm:text-xl font-bold text-[#8D6E63] hidden sm:block">
                {t('storeName', language)}
              </span>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-lg mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('searchPlaceholder', language)}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full border-gray-200 bg-gray-50 focus:bg-white h-10"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden sm:flex gap-1 text-gray-600 hover:text-gray-900">
                    <Globe className="w-4 h-4" />
                    <span className="text-xs">{LANG_MAP[language]?.flag}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>{t('language', language)}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.values(LANG_MAP).map((lang) => (
                    <DropdownMenuItem
                      key={lang.value}
                      onClick={() => setLanguage(lang.value)}
                      className={language === lang.value ? 'bg-[#D7CCC8] text-[#8D6E63] font-medium' : ''}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* ===== LOCATION BUTTON ===== */}
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-600 hover:text-[#8D6E63] h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => setLocationDialogOpen(true)}
                aria-label="Set delivery location"
              >
                <MapPinIcon className="w-5 h-5" />
                {userLocation && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
                )}
              </Button>

              {/* Cart Button */}
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-600 hover:text-[#8D6E63] h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#8D6E63] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Button>

              {/* ===== USER / AUTH ===== */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 text-gray-700">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={session.user?.image || undefined} />
                        <AvatarFallback className="bg-[#D7CCC8] text-[#8D6E63] text-xs">
                          {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium max-w-27.5 truncate">{session.user?.name}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{session.user?.name}</p>
                        <p className="text-xs text-gray-500">{session.user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setProfileDialogOpen(true);
                        fetchUserOrders();
                      }}
                      className="cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('logout', language)}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex border-[#8D6E63] text-[#8D6E63] hover:bg-[#D7CCC8] text-xs"
                  onClick={() => signIn('google')}
                >
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  {t('login', language)}
                </Button>
              )}

              {/* Mobile Hamburger */}
              <Button variant="ghost" size="icon" className="md:hidden text-gray-600 h-9 w-9" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('searchPlaceholder', language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full border-gray-200 bg-gray-50 focus:bg-white h-9 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ============ MOBILE MENU SHEET ============ */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('storeName', language)}</SheetTitle>
          </SheetHeader>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative h-10 w-10">
                <Image src="/logo.png" alt="UK MART" fill className="object-contain" />
              </div>
              <span className="text-lg font-bold text-[#8D6E63]">{t('storeName', language)}</span>
            </div>
            <Separator className="mb-4" />
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('language', language)}</p>
              <div className="flex gap-2">
                {Object.values(LANG_MAP).map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => setLanguage(lang.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-all ${
                      language === lang.value
                        ? 'border-[#8D6E63] bg-[#D7CCC8] text-[#8D6E63] font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <Separator className="mb-4" />
            {isAuthenticated ? (
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={session.user?.image || undefined} />
                    <AvatarFallback className="bg-[#D7CCC8] text-[#8D6E63]">
                      {session.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{session.user?.name}</p>
                    <p className="text-xs text-gray-500">{session.user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                >
                  <LogOut className="w-4 h-4 mr-2" /> {t('logout', language)}
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-[#8D6E63] hover:bg-[#8D6E63]/90"
                onClick={() => { signIn('google'); setMobileMenuOpen(false); }}
              >
                <User className="w-4 h-4 mr-2" /> {t('login', language)}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ============ LOCATION DIALOG ============ */}
      <Dialog
        open={locationDialogOpen}
        onOpenChange={(open) => {
          if (!open && !userLocation) {
            toast.warning('Please set your delivery location to continue.');
            setTimeout(() => setLocationDialogOpen(true), 300);
            return;
          }
          setLocationDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-[#8D6E63]" />
              Set your delivery location
            </DialogTitle>
            <DialogDescription>
              {userLocation
                ? 'Your location is set. You can change it here.'
                : '📍 Please enter your address or use your current location. This is required to place orders.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="location-input">Delivery Address</Label>
              <Input
                id="location-input"
                placeholder="e.g., 123 Main Street, Kolkata"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                disabled={locationLoading}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="default"
                className="flex-1 bg-[#8D6E63] hover:bg-[#8D6E63]/90"
                onClick={() => updateLocationAndMinOrder(locationInput)}
                disabled={!locationInput.trim() || locationLoading}
              >
                {locationLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Address
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={detectLocation}
                disabled={locationLoading}
              >
                {locationLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Detect my location
              </Button>
            </div>
            {userLocation && (
              <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-3 mt-2">
                <span className="truncate">📍 {userLocation}</span>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={clearLocation}>
                  <X className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
            )}
            <div className="text-xs text-gray-400">
              {effectiveMinOrder !== DEFAULT_MIN_ORDER ? (
                <span className="text-green-600 font-medium">Min order: ₹{effectiveMinOrder} (local)</span>
              ) : (
                <span>Min order: ₹{DEFAULT_MIN_ORDER} (standard)</span>
              )}
            </div>
            {!userLocation && (
              <p className="text-xs text-red-500">
                ⚠️ You must set a location before placing an order.
              </p>
            )}
          </div>
          <DialogFooter>
            {userLocation ? (
              <Button variant="ghost" onClick={() => setLocationDialogOpen(false)}>Close</Button>
            ) : (
              <Button variant="ghost" disabled className="text-gray-400 cursor-not-allowed">
                Please set a location first
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ PROFILE DIALOG ============ */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#8D6E63]" />
              My Profile
            </DialogTitle>
            <DialogDescription>
              Your account details and order history.
            </DialogDescription>
          </DialogHeader>

          {/* User Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback className="bg-[#D7CCC8] text-[#8D6E63] text-2xl">
                {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold text-gray-900">{session?.user?.name}</p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
              {userLocation && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <MapPinIcon className="w-3 h-3" /> {userLocation}
                </p>
              )}
            </div>
          </div>

          <Separator className="my-2" />

          {/* Orders Section */}
          <div className="mt-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" /> Your Orders
            </h3>
            {ordersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#8D6E63]" />
              </div>
            ) : userOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No orders yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {userOrders.map((order) => (
                  <Card key={order.id} className="border shadow-none">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <Badge
                          className={
                            order.status === 'DELIVERED'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm">
                        <p className="text-gray-600">Total: {formatPrice(order.finalAmount)}</p>
                        <p className="text-gray-500 text-xs">Payment: {order.paymentMethod} • {order.paymentStatus}</p>
                        {order.items && order.items.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            {order.items.map((item, idx) => (
                              <span key={idx}>
                                {item.productName} × {item.quantity} {item.unit}
                                {idx < order.items.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setProfileDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ MAIN CONTENT ============ */}
      <main className="flex-1 w-full">
        {/* ============ HERO ============ */}
        <section className="relative w-full min-h-[55vw] xs:min-h-[50vw] sm:min-h-85 md:min-h-105 max-h-105 sm:max-h-none bg-[#D7CCC8] overflow-hidden">
          <AnimatePresence mode="sync">
            <motion.div
              key={bannerIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <Image
                src={HERO_BANNERS[bannerIndex]}
                alt="Hero banner"
                fill
                priority={bannerIndex === 0}
                className="object-cover"
                sizes="100vw"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-black/10 sm:bg-linear-to-r sm:from-black/75 sm:via-black/45 sm:to-black/10" />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {HERO_BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setBannerIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === bannerIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 xs:px-5 sm:px-8 md:px-14 flex items-center min-h-[55vw] xs:min-h-[50vw] sm:min-h-85 md:min-h-105 max-h-105 sm:max-h-none">
            <motion.div
              key={`text-${bannerIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="max-w-[88%] xs:max-w-md md:max-w-lg"
            >
              <span className="inline-block text-[10px] xs:text-xs font-bold text-[#3a2a22] bg-[#FFB300] px-3 xs:px-4 py-1 xs:py-1.5 rounded-full mb-3 xs:mb-4 tracking-wider uppercase shadow-md">
                {t('storeName', language)}
              </span>
              <h1
                className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-2 xs:mb-3 sm:mb-4 leading-[1.1]"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.45)' }}
              >
                {t('heroTitle', language)}
              </h1>
              <p
                className="text-sm xs:text-base sm:text-lg text-white mb-3 xs:mb-4 sm:mb-5 leading-relaxed max-w-sm font-medium"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)' }}
              >
                {userLocation
                  ? t('heroSubtitleWithLocation', language, {
                      minOrder: effectiveMinOrder,
                      freeThreshold: FREE_DELIVERY_THRESHOLD,
                    })
                  : t('heroSubtitleNoLocation', language, {
                      freeThreshold: FREE_DELIVERY_THRESHOLD,
                    })
                }
              </p>
              {/* ─── DELIVERY ESTIMATE ─── */}
              {userLocation && deliveryDistance !== null && (
                <p
                  className="text-sm xs:text-base sm:text-lg text-white font-semibold mb-4 xs:mb-5 sm:mb-7 leading-relaxed max-w-sm bg-black/30 backdrop-blur-sm rounded-full px-4 py-1.5 inline-block"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)' }}
                >
                  {isLocalDelivery
                    ? t('deliveryEstimateLocal', language)
                    : t('deliveryEstimateStandard', language)}
                </p>
              )}
              <Button
                size="lg"
                className="bg-white text-[#5d4037] hover:bg-gray-100 rounded-full px-6 xs:px-8 sm:px-10 shadow-xl hover:shadow-2xl transition-all duration-300 font-bold text-sm sm:text-base"
                onClick={() => document.getElementById('product-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('shopNow', language)}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ============ CATEGORY BAR ============ */}
        <section className="border-b border-gray-100 bg-white sticky top-14 sm:top-16 z-40">
          <div className="max-w-7xl mx-auto">
            <div
              className="flex gap-2 py-3 overflow-x-auto px-3 sm:px-6 lg:px-8"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
              `}</style>
              <button
                onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
                  !selectedCategory
                    ? 'border-[#8D6E63] bg-[#8D6E63] text-white shadow-md shadow-[#8D6E63]/30'
                    : 'border-gray-200 text-gray-600 hover:border-[#8D6E63]/50 hover:text-[#8D6E63] bg-white'
                }`}
              >
                <span>🛒</span>
                {t('allCategories', language)}
              </button>
              {parentCategories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const emoji = getCategoryEmoji(cat.name);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
                      isSelected
                        ? 'border-[#8D6E63] bg-[#8D6E63] text-white shadow-md shadow-[#8D6E63]/30'
                        : 'border-gray-200 text-gray-600 hover:border-[#8D6E63]/50 hover:text-[#8D6E63] bg-white'
                    }`}
                  >
                    <span>{emoji}</span>
                    {getLocalName(cat, language)}
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {currentSubcategories.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="flex gap-2 pb-3 overflow-x-auto px-3 sm:px-6 lg:px-8"
                    style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                  >
                    <button
                      onClick={() => setSelectedSubcategory(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap shrink-0 transition-all ${
                        !selectedSubcategory
                          ? 'bg-[#8D6E63]/10 border-[#8D6E63]/30 text-[#8D6E63]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {t('viewAll', language)}
                    </button>
                    {currentSubcategories.map((sub) => {
                      const isSelected = selectedSubcategory === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubcategory(sub.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap shrink-0 transition-all ${
                            isSelected
                              ? 'bg-[#8D6E63]/10 border-[#8D6E63]/30 text-[#8D6E63]'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {getLocalName(sub, language)}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ============ MIN ORDER REMINDER ============ */}
        {cartCount > 0 && minOrderRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#FFB300]/10 border-b border-[#FFB300]/30"
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2">
              <p className="text-xs sm:text-sm text-[#8D6E63] text-center">
                🛒 {userLocation && <span>📍 {userLocation} – </span>}
                {t('addedMore', language, { amount: minOrderRemaining.toFixed(0) })}
                {effectiveMinOrder !== DEFAULT_MIN_ORDER && (
                  <span className="ml-1 text-green-600 font-medium">(Local ₹{effectiveMinOrder})</span>
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* ============ PRODUCT SECTION ============ */}
        <section id="product-section" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-gray-100">
                  <Skeleton className="w-full h-32" />
                  <CardContent className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-gray-600 mb-4">{t('error', language)}</p>
              <Button variant="outline" onClick={fetchData} className="border-[#8D6E63] text-[#8D6E63]">
                <Loader2 className="w-4 h-4 mr-2" />
                {t('tryAgain', language)}
              </Button>
            </div>
          )}

          {!loading && !error && isBrowseAllView && !searchQuery.trim() && productsByCategory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-500">{t('noProducts', language)}</p>
            </div>
          )}

          {/* Browse-all view: grouped by category, each category's products shuffled */}
          {!loading && !error && isBrowseAllView && (
            <div className="space-y-10 sm:space-y-12">
              {productsByCategory.map(({ category, items }) => (
                <div key={category.id} id={`cat-${category.id}`} className="scroll-mt-32">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">{getCategoryEmoji(category.name)}</span>
                      <div>
                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                          {getLocalName(category, language)}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {items.length} {language === 'hi' ? 'उत्पाद' : language === 'bn' ? 'পণ্য' : 'products'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-1 text-xs sm:text-sm font-medium text-[#8D6E63] hover:underline shrink-0"
                    >
                      {t('viewAll', language)} <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {renderProductGrid(items)}
                </div>
              ))}

              {searchQuery.trim() && productsByCategory.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Package className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-500">{t('noProducts', language)}</p>
                </div>
              )}
            </div>
          )}

          {/* Filtered view – shuffled as well */}
          {!loading && !error && !isBrowseAllView && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {getLocalName(parentCategories.find(c => c.id === selectedCategory) || { name: '', nameHi: null, nameBn: null }, language)}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {filteredProducts.length} {language === 'hi' ? 'उत्पाद' : language === 'bn' ? 'পণ্য' : 'products'}
                  </p>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Package className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-500">{t('noProducts', language)}</p>
                </div>
              ) : (
                renderProductGrid(filteredProducts)
              )}
            </>
          )}
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="bg-gray-900 text-gray-300 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative h-8 w-8">
                  <Image src="/logo.png" alt="UK MART" fill className="object-contain" />
                </div>
                <span className="text-lg font-bold text-white">{t('storeName', language)}</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                {language === 'hi'
                  ? 'UK MART आपके लिए ताज़ी और गुणवत्तापूर्ण ग्रोसरी उत्पाद थोक दरों पर लाता है। हम आपकी दैनिक ज़रूरतों को आपके दरवाज़े तक पहुँचाते हैं।'
                  : language === 'bn'
                  ? 'UK MART আপনার জন্য সতেজ এবং মানসম্পন্ন মুদি পণ্য পাইকারি দামে নিয়ে আসে। আমরা আপনার দৈনন্দিন প্রয়োজনীয়তা আপনার দরজায় পৌঁছে দিই।'
                  : 'UK MART brings you fresh and quality grocery products at wholesale prices. We deliver your daily essentials right to your doorstep.'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {language === 'hi' ? 'श्रेणियाँ' : language === 'bn' ? 'বিভাগ' : 'Quick Links'}
              </h3>
              <ul className="space-y-2">
                {parentCategories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => scrollToCategorySection(cat.id)}
                      className="text-sm text-gray-400 hover:text-[#FFB300] transition-colors"
                    >
                      {getCategoryEmoji(cat.name)} {getLocalName(cat, language)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {t('contactUs', language)}
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <Phone className="w-4 h-4 text-[#FFB300]" />
                  <span>+91 8100264108</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4 text-[#FFB300] mt-0.5 shrink-0" />
                  <span>
                    {language === 'hi'
                      ? 'भारत में कहीं भी डिलीवरी'
                      : language === 'bn'
                      ? 'ভারতের যেকোনো জায়গায় ডেলিভারি'
                      : 'Delivery across India'}
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-400">
                  <CreditCard className="w-4 h-4 text-[#FFB300] mt-0.5 shrink-0" />
                  <span>Razorpay</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-xs text-gray-500 text-center sm:text-left">
              © 2024 UK MART. {t('allRights', language)} {t('minOrderNote', language)}
            </p>
          </div>
        </div>
      </footer>

      {/* ============ CART SHEET ============ */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full max-h-screen">
          <SheetHeader className="px-4 sm:px-6 pt-6 pb-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg font-bold text-gray-900">{t('yourCart', language)}</SheetTitle>
                {cartCount > 0 && (
                  <Badge className="bg-[#8D6E63]/10 text-[#8D6E63] hover:bg-[#8D6E63]/10">{cartCount}</Badge>
                )}
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={clearCart}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {t('clearCart', language)}
                </Button>
              )}
            </div>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-0">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium mb-2">{t('cartEmpty', language)}</p>
              <Button variant="outline" className="mt-4 border-[#8D6E63] text-[#8D6E63]" onClick={() => setCartOpen(false)}>
                {t('continueShopping', language)}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <CartItemRow
                      key={item.productId}
                      item={item}
                      language={language}
                      onUpdateQty={(qty) => handleUpdateCartQty(item, qty)}
                      onRemove={() => removeFromCart(item.productId)}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t bg-gray-50 px-4 sm:px-6 py-4 space-y-3 shrink-0">
                {!userLocation && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-red-600">
                      ⚠️ Please set your delivery location to place an order.
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-[#8D6E63] p-0 h-auto text-xs"
                      onClick={() => setLocationDialogOpen(true)}
                    >
                      Set location now
                    </Button>
                  </div>
                )}

                {userLocation && minOrderRemaining > 0 && (
                  <div className="bg-[#FFB300]/10 border border-[#FFB300]/30 rounded-lg p-2.5">
                    <p className="text-xs text-[#8D6E63] text-center">
                      ⚠️ {t('addedMore', language, { amount: minOrderRemaining.toFixed(0) })}
                      {effectiveMinOrder !== DEFAULT_MIN_ORDER && (
                        <span className="ml-1 text-green-600 font-medium">(Local ₹{effectiveMinOrder})</span>
                      )}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{t('subtotal', language)}</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t('deliveryCharge', language)}</span>
                    <span className={deliveryCharge === 0 ? 'text-[#8D6E63] font-medium' : ''}>
                      {deliveryCharge === 0 ? t('free', language) : formatPrice(deliveryCharge)}
                    </span>
                  </div>
                  {deliveryCharge > 0 && (
                    <p className="text-xs text-gray-400">
                      {language === 'hi'
                        ? `₹${FREE_DELIVERY_THRESHOLD} से ऊपर पर मुफ्त डिलीवरी`
                        : language === 'bn'
                        ? `₹${FREE_DELIVERY_THRESHOLD} এর উপরে বিনামূল্যে ডেলিভারি`
                        : `Free delivery above ₹${FREE_DELIVERY_THRESHOLD}`}
                    </p>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>{t('total', language)}</span>
                    <span>{formatPrice(grandTotal)}</span>
                  </div>
                  {userLocation && (
                    <div className="text-[11px] text-gray-500 flex items-center justify-between">
                      <span>📍 Location</span>
                      <span className="font-medium truncate ml-2">{userLocation}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-gray-500 flex items-center justify-between">
                    <span>Minimum order</span>
                    <span className="font-medium text-[#8D6E63]">₹{effectiveMinOrder}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-[#8D6E63] hover:bg-[#8D6E63]/90 text-white"
                  size="lg"
                  disabled={cartTotal < effectiveMinOrder || !userLocation}
                  onClick={() => {
                    if (!userLocation) {
                      toast.error('Please set your delivery location first.');
                      setLocationDialogOpen(true);
                      return;
                    }
                    if (!isAuthenticated) {
                      toast.error('Please sign in to continue to checkout');
                      signIn('google');
                      return;
                    }
                    setCartOpen(false);
                    setCheckoutStep(1);
                    setCheckoutOpen(true);
                  }}
                >
                  {!userLocation
                    ? 'Set Location to Checkout'
                    : cartTotal < effectiveMinOrder
                      ? `${t('checkout', language)} (₹${effectiveMinOrder})`
                      : !isAuthenticated
                        ? 'Sign in to Checkout'
                        : t('checkout', language)}
                </Button>
                {!isAuthenticated && cartTotal >= effectiveMinOrder && userLocation && (
                  <p className="text-xs text-gray-500 text-center">
                    You need to sign in before placing an order.
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ============ CHECKOUT DIALOG ============ */}
      <Dialog
        open={checkoutOpen}
        onOpenChange={(open) => {
          if (open && !isAuthenticated) {
            toast.error('Please sign in to continue to checkout');
            signIn('google');
            return;
          }
          setCheckoutOpen(open);
          if (!open) setCheckoutStep(1);
        }}
      >
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {checkoutStep === 1 ? 'Delivery Details'
                  : checkoutStep === 2 ? 'Payment'
                  : 'Review & Place Order'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {checkoutStep === 1 ? 'Enter your delivery address'
                  : checkoutStep === 2 ? 'Choose your payment method'
                  : 'Review your order'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 mt-4 mb-6">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                    checkoutStep >= step ? 'bg-[#8D6E63] text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && <div className={`flex-1 h-0.5 ${checkoutStep > step ? 'bg-[#8D6E63]' : 'bg-gray-200'}`} />}
                </React.Fragment>
              ))}
            </div>

            {checkoutStep === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" placeholder="Your full name" value={deliveryForm.name} onChange={(e) => setDeliveryForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" placeholder="Phone number" value={deliveryForm.phone} onChange={(e) => setDeliveryForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea
                    id="address"
                    placeholder="Your delivery address"
                    value={deliveryForm.address}
                    onChange={(e) => setDeliveryForm((f) => ({ ...f, address: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="w-full sm:w-1/2">
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" placeholder="Pincode" value={deliveryForm.pincode} onChange={(e) => setDeliveryForm((f) => ({ ...f, pincode: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Order Notes</Label>
                  <Textarea id="notes" placeholder="Any special instructions" value={deliveryForm.notes} onChange={(e) => setDeliveryForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
                {userLocation && (
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <MapPinIcon className="w-3 h-3" />
                    <span>Location set: {userLocation} – min order ₹{effectiveMinOrder}</span>
                  </div>
                )}
              </motion.div>
            )}

            {checkoutStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Razorpay option */}
                  <button
                    onClick={() => setSelectedPaymentMethod('RAZORPAY')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPaymentMethod === 'RAZORPAY'
                        ? 'border-[#8D6E63] bg-[#8D6E63]/5 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#8D6E63]" />
                      <span className="font-medium">Pay Online</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Razorpay • Cards, UPI, Netbanking</p>
                  </button>

                  {/* COD option – only if local delivery */}
                  <button
                    onClick={() => {
                      if (isLocalDelivery) {
                        setSelectedPaymentMethod('COD');
                      } else {
                        toast.error('Cash on Delivery is only available for local deliveries (within 13 km).');
                      }
                    }}
                    disabled={!isLocalDelivery}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPaymentMethod === 'COD'
                        ? 'border-[#8D6E63] bg-[#8D6E63]/5 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!isLocalDelivery ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Cash on Delivery</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Pay when you receive your order
                      {!isLocalDelivery && ' (not available for your area)'}
                    </p>
                  </button>
                </div>

                {!isLocalDelivery && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ⚠️ COD is limited to local deliveries within {LOCAL_RADIUS_KM} km. Please use online payment.
                  </p>
                )}
              </motion.div>
            )}

            {checkoutStep === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Details</p>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p className="font-medium">{deliveryForm.name} • {deliveryForm.phone}</p>
                    <p className="text-gray-500">{deliveryForm.address}</p>
                    {deliveryForm.pincode && <p className="text-gray-500">Pincode: {deliveryForm.pincode}</p>}
                    {deliveryForm.notes && <p className="text-gray-400 italic">{deliveryForm.notes}</p>}
                    {userLocation && (
                      <p className="text-xs text-gray-500">📍 {userLocation}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</p>
                  <div className="max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.productId} className="flex items-center justify-between text-sm py-1">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-700 truncate">{item.productName}</p>
                            <p className="text-xs text-gray-400">
                              {formatPrice(item.pricePerUnit)} × {item.quantity} {item.unit}
                            </p>
                          </div>
                          <span className="font-medium text-gray-700 ml-2">{formatPrice(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Charge</span>
                    <span className={deliveryCharge === 0 ? 'text-[#8D6E63] font-medium' : ''}>
                      {deliveryCharge === 0 ? 'Free' : formatPrice(deliveryCharge)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span>{formatPrice(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Payment</span>
                    <span className="font-medium">
                      {selectedPaymentMethod === 'COD' ? 'Cash on Delivery' : 'Razorpay'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Minimum order</span>
                    <span className="font-medium">₹{effectiveMinOrder}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="border-t px-4 sm:px-6 py-4 flex items-center justify-between bg-gray-50">
            <Button variant="ghost" onClick={() => { if (checkoutStep > 1) setCheckoutStep((s) => s - 1); else setCheckoutOpen(false); }} className="text-gray-600">
              {checkoutStep === 1 ? 'Cancel' : 'Back'}
            </Button>
            {checkoutStep < 3 ? (
              <Button
                className="bg-[#8D6E63] hover:bg-[#8D6E63]/90 text-white"
                onClick={() => {
                  if (checkoutStep === 1) {
                    if (!deliveryForm.name || !deliveryForm.phone || !deliveryForm.address) {
                      toast.error('Please fill all delivery details');
                      return;
                    }
                    setCheckoutStep(2);
                  } else if (checkoutStep === 2) {
                    setCheckoutStep(3);
                  }
                }}
                disabled={checkoutStep === 1 && (!deliveryForm.name || !deliveryForm.phone || !deliveryForm.address)}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                className="bg-[#8D6E63] hover:bg-[#8D6E63]/90 text-white"
                onClick={handlePlaceOrder}
                disabled={razorpayLoading || placingOrder || cartTotal < effectiveMinOrder || !userLocation}
              >
                {razorpayLoading || placingOrder ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> {selectedPaymentMethod === 'COD' ? 'Place Order' : 'Pay Now'}</>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ ORDER SUCCESS ============ */}
      <Dialog open={!!orderSuccessData} onOpenChange={(open) => { if (!open) setOrderSuccessData(null); }}>
        <DialogContent className="max-w-sm w-[90vw] sm:w-full text-center p-6">
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 200 }}>
            <div className="w-20 h-20 bg-[#D7CCC8] rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-[#8D6E63]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order Placed!</h2>
            <p className="text-sm text-gray-500 mb-1">Your order has been placed successfully.</p>
            <p className="text-xs text-gray-400">Order ID: {orderSuccessData?.orderId}</p>
            <Button className="bg-[#8D6E63] hover:bg-[#8D6E63]/90 text-white w-full mt-4" onClick={() => setOrderSuccessData(null)}>
              Continue Shopping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Product Card ────────────────────────────
interface ProductCardProps {
  product: Product;
  language: Language;
  selectedUnit: string;
  selectedQty: number;
  isAdded: boolean;
  customWeight: string;
  onUnitChange: (unit: string) => void;
  onQtyChange: (qty: number) => void;
  onCustomWeightChange: (val: string) => void;
  onAddToCart: () => void;
}

function ProductCard({ product, language, selectedUnit, selectedQty, isAdded, customWeight, onUnitChange, onQtyChange, onCustomWeightChange, onAddToCart }: ProductCardProps) {
  const rawAvailableUnits: string[] = (() => {
    try {
      const parsed = JSON.parse(product.availableUnits);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [product.baseUnit];
    } catch { return [product.baseUnit]; }
  })();

  const WEIGHT_VOLUME_PATTERN = /^\s*\d+(\.\d+)?\s*(g|gm|gms|kg|ml|l|litre|liter)\s*$/i;
  const availableUnits: string[] =
    product.unitType === 'piece'
      ? (() => {
          const cleaned = rawAvailableUnits.filter((u) => !WEIGHT_VOLUME_PATTERN.test(u));
          return cleaned.length > 0 ? cleaned : [product.baseUnit];
        })()
      : rawAvailableUnits;

  const isSingleFixedItem = availableUnits.length <= 1;

  const isCustom = !isSingleFixedItem && selectedUnit === 'custom';
  const effectiveUnit = isSingleFixedItem ? (availableUnits[0] || product.baseUnit) : selectedUnit;
  const displayUnit = isCustom && customWeight
    ? formatCustomWeight(customWeight, product.unitType)
    : effectiveUnit;
  const unitPrice = displayUnit ? calculatePrice(product.basePrice, product.baseUnit, displayUnit) : 0;
  const pastelColor = getPastelColor(product.name);
  const displayName = getLocalName(product, language);
  const displayDescription = getLocalDescription(product, language);
  const initial = product.name.charAt(0).toUpperCase();

  const inStock = product.stock > 0;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3 }}
      className="min-w-0"
    >
      <Card className="overflow-hidden border-gray-100 hover:shadow-md transition-shadow group h-full flex flex-col">
        <div className={`relative w-full aspect-square ${pastelColor} flex items-center justify-center overflow-hidden`}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              loading="lazy"
            />
          ) : (
            <span className="text-4xl font-bold text-gray-300">{initial}</span>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive" className="text-xs">{t('outOfStock', language)}</Badge>
            </div>
          )}
          {inStock && (
            <Badge className="absolute top-2 right-2 bg-green-600 text-white hover:bg-green-600 text-[10px] font-semibold shadow-sm border-0">
              {t('inStock', language)}
            </Badge>
          )}
        </div>

        <CardContent className="p-2.5 sm:p-3 flex flex-col flex-1 gap-1.5">
          <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 leading-tight min-h-[2.5em]">
            {displayName}
          </h3>

          {displayDescription && (
            <p className="text-[10px] sm:text-[11px] text-gray-500 line-clamp-2 leading-snug">
              {displayDescription}
            </p>
          )}

          <p className="text-[11px] sm:text-xs text-gray-400">
            {formatPrice(product.basePrice)} {t('per', language)} {product.baseUnit}
          </p>

          {isSingleFixedItem ? (
            <div className="h-7 flex items-center px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-md text-gray-600 font-medium">
              {availableUnits[0] || product.baseUnit}
            </div>
          ) : (
            <Select value={selectedUnit} onValueChange={onUnitChange}>
              <SelectTrigger className="h-7 text-xs bg-gray-50 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((unit) => (
                  <SelectItem key={unit} value={unit} className="text-xs">
                    {unit} — {formatPrice(calculatePrice(product.basePrice, product.baseUnit, unit))}
                  </SelectItem>
                ))}
                <SelectItem value="custom" className="text-xs font-medium text-[#8D6E63] bg-[#D7CCC8]/50">
                  ✏️ Custom weight...
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {isCustom && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min={product.unitType === 'piece' ? 1 : 1}
                    max={product.unitType === 'piece' ? 100 : 50000}
                    step={product.unitType === 'piece' ? 1 : 50}
                    value={customWeight}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        onCustomWeightChange(val);
                      }
                    }}
                    placeholder={getCustomInputPlaceholder(product.unitType)}
                    className="h-7 text-xs pr-12 bg-[#FFB300]/10 border-[#FFB300]/30 focus:border-[#8D6E63] focus:ring-[#8D6E63]"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium pointer-events-none">
                    {getCustomInputLabel(product.unitType)}
                  </span>
                </div>
              </div>
              {product.unitType !== 'piece' && (
                <div className="flex flex-wrap gap-1">
                  {[50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000].map((g) => (
                    <button
                      key={g}
                      onClick={() => onCustomWeightChange(String(g))}
                      className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                        customWeight === String(g)
                          ? 'bg-[#8D6E63] text-white border-[#8D6E63]'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#8D6E63]/50 hover:text-[#8D6E63]'
                      }`}
                    >
                      {g >= 1000 ? `${g / 1000}kg` : `${g}g`}
                    </button>
                  ))}
                </div>
              )}
              {product.unitType === 'piece' && (
                <div className="flex flex-wrap gap-1">
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <button
                      key={n}
                      onClick={() => onCustomWeightChange(String(n))}
                      className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                        customWeight === String(n)
                          ? 'bg-[#8D6E63] text-white border-[#8D6E63]'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#8D6E63]/50 hover:text-[#8D6E63]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className={`font-bold ${isCustom ? 'text-base sm:text-lg text-[#FFB300]' : 'text-sm sm:text-base text-[#8D6E63]'}`}>
            {displayUnit && unitPrice > 0
              ? <>{formatPrice(unitPrice)} <span className="text-[10px] sm:text-xs font-normal text-gray-400">/ {displayUnit}</span></>
              : <span className="text-[10px] sm:text-xs font-normal text-gray-400">{t('selectUnit', language)}</span>
            }
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 mt-auto pt-1">
            <Button
              size="sm"
              className={`w-full sm:flex-1 h-8 text-xs font-medium transition-all order-1 sm:order-2 ${
                isAdded
                  ? 'bg-[#8D6E63]/10 text-[#8D6E63] hover:bg-[#8D6E63]/20'
                  : isCustom
                    ? 'bg-[#FFB300] hover:bg-[#FFB300]/90 text-white'
                    : 'bg-[#8D6E63] hover:bg-[#8D6E63]/90 text-white'
              }`}
              onClick={onAddToCart}
              disabled={!inStock || (isCustom && (!customWeight || parseFloat(customWeight) <= 0))}
            >
              {isAdded ? (
                <><CheckCircle2 className="w-3 h-3 mr-1 shrink-0" /> <span className="truncate">{t('added', language)}</span></>
              ) : (
                <><ShoppingCart className="w-3 h-3 mr-1 shrink-0" /> <span className="truncate">{t('addToCart', language)}</span></>
              )}
            </Button>

            <div className="flex items-center justify-center border border-gray-200 rounded-lg overflow-hidden shrink-0 self-center order-2 sm:order-1">
              <button
                onClick={() => onQtyChange(Math.max(1, selectedQty - 1))}
                className="w-8 h-7 sm:w-7 sm:h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 h-7 sm:w-7 sm:h-7 flex items-center justify-center text-xs font-medium text-gray-700 border-x border-gray-200">
                {selectedQty}
              </span>
              <button
                onClick={() => onQtyChange(selectedQty + 1)}
                className="w-8 h-7 sm:w-7 sm:h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Cart Item Row ──────────────────────────
interface CartItemRowProps {
  item: CartItem;
  language: Language;
  onUpdateQty: (qty: number) => void;
  onRemove: () => void;
}

function CartItemRow({ item, language, onUpdateQty, onRemove }: CartItemRowProps) {
  const pastelColor = getPastelColor(item.productName);
  const initial = item.productName.charAt(0).toUpperCase();

  return (
    <div className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100">
      <div className={`w-16 h-16 rounded-lg shrink-0 ${pastelColor} flex items-center justify-center overflow-hidden`}>
        {item.productImage ? (
          <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-gray-300">{initial}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
          <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatPrice(item.pricePerUnit)} × {item.quantity} {item.unit}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
            <button onClick={() => onUpdateQty(item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs">
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-6 h-6 flex items-center justify-center text-xs font-medium text-gray-700 border-x border-gray-200">
              {item.quantity}
            </span>
            <button onClick={() => onUpdateQty(item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm font-bold text-gray-900">{formatPrice(item.totalPrice)}</p>
        </div>
      </div>
    </div>
  );
}