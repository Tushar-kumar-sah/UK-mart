'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  AlertTriangle,
  Tag,
  ShoppingCart,
  Users,
  BrainCircuit,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Menu,
  TrendingUp,
  IndianRupee,
  LogOut,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ============================================================
// Types
// ============================================================

interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  activeOffers: number;
  pendingOrders: number;
  todayRevenue: number;
  lowStock: number;
  recentOrders: RecentOrder[];
  statusBreakdown: { status: string; count: number }[];
  categoryBreakdown: { categoryId: string; _count: { categoryId: number } }[];
}

interface RecentOrder {
  id: string;
  customerName: string;
  totalAmount: number;
  finalAmount: number;
  status: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  nameHi: string;
  nameBn: string;
  description: string;
  descriptionHi: string;
  descriptionBn: string;
  categoryId: string;
  subcategoryId: string | null;
  basePrice: number;
  baseUnit: string;
  availableUnits: string;
  imageUrl: string | null;
  isActive: boolean;
  stock: number;
  unitType: string;
  category: { id: string; name: string; nameHi: string; nameBn: string } | null;
  subcategory: { id: string; name: string; nameHi: string; nameBn: string } | null;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  nameHi: string;
  nameBn: string;
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
  description: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  googleId: string | null;
  avatar: string | null;
  phone: string | null;
  role: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { orders: number };
}

interface AIAnalysis {
  summary: string;
  insights: { title: string; description: string }[];
  recommendations: string[];
  metrics: Record<string, string | number>;
}

type Section = 'dashboard' | 'products' | 'categories' | 'stock' | 'offers' | 'orders' | 'users' | 'ai-analyzer';

// ============================================================
// Constants
// ============================================================
const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================
// Main Component
// ============================================================
export default function AdminPanel() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;
  const isAdmin = isAuthenticated && (session.user as any)?.role === 'ADMIN';

  // ============================================================
  // ALL HOOKS – MUST BE BEFORE ANY EARLY RETURN
  // ============================================================

  // Navigation state
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [aiResult, setAiResult] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Loading states
  const [loading, setLoading] = useState<Record<Section, boolean>>({
    dashboard: false,
    products: false,
    categories: false,
    stock: false,
    offers: false,
    orders: false,
    users: false,
    'ai-analyzer': false,
  });

  // Dialog states
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [orderDetailDialogOpen, setOrderDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);

  // ============================================================
  // API callbacks
  // ============================================================
  const setLoadingFor = useCallback((section: Section, value: boolean) => {
    setLoading((prev) => ({ ...prev, [section]: value }));
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoadingFor('dashboard', true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoadingFor('dashboard', false);
    }
  }, [setLoadingFor]);

  const fetchProducts = useCallback(async () => {
    setLoadingFor('products', true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingFor('products', false);
    }
  }, [setLoadingFor]);

  const fetchCategories = useCallback(async () => {
    setLoadingFor('categories', true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoadingFor('categories', false);
    }
  }, [setLoadingFor]);

  const fetchStock = useCallback(async () => {
    setLoadingFor('stock', true);
    try {
      const res = await fetch('/api/stock');
      if (res.ok) {
        const data = await res.json();
        setLowStockItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch stock:', err);
    } finally {
      setLoadingFor('stock', false);
    }
  }, [setLoadingFor]);

  const fetchOffers = useCallback(async () => {
    setLoadingFor('offers', true);
    try {
      const res = await fetch('/api/offers');
      if (res.ok) {
        const data = await res.json();
        setOffers(data);
      }
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoadingFor('offers', false);
    }
  }, [setLoadingFor]);

  const fetchOrders = useCallback(async () => {
    setLoadingFor('orders', true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoadingFor('orders', false);
    }
  }, [setLoadingFor]);

  const fetchUsers = useCallback(async () => {
    setLoadingFor('users', true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingFor('users', false);
    }
  }, [setLoadingFor]);

  const loadSection = useCallback(
    (section: Section) => {
      setActiveSection(section);
      setSidebarOpen(false);
      switch (section) {
        case 'dashboard':
          fetchDashboard();
          break;
        case 'products':
          fetchProducts();
          fetchCategories();
          break;
        case 'categories':
          fetchCategories();
          break;
        case 'stock':
          fetchStock();
          break;
        case 'offers':
          fetchOffers();
          break;
        case 'orders':
          fetchOrders();
          break;
        case 'users':
          fetchUsers();
          break;
        default:
          break;
      }
    },
    [fetchDashboard, fetchProducts, fetchCategories, fetchStock, fetchOffers, fetchOrders, fetchUsers]
  );

  // Effects
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ============================================================
  // EARLY RETURNS (after all hooks)
  // ============================================================

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-red-600">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You do not have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => signOut({ callbackUrl: '/' })}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
            <CardDescription className="text-center">
              Sign in with your Google account (only the admin email is allowed)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              className="bg-[#8D6E63] hover:bg-[#8D6E63]/90 text-white"
              onClick={() => signIn('google', { callbackUrl: '/admin' })}
            >
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // ADMIN PANEL RENDER (only when authenticated as admin)
  // ============================================================

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="size-4" /> },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="size-4" /> },
    { id: 'stock', label: 'Stock', icon: <AlertTriangle className="size-4" /> },
    { id: 'offers', label: 'Offers', icon: <Tag className="size-4" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="size-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="size-4" /> },
    { id: 'ai-analyzer', label: 'AI Analyzer', icon: <BrainCircuit className="size-4" /> },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg text-foreground">UK MART</h2>
        <p className="text-xs text-muted-foreground">Admin Panel</p>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => loadSection(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left w-full ${
                activeSection === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="size-4" />
          Back to Store
        </Button>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  // ============================================================
  // RENDER: Dashboard
  // ============================================================
  const renderDashboard = () => {
    if (!dashboardData) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      );
    }

    const statCards = [
      {
        title: 'Total Revenue',
        value: formatCurrency(dashboardData.totalRevenue),
        sub: `Today: ${formatCurrency(dashboardData.todayRevenue)}`,
        icon: <IndianRupee className="size-5 text-green-600" />,
      },
      {
        title: 'Total Orders',
        value: dashboardData.totalOrders.toString(),
        sub: `${dashboardData.pendingOrders} pending`,
        icon: <ShoppingCart className="size-5 text-blue-600" />,
      },
      {
        title: 'Total Products',
        value: dashboardData.totalProducts.toString(),
        sub: `${dashboardData.lowStock} low stock`,
        icon: <Package className="size-5 text-purple-600" />,
      },
      {
        title: 'Total Users',
        value: dashboardData.totalUsers.toString(),
        sub: `${dashboardData.activeOffers} active offers`,
        icon: <Users className="size-5 text-orange-600" />,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Overview of your store performance</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading.dashboard}>
            <RefreshCw className={`size-4 mr-1 ${loading.dashboard ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.title} className="border shadow-none">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">{card.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Orders by Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.statusBreakdown}>
                    <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: 'none',
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 flex items-center justify-center">
                {dashboardData.statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ status, percent }) =>
                          `${status} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={true}
                      >
                        {dashboardData.statusBreakdown.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No order data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <CardDescription>Latest 10 orders</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{formatCurrency(order.finalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[order.status] || ''}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDateTime(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {dashboardData.recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No orders yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============================================================
  // RENDER: Products Management
  // ============================================================
  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-sm text-muted-foreground">{products.length} products total</p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setProductDialogOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" />
          Add Product
        </Button>
      </div>

      <Card className="border shadow-none">
        <CardContent className="p-0">
          <div className="max-h-150 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl ?? ''}
                          alt={product.name}
                          className="size-10 rounded object-cover bg-muted"
                        />
                      ) : (
                        <div className="size-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.nameHi}</div>
                    </TableCell>
                    <TableCell>{product.category?.name || '—'}</TableCell>
                    <TableCell>
                      {formatCurrency(product.basePrice)}/{product.baseUnit}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.stock <= 10 ? 'destructive' : 'outline'}>
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            setEditingProduct(product);
                            setProductDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-500 hover:text-red-700"
                          onClick={async () => {
                            if (confirm('Delete this product?')) {
                              await fetch(`/api/products?id=${product.id}`, { method: 'DELETE' });
                              fetchProducts();
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={editingProduct}
        categories={categories}
        onSaved={fetchProducts}
      />
    </div>
  );

  // ============================================================
  // RENDER: Categories Management
  // ============================================================
  const renderCategories = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-sm text-muted-foreground">Manage product categories and subcategories</p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setCategoryDialogOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" />
          Add Category
        </Button>
      </div>

      <Card className="border shadow-none">
        <CardContent className="p-0">
          <div className="max-h-150 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 border-b">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setExpandedCategories((prev) => {
                          const next = new Set(prev);
                          if (next.has(cat.id)) next.delete(cat.id);
                          else next.add(cat.id);
                          return next;
                        });
                      }}
                      className="p-1 rounded hover:bg-muted"
                    >
                      {cat.children.length > 0 ? (
                        expandedCategories.has(cat.id) ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )
                      ) : (
                        <span className="size-4" />
                      )}
                    </button>
                    <div>
                      <span className="font-medium">{cat.name}</span>
                      {cat.nameHi && (
                        <span className="text-xs text-muted-foreground ml-2">{cat.nameHi}</span>
                      )}
                    </div>
                    {cat.image && (
                      <img
                        src={cat.image ?? ''}
                        alt=""
                        className="size-6 rounded object-cover"
                      />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {cat.children.length} sub
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-red-500"
                      onClick={async () => {
                        if (confirm(`Delete "${cat.name}" and all its subcategories & products?`)) {
                          try {
                            const res = await fetch(`/api/categories?id=${cat.id}`, { method: 'DELETE' });
                            if (res.ok) {
                              toast.success(`"${cat.name}" deleted successfully`);
                              fetchCategories();
                            } else {
                              const data = await res.json();
                              toast.error(data.error || 'Failed to delete category');
                            }
                          } catch {
                            toast.error('Network error while deleting category');
                          }
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {expandedCategories.has(cat.id) && cat.children.length > 0 && (
                  <div className="bg-muted/20">
                    {cat.children.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between px-4 py-2.5 pl-12 hover:bg-muted/50 border-b border-b-muted"
                      >
                        <div>
                          <span className="text-sm">{sub.name}</span>
                          {sub.nameHi && (
                            <span className="text-xs text-muted-foreground ml-2">{sub.nameHi}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => {
                              setEditingCategory(sub);
                              setCategoryDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-red-500"
                            onClick={async () => {
                              if (confirm(`Delete subcategory "${sub.name}" and its products?`)) {
                                try {
                                  const res = await fetch(`/api/categories?id=${sub.id}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    toast.success(`"${sub.name}" deleted successfully`);
                                    fetchCategories();
                                  } else {
                                    const data = await res.json();
                                    toast.error(data.error || 'Failed to delete subcategory');
                                  }
                                } catch {
                                  toast.error('Network error while deleting subcategory');
                                }
                              }
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2 pl-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => {
                          setEditingCategory(null);
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <Plus className="size-3 mr-1" />
                        Add Subcategory
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No categories found</div>
            )}
          </div>
        </CardContent>
      </Card>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        categories={categories}
        onSaved={fetchCategories}
      />
    </div>
  );

  // ============================================================
  // RENDER: Stock Management
  // ============================================================
  const renderStock = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Stock Management</h2>
          <p className="text-sm text-muted-foreground">
            {lowStockItems.length} products with stock ≤ 50
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStock} disabled={loading.stock}>
          <RefreshCw className={`size-4 mr-1 ${loading.stock ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border shadow-none">
        <CardContent className="p-0">
          <div className="max-h-150 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Unit Type</TableHead>
                  <TableHead className="text-right">Update Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={item.stock <= 5 ? 'destructive' : 'outline'}>
                        {item.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.unitType}</TableCell>
                    <TableCell className="text-right">
                      {editingStockId === item.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            value={editStockValue}
                            onChange={(e) => setEditStockValue(Number(e.target.value))}
                            className="w-24 h-8 text-sm"
                            min={0}
                          />
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={async () => {
                              await fetch('/api/products', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: item.id, stock: editStockValue }),
                              });
                              setEditingStockId(null);
                              fetchStock();
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => setEditingStockId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setEditingStockId(item.id);
                            setEditStockValue(item.stock);
                          }}
                        >
                          <Pencil className="size-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {lowStockItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      All products have sufficient stock
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================
  // RENDER: Offers Management
  // ============================================================
  const renderOffers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Offers</h2>
          <p className="text-sm text-muted-foreground">{offers.length} offers total</p>
        </div>
        <Button
          onClick={() => {
            setEditingOffer(null);
            setOfferDialogOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" />
          Add Offer
        </Button>
      </div>

      <Card className="border shadow-none">
        <CardContent className="p-0">
          <div className="max-h-150 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Max Discount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div className="font-medium">{offer.name}</div>
                      {offer.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {offer.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {offer.discountType === 'PERCENTAGE'
                          ? `${offer.discountValue}%`
                          : formatCurrency(offer.discountValue)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(offer.minOrderAmount)}</TableCell>
                    <TableCell>
                      {offer.maxDiscount ? formatCurrency(offer.maxDiscount) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(offer.startDate)} — {formatDate(offer.endDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={offer.isActive ? 'default' : 'secondary'}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            setEditingOffer(offer);
                            setOfferDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-500"
                          onClick={async () => {
                            if (confirm('Delete this offer?')) {
                              await fetch(`/api/offers?id=${offer.id}`, { method: 'DELETE' });
                              fetchOffers();
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {offers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No offers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <OfferDialog
        open={offerDialogOpen}
        onOpenChange={setOfferDialogOpen}
        offer={editingOffer}
        onSaved={fetchOffers}
      />
    </div>
  );

  // ============================================================
  // RENDER: Orders Management
  // ============================================================
  const renderOrders = () => {
    if (!Array.isArray(orders)) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-2xl font-bold">Orders</h2>
              <p className="text-sm text-muted-foreground">No orders data available</p>
            </div>
          </div>
          <Card className="border shadow-none">
            <CardContent className="p-8 text-center text-muted-foreground">
              Unable to load orders. Please refresh.
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold">Orders</h2>
            <p className="text-sm text-muted-foreground">{orders.length} orders total</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading.orders}>
            <RefreshCw className={`size-4 mr-1 ${loading.orders ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card className="border shadow-none">
          <CardContent className="p-0">
            <div className="max-h-150 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                      </TableCell>
                      <TableCell>
                        <div>{formatCurrency(order.finalAmount)}</div>
                        {order.discountAmount > 0 && (
                          <div className="text-xs text-green-600">
                            -{formatCurrency(order.discountAmount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {order.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={async (value) => {
                            await fetch('/api/orders', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: order.id, status: value }),
                            });
                            fetchOrders();
                          }}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(
                              (s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {s}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setSelectedOrder(order);
                            setOrderDetailDialogOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={orderDetailDialogOpen} onOpenChange={setOrderDetailDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                {selectedOrder && (
                  <>
                    Order ID: {selectedOrder.id} &middot;{' '}
                    {formatDateTime(selectedOrder.createdAt)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Customer</Label>
                    <p className="font-medium">{selectedOrder.customerName}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Delivery Address</Label>
                    <p className="text-sm">{selectedOrder.deliveryAddress}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment</Label>
                    <p className="text-sm">
                      {selectedOrder.paymentMethod} &middot; {selectedOrder.paymentStatus}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <p className="font-medium">{formatCurrency(selectedOrder.finalAmount)}</p>
                    {selectedOrder.discountAmount > 0 && (
                      <p className="text-sm text-green-600">
                        Saved: {formatCurrency(selectedOrder.discountAmount)}
                      </p>
                    )}
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.productName}</TableCell>
                          <TableCell className="text-right text-sm">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(item.pricePerUnit)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(item.totalPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ============================================================
  // RENDER: Users Management
  // ============================================================
  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-sm text-muted-foreground">{users.length} registered users</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading.users}>
          <RefreshCw className={`size-4 mr-1 ${loading.users ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border shadow-none">
        <CardContent className="p-0">
          <div className="max-h-150 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.avatar ? (
                          <img
                            src={user.avatar ?? ''}
                            alt={user.name}
                            className="size-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell className="text-sm">{user.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'outline'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user._count.orders}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================
  // RENDER: AI Analyzer
  // ============================================================
  const runAIAnalysis = async (type: 'sales_trend' | 'inventory' | 'customer_behavior') => {
    setAiLoading(true);
    setAiResult(null);
    try {
      let dataToSend: unknown;
      if (type === 'sales_trend') {
        dataToSend = {
          orders: orders.map((o) => ({
            id: o.id,
            totalAmount: o.totalAmount,
            finalAmount: o.finalAmount,
            status: o.status,
            createdAt: o.createdAt,
            items: o.items,
          })),
          revenue: dashboardData?.totalRevenue || 0,
          todayRevenue: dashboardData?.todayRevenue || 0,
        };
      } else if (type === 'inventory') {
        dataToSend = {
          products: products.map((p) => ({
            name: p.name,
            category: p.category?.name,
            stock: p.stock,
            unitType: p.unitType,
          })),
          lowStockItems: lowStockItems.length,
        };
      } else {
        dataToSend = {
          users: users.map((u) => ({
            name: u.name,
            orderCount: u._count.orders,
            joinedAt: u.createdAt,
          })),
          orders: orders.map((o) => ({
            customerName: o.customerName,
            totalAmount: o.finalAmount,
            items: o.items,
            createdAt: o.createdAt,
          })),
        };
      }

      const res = await fetch('/api/ai-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: dataToSend }),
      });

      if (res.ok) {
        const analysis = await res.json();
        setAiResult(analysis);
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setAiResult({
        summary: 'Failed to complete analysis.',
        insights: [{ title: 'Error', description: 'Could not reach AI service.' }],
        recommendations: ['Check your connection', 'Try again later'],
        metrics: {},
      });
    } finally {
      setAiLoading(false);
    }
  };

  const renderAIAnalyzer = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Analyzer</h2>
        <p className="text-sm text-muted-foreground">Get AI-powered insights about your business</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="border shadow-none cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => runAIAnalysis('sales_trend')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <TrendingUp className="size-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Analyze Sales</p>
              <p className="text-xs text-muted-foreground">Trends, peak times, recommendations</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="border shadow-none cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => runAIAnalysis('inventory')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50">
              <Package className="size-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Analyze Inventory</p>
              <p className="text-xs text-muted-foreground">Stock levels, restocking, optimization</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="border shadow-none cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => runAIAnalysis('customer_behavior')}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Users className="size-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Analyze Customers</p>
              <p className="text-xs text-muted-foreground">Behavior, preferences, retention</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {aiLoading && (
        <Card className="border shadow-none">
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing data with AI...</p>
          </CardContent>
        </Card>
      )}

      {aiResult && !aiLoading && (
        <Card className="border shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BrainCircuit className="size-5 text-primary" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Summary</Label>
              <p className="text-sm leading-relaxed">{aiResult.summary}</p>
            </div>

            <Separator />

            {aiResult.insights?.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Key Insights</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiResult.insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border p-3 bg-muted/30"
                    >
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {aiResult.recommendations?.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Recommendations</Label>
                <ul className="space-y-1.5">
                  {aiResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold mt-px">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiResult.metrics && Object.keys(aiResult.metrics).length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Metrics</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(aiResult.metrics).map(([key, value]) => (
                      <div key={key} className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">{key}</p>
                        <p className="font-bold text-sm mt-0.5">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ============================================================
  // Section Renderer
  // ============================================================
  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'products':
        return renderProducts();
      case 'categories':
        return renderCategories();
      case 'stock':
        return renderStock();
      case 'offers':
        return renderOffers();
      case 'orders':
        return renderOrders();
      case 'users':
        return renderUsers();
      case 'ai-analyzer':
        return renderAIAnalyzer();
      default:
        return null;
    }
  };

  // ============================================================
  // Main Layout
  // ============================================================
  return (
    <div className="min-h-screen flex bg-white">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-white">
        {sidebarContent}
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      <main className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-40 bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">UK MART Admin</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {navItems.find((n) => n.id === activeSection)?.label || 'Dashboard'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-1"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="size-4" />
            Back to Store
          </Button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">{renderSection()}</div>
      </main>
    </div>
  );
}

// ============================================================
// Sub-Components: ProductDialog, CategoryDialog, OfferDialog
// ============================================================

// ─── Product Dialog ───────────────────────────────────────
function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    nameHi: '',
    nameBn: '',
    description: '',
    descriptionHi: '',
    descriptionBn: '',
    categoryId: '',
    subcategoryId: '',
    basePrice: '',
    baseUnit: '1kg',
    availableUnits: '100g,250g,500g,1kg,2kg,5kg',
    stock: '',
    unitType: 'weight',
    imageUrl: '',
    isActive: true,
  });

  const isEditing = !!product;

  // Get child subcategories for selected parent category
  const parentCat = categories.find((c) => c.id === form.categoryId);
  const childSubcategories = parentCat?.children || [];

  useEffect(() => {
    if (product) {
      let availUnits = product.availableUnits;
      if (availUnits && availUnits.startsWith('[')) {
        try {
          const parsed = JSON.parse(availUnits);
          availUnits = Array.isArray(parsed) ? parsed.join(',') : availUnits;
        } catch {
          // keep as-is
        }
      }
      setForm({
        name: product.name || '',
        nameHi: product.nameHi || '',
        nameBn: product.nameBn || '',
        description: product.description || '',
        descriptionHi: product.descriptionHi || '',
        descriptionBn: product.descriptionBn || '',
        categoryId: product.categoryId || '',
        subcategoryId: product.subcategoryId || '',
        basePrice: String(product.basePrice || ''),
        baseUnit: product.baseUnit || '1kg',
        availableUnits: availUnits || '100g,250g,500g,1kg,2kg,5kg',
        stock: String(product.stock || ''),
        unitType: product.unitType || 'weight',
        imageUrl: product.imageUrl || '',
        isActive: product.isActive !== false,
      });
    } else {
      setForm({
        name: '',
        nameHi: '',
        nameBn: '',
        description: '',
        descriptionHi: '',
        descriptionBn: '',
        categoryId: '',
        subcategoryId: '',
        basePrice: '',
        baseUnit: '1kg',
        availableUnits: '100g,250g,500g,1kg,2kg,5kg',
        stock: '',
        unitType: 'weight',
        imageUrl: '',
        isActive: true,
      });
    }
  }, [product, open]);

  const handleSave = async () => {
    if (!form.name || !form.categoryId || !form.basePrice) {
      alert('Name, category, and price are required.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: product!.id, ...form }),
        });
      } else {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error('Save product error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update product information' : 'Fill in product details to create a new product'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Product name in English"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name (Hindi)</Label>
            <Input
              value={form.nameHi}
              onChange={(e) => setForm((f) => ({ ...f, nameHi: e.target.value }))}
              placeholder="हिंदी में नाम"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name (Bengali)</Label>
            <Input
              value={form.nameBn}
              onChange={(e) => setForm((f) => ({ ...f, nameBn: e.target.value }))}
              placeholder="বাংলায় নাম"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, categoryId: v, subcategoryId: '' }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subcategory</Label>
            <Select
              value={form.subcategoryId}
              onValueChange={(v) => setForm((f) => ({ ...f, subcategoryId: v }))}
              disabled={!form.categoryId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select subcategory" />
              </SelectTrigger>
              <SelectContent>
                {childSubcategories.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Base Price (₹) *</Label>
            <Input
              type="number"
              value={form.basePrice}
              onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
              placeholder="e.g., 80"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Base Unit</Label>
            <Input
              value={form.baseUnit}
              onChange={(e) => setForm((f) => ({ ...f, baseUnit: e.target.value }))}
              placeholder="e.g., 1kg"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Stock</Label>
            <Input
              type="number"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              placeholder="e.g., 100"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unit Type</Label>
            <Select
              value={form.unitType}
              onValueChange={(v) => setForm((f) => ({ ...f, unitType: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Weight</SelectItem>
                <SelectItem value="piece">Piece</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Available Units</Label>
            <Input
              value={form.availableUnits}
              onChange={(e) => setForm((f) => ({ ...f, availableUnits: e.target.value }))}
              placeholder="100g,250g,500g,1kg,2kg"
            />
            <p className="text-xs text-muted-foreground">Comma-separated list</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Image URL</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Product description in English"
              rows={2}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description (Hindi)</Label>
            <Textarea
              value={form.descriptionHi}
              onChange={(e) => setForm((f) => ({ ...f, descriptionHi: e.target.value }))}
              placeholder="हिंदी में विवरण"
              rows={2}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description (Bengali)</Label>
            <Textarea
              value={form.descriptionBn}
              onChange={(e) => setForm((f) => ({ ...f, descriptionBn: e.target.value }))}
              placeholder="বাংলায় বিবরণ"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
            />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Category Dialog ──────────────────────────────────────
function CategoryDialog({
  open,
  onOpenChange,
  category,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  categories: Category[];
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    nameHi: '',
    nameBn: '',
    image: '',
    parentId: 'null',
    sortOrder: '0',
    isActive: true,
  });

  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        nameHi: category.nameHi || '',
        nameBn: category.nameBn || '',
        image: category.image || '',
        parentId: category.parentId || 'null',
        sortOrder: String(category.sortOrder || 0),
        isActive: category.isActive !== false,
      });
    } else {
      setForm({
        name: '',
        nameHi: '',
        nameBn: '',
        image: '',
        parentId: 'null',
        sortOrder: '0',
        isActive: true,
      });
    }
  }, [category, open]);

  const handleSave = async () => {
    if (!form.name) {
      alert('Category name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        parentId: form.parentId === 'null' ? null : form.parentId,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };

      if (isEditing) {
        await fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: category!.id, ...payload }),
        });
      } else {
        await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error('Save category error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? category?.parentId
                ? 'Edit Subcategory'
                : 'Edit Category'
              : form.parentId !== 'null'
                ? 'Add Subcategory'
                : 'Add Category'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update category information' : 'Create a new category or subcategory'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!isEditing && (
            <div className="space-y-1.5">
              <Label>Parent Category</Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">None (top-level)</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a parent to create a subcategory
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Category name in English"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name (Hindi)</Label>
            <Input
              value={form.nameHi}
              onChange={(e) => setForm((f) => ({ ...f, nameHi: e.target.value }))}
              placeholder="हिंदी में नाम"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Name (Bengali)</Label>
            <Input
              value={form.nameBn}
              onChange={(e) => setForm((f) => ({ ...f, nameBn: e.target.value }))}
              placeholder="বাংলায় নাম"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://example.com/category.jpg"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
            />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} {form.parentId !== 'null' ? 'Subcategory' : 'Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Offer Dialog ─────────────────────────────────────────
function OfferDialog({
  open,
  onOpenChange,
  offer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    isActive: true,
    startDate: '',
    endDate: '',
  });

  const isEditing = !!offer;

  useEffect(() => {
    if (offer) {
      setForm({
        name: offer.name || '',
        description: offer.description || '',
        discountType: offer.discountType || 'PERCENTAGE',
        discountValue: String(offer.discountValue || ''),
        minOrderAmount: String(offer.minOrderAmount || ''),
        maxDiscount: offer.maxDiscount ? String(offer.maxDiscount) : '',
        isActive: offer.isActive !== false,
        startDate: offer.startDate ? offer.startDate.split('T')[0] : '',
        endDate: offer.endDate ? offer.endDate.split('T')[0] : '',
      });
    } else {
      setForm({
        name: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        minOrderAmount: '',
        maxDiscount: '',
        isActive: true,
        startDate: '',
        endDate: '',
      });
    }
  }, [offer, open]);

  const handleSave = async () => {
    if (!form.name || !form.discountValue) {
      alert('Offer name and discount value are required.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await fetch('/api/offers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: offer!.id, ...form }),
        });
      } else {
        await fetch('/api/offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error('Save offer error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Offer' : 'Add Offer'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update offer details' : 'Create a new promotional offer'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Offer Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Summer Sale"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Offer description"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Discount Type</Label>
              <Select
                value={form.discountType}
                onValueChange={(v) => setForm((f) => ({ ...f, discountType: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Discount Value *</Label>
              <Input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                placeholder={form.discountType === 'PERCENTAGE' ? 'e.g., 10' : 'e.g., 100'}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Min Order Amount (₹)</Label>
              <Input
                type="number"
                value={form.minOrderAmount}
                onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                placeholder="e.g., 2500"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max Discount (₹)</Label>
              <Input
                type="number"
                value={form.maxDiscount}
                onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                placeholder="e.g., 500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
            />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}