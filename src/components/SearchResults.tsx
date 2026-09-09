'use client';

import { Search, MapPin } from "lucide-react";

interface SearchResultsProps {
  isSearching: boolean;
  searchResults: any[];
  searchQuery: string;
  clearSearch: () => void;
  onProductClick?: (product: any) => void;  // ← ဒီမှာ ထည့်ပါ
}

export default function SearchResults({ 
  isSearching, 
  searchResults, 
  searchQuery, 
  clearSearch,
  onProductClick  // ← ဒီမှာ ထည့်ပါ
}: SearchResultsProps) {
  if (!isSearching) return null;

  // No Results
  if (searchResults.length === 0 && searchQuery.trim() !== "") {
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#000000",
          zIndex: 15,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px"
        }}
      >
        <Search size={48} style={{ color: "#333333", marginBottom: "16px" }} />
        <h3 style={{ color: "#ffffff", fontSize: "18px", margin: 0 }}>No results found</h3>
        <p style={{ color: "#888888", fontSize: "14px", marginTop: "8px", textAlign: "center" }}>
          We couldn't find any products matching "{searchQuery}"
        </p>
        <button
          onClick={clearSearch}
          style={{
            marginTop: "16px",
            backgroundColor: "#ffffff",
            color: "#000000",
            border: "none",
            borderRadius: "8px",
            padding: "8px 24px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer"
          }}
        >
          Clear Search
        </button>
      </div>
    );
  }

  // Results
  if (searchResults.length > 0) {
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#000000",
          zIndex: 15,
          padding: "16px",
          overflowY: "auto",
          overflowX: "hidden"
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <span style={{ color: "#888888", fontSize: "13px" }}>
            Found {searchResults.length} result{searchResults.length > 1 ? 's' : ''}
          </span>
        </div>
        
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px"
          }}
        >
          {searchResults.map((ad, index) => (
            <div
              key={`${ad.id}-${ad.category}-${index}`}
              style={{
                backgroundColor: "#121212",
                border: "1px solid #262626",
                borderRadius: "12px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer"  // ← ဒီမှာ cursor pointer ထည့်ပါ
              }}
              onClick={() => onProductClick?.(ad)}  // ← ဒီမှာ onClick ထည့်ပါ
            >
              <div style={{ position: "relative", width: "100%", height: "120px", backgroundColor: "#1a1a1a" }}>
                <img 
                  src={ad.image} 
                  alt={ad.title} 
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
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    fontSize: "9px",
                    fontWeight: "700",
                    padding: "2px 6px",
                    borderRadius: "3px"
                  }}
                >
                  {ad.discount}
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
                  {ad.category}
                </div>
              </div>
              <div style={{ padding: "8px 10px" }}>
                <span style={{ fontSize: "10px", fontWeight: "600", color: "#38bdf8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ad.brand}
                </span>
                <h4 style={{ margin: "2px 0", fontSize: "11px", fontWeight: "600", color: "#ffffff", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3, height: "28px" }}>
                  {ad.title}
                </h4>
                <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                  <MapPin size={9} style={{ color: "#ef4444" }} />
                  <span style={{ fontSize: "9px", color: "#888888" }}>{ad.location}</span>
                </div>
                <span style={{ fontSize: "10px", fontWeight: "700", color: "#22c55e", display: "block", marginTop: "2px" }}>
                  {ad.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}