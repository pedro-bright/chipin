'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const VISITED_KEY = 'tidytab_visited';

interface TrustBannerProps {
  hostName: string;
}

export function TrustBanner({ hostName }: TrustBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(VISITED_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage init
        setShow(true);
      }
    } catch {}
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(VISITED_KEY, '1');
    } catch {}
  };

  if (!show) return null;

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 bg-muted/50 border border-border/50 rounded-xl animate-spring-in">
      <p className="text-sm text-muted-foreground flex-1">
        <span className="font-medium text-foreground">{hostName}</span> shared this bill with you
      </p>
      <button
        onClick={dismiss}
        className="p-1 rounded-full hover:bg-muted transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
