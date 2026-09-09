// lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import * as messagingModule from 'firebase/messaging';

// ✅ ခင်ဗျားရဲ့ Firebase Config ကို ထည့်ပါ
const firebaseConfig = {
  apiKey: "AIzaSyDZp2yLittnCqMuynDJE-YZcgWdAxmymwo",
  authDomain: "d-saing-chat.firebaseapp.com",
  databaseURL: "https://d-saing-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "d-saing-chat",
  storageBucket: "d-saing-chat.firebasestorage.app",
  messagingSenderId: "533173820233",
  appId: "1:533173820233:web:93361cab4873f791991898",
  measurementId: "G-W63WPRF433"
};

// App ကို initialize လုပ်
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestore instance ကို ရယူ
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// ✅ Messaging Instance ကို Cache လုပ်မယ်
let messagingInstance: any = null;
let isMessagingSupported: boolean | null = null;

export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  
  if (isMessagingSupported === null) {
    try {
      isMessagingSupported = await messagingModule.isSupported();
    } catch {
      isMessagingSupported = false;
    }
  }
  
  if (!isMessagingSupported) return null;
  
  if (!messagingInstance) {
    try {
      messagingInstance = messagingModule.getMessaging(app);
    } catch (error) {
      console.error('❌ Failed to get messaging instance:', error);
      return null;
    }
  }
  return messagingInstance;
};

// ✅ FCM Token ရယူရန် Function
export const requestFCMToken = async (userId: string) => {
  if (typeof window === 'undefined') return null;

  if (Notification.permission === 'denied') {
    console.warn('⚠️ Notification permission is blocked');
    return null;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission not granted');
      return null;
    }
  }

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('⚠️ Messaging not supported');
      return null;
    }

    let registration: ServiceWorkerRegistration | null = null;
    if ('serviceWorker' in navigator) {
      try {
        const existingReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (existingReg) {
          registration = existingReg;
          console.log('✅ Existing FCM Service Worker found');
        } else {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('✅ FCM Service Worker registered');
        }
      } catch (swError) {
        console.warn('⚠️ FCM Service Worker registration failed:', swError);
      }
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';
    if (!vapidKey) {
      console.warn('⚠️ VAPID key is missing');
      return null;
    }

    let token: string;
    if (registration) {
      token = await (messagingModule as any).getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: registration 
      });
    } else {
      token = await (messagingModule as any).getToken(messaging, { vapidKey });
    }

    if (token) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { 
        fcmTokens: arrayUnion(token) 
      }, { merge: true });
      console.log('✅ FCM Token saved:', token);
      return token;
    } else {
      console.log('ℹ️ No FCM token received');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

// ✅ FCM Token ကို ဖယ်ရှားရန် Function
export const removeFCMToken = async (userId: string, token: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(token)
    });
    console.log('✅ FCM Token removed');
  } catch (error) {
    console.error('❌ Error removing FCM token:', error);
  }
};

// ✅ Foreground Message Listener
export const listenForMessages = async (callback: (payload: any) => void) => {
  if (typeof window === 'undefined') return;
  
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('⚠️ Messaging not supported, cannot listen for messages');
      return;
    }
    
    messagingModule.onMessage(messaging, (payload) => {
      console.log('📱 Foreground message received:', payload);
      callback(payload);
    });
  } catch (error) {
    console.error('❌ Error listening for messages:', error);
  }
};

// ✅ Notification Permission စစ်ရန် Helper
export const checkNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  if (Notification.permission === 'granted') return true;
  
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  
  return false;
};

// Export functions
export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  limit,
  arrayUnion,
  arrayRemove,
};

export type {
  DocumentData,
  QueryDocumentSnapshot,
  DocumentSnapshot,
};