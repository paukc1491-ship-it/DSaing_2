'tsx'
'use client';

import React, { useState } from 'react';

interface ModalProps {
  submission: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentReviewModal({ submission, onClose, onSuccess }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleAction = async (action: 'CONFIRMED' | 'REJECTED') => {
    if (action === 'REJECTED' && !rejectReason.trim()) {
      alert('ကျေးဇူးပြု၍ ငြင်းပယ်ရသည့် အကြောင်းအရင်းကို ရေးပါ');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          sellerId: submission.sellerId,
          planDurationMonths: submission.planDurationMonths || 1, // Plan သက်တမ်း (လ)
          action,
          rejectReason: action === 'REJECTED' ? rejectReason : ''
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      alert(`အောင်မြင်စွာ ${action === 'CONFIRMED' ? 'အတည်ပြုပြီးပါပြီ' : 'ငြင်းပယ်လိုက်ပါပြီ'}`);
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">ငွေလွှဲစလစ် အသေးစိတ် စစ်ဆေးရန်</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Seller ID</p>
            <p className="font-medium">{submission.sellerId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ရွေးချယ်ထားသော Plan</p>
            <p className="font-medium">{submission.planName} ({submission.planPrice?.toLocaleString()} MMK)</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ငွေလွှဲသူအမည်</p>
            <p className="font-medium">{submission.senderName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">တင်သွင်းသည့်အချိန်</p>
            <p className="font-medium">
              {submission.createdAt?.seconds ? new Date(submission.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">ငွေလွှဲစလစ် ပုံ</p>
          <div className="border rounded-lg overflow-hidden bg-gray-100 flex justify-center">
            <img src={submission.proofImageUrl} alt="Payment Proof" className="max-h-80 object-contain" />
          </div>
        </div>

        {showRejectInput && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">ငြင်းပယ်ရသည့် အကြောင်းရင်း</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border rounded p-2 text-sm"
              placeholder="ဥပမာ - ငွေပမာဏ မမှန်ကန်ပါ၊ စလစ်ပုံ မရှင်းလင်းပါ"
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
          >
            ပိတ်မည်
          </button>

          {!showRejectInput ? (
            <button
              onClick={() => setShowRejectInput(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ငြင်းပယ်မည် (Reject)
            </button>
          ) : (
            <button
              onClick={() => handleAction('REJECTED')}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {loading ? 'လုပ်ဆောင်နေသည်...' : 'သေချာပါတယ် (Confirm Reject)'}
            </button>
          )}

          <button
            onClick={() => handleAction('CONFIRMED')}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {loading ? 'လုပ်ဆောင်နေသည်...' : 'အတည်ပြုမည် (Approve)'}
          </button>
        </div>
      </div>
    </div>
  );
}