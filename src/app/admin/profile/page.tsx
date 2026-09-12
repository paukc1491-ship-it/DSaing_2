// app/admin/profile/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { uploadToCloudinary } from '@/lib/cloudinary';

export default function AdminProfilePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);

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
          
          // Check if user is admin
          if (data.role !== 'admin') {
            router.push('/');
          }
        } else {
          router.push('/profile');
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
      alert('✅ Admin profile picture updated successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload Error');
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
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Link href="/admin/payments" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <ArrowLeft size={20} /> Back to Payments
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
                  border: '3px solid #ef4444',
                  overflow: 'hidden'
                }}
              >
                {photoURL ? (
                  <img 
                    src={photoURL} 
                    alt={userData.username || 'Admin'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  userData.username?.charAt(0).toUpperCase() || 'A'
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
                    color: 'var(--text-secondary)'
                  }}
                >
                  <Upload size={14} />
                </button>

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
                    color: 'var(--text-secondary)'
                  }}
                >
                  {uploading ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Camera size={14} />
                  )}
                </button>
              </div>

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
                {userData.username || 'Admin'}
              </h1>
              <span style={{
                color: '#ef4444',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                🛡️ Administrator
              </span>
            </div>
          </div>

          {/* Profile Details */}
          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '18px' }}>💼</span>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Role</div>
                <div style={{ color: 'var(--foreground)', fontSize: '16px' }}>Admin</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>📅</span>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Member Since</div>
                <div style={{ color: 'var(--foreground)', fontSize: '16px' }}>
                  {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>
            <button
              onClick={() => router.push('/admin/payments')}
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
              Go to Payment Approvals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}