// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import {
  ArrowLeft, ShieldAlert, ShieldCheck, CreditCard, Store, Package,
  Users, ShoppingCart, TrendingUp, Bell, Star, MessageCircle,
  FileText, Activity,
} from 'lucide-react';

const ADMIN_LINKS = [
  { href: '/admin/banners', icon: ShieldCheck, label: 'Manage Banners', color: 'var(--accent)', textColor: '#000' },
  { href: '/admin/payments', icon: CreditCard, label: 'Payment Approvals', color: '#10B981', textColor: '#FFF' },
  { href: '/admin/sellers', icon: Store, label: 'Seller Management', color: '#F59E0B', textColor: '#FFF' },
  { href: '/admin/products', icon: Package, label: 'Product Moderation', color: '#8B5CF6', textColor: '#FFF' },
  { href: '/admin/users', icon: Users, label: 'User Management', color: '#3B82F6', textColor: '#FFF' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Order Management', color: '#F97316', textColor: '#FFF' },
  { href: '/admin/reports', icon: TrendingUp, label: 'Reports', color: '#22C55E', textColor: '#FFF' },
  { href: '/admin/categories', icon: Package, label: 'Categories', color: '#8B4513', textColor: '#FFF' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications', color: '#EAB308', textColor: '#000' },
  { href: '/admin/reviews', icon: Star, label: 'Reviews', color: '#FBBF24', textColor: '#000' },
  { href: '/admin/support', icon: MessageCircle, label: 'Support', color: '#06B6D4', textColor: '#FFF' },
  { href: '/admin/content', icon: FileText, label: 'Content', color: '#A855F7', textColor: '#FFF' },
  { href: '/admin/activity', icon: Activity, label: 'Activity Log', color: '#6B7280', textColor: '#FFF' },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return; }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
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

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: 'var(--foreground)' }}>
      <style jsx>{`
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .admin-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          }
        }
      `}</style>

      <button onClick={() => router.push('/')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} />
      </button>

      <h1 style={{ marginBottom: '8px' }}>🛡️ Admin Panel</h1>

      <div className="admin-grid">
        {ADMIN_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '20px 12px',
                backgroundColor: link.color,
                color: link.textColor,
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                minHeight: '110px',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Icon size={28} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}