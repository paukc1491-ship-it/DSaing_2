// ManageProducts.tsx - Dark/Light Mode အတွက် ပြင်ဆင်ပြီး
'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, collection, query, where, onSnapshot, 
  deleteDoc, updateDoc 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Package, PlusCircle, Search, 
  Edit, Trash2, X, Check, Upload, Camera 
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface Product {
  id: string;
  title?: string;
  price?: string;
  image?: string;
  category?: string;
  brand?: string;
  createdAt?: any;
  sellerId?: string;
  sellerName?: string;
  description?: string;
  discount?: string;
  discountType?: string;      
  customDiscount?: string;    
  location?: string;
  cta?: string;
  stock?: number;
}

export default function ManageProducts() {
  const { t } = useLanguage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const getCreatedAtTime = (createdAt: any): number => {
    if (!createdAt) return 0;
    
    if (typeof createdAt === 'object' && createdAt.toDate && typeof createdAt.toDate === 'function') {
      return createdAt.toDate().getTime();
    }
    
    if (typeof createdAt === 'string') {
      const parsed = new Date(createdAt);
      return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    }
    
    if (typeof createdAt === 'number') {
      return createdAt;
    }
    
    return 0;
  };

  // ============================================
  // ✅ Image Upload Handler
  // ============================================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'gallery' | 'camera') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const imageUrl = await uploadToCloudinary(file);
      setEditData({ ...editData, image: imageUrl });
      alert('✅ Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // ============================================
  // ✅ Remove Image
  // ============================================
  const removeImage = () => {
    setEditData({ ...editData, image: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // ============================================
  // useEffect & Auth
  // ============================================
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setUser(user);
          const userRef = doc(db, 'users', user.uid);
          const snapshot = await getDoc(userRef);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setUserData(data);
            if (data.role !== 'seller') {
              router.push('/');
            }
          } else {
            router.push('/profile');
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError('Failed to authenticate');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    setError(null);
    
    const q = query(
      collection(db, 'products'),
      where('sellerId', '==', user.uid)
    );

    const unsubscribeProducts = onSnapshot(q, 
      (snapshot) => {
        try {
          const productList: Product[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() as Omit<Product, 'id'>
          }));
          
          const sortedProducts = productList.sort((a, b) => {
            const timeA = getCreatedAtTime(a.createdAt);
            const timeB = getCreatedAtTime(b.createdAt);
            return timeB - timeA;
          });
          
          setProducts(sortedProducts);
          setFilteredProducts(sortedProducts);
          console.log('✅ Products loaded:', sortedProducts.length);
        } catch (err) {
          console.error('Error processing products:', err);
          setError('Failed to load products');
        }
      },
      (error) => {
        console.error('❌ Firestore error:', error);
        setError(`Failed to load products: ${error.message}`);
      }
    );

    return () => unsubscribeProducts();
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.price?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // ============================================
  // ✅ CRUD Functions
  // ============================================
  const handleDelete = async (productId: string, productTitle: string) => {
    if (!confirm(t('Delete Confirm').replace('{title}', productTitle))) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'products', productId));
      alert(t('Delete Success'));
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(`${t('Delete Failed')}: ${error.message}`);
    }
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditData({
      title: product.title || '',
      price: product.price || '',
      brand: product.brand || '',
      category: product.category || '',
      discount: product.discount || '',
      customDiscount: product.customDiscount || '', // ✅ ဒီမှာ customDiscount ထည့်ပေးတယ်
      description: product.description || '',
      image: product.image || '',
      stock: product.stock || 0,
      discountType: '',
    });
    console.log('✏️ Editing product:', product);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = async (productId: string) => {
    try {
      // 🔍 Debug - ဘာတွေ save လုပ်မလဲဆိုတာ စစ်ကြည့်
      console.log('💾 Saving product data:', {
        title: editData.title,
        price: editData.price,
        brand: editData.brand,
        category: editData.category,
        discount: editData.discount,
        customDiscount: editData.customDiscount,
        description: editData.description,
        image: editData.image,
        stock: editData.stock || 0
      });

      await updateDoc(doc(db, 'products', productId), {
        title: editData.title,
        price: editData.price,
        brand: editData.brand,
        category: editData.category,
        discount: editData.discount,
        customDiscount: editData.customDiscount || '', // ✅ ဒီမှာ customDiscount ထည့်ပေးတယ်
        description: editData.description,
        image: editData.image,
        stock: editData.stock || 0
      });
      
      alert(t('Update Success'));
      setEditingId(null);
      setEditData({});
    } catch (error: any) {
      console.error('Error updating product:', error);
      alert(`${t('Update Failed')}: ${error.message}`);
    }
  };

  // ============================================
  // ✅ Loading & Error States
  // ============================================
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

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--background)', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--foreground)',
        gap: '16px',
        padding: '20px'
      }}>
        <div style={{ color: 'var(--error)', fontSize: '20px' }}>⚠️ {t('common.error')}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--accent)',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'seller') {
    return null;
  }

  // ============================================
  // ✅ Render Image Upload Section
  // ============================================
  const renderImageUpload = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Current Image Preview */}
      {editData.image && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px',
          backgroundColor: 'var(--input-background)',
          borderRadius: '8px',
          border: '1px solid var(--input-border)'
        }}>
          <img
            src={editData.image}
            alt="Current"
            style={{
              width: '60px',
              height: '60px',
              objectFit: 'cover',
              borderRadius: '6px'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=60&h=60&auto=format&fit=crop';
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            Current Image
          </span>
        </div>
      )}

      {/* Upload Buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {/* Gallery Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e, 'gallery')}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'var(--input-background)',
            border: '1px solid var(--input-border)',
            borderRadius: '8px',
            color: 'var(--foreground)',
            cursor: uploadingImage ? 'default' : 'pointer',
            opacity: uploadingImage ? 0.5 : 1,
            fontSize: '13px'
          }}
        >
          <Upload size={16} />
          {uploadingImage ? 'Uploading...' : (editData.image ? 'Change Image' : '+ Add Product Image')}
        </button>

        {/* Camera Upload */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleImageUpload(e, 'camera')}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploadingImage}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'var(--input-background)',
            border: '1px solid var(--input-border)',
            borderRadius: '8px',
            color: 'var(--foreground)',
            cursor: uploadingImage ? 'default' : 'pointer',
            opacity: uploadingImage ? 0.5 : 1,
            fontSize: '13px'
          }}
        >
          <Camera size={16} />
          Take Photo
        </button>

        {/* Remove Button */}
        {editData.image && (
          <button
            type="button"
            onClick={removeImage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--error)',
              borderRadius: '6px',
              color: 'var(--error)',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            <X size={14} />
            Remove
          </button>
        )}
      </div>
    </div>
  );

  // ============================================
  // ✅ Main Return
  // ============================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link 
              href="/seller/dashboard" 
              style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 style={{ color: 'var(--foreground)', fontSize: '20px', fontWeight: '700', margin: 0 }}>
              {t('Products')}
            </h1>
          </div>
          
          <Link
            href="/seller/products/new"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: 'var(--accent)',
              color: '#000000',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <PlusCircle size={18} />
            {t('Add New')}
          </Link>
        </div>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          marginBottom: '20px'
        }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('Search Placeholder')}
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingLeft: '44px',
              backgroundColor: 'var(--input-background)',
              border: '1px solid var(--input-border)',
              borderRadius: '12px',
              color: 'var(--foreground)',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--input-border)';
            }}
          />
          <Search 
            size={18} 
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px 8px'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Product Count */}
        <div style={{
          color: 'var(--text-secondary)',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {filteredProducts.length} {filteredProducts.length === 1 ? t('Product') : t('Products')} {t('Found')}
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center'
          }}>
            <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--foreground)', fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
              {searchTerm ? t('No Match') : t('No Products')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 16px 0' }}>
              {searchTerm ? t('Adjust Search') : t('Start Adding')}
            </p>
            {!searchTerm && (
              <Link
                href="/seller/products/new"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent)',
                  color: '#000000',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                <PlusCircle size={18} />
                {t('Add New Product')}
              </Link>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '12px'
          }}>
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: editingId === product.id ? '2px solid var(--accent)' : '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  transition: 'border-color 0.2s'
                }}
              >
                {/* Product Image */}
                <img
                  src={product.image || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop'}
                  alt={product.title || 'Product'}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    flexShrink: 0
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop';
                  }}
                />

                {/* Product Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === product.id ? (
                  // ✅ Edit Mode - ပြင်ခွင့်ရှိတဲ့ Field ပဲထား
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {/* ============================================ */}
                    {/* ❌ Product Name - မပြောင်းရ (View Only) */}
                    {/* ============================================ */}
                    <div style={{ 
                      padding: '6px 10px',
                      backgroundColor: 'var(--card-background)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      fontSize: '14px'
                    }}>
                      {product.title || 'Untitled'}
                    </div>

                    {/* ============================================ */}
                    {/* ❌ Brand - မပြောင်းရ (View Only) */}
                    {/* ============================================ */}
                    <div style={{ 
                      padding: '6px 10px',
                      backgroundColor: 'var(--card-background)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      fontSize: '13px'
                    }}>
                      Brand: {product.brand || 'No Brand'}
                    </div>

                    {/* ============================================ */}
                    {/* ❌ Category - မပြောင်းရ (View Only) */}
                    {/* ============================================ */}
                    <div style={{ 
                      padding: '6px 10px',
                      backgroundColor: 'var(--card-background)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      fontSize: '13px'
                    }}>
                      Category: {product.category || 'Uncategorized'}
                    </div>

                    {/* ============================================ */}
                    {/* ✅ Price - ပြင်လို့ရတယ် */}
                    {/* ============================================ */}
                    <input
                      type="text"
                      value={editData.price || ''}
                      onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                      placeholder={t('Price')}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'var(--input-background)',
                        border: '1px solid var(--input-border)',
                        borderRadius: '6px',
                        color: 'var(--foreground)',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%'
                      }}
                    />

                    {/* ============================================ */}
                    {/* ✅ Stock - ပြင်လို့ရတယ် */}
                    {/* ============================================ */}
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editData.stock ?? ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setEditData({ ...editData, stock: val ? parseInt(val) : 0 });
                      }}
                      placeholder={t('Stock')}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'var(--input-background)',
                        border: '1px solid var(--input-border)',
                        borderRadius: '6px',
                        color: 'var(--foreground)',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%'
                      }}
                    />

                    {/* ============================================ */}
                    {/* ✅ Discount Section - သီးသန့် ၂ ခု */}
                    {/* ============================================ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '100%' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '500' }}>
                        Add Discount
                      </label>
                      
                      {/* Input ၁ - Discount Type (သီးသန့်) */}
                      <input
                        type="text"
                        value={editData.discount || ''}
                        onChange={(e) => setEditData({ ...editData, discount: e.target.value })}
                        placeholder="e.g., 20% OFF, Buy 1 Get 1, Free Shipping"
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--input-background)',
                          border: '1px solid var(--input-border)',
                          borderRadius: '6px',
                          color: 'var(--foreground)',
                          fontSize: '13px',
                          outline: 'none',
                          width: '100%'
                        }}
                      />
                      
                      {/* Input ၂ - Custom Discount (သီးသန့် - ဒီတစ်ခုပြင်ရင် အပေါ်တစ်ခုမပြောင်းဘူး) */}
                      <input
                        type="text"
                        value={editData.customDiscount || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditData({ 
                            ...editData, 
                            customDiscount: val
                            // ❌ ဒီမှာ discount ကိုမပြောင်းတော့ဘူး
                          });
                        }}
                        placeholder="Custom discount (e.g., Special Offer)"
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--input-background)',
                          border: '1px solid var(--input-border)',
                          borderRadius: '6px',
                          color: 'var(--foreground)',
                          fontSize: '13px',
                          outline: 'none',
                          width: '100%'
                        }}
                      />
                    </div>

                    {/* ============================================ */}
                    {/* ✅ Image Upload Section - ပြင်လို့ရတယ် */}
                    {/* ============================================ */}
                    {renderImageUpload()}

                    {/* ============================================ */}
                    {/* ✅ Action Buttons */}
                    {/* ============================================ */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleSaveEdit(product.id)}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: 'var(--success)',
                          color: '#000000',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Check size={14} /> {t('common.save')}
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--card-border)',
                          color: 'var(--text-secondary)',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                    // ✅ View Mode
                    <>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h4 style={{ 
                            color: 'var(--foreground)', 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            margin: '0 0 4px 0' 
                          }}>
                            {product.title || t('Untitled')}
                          </h4>
                          <p style={{ color: 'var(--accent)', fontSize: '18px', fontWeight: '700', margin: '0 0 2px 0' }}>
                            {product.price || 'N/A'}
                          </p>
                          
                          <p style={{ 
                            color: (product.stock || 0) > 0 ? 'var(--success)' : 'var(--error)', 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            margin: '0 0 4px 0' 
                          }}>
                            📦 {(product.stock || 0) > 0 ? `${product.stock} ${t('In Stock')}` : t('Out of Stock')}
                          </p>
                          
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '12px',
                              backgroundColor: 'var(--hover-background)',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              {product.category || t('Uncategorized')}
                            </span>
                            <span style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '12px',
                              backgroundColor: 'var(--hover-background)',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              {product.brand || t('No Brand')}
                            </span>                            
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          onClick={() => startEditing(product)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--hover-background)',
                            border: '1px solid var(--card-border)',
                            color: 'var(--accent)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit size={14} /> {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.title || t('Untitled'))}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--hover-background)',
                            border: '1px solid var(--card-border)',
                            color: 'var(--error)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={14} /> {t('common.delete')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}