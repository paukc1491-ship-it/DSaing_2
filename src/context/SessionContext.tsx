// src/context/SessionContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { signOut, EmailAuthProvider, signInWithCredential } from 'firebase/auth';
import SessionLockModal from '@/components/SessionLockModal';

interface SessionContextType {
  isLocked: boolean;
  lockSession: () => void;
  unlockSession: (password: string) => Promise<boolean>;
  resetTimer: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      lockSession();
    }, SESSION_TIMEOUT);
  };

  const lockSession = () => {
    if (!auth.currentUser) return;
    setIsLocked(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const unlockSession = async (password: string): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return false;
      
      // ✅ Re-authenticate with password
      const credential = EmailAuthProvider.credential(user.email, password);
      await signInWithCredential(auth, credential);
      
      setIsLocked(false);
      resetTimer();
      return true;
    } catch (error) {
      console.error('Unlock failed:', error);
      return false;
    }
  };

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => {
      if (!isLocked) {
        resetTimer();
      }
    };
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });
    
    resetTimer();
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLocked]);

  return (
    <SessionContext.Provider value={{ isLocked, lockSession, unlockSession, resetTimer }}>
      {children}
      {isLocked && <SessionLockModal onUnlock={unlockSession} />}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}