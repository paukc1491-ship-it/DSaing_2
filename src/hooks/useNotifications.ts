// hooks/useNotifications.ts
'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

interface MessageNotification {
  id: string;
  chatId: string;
  message: string;
  senderId: string;
  senderName: string;
  productTitle?: string;
  read: boolean;
  timestamp: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen for new messages in user's chats
    const userChatsRef = doc(db, 'userChats', user.uid);
    const unsubscribe = onSnapshot(userChatsRef, async (snapshot) => {
      // Check for new messages
      // This will be triggered when there's a new message
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const addNotification = (notification: MessageNotification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification
  };
}