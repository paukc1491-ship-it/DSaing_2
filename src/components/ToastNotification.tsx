// components/ToastNotification.tsx
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastNotificationProps {
  message: string;
  senderName: string;
  productTitle?: string;
  onClose: () => void;
  duration?: number;
}

export default function ToastNotification({
  message,
  senderName,
  productTitle,
  onClose,
  duration = 5000
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        maxWidth: '380px',
        backgroundColor: '#121212',
        border: '1px solid #262626',
        borderRadius: '12px',
        padding: '16px 20px',
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'slideDown 0.3s ease'
      }}
    >
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#888888',
          cursor: 'pointer',
          padding: '4px'
        }}
      >
        <X size={14} />
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>💬</div>
        <div>
          <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
            {senderName}
          </div>
          {productTitle && (
            <div style={{ color: '#888888', fontSize: '12px' }}>
              {productTitle}
            </div>
          )}
          <div style={{ color: '#e3e3e3', fontSize: '13px', marginTop: '4px' }}>
            {message}
          </div>
          <div style={{ color: '#666666', fontSize: '11px', marginTop: '4px' }}>
            Tap to view
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}