// context/WishlistContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';

interface WishlistContextType {
  wishlist: string[];
  loading: boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // ✅ state ထဲထည့်

  // ✅ auth state ကို နားထောင်မယ်
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Load wishlist from Firestore
  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) {
        setWishlist([]);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setWishlist(data.wishlist || []);
        } else {
          // User doc မရှိသေးရင် ဖန်တီးမယ်
          await setDoc(docRef, { wishlist: [] });
          setWishlist([]);
        }
      } catch (error) {
        console.error('Error loading wishlist:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, [user]); // ✅ user ပြောင်းရင် ပြန်ဆွဲမယ်

  const addToWishlist = async (productId: string) => {
    if (!user) {
      alert('Please login to add to wishlist');
      return;
    }

    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        wishlist: arrayUnion(productId)
      });
      
      // ✅ Product ထဲက wishlistCount ကိုတိုးမယ်
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        wishlistCount: increment(1)
      });
      
      setWishlist(prev => [...prev, productId]);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;

    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        wishlist: arrayRemove(productId)
      });
      
      // ✅ Product ထဲက wishlistCount ကိုလျှော့မယ်
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        wishlistCount: increment(-1)
      });
      
      setWishlist(prev => prev.filter(id => id !== productId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.includes(productId);
  };

  return (
    <WishlistContext.Provider value={{
      wishlist,
      loading,
      addToWishlist,
      removeFromWishlist,
      isInWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}