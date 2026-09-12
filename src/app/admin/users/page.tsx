// src/app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, Search, UserX, UserCheck, Trash2, Mail, Phone } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/');
        return;
      }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'user'));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
      setFilteredUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const toggleSuspend = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'suspended' ? 'approved' : 'suspended';
      await updateDoc(doc(db, 'users', id), { status: newStatus });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('ဒီ User ကို ဖျက်မှာ သေချာပါသလား?')) {
      await deleteDoc(doc(db, 'users', id));
      fetchUsers();
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
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>User Management</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>ဝယ်ယူသူများ၏ အကောင့်များကို စီမံရန်နေရာ</p>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Username / Email / Phone ဖြင့် ရှာပါ..."
          style={{
            width: '100%',
            padding: '10px 14px 10px 40px',
            backgroundColor: 'var(--input-background)',
            border: '1px solid var(--input-border)',
            borderRadius: '8px',
            color: 'var(--foreground)',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Users List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No users found
          </div>
        ) : (
          filteredUsers.map(user => (
            <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--hover-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--foreground)' }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  ) : (
                    user.username?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{user.username || user.displayName || 'Unknown'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={12} /> {user.email}
                  </div>
                  {user.phone && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {user.phone}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    Status: <span style={{ fontWeight: 'bold', color: user.status === 'suspended' ? 'var(--error)' : 'var(--success)' }}>
                      {user.status || 'approved'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleSuspend(user.id, user.status)}
                  style={{
                    padding: '8px 12px',
                    background: user.status === 'suspended' ? 'var(--success)' : '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                  }}
                >
                  {user.status === 'suspended' ? <UserCheck size={16} /> : <UserX size={16} />}
                  {user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  style={{ padding: '8px 12px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}