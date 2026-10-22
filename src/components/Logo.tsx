import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
  light = false,
}) => {
  const dimensions = {
    sm: { width: 140, height: 42, iconSize: 28, textClass: 'text-lg', subClass: 'text-[9px]' },
    md: { width: 190, height: 56, iconSize: 36, textClass: 'text-2xl', subClass: 'text-[11px]' },
    lg: { width: 260, height: 78, iconSize: 48, textClass: 'text-3xl', subClass: 'text-xs' },
    xl: { width: 340, height: 100, iconSize: 64, textClass: 'text-4xl', subClass: 'text-sm' },
  }[size];

  const primaryTextColor = light ? 'text-white' : 'text-[#002b49]';
  const accentRedColor = '#c4152e';
  const aviationBlue = light ? '#60a5fa' : '#003366';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* SVG Icon: Flight Trail + Airplane + ECG Heartbeat integrated into M */}
      <svg
        viewBox="0 0 100 80"
        className="shrink-0 transition-transform hover:scale-105 duration-200"
        style={{ width: dimensions.iconSize * 1.25, height: dimensions.iconSize }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Dynamic Flight Arch Path */}
        <path
          d="M 12 60 C 25 22, 55 12, 82 14"
          stroke={aviationBlue}
          strokeWidth="3.5"
          strokeLinecap="round"
          className="opacity-90"
        />

        {/* Airplane Silhouette climbing to top right */}
        <g transform="translate(80, 14) rotate(18)">
          <path
            d="M 0 -7 L 4 -2 L 11 -2 L 13 -4 L 14 -4 L 13 0 L 14 4 L 13 4 L 11 2 L 4 2 L 0 7 L -2 7 L 0 2 L -8 2 L -11 5 L -13 5 L -12 0 L -13 -5 L -11 -5 L -8 -2 L 0 -2 Z"
            fill={aviationBlue}
          />
        </g>

        {/* Medical ECG Pulse Wave forming the M base */}
        <path
          d="M 8 52 L 20 52 L 24 44 L 28 62 L 34 32 L 40 68 L 45 48 L 50 54 L 54 52 L 64 52"
          stroke={accentRedColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Subtle Stethoscope / Pulse node glow dot */}
        <circle cx="34" cy="32" r="3" fill={accentRedColor} />
      </svg>

      {/* Typography: M737 and MEDICAL PLATFORM */}
      <div className="flex flex-col leading-none">
        <div className={`font-extrabold tracking-tight flex items-baseline ${dimensions.textClass}`}>
          <span className="text-[#c4152e]">M</span>
          <span className={primaryTextColor}>737</span>
        </div>
        {showTagline && (
          <span
            className={`font-semibold tracking-[0.22em] uppercase transition-colors ${
              light ? 'text-slate-200' : 'text-[#003366]'
            } ${dimensions.subClass} mt-0.5`}
          >
            MEDICAL PLATFORM
          </span>
        )}
      </div>
    </div>
  );
};
