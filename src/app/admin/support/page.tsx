// src/app/admin/support/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, MessageCircle, Send, Clock, CheckCircle } from 'lucide-react';

export default function AdminSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return; }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          fetchTickets();
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

  const fetchTickets = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'support_tickets'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTickets(list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleReply = async (ticketId: string) => {
    const text = replyText[ticketId];
    if (!text?.trim()) return;

    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status: 'replied',
        adminReply: text.trim(),
        repliedAt: serverTimestamp(),
      });
      setReplyText({ ...replyText, [ticketId]: '' });
      fetchTickets();
      alert('✅ Reply sent!');
    } catch (error) {
      console.error('Error replying:', error);
    }
  };

  const handleClose = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), { status: 'closed' });
      fetchTickets();
    } catch (error) {
      console.error('Error closing ticket:', error);
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

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>Support Tickets</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>User များ၏ Support Ticket များကို စီမံရန်နေရာ</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <MessageCircle size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No support tickets yet</p>
          </div>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} style={{ padding: '16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{ticket.subject || 'No Subject'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    From: {ticket.userName || ticket.userEmail || 'Unknown'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: ticket.status === 'replied' ? 'var(--success)' : ticket.status === 'closed' ? 'var(--text-muted)' : '#f59e0b' }}>
                  {ticket.status === 'replied' ? <CheckCircle size={14} /> : <Clock size={14} />}
                  {ticket.status || 'open'}
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                {ticket.message}
              </div>

              {ticket.adminReply && (
                <div style={{ padding: '10px', background: 'var(--hover-background)', borderRadius: '6px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600', marginBottom: '4px' }}>Your Reply:</div>
                  <div style={{ fontSize: '13px', color: 'var(--foreground)' }}>{ticket.adminReply}</div>
                </div>
              )}

              {ticket.status !== 'closed' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={replyText[ticket.id] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [ticket.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleReply(ticket.id)}
                    placeholder="Reply..."
                    style={{ flex: 1, padding: '8px 12px', backgroundColor: 'var(--input-background)', border: '1px solid var(--input-border)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '13px', outline: 'none' }}
                  />
                  <button onClick={() => handleReply(ticket.id)} style={{ padding: '8px 12px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
                    <Send size={14} /> Reply
                  </button>
                  <button onClick={() => handleClose(ticket.id)} style={{ padding: '8px 12px', background: 'var(--text-muted)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    Close
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}