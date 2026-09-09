// src/components/BannerSlider.tsx
'use client';

import { MapPin, ChevronRight } from "lucide-react";

interface BannerSliderProps {
  FEATURED_BANNERS: any[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  handleUserInteraction: () => void;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  onBannerClick?: (banner: any) => void;
}

export default function BannerSlider({
  FEATURED_BANNERS,
  scrollContainerRef,
  handleUserInteraction,
  currentIndex,
  setCurrentIndex,
  onBannerClick
}: BannerSliderProps) {
  return (
    <section 
      ref={scrollContainerRef}
      onTouchStart={handleUserInteraction}
      onMouseDown={handleUserInteraction}
      style={{
        display: "flex",
        overflowX: "auto",
        overflowY: "hidden",
        scrollSnapType: "x mandatory",
        width: "100%",
        height: "80vh",
        minHeight: "80vh",
        flexShrink: 0,
        position: "relative",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch"
      }}
    >
      {FEATURED_BANNERS.map((banner) => (
        <div
          key={banner.id}
          style={{
            flex: "0 0 100%",
            width: "100%",
            height: "100%",
            scrollSnapAlign: "start",
            position: "relative",
            backgroundColor: "var(--card-background)",
            display: "flex",
            flexDirection: "column"
          }}
          onClick={() => onBannerClick?.(banner)}
        >
          <div style={{ 
            flex: 1,
            width: "100%", 
            backgroundColor: "var(--hover-background)",
            position: "relative",
            minHeight: 0
          }}>
            <img 
              src={banner.image} 
              alt={banner.title} 
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
            />
            
            <div 
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                backgroundColor: "var(--error)",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: "700",
                padding: "4px 10px",
                borderRadius: "6px",
                zIndex: 2
              }}
            >
              {banner.discount}
            </div>
          </div>

          <div style={{ 
            flexShrink: 0,
            width: "100%",
            padding: "10px 16px 12px 16px",
            display: "flex", 
            flexDirection: "column", 
            gap: "4px", 
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent)" }}>
                {banner.brand}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <MapPin size={12} style={{ color: "#ef4444" }} />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{banner.location}</span>
              </div>
            </div>
            <h3 style={{ 
              margin: 0, 
              fontSize: "15px", 
              fontWeight: "700", 
              color: "#ffffff", 
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}>
              {banner.title}
            </h3>
            <button 
              onClick={(event) => {
                event.stopPropagation();
                onBannerClick?.(banner);
              }}
              style={{
                marginTop: "4px",
                width: "100%",
                backgroundColor: "#ffffff",
                color: "#000000",
                border: "none",
                borderRadius: "8px",
                padding: "8px 0",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px"
              }}
            >
              <span>{banner.cta}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ))}

      <div style={{
        position: "absolute",
        bottom: "110px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "8px",
        zIndex: 10
      }}>
        {FEATURED_BANNERS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              handleUserInteraction();
              setCurrentIndex(idx);
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                  left: idx * window.innerWidth,
                  behavior: 'smooth'
                });
              }
            }}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: idx === currentIndex ? "#ffffff" : "rgba(255,255,255,0.4)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.3s ease"
            }}
          />
        ))}
      </div>
    </section>
  );
}