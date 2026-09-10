'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

export default function AdminSellersPage() {
  const router = useRouter();
  const [sellers, setSellers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/');
        return;
      }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          fetchSellers();
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

  const fetchSellers = async () => {
    // users စုစည်းမှုထဲက role === 'seller' ဖြစ်သူများကို ယူမည်
    const snapshot = await getDocs(collection(db, 'users'));
    const sellerList = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(user => user.role === 'seller');
    setSellers(sellerList);
  };

  const updateSellerStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        status: newStatus // ဥပမာ: 'approved', 'rejected', 'suspended'
      });
      fetchSellers();
    } catch (error) {
      console.error('Error updating seller status:', error);
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

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>Seller Management</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>ပလက်ဖောင်းပေါ်ရှိ ဆိုင်ရှင်များ၏ အကောင့်များကို စစ်ဆေးအတည်ပြုရန်နေရာ</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sellers.map(seller => (
          <div key={seller.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{seller.shopName || seller.username || seller.email}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Email: {seller.email}</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Status: <span style={{ fontWeight: 'bold', color: seller.status === 'approved' ? 'var(--success)' : 'var(--error)' }}>{seller.status || 'Pending'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {seller.status !== 'approved' && (
                <button onClick={() => updateSellerStatus(seller.id, 'approved')} style={{ padding: '8px 12px', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={16} /> Approve
                </button>
              )}
              <button onClick={() => updateSellerStatus(seller.id, 'suspended')} style={{ padding: '8px 12px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={16} /> Suspend
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}