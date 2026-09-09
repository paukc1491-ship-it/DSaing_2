// components/ReviewsList.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import StarRating from './StarRating';
import { useLanguage } from '@/components/LanguageProvider';  // ✅ ခင်ဗျားရဲ့ Language Provider

interface Review {
  id: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: any;
  helpful: number;
}

interface ReviewsListProps {
  productId: string;
  showAll?: boolean;
}

// ✅ ကိုယ်တိုင် time ago function (ဘာသာစကားနဲ့ချိတ်)
const getTimeAgo = (timestamp: any, language: string) => {
  if (!timestamp?.toDate) return language === 'my' ? 'မကြာသေးမီက' : 'recently';
  
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (language === 'my') {
    if (diffMins < 1) return 'အခုလေးတင်';
    if (diffMins < 60) return `${diffMins} မိနစ်က`;
    if (diffHours < 24) return `${diffHours} နာရီက`;
    if (diffDays < 7) return `${diffDays} ရက်က`;
    if (diffWeeks < 4) return `${diffWeeks} ပတ်က`;
    if (diffMonths < 12) return `${diffMonths} လက`;
    return `${diffYears} နှစ်က`;
  }

  // English
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
};

export default function ReviewsList({ 
  productId, 
  showAll = false
}: ReviewsListProps) {
  const { language, t } = useLanguage();  // ✅ ခင်ဗျားရဲ့ language hook
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'reviews'),
          where('productId', '==', productId),
          orderBy('createdAt', 'desc'),
          limit(showAll ? 100 : 5)
        );
        const snapshot = await getDocs(q);
        const reviewList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        setReviews(reviewList);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId, showAll]);

  // ✅ translation.ts ကနေ စာသားတွေသုံးမယ်
  const noReviewsText = language === 'my' 
    ? 'သုံးသပ်ချက်မရှိသေးပါ။ ပထမဆုံး သုံးသပ်သူဖြစ်လိုက်ပါ။'
    : 'No reviews yet. Be the first to review!';

  const loadingText = language === 'my' 
    ? 'သုံးသပ်ချက်များ ဖတ်နေသည်...' 
    : 'Loading reviews...';

  if (loading) {
    return (
      <div style={{ 
        color: 'var(--text-secondary)', 
        textAlign: 'center', 
        padding: '16px' 
      }}>
        {loadingText}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div style={{ 
        color: 'var(--text-secondary)', 
        textAlign: 'center', 
        padding: '20px',
        fontSize: '14px',
        backgroundColor: 'var(--card-background)',
        borderRadius: '8px',
        border: '1px solid var(--card-border)'
      }}>
        {noReviewsText}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {reviews.map((review) => (
        <div
          key={review.id}
          style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            padding: '16px'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '8px' 
          }}>
            <div>
              <span style={{ 
                color: 'var(--text-primary)', 
                fontWeight: '600',
                fontSize: '14px'
              }}>
                {review.buyerName || 'User'}
              </span>
              <span style={{ 
                color: 'var(--text-muted)', 
                fontSize: '12px', 
                marginLeft: '8px' 
              }}>
                {getTimeAgo(review.createdAt, language)}
              </span>
            </div>
            <StarRating rating={review.rating} readonly size={16} />
          </div>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '14px', 
            lineHeight: '1.6',
            marginTop: '4px'
          }}>
            {review.comment}
          </p>
        </div>
      ))}
    </div>
  );
}