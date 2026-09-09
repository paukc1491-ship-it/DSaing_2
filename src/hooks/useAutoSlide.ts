import { useState, useEffect, useRef, RefObject } from 'react';

export function useAutoSlide(items: any[], speed: number = 5000) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);  // null မပါ
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startAutoSlide = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        if (!isUserInteracting) {
          const nextIndex = (currentIndex + 1) % items.length;
          setCurrentIndex(nextIndex);
          
          if (containerRef.current) {
            containerRef.current.scrollTo({
              left: nextIndex * window.innerWidth,
              behavior: 'smooth'
            });
          }
        }
      }, speed);
    };

    startAutoSlide();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isUserInteracting, items.length, speed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const newIndex = Math.round(scrollLeft / window.innerWidth);
      if (newIndex !== currentIndex && newIndex < items.length) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [currentIndex, items.length]);

  const handleUserInteraction = () => {
    setIsUserInteracting(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setTimeout(() => {
      setIsUserInteracting(false);
    }, speed);
  };

  return {
    currentIndex,
    setCurrentIndex,
    containerRef: containerRef as RefObject<HTMLDivElement>,  // ← ဒီမှာ type သတ်မှတ်ပါ
    handleUserInteraction
  };
}