'use client';

import { useState, useRef, useEffect } from 'react';

interface BadgeTooltipProps {
  icon: string;
  label: string;
  description: string;
}

export function BadgeTooltip({ icon, label, description }: BadgeTooltipProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close on outside tap
  useEffect(() => {
    if (!show) return;
    const handler = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [show]);

  // Auto-dismiss after 3s
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <span
      ref={ref}
      className="relative inline-block cursor-pointer"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((s) => !s)}
      role="button"
      aria-label={`${label}: ${description}`}
    >
      <span className="text-base">{icon}</span>
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap shadow-lg z-50 animate-in fade-in slide-in-from-bottom-1 duration-150"
          style={{ pointerEvents: 'none' }}
        >
          <span className="font-bold">{label}</span>
          <br />
          <span className="opacity-80">{description}</span>
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </span>
      )}
    </span>
  );
}
