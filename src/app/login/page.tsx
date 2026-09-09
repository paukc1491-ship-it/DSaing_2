'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      // Firebase auth error codes များအတွက် ပိုမိုပြည့်စုံစွာ စစ်ဆေးပေးခြင်း
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetMessage('');

    if (!email.trim()) {
      setError('Enter your email address to reset your password.');
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetMessage('Password reset email sent. Check your inbox to continue.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account was found for this email address.');
      } else {
        setError(err.message || 'Unable to send password reset email');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#121212',
          border: '1px solid #262626',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '420px',
          width: '100%'
        }}
      >
        <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0' }}>
          Welcome Back
        </h1>
        <p style={{ color: '#888888', fontSize: '14px', margin: '0 0 24px 0' }}>
          Login to your D Saing account
        </p>

        {error && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px'
            }}
          >
            <span style={{ color: '#ef4444', fontSize: '13px' }}>{error}</span>
          </div>
        )}

        {resetMessage && (
          <div
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #22c55e',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px'
            }}
          >
            <span style={{ color: '#22c55e', fontSize: '13px' }}>{resetMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#888888', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1a1a1a',
                border: '1px solid #262626',
                borderRadius: '8px',
                padding: '10px 14px'
              }}
            >
              <Mail size={18} style={{ color: '#666666', marginRight: '10px' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  width: '100%'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#888888', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1a1a1a',
                border: '1px solid #262626',
                borderRadius: '8px',
                padding: '10px 14px'
              }}
            >
              <Lock size={18} style={{ color: '#666666', marginRight: '10px' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  width: '100%'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#666666',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: '20px', marginTop: '-10px' }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading || resetLoading}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                fontSize: '13px',
                padding: 0,
                opacity: resetLoading ? 0.6 : 1
              }}
            >
              {resetLoading ? 'Sending reset email...' : 'Forgot Password?'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#ffffff',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <span style={{ color: '#888888', fontSize: '14px' }}>
            Don't have an account?{' '}
            <a
              href="/signup"
              style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '500' }}
            >
              Sign Up
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}