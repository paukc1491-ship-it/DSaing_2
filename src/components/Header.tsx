// components/Header.tsx
'use client';

import { Menu, MapPin, ChevronDown, Search, X, Heart } from "lucide-react";
import { useLanguage } from '@/components/LanguageProvider';
import { translateCity } from '@/data/cities';
import { useWishlist } from '@/context/WishlistContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface HeaderProps {
  setIsSidebarOpen: (value: boolean) => void;
  setIsLocationModalOpen: (value: boolean) => void;
  selectedLocation: string;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  handleSearch: (query: string) => void;
  clearSearch: () => void;
  CATEGORIES: string[];
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
}

export default function Header({
  setIsSidebarOpen,
  setIsLocationModalOpen,
  selectedLocation,
  searchQuery,
  setSearchQuery,
  handleSearch,
  clearSearch,
  CATEGORIES,
  selectedCategory,
  setSelectedCategory,
}: HeaderProps) {
  const { language, t } = useLanguage();
  const { wishlist } = useWishlist();
  const [userRole, setUserRole] = useState<'user' | 'seller' | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ User Role ကို စစ်မယ်
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const role = userSnap.data().role || 'user';
            setUserRole(role);
          } else {
            setUserRole('user');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getLocationDisplay = () => {
    if (selectedLocation === "All") {
      return t('header.allLocations');
    }
    return translateCity(selectedLocation, language);
  };

  // ✅ Wishlist ကို ဝယ်သူမှာပဲ ပြမယ်
  const showWishlist = userRole === 'user' && !loading;

  return (
    <header 
      style={{ 
        backgroundColor: "var(--background)", 
        flexShrink: 0,
        padding: "12px 16px 8px 16px",
        maxWidth: "100%",
        boxSizing: "border-box",
        borderBottom: "1px solid var(--card-border)",
        zIndex: 20
      }}
    >
      <div 
        style={{ 
          display: "flex", 
          flexDirection: "column",
          gap: "12px",
          maxWidth: "600px",
          margin: "0 auto"
        }}
      >
        {/* Top Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "var(--foreground)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "40px",
                width: "40px",
                lineHeight: 0
              }}
            >
              <Menu size={24} />
            </button>

            <div style={{ 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              height: "40px"
            }}>
              <img 
                src="/logo.png"
                alt="D Saing Logo" 
                className="logo"
              />
            </div>
          </div>

          {/* Right Side - Wishlist + Location */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* ✅ Wishlist Button - ဝယ်သူမှာပဲပြမယ် */}
            {showWishlist && (
              <Link
                href="/wishlist"
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  padding: "4px",
                  height: "36px",
                  width: "36px",
                  borderRadius: "50%",
                  textDecoration: "none"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--hover-background)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Heart size={20} />
                {wishlist.length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      backgroundColor: "#ef4444",
                      color: "#ffffff",
                      fontSize: "10px",
                      fontWeight: "600",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid var(--background)"
                    }}
                  >
                    {wishlist.length}
                  </span>
                )}
              </Link>
            )}

            {/* Location Button */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                backgroundColor: "var(--card-background)",
                border: "1px solid var(--card-border)",
                borderRadius: "16px",
                padding: "6px 10px",
                color: "var(--foreground)",
                cursor: "pointer",
                maxWidth: "150px",
                height: "36px"
              }}
            >
              <MapPin size={14} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span 
                style={{ 
                  fontSize: "12px", 
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: selectedLocation === "All" ? "#FFD700" : "var(--foreground)"
                }}
              >
                {getLocationDisplay()}
              </span>
              <ChevronDown size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            backgroundColor: "var(--input-background)", 
            border: "1px solid var(--input-border)",
            borderRadius: "20px",
            padding: "8px 14px",
            width: "100%",
            boxSizing: "border-box",
            position: "relative"
          }}
        >
          <Search size={16} style={{ color: "var(--text-muted)", marginRight: "8px" }} />
          <input 
            type="text" 
            placeholder={t('header.searchPlaceholder').replace('{location}', getLocationDisplay())}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ 
              backgroundColor: "transparent", 
              border: "none", 
              outline: "none", 
              color: "var(--foreground)", 
              fontSize: "13px",
              width: "100%"
            }}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories */}
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "16px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            paddingBottom: "6px",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}
        >
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  clearSearch();
                }}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  padding: "4px 2px",
                  color: isSelected ? "var(--foreground)" : "var(--text-muted)",
                  fontWeight: isSelected ? "600" : "400",
                  fontSize: "13px",
                  cursor: "pointer",
                  flexShrink: 0,
                  borderBottom: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "all 0.2s ease"
                }}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}