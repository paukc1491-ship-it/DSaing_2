// components/PaymentSubmission.tsx
'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/cloudinary'; // ✅ Cloudinary import
import { Upload, X, CheckCircle, Image as ImageIcon, AlertCircle, CreditCard } from 'lucide-react';

interface PaymentSubmissionProps {
  userData: any;
  userId: string;
}

export default function PaymentSubmission({ userData, userId }: PaymentSubmissionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number } | null>(null);
  const [senderName, setSenderName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Subscription Status တွက်တဲ့ Function
  const getSubscriptionStatus = (userData: any) => {
    const paymentStatus = userData?.paymentStatus || 'NONE';
    const expiresAt = userData?.subscriptionExpiresAt;

    // Pending
    if (paymentStatus === 'PENDING') {
      return {
        status: 'PENDING',
        borderColor: '#f59e0b', // လိမ္မော်ရောင်
        message: 'Admin is verifying your payment...',
      };
    }

    // Rejected
    if (paymentStatus === 'REJECTED' || paymentStatus === 'MISMATCH') {
      return {
        status: 'REJECTED',
        borderColor: '#ef4444', // အနီရောင်
        message: 'Payment verification failed. Please resubmit.',
      };
    }

    // Active - သက်တမ်းရှိသေးလား စစ်ပါ
    if (paymentStatus === 'ACTIVE' && expiresAt) {
      const now = new Date();
      const expirationDate = new Date(expiresAt);
      const diffInDays = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // သက်တမ်းကုန်ပြီ
      if (diffInDays <= 0) {
        return {
          status: 'EXPIRED',
          borderColor: '#ef4444', // အနီရောင်
          message: 'Your subscription has expired. Please renew.',
        };
      }

      // ၇ ရက်အတွင်း ကုန်တော့မယ်
      if (diffInDays <= 7) {
        return {
          status: 'EXPIRING_SOON',
          borderColor: '#f59e0b', // အဝါရောင်
          message: `⚠️ Your subscription expires in ${diffInDays} day${diffInDays === 1 ? '' : 's'}. Please renew soon.`,
        };
      }

      // သက်တမ်းရှိသေးတယ်
      return {
        status: 'ACTIVE',
        borderColor: '#22c55e', // အစိမ်းရောင်
        message: `Active until ${expirationDate.toLocaleDateString()}`,
      };
    }

    // ဘာမှမရှိ
    return {
      status: 'NONE',
      borderColor: 'var(--card-border)', // ပုံမှန်
      message: 'Subscribe to keep your shop active.',
    };
  };

  // Subscription Plans
  const plans = [
    { name: '1 Month', price: 20000 },
    { name: '6 Months', price: 110000 },
    { name: '12 Months', price: 200000 },
  ];

  // ဖိုင်ရွေးချယ်ရန်
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  // ငွေလွှဲစလစ် တင်သွင်းရန်
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ userId ကိုစစ်ပါ
    if (!userId) {
      setError('အသုံးပြုသူ အချက်အလက် မပြည့်စုံသေးပါ၊ ခဏစောင့်ပါ သို့မဟုတ် အကောင့်ပြန်ဝင်ပါ။');
      return;
    }

    if (!selectedPlan) {
      setError('ကျေးဇူးပြု၍ Subscription Plan တစ်ခု ရွေးချယ်ပါ။');
      return;
    }
    if (!senderName.trim()) {
      setError('ကျေးဇူးပြု၍ ငွေလွှဲသူအမည် ဖြည့်ပါ။');
      return;
    }
    if (!selectedFile) {
      setError('ကျေးဇူးပြု၍ ငွေလွှဲစလစ်ပုံ ထည့်ပါ။');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ 1. Cloudinary သို့ ပုံတင်ခြင်း
      console.log('📤 Uploading to Cloudinary...');
      const downloadUrl = await uploadToCloudinary(selectedFile);
      console.log('✅ Cloudinary upload success:', downloadUrl);

      // ✅ 2. Firestore သို့ အချက်အလက်များ သိမ်းဆည်းခြင်း
      await addDoc(collection(db, 'payment_submissions'), {
        sellerId: userId,
        sellerName: userData?.username || userData?.displayName || 'Unknown Seller',
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        senderName: senderName.trim(),
        proofImageUrl: downloadUrl, // ✅ Cloudinary URL
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });

      setLoading(false);
      setSuccessMessage(true);
      setSelectedFile(null);
      setPreviewUrl(null);
      setSenderName('');
      setSelectedPlan(null);

      setTimeout(() => {
        setSuccessMessage(false);
        setIsModalOpen(false);
      }, 3000);

    } catch (err: any) {
      console.error('Error uploading payment proof:', err);
      setError(err.message || 'တင်သွင်းမှု မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။');
      setLoading(false);
    }
  };

  // ✅ Status ကိုတွက်ပါ
  const subscriptionStatus = getSubscriptionStatus(userData);
  const paymentStatus = userData?.paymentStatus || 'NONE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
      
      {/* Dashboard Alerts */}
      {paymentStatus === 'PENDING' && (
        <div style={{
          backgroundColor: '#451a0e',
          border: '1px solid #92400e',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fbbf24'
        }}>
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600' }}>Your shop is in verification process</h4>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Check your payment back. Admin is verifying your subscription slip.</p>
          </div>
        </div>
      )}

      {(paymentStatus === 'REJECTED' || paymentStatus === 'MISMATCH') && (
        <div style={{
          backgroundColor: '#451a1e',
          border: '1px solid #7f1d1d',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fca5a5'
        }}>
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600' }}>Payment Verification Failed</h4>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Please check your payment back and resubmit your correct payment proof.</p>
          </div>
        </div>
      )}

      {/* ✅ Expiring Soon Alert */}
      {subscriptionStatus.status === 'EXPIRING_SOON' && (
        <div style={{
          backgroundColor: '#451a0e',
          border: '1px solid #92400e',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fbbf24',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600' }}>
              ⚠️ Subscription Expiring Soon
            </h4>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
              {subscriptionStatus.message}
            </p>
          </div>
        </div>
      )}

      {/* ✅ Expired Alert */}
      {subscriptionStatus.status === 'EXPIRED' && (
        <div style={{
          backgroundColor: '#451a1e',
          border: '1px solid #7f1d1d',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fca5a5',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600' }}>
              🚫 Subscription Expired
            </h4>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
              {subscriptionStatus.message}
            </p>
          </div>
        </div>
      )}

      {/* ✅ Main Clickable Card Button - Dynamic Border */}
      <div
        onClick={() => setIsModalOpen(true)}
        style={{
          backgroundColor: 'var(--card-background)',
          border: `2px solid ${subscriptionStatus.borderColor}`, // ✅ Dynamic border color
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: `0 0 12px ${subscriptionStatus.borderColor}40`, // ✅ Glow effect
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 0 20px ${subscriptionStatus.borderColor}60`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `0 0 12px ${subscriptionStatus.borderColor}40`;
        }}
      >
        <div>
          <h3 style={{ color: 'var(--foreground)', fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} color={subscriptionStatus.borderColor} /> Subscription Payment
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            {subscriptionStatus.message}
          </p>
        </div>

        {/* ✅ Status Badge */}
        <div style={{
          padding: '6px 14px',
          backgroundColor: `${subscriptionStatus.borderColor}20`,
          border: `1px solid ${subscriptionStatus.borderColor}`,
          borderRadius: '20px',
          color: subscriptionStatus.borderColor,
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
        }}>
          {subscriptionStatus.status === 'ACTIVE' && '✅ Active'}
          {subscriptionStatus.status === 'EXPIRING_SOON' && '⚠️ Expiring Soon'}
          {subscriptionStatus.status === 'EXPIRED' && '🚫 Expired'}
          {subscriptionStatus.status === 'PENDING' && '⏳ Pending'}
          {subscriptionStatus.status === 'REJECTED' && '❌ Rejected'}
          {subscriptionStatus.status === 'NONE' && '💳 Subscribe'}
        </div>
      </div>

      {/* Modal Popup */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--card-border)',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ color: 'var(--foreground)', fontSize: '18px', fontWeight: '700', margin: '0 0 16px 0' }}>
              Subscription Payment Submission
            </h3>

            {successMessage ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--success)' }}>
                <CheckCircle size={52} style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ fontSize: '18px', margin: '0 0 8px 0', color: 'var(--foreground)' }}>Successfully Submitted!</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                  သင်၏ ငွေလွှဲစလစ်ကို Admin ထံ အောင်မြင်စွာ ပို့ပြီးပါပြီ။
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && (
                  <div style={{ padding: '10px 12px', backgroundColor: '#451a1e', color: '#fca5a5', borderRadius: '8px', fontSize: '13px' }}>
                    {error}
                  </div>
                )}

                {/* Plan Selection */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                    Select Subscription Plan *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {plans.map((plan) => {
                      const isSelected = selectedPlan?.name === plan.name;
                      return (
                        <div
                          key={plan.name}
                          onClick={() => {
                            setSelectedPlan(plan);
                            setError(null);
                          }}
                          style={{
                            padding: '12px 8px',
                            backgroundColor: isSelected ? 'var(--hover-background)' : 'var(--background)',
                            border: isSelected ? '2px solid var(--accent)' : '1px solid var(--card-border)',
                            borderRadius: '10px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ color: 'var(--foreground)', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                            {plan.name}
                          </div>
                          <div style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: '700' }}>
                            {plan.price.toLocaleString()} MMK
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sender Name */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', fontWeight: '500' }}>
                    Sender Name*
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="ငွေလွှဲသူအမည် (သို့) အကောင့်နာမည် ဖြည့်ပါ"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--input-background)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '8px',
                      color: 'var(--foreground)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Choose Image */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', fontWeight: '500' }}>
                    Upload Payment Slip *
                  </label>
                  
                  <div style={{
                    border: '2px dashed var(--card-border)',
                    borderRadius: '10px',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: 'var(--background)',
                    position: 'relative',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                    
                    {previewUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <img 
                          src={previewUrl} 
                          alt="Slip Preview" 
                          style={{ maxWidth: '100%', height: '140px', objectFit: 'contain', borderRadius: '6px' }} 
                        />
                        <span style={{ color: 'var(--accent)', fontSize: '12px' }}>ပုံပြောင်းရန် ထပ်မံနှိပ်ပါ</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <ImageIcon size={32} />
                        <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--foreground)' }}>Choose Image / Add Image</span>                        
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--card-border)',
                      color: 'var(--foreground)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: 'var(--accent)',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? 'Submitting...' : '+ Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}