// app/wishlist/page.tsx
'use client';

import { useWishlist } from '@/context/WishlistContext';
import { Heart, ShoppingCart, Trash2, ArrowLeft, X, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ProductDetailModal from '@/components/ProductDetailModal';

interface Product {
  id: string;
  title: string;
  name?: string;
  price: number;
  image?: string;
  images?: string[];
  sellerId?: string;
  stock?: number;
}

export default function WishlistPage() {
  const router = useRouter();
  const { wishlist, removeFromWishlist, loading } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [userRole, setUserRole] = useState<'user' | 'seller' | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // ✅ Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Select Mode States
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ User Role ကို စစ်မယ်
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const role = userSnap.data().role || 'user';
            setUserRole(role);
          } else {
            setUserRole('user');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // ✅ ရောင်းသူဆိုရင် Home ကိုပြန်ပို့မယ်
  useEffect(() => {
    if (!isCheckingAuth && userRole === 'seller') {
      router.push('/');
    }
  }, [isCheckingAuth, userRole, router]);

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (wishlist.length === 0) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      setLoadingProducts(true);
      try {
        const productPromises = wishlist.map(async (productId) => {
          const docRef = doc(db, 'products', productId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Product;
          }
          return null;
        });

        const results = await Promise.all(productPromises);
        const validProducts = results.filter((p): p is Product => p !== null);
        setProducts(validProducts);
      } catch (error) {
        console.error('Error fetching wishlist products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchWishlistProducts();
  }, [wishlist]);

  // ✅ Product ကို နှိပ်ရင် Modal ဖွင့်မယ်
  const handleProductClick = (product: Product) => {
    if (selectMode) return;
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Long Press Handlers
  const handleTouchStart = (productId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      if (!selectMode) {
        setSelectMode(true);
        setSelectedItems(new Set([productId]));
      }
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const toggleSelect = (productId: string) => {
    if (!selectMode) return;
    
    const newSelected = new Set(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    
    const confirmDelete = confirm(`Delete ${selectedItems.size} item(s) from wishlist?`);
    if (!confirmDelete) return;

    const idsToDelete = Array.from(selectedItems);
    for (const id of idsToDelete) {
      await removeFromWishlist(id);
    }
    
    setProducts(prev => prev.filter(p => !selectedItems.has(p.id)));
    setSelectedItems(new Set());
    setSelectMode(false);
  };

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedItems(new Set());
  };

  const handleRemove = async (productId: string) => {
    if (selectMode) return;
    await removeFromWishlist(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const isLoading = loading || loadingProducts || isCheckingAuth;

  // ✅ ရောင်းသူဆိုရင် ဘာမှမပြဘူး (Redirect ဖြစ်နေမယ်)
  if (userRole === 'seller') {
    return null;
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '20px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '20px',
        position: 'relative'
      }}>
        <button
          onClick={() => router.back()}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--foreground)',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            zIndex: 10
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <Heart size={64} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '20px' }}>
          ❤️ Your wishlist is empty
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
          Start saving your favorite items by double tapping the image!
        </p>
        <Link
          href="/"
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            backgroundColor: 'var(--accent)',
            color: '#000',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        position: 'relative'
      }}>
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
            fontSize: '14px',
            flexShrink: 0
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <h1 style={{
          color: 'var(--text-primary)',
          fontSize: '18px',
          fontWeight: '600',
          margin: 0,
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap'
        }}>
          {selectMode ? `${selectedItems.size} selected` : '❤️ My Wishlist'}
        </h1>

        {selectMode ? (
          <button
            onClick={cancelSelectMode}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              fontSize: '14px',
              flexShrink: 0
            }}
          >
            <X size={20} />
          </button>
        ) : (
          <span style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            backgroundColor: 'var(--card-background)',
            padding: '4px 12px',
            borderRadius: '12px',
            border: '1px solid var(--card-border)',
            flexShrink: 0
          }}>
            {products.length} items
          </span>
        )}
      </div>

      {/* Product List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {products.map((product) => {
          const isSelected = selectedItems.has(product.id);
          
          return (
            <div
              key={product.id}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(product.id);
                } else {
                  // ✅ Modal ကိုဖွင့်မယ်
                  handleProductClick(product);
                }
              }}
              onTouchStart={() => handleTouchStart(product.id)}
              onTouchEnd={handleTouchEnd}
              onMouseDown={() => !selectMode && handleTouchStart(product.id)}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: isSelected ? 'var(--hover-background)' : 'var(--card-background)',
                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '12px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              {/* Selection Checkbox */}
              {selectMode && (
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid var(--card-border)',
                    backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSelected && <Check size={14} color="#000" />}
                </div>
              )}

              {/* Product Image */}
              <div style={{ flexShrink: 0 }}>
                <img
                  src={product.image || product.images?.[0] || '/placeholder.png'}
                  alt={product.title || product.name || 'Product'}
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    backgroundColor: 'var(--input-background)'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.png';
                  }}
                />
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: 'var(--text-primary)',
                  fontWeight: '500',
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {product.title || product.name || 'Product'}
                </div>
                <div style={{
                  color: 'var(--accent)',
                  fontWeight: '600',
                  fontSize: '15px',
                  marginTop: '4px'
                }}>
                  {product.price?.toLocaleString()} MMK
                </div>
                {product.stock !== undefined && (
                  <div style={{
                    fontSize: '11px',
                    color: product.stock > 0 ? 'var(--success)' : 'var(--error)',
                    marginTop: '2px'
                  }}>
                    {product.stock > 0 ? '✅ In Stock' : '❌ Out of Stock'}
                  </div>
                )}
              </div>

              {/* Trash Button */}
              {!selectMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(product.id);
                  }}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '12px',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--card-border)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}

              {/* Long Press ညွှန်ကြားချက် */}
              {!selectMode && (
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '12px',
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  opacity: 0.4
                }}>
                  hold to select
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Bar */}
      {selectMode && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--card-background)',
          borderTop: '1px solid var(--card-border)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 50
        }}>
          <span style={{
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            {selectedItems.size} selected
          </span>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedItems.size === 0}
            style={{
              padding: '10px 24px',
              backgroundColor: selectedItems.size > 0 ? '#ef4444' : 'var(--text-muted)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: selectedItems.size > 0 ? 'pointer' : 'not-allowed',
              opacity: selectedItems.size > 0 ? 1 : 0.5,
              transition: 'all 0.2s ease'
            }}
          >
            Delete Selected ({selectedItems.size})
          </button>
        </div>
      )}

      {/* ✅ ProductDetailModal */}
      {selectedProduct && (
        <ProductDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          allowChat={true}
        />
      )}
    </div>
  );
}