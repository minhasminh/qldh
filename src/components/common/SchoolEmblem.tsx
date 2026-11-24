import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';

interface SchoolEmblemProps {
  className?: string;
  size?: number;
  src?: string;
  alt?: string;
}

export const SchoolEmblem: React.FC<SchoolEmblemProps> = ({
  className = '',
  size = 44,
  src,
  alt = 'Logo trường',
}) => {
  let appLogoUrl: string | undefined;
  try {
    const appContext = useApp();
    appLogoUrl = appContext?.schoolSettings?.logoUrl;
  } catch {
    // If rendered outside AppContext
  }

  const effectiveSrc = src || appLogoUrl;
  const [imgError, setImgError] = useState(false);

  // Reset imgError if effectiveSrc changes
  React.useEffect(() => {
    setImgError(false);
  }, [effectiveSrc]);

  if (effectiveSrc && !imgError) {
    return (
      <img
        src={effectiveSrc}
        alt={alt}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 border border-amber-400/50 shadow-xs bg-white ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <circle cx="50" cy="50" r="47" fill="#0F284E" stroke="#C59B27" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#C59B27" strokeWidth="0.8" strokeDasharray="2 2" />

      {/* Decorative Laurel Branches */}
      <path
        d="M20 62C18 52 24 38 34 32C32 37 32 44 35 48C28 48 24 54 20 62Z"
        fill="#C59B27"
        opacity="0.85"
      />
      <path
        d="M80 62C82 52 76 38 66 32C68 37 68 44 65 48C72 48 76 54 80 62Z"
        fill="#C59B27"
        opacity="0.85"
      />

      {/* Rising Sun Rays */}
      <path d="M50 25L50 18" stroke="#E5B83B" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 28L35 22" stroke="#E5B83B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M60 28L65 22" stroke="#E5B83B" strokeWidth="1.8" strokeLinecap="round" />

      {/* Open Book */}
      <path
        d="M50 56C42 52 32 52 25 54V72C32 70 42 70 50 74C58 70 68 70 75 72V54C68 52 58 52 50 56Z"
        fill="#F8FAFC"
        stroke="#0F284E"
        strokeWidth="1.2"
      />
      <line x1="50" y1="56" x2="50" y2="74" stroke="#0F284E" strokeWidth="1.2" />

      {/* Torch of Knowledge */}
      <path
        d="M48 34C48 30 52 24 50 22C54 26 55 30 52 34H48Z"
        fill="#DC2626"
      />
      <path
        d="M50 22C47 26 48 30 50 34"
        stroke="#F59E0B"
        strokeWidth="1.5"
      />
      <polygon points="46,34 54,34 52,48 48,48" fill="#C59B27" stroke="#9A7B1C" strokeWidth="0.8" />

      {/* Star */}
      <polygon
        points="50,12 52,16 56,16 53,19 54,23 50,20 46,23 47,19 44,16 48,16"
        fill="#E5B83B"
      />

      {/* Small Banner bottom */}
      <path
        d="M32 78C42 76 58 76 68 78L64 84C55 82 45 82 36 84L32 78Z"
        fill="#C59B27"
      />
    </svg>
  );
};
