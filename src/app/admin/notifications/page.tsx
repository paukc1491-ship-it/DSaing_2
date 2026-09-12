// src/app/admin/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, Bell, Send, Users, Store } from 'lucide-react';

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'users' | 'sellers'>('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return; }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          fetchHistory();
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

  const fetchHistory = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'admin_notifications'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      alert('Title နဲ့ Body ထည့်ပါ');
      return;
    }

    setSending(true);
    try {
      // ၁။ Target Users ရှာပါ
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      let targetUsers: any[] = [];
      if (target === 'all') {
        targetUsers = allUsers;
      } else if (target === 'users') {
        targetUsers = allUsers.filter((u: any) => u.role === 'user');
      } else if (target === 'sellers') {
        targetUsers = allUsers.filter((u: any) => u.role === 'seller' || u.role === 'VENDOR');
      }

      // ၂။ Notification ပို့ပါ
      let successCount = 0;
      for (const u of targetUsers) {
        try {
          const res = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: u.id,
              title,
              body,
              link: '/',
            }),
          });
          if (res.ok) successCount++;
        } catch (err) {
          console.error(`Failed to send to ${u.id}:`, err);
        }
      }

      // ၃။ History မှာ သိမ်းပါ
      await addDoc(collection(db, 'admin_notifications'), {
        title,
        body,
        target,
        recipientCount: successCount,
        totalTargeted: targetUsers.length,
        createdAt: serverTimestamp(),
      });

      alert(`✅ Notification ပို့ပြီးပါပြီ (${successCount}/${targetUsers.length})`);
      setTitle('');
      setBody('');
      fetchHistory();
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('❌ Notification ပို့မရပါ');
    } finally {
      setSending(false);
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

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--input-background)',
    border: '1px solid var(--input-border)',
    borderRadius: '8px',
    color: 'var(--foreground)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>Notification Management</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>User များထံ Notification ပို့ရန်နေရာ</p>

      {/* Send Form */}
      <div style={{ padding: '16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '12px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} color="var(--accent)" /> Send Notification
        </h3>

        <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        <textarea placeholder="Message body..." value={body} onChange={(e) => setBody(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Target Audience</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setTarget('all')} style={{ flex: 1, padding: '10px', background: target === 'all' ? 'var(--accent)' : 'var(--input-background)', color: target === 'all' ? '#000' : 'var(--foreground)', border: '1px solid var(--card-border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              🌐 All
            </button>
            <button type="button" onClick={() => setTarget('users')} style={{ flex: 1, padding: '10px', background: target === 'users' ? 'var(--accent)' : 'var(--input-background)', color: target === 'users' ? '#000' : 'var(--foreground)', border: '1px solid var(--card-border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Users size={14} /> Buyers
            </button>
            <button type="button" onClick={() => setTarget('sellers')} style={{ flex: 1, padding: '10px', background: target === 'sellers' ? 'var(--accent)' : 'var(--input-background)', color: target === 'sellers' ? '#000' : 'var(--foreground)', border: '1px solid var(--card-border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Store size={14} /> Sellers
            </button>
          </div>
        </div>

        <button onClick={handleSend} disabled={sending} style={{ padding: '12px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: sending ? 0.6 : 1 }}>
          <Send size={16} /> {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </div>

      {/* History */}
      <h3 style={{ marginBottom: '12px' }}>📜 History</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>No notifications sent yet</div>
        ) : (
          history.map(h => (
            <div key={h.id} style={{ padding: '12px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{h.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{h.body}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Target: {h.target} | Sent: {h.recipientCount}/{h.totalTargeted}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}