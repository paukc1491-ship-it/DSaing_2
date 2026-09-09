// components/EmojiPicker.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface EmojiPickerComponentProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPickerComponent({ 
  onEmojiSelect, 
  onClose 
}: EmojiPickerComponentProps) {
  const [isDark, setIsDark] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Theme ကို detect လုပ်မယ်
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setIsDark(theme === 'dark');
  }, []);

  // Click outside ကိုပိတ်မယ်
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    onClose();
  };

  return (
    <div 
      ref={pickerRef}
      style={{
        position: 'absolute',
        bottom: '60px',
        left: '0',
        zIndex: 50,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
    >
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        theme={isDark ? Theme.DARK : Theme.LIGHT}
        searchPlaceholder="Search emoji..."
        width="320px"
        height="400px"
      />
    </div>
  );
}