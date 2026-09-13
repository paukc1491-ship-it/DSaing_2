// components/Sidebar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { 
  X, Settings, HelpCircle, LogOut, UserPlus, LogIn, Camera, 
  Store, ShoppingCart, ShieldCheck 
} from "lucide-react";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
  user?: any;
  userRole?: 'user' | 'seller' | 'admin' | null; // ✅ admin ထည့်ပါ
}                                                                                                                                                               

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, user, userRole }: SidebarProps) {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('en');
  const [currentRole, setCurrentRole] = useState<'user' | 'seller' | 'admin' | null>(userRole || null); // ✅ admin ထည့်ပါ

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarCameraRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const url = await uploadToCloudinary(file);
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: url
      });
      setPhotoURL(url);
      alert('✅ Profile photo updated!');
    } catch (err) {
      console.error(err);
      alert('❌ Upload failed');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      if (avatarCameraRef.current) avatarCameraRef.current.value = '';
    }
  };
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    console.log('🔵 [Sidebar] onAuthStateChanged fired');
    console.log('🔵 [Sidebar] firebaseUser:', firebaseUser?.uid);
    
    if (firebaseUser) {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snapshot = await getDoc(userRef);
      console.log('🔵 [Sidebar] snapshot.exists:', snapshot.exists());
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('🔵 [Sidebar] data:', data);
        console.log('🔵 [Sidebar] data.role:', data.role);
        
        setUsername(data.username || data.displayName || firebaseUser.email?.split('@')[0] || 'User');
        setPhotoURL(data.photoURL || null);
        setLanguage(data.language || 'en');
        setCurrentRole(data.role || 'user');
        
        console.log('🔵 [Sidebar] currentRole set to:', data.role || 'user');
      }
    } else {
      console.log('🔵 [Sidebar] No user');
      setUsername('');
      setPhotoURL(null);
      setCurrentRole(null);
    }
  });
  return () => unsubscribe();
}, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAddBuyerAccount = () => {
    setIsSidebarOpen(false);
    router.push('/signup?role=buyer');
  };

  const handleAddSellerAccount = () => {
    setIsSidebarOpen(false);
    router.push('/signup?role=seller');
  };

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      my: {
        'sidebar.seller': 'ရောင်းချသူ',
        'sidebar.buyer': 'ဝယ်ယူသူ',
        'sidebar.guest': 'ဧည့်သည်',
        'sidebar.profile': 'ပရိုဖိုင်',
        'sidebar.dashboard': 'ဒက်ရှ်ဘုတ်',
        'sidebar.welcome': 'D Saing မှ ကြိုဆိုပါသည်',
        'sidebar.login': 'ဝင်မည်',
        'sidebar.signup': 'အကောင့်ဖွင့်မည်',
        'sidebar.settings': 'ဆက်တင်များ',
        'sidebar.help': 'အကူအညီ',
        'sidebar.logout': 'ထွက်မည်',
        'Messages': 'ဝင်စာများ',
        'sidebar.addBuyer': 'ဝယ်ယူသူအကောင့်ဖွင့်မည်',
        'sidebar.addSeller': 'ရောင်းချသူအကောင့်ဖွင့်မည်',
        'sidebar.sellNow': 'ရောင်းမည်',
        'sidebar.manageBanners': 'ဘန်နာများ စီမံရန်',
        'sidebar.paymentApprovals': 'ငွေလွှဲစလစ်များ စစ်ဆေးရန်',
      },
      en: {
        'sidebar.seller': 'Seller',
        'sidebar.buyer': 'Buyer',
        'sidebar.guest': 'Guest',
        'sidebar.profile': 'Profile',
        'sidebar.dashboard': 'Dashboard',
        'sidebar.welcome': 'Welcome to D Saing',
        'sidebar.login': 'Login',
        'sidebar.signup': 'Sign Up',
        'sidebar.settings': 'Settings',
        'sidebar.help': 'Help & Support',
        'sidebar.logout': 'Log Out',
        'Messages': 'Messages',
        'sidebar.addBuyer': 'Create Buyer Account',
        'sidebar.addSeller': 'Create Seller Account',
        'sidebar.sellNow': 'Sell Now',
        'sidebar.manageBanners': 'Manage Banners',
        'sidebar.paymentApprovals': 'Payment Approvals',
      }
    };
    return translations[language]?.[key] || translations.en[key] || key;
  };

  // ✅ getRoleLabel မှာ admin ထည့်ပါ
  const getRoleLabel = () => {
    if (currentRole === 'admin') return '🛡️ Admin';
    if (currentRole === 'seller') return '🛒 ' + t('sidebar.seller');
    if (currentRole === 'user') return '👤 ' + t('sidebar.buyer');
    return t('sidebar.guest');
  };

  // ✅ getRoleColor မှာ admin ထည့်ပါ
  const getRoleColor = () => {
    if (currentRole === 'admin') return '#ef4444';
    if (currentRole === 'seller') return '#FFD700';
    if (currentRole === 'user') return 'var(--accent)';
    return 'var(--text-muted)';
  };

  console.log('🔵 [Sidebar] Rendering with currentRole:', currentRole);

  return (
    <>
      <div 
        onClick={() => setIsSidebarOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          zIndex: 40,
          opacity: isSidebarOpen ? 1 : 0,
          pointerEvents: isSidebarOpen ? "auto" : "none",
          transition: "opacity 0.3s ease"
        }}
      />

      <aside 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "280px",
          maxWidth: "80vw",
          backgroundColor: "var(--card-background)",
          borderRight: "1px solid var(--card-border)",
          zIndex: 51,
          transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease-in-out",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "20px 16px",
          boxSizing: "border-box",
          overflowY: "auto"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              style={{
                backgroundColor: "var(--hover-background)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >          
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              padding: "16px",
              backgroundColor: "var(--background)",
              borderRadius: "12px",
              border: "1px solid var(--card-border)"
            }}
          >
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsSidebarOpen(false)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      backgroundColor: "var(--hover-background)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--foreground)",
                      fontSize: "24px",
                      fontWeight: "700",
                      position: "relative",
                      border: `2px solid ${getRoleColor()}`,
                      overflow: "hidden"
                    }}
                  >
                    {photoURL ? (
                      <img 
                        src={photoURL} 
                        alt={username || 'User'} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      username?.charAt(0).toUpperCase() || 'U'
                    )}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-2px",
                        right: "-2px",
                        backgroundColor: "var(--card-background)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-muted)",
                        fontSize: "10px"
                      }}
                    >
                      <Camera size={10} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: "var(--foreground)", fontSize: "15px", fontWeight: "600" }}>
                      {username}
                    </div>
                    <div style={{ 
                      color: getRoleColor(), 
                      fontSize: "12px", 
                      fontWeight: "500",
                      marginTop: "2px"
                    }}>
                      {getRoleLabel()}
                    </div>
                  </div>
                </Link>

                {currentRole === 'seller' && (
                  <button
                    onClick={handleAddBuyerAccount}
                    style={{
                      marginTop: "12px",
                      width: "100%",
                      padding: "10px",
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--accent)",
                      borderRadius: "8px",
                      color: "var(--accent)",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.3s ease"
                    }}
                  >
                    <ShoppingCart size={16} />
                    {t('sidebar.addBuyer')}
                  </button>
                )}

                {currentRole === 'user' && (
                  <button
                    onClick={handleAddSellerAccount}
                    style={{
                      marginTop: "12px",
                      width: "100%",
                      padding: "10px",
                      backgroundColor: "var(--background)",
                      border: "1px solid #FFD700",
                      borderRadius: "8px",
                      color: "#FFD700",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.3s ease"
                    }}
                  >
                    <Store size={16} />
                    {t('sidebar.addSeller')}
                  </button>
                )}

                <div style={{ 
                  marginTop: "12px", 
                  display: "flex", 
                  flexDirection: "column",
                  gap: "8px",
                  borderTop: "1px solid var(--card-border)",
                  paddingTop: "12px"
                }}>
                  <Link
                    href="/profile"
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                      textDecoration: "none",
                      fontSize: "13px",
                      transition: "background 0.2s"
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>👤</span>
                    <span>{t('sidebar.profile')}</span>
                  </Link>
                  
                  {currentRole === 'seller' && (
                    <Link
                      href="/seller/dashboard"
                      onClick={() => setIsSidebarOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 12px",
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--card-border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                        textDecoration: "none",
                        fontSize: "13px",
                        transition: "background 0.2s"
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>📊</span>
                      <span>{t('sidebar.dashboard')}</span>
                    </Link>
                  )}

                  <Link
                    href="/messages"
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                      textDecoration: "none",
                      fontSize: "13px",
                      transition: "background 0.2s"
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>💬</span>
                    <span>{t('Messages')}</span>
                  </Link>

                  {currentRole === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setIsSidebarOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        backgroundColor: '#ef4444',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '700',
                        textDecoration: 'none',
                        marginTop: '8px',
                      }}
                    >
                      <ShieldCheck size={18} />
                      <span>🛡️ Admin Panel</span>
                    </Link>
                  )}                                  
                </div>
              </>
            ) : (
              <div>
                <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "8px", textAlign: "center" }}>
                  {t('sidebar.welcome')}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <a
                    href="/login"
                    style={{
                      flex: 1,
                      backgroundColor: "transparent",
                      border: "1px solid var(--card-border)",
                      borderRadius: "6px",
                      padding: "8px",
                      color: "var(--foreground)",
                      textDecoration: "none",
                      fontSize: "13px",
                      textAlign: "center",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      cursor: "pointer"
                    }}
                  >
                    <LogIn size={14} />
                    {t('sidebar.login')}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      router.push('/signup');
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: "var(--accent)",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px",
                      color: "#000000",
                      fontSize: "13px",
                      textAlign: "center",
                      fontWeight: "500",
                      cursor: "pointer"
                    }}
                  >
                    <UserPlus size={14} style={{ display: "inline", marginRight: "4px" }} />
                    {t('sidebar.signup')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {/* ✅ Settings Link - Role အလိုက် ပြောင်းပါ */}
          <Link
            href={
              currentRole === 'admin' ? '/admin/settings' :
              currentRole === 'seller' ? '/seller/settings' :
              '/settings'
            }
            onClick={() => setIsSidebarOpen(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              backgroundColor: "transparent",
              borderRadius: "8px",
              color: "var(--foreground)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "none",
              width: "auto"
            }}
          >
            <Settings size={18} />
            <span>{t('sidebar.settings')}</span>
          </Link>          

          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "8px",
              color: "var(--foreground)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              width: "auto"
            }}
          >
            <HelpCircle size={18} />
            <span>{t('sidebar.help')}</span>
          </button>
        </nav>    
        </div>

        {user && (
          <div>
            <button 
              onClick={handleLogout}
              style={{ 
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                backgroundColor: "var(--background)",
                border: "none",
                borderRadius: "10px",
                color: "var(--error)",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                width: "auto"
              }}
            >
              <LogOut size={18} />
              <span>{t('sidebar.logout')}</span>
            </button>
          </div>
        )}        
      </aside>
    </>
  );
}