// app/admin/payments/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { CheckCircle, XCircle, ExternalLink, ShieldAlert, Clock } from 'lucide-react';

interface PaymentSubmission {
  id: string;
  sellerId: string;
  sellerName: string;
  planName: string;
  planPrice: number;
  senderName: string;
  proofImageUrl: string;
  status: string;
  createdAt: any;
}

export default function AdminPaymentApprovals() {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch PENDING payment submissions in real-time
  useEffect(() => {
    const q = query(
      collection(db, 'payment_submissions'),
      where('status', '==', 'PENDING')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PaymentSubmission[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PaymentSubmission);
      });
      setSubmissions(list);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching payments:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Approve Action
  const handleApprove = async (paymentId: string, sellerId: string) => {
    if (!confirm('Are you sure you want to approve this payment submission?')) return;

    setActionLoading(paymentId);
    try {
      // ✅ Plan duration ကို ရှာပါ
      const submissionSnap = await getDoc(doc(db, 'payment_submissions', paymentId));
      const submissionData = submissionSnap.data();
      const planName = submissionData?.planName || '1 Month';

      // ✅ Plan duration ကို တွက်ပါ
      let months = 1;
      if (planName.includes('6')) months = 6;
      else if (planName.includes('12')) months = 12;

      // ✅ Expiration date တွက်ပါ
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + months);

      await updateDoc(doc(db, 'payment_submissions', paymentId), {
        status: 'APPROVED',
        updatedAt: serverTimestamp(),
      });

      // ✅ subscriptionExpiresAt ကို ထည့်ပါ
      await updateDoc(doc(db, 'users', sellerId), {
        paymentStatus: 'ACTIVE',
        subscriptionExpiresAt: expirationDate.toISOString(),
        subscriptionUpdatedAt: serverTimestamp(),
      });

      // ✅ Push Notification ပို့ပါ (ဒါက အသစ်ထည့်တာ)
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sellerId,
          title: 'Payment Approved ✅',
          body: `Your subscription is active until ${expirationDate.toLocaleDateString()}.`,
          link: '/seller/dashboard', // ✅ Dashboard ကို သွားမယ်
        }),
      });

      alert('Payment approved successfully.');
    } catch (err) {
      console.error('Error approving payment:', err);
      alert('Approval failed.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Reject Action with Predefined Reasons
  const handleReject = async (paymentId: string, sellerId: string) => {
    const choice = prompt(
      'Select rejection reason number:\n1. Information is incorrect\n2. Selected plan and transfer amount do not match\n\n(Enter 1 or 2, or type custom reason):',
      '1'
    );
    
    if (choice === null) return;

    let reason = 'Payment verification failed.';
    if (choice === '1') {
      reason = 'Information is incorrect';
    } else if (choice === '2') {
      reason = 'Selected plan and transfer amount do not match';
    } else if (choice.trim() !== '') {
      reason = choice;
    }

    setActionLoading(paymentId);
    try {
      await updateDoc(doc(db, 'payment_submissions', paymentId), {
        status: 'REJECTED',
        rejectReason: reason,
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'users', sellerId), {
        paymentStatus: 'REJECTED',
      });

      // ✅ Send Push Notification with Dashboard Link
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sellerId,
          title: 'Payment Rejected ❌',
          body: `Reason: ${reason}`,
          link: '/seller/dashboard' // 👈 ဤနေရာတွင်လည်း ထည့်ပေးလိုက်သည်
        })
      });

      alert('Payment submission rejected.');
    } catch (err) {
      console.error('Error rejecting payment:', err);
      alert('Rejection failed.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--foreground)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>Payment Approvals</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Review and verify payment slips submitted by sellers.
          </p>
        </div>
        <div style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--card-border)', padding: '8px 16px', borderRadius: '8px', fontSize: '14px' }}>
          Pending: <strong style={{ color: 'var(--accent)' }}>{submissions.length}</strong>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
          <Clock size={48} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', margin: 0 }}>No pending payment slips to review.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {submissions.map((item) => (
            <div 
              key={item.id}
              style={{
                backgroundColor: 'var(--card-background)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
              }}
            >
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 2px 0' }}>{item.sellerName}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID: {item.sellerId}</span>
                </div>
                <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                  {item.status}
                </span>
              </div>

              {/* Plan & Price Details */}
              <div style={{ backgroundColor: 'var(--background)', padding: '10px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Plan:</span> <strong>{item.planName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Price:</span> <strong style={{ color: 'var(--accent)' }}>{item.planPrice?.toLocaleString()} MMK</strong>
                </div>
              </div>

              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sender Name:</span> <strong>{item.senderName}</strong>
              </div>

              {/* Slip Image Preview */}
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)', height: '180px', backgroundColor: '#000' }}>
                <img 
                  src={item.proofImageUrl} 
                  alt="Payment Proof" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
                <a 
                  href={item.proofImageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={12} /> View Full
                </a>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => handleReject(item.id, item.sellerId)}
                  disabled={actionLoading === item.id}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <XCircle size={16} /> Reject
                </button>

                <button
                  onClick={() => handleApprove(item.id, item.sellerId)}
                  disabled={actionLoading === item.id}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: 'var(--accent)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle size={16} /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}