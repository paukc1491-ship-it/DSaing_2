// src/data/Ads.ts

import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  onSnapshot, 
  doc, 
  getDoc 
} from 'firebase/firestore';

export interface AdItem {
  id: string;
  title: string;
  price: string;
  image: string;
  category: string;
  brand: string;
  location: string;
  city: string;        // 👈 ဒါထည့်ပါ
  sellerName: string;
  createdAt?: any;
  discount?: string;
  description?: string;
  sellerId?: string;
  cta?: string;
  averageRating?: number;
  totalReviews?: number;
}

// 📌 ကြော်ငြာထည့်တဲ့ပုံစံ (မှတ်သားရန်)
/*
  Firebase SDK ကိုသုံးပြီး ထည့်ပါ။
  
  import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
  
  const newAd = {
    title: "ပစ္စည်းအမည်",
    price: "45,000 MMK",
    image: "https://example.com/image.jpg",
    category: "Fashion",
    brand: "Nike",
    location: "Yangon",
    sellerName: "D Saing Store",
    sellerId: "BFc2pmh3dEN3tBWXlVXIR3Nn2Wx1",
    discount: "10% OFF",
    description: "အသေးစိတ်ဖော်ပြချက်",
    cta: "Contact Seller",
    createdAt: serverTimestamp()
  };
  
  await addDoc(collection(db, 'products'), newAd);
*/

// ✅ createdAt ကို ကိုင်တွယ်တဲ့ helper function
const getCreatedAtTime = (createdAt: any): number => {
  if (!createdAt) return 0;
  
  if (typeof createdAt === 'object' && createdAt.toDate && typeof createdAt.toDate === 'function') {
    return createdAt.toDate().getTime();
  }
  
  if (typeof createdAt === 'string') {
    const parsed = new Date(createdAt);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  
  if (typeof createdAt === 'number') {
    return createdAt;
  }
  
  return 0;
};

// 📌 Firestore Data ကိုပဲ ယူမယ် (Fallback မပါ)
export const getAds = async (category?: string): Promise<AdItem[]> => {
  try {
    const q = collection(db, 'products');
    const snapshot = await getDocs(q);
    
    const firestoreItems: AdItem[] = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      let shopAddress = '';
      let shopCity = '';      // 👈 ဒါထည့်ပါ
      let sellerName = '';
      
      if (data.sellerId) {
        try {
          const userSnap = await getDoc(doc(db, 'users', data.sellerId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            shopAddress = userData.shopAddress || '';
            shopCity = userData.shopCity || '';    // 👈 ဒါထည့်ပါ
            sellerName = userData.username || userData.displayName || '';
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      
      firestoreItems.push({
        id: docSnap.id,
        title: data.title || '',
        price: data.price || '',
        image: data.image || '',
        category: data.category || '',
        brand: data.brand || '',
        location: shopAddress,
        city: shopCity,        // 👈 ဒါထည့်ပါ
        sellerName: sellerName || data.sellerName || '',
        sellerId: data.sellerId || '',
        createdAt: data.createdAt || '',
        discount: data.discount || '',
        description: data.description || '',
        cta: data.cta || 'Contact Seller'
      });
    }
    
    if (category) {
      return firestoreItems.filter((item: AdItem) => 
        item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    return firestoreItems.sort((a: AdItem, b: AdItem) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      return timeB - timeA;
    });
    
  } catch (error) {
    console.error('Error fetching ads:', error);
    return [];
  }
};

// 📌 Real-time listener
export const listenAds = (
  callback: (items: AdItem[]) => void,
  category?: string
) => {
  const q = collection(db, 'products');
  
  return onSnapshot(q, async (snapshot) => {
    const firestoreItems: AdItem[] = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      let shopAddress = '';
      let shopCity = '';      // 👈 ဒါထည့်ပါ
      let sellerName = '';
      
      if (data.sellerId) {
        try {
          const userSnap = await getDoc(doc(db, 'users', data.sellerId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            shopAddress = userData.shopAddress || '';
            shopCity = userData.shopCity || '';    // 👈 ဒါထည့်ပါ
            sellerName = userData.username || userData.displayName || '';
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      
      firestoreItems.push({
        id: docSnap.id,
        title: data.title || '',
        price: data.price || '',
        image: data.image || '',
        category: data.category || '',
        brand: data.brand || '',
        location: shopAddress,
        city: shopCity,        // 👈 ဒါထည့်ပါ
        sellerName: sellerName || data.sellerName || '',
        sellerId: data.sellerId || '',
        createdAt: data.createdAt || '',
        discount: data.discount || '',
        description: data.description || '',
        cta: data.cta || 'Contact Seller'
      });
    }
    
    let filteredItems = firestoreItems;
    
    if (category) {
      filteredItems = firestoreItems.filter((item: AdItem) => 
        item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    const sortedItems = filteredItems.sort((a: AdItem, b: AdItem) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      return timeB - timeA;
    });
    
    callback(sortedItems);
  });
};