import { doc, Firestore, Transaction } from 'firebase/firestore';

export interface ReceiptNumber {
  number: string;
  year: number;
}

export async function getNextReceiptNumber(
  transaction: Transaction,
  database: Firestore,
  sellerId: string,
  year: number
): Promise<ReceiptNumber> {
  const counterRef = doc(database, 'users', sellerId);
  const counterSnapshot = await transaction.get(counterRef);
  const counters = counterSnapshot.data()?.receiptCounters || {};
  
  // ✅ ပယ်ဖျက်ထားတဲ့ အော်ဒါများ (CANCELLED) ကို ထည့်မတွက်အောင် စစ်ဆေးပါ
  const cancelledCount = counters[`cancelled_${year}`] || 0;
  const nextNumber = Number(counters[String(year)] || 0) + 1;

  transaction.update(counterRef, {
    [`receiptCounters.${year}`]: nextNumber,
  });

  return {
    number: String(nextNumber).padStart(4, '0'),
    year,
  };
}