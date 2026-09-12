// src/app/admin/categories/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ShieldAlert, Plus, Trash2, Edit, X, Check } from 'lucide-react';

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return; }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          fetchCategories();
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

  const fetchCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(list);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAdd = async () => {
    if (!newCategory.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategory.trim(),
        createdAt: serverTimestamp(),
      });
      setNewCategory('');
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateDoc(doc(db, 'categories', id), { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('ဒီ Category ကို ဖျက်မှာ သေချာပါသလား?')) {
      await deleteDoc(doc(db, 'categories', id));
      fetchCategories();
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
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto', color: 'var(--foreground)' }}>
      <button onClick={() => router.push('/admin/banners')} style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: '600' }}>
        <ArrowLeft size={20} /> Back to Admin Panel
      </button>

      <h1>Category Management</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>ပစ္စည်း Category များကို စီမံရန်နေရာ</p>

      {/* Add Category */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Category အသစ် ထည့်ပါ..."
          style={{ flex: 1, padding: '10px 14px', backgroundColor: 'var(--input-background)', border: '1px solid var(--input-border)', borderRadius: '8px', color: 'var(--foreground)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
        />
        <button onClick={handleAdd} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Categories List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No categories yet</div>
        ) : (
          categories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              {editingId === cat.id ? (
                <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                    autoFocus
                    style={{ flex: 1, padding: '6px 10px', backgroundColor: 'var(--input-background)', border: '1px solid var(--accent)', borderRadius: '6px', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }}
                  />
                  <button onClick={() => handleUpdate(cat.id)} style={{ padding: '6px', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => { setEditingId(null); setEditingName(''); }} style={{ padding: '6px', background: 'var(--text-muted)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '15px', fontWeight: '500' }}>{cat.name}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }} style={{ padding: '6px 10px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                      <Edit size={14} /> Edit
                    </button>
                    <button onClick={() => handleDelete(cat.id)} style={{ padding: '6px 10px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}