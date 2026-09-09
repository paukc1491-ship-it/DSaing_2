// components/NotificationProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface Notification {
  id: string;
  chatId: string;
  message: string;
  senderId: string;
  senderName: string;
  productTitle?: string;
  read: boolean;
  timestamp: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Listen for new messages (notifications)
  useEffect(() => {
    if (!user) return;

    // Listen to user's chats
    const userChatsRef = doc(db, 'userChats', user.uid);
    const unsubscribe = onSnapshot(userChatsRef, (snapshot) => {
      // This will be triggered when there's a new message
      // We'll handle this in the ChatList component
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

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}