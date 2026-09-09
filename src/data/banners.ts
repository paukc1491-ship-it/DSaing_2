// src/data/banners.ts

// 📌 ကြော်ငြာ (Banner) ထည့်တဲ့ပုံစံ (မှတ်သားရန်)
/*Firebase SDK ကိုသုံးပြီး ထည့်ပါ။
  
  import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
  
  const newBanner = {
    brand: "Grand Thingyan Mega Sale",
    location: "Yangon",
    title: "Up to 50% OFF on All Tech & Fashion Brands",
    discount: "Mega Deal",
    image: "https://example.com/banner.jpg",
    cta: "Shop The Sale",
    createdAt: serverTimestamp(),
    isActive: true
  };
  
  await addDoc(collection(db, 'banners'), newBanner);
*/

import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface Banner {
  id: string;
  brand: string;
  city: string;
  state: string;
  title: string;
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
export const getBanners = async (): Promise<Banner[]> => {
  try {
    const q = collection(db, 'banners');
    const snapshot = await getDocs(q);
    
    const banners: Banner[] = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        brand: doc.data().brand || '',
        city: doc.data().city || '',
        state: doc.data().state || '',
        title: doc.data().title || '',
        discount: doc.data().discount || '',
        image: doc.data().image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop',
        cta: doc.data().cta || 'View More',
        createdAt: doc.data().createdAt || '',
        isActive: doc.data().isActive !== undefined ? doc.data().isActive : true,
      }))
      .filter((banner) => banner.isActive !== false); // isActive: true ဖြစ်တဲ့ဟာတွေပဲ ပြမယ်
    
    return banners.sort((a: Banner, b: Banner) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      return timeB - timeA;
    });
    
  } catch (error) {
    console.error('Error fetching banners:', error);
    return []; // ❌ ပျက်ရင် ဘာမှမပြပါနဲ့
  }
};

// 📌 Real-time listener
import { onSnapshot } from 'firebase/firestore';

export const listenBanners = (
  callback: (items: Banner[]) => void
) => {
  const q = collection(db, 'banners');
  
  return onSnapshot(q, (snapshot) => {
    const banners: Banner[] = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        brand: doc.data().brand || '',
        city: doc.data().city || '',
        state: doc.data().state || '',
        title: doc.data().title || '',
        discount: doc.data().discount || '',
        image: doc.data().image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop',
        cta: doc.data().cta || 'View More',
        createdAt: doc.data().createdAt || '',
        isActive: doc.data().isActive !== undefined ? doc.data().isActive : true,
      }))
      .filter((banner) => banner.isActive !== false);
    
    const sortedBanners = banners.sort((a: Banner, b: Banner) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      return timeB - timeA;
    });
    
    callback(sortedBanners);
  });
};