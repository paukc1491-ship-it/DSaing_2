'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Loader2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { uploadToCloudinary } from '@/lib/cloudinary';

export default function ProfilePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    shopName: '',
    shopAddress: '',
    shopPhone: '',
    shopDescription: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserData(data);
          setPhotoURL(data.photoURL || null);
          setFormData({
            username: data.username || data.displayName || '',
            shopName: data.shopName || '',
            shopAddress: data.shopAddress || '',
            shopPhone: data.shopPhone || '',
            shopDescription: data.shopDescription || ''
          });
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageUpload = async (file: File) => {
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const downloadURL = await uploadToCloudinary(file);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL
      });

      setPhotoURL(downloadURL);
      setUserData((prev: any) => ({ ...prev, photoURL: downloadURL }));
      alert('✅ Profile picture updated successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert(t('Upload Error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;

    setSaving(true);
    setProfileMessage('');
    setProfileError('');

    try {
      const username = formData.username.trim();
      if (username.length < 2) {
        throw new Error('Username must be at least 2 characters');
      }

      const updateData = {
        username,
        displayName: username,
        ...(userData.role === 'seller' ? {
          shopName: formData.shopName.trim(),
          shopAddress: formData.shopAddress.trim(),
          shopPhone: formData.shopPhone.trim(),
          shopDescription: formData.shopDescription.trim()
        } : {})
      };

      await updateDoc(doc(db, 'users', user.uid), updateData);
      setUserData((current: any) => ({ ...current, ...updateData }));
      setFormData((current) => ({ ...current, username }));
      setProfileMessage('Profile saved successfully.');
    } catch (error: any) {
      console.error('Profile save error:', error);
      setProfileError(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--foreground)'
      }}>
        {t('common.loading')}
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--foreground)'
      }}>
        {t('User Not Found')}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <ArrowLeft size={20} />
        </Link>

        <div style={{
          backgroundColor: 'var(--card-background)',
          border: '1px solid var(--card-border)',
          borderRadius: '16px',
          padding: '32px'
        }}>
          {/* Profile Header */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            gap: '16px', 
            marginBottom: '24px' 
          }}>
            {/* Avatar with Upload Button */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--hover-background)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  fontWeight: '700',
                  color: 'var(--foreground)',
                  border: `3px solid ${userData.role === 'seller' ? '#FFD700' : 'var(--accent)'}`,
                  overflow: 'hidden'
                }}
              >
                {photoURL ? (
                  <img 
                    src={photoURL} 
                    alt={userData.username || 'User'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  userData.username?.charAt(0).toUpperCase() || 'U'
                )}
              </div>

              {/* Upload Button Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  display: 'flex',
                  gap: '4px'
                }}
              >
                {/* Choose Image Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    backgroundColor: 'var(--card-background)',
                    border: '2px solid var(--card-border)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploading ? 'default' : 'pointer',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Upload size={14} />
                </button>

                {/* Camera Button */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    backgroundColor: 'var(--card-background)',
                    border: '2px solid var(--card-border)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploading ? 'default' : 'pointer',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  {uploading ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Camera size={14} />
                  )}
                </button>
              </div>

              {/* Hidden File Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h1 style={{ color: 'var(--foreground)', fontSize: '28px', fontWeight: '700', margin: 0 }}>
                {userData.username || t('User')}
              </h1>
              <span style={{
                color: userData.role === 'seller' ? '#FFD700' : 'var(--accent)',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                {userData.role === 'seller' ? '🛒 ' + t('sidebar.seller') : '👤 ' + t('sidebar.buyer')}
              </span>
            </div>
          </div>

          {/* Profile Details */}
          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '18px' }}>💼</span>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{t('Role')}</div>
                <div style={{ color: 'var(--foreground)', fontSize: '16px' }}>
                  {userData.role === 'seller' ? t('Seller') : t('Buyer')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>📅</span>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{t('Member Since')}</div>
                <div style={{ color: 'var(--foreground)', fontSize: '16px' }}>
                  {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--accent)',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              {t('Go Home')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}