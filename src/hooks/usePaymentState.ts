'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Payment State Machine
 * 
 * States:
 * - idle: No intent captured yet
 * - intent_captured: User expressed intent, about to leave
 * - external_app_opened: User left to pay (grace timer running)
 * - recovery_pending: User returned, awaiting confirmation
 * - still_pending: User said "not yet" 
 * - confirmed_paid: User self-reported completion (terminal)
 */

export type PaymentState =
  | 'idle'
  | 'intent_captured'
  | 'external_app_opened'
  | 'recovery_pending'
  | 'still_pending'
  | 'confirmed_paid';

export type PaymentMethod = 'venmo' | 'zelle' | 'cashapp' | 'paypal';

export interface PaymentIntent {
  billId: string;
  billSlug: string;
  amount: number;
  method: PaymentMethod;
  recipientName: string;
  payerName: string;
  state: PaymentState;
  intentAt: number;         // timestamp when intent was captured
  appOpenedAt?: number;     // timestamp when external app was opened
  lastInteractionAt: number;
  recoveryToken: string;
}

interface UsePaymentStateOptions {
  billId: string;
  billSlug: string;
  onStateChange?: (state: PaymentState) => void;
}

export function usePaymentState({ billId, billSlug, onStateChange }: UsePaymentStateOptions) {
  const [state, setState] = useState<PaymentState>('idle');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  
  // Keep callback ref updated
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const storageKey = `tidytab_payment_intent_${billSlug}`;

  // Generate a unique recovery token
  const generateRecoveryToken = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Load persisted state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: PaymentIntent = JSON.parse(stored);
        // Validate it's for this bill
        if (parsed.billId === billId) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: restoring state from localStorage on mount
          setIntent(parsed);
          // If we had an unconfirmed intent, transition to recovery_pending
          if (
            parsed.state === 'external_app_opened' ||
            parsed.state === 'recovery_pending' ||
            parsed.state === 'still_pending'
          ) {
            setState('recovery_pending');
            onStateChangeRef.current?.('recovery_pending');
          } else if (parsed.state === 'confirmed_paid') {
            setState('confirmed_paid');
            onStateChangeRef.current?.('confirmed_paid');
          }
        }
      }
    } catch (e) {
      console.error('Failed to load payment state:', e);
    }
  }, [billId, storageKey]);

  // Persist state changes to localStorage
  const persistIntent = useCallback((newIntent: PaymentIntent) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(newIntent));
    } catch (e) {
      console.error('Failed to persist payment intent:', e);
    }
  }, [storageKey]);

  // Clear persisted state
  const clearIntent = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error('Failed to clear payment intent:', e);
    }
    setIntent(null);
    setState('idle');
    onStateChangeRef.current?.('idle');
  }, [storageKey]);

  // Capture intent (before opening payment app)
  const captureIntent = useCallback((details: {
    amount: number;
    method: PaymentMethod;
    recipientName: string;
    payerName: string;
  }) => {
    const now = Date.now();
    const newIntent: PaymentIntent = {
      billId,
      billSlug,
      amount: details.amount,
      method: details.method,
      recipientName: details.recipientName,
      payerName: details.payerName,
      state: 'intent_captured',
      intentAt: now,
      lastInteractionAt: now,
      recoveryToken: generateRecoveryToken(),
    };
    
    setIntent(newIntent);
    persistIntent(newIntent);
    setState('intent_captured');
    onStateChangeRef.current?.('intent_captured');
    
    return newIntent;
  }, [billId, billSlug, generateRecoveryToken, persistIntent]);

  // Mark that external app was opened
  const markAppOpened = useCallback(() => {
    if (!intent) return;
    
    const now = Date.now();
    const updated: PaymentIntent = {
      ...intent,
      state: 'external_app_opened',
      appOpenedAt: now,
      lastInteractionAt: now,
    };
    
    setIntent(updated);
    persistIntent(updated);
    setState('external_app_opened');
    onStateChangeRef.current?.('external_app_opened');
  }, [intent, persistIntent]);

  // Transition to recovery pending (after grace period)
  const triggerRecovery = useCallback(() => {
    if (!intent) return;
    if (state === 'confirmed_paid') return; // Already confirmed
    
    const now = Date.now();
    const updated: PaymentIntent = {
      ...intent,
      state: 'recovery_pending',
      lastInteractionAt: now,
    };
    
    setIntent(updated);
    persistIntent(updated);
    setState('recovery_pending');
    onStateChangeRef.current?.('recovery_pending');
  }, [intent, state, persistIntent]);

  // User confirmed they paid
  const confirmPaid = useCallback(() => {
    if (!intent) return;
    
    const now = Date.now();
    const updated: PaymentIntent = {
      ...intent,
      state: 'confirmed_paid',
      lastInteractionAt: now,
    };
    
    setIntent(updated);
    persistIntent(updated);
    setState('confirmed_paid');
    onStateChangeRef.current?.('confirmed_paid');
    
    return updated;
  }, [intent, persistIntent]);

  // User said "not yet"
  const markStillPending = useCallback(() => {
    if (!intent) return;
    
    const now = Date.now();
    const updated: PaymentIntent = {
      ...intent,
      state: 'still_pending',
      lastInteractionAt: now,
    };
    
    setIntent(updated);
    persistIntent(updated);
    setState('still_pending');
    onStateChangeRef.current?.('still_pending');
  }, [intent, persistIntent]);

  // Reset to idle (e.g., after "not yet" and user wants to try again)
  const resetToIdle = useCallback(() => {
    clearIntent();
  }, [clearIntent]);

  return {
    state,
    intent,
    captureIntent,
    markAppOpened,
    triggerRecovery,
    confirmPaid,
    markStillPending,
    resetToIdle,
    clearIntent,
  };
}
