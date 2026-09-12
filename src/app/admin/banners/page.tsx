// src/app/admin/banners/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Banner } from '@/data/banners';
import { ArrowLeft, ShieldAlert, Search, X } from 'lucide-react';

// ✅ Searchable Dropdown Component
const SearchableDropdown = ({
  label,
  placeholder,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string; sublabel?: string }[];
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(searchLower) ||
        (o.sublabel || '').toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const selectedOption = options.find((o) => o.id === value);

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
        {label}
      </label>

      {/* ✅ Selected Display / Input */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: disabled ? 'var(--card-background)' : 'var(--input-background)',
          color: disabled ? 'var(--text-muted)' : 'var(--foreground)',
          border: '1px solid var(--card-border)',
          fontSize: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ color: selectedOption ? 'var(--foreground)' : 'var(--text-muted)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {selectedOption ? (
          <X
            size={16}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setSearch('');
            }}
            style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
          />
        ) : (
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
        )}
      </div>

      {/* ✅ Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          />

          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'var(--card-background)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              zIndex: 999,
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {/* Search Input */}
            <div style={{ padding: '8px', borderBottom: '1px solid var(--card-border)', position: 'sticky', top: 0, background: 'var(--card-background)' }}>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--input-background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--card-border)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Options */}
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No results found
              </div>
            ) : (
              filtered.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--card-border)',
                    background: value === option.id ? 'var(--hover-background)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--hover-background)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = value === option.id ? 'var(--hover-background)' : 'transparent';
                  }}
                >
                  <div style={{ fontSize: '13px', color: 'var(--foreground)', fontWeight: '500' }}>
                    {option.label}
                  </div>
                  {option.sublabel && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {option.sublabel}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default function AdminBannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // ✅ Form State (Searchable Dropdown အတွက်)
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  // ✅ Auto-fill ဖြစ်တဲ့ Fields
  const [brand, setBrand] = useState('');
  const [title, setTitle] = useState('');
  const [image, setImage] = useState('');
  const [discount, setDiscount] = useState('');

  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ✅ Admin စစ်ဆေးခြင်း
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
          fetchBanners();
          fetchProducts();
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

  // ✅ Products ဆွဲယူခြင်း
  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProducts(products);
      console.log('✅ Products loaded:', products.length);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const fetchBanners = async () => {
    const snapshot = await getDocs(collection(db, 'banners'));
    const list: Banner[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
    setBanners(list);
  };

  // ✅ ဆိုင်နာမည် Options (Unique Sellers)
  const sellerOptions = useMemo(() => {
    const sellerMap = new Map<string, { id: string; label: string; sublabel?: string }>();
    allProducts.forEach((p) => {
      if (!p.sellerId) return;
      if (!sellerMap.has(p.sellerId)) {
        const sellerName = p.sellerName || p.brand || 'Unknown Seller';
        sellerMap.set(p.sellerId, {
          id: p.sellerId,
          label: sellerName,
          sublabel: `ID: ${p.sellerId.slice(0, 8)}...`,
        });
      }
    });
    return Array.from(sellerMap.values());
  }, [allProducts]);

  // ✅ တည်နေရာ Options (Seller ရွေးပြီးရင် Filter)
  const locationOptions = useMemo(() => {
    const locations = new Set<string>();
    allProducts.forEach((p) => {
      // ✅ Seller ရွေးထားရင် အဲဒီ Seller ရဲ့ Location ပဲ ယူ
      if (selectedSellerId && p.sellerId !== selectedSellerId) return;
      
      const loc = p.location || p.city || p.state || '';
      if (loc) locations.add(loc);
    });
    return Array.from(locations).map((loc) => ({ id: loc, label: loc }));
  }, [allProducts, selectedSellerId]);

  // ✅ ပစ္စည်း Options (Seller + Location ရွေးပြီးရင် Filter)
  const productOptions = useMemo(() => {
    // ✅ Seller သို့မဟုတ် Location မရွေးရင် ဘာမှမပြဘူး
    if (!selectedSellerId || !selectedLocation) {
      return [];
    }

    return allProducts
      .filter((p) => {
        // ✅ Seller Filter
        if (p.sellerId !== selectedSellerId) return false;
        
        // ✅ Location Filter
        const loc = p.location || p.city || p.state || '';
        if (loc !== selectedLocation) return false;
        
        return true;
      })
      .map((p) => ({
        id: p.id,
        label: p.title || 'Untitled',
        sublabel: `${p.price || 'N/A'} MMK • ${p.brand || 'No Brand'}`,
      }));
  }, [allProducts, selectedSellerId, selectedLocation]);

  // ✅ Seller ရွေးတဲ့အခါ → Location နဲ့ Product ကို Reset
  useEffect(() => {
    setSelectedLocation('');
    setSelectedProductId('');
  }, [selectedSellerId]);

  // ✅ Location ရွေးတဲ့အခါ → Product ကို Reset
  useEffect(() => {
    setSelectedProductId('');
  }, [selectedLocation]);

  // ✅ Product ရွေးတဲ့အခါ → Auto-fill
  useEffect(() => {
    if (!selectedProductId) return;
    const product = allProducts.find((p) => p.id === selectedProductId);
    if (product) {
      setBrand(product.brand || product.sellerName || '');
      setTitle(product.title || '');
      setImage(product.image || '');
      setDiscount(product.discount || '');
    }
  }, [selectedProductId, allProducts]);

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Validation
    if (!selectedSellerId) {
      alert('ဆိုင်နာမည် ရွေးပါ');
      return;
    }
    if (!selectedLocation) {
      alert('တည်နေရာ ရွေးပါ');   // ✅ ဒါက အသစ်ထည့်တာ
      return;
    }
    if (!selectedProductId) {
      alert('ပစ္စည်း ရွေးပါ');
      return;
    }
    if (!image) {
      alert('ပုံ URL ထည့်ပါ');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'banners'), {
        brand,
        title,
        image,
        discount,
        location: selectedLocation,
        targetSellerId: selectedSellerId,    // ✅ Auto
        productId: selectedProductId,        // ✅ Auto
        cta: 'Shop Now',
        isActive: true,
        createdAt: serverTimestamp(),
      });

      // Reset
      setSelectedSellerId('');
      setSelectedLocation('');
      setSelectedProductId('');
      setBrand('');
      setTitle('');
      setImage('');
      setDiscount('');

      fetchBanners();
      alert('✅ Banner added successfully!');
    } catch (error) {
      console.error('Error adding banner:', error);
      alert('❌ Failed to add banner');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'banners', id), { isActive: !currentStatus });
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

  const inputStyle = {
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'var(--input-background)',
    color: 'var(--foreground)',
    border: '1px solid var(--card-border)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', color: 'var(--foreground)' }}>
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
        Back to Home
      </button>

      <h1>Admin Banner Management</h1>

      {/* ✅ Add Banner Form */}
      <form onSubmit={handleAddBanner} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px', padding: '16px', background: 'var(--card-background)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <h3 style={{ margin: 0 }}>Add New Banner</h3>

        {/* ✅ ၁။ ဆိုင်နာမည် (Searchable) */}
        <SearchableDropdown
          label="၁။ ဆိုင်နာမည် *"
          placeholder="ဆိုင်နာမည် ရိုက်ရှာပါ..."
          value={selectedSellerId}
          onChange={setSelectedSellerId}
          options={sellerOptions}
        />

        {/* ✅ ၂။ တည်နေရာ (Searchable, Seller ရွေးပြီးမှ ဖွင့်) */}
        <SearchableDropdown
          label="၂။ တည်နေရာ"
          placeholder={selectedSellerId ? 'တည်နေရာ ရိုက်ရှာပါ...' : 'ဆိုင်နာမည် အရင်ရွေးပါ'}
          value={selectedLocation}
          onChange={setSelectedLocation}
          options={locationOptions}
          disabled={!selectedSellerId}
        />

        {/* ✅ ၃။ ပစ္စည်း (Searchable, Seller + Location ရွေးပြီးမှ ဖွင့်) */}
        <SearchableDropdown
          label="၃။ ပစ္စည်း *"
          placeholder={
            !selectedSellerId 
              ? 'ဆိုင်နာမည် အရင်ရွေးပါ'
              : !selectedLocation
                ? 'တည်နေရာ အရင်ရွေးပါ'
                : 'ပစ္စည်း ရိုက်ရှာပါ...'
          }
          value={selectedProductId}
          onChange={setSelectedProductId}
          options={productOptions}
          disabled={!selectedSellerId || !selectedLocation}
        />

        {/* ✅ Auto-filled Fields */}
        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', marginTop: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            👇 Auto-filled (လိုအပ်ရင် ပြင်လို့ရ)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Brand / Seller Name"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Title / Description"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Image URL"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Discount (e.g. 20% OFF)"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedSellerId || !selectedLocation || !selectedProductId}
          style={{
            padding: '12px',
            background: loading || !selectedSellerId || !selectedLocation || !selectedProductId 
              ? 'var(--text-muted)' 
              : 'var(--accent)',
            color: '#000',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || !selectedSellerId || !selectedLocation || !selectedProductId 
              ? 'not-allowed' 
              : 'pointer',
            opacity: loading || !selectedSellerId || !selectedLocation || !selectedProductId ? 0.5 : 1,
          }}
        >
          {loading ? 'Adding...' : 'Add Banner'}
        </button>
      </form>

      {/* Banners List */}
      <div style={{ marginTop: '30px' }}>
        <h3>Existing Banners</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          {banners.map((banner) => (
            <div key={banner.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--card-background)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img src={banner.image} alt={banner.title} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{banner.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {banner.brand} | {banner.discount}
                  </div>
                  {banner.productId && (
                    <div style={{ fontSize: '10px', color: 'var(--success)' }}>🔗 Linked</div>
                  )}
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