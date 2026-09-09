// app/messages/[chatId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ChatRoom from '@/components/ChatRoom';
import { ArrowLeft } from 'lucide-react';

export default function ChatRoomPage() {
  const { chatId } = useParams();
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<'user' | 'seller' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const role = userSnap.data().role || 'user';
            setUserRole(role);
          } else {
            setUserRole('user');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('user');
        }
      } else {
        setCurrentUserId('');
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--background)'
      }}>
        Loading...
      </div>
    );
  }

  if (!chatId) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--background)'
      }}>
        Chat not found
      </div>
    );
  }

  return (
    // ✅ ဒီ Container က Background ကို သတ်မှတ်ပေးထားတယ်
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'var(--background)'  // ✅ ဒါက Dark/Light Mode အတိုင်းလိုက်မယ်
    }}>
      {/* ✅ Header - Back Button ပါတဲ့ အပေါ်ဘက် */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: 'var(--card-background)',  // ✅ ဒါက Mode အတိုင်းလိုက်မယ်
        borderBottom: '1px solid var(--card-border)',
        flexShrink: 0
      }}>
        <button
          onClick={() => router.back()}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--foreground)',  // ✅ ဒါက Mode အတိုင်းလိုက်မယ်
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <span style={{
          color: 'var(--text-primary)',
          fontSize: '16px',
          fontWeight: '600',
          marginLeft: '8px'
        }}>
          Chat Room
        </span>
      </div>

      {/* ChatRoom Component */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatRoom
          chatId={chatId as string}
          currentUserId={currentUserId}
          userRole={userRole}
        />
      </div>
    </div>
  );
}