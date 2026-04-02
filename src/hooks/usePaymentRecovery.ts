'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { PaymentState } from './usePaymentState';

const GRACE_PERIOD_MS = 20_000; // 20 seconds

interface UsePaymentRecoveryOptions {
  state: PaymentState;
  onRecovery: () => void;
  enabled?: boolean;
}

/**
 * Multi-signal return detection hook.
 * 
 * Combines multiple browser signals to detect when user returns from payment app:
 * 1. visibilitychange - fires when tab becomes visible
 * 2. pageshow (bfcache) - fires when page is restored from cache
 * 3. User interaction - click, touchstart, keydown
 * 
 * Only triggers after a 20-second grace period (user is still transitioning to payment app).
 */
export function usePaymentRecovery({
  state,
  onRecovery,
  enabled = true,
}: UsePaymentRecoveryOptions) {
  const graceElapsed = useRef(false);
  const hasTriggered = useRef(false);
  const onRecoveryRef = useRef(onRecovery);

  // Keep callback ref updated
  useEffect(() => {
    onRecoveryRef.current = onRecovery;
  }, [onRecovery]);

  // Reset refs when state changes
  useEffect(() => {
    if (state === 'external_app_opened') {
      graceElapsed.current = false;
      hasTriggered.current = false;
    } else {
      // If we're not in external_app_opened, reset everything
      graceElapsed.current = false;
      hasTriggered.current = false;
    }
  }, [state]);

  const maybeRecover = useCallback(() => {
    // Only recover if grace period has elapsed and we haven't triggered yet
    if (!graceElapsed.current) return;
    if (hasTriggered.current) return;
    
    hasTriggered.current = true;
    onRecoveryRef.current();
  }, []);

  useEffect(() => {
    // Only listen when we're in external_app_opened state and enabled
    if (state !== 'external_app_opened' || !enabled) return;
    if (typeof window === 'undefined') return;

    // Start 20-second grace period
    const graceTimer = setTimeout(() => {
      graceElapsed.current = true;
      
      // If document is already visible, trigger immediately
      if (!document.hidden) {
        maybeRecover();
      }
    }, GRACE_PERIOD_MS);

    // Signal 1: Visibility change (main signal)
    const handleVisibility = () => {
      if (!document.hidden) {
        maybeRecover();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Signal 2: Page show (bfcache restore)
    // This is crucial for iOS Safari
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        maybeRecover();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    // Signal 3: User interaction (backup signal)
    // This catches cases where visibility events don't fire
    const interactionEvents = ['click', 'touchstart', 'keydown'] as const;
    
    const handleInteraction = () => {
      maybeRecover();
    };

    interactionEvents.forEach(evt => {
      window.addEventListener(evt, handleInteraction, { once: true, passive: true });
    });

    // Cleanup
    return () => {
      clearTimeout(graceTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
      interactionEvents.forEach(evt => {
        window.removeEventListener(evt, handleInteraction);
      });
    };
  }, [state, enabled, maybeRecover]);

  // Return a manual trigger for testing/debugging
  return {
    forceRecovery: maybeRecover,
    isGraceElapsed: () => graceElapsed.current,
    hasTriggered: () => hasTriggered.current,
  };
}
