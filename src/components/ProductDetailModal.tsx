// components/ProductDetailModal.tsx
'use client';

import { X, MapPin, MessageCircle, Phone, Heart, Star } from "lucide-react";
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { getChatRoom, createChatId } from '@/lib/chat';
import { useWishlist } from '@/context/WishlistContext';
import ReviewForm from './ReviewForm';
import StarRating from './StarRating';
import { increment } from 'firebase/firestore';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onChatNow?: (product: any) => void;
  allowChat?: boolean;
}

export default function ProductDetailModal({ 
  isOpen, 
  onClose, 
  product: initialProduct,
  onChatNow,
  allowChat = true
}: ProductDetailModalProps) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<'user' | 'seller' | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sellerPhone, setSellerPhone] = useState<string>('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [product, setProduct] = useState(initialProduct);
  const { language } = useLanguage();

  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product?.id);

  const lastTapRef = useRef<number>(0);

  const refreshProduct = async () => {
    if (!product?.id) return;
    try {
      const docRef = doc(db, 'products', product.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error('Error refreshing product:', error);
    }
  };

  useEffect(() => {
    if (!product?.id) return;

    const viewedKey = `viewed_${product.id}`;
    if (!sessionStorage.getItem(viewedKey)) {
      const productRef = doc(db, 'products', product.id);
      updateDoc(productRef, {
        views: increment(1)
      }).catch(err => console.error('Error updating views:', err));
      sessionStorage.setItem(viewedKey, 'true');
    }
  }, [product?.id]);

  useEffect(() => {
    setProduct(initialProduct);
  }, [initialProduct]);

  useEffect(() => {
    if (isOpen && product?.id) {
      refreshProduct();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          setUserRole(snapshot.data().role || 'user');
        } else {
          setUserRole('user');
        }
      } else {
        setUserRole(null);
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDoubleTap = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    if (userRole !== 'user') return;
    
    const now = Date.now();
    const lastTap = lastTapRef.current;
    const timeSinceLastTap = now - lastTap;
    
    if (timeSinceLastTap < 300) {
      if (!product?.id) return;
      
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product.id);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const fetchSellerPhone = async () => {
      if (product?.sellerId) {
        try {
          const sellerRef = doc(db, 'users', product.sellerId);
          const sellerSnap = await getDoc(sellerRef);
          if (sellerSnap.exists()) {
            const sellerData = sellerSnap.data();
            setSellerPhone(sellerData.phone || sellerData.shopPhone || '');
          }
        } catch (error) {
          console.error('Error fetching seller phone:', error);
        }
      }
    };
    fetchSellerPhone();
  }, [product?.sellerId]);

  const handleChatNow = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (!product?.sellerId) {
      alert('Product seller information is missing. Please try again.');
      return;
    }

    if (currentUser.uid === product.sellerId) {
      alert('You cannot chat with yourself.');
      return;
    }

    try {
      const chatId = await getChatRoom(
        currentUser.uid,
        product.sellerId,
        product.id
      );
      
      const targetChatId = chatId || createChatId(currentUser.uid, product.sellerId);
      onClose();
      
      setTimeout(() => {
        router.push(`/messages/${targetChatId}`);
      }, 300);
    } catch (error) {
      console.error('❌ Error finding chat:', error);
      alert('Failed to find chat. Please try again.');
    }
  };

  const handleOpenReviewForm = () => {
    if (!currentUser) {
      alert('Please login to write a review');
      router.push('/login');
      return;
    }
    
    if (userRole === 'seller') {
      alert('Sellers cannot write reviews for their own products');
      return;
    }
    
    setShowReviewForm(true);
  };

  if (!isOpen || !product) return null;

  const isOwner = currentUser?.uid === product.sellerId;
  const isBuyer = userRole === 'user';

  const hasDiscount = product.discount && product.discount !== 'New';
  const hasCustomDiscount = product.customDiscount && product.customDiscount !== 'New';

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--background)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.3s ease"
      }}
      onClick={handleOutsideClick}
    >
      <button
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          backgroundColor: "rgba(0,0,0,0.7)",
          border: "1px solid var(--card-border)",
          color: "var(--foreground)",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10
        }}
        onClick={onClose}
      >
        <X size={24} />
      </button>

      {/* ✅ Discount Type Badge (Placed right below Close Button) */}
      {hasDiscount && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            right: "16px",
            backgroundColor: "var(--error)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "700",
            padding: "4px 12px",
            borderRadius: "6px",
            zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            pointerEvents: "none"
          }}
        >
          {product.discount}
        </div>
      )}

      {isBuyer && (
        <div
          onClick={async (e) => {
            e.stopPropagation();
            if (!product?.id) return;
            
            if (isInWishlist(product.id)) {
              await removeFromWishlist(product.id);
            } else {
              await addToWishlist(product.id);
            }
          }}
          style={{
            position: "absolute",
            top: "66px",
            right: "16px",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", // ✅ နှိပ်လို့ရတယ်ဆိုတာပြ
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <Heart
            size={22}
            style={{
              fill: isWishlisted ? '#ef4444' : 'none',
              stroke: isWishlisted ? '#ef4444' : '#ffffff',
              strokeWidth: isWishlisted ? 0 : 2,
              transition: 'all 0.3s ease',
              pointerEvents: "none", // ✅ Heart ကိုတိုက်ရိုက်မနှိပ်ရဘူး
            }}
          />
        </div>
      )}

      <div
        style={{
          width: "100%",
          height: "55vh",
          backgroundColor: "var(--card-background)",
          position: "relative",
          flexShrink: 0,
          overflow: "hidden",
          cursor: isBuyer ? 'pointer' : 'default'
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleTap}
        onTouchEnd={handleDoubleTap}
      >
        <img
          src={product.image}
          alt={product.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block"
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "4px",
            left: "12px",
            width: "100px",
            height: "100px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 5
          }}
        >
          <img
            src="/logo.png"
            alt="Shop Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: "4px"
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 70%, transparent 100%)",
            padding: "12px 16px 10px 16px",
            zIndex: 5,
            overflow: "hidden"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              overflow: "hidden",
              position: "relative"
            }}
          >
            <MapPin size={14} style={{ color: "#F59E0B", flexShrink: 0 }} />
            
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                position: "relative"
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  animation: "marquee 15s linear infinite",
                  paddingLeft: "100%"
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--accent)",
                    fontWeight: "400"
                  }}
                >
                  {product?.location || "Location not specified"}
                </span>
                
                {sellerPhone && (
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#F59E0B",
                      fontWeight: "500",
                      marginLeft: "20px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Phone size={13} style={{ color: "var(--success)" }} />
                    {sellerPhone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Info */}
      <div
        style={{
          padding: "12px 16px 12px 16px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          backgroundColor: "var(--background)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px"
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "500",
                  color: "#F59E0B",
                  margin: "0 0 2px 0"
                }}
              >
                {product.brand}
              </h2>
              
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "var(--foreground)",
                  margin: "0 0 4px 0",
                  lineHeight: 1.3
                }}
              >
                {product.title}
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "6px",
                  marginBottom: "8px",
                  flexWrap: "wrap"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "default"
                  }}
                >
                  <StarRating 
                    rating={product.averageRating || 0} 
                    readonly={true} 
                    size={14} 
                  />
                  <span style={{
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}>
                    {product.averageRating || 0} ({product.totalReviews || 0})
                  </span>
                </div>

                {isBuyer && (
                  <span
                    onClick={handleOpenReviewForm}
                    style={{
                      color: "var(--accent)",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "inline-block",
                      animation: "twinkle 5s ease-in-out infinite",
                      textDecoration: "none",
                      border: "none",
                      background: "transparent",
                      padding: "0",
                      margin: "0"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.animation = "none";
                      e.currentTarget.style.textShadow = "0 0 8px rgba(56, 189, 248, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.animation = "twinkle 5s ease-in-out infinite";
                      e.currentTarget.style.textShadow = "none";
                    }}
                  >
                    Review
                  </span>
                )}
              </div>

              {/* ✅ Price and Custom Discount Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "2px",
                  overflow: "hidden",
                  width: "100%"
                }}
              >
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "var(--success)",
                    flexShrink: 0
                  }}
                >
                  {product.price} MMK
                </div>

                {/* ✅ Custom Discount Marquee beside Price */}
                {hasCustomDiscount && (
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      position: "relative"
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        whiteSpace: "nowrap",
                        animation: "marqueeDiscount 15s linear infinite",
                        paddingLeft: "100%"
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "var(--foreground)"
                        }}
                      >
                        {product.customDiscount}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!loading && allowChat && !isOwner && product.sellerId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleChatNow();
                }}
                style={{
                  backgroundColor: "var(--accent)",
                  color: "#000000",
                  border: "none",
                  borderRadius: "50px",
                  padding: "8px 16px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                  whiteSpace: "nowrap"
                }}
              >
                <MessageCircle size={16} />
                Chat Now
              </button>
            )}
          </div>
        </div>

        {product?.description && (
          <div
            style={{
              backgroundColor: "var(--card-background)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              padding: "10px 14px",
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              marginTop: "10px",
              marginBottom: "8px"
            }}
          >
            <div
              style={{
                color: "#F59E0B",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              Product Details
            </div>
            <div
              style={{
                color: "var(--foreground)",
                fontSize: "13px",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}
            >
              {product.description}
            </div>
          </div>
        )}
      </div>

      {showReviewForm && isBuyer && (
        <ReviewForm
          productId={product.id}
          onClose={() => setShowReviewForm(false)}
          onSuccess={() => {
            setShowReviewForm(false);
            refreshProduct();
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        
        @keyframes marqueeDiscount {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        
        @keyframes twinkle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}