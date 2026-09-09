// ၁။ ဆိုင်ရှင်/သုံးစွဲသူ အချက်အလက်
export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
  isVerifiedKYC: boolean; // မှတ်ပုံတင် စိစစ်ပြီးပါက true
}

// ၂။ ဆိုင်ခန်း အချက်အလက် (Subscription & Rent)
export interface Store {
  id: string;
  vendorId: string;
  storeName: string;
  description: string;
  subscriptionPlan: 'FREE_TRIAL' | 'MONTHLY' | 'YEARLY';
  isFeatured: boolean; // လူပိုမြင်ရမည့် ကြော်ငြာနေရာ (Paid Banner)
  isActive: boolean;
  termsAccepted: boolean; // စည်းကမ်းချက်/တာဝန်မယူကြောင်း သဘောတူညီချက်
}

// ၃။ ပစ္စည်း အချက်အလက်
export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  inStock: boolean;
  views?: number;           // ကြည့်ရှုမှု
  wishlistCount?: number;   // Wishlist ထည့်ထားသူဦးရေ
  totalSales?: number;      // ရောင်းရအရေအတွက်
  totalRevenue?: number;    // ရရှိငွေ
  averageRating?: number;   // ပျမ်းမျှအဆင့်
  totalReviews?: number;    // သုံးသပ်ချက်အရေအတွက်
}

// 🛒 ၄.၁။ အော်ဒါထဲပါမည့် တစ်ခုချင်းစီ၏ ပစ္စည်းအချက်အလက် (အသစ်ထည့်ရန်)
export interface OrderItem {
  productId?: string;
  productTitle: string;
  price: number;
  quantity: number;
  total: number;
}

// ၄။ အော်ဒါ အချက်အလက် (Direct Merchant Delivery) - အနည်းငယ် ဖြည့်စွက်ထားသည်
export interface Order {
  id: string;
  storeId?: string;
  chatId?: string; // 👈 Chat နဲ့ ချိတ်ဆက်ရန် ထည့်သည်
  sellerId?: string; // 👈 ရောင်းသူ ID
  buyerId?: string; // 👈 ဝယ်သူ ID
  items: OrderItem[]; // 👈 ပစ္စည်းစာရင်း (တစ်ခု သို့မဟုတ် တစ်ခုထက်ပိုနိုင်သည်)
  totalAmount: number; // 👈 စုစုပေါင်းကျသင့်ငွေ
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  paymentMethod: 'CASH_ON_DELIVERY'; // အိမ်ရောက်ငွေချေ
  status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
  createdAt: any;
}

// 💬 ၅။ ချက်င်ဖောက်အတွင်း Message နှင့် Order ပို့ရန်အတွက် (အသစ်ထည့်ရန်)
export interface ChatMessage {
  id?: string;
  senderId: string;
  text: string;
  type?: 'text' | 'order'; // 👈 ပုံမှန်စာလား၊ Order Card လ่า
  orderId?: string;
  orderData?: Order;
  createdAt: any;
}

// ✅ Message Reactions
export interface MessageReaction {
  emoji: string;
  userIds: string[]; // ဘယ်သူတွေ နှိပ်ထားလဲ
}

// ✅ Extended ChatMessage
export interface ChatMessageWithReactions extends ChatMessage {
  reactions?: { [emoji: string]: string[] }; // emoji -> userId[]
  deleted?: boolean;
  deletedFor?: string[]; // ဘယ်သူတွေအတွက် ဖျက်ပြီးလဲ
}