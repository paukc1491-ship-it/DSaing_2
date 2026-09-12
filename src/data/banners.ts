// src/data/banners.ts
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

export interface Banner {
  id: string;
  brand: string;
  title: string;
  image: string;
  discount: string;
  cta: string;
  location?: string;
  city?: string;
  state?: string;
  targetSellerId?: string;   // ✅ Seller ID
  productId?: string;        // ✅ Product ID
  createdAt?: any;
  isActive?: boolean;
}

const getCreatedAtTime = (createdAt: any): number => {
  if (!createdAt) return 0;
  if (typeof createdAt === 'object' && createdAt.toDate && typeof createdAt.toDate === 'function') {
    return createdAt.toDate().getTime();
  }
  if (typeof createdAt === 'string') {
    const parsed = new Date(createdAt);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  if (typeof createdAt === 'number') return createdAt;
  return 0;
};

const mapDocToBanner = (doc: any): Banner => {
  const data = doc.data();
  const location = data.location
    || [data.city, data.state].filter(Boolean).join(', ')
    || '';

  return {
    id: doc.id,
    brand: data.brand || '',
    title: data.title || '',
    image: data.image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop',
    discount: data.discount || '',
    cta: data.cta || 'Shop Now',
    location,
    city: data.city || '',
    state: data.state || '',
    targetSellerId: data.targetSellerId || '',  // ✅
    productId: data.productId || '',            // ✅
    createdAt: data.createdAt || '',
    isActive: data.isActive !== undefined ? data.isActive : true,
  };
};

export const getBanners = async (): Promise<Banner[]> => {
  try {
    const q = collection(db, 'banners');
    const snapshot = await getDocs(q);
    const banners: Banner[] = snapshot.docs
      .map(mapDocToBanner)
      .filter((banner) => banner.isActive !== false);
    return banners.sort((a, b) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    return [];
  }
};

export const listenBanners = (
  callback: (items: Banner[]) => void
) => {
  const q = collection(db, 'banners');
  return onSnapshot(q, (snapshot) => {
    const banners: Banner[] = snapshot.docs
      .map(mapDocToBanner)
      .filter((banner) => banner.isActive !== false);
    const sortedBanners = banners.sort((a, b) => {
      const timeA = getCreatedAtTime(a.createdAt);
      const timeB = getCreatedAtTime(b.createdAt);
      return timeB - timeA;
    });
    callback(sortedBanners);
  });
};