// components/EmojiButton.tsx
'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import EmojiPickerComponent from './EmojiPicker';

interface EmojiButtonProps {
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiButton({ onEmojiSelect }: EmojiButtonProps) {
  const [showPicker, setShowPicker] = useState(false);

  const togglePicker = () => {
    setShowPicker(!showPicker);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={togglePicker}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--hover-background)';
          e.currentTarget.style.color = 'var(--foreground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
        type="button"
      >
        <Smile size={22} />
      </button>

      {showPicker && (
        <EmojiPickerComponent
          onEmojiSelect={onEmojiSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}