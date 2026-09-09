// components/ThemeToggle.tsx
'use client';

import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        backgroundColor: 'transparent',
        border: 'none',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1a1a1a' : '#e5e5e5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={20} style={{ color: '#F59E0B' }} />
      ) : (
        <Moon size={20} style={{ color: '#38bdf8' }} />
      )}
    </button>
  );
}