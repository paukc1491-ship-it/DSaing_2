// components/ReviewForm.tsx
'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  doc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  runTransaction 
} from 'firebase/firestore';
import StarRating from './StarRating';
import { X } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

interface ReviewFormProps {
  productId: string;
  orderId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewForm({ 
  productId, 
  orderId, 
  onClose, 
  onSuccess 
}: ReviewFormProps) {
  const { language, t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError('Please login to submit review');
      return;
    }

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().length < 5) {
      setError('Please write at least 5 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const productRef = doc(db, 'products', productId);

      await runTransaction(db, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) {
          throw new Error('Product not found');
        }

        const productData = productSnap.data();
        const currentTotal = productData.totalReviews || 0;
        const currentAvg = productData.averageRating || 0;

        const newTotal = currentTotal + 1;
        const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;

        transaction.update(productRef, {
          averageRating: Math.round(newAvg * 10) / 10,
          totalReviews: newTotal
        });
      });

      await addDoc(collection(db, 'reviews'), {
        productId,
        buyerId: user.uid,
        buyerName: user.displayName || 'User',
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        orderId: orderId || null,
        helpful: 0
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const labelRating = language === 'my' ? 'အဆင့်သတ်မှတ်ချက်' : 'Rating';
  const labelReview = language === 'my' ? 'သုံးသပ်ချက်' : 'Review';
  const placeholderReview = language === 'my' 
    ? 'ဒီပစ္စည်းနဲ့ ပတ်သက်ပြီး သင့်အတွေ့အကြုံကို မျှဝေပါ...' 
    : 'Share your experience with this product...';
  const btnCancel = language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel';
  const btnSubmit = language === 'my' ? 'သုံးသပ်ချက်တင်မယ်' : 'Submit Review';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--card-background)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '480px',
          width: '100%',
          border: '1px solid var(--card-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>
            {labelReview}
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--error)',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            {labelRating}
          </label>
          {/* ✅ StarRating - readonly မပါဘဲ သုံးထားတယ် */}
          <StarRating
            rating={rating}
            onRatingChange={(value) => {
              console.log('⭐ Rating changed to:', value);
              setRating(value);
            }}
            size={32}
          />
          <div style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '12px', 
            marginTop: '4px' 
          }}>
            {rating > 0 ? `Selected: ${rating} star${rating !== 1 ? 's' : ''}` : 'Tap a star to rate'}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            {labelReview}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={placeholderReview}
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--input-background)',
              border: '1px solid var(--input-border)',
              borderRadius: '8px',
              color: 'var(--foreground)',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none'
            }}
          />
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
            {comment.length}/500
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'var(--input-background)',
              border: '1px solid var(--input-border)',
              borderRadius: '8px',
              color: 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {btnCancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || rating === 0 || comment.trim().length < 5}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              cursor: loading || rating === 0 || comment.trim().length < 5 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: loading || rating === 0 || comment.trim().length < 5 ? 0.5 : 1
            }}
          >
            {loading ? 'Submitting...' : btnSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}