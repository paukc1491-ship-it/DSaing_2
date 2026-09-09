// src/components/LocationModal.tsx
'use client';

import { MapPin, X, Search, Check } from "lucide-react";
import { useLanguage } from '@/components/LanguageProvider';
import { translateCity } from '@/data/cities';

interface LocationModalProps {
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (value: boolean) => void;
  uniqueLocations: string[];
  filteredLocations: string[];
  locationSearch: string;
  setLocationSearch: (value: string) => void;
  selectedLocation: string;
  setSelectedLocation: (value: string) => void;
}

export default function LocationModal({
  isLocationModalOpen,
  setIsLocationModalOpen,
  uniqueLocations,
  filteredLocations,
  locationSearch,
  setLocationSearch,
  selectedLocation,
  setSelectedLocation
}: LocationModalProps) {
  const { language, t } = useLanguage();

  if (!isLocationModalOpen) return null;

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
    >
      <div 
        style={{
          backgroundColor: "var(--card-background)",
          border: "1px solid var(--card-border)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "400px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxSizing: "border-box"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <MapPin size={18} style={{ color: "#ef4444" }} />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--foreground)" }}>
              {t('Select Location')} ({uniqueLocations.length})
            </h3>
          </div>
          <button 
            onClick={() => setIsLocationModalOpen(false)}
            style={{
              backgroundColor: "var(--hover-background)",
              border: "none",
              color: "var(--foreground)",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            backgroundColor: "var(--input-background)", 
            border: "1px solid var(--input-border)",
            borderRadius: "10px",
            padding: "8px 12px"
          }}
        >
          <Search size={14} style={{ color: "var(--text-muted)", marginRight: "8px" }} />
          <input 
            type="text" 
            placeholder={t('Search Placeholder')}
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            style={{ 
              backgroundColor: "transparent", 
              border: "none", 
              outline: "none", 
              color: "var(--foreground)", 
              fontSize: "13px",
              width: "100%"
            }}
          />
        </div>

        <div 
          style={{ 
            maxHeight: "320px", 
            overflowY: "auto", 
            display: "flex", 
            flexDirection: "column",
            gap: "4px"
          }}
        >
          {filteredLocations.length > 0 ? (
            <>
              <button
                key="all"
                onClick={() => {
                  setSelectedLocation("All");
                  setLocationSearch('');
                  setIsLocationModalOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  backgroundColor: selectedLocation === "All" ? "var(--hover-background)" : "transparent",
                  border: "0px",
                  borderRadius: "8px",
                  color: selectedLocation === "All" ? "var(--foreground)" : "#FFD700",
                  fontSize: "14px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%"
                }}
              >
                <span style={{ 
                  fontWeight: selectedLocation === "All" ? "700" : "600"
                }}>
                  {t('All Locations')}
                </span>
                {selectedLocation === "All" && <Check size={16} style={{ color: "var(--success)" }} />}
              </button>

              {filteredLocations.map((location) => {
                const isSelected = selectedLocation === location;
                const translatedName = translateCity(location, language);
                return (
                  <button
                    key={location}
                    onClick={() => {
                      setSelectedLocation(location);
                      setLocationSearch('');
                      setIsLocationModalOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      backgroundColor: isSelected ? "var(--hover-background)" : "transparent",
                      border: "0px",
                      borderRadius: "8px",
                      color: isSelected ? "var(--foreground)" : "var(--text-secondary)",
                      fontSize: "14px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%"
                    }}
                  >
                    <span>{translatedName}</span>
                    {isSelected && <Check size={16} style={{ color: "var(--success)" }} />}
                  </button>
                );
              })}
            </>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "16px 0", fontSize: "13px" }}>
              {t('location.noResults')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}