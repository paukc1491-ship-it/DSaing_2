// hooks/useTyping.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { setTypingStatus, listenTypingStatus } from '@/lib/chat';
import { auth } from '@/lib/firebase';

interface UseTypingProps {
  chatId: string;
  enabled?: boolean;
}

export function useTyping({ chatId, enabled = true }: UseTypingProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUser = auth.currentUser;

  // ✅ တစ်ဖက်လူရဲ့ Typing Status ကို နားထောင်မယ်
  useEffect(() => {
    if (!chatId || !currentUser || !enabled) return;

    const unsubscribe = listenTypingStatus(
      chatId,
      currentUser.uid,
      (isTyping, userId) => {
        setIsTyping(isTyping);
        setTypingUserId(isTyping ? userId : null);
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUser, enabled]);

  // ✅ ကိုယ်တိုင် Typing လုပ်နေတယ်ဆိုတဲ့ Status ကို Update လုပ်မယ်
  const startTyping = useCallback(() => {
    if (!chatId || !currentUser) return;

    // နောက်ဆုံး typing ကို update လုပ်မယ်
    setTypingStatus(chatId, currentUser.uid, true);

    // 5 စက္ကန့်ကြာရင် typing ရပ်သွားမယ်
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 5000);
  }, [chatId, currentUser]);

  const stopTyping = useCallback(() => {
    if (!chatId || !currentUser) return;
    
    setTypingStatus(chatId, currentUser.uid, false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [chatId, currentUser]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Component unmount ဖြစ်ရင် typing status ကိုဖျက်မယ်
      if (chatId && currentUser) {
        setTypingStatus(chatId, currentUser.uid, false);
      }
    };
  }, [chatId, currentUser]);

  return {
    isTyping,
    typingUserId,
    startTyping,
    stopTyping
  };
}