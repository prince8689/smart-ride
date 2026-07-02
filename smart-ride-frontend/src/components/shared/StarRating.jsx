import React, { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ 
  rating = 0, 
  maxStars = 5, 
  interactive = false, 
  size = 'md', 
  onRate = () => {},
  showNumber = false
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: 16,
    md: 20,
    lg: 28,
  };

  const currentSize = sizes[size] || sizes.md;

  const handleMouseEnter = (index) => {
    if (interactive) setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (interactive) setHoverRating(0);
  };

  const handleClick = (index) => {
    if (interactive) onRate(index);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[...Array(maxStars)].map((_, i) => {
          const starValue = i + 1;
          const displayRating = interactive ? (hoverRating || rating) : rating;
          
          let fill = 'none';
          if (displayRating >= starValue) fill = 'currentColor';
          else if (displayRating >= starValue - 0.5) fill = 'url(#halfGradient)';

          const colorClass = displayRating >= starValue || displayRating >= starValue - 0.5
            ? (interactive && hoverRating >= starValue ? 'text-yellow-300' : 'text-yellow-400')
            : 'text-gray-200';

          return (
            <div
              key={i}
              className={`relative ${interactive ? 'cursor-pointer transition-transform hover:scale-110' : ''}`}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(starValue)}
            >
              {/* Half-star gradient definition */}
              {i === 0 && !interactive && (
                <svg width="0" height="0">
                  <defs>
                    <linearGradient id="halfGradient" x1="0" x2="100%" y1="0" y2="0">
                      <stop offset="50%" stopColor="currentColor" />
                      <stop offset="50%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
              <Star
                size={currentSize}
                className={colorClass}
                fill={fill}
                strokeWidth={1.5}
              />
            </div>
          );
        })}
      </div>
      
      {!interactive && showNumber && rating > 0 && (
        <span className="text-sm font-bold text-navy-700 ml-1">
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}
