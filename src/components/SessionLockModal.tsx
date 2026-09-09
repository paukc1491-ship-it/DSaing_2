// src/components/SessionLockModal.tsx
'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

interface SessionLockModalProps {
  onUnlock: (password: string) => Promise<boolean>;
}

export default function SessionLockModal({ onUnlock }: SessionLockModalProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');
    
    const success = await onUnlock(password);
    if (!success) {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#121212',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '400px',
          width: '100%',
          border: '1px solid #262626',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Lock size={32} style={{ color: '#38bdf8' }} />
          </div>
          <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: 0 }}>
            Session Locked
          </h2>
          <p style={{ color: '#888888', fontSize: '14px', marginTop: '8px' }}>
            Your session has been locked for security. Please enter your password to continue.
          </p>
        </div>

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#1a1a1a',
            border: error ? '2px solid #ef4444' : '1px solid #262626',
            color: '#ffffff',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          autoFocus
        />

        {error && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleUnlock}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#38bdf8',
            border: 'none',
            color: '#000000',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            marginTop: '16px',
          }}
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>

        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#888888',
            fontSize: '13px',
            cursor: 'pointer',
            marginTop: '12px',
            textDecoration: 'underline',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}