// AddProduct.tsx - Dark/Light Mode အတွက် ပြင်ဆင်ပြီး
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, Upload, X } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { uploadToCloudinary } from '@/lib/cloudinary';

export default function AddProduct() {
  const { t } = useLanguage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productDiscount, setProductDiscount] = useState('');
  const [productCustomDiscount, setProductCustomDiscount] = useState(''); // ✅ ဒီမှာ ထည့်တယ်
  const [productImage, setProductImage] = useState('');
  const [productBrand, setProductBrand] = useState('');
  const [productStock, setProductStock] = useState('');

  const categories = ['Fashion', 'Electronics', 'Beauty & Care', 'Groceries', 
                       'Home & Living', 'Mobile Accessories', 'Sports & Fitness', 
                       'Toys & Games', 'Books & Stationery'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snapshot = await getDoc(userRef);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setUserData(data);
            if (data.role !== 'seller') {
              router.push('/');
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const imageUrl = await uploadToCloudinary(file);
      setProductImage(imageUrl);
      alert('✅ Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    setProductImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      alert(t('Login First'));
      router.push('/Login');
      return;
    }

    setSubmitting(true);

    try {
      const productData = {
        brand: productBrand || 'D Saing Store',
        location: userData?.shopAddress || 'Yangon',
        title: productName,
        price: productPrice,
        discount: productDiscount || '',
        customDiscount: productCustomDiscount || '', 
        image: productImage || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop',
        cta: 'Contact Seller',
        category: productCategory,
        description: productDescription,
        sellerId: user.uid,
        sellerName: userData?.username || userData?.displayName || 'Seller',
        createdAt: serverTimestamp(),
        stock: parseInt(productStock) || 0,
        isApproved: false // 👈 Admin က အတည်ပြုမှသာ ပလက်ဖောင်းပေါ်တွင် ပြသမည့် အပိုင်း
      };

      console.log('📦 Adding product:', productData);

      await addDoc(collection(db, 'products'), productData);

      alert(t('Add Success'));
      window.location.href = '/seller/dashboard';

    } catch (error: any) {
      console.error('Error adding product:', error);
      alert(`${t('Add Failed')}: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foreground)' }}>
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Link href="/seller/dashboard" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px' }}>
          <ArrowLeft size={18} />
        </Link>

        <div style={{
          backgroundColor: 'var(--card-background)',
          border: '1px solid var(--card-border)',
          borderRadius: '14px',
          padding: '20px'
        }}>
          <h1 style={{ color: 'var(--foreground)', fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0' }}>
            {t('Add Title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0' }}>
            {t('Add Description')}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                {t('Product Name')}
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Premium Sneakers"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--input-background)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                {t('Product Brand')}
              </label>
              <input
                type="text"
                value={productBrand}
                onChange={(e) => setProductBrand(e.target.value)}
                placeholder="e.g., Nike, Apple"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--input-background)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                {t('product.price')}
              </label>
              <input
                type="text"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="e.g., 450,000 MMK"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--input-background)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                {t('product.category')}
              </label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--input-background)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">{t('product.selectCategory')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                {t('product.stock')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={productStock}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setProductStock(val);
                }}
                placeholder="e.g., 100"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--input-background)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                {t('product.location')}
              </label>
              <input
                type="text"
                value={userData?.shopAddress || 'Yangon'}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'not-allowed'
                }}
              />
            </div>

            {/* ============================================ */}
            {/* ✅ Discount Section - သီးသန့် ၂ ခု */}
            {/* ============================================ */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                {t('product.discount')}
              </label>
              <input
                type="text"
                value={productDiscount}
                onChange={(e) => setProductDiscount(e.target.value)}
                placeholder="e.g., 20% OFF, Buy 1 Get 1"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--input-background)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* ✅ Custom Discount - သီးသန့်ထပ်ထည့်တယ် */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Custom Discount (Optional)
              </label>
              <input
                type="text"
                value={productCustomDiscount}
                onChange={(e) => setProductCustomDiscount(e.target.value)}
                placeholder="e.g., Special Offer, Limited Time"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--input-background)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                {t('product.image')}
              </label>
              
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
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
                    padding: '10px 16px',
                    backgroundColor: 'var(--input-background)',
                    border: '1px solid var(--input-border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                    cursor: uploadingImage ? 'default' : 'pointer',
                    opacity: uploadingImage ? 0.5 : 1,
                    fontSize: '13px'
                  }}
                >
                  {uploadingImage ? (
                    <>⏳ Uploading...</>
                  ) : (
                    <>
                      <Upload size={16} />
                      Choose Image
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={uploadingImage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
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

                {productImage && (
                  <button
                    type="button"
                    onClick={removeImage}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      backgroundColor: 'var(--card-background)',
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

              {productImage && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: 'var(--input-background)',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)'
                  }}
                >
                  <img
                    src={productImage}
                    alt="Product preview"
                    style={{
                      width: '100%',
                      maxHeight: '200px',
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=600&h=800&auto=format&fit=crop';
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                {t('product.description')}
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe your product..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--input-background)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || uploadingImage}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--accent)',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: (submitting || uploadingImage) ? 'default' : 'pointer',
                opacity: (submitting || uploadingImage) ? 0.6 : 1,
                boxSizing: 'border-box'
              }}
            >
              {submitting ? t('common.saving') : t('product.addButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}