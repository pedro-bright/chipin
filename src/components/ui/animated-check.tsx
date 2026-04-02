'use client';

interface AnimatedCheckProps {
  size?: number;
  className?: string;
}

export function AnimatedCheck({ size = 64, className = '' }: AnimatedCheckProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
    >
      {/* Circle */}
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        style={{
          strokeDasharray: 176,
          strokeDashoffset: 176,
          animation: 'circle-draw 0.4s ease-out forwards',
        }}
      />
      {/* Checkmark */}
      <path
        d="M20 32 L28 40 L44 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 40,
          strokeDashoffset: 40,
          animation: 'check-draw 0.3s ease-out 0.35s forwards',
        }}
      />
      <style>{`
        @keyframes circle-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes check-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}
