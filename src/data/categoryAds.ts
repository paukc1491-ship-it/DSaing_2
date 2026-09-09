// src/data/categoryAds.ts

// 📌 Category အတွက် ကြော်ငြာ (Category Ad) ထည့်တဲ့ပုံစံ (မှတ်သားရန်)
/*
  Firebase SDK ကိုသုံးပြီး ထည့်ပါ။
  
  import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
  
  const newCategoryAd = {
    category: "Fashion",
    brand: "Myanmar Streetwear Store",
    location: "Mandalay",
    title: "Retro High OG Premium Sneakers",
    price: "450,000 MMK",
    discount: "Buy 1 Get 1",
    image: "https://example.com/image.jpg",
    cta: "Claim Deal",
    createdAt: serverTimestamp(),
    isActive: true
  };
  
  await addDoc(collection(db, 'categoryAds'), newCategoryAd);
*/

import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface CategoryAd {
  id: string;
  category: string;
  brand: string;
  location: string;    // 👈 city/state → location ပြောင်းပါ
  title: string;
  price: string;
  discount: string;
  image: string;
  cta: string;
  createdAt?: any;
  isActive?: boolean;
}

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

// 📌 Firestore Data ကိုပဲ ယူမယ်
export const getCategoryAds = async (category?: string): Promise<CategoryAd[]> => {
  try {
    const q = collection(db, 'categoryAds');
    const snapshot = await getDocs(q);
    
    let ads: CategoryAd[] = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        category: doc.data().category || '',
        brand: doc.data().brand || '',
        location: doc.data().location || '',  // 👈 city/state → location
        title: doc.data().title || '',
        price: doc.data().price || '',
        discount: doc.data().discount || '',
        image: doc.data().image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop',
        cta: doc.data().cta || 'View More',
        createdAt: doc.data().createdAt || '',
        isActive: doc.data().isActive !== undefined ? doc.data().isActive : true,
      }))
      .filter((ad) => ad.isActive !== false);
    
    if (category) {
      ads = ads.filter((ad) => ad.category.toLowerCase() === category.toLowerCase());
    }
    
    return ads.sort((a: CategoryAd, b: CategoryAd) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      return timeB - timeA;
    });
    
  } catch (error) {
    console.error('Error fetching category ads:', error);
    return [];
  }
};

// 📌 Category အလိုက် ရယူခြင်း
export const getCategoryAdsByCategory = async (category: string): Promise<CategoryAd[]> => {
  return getCategoryAds(category);
};

// 📌 Real-time listener
import { onSnapshot } from 'firebase/firestore';

export const listenCategoryAds = (
  callback: (items: CategoryAd[]) => void,
  category?: string
) => {
  const q = collection(db, 'categoryAds');
  
  return onSnapshot(q, (snapshot) => {
    let ads: CategoryAd[] = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        category: doc.data().category || '',
        brand: doc.data().brand || '',
        location: doc.data().location || '',  // 👈 city/state → location
        title: doc.data().title || '',
        price: doc.data().price || '',
        discount: doc.data().discount || '',
        image: doc.data().image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop',
        cta: doc.data().cta || 'View More',
        createdAt: doc.data().createdAt || '',
        isActive: doc.data().isActive !== undefined ? doc.data().isActive : true,
      }))
      .filter((ad) => ad.isActive !== false);
    
    if (category) {
      ads = ads.filter((ad) => ad.category.toLowerCase() === category.toLowerCase());
    }
    
    const sortedAds = ads.sort((a: CategoryAd, b: CategoryAd) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      return timeB - timeA;
    });
    
    callback(sortedAds);
  });
};