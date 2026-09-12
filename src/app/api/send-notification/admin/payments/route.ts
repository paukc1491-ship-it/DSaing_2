import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin'; // Firebase Admin SDK ကို အသုံးပြုရန်

export async function POST(req: Request) {
  try {
    const { submissionId, sellerId, planDurationMonths, action, rejectReason } = await req.json();

    if (!submissionId || !sellerId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const submissionRef = adminDb.collection('payment_submissions').doc(submissionId);
    const sellerRef = adminDb.collection('users').doc(sellerId); // သို့မဟုတ် sellers collection

    if (action === 'CONFIRMED') {
      // သက်တမ်းကုန်မယ့်ရက် တွက်ချက်ခြင်း (လက်ရှိအချိန်မှ planDurationMonths လပေါင်းထည့်ရန်)
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + (planDurationMonths || 1));

      // 1. Submission status ကို CONFIRMED ပြောင်းမည်
      await submissionRef.update({
        status: 'CONFIRMED',
        updatedAt: new Date()
      });

      // 2. Seller ရဲ့ status နဲ့ expiration date ကို Update လုပ်မည်
      await sellerRef.set({
        paymentStatus: 'ACTIVE',
        subscriptionExpiresAt: expirationDate,
        updatedAt: new Date()
      }, { merge: true });

    } else if (action === 'REJECTED') {
      // 1. Submission status ကို REJECTED ပြောင်းပြီး အကြောင်းရင်း သိမ်းမည်
      await submissionRef.update({
        status: 'REJECTED',
        rejectReason: rejectReason || 'Invalid payment proof',
        updatedAt: new Date()
      });

      // 2. Seller ဘက်တွင်လည်း REJECTED အဖြစ် မှတ်သားမည်
      await sellerRef.set({
        paymentStatus: 'REJECTED',
        rejectReason: rejectReason || 'Invalid payment proof',
        updatedAt: new Date()
      }, { merge: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin payment action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}