// src/app/admin/content/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, Save, FileText, CheckCircle } from 'lucide-react';

export default function AdminContentPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'about' | 'terms' | 'privacy'>('about');

  const [content, setContent] = useState({
    about: '',
    terms: '',
    privacy: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return; }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          await fetchContent();
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchContent = async () => {
    try {
      const contentRef = doc(db, 'site_content', 'main');
      const snap = await getDoc(contentRef);
      if (snap.exists()) {
        const data = snap.data();
        setContent({
          about: data.about || '',
          terms: data.terms || '',
          privacy: data.privacy || '',
        });
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      await setDoc(doc(db, 'site_content', 'main'), {
        ...content,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setSuccess('✅ Content saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving content:', error);
      alert('❌ Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '24px', color: 'var(--foreground)' }}>Loading...</div>;
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', color: 'var(--foreground)' }}>
        <ShieldAlert size={48} color="var(--error)" />
        <h2>Access Denied</h2>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Go Home</button>
      </div>
    );
  }

  const tabs = [
    { key: 'about', label: '📖 About Us' },
    { key: 'terms', label: '📜 Terms & Conditions' },
    { key: 'privacy', label: '🔒 Privacy Policy' },
  ] as const;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>Content Management</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Site Content များကို စီမံရန်နေရာ</p>

      {success && (
        <div style={{ padding: '10px 14px', background: 'var(--card-background)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 16px',
              background: activeTab === tab.key ? 'var(--accent)' : 'var(--card-background)',
              color: activeTab === tab.key ? '#000' : 'var(--foreground)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Editor */}
      <div style={{ padding: '16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={18} color="var(--accent)" />
          <span style={{ fontSize: '14px', fontWeight: '600' }}>
            {tabs.find(t => t.key === activeTab)?.label}
          </span>
        </div>
        <textarea
          value={content[activeTab]}
          onChange={(e) => setContent({ ...content, [activeTab]: e.target.value })}
          rows={15}
          placeholder={`Enter ${activeTab} content here...`}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--input-background)',
            border: '1px solid var(--input-border)',
            borderRadius: '8px',
            color: 'var(--foreground)',
            fontSize: '14px',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: '16px',
          width: '100%',
          padding: '12px',
          background: 'var(--accent)',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '14px',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        <Save size={16} /> {saving ? 'Saving...' : 'Save Content'}
      </button>
    </div>
  );
}