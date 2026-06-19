'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingCart, X, Minus, Plus, Trash2, ChevronRight, ChevronDown,
  ShoppingBag, Globe, LogOut, User, Package, MapPin, Phone,
  CreditCard, CheckCircle2, Menu, ArrowRight, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useStore, type CartItem } from '@/lib/store';
import { calculatePrice } from '@/lib/price-utils';
import { t, type Language } from '@/lib/i18n';
import { useSession, signIn, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import Image from 'next/image'; // ✅ added for image optimization

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
const MIN_ORDER = 2500;
const FREE_DELIVERY_THRESHOLD = 5000;
const DELIVERY_CHARGE = 50;

const CATEGORY_EMOJI: Record<string, string> = {
  'Fruits & Vegetables': '🍎',
  'Dairy & Breakfast': '🥛',
  'Staples': '🌾',
  'Snacks & Beverages': '🍿',
  'Personal Care': '💄',
  'Household': '🏠',
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

function getPastelColor(name: string): string {
  return PASTEL_COLORS[name.length % PASTEL_COLORS.length];
}

function getCategoryEmoji(catName: string): string {
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (catName.toLowerCase().includes(key.toLowerCase())) return emoji;
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
  } = useStore();

  // ── NextAuth session ──
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;

  // ── Sync session with Zustand store ──
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

  // ── Filtered products ──
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
    return result;
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

  // ── Cart totals ──
  const cartTotal = getCartTotal();
  const cartCount = getCartCount();
  const minOrderRemaining = getMinOrderRemaining();
  const deliveryCharge = cartTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const grandTotal = cartTotal + deliveryCharge;

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

  // ── Place order (Razorpay only) ──
  const handlePlaceOrder = async () => {
    // Validate delivery form
    if (!deliveryForm.name || !deliveryForm.phone || !deliveryForm.address) {
      toast.error('Please fill all delivery details');
      return;
    }

    // Build order data
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

    // Razorpay flow
    if (!razorpayScriptLoaded) {
      toast.error('Payment gateway is loading, please try again');
      return;
    }

    setRazorpayLoading(true);
    try {
      // 1. Create Razorpay order
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

      // 2. Open Razorpay checkout
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
          // 3. Verify payment and create order
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
    }
  };

  // ──────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
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
              <div className="relative h-12 w-auto aspect-square">
                <Image
                  src="/logo.png"
                  alt="UK MART"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-[#8D6E63] hidden sm:block">
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
            <div className="flex items-center gap-2 sm:gap-3">
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

              {/* Cart Button */}
              <Button
                variant="ghost"
                size="sm"
                className="relative text-gray-600 hover:text-[#8D6E63]"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#8D6E63] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Button>

              {/* ===== UPDATED USER / AUTH ===== */}
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
              <Button variant="ghost" size="icon" className="md:hidden text-gray-600" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
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
            {/* Language */}
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
            {/* ===== UPDATED MOBILE AUTH ===== */}
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

      {/* ============ MAIN CONTENT ============ */}
      <main className="flex-1">
        {/* ============ HERO ============ */}
        <section className="relative w-full min-h-56 sm:min-h-72 md:min-h-96 bg-[#D7CCC8]">
          {/* Background Image using next/image */}
          <Image
            src="/banner.png"
            alt="Hero banner"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* Overlay gradient for desktop */}
          <div className="absolute inset-0 bg-linear-to-r from-white/95 via-white/60 to-transparent hidden sm:block" />
          {/* Overlay for mobile */}
          <div className="absolute inset-0 bg-white/80 sm:hidden" />

          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-14 flex items-center min-h-56 sm:min-h-72 md:min-h-96">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-md md:max-w-lg"
            >
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                {t('heroTitle', language)}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                {t('heroSubtitle', language)}
              </p>
              <Button
                size="lg"
                className="bg-[#8D6E63] hover:bg-[#8D6E63]/90 text-white rounded-full px-6 sm:px-8 shadow-lg shadow-[#8D6E63]/30"
                onClick={() => document.getElementById('product-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('shopNow', language)}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ============ CATEGORY BAR ============ */}
        <section className="border-b border-gray-100 bg-white sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ScrollArea className="w-auto">
              <div className="flex gap-2 py-3 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                <button
                  onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all ${
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all ${
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
            </ScrollArea>

            {/* Subcategories */}
            <AnimatePresence>
              {currentSubcategories.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                    <button
                      onClick={() => setSelectedSubcategory(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
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
                          className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <p className="text-xs sm:text-sm text-[#8D6E63] text-center">
                🛒 {t('addedMore', language, { amount: minOrderRemaining.toFixed(0) })}
              </p>
            </div>
          </motion.div>
        )}

        {/* ============ PRODUCT GRID ============ */}
        <section id="product-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {selectedCategory
                  ? getLocalName(parentCategories.find(c => c.id === selectedCategory) || { name: '', nameHi: null, nameBn: null }, language)
                  : t('products', language)
                }
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {filteredProducts.length} {language === 'hi' ? 'उत्पाद' : language === 'bn' ? 'পণ্য' : 'products'}
              </p>
            </div>
          </div>

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

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-500">{t('noProducts', language)}</p>
            </div>
          )}

          {!loading && !error && (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.03 } },
              }}
            >
              {filteredProducts.map((product) => (
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
                {language === 'hi' ? 'শ্রেণিযাবদ্ধ' : language === 'bn' ? 'বিভাগ' : 'Quick Links'}
              </h3>
              <ul className="space-y-2">
                {parentCategories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => { setSelectedCategory(cat.id); setSelectedSubcategory(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
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
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
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
              <ScrollArea className="flex-1 px-6 py-4">
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
              </ScrollArea>

              <div className="border-t bg-gray-50 px-6 py-4 space-y-3">
                {minOrderRemaining > 0 && (
                  <div className="bg-[#FFB300]/10 border border-[#FFB300]/30 rounded-lg p-2.5">
                    <p className="text-xs text-[#8D6E63] text-center">
                      ⚠️ {t('addedMore', language, { amount: minOrderRemaining.toFixed(0) })}
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
                </div>

                <Button
                  className="w-full bg-[#8D6E63] hover:bg-[#8D6E63]/90 text-white"
                  size="lg"
                  disabled={cartTotal < MIN_ORDER}
                  onClick={() => { setCartOpen(false); setCheckoutStep(1); setCheckoutOpen(true); }}
                >
                  {cartTotal < MIN_ORDER
                    ? `${t('checkout', language)} (₹${MIN_ORDER})`
                    : t('checkout', language)}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ============ CHECKOUT DIALOG (Razorpay only) ============ */}
      <Dialog open={checkoutOpen} onOpenChange={(open) => { setCheckoutOpen(open); if (!open) setCheckoutStep(1); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {checkoutStep === 1 ? 'Delivery Details'
                  : checkoutStep === 2 ? 'Payment'
                  : 'Review & Place Order'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {checkoutStep === 1 ? 'Enter your delivery address'
                  : checkoutStep === 2 ? 'Secure payment via Razorpay'
                  : 'Review your order'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 mt-4 mb-6">
              {[1, 2, 3].map((step) => (
                <React.Fragment key={step}>
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
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
                  <Textarea id="address" placeholder="Your delivery address" value={deliveryForm.address} onChange={(e) => setDeliveryForm((f) => ({ ...f, address: e.target.value }))} rows={3} />
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
              </motion.div>
            )}

            {checkoutStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-200">
                  <CreditCard className="w-12 h-12 text-[#8D6E63] mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-800">Razorpay</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Pay securely using Credit/Debit Card, UPI, Netbanking, or Wallet.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Badge variant="outline" className="bg-white">Cards</Badge>
                    <Badge variant="outline" className="bg-white">UPI</Badge>
                    <Badge variant="outline" className="bg-white">Netbanking</Badge>
                    <Badge variant="outline" className="bg-white">Wallet</Badge>
                  </div>
                </div>
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
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</p>
                  <ScrollArea className="max-h-48">
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
                  </ScrollArea>
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
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-[#8D6E63]/30 text-[#8D6E63]">
                    Razorpay
                  </Badge>
                </div>
              </motion.div>
            )}
          </div>

          <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
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
                disabled={razorpayLoading}
              >
                {razorpayLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Pay Now</>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ ORDER SUCCESS ============ */}
      <Dialog open={!!orderSuccessData} onOpenChange={(open) => { if (!open) setOrderSuccessData(null); }}>
        <DialogContent className="max-w-sm text-center p-6">
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

// ─── Product Card (unchanged) ────────────────────────────
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
  const availableUnits: string[] = (() => {
    try { return JSON.parse(product.availableUnits); } catch { return [product.baseUnit]; }
  })();

  const isCustom = selectedUnit === 'custom';
  const displayUnit = isCustom && customWeight
    ? formatCustomWeight(customWeight, product.unitType)
    : selectedUnit;
  const unitPrice = displayUnit ? calculatePrice(product.basePrice, product.baseUnit, displayUnit) : 0;
  const pastelColor = getPastelColor(product.name);
  const displayName = getLocalName(product, language);
  const initial = product.name.charAt(0).toUpperCase();

  const inStock = product.stock > 0;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3 }}
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
            <Badge className="absolute top-2 right-2 bg-[#8D6E63]/10 text-[#8D6E63] hover:bg-[#8D6E63]/10 text-[10px]">
              {t('inStock', language)}
            </Badge>
          )}
        </div>

        <CardContent className="p-3 flex flex-col flex-1 gap-1.5">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight min-h-[2.5em]">
            {displayName}
          </h3>

          <p className="text-xs text-gray-400">
            {formatPrice(product.basePrice)} {t('per', language)} {product.baseUnit}
          </p>

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

          <p className={`font-bold ${isCustom ? 'text-lg text-[#FFB300]' : 'text-base text-[#8D6E63]'}`}>
            {displayUnit && unitPrice > 0
              ? <>{formatPrice(unitPrice)} <span className="text-xs font-normal text-gray-400">/ {displayUnit}</span></>
              : <span className="text-xs font-normal text-gray-400">{t('selectUnit', language)}</span>
            }
          </p>

          <div className="flex items-center gap-2 mt-auto pt-1">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => onQtyChange(Math.max(1, selectedQty - 1))}
                className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-7 h-7 flex items-center justify-center text-xs font-medium text-gray-700 border-x border-gray-200">
                {selectedQty}
              </span>
              <button
                onClick={() => onQtyChange(selectedQty + 1)}
                className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <Button
              size="sm"
              className={`flex-1 h-8 text-xs font-medium transition-all ${
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
                <><CheckCircle2 className="w-3 h-3 mr-1" /> {t('added', language)}</>
              ) : (
                <><ShoppingCart className="w-3 h-3 mr-1" /> {t('addToCart', language)}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Cart Item Row (unchanged) ──────────────────────────
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