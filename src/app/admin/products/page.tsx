'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, Trash2, CheckCircle } from 'lucide-react';

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
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
          fetchProducts();
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

  const fetchProducts = async () => {
    const snapshot = await getDocs(collection(db, 'products'));
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    setProducts(list);
  };

  const toggleProductApproval = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'products', id), {
        isApproved: !currentStatus
      });
      fetchProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('ဒီပစ္စည်းကို ဖျက်မှာ သေချာပါသလား?')) {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
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

      <h1>Products Moderation</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>ဆိုင်များတင်ထားသော ကုန်ပစ္စည်းများကို စစ်ဆေးအတည်ပြုရန်နေရာ</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {products.map(product => (
          <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {product.image || product.imageUrl ? (
                <img src={product.image || product.imageUrl} alt={product.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
              ) : (
                <div style={{ width: '50px', height: '50px', background: 'var(--hover-background)', borderRadius: '6px' }} />
              )}
              <div>
                <div style={{ fontWeight: 'bold' }}>{product.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Price: {product.price} MMK</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => toggleProductApproval(product.id, product.isApproved ?? false)} 
                style={{ padding: '6px 12px', background: product.isApproved ? 'var(--success)' : 'var(--text-muted)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <CheckCircle size={14} /> {product.isApproved ? 'Approved' : 'Approve'}
              </button>
              <button onClick={() => handleDeleteProduct(product.id)} style={{ padding: '6px 12px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}