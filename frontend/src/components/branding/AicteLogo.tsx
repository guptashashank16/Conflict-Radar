import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  lightText?: boolean;
}

export const AicteLogo: React.FC<LogoProps> = ({
  className = '',
  size = 44,
  showText = false,
  lightText = true,
}) => {
  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Official-Style AICTE Emblem in Deep Aubergine & Marigold */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-md"
      >
        <circle cx="50" cy="50" r="48" fill="#3A0F34" stroke="#EAAA00" strokeWidth="2" />

        {/* Outer Cogwheel Teeth in Marigold */}
        <g stroke="#EAAA00" strokeWidth="3" strokeLinecap="round">
          <line x1="50" y1="4" x2="50" y2="10" />
          <line x1="50" y1="90" x2="50" y2="96" />
          <line x1="4" y1="50" x2="10" y2="50" />
          <line x1="90" y1="50" x2="96" y2="50" />
          <line x1="17" y1="17" x2="22" y2="22" />
          <line x1="78" y1="78" x2="83" y2="83" />
          <line x1="17" y1="83" x2="22" y2="78" />
          <line x1="78" y1="22" x2="83" y2="17" />
          <line x1="28" y1="7" x2="31" y2="13" />
          <line x1="69" y1="87" x2="72" y2="93" />
          <line x1="7" y1="28" x2="13" y2="31" />
          <line x1="87" y1="69" x2="93" y2="72" />
          <line x1="72" y1="7" x2="69" y2="13" />
          <line x1="31" y1="87" x2="28" y2="93" />
          <line x1="93" y1="28" x2="87" y2="31" />
          <line x1="13" y1="69" x2="7" y2="72" />
        </g>

        {/* Circular Ring Frame */}
        <circle cx="50" cy="50" r="39" stroke="#EAAA00" strokeWidth="2" fill="#3A0F34" />
        <circle cx="50" cy="50" r="32" stroke="#EAAA00" strokeWidth="1" strokeDasharray="3 2" fill="none" />

        {/* Traditional Diya Lamp Base */}
        <path
          d="M26 62 Q50 78 74 62 C70 69 61 73 50 73 C39 73 30 69 26 62Z"
          fill="#EAAA00"
          stroke="#FFF"
          strokeWidth="1"
        />
        <ellipse cx="50" cy="62" rx="24" ry="4" fill="#C88F00" />

        {/* Central Eternal Flame in Marigold & Saffron */}
        <path
          d="M50 20 C42 32 36 43 42 54 C45 49 50 48 51 44 C53 49 58 51 58 54 C64 43 58 32 50 20Z"
          fill="url(#aicteFlameGrad)"
        />
        {/* Inner Flame Core */}
        <path
          d="M50 30 C46 38 42 45 46 51 C48 48 51 47 52 45 C53 48 56 49 55 51 C58 45 54 38 50 30Z"
          fill="#FFFDF5"
        />

        {/* Accent at Base */}
        <circle cx="50" cy="63" r="3" fill="#3A0F34" stroke="#EAAA00" strokeWidth="0.8" />

        <defs>
          <linearGradient id="aicteFlameGrad" x1="50" y1="20" x2="50" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EAAA00" />
            <stop offset="60%" stopColor="#F7D452" />
            <stop offset="100%" stopColor="#FFFDF5" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className="text-[10px] font-extrabold tracking-widest text-[#EAAA00] uppercase leading-none">
            AICTE
          </span>
          <span className={`text-xs font-bold leading-tight ${lightText ? 'text-white' : 'text-[#3A0F34]'}`}>
            All India Council for Technical Education
          </span>
          <span className={`text-[9px] leading-tight ${lightText ? 'text-slate-300' : 'text-slate-600'}`}>
            Statutory Body &bull; Ministry of Education, Govt. of India
          </span>
        </div>
      )}
    </div>
  );
};
