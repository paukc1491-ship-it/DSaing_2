// components/ChatList.tsx
'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { listenUserChats, ChatRoom } from '@/lib/chat';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface ChatListProps {
  onChatSelect?: (chatId: string) => void;
}

export default function ChatList({ onChatSelect }: ChatListProps) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<string>('en');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribeLang = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.language) {
          setLanguage(data.language);
        }
      }
    });

    return () => unsubscribeLang();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeChats = listenUserChats(user.uid, (chatRooms) => {
      console.log('✅ Chats loaded:', chatRooms.length);
      setChats(chatRooms);
      setLoading(false);
    });

    return () => {
      unsubscribeChats();
    };
  }, [user]);

  const formatChatTime = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      if (msgDate.getTime() === today.getTime()) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      
      if (msgDate.getTime() === yesterday.getTime()) {
        return 'Yesterday';
      }
      
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      my: {
        'No messages yet': 'စာမရှိသေးပါ',
        'Unnamed Chat': 'အမည်မသိ စကားပြောခန်း',
        'Loading...': 'ဝင်နေသည်...',
        'Yesterday': 'မနေ့က',
      },
      en: {
        'No messages yet': 'No messages yet',
        'Unnamed Chat': 'Unnamed Chat',
        'Loading...': 'Loading...',
        'Yesterday': 'Yesterday',
      }
    };
    return translations[language]?.[key] || translations.en[key] || key;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {t('Loading...')}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
        <p>{t('No messages yet')}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {chats.map((chat) => {
        const displayName = chat.otherUserName || t('Unnamed Chat');
        const displayPhoto = chat.otherUserPhoto || null;
        const hasUnread = chat.unreadCount > 0;
        const timeString = formatChatTime(chat.lastMessageTime);

        return (
          <div
            key={chat.id}
            onClick={() => {
              if (onChatSelect) {
                onChatSelect(chat.id);
              } else {
                router.push(`/messages/${chat.id}`);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: hasUnread ? 'var(--card-background)' : 'var(--background)',
              borderRadius: '12px',
              border: hasUnread ? '2px solid var(--accent)' : '1px solid var(--card-border)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-background)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = hasUnread ? 'var(--card-background)' : 'var(--background)';
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt={displayName}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: hasUnread ? '2px solid var(--accent)' : '2px solid var(--card-border)'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=38bdf8&color=ffffff&size=48';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: hasUnread ? 'var(--card-background)' : 'var(--hover-background)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: hasUnread ? 'var(--accent)' : 'var(--foreground)',
                    fontSize: '20px',
                    fontWeight: '600',
                    border: hasUnread ? '2px solid var(--accent)' : '2px solid var(--card-border)'
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              
              {hasUnread && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: 'var(--accent)',
                    color: '#000000',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '18px',
                    textAlign: 'center'
                  }}
                >
                  {chat.unreadCount}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ 
                  color: 'var(--foreground)', 
                  fontSize: '14px', 
                  fontWeight: hasUnread ? '700' : '600',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '60%'
                }}>
                  {displayName}
                </div>
                
                {timeString && (
                  <div style={{
                    color: hasUnread ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: '10px',
                    flexShrink: 0,
                    fontWeight: hasUnread ? '500' : '400'
                  }}>
                    {timeString}
                  </div>
                )}
              </div>
              
              <div style={{ 
                color: hasUnread ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '12px', 
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: hasUnread ? '500' : '400'
              }}>
                {chat.lastMessage || t('No messages yet')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}