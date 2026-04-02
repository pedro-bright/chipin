'use client';

import { useCallback, useRef } from 'react';
import type { PaymentIntent, PaymentMethod } from './usePaymentState';

interface UsePaymentPersistenceOptions {
  billSlug: string;
}

interface RecordContributionParams {
  personName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  claimedItemIds?: string[];
  note?: string;
}

/**
 * Hook for persisting payment intent to localStorage and syncing with server.
 * 
 * Handles:
 * - localStorage read/write for PaymentIntent
 * - Server sync via Supabase contributions table
 * - Page reload recovery (restore state from localStorage on mount)
 */
export function usePaymentPersistence({ billSlug }: UsePaymentPersistenceOptions) {
  const storageKey = `tidytab_payment_intent_${billSlug}`;
  const pendingSyncRef = useRef(false);

  // Save intent to localStorage
  const saveIntent = useCallback((intent: PaymentIntent) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(intent));
    } catch (e) {
      console.error('Failed to save payment intent:', e);
    }
  }, [storageKey]);

  // Load intent from localStorage
  const loadIntent = useCallback((): PaymentIntent | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load payment intent:', e);
    }
    return null;
  }, [storageKey]);

  // Clear intent from localStorage
  const clearIntent = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error('Failed to clear payment intent:', e);
    }
  }, [storageKey]);

  // Record contribution to server (creates entry in contributions table)
  const recordContribution = useCallback(async ({
    personName,
    amount,
    paymentMethod,
    claimedItemIds = [],
    note,
  }: RecordContributionParams): Promise<{ success: boolean; error?: string }> => {
    if (pendingSyncRef.current) {
      return { success: false, error: 'Sync already in progress' };
    }

    pendingSyncRef.current = true;

    try {
      const res = await fetch(`/api/bills/${billSlug}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_name: personName,
          amount,
          payment_method: paymentMethod,
          claimed_item_ids: claimedItemIds,
          note: note || 'Payment confirmed via TidyTab',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.error || 'Failed to record contribution' 
        };
      }

      // Also store in localStorage that contribution was made
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`tidytab_contributed_${billSlug}`, JSON.stringify({
            name: personName,
            amount,
            method: paymentMethod,
            at: new Date().toISOString(),
          }));
        } catch {
          // Non-critical, continue
        }
      }

      return { success: true };
    } catch (e) {
      console.error('Failed to record contribution:', e);
      return { 
        success: false, 
        error: e instanceof Error ? e.message : 'Network error' 
      };
    } finally {
      pendingSyncRef.current = false;
    }
  }, [billSlug]);

  // Check if we have a previous contribution for this bill
  const hasPreviousContribution = useCallback((): { contributed: boolean; amount?: number } => {
    if (typeof window === 'undefined') return { contributed: false };
    try {
      const saved = localStorage.getItem(`tidytab_contributed_${billSlug}`);
      if (saved) {
        const data = JSON.parse(saved);
        return { contributed: true, amount: data.amount };
      }
    } catch {
      // Ignore
    }
    return { contributed: false };
  }, [billSlug]);

  // Clear contribution record (for "pay again" flow)
  const clearContributionRecord = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`tidytab_contributed_${billSlug}`);
    } catch {
      // Ignore
    }
  }, [billSlug]);

  return {
    saveIntent,
    loadIntent,
    clearIntent,
    recordContribution,
    hasPreviousContribution,
    clearContributionRecord,
    isPending: () => pendingSyncRef.current,
  };
}
