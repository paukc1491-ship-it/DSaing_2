// src/app/admin/activity/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, Activity, User, Package, ShoppingCart, LogIn, AlertCircle } from 'lucide-react';

export default function AdminActivityPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return; }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          fetchActivities();
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

  const fetchActivities = async () => {
    try {
      // Admin notifications history
      const notifSnap = await getDocs(collection(db, 'admin_notifications'));
      const notifications = notifSnap.docs.map(doc => ({
        id: doc.id,
        type: 'notification',
        ...doc.data(),
      }));

      // Payment submissions
      const paySnap = await getDocs(collection(db, 'payment_submissions'));
      const payments = paySnap.docs.map(doc => ({
        id: doc.id,
        type: 'payment',
        ...doc.data(),
      }));

      // Combine and sort
      const combined = [...notifications, ...payments].sort((a: any, b: any) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setActivities(combined);
    } catch (error) {
      console.error('Error fetching activities:', error);
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

  const filtered = filter === 'ALL' ? activities : activities.filter(a => a.type === filter);

  const getIcon = (type: string) => {
    if (type === 'notification') return <Activity size={16} color="var(--accent)" />;
    if (type === 'payment') return <ShoppingCart size={16} color="#10B981" />;
    return <AlertCircle size={16} color="var(--text-muted)" />;
  };

  const getLabel = (item: any) => {
    if (item.type === 'notification') return `Notification sent: "${item.title}" to ${item.target}`;
    if (item.type === 'payment') return `Payment submission: ${item.sellerName} - ${item.planName}`;
    return 'Unknown activity';
  };

  const getTimestamp = (item: any) => {
    if (!item.createdAt) return 'N/A';
    const date = item.createdAt?.toDate?.() || new Date(item.createdAt);
    return date.toLocaleString();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>Activity Log</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Admin လုပ်ခဲ့သော လုပ်ဆောင်ချက်များ၏ မှတ်တမ်း</p>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['ALL', 'notification', 'payment'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              background: filter === f ? 'var(--accent)' : 'var(--card-background)',
              color: filter === f ? '#000' : 'var(--foreground)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            {f === 'ALL' ? '🌐 All' : f === 'notification' ? '📢 Notifications' : '💰 Payments'}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <Activity size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No activities yet</p>
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div key={`${item.id}-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ marginTop: '2px' }}>{getIcon(item.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--foreground)' }}>{getLabel(item)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{getTimestamp(item)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}