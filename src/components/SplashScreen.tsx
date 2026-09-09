'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export default function SplashScreen({ onComplete, duration = 2500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0px"
        }}
      >
        {/* Logo with drop-shadow outside */}
        <div style={{ 
          width: "150px", 
          height: "150px", 
          position: "relative",
          filter: "drop-shadow(0 0 30px rgba(204, 158, 40, 0.3))"
        }}>
          <Image
            src="/icons/logo.svg"
            alt="D Saing Logo"
            width={150}
            height={150}
            style={{
              animation: "logoFadeInFloat 2.5s ease-in-out forwards",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              willChange: "transform, opacity"
            }}
          />
        </div>

        {/* Wave Loading Dots */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            height: "20px",
            marginTop: "-8px",
            padding: "0 10px"
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
            const position = Math.abs(i - 4);
            const size = Math.max(3, 7 - position * 0.8);
            const delay = i * 0.08;
            const isPeak = i >= 3 && i <= 5;
            
            return (
              <div
                key={i}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  animation: `waveDot 1.2s ease-in-out ${delay}s infinite alternate`,
                  transform: "scale(0.3)",
                  opacity: 0.3,
                  boxShadow: isPeak ? "0 0 12px rgba(255,255,255,0.2)" : "none"
                }}
              />
            );
          })}
        </div>

        <p
          style={{
            color: "#CC9E28",
            fontSize: "16px",
            fontWeight: "500",
            margin: 0,
            marginTop: "20px",
            letterSpacing: "2px",
            textShadow: "0 0 20px rgba(204, 158, 40, 0.3)"
          }}
        >
          ဒီဆိုင်မှာ ဈေးဝယ်ပါ
        </p>
      </div>

      <style>{`
        @keyframes logoFadeInFloat {
          0% {
            transform: translateY(0px) scale(1);
            opacity: 0;
          }
          10% {
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-8px) scale(1.02);
            opacity: 1;
          }
          100% {
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
        }

        @keyframes waveDot {
          0% {
            transform: scale(0.3) translateY(2px);
            opacity: 0.3;
          }
          40% {
            transform: scale(0.9) translateY(-3px);
            opacity: 0.8;
          }
          100% {
            transform: scale(1) translateY(-6px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}