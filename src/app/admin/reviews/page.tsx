// src/app/admin/reviews/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, Star, Trash2, MessageSquare } from 'lucide-react';

export default function AdminReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
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
          fetchReviews();
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

  const fetchReviews = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'reviews'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('ဒီ Review ကို ဖျက်မှာ သေချာပါသလား?')) {
      await deleteDoc(doc(db, 'reviews', id));
      fetchReviews();
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={14} fill={i < rating ? '#f59e0b' : 'none'} color={i < rating ? '#f59e0b' : 'var(--text-muted)'} />
    ));
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
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>Review Management</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Product Reviews များကို စီမံရန်နေရာ</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <MessageSquare size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No reviews yet</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} style={{ padding: '16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>{renderStars(review.rating || 0)}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{review.userName || 'Anonymous'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Product: {review.productTitle || review.productId}</div>
                </div>
                <button onClick={() => handleDelete(review.id)} style={{ padding: '6px 10px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{review.comment || review.text || 'No comment'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}