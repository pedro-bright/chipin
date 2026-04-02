'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, Download } from 'lucide-react';

const VISIT_COUNT_KEY = 'tidytab_visit_count';
const PWA_DISMISSED_KEY = 'tidytab_pwa_dismissed';

/** Pages where the prompt should NOT appear (forms, active bills, etc.) */
const SUPPRESSED_PATHS = ['/new', '/b/', '/g/'];

/**
 * PWA Install Prompt — slim top banner, shown after 3+ visits.
 * Only on mobile. Suppressed on form/bill pages to avoid overlap.
 */
export function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Don't show if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // @ts-expect-error — iOS Safari standalone check
    if (window.navigator.standalone) return;

    // Don't show if user dismissed
    try {
      if (localStorage.getItem(PWA_DISMISSED_KEY)) return;
    } catch { return; }

    // Increment visit count
    try {
      const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(count));
      if (count < 3) return;
    } catch { return; }

    // Only show on mobile-ish screens
    if (window.innerWidth >= 768) return;

    // Suppress on form / active-bill pages
    if (SUPPRESSED_PATHS.some((p) => pathname.startsWith(p))) return;

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- device detection init
    setIsIOS(isIOSDevice);

    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, [pathname]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, '1');
    } catch {
      // silent
    }
  };

  if (!show) return null;

  return (
    <div className="w-full bg-primary/5 border-b border-primary/15">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-4 h-4 text-primary" />
        </div>
        <p className="flex-1 text-sm text-foreground leading-snug font-[family-name:var(--font-main)]">
          <span className="font-semibold">Add TidyTab to your home screen</span>
          <span className="hidden xs:inline text-muted-foreground ml-1">
            {isIOS
              ? '— tap Share → "Add to Home Screen"'
              : '— quick access, works offline'}
          </span>
        </p>
        <button
          onClick={dismiss}
          className="p-2.5 -mr-1 rounded-full hover:bg-muted transition-colors shrink-0"
          style={{ minWidth: 44, minHeight: 44 }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
