// SellerDashboard.tsx - အပြည့်အစုံ (PaymentSubmission ပေါင်းထည့်ပြီး)
'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, PlusCircle, Search, ClipboardList, BarChart3, Eye, Heart, ShoppingBag, X } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import ProductAnalyticsModal from '@/components/ProductAnalyticsModal';
import ProductDetailModal from '@/components/ProductDetailModal';
import PaymentSubmission from '@/components/PaymentSubmission'; // 👈 Telegram စလစ်တင်ရန် Component ထည့်သွင်းခြင်း

// ✅ Product Interface
interface Product {
  id: string;
  title?: string;
  price?: string;
  image?: string;
  category?: string;
  brand?: string;
  createdAt?: any;
  sellerId?: string;
  sellerName?: string;
  description?: string;
  discount?: string;
  location?: string;
  cta?: string;
  stock?: number;
  views?: number;
  wishlistCount?: number;
  totalSales?: number;
  totalRevenue?: number;
  averageRating?: number;
  totalReviews?: number;
}

interface SaleOrder {
  totalAmount?: number;
  status?: string;
  createdAt?: any;
}

export default function SellerDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSalesCalendarOpen, setIsSalesCalendarOpen] = useState(false);
  const [selectedSalesMonth, setSelectedSalesMonth] = useState(() => new Date().getMonth());
  const [selectedSalesYear, setSelectedSalesYear] = useState(() => new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);

  // ✅ Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // ✅ Low Stock Modal State
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  const [analyticsModal, setAnalyticsModal] = useState<{
    isOpen: boolean;
    type: 'views' | 'wishlist' | 'sales' | null;
  }>({ isOpen: false, type: null });

  const getCreatedAtTime = (createdAt: any): number => {
    if (!createdAt) return 0;
    
    if (typeof createdAt === 'object' && createdAt.toDate && typeof createdAt.toDate === 'function') {
      return createdAt.toDate().getTime();
    }
    
    if (typeof createdAt === 'string') {
      const parsed = new Date(createdAt);
      return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    }
    
    if (typeof createdAt === 'number') {
      return createdAt;
    }
    
    return 0;
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setUser(user);
          const userRef = doc(db, 'users', user.uid);
          const snapshot = await getDoc(userRef);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setUserData(data);
            if (!['seller', 'VENDOR'].includes(data.role)) {
              router.push('/');
            }
          } else {
            router.push('/profile');
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError('Failed to authenticate');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    setError(null);
    
    const q = query(
      collection(db, 'products'),
      where('sellerId', '==', user.uid)
    );

    const unsubscribeProducts = onSnapshot(q, 
      (snapshot) => {
        try {
          const productList: Product[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<Product, 'id'>
          }));
          
          const sortedProducts = productList.sort((a, b) => {
            const timeA = getCreatedAtTime(a.createdAt);
            const timeB = getCreatedAtTime(b.createdAt);
            return timeB - timeA;
          });
          
          setProducts(sortedProducts);
          setFilteredProducts(sortedProducts);
          console.log('✅ Products loaded:', sortedProducts.length);
        } catch (err) {
          console.error('Error processing products:', err);
          setError('Failed to load products');
        }
      },
      (error) => {
        console.error('❌ Firestore error:', error);
        setError(`Failed to load products: ${error.message}`);
      }
    );

    return () => unsubscribeProducts();
  }, [user]);

  // ✅ Product Modal ကိုဖွင့်မယ်
  const handleOpenProductModal = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setIsProductModalOpen(true);
    }
  };

  useEffect(() => {
    if (!user) return;

    const salesQuery = query(
      collection(db, 'orders'),
      where('sellerId', '==', user.uid)
    );

    return onSnapshot(salesQuery, (snapshot) => {
      const confirmedSales = snapshot.docs
        .map((saleSnapshot) => saleSnapshot.data() as SaleOrder)
        .filter((sale) => sale.status === 'CONFIRMED' || sale.status === 'DELIVERED');
      setSales(confirmedSales);
    }, (salesError) => {
      console.error('Failed to load dashboard sales:', salesError);
    });
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // ✅ Low Stock ရှိတဲ့ ပစ္စည်းတွေ
  const lowStockProducts = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10);
  const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--foreground)',
        gap: '16px'
      }}>
        <div>{t('common.loading')}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {t('common.pleaseWait')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--foreground)',
        gap: '16px',
        padding: '20px'
      }}>
        <div style={{ color: 'var(--error)', fontSize: '20px' }}>⚠️ {t('common.error')}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--accent)',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!user || !userData || !['seller', 'VENDOR'].includes(userData.role)) {
    return null;
  }

  // Analytics Data Functions
  const getAnalyticsData = (type: 'views' | 'wishlist' | 'sales') => {
    return products
      .map(p => ({
        id: p.id,
        title: p.title || 'Untitled',
        value: type === 'views' ? (p.views || 0) :
              type === 'wishlist' ? (p.wishlistCount || 0) :
              (p.totalSales || 0),
        icon: type === 'views' ? '' :
              type === 'wishlist' ? '' :
              '',
      }))
      .sort((a, b) => b.value - a.value);
  };

  const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10).length;
  const outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;

  const monthlySales = sales.reduce<Record<string, { label: string; total: number }>>((months, sale) => {
    const saleTime = getCreatedAtTime(sale.createdAt);
    if (!saleTime) return months;
    const date = new Date(saleTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    months[monthKey] = {
      label: monthLabel,
      total: (months[monthKey]?.total || 0) + Number(sale.totalAmount || 0),
    };
    return months;
  }, {});
  const currentYear = new Date().getFullYear();
  const shopStartDate = new Date(getCreatedAtTime(userData.createdAt));
  const shopStartYear = Number.isNaN(shopStartDate.getTime()) ? currentYear : shopStartDate.getFullYear();
  const lastSelectableYear = currentYear + 10;
  const availableYears = Array.from({ length: Math.max(1, lastSelectableYear - shopStartYear + 1) }, (_, index) => lastSelectableYear - index);
  const monthNames = Array.from({ length: 12 }, (_, month) => new Date(selectedSalesYear, month, 1).toLocaleDateString(undefined, { month: 'long' }));
  const selectedMonthKey = `${selectedSalesYear}-${String(selectedSalesMonth + 1).padStart(2, '0')}`;
  const selectedMonthSummary = monthlySales[selectedMonthKey];
  const selectedMonthOrders = sales.filter((sale) => {
  const saleDate = new Date(getCreatedAtTime(sale.createdAt));
      return saleDate.getFullYear() === selectedSalesYear && saleDate.getMonth() === selectedSalesMonth;
    }).length;  

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{ color: 'var(--foreground)', fontSize: '24px', fontWeight: '700', margin: 0 }}>
            {t('dashboard.title')}
          </h1>
        </div>

        {/* Welcome */}
        <div style={{
          backgroundColor: 'var(--card-background)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h2 style={{ color: 'var(--foreground)', fontSize: '18px', margin: 0 }}>
            {t('Welcome back')}, <span style={{ color: '#FFD700' }}>{userData.username || 'Seller'}</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {t('dashboard.youHave')} <strong style={{ color: 'var(--accent)' }}>{products.length}</strong> {t('dashboard.productsInShop')}
          </p>
          
          {/* ✅ Stock Notification - Clickable Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
            {outOfStockCount > 0 && (
              <button
                onClick={() => setIsLowStockModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#451a1e',
                  border: '1px solid #7f1d1d',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#7f1d1d';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#451a1e';
                }}
              >
                ⚠️ <strong>{outOfStockCount}</strong> Out of Stock
              </button>
            )}
            
            {lowStockCount > 0 && (
              <button
                onClick={() => setIsLowStockModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#451a0e',
                  border: '1px solid #92400e',
                  borderRadius: '8px',
                  color: '#fbbf24',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#78350f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#451a0e';
                }}
              >
                ⚠️ <strong>{lowStockCount}</strong> Low Stock
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <style>{`
            @media (min-width: 640px) {
              .stats-grid {
                grid-template-columns: repeat(4, 1fr) !important;
                gap: 16px !important;
              }
            }
          `}</style>

          {/* Total Products */}
          <div style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>📦 {t('dashboard.totalProducts')}</div>
            <div style={{ color: 'var(--foreground)', fontSize: '24px', fontWeight: '700' }}>{products.length}</div>
          </div>

          {/* Total Views - Clickable */}
          <div
            onClick={() => setAnalyticsModal({ isOpen: true, type: 'views' })}
            style={{
              backgroundColor: 'var(--card-background)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = 'var(--card-border)';
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}> 👁️ {t('Total Views')}</div>
            <div style={{ color: 'var(--foreground)', fontSize: '24px', fontWeight: '700' }}>
              {products.reduce((sum, p) => sum + (p.views || 0), 0).toLocaleString()}
            </div>
          </div>

          {/* Total Wishlist - Clickable */}
          <div
            onClick={() => setAnalyticsModal({ isOpen: true, type: 'wishlist' })}
            style={{
              backgroundColor: 'var(--card-background)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = 'var(--card-border)';
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}> ❤️ {t('Total Wishlist')}</div>
            <div style={{ color: 'var(--foreground)', fontSize: '24px', fontWeight: '700' }}>
              {products.reduce((sum, p) => sum + (p.wishlistCount || 0), 0).toLocaleString()}
            </div>
          </div>

          {/* Total Sales - Clickable */}
          <div
            onClick={() => setAnalyticsModal({ isOpen: true, type: 'sales' })}
            style={{
              backgroundColor: 'var(--card-background)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = 'var(--card-border)';
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}> 🛒 {t('Total Sales')}</div>
            <div style={{ color: 'var(--foreground)', fontSize: '24px', fontWeight: '700' }}>
              {products.reduce((sum, p) => sum + (p.totalSales || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>    

        {/* Monthly Sales Calendar */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isSalesCalendarOpen}
          aria-label="Open monthly sales calendar"
          onClick={() => setIsSalesCalendarOpen((isOpen) => !isOpen)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') setIsSalesCalendarOpen((isOpen) => !isOpen);
          }}
          style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', marginBottom: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <BarChart3 size={20} color="#22c55e" />
            <strong style={{ color: 'var(--foreground)', fontSize: '14px' }}>{t('dashboard.monthlySalesSummary')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
            <span>{monthNames[selectedSalesMonth]}</span>
            <strong style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>{(selectedMonthSummary?.total || 0).toLocaleString()} MMK</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '5px' }}>{selectedMonthOrders} completed order{selectedMonthOrders === 1 ? '' : 's'}</div>
          {isSalesCalendarOpen && (
            <div onClick={(event) => event.stopPropagation()} style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--card-border)' }}>
              <div style={{ color: 'var(--foreground)', fontSize: '20px', fontWeight: 700, textAlign: 'center', marginBottom: '10px' }}>{selectedSalesYear}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textAlign: 'center', marginBottom: '6px' }}>{t('dashboard.selectYear')}</div>
              <div style={{ display: 'grid', gap: '6px', maxHeight: '96px', overflowY: 'auto', overscrollBehavior: 'contain', padding: '2px 4px 8px 2px', marginBottom: '12px' }}>
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedSalesYear(year)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: year === selectedSalesYear ? '1px solid var(--accent)' : '1px solid var(--card-border)', backgroundColor: year === selectedSalesYear ? 'var(--hover-background)' : 'var(--card-background)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '12px', textAlign: 'left' }}
                  >
                    {year}
                  </button>
                ))}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '7px' }}>{t('dashboard.selectMonth')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                {monthNames.map((month, index) => (
                  <button
                    key={month}
                    onClick={() => setSelectedSalesMonth(index)}
                    style={{ width: '100%', minWidth: 0, padding: '9px 4px', borderRadius: '6px', border: index === selectedSalesMonth ? '1px solid var(--accent)' : '1px solid var(--card-border)', backgroundColor: index === selectedSalesMonth ? 'var(--hover-background)' : 'var(--card-background)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '11px', textAlign: 'center' }}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <Link
            href="/seller/products/new"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: 'var(--accent)',
              color: '#000000',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <PlusCircle size={18} />
            {t('dashboard.addNewProduct')}
          </Link>
          
          <Link
            href="/seller/products"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: 'var(--card-background)',
              border: '1px solid var(--card-border)',
              color: 'var(--foreground)',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'border-color 0.2s, background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--hover-background)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)';
              e.currentTarget.style.backgroundColor = 'var(--card-background)';
            }}
          >
            <Package size={18} />
            {t('dashboard.manageProducts')}
          </Link>

          <Link
            href="/seller/orders"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: 'var(--card-background)',
              border: '1px solid var(--card-border)',
              color: 'var(--foreground)',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'border-color 0.2s, background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--hover-background)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)';
              e.currentTarget.style.backgroundColor = 'var(--card-background)';
            }}
          >
            <ClipboardList size={18} />
            {t('dashboard.orderHistory')}
          </Link>

          <Link
            href="/seller/sales-report"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: 'var(--card-background)',
              border: '1px solid var(--card-border)',
              color: 'var(--foreground)',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'border-color 0.2s, background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--hover-background)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)';
              e.currentTarget.style.backgroundColor = 'var(--card-background)';
            }}
          >
            <BarChart3 size={18} />
            {t('dashboard.salesReport')}
          </Link>
        </div>

        {/* ✅ Subscription & Payment Submission Component (မူလအတိုင်း ထည့်သွင်းထားသည်) */}
        <div style={{ marginBottom: '24px' }}>
          <PaymentSubmission 
            userData={userData} 
            userId={user?.uid || ''} 
          />
        </div>

        {/* Products Section with Search Bar */}
        <div style={{
          backgroundColor: 'var(--card-background)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: 'var(--foreground)', fontSize: '16px', fontWeight: '600', margin: 0 }}>
              {t('dashboard.recentProducts')}
            </h3>
            <Link 
              href="/seller/products"
              style={{ color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', textDecoration: 'none' }}
            >
              {t('dashboard.viewAll')} →
            </Link>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('dashboard.searchPlaceholder')}
              style={{
                width: '100%',
                padding: '10px 14px',
                paddingLeft: '40px',
                backgroundColor: 'var(--input-background)',
                border: '1px solid var(--input-border)',
                borderRadius: '10px',
                color: 'var(--foreground)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--input-border)';
              }}
            />
            <Search 
              size={18} 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {searchTerm && (
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '12px',
              marginBottom: '12px'
            }}>
              {t('dashboard.found')} {filteredProducts.length} {filteredProducts.length === 1 ? t('dashboard.product') : t('dashboard.products')}
            </div>
          )}
          
          {filteredProducts.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
              {searchTerm ? t('dashboard.noMatch') : t('dashboard.noProducts')}
            </div>
          ) : (
            <div className="products-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <style>{`
                @media (min-width: 640px) {
                  .products-grid {
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 16px !important;
                  }
                }
                @media (min-width: 1024px) {
                  .products-grid {
                    grid-template-columns: repeat(4, 1fr) !important;
                    gap: 20px !important;
                  }
                }
              `}</style>
              
              {filteredProducts.slice(0, 4).map((product) => {
                const stock = product.stock || 0;
                const isLowStock = stock > 0 && stock < 10;
                const isOutOfStock = stock === 0;
                
                return (
                  <div
                    key={product.id}
                    onClick={() => handleOpenProductModal(product.id)}
                    style={{
                      backgroundColor: 'var(--card-background)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: isOutOfStock ? '2px solid var(--error)' : 
                              isLowStock ? '2px solid #f59e0b' : 
                              '1px solid var(--card-border)',
                      transition: 'transform 0.2s, border-color 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'scale(1.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (isOutOfStock) {
                        e.currentTarget.style.borderColor = 'var(--error)';
                      } else if (isLowStock) {
                        e.currentTarget.style.borderColor = '#f59e0b';
                      } else {
                        e.currentTarget.style.borderColor = 'var(--card-border)';
                      }
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <img
                      src={product.image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop'}
                      alt={product.title || 'Product'}
                      style={{
                        width: '100%',
                        height: '140px',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop';
                      }}
                    />
                    <div style={{ padding: '10px 12px 12px 12px' }}>
                      <h4 style={{ 
                        color: 'var(--foreground)', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        margin: '0 0 4px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {product.title || 'Untitled'}
                      </h4>
                      
                      <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: '700', margin: '0 0 2px 0' }}>
                        {product.price || 'N/A'}
                      </p>
                      
                      <div style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        fontSize: '11px', 
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                        flexWrap: 'wrap'
                      }}>
                        <span>👁️ {product.views || 0}</span>
                        <span>❤️ {product.wishlistCount || 0}</span>
                        <span>🛒 {product.totalSales || 0}</span>
                        <span>⭐ {(product.averageRating || 0).toFixed(1)}/5</span>
                      </div>
                      
                      <p style={{ 
                        color: isOutOfStock ? 'var(--error)' : 
                               isLowStock ? '#f59e0b' : 
                               'var(--success)', 
                        fontSize: '11px', 
                        fontWeight: '600', 
                        margin: '4px 0 2px 0' 
                      }}>
                        📦 {isOutOfStock ? t('dashboard.outOfStock') : 
                            isLowStock ? `⚠️ ${stock} ${t('dashboard.left')}` : 
                            `${stock} ${t('dashboard.inStock')}`}
                      </p>
                      
                      <p style={{ color: 'var(--text-muted)', fontSize: '10px', margin: '0' }}>
                        {product.category || 'Uncategorized'} • {product.brand || 'No Brand'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ✅ Low Stock Modal */}
        {isLowStockModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              animation: 'fadeIn 0.3s ease',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsLowStockModalOpen(false);
              }
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--card-background)',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '560px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
                border: '1px solid var(--card-border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                borderBottom: '1px solid var(--card-border)',
                paddingBottom: '12px'
              }}>
                <h3 style={{
                  color: 'var(--foreground)',
                  fontSize: '18px',
                  fontWeight: '700',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ⚠️ Stock Alert
                </h3>
                <button
                  onClick={() => setIsLowStockModalOpen(false)}
                  style={{
                    backgroundColor: 'var(--hover-background)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--foreground)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--input-background)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Summary */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                {outOfStockProducts.length > 0 && (
                  <span style={{
                    padding: '4px 12px',
                    backgroundColor: '#451a1e',
                    borderRadius: '6px',
                    color: '#fca5a5',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    🚫 {outOfStockProducts.length} Out of Stock
                  </span>
                )}
                {lowStockProducts.length > 0 && (
                  <span style={{
                    padding: '4px 12px',
                    backgroundColor: '#451a0e',
                    borderRadius: '6px',
                    color: '#fbbf24',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    ⚠️ {lowStockProducts.length} Low Stock
                  </span>
                )}
              </div>

              {/* Low Stock List */}
              {lowStockProducts.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    margin: '0 0 8px 0'
                  }}>
                    🟡 Low Stock (1 - 9)
                  </h4>
                  <div style={{
                    backgroundColor: 'var(--background)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--card-border)'
                  }}>
                    {lowStockProducts.map((product) => (
                      <div
                        key={product.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 14px',
                          borderBottom: '1px solid var(--card-border)',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => {
                          setIsLowStockModalOpen(false);
                          handleOpenProductModal(product.id);
                        }}
                      >
                        <span style={{
                          color: 'var(--foreground)',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}>
                          {product.title || 'Untitled'}
                        </span>
                        <span style={{
                          color: '#fbbf24',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          {product.stock} left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Out of Stock List */}
              {outOfStockProducts.length > 0 && (
                <div>
                  <h4 style={{
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    margin: '0 0 8px 0'
                  }}>
                    🔴 Out of Stock (0)
                  </h4>
                  <div style={{
                    backgroundColor: 'var(--background)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--card-border)'
                  }}>
                    {outOfStockProducts.map((product) => (
                      <div
                        key={product.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 14px',
                          borderBottom: '1px solid var(--card-border)',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => {
                          setIsLowStockModalOpen(false);
                          handleOpenProductModal(product.id);
                        }}
                      >
                        <span style={{
                          color: 'var(--foreground)',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}>
                          {product.title || 'Untitled'}
                        </span>
                        <span style={{
                          color: 'var(--error)',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          Out of Stock
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lowStockProducts.length === 0 && outOfStockProducts.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '32px 0',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>
                  ✅ All products have sufficient stock!
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ Analytics Modal */}
        {analyticsModal.isOpen && analyticsModal.type && (
          <ProductAnalyticsModal
            isOpen={analyticsModal.isOpen}
            onClose={() => setAnalyticsModal({ isOpen: false, type: null })}
            title={
              analyticsModal.type === 'views' ? 'Total Views' :
              analyticsModal.type === 'wishlist' ? 'Total Wishlist' :
              'Total Sales'
            }
            icon={
              analyticsModal.type === 'views' ? <Eye size={20} /> :
              analyticsModal.type === 'wishlist' ? <Heart size={20} /> :
              <ShoppingBag size={20} />
            }
            data={getAnalyticsData(analyticsModal.type)}
            total={
              analyticsModal.type === 'views' ? products.reduce((sum, p) => sum + (p.views || 0), 0) :
              analyticsModal.type === 'wishlist' ? products.reduce((sum, p) => sum + (p.wishlistCount || 0), 0) :
              products.reduce((sum, p) => sum + (p.totalSales || 0), 0)
            }
            onProductClick={handleOpenProductModal}
          />
        )}

        {/* ✅ ProductDetailModal */}
        {selectedProduct && (
          <ProductDetailModal
            isOpen={isProductModalOpen}
            onClose={() => {
              setIsProductModalOpen(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            allowChat={true}
          />
        )}
      </div>      

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}