// src/app/admin/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, Users, Store, Package, ShoppingCart, TrendingUp, DollarSign, Eye, Heart } from 'lucide-react';

export default function AdminReportsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalViews: 0,
    totalWishlist: 0,
    totalSales: 0,
  });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return; }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          await fetchAllStats();
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchAllStats = async () => {
    try {
      // Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => d.data());
      const totalUsers = allUsers.filter(u => u.role === 'user').length;
      const totalSellers = allUsers.filter(u => u.role === 'seller' || u.role === 'VENDOR').length;

      // Products
      const productsSnap = await getDocs(collection(db, 'products'));
      const allProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const totalProducts = allProducts.length;
      const totalViews = allProducts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
      const totalWishlist = allProducts.reduce((sum: number, p: any) => sum + (p.wishlistCount || 0), 0);
      const totalSales = allProducts.reduce((sum: number, p: any) => sum + (p.totalSales || 0), 0);

      // Orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const allOrders = ordersSnap.docs.map(d => d.data());
      const totalOrders = allOrders.length;
      const totalRevenue = allOrders
        .filter((o: any) => o.status === 'CONFIRMED' || o.status === 'DELIVERED')
        .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

      setStats({
        totalUsers,
        totalSellers,
        totalProducts,
        totalOrders,
        totalRevenue,
        totalViews,
        totalWishlist,
        totalSales,
      });

      // Top Products
      const sortedProducts = [...allProducts].sort((a: any, b: any) => (b.totalSales || 0) - (a.totalSales || 0)).slice(0, 5);
      setTopProducts(sortedProducts);

      // Top Sellers
      const sellerSales = new Map<string, { name: string; totalSales: number; revenue: number }>();
      allProducts.forEach((p: any) => {
        if (!p.sellerId) return;
        const existing = sellerSales.get(p.sellerId) || { name: p.sellerName || p.brand || 'Unknown', totalSales: 0, revenue: 0 };
        existing.totalSales += p.totalSales || 0;
        existing.revenue += p.totalRevenue || 0;
        sellerSales.set(p.sellerId, existing);
      });
      const sortedSellers = Array.from(sellerSales.values()).sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
      setTopSellers(sortedSellers);

    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) return <div style={{ padding: '24px', color: 'var(--foreground)' }}>Loading...</div>;
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', color: 'var(--foreground)' }}>
        <ShieldAlert size={48} color="var(--error)" />
        <h2>Access Denied</h2>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Go Home</button>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div style={{ padding: '16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Icon size={18} color={color} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{label}</span>
      </div>
      <div style={{ color: 'var(--foreground)', fontSize: '24px', fontWeight: '700' }}>{value.toLocaleString()}</div>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>Report & Analytics</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>ပလက်ဖောင်း၏ အခြေအနေကို ကြည့်ရှုရန်နေရာ</p>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <StatCard icon={Users} label="Total Buyers" value={stats.totalUsers} color="var(--accent)" />
        <StatCard icon={Store} label="Total Sellers" value={stats.totalSellers} color="#FFD700" />
        <StatCard icon={Package} label="Total Products" value={stats.totalProducts} color="#10B981" />
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats.totalOrders} color="#f59e0b" />
        <StatCard icon={DollarSign} label="Total Revenue (MMK)" value={stats.totalRevenue} color="var(--success)" />
        <StatCard icon={Eye} label="Total Views" value={stats.totalViews} color="#8B5CF6" />
        <StatCard icon={Heart} label="Total Wishlist" value={stats.totalWishlist} color="#ef4444" />
        <StatCard icon={TrendingUp} label="Total Sales" value={stats.totalSales} color="var(--accent)" />
      </div>

      {/* Top Products */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px' }}>🏆 Top 5 Products</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {topProducts.map((product, idx) => (
            <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>
                {idx + 1}
              </div>
              <img src={product.image} alt={product.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{product.title || 'Untitled'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>🛒 {product.totalSales || 0} sales | 👁️ {product.views || 0} views</div>
              </div>
              <div style={{ color: 'var(--success)', fontWeight: '700', fontSize: '13px' }}>
                {Number(product.totalRevenue || 0).toLocaleString()} MMK
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Sellers */}
      <div>
        <h2 style={{ marginBottom: '16px' }}>🏪 Top 5 Sellers</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {topSellers.map((seller, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#FFD700', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0 }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{seller.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>🛒 {seller.totalSales} sales</div>
              </div>
              <div style={{ color: 'var(--success)', fontWeight: '700', fontSize: '13px' }}>
                {seller.revenue.toLocaleString()} MMK
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}