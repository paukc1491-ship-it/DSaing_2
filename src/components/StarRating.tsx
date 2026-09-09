// components/StarRating.tsx
'use client';

import { useState, useEffect, useId } from 'react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}

export default function StarRating({ 
  rating, 
  onRatingChange, 
  readonly = false,
  size = 24
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(rating);
  
  // ✅ SVG ID တွေ တူမနေစေရန် သီးသန့် ID တစ်ခု ဖန်တီးခြင်း
  const uniqueId = useId().replace(/:/g, '');

  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);

  const handleClick = (value: number) => {
    if (readonly || !onRatingChange) return;
    onRatingChange(value);
    setCurrentRating(value);
  };

  const getStarFill = (starIndex: number) => {
    const fullStars = Math.floor(currentRating);
    const fractional = currentRating - fullStars;
    
    if (starIndex < fullStars) return 1;
    if (starIndex === fullStars) return fractional;
    return 0;
  };

  const displayRating = hoveredRating || currentRating;

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[0, 1, 2, 3, 4].map((starIndex) => {
        const starNumber = starIndex + 1;
        
        let fillPercentage;
        if (readonly) {
          fillPercentage = getStarFill(starIndex);
        } else {
          fillPercentage = starIndex < displayRating ? 1 : 0;
        }

        // ✅ Component တစ်ခုချင်းစီအတွက် သီးသန့် Gradient ID
        const gradientId = `star-fill-${uniqueId}-${starIndex}`;

        return (
          <button
            key={starIndex}
            onClick={() => handleClick(starNumber)}
            onMouseEnter={() => !readonly && setHoveredRating(starNumber)}
            onMouseLeave={() => !readonly && setHoveredRating(0)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: readonly ? 'default' : 'pointer',
              padding: '2px',
              position: 'relative',
              transition: 'transform 0.2s ease'
            }}
            disabled={readonly}
            type="button"
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              style={{ display: 'block' }}
            >
              {/* Background Star */}
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              
              {/* Foreground Star */}
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset={`${fillPercentage * 100}%`} stopColor="#F59E0B" />
                  <stop offset={`${fillPercentage * 100}%`} stopColor="transparent" />
                </linearGradient>
              </defs>
              
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill={`url(#${gradientId})`}
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}