// components/NotificationToggle.tsx
'use client';

import { useState, useEffect } from 'react';
import { auth, requestFCMToken, removeFCMToken } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/components/LanguageProvider';

interface NotificationToggleProps {
  label?: string;
  checked?: boolean;
  onChange?: () => void;
  description?: string;
}

export default function NotificationToggle({
  label,
  checked: propChecked,
  onChange: propOnChange,
  description
}: NotificationToggleProps) {
  const { t } = useLanguage();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkNotificationStatus = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const tokens = data.fcmTokens || [];
          setIsEnabled(tokens.length > 0);
        }
      } catch (error) {
        console.error('Error checking notification status:', error);
      }
      setLoading(false);
    };
    
    checkNotificationStatus();
  }, []);

  const toggleNotification = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    if (isEnabled) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          const tokens = data.fcmTokens || [];
          for (const token of tokens) {
            await removeFCMToken(user.uid, token);
          }
        }
        setIsEnabled(false);
        if (propOnChange) propOnChange();
      } catch (error) {
        console.error('Error disabling notifications:', error);
      }
    } else {
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Please allow notifications in your browser settings.');
          return;
        }
      }
      const token = await requestFCMToken(user.uid);
      if (token) {
        setIsEnabled(true);
        if (propOnChange) propOnChange();
      } else {
        alert('Failed to enable notifications. Please try again.');
      }
    }
  };

  const displayLabel = label || (t ? t('settings.notifications') : 'Push Notifications');
  const displayDescription = description || (t ? t('settings.notificationsDesc') : 'Receive push notifications for new messages');

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--card-background)',
        borderRadius: '8px',
        border: '1px solid var(--card-border)',
      }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</span>
      </div>
    );
  }

  return (
    <div
      onClick={toggleNotification}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--card-background)',
        borderRadius: '8px',
        border: '1px solid var(--card-border)',
        cursor: 'pointer',
        transition: 'border-color 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--card-border)';
      }}
    >
      <div>
        <div style={{ color: 'var(--foreground)', fontSize: '13px', fontWeight: '500' }}>
          🔔 {displayLabel}
        </div>
        {displayDescription && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
            {displayDescription}
          </div>
        )}
      </div>
      <div
        style={{
          width: '44px',
          height: '24px',
          backgroundColor: isEnabled ? 'var(--accent)' : 'var(--text-muted)',
          borderRadius: '12px',
          position: 'relative',
          transition: 'background 0.3s ease',
          flexShrink: 0,
          boxShadow: isEnabled ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none'
        }}
      >
        <div
          style={{
            width: '18px',
            height: '18px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            position: 'absolute',
            top: '3px',
            left: isEnabled ? '23px' : '3px',
            transition: 'left 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        />
      </div>
    </div>
  );
}