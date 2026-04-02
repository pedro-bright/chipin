'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on mount.
 * Renders nothing — just a side-effect component.
 */
export function SWRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {
          // Registration failed — non-critical, ignore silently
        });
    }
  }, []);

  return null;
}
