'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ShopProduct {
  id: string;
  title?: string;
  brand?: string;
  price?: string;
  image?: string;
  description?: string;
  stock?: number;
}

export default function ShopPage() {
  const params = useParams<{ sellerId: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadShop = async () => {
      if (!params.sellerId) return;

      try {
        const [shopSnapshot, productsSnapshot] = await Promise.all([
          getDoc(doc(db, 'users', params.sellerId)),
          getDocs(query(collection(db, 'products'), where('sellerId', '==', params.sellerId)))
        ]);

        if (!shopSnapshot.exists()) {
          setError(true);
          return;
        }

        setShop(shopSnapshot.data());
        setProducts(productsSnapshot.docs.map((product) => ({
          id: product.id,
          ...product.data()
        })) as ShopProduct[]);
      } catch (loadError) {
        console.error('Failed to load shop:', loadError);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [params.sellerId]);

  if (loading) {
    return <main style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '24px' }}>Loading shop...</main>;
  }

  if (error || !shop) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '24px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={18} /> Back to Home
        </button>
        <h1>Shop not found</h1>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
        <ArrowLeft size={18} /> Back to Home
      </button>

      <section style={{ borderBottom: '1px solid #262626', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>{shop.shopName || shop.username || shop.displayName || 'Shop'}</h1>
        {(shop.shopAddress || shop.shopCity) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa', marginTop: '10px' }}>
            <MapPin size={16} color="#ef4444" />
            {shop.shopAddress || shop.shopCity}
          </div>
        )}
        {shop.shopDescription && <p style={{ color: '#a1a1aa', lineHeight: 1.5 }}>{shop.shopDescription}</p>}
      </section>

      <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Products</h2>
      {products.length === 0 ? (
        <p style={{ color: '#a1a1aa' }}>No products available.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {products.map((product) => (
            <article key={product.id} style={{ backgroundColor: '#121212', border: '1px solid #262626', borderRadius: '12px', overflow: 'hidden' }}>
              <img src={product.image} alt={product.title || 'Product'} style={{ width: '100%', height: '180px', objectFit: 'cover', backgroundColor: '#1a1a1a' }} />
              <div style={{ padding: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>{product.title || 'Product'}</h3>
                {product.brand && <p style={{ color: '#38bdf8', fontSize: '12px', margin: '6px 0' }}>{product.brand}</p>}
                {product.price && <strong style={{ color: '#22c55e' }}>{product.price}</strong>}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
