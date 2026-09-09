// app/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { auth, requestFCMToken, listenForMessages, db, serverTimestamp } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './globals.css';
import LanguageProvider, { Language } from '@/components/LanguageProvider';
import ToastNotification from '@/components/ToastNotification';
import { SessionProvider } from '@/context/SessionContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { doc, updateDoc } from 'firebase/firestore';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ✅ State တွေထည့်ပါ
  const [language, setLanguage] = useState<Language>('en');
  const [toast, setToast] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Auth State & Notification Listener & Online Status & Heartbeat
  useEffect(() => {
    let currentUserId: string | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null; // Heartbeat Timer အတွက်

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // User ပြောင်းသွားရင် (သို့) Logout ဖြစ်ရင် အရင် Timer ကို ရှင်းလင်းပါ
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      if (user) {
        currentUserId = user.uid;
        try {
          setLanguage('en');

          // 🛠️ 1. User ဝင်လာသည်နှင့် online: true လုပ်ရန်
          await updateDoc(doc(db, 'users', user.uid), {
            online: true,
            lastSeen: serverTimestamp(),
          });

          // 🛠️ 2. Heartbeat: အပလီကေးရှင်းဖွင့်ထားစဉ် ၃၀ စက္ကန့်တစ်ကြိမ် lastSeen ကို update လုပ်နေမည်
          heartbeatInterval = setInterval(async () => {
            if (auth.currentUser) {
              await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                lastSeen: serverTimestamp(),
                online: true,
              }).catch(() => {});
            }
          }, 30000); // ၃၀ စက္ကန့် တစ်ကြိမ်

          try {
            await requestFCMToken(user.uid);
            
            listenForMessages((payload) => {
              console.log('📨 Foreground message:', payload);
              
              const title = payload.notification?.title || payload.data?.title || 'မက်ဆေ့ခ်ျအသစ်';
              const body = payload.notification?.body || payload.data?.body || 'မှာယူမှုအသစ် ရောက်ရှိပါပြီ';
              const senderName = payload.data?.senderName || '';
              
              if (payload.notification) {
                new Notification(payload.notification.title || 'New Message', {
                  body: payload.notification.body || '',
                  icon: '/logo.png'
                });
              }
              
              setToast({
                title: title,
                body: body,
                senderName: senderName,
              });
            });
            
          } catch (error) {
            console.warn('FCM token request failed:', error);
          }
        } catch (error) {
          console.error('Error initializing notifications:', error);
        }
      } else {
        // User ထွက်သွား/Logout ဖြစ်သွားပါက
        if (currentUserId) {
          await updateDoc(doc(db, 'users', currentUserId), {
            online: false,
            lastSeen: serverTimestamp(),
          }).catch(() => {});
        }
      }
      setIsLoading(false);
    });

    // 🛠️ 3. Browser Tab ပိတ်လိုက် (သို့မဟုတ်) Website ကနေ ထွက်သွားချိန် online: false ဖြစ်ရန်
    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          online: false,
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval); // Component unmount ဖြစ်ရင် timer ရှင်းရန်
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // ✅ Service Worker Register
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((reg) => console.log('✅ FCM/PWA Service Worker registered:', reg))
        .catch((err) => console.log('❌ Service Worker registration failed:', err));
    }
  }, []);

  const headElements = (
    <>
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#000000" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="D Saing" />
      <meta name="mobile-web-app-capable" content="yes" />
      <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      <link rel="icon" href="/icons/icon-192x192.png" />
      <link rel="service-worker" href="/firebase-messaging-sw.js" />
    </>
  );

  if (isLoading) {
    return (
      <html lang="en">
        <head>{headElements}</head>
        <body>
          <div style={{
            minHeight: '100vh',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            Loading...
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>{headElements}</head>
      <body>
        <ThemeProvider>
          <SessionProvider>
            <WishlistProvider>
              <LanguageProvider initialLanguage={language}>
                {children}
                {toast && (
                  <ToastNotification
                    message={toast.body}
                    senderName={toast.senderName || toast.title}
                    onClose={() => setToast(null)}
                    duration={5000}
                  />
                )}
              </LanguageProvider>
            </WishlistProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}