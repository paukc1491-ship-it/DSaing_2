// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import Header from '@/components/Header';
import BannerSlider from '@/components/BannerSlider';
import CategoryAds from '@/components/CategoryAds';
import SearchResults from '@/components/SearchResults';
import LocationModal from '@/components/LocationModal';
import Sidebar from '@/components/Sidebar';
import { useAutoSlide } from '@/hooks/useAutoSlide';
import { CATEGORIES } from '@/data/categories';
import { getBanners, listenBanners, Banner } from '@/data/banners';
import { getCategoryAds, listenCategoryAds, CategoryAd } from '@/data/categoryAds';
import { getAds, listenAds, AdItem } from '@/data/Ads';
import { MYANMAR_CITIES } from '@/data/cities';
import { MapPin, Search } from 'lucide-react';
import ProductDetailModal from '@/components/ProductDetailModal';
import ChatModal from '@/components/ChatModal';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useLanguage } from '@/components/LanguageProvider';
import { translateCity, translateState } from '@/data/cities';
import Image from 'next/image';

export default function Home() {
  const { language, t } = useLanguage();
  const [showSplash, setShowSplash] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [liveProducts, setLiveProducts] = useState<AdItem[]>([]);
  
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'user' | 'seller' | null>(null);
  const [loading, setLoading] = useState(true);

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatProduct, setChatProduct] = useState<any>(null);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [canChatFromFeaturedAd, setCanChatFromFeaturedAd] = useState(true);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categoryAds, setCategoryAds] = useState<CategoryAd[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  
  const uniqueLocations = Array.from(new Set(MYANMAR_CITIES)).sort();
  const filteredLocations = uniqueLocations.filter((loc) =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  useEffect(() => {
    const unsubscribe = listenAds((items: AdItem[]) => {
      setLiveProducts(items.filter((item) => item.sellerId));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = listenBanners((items: Banner[]) => {
      setBanners(items);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = listenCategoryAds((items: CategoryAd[]) => {
      setCategoryAds(items);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const snapshot = await getDoc(userRef);
          setUserRole(snapshot.exists() ? snapshot.data().role || 'user' : 'user');
        } catch (error) {
          console.error('Failed to load user profile:', error);
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const { currentIndex, setCurrentIndex, containerRef, handleUserInteraction } = useAutoSlide(banners);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installed successfully!');
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        console.log('✅ User accepted install');
      } else {
        console.log('❌ User dismissed install');
      }
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleProductClick = (product: any, allowChat = true) => {
    setCanChatFromFeaturedAd(allowChat);
    setSelectedProduct({
      ...product,      
    });
    setIsProductModalOpen(true);
  };

  const handleFeaturedBannerClick = (banner: any) => {
    if (!banner.targetSellerId) return;

    const allowChat = userRole !== 'seller';
    handleProductClick({
      ...banner,
      id: banner.productId,
      sellerId: banner.targetSellerId,
      sellerName: banner.brand
    }, allowChat);
  };

  const handleChatNow = (product: any) => {
    setChatProduct(product);
    setIsChatModalOpen(true);
  };

  const getFilteredSearchResults = (query: string) => {
  const searchLower = query.toLowerCase().trim();
  
  const allItems = [...categoryAds, ...liveProducts];

    if (!searchLower) {
      return allItems;
    }

    return allItems.filter((item) => {
      const matchesCategory = selectedCategory === 'All' ||
        (item.category?.toLowerCase() || '') === selectedCategory.toLowerCase();
      const matchesLocation = selectedLocation === 'All' ||
        (item.location?.toLowerCase() || '').includes(selectedLocation.toLowerCase());
      const matchesSearch = [item.brand, item.title, item.location, item.category]
        .some(field => field?.toLowerCase().includes(searchLower));
      return matchesCategory && matchesLocation && matchesSearch;
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === "") {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchResults(getFilteredSearchResults(query));
  };

  useEffect(() => {
    if (isSearching && searchQuery.trim() !== '') {
      setSearchResults(getFilteredSearchResults(searchQuery));
    }
  }, [selectedCategory, selectedLocation, liveProducts, categoryAds]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} duration={2500} />;
  }

  return (
    <div 
      style={{ 
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        height: "100vh",
        maxWidth: "100vw",
        overflow: "hidden",
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <Header
        setIsSidebarOpen={setIsSidebarOpen}
        setIsLocationModalOpen={setIsLocationModalOpen}
        selectedLocation={selectedLocation}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        clearSearch={clearSearch}
        CATEGORIES={CATEGORIES}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}        
      />

      <main 
        style={{ 
          flex: 1,
          minHeight: 0,
          maxWidth: "600px", 
          margin: "0 auto", 
          padding: "0",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative"
        }}
      >
        {isSearching && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "var(--background)",
              zIndex: 15,
              padding: "16px",
              overflowY: "auto",
              overflowX: "hidden"
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                {t('common.found')} {searchResults.length} {t('common.result')}{searchResults.length > 1 ? 's' : ''} "{searchQuery}"
              </span>
            </div>
            
            {searchResults.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  height: "100%"
                }}
              >
                <Search size={48} style={{ color: "var(--text-muted)", marginBottom: "16px" }} />
                <h3 style={{ color: "var(--foreground)", fontSize: "18px", margin: 0 }}>{t('common.noResults')}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px", textAlign: "center" }}>
                  {t('common.noResultsDesc')} "{searchQuery}"
                </p>
                <button
                  onClick={clearSearch}
                  style={{
                    marginTop: "16px",
                    backgroundColor: "var(--accent)",
                    color: "#000000",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 24px",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  {t('common.clearSearch')}
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px"
                }}
              >
                {searchResults.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    style={{
                      backgroundColor: "var(--card-background)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      const allowChat = userRole !== 'seller';
                      handleProductClick(item, allowChat);
                    }}
                  >
                    <div style={{ position: "relative", width: "100%", height: "120px", backgroundColor: "var(--hover-background)" }}>
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover"
                        }}
                      />
                      <div 
                        style={{
                          position: "absolute",
                          top: "6px",
                          left: "6px",
                          backgroundColor: "var(--error)",
                          color: "#ffffff",
                          fontSize: "9px",
                          fontWeight: "700",
                          padding: "2px 6px",
                          borderRadius: "3px"
                        }}
                      >
                        {item.discount}
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          left: "4px",
                          backgroundColor: "rgba(0,0,0,0.7)",
                          color: "#ffffff",
                          fontSize: "8px",
                          padding: "2px 6px",
                          borderRadius: "3px"
                        }}
                      >
                        {item.category}
                      </div>
                    </div>
                    <div style={{ padding: "8px 10px" }}>
                      <span style={{ fontSize: "10px", fontWeight: "600", color: "var(--accent)", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.brand}
                      </span>
                      <h4 style={{ margin: "2px 0", fontSize: "11px", fontWeight: "600", color: "var(--foreground)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3, height: "28px" }}>
                        {item.title}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <MapPin size={9} style={{ color: "#ef4444" }} />
                        <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>
                        {item.location}
                      </span>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--success)", display: "block", marginTop: "2px" }}>
                        {item.price} MMK
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedCategory === "All" && !isSearching && banners.length > 0 && (
          <BannerSlider
            FEATURED_BANNERS={banners}
            scrollContainerRef={containerRef}
            handleUserInteraction={handleUserInteraction}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            onBannerClick={handleFeaturedBannerClick}
          />
        )}

        {!isSearching && (
          <CategoryAds
            selectedCategory={selectedCategory}
            CATEGORY_ADS={categoryAds}
            selectedLocation={selectedLocation}
            onProductClick={handleProductClick}
            userRole={userRole}
          />
        )}
      </main>

      {showInstallBtn && (
        <button
          onClick={handleInstallClick}
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "var(--accent)",
            color: "#000000",
            border: "none",
            borderRadius: "12px",
            padding: "14px 28px",
            fontSize: "16px",
            fontWeight: "700",
            cursor: "pointer",
            zIndex: 9999,
            boxShadow: "0 8px 32px rgba(56,189,248,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.transform = "translateX(-50%) scale(1.05)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.transform = "translateX(-50%) scale(1)";
          }}
        >
          📲 Install App
        </button>
      )}

      <LocationModal
        isLocationModalOpen={isLocationModalOpen}
        setIsLocationModalOpen={setIsLocationModalOpen}
        uniqueLocations={uniqueLocations}
        filteredLocations={filteredLocations}
        locationSearch={locationSearch}
        setLocationSearch={setLocationSearch}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
      />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        user={user}
        userRole={userRole}
      />

      <ProductDetailModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onChatNow={handleChatNow}
        allowChat={canChatFromFeaturedAd}
      />

      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          setChatProduct(null);
        }}
        product={chatProduct}
      />    
    </div>
  );
}