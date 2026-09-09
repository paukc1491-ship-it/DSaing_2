// src/app/seller/products/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { useWishlist } from '@/context/WishlistContext';
import { Heart, ArrowLeft, ShoppingCart } from 'lucide-react';
import ReviewForm from '@/components/ReviewForm';
import ReviewsList from '@/components/ReviewsList';

export default function SellerProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const isWishlisted = isInWishlist(id as string);

  // Refresh product function
  const refreshProduct = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, 'products', id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error('Error refreshing product:', error);
    }
  };

  // 👇 useEffect တစ်ခုတည်းကိုသာ ထားရှိပြီး view တိုးခြင်းနှင့် ပိုင်ရှင်စစ်ဆေးခြင်းကို ထည့်ပါ
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        const docRef = doc(db, 'products', id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const productData = docSnap.data();
          setProduct({ id: docSnap.id, ...productData });

          // ကိုယ့်ပစ္စည်းကိုယ် (Seller) ဟုတ်မဟုတ် စစ်ဆေးခြင်း
          const currentUser = auth.currentUser;
          const isOwner = currentUser && currentUser.uid === productData.sellerId;

          // ကိုယ့်ပစ္စည်းမဟုတ်မှသာ views ကို 1 တိုးမည်
          if (!isOwner) {
            await updateDoc(docRef, {
              views: increment(1)
            });
          }

        } else {
          console.log('Product not found');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleWishlist = async () => {
    if (!id) return;
    
    if (isWishlisted) {
      await removeFromWishlist(id as string);
    } else {
      await addToWishlist(id as string);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '20px'
      }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Product not found</h2>
        <button
          onClick={() => router.back()}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            backgroundColor: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--foreground)',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}
      >
        <ArrowLeft size={20} />
        Back
      </button>

      {/* Product Image */}
      <img
        src={product.image || product.images?.[0] || '/placeholder.png'}
        alt={product.title || product.name}
        style={{
          width: '100%',
          height: '300px',
          objectFit: 'cover',
          borderRadius: '12px',
          backgroundColor: 'var(--input-background)'
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/placeholder.png';
        }}
      />

      {/* Product Info + Wishlist Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            color: 'var(--text-primary)',
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '4px'
          }}>
            {product.title || product.name}
          </h1>
          <div style={{
            color: 'var(--accent)',
            fontSize: '22px',
            fontWeight: '700'
          }}>
            {product.price?.toLocaleString()} MMK
          </div>
          {product.stock !== undefined && (
            <div style={{
              fontSize: '13px',
              color: product.stock > 0 ? 'var(--success)' : 'var(--error)',
              marginTop: '4px'
            }}>
              {product.stock > 0 ? '✅ In Stock' : '❌ Out of Stock'}
            </div>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--card-border)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--hover-background)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--card-background)';
          }}
        >
          <Heart
            size={24}
            style={{
              fill: isWishlisted ? '#ef4444' : 'none',
              stroke: isWishlisted ? '#ef4444' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          />
        </button>
      </div>

      {/* Product Description */}
      {product.description && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--card-border)'
        }}>
          <h3 style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            Description
          </h3>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            {product.description}
          </p>
        </div>
      )}

      {/* Add to Cart Button */}
      <button
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: 'var(--accent)',
          border: 'none',
          borderRadius: '12px',
          color: '#000',
          fontWeight: '600',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '20px'
        }}
        onClick={() => {
          alert(`Added ${product.title || product.name} to cart!`);
        }}
      >
        <ShoppingCart size={20} />
        Add to Cart
      </button>

      {/* ========== Reviews Section ========== */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px' 
        }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px', 
            fontWeight: '600' 
          }}>
            ⭐ Reviews ({product.totalReviews || 0})
          </h3>
          <button
            onClick={() => setShowReviewForm(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Write a Review
          </button>
        </div>

        <ReviewsList productId={product.id} />

        {showReviewForm && (
          <ReviewForm
            productId={product.id}
            onClose={() => setShowReviewForm(false)}
            onSuccess={() => {
              setShowReviewForm(false);
              refreshProduct();
            }}
          />
        )}
      </div>
    </div>
  );
}