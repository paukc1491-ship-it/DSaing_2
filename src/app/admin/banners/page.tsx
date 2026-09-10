'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Banner } from '@/data/banners';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function AdminBannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [image, setImage] = useState('');
  const [discount, setDiscount] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Admin Role စစ်ဆေးရန် state များ
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // အဆင့် ၂: Admin ဟုတ်မဟုတ် စစ်ဆေးခြင်း
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/'); // Login မဝင်ထားရင် Home ကို ပို့မယ်
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
          fetchBanners();
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchBanners = async () => {
    const snapshot = await getDocs(collection(db, 'banners'));
    const list: Banner[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Banner));
    setBanners(list);
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !image) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'banners'), {
        brand,
        title,
        image,
        discount,
        cta: 'Shop Now',
        isActive: true,
        createdAt: serverTimestamp()
      });
      setTitle('');
      setBrand('');
      setImage('');
      setDiscount('');
      fetchBanners();
    } catch (error) {
      console.error('Error adding banner:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'banners', id), {
      isActive: !currentStatus
    });
    fetchBanners();
  };

  const handleDelete = async (id: string) => {
    if (confirm('ဒီ Banner ကို ဖျက်မှာ သေချာပါသလား?')) {
      await deleteDoc(doc(db, 'banners', id));
      fetchBanners();
    }
  };

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Checking permissions...
      </div>
    );
  }

  // Admin မဟုတ်ရင် ပြမည့် Error Screen
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', color: 'var(--foreground)' }}>
        <ShieldAlert size={48} color="var(--error)" />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>ဒီစာမျက်နှာကို ဝင်ရောက်ခွင့် မရှိပါ (Admin များသာ)</p>
        <button
          onClick={() => router.push('/')}
          style={{ padding: '10px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', color: 'var(--foreground)' }}>
      {/* အဆင့် ၃: လမ်းကြောင်းချိတ်ဆက်မှု (Back Button / Dashboard Navigation) */}
      <button
        onClick={() => router.push('/')}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--foreground)',
          cursor: 'pointer',
          padding: '8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          fontWeight: '600'
        }}
      >
        <ArrowLeft size={20} />
        Back to Home / Dashboard
      </button>

      <h1>Admin Banner Management</h1>

      {/* Add Banner Form */}
      <form onSubmit={handleAddBanner} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', padding: '16px', background: 'var(--card-background)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
        <h3>Add New Banner</h3>
        <input type="text" placeholder="Brand / Seller Name" value={brand} onChange={e => setBrand(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--input-background)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }} />
        <input type="text" placeholder="Title / Description" value={title} onChange={e => setTitle(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--input-background)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }} />
        <input type="text" placeholder="Image URL" value={image} onChange={e => setImage(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--input-background)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }} />
        <input type="text" placeholder="Discount (e.g. 20% OFF)" value={discount} onChange={e => setDiscount(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: 'var(--input-background)', color: 'var(--foreground)', border: '1px solid var(--card-border)' }} />
        <button type="submit" disabled={loading} style={{ padding: '10px', background: 'var(--accent)', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {loading ? 'Adding...' : 'Add Banner'}
        </button>
      </form>

      {/* Banners List */}
      <div style={{ marginTop: '30px' }}>
        <h3>Existing Banners</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          {banners.map(banner => (
            <div key={banner.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={banner.image} alt={banner.title} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{banner.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{banner.brand} | {banner.discount}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => toggleActive(banner.id, banner.isActive ?? true)} style={{ padding: '6px 12px', background: banner.isActive ? 'var(--success)' : 'var(--text-muted)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {banner.isActive ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => handleDelete(banner.id)} style={{ padding: '6px 12px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}