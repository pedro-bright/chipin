'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePaymentState, type PaymentMethod } from '@/hooks/usePaymentState';
import { usePaymentRecovery } from '@/hooks/usePaymentRecovery';
import { usePaymentPersistence } from '@/hooks/usePaymentPersistence';
import { PreFlightConfirm } from './PreFlightConfirm';
import { RecoveryBottomSheet } from './RecoveryBottomSheet';
import { PaymentStatus } from './PaymentStatus';
import { Button } from '@/components/ui/button';
import { formatCurrency, generateVenmoLink, generateCashAppLink } from '@/lib/utils';
import { celebrateContribution } from '@/lib/confetti';

interface PaymentFlowProps {
  billId: string;
  billSlug: string;
  amount: number;
  method: PaymentMethod;
  recipientName: string;
  payerName: string;
  venmoHandle?: string | null;
  cashappHandle?: string | null;
  zelleInfo?: string | null;
  restaurantName?: string | null;
  onSuccess?: () => void;
  claimedItemIds?: string[];
  note?: string;
}

/**
 * Complete payment flow component.
 * 
 * Integrates:
 * - Payment state machine (usePaymentState)
 * - Multi-signal return detection (usePaymentRecovery)
 * - LocalStorage + server persistence (usePaymentPersistence)
 * - UI components (PreFlightConfirm, RecoveryBottomSheet, PaymentStatus)
 * 
 * Flow:
 * 1. User taps "Pay $X" → show PreFlightConfirm
 * 2. User confirms → capture intent, open payment app, show "Opening..."
 * 3. User returns after grace period → show RecoveryBottomSheet
 * 4. User confirms payment → record to server, show success
 */
export function PaymentFlow({
  billId,
  billSlug,
  amount,
  method,
  recipientName,
  payerName,
  venmoHandle,
  cashappHandle,
  zelleInfo,
  restaurantName,
  onSuccess,
  claimedItemIds = [],
  note,
}: PaymentFlowProps) {
  const [showPreFlight, setShowPreFlight] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // State machine
  const {
    state,
    intent,
    captureIntent,
    markAppOpened,
    triggerRecovery,
    confirmPaid,
    markStillPending,
    resetToIdle,
  } = usePaymentState({ billId, billSlug });

  // Persistence
  const { recordContribution } = usePaymentPersistence({ billSlug });

  // Recovery detection
  usePaymentRecovery({
    state,
    onRecovery: triggerRecovery,
    enabled: state === 'external_app_opened',
  });

  // Generate payment link
  const paymentLink = useMemo(() => {
    const safePayerName = payerName || 'Someone';
    const noteText = `${restaurantName || 'Dinner'}/${safePayerName}`;
    
    if (method === 'venmo' && venmoHandle) {
      return generateVenmoLink(venmoHandle, amount, noteText);
    }
    if (method === 'cashapp' && cashappHandle) {
      return generateCashAppLink(cashappHandle, amount);
    }
    return null;
  }, [method, venmoHandle, cashappHandle, amount, payerName, restaurantName]);

  // Check if we can open the payment app directly
  const canOpenPaymentApp = method === 'venmo' || method === 'cashapp';

  // Handle initial "Pay" button click
  const handlePayClick = useCallback(() => {
    setShowPreFlight(true);
  }, []);

  // Handle PreFlight confirmation
  const handlePreFlightConfirm = useCallback(async () => {
    // Capture intent before opening
    captureIntent({
      amount,
      method,
      recipientName,
      payerName,
    });

    setIsOpening(true);

    // For Zelle, we can't open an app, so just mark as opened and trigger recovery
    if (method === 'zelle') {
      markAppOpened();
      setShowPreFlight(false);
      setIsOpening(false);
      // For Zelle, trigger recovery immediately since there's no app to open
      setTimeout(() => triggerRecovery(), 100);
      return;
    }

    // Open payment app
    if (paymentLink) {
      // Slight delay to ensure state is captured
      setTimeout(() => {
        markAppOpened();
        setShowPreFlight(false);
        setIsOpening(false);
        
        // Open the link
        window.location.href = paymentLink;
      }, 300);
    } else {
      setIsOpening(false);
    }
  }, [
    captureIntent,
    markAppOpened,
    triggerRecovery,
    amount,
    method,
    recipientName,
    payerName,
    paymentLink,
  ]);

  // Handle PreFlight cancel
  const handlePreFlightCancel = useCallback(() => {
    setShowPreFlight(false);
  }, []);

  // Handle "I've paid" confirmation
  const handleConfirmPaid = useCallback(async () => {
    setIsRecording(true);

    try {
      const result = await recordContribution({
        personName: payerName,
        amount,
        paymentMethod: method,
        claimedItemIds,
        note: note || 'Payment confirmed via TidyTab',
      });

      if (result.success) {
        confirmPaid();
        celebrateContribution();
        onSuccess?.();
      } else {
        // Still mark as confirmed locally even if server sync fails
        // The contribution might already exist, or there's a network issue
        confirmPaid();
        onSuccess?.();
      }
    } catch (e) {
      // Mark as confirmed anyway — better UX than leaving them stuck
      confirmPaid();
      onSuccess?.();
    } finally {
      setIsRecording(false);
    }
  }, [
    recordContribution,
    confirmPaid,
    onSuccess,
    payerName,
    amount,
    method,
    claimedItemIds,
    note,
  ]);

  // Handle "Not yet"
  const handleNotYet = useCallback(() => {
    markStillPending();
  }, [markStillPending]);

  // Handle "Pay again" (from still_pending or confirmed_paid)
  const handlePayAgain = useCallback(() => {
    resetToIdle();
    setShowPreFlight(true);
  }, [resetToIdle]);

  // Don't render if already confirmed
  if (state === 'confirmed_paid') {
    return (
      <PaymentStatus
        state={state}
        amount={intent?.amount || amount}
        method={intent?.method || method}
        recipientName={recipientName}
        onPayAgain={handlePayAgain}
      />
    );
  }

  // Show "still pending" state with pay again option
  if (state === 'still_pending') {
    return (
      <PaymentStatus
        state={state}
        amount={intent?.amount || amount}
        method={intent?.method || method}
        recipientName={recipientName}
        onPayAgain={handlePayAgain}
      />
    );
  }

  // Show "external app opened" state
  if (state === 'external_app_opened') {
    return (
      <PaymentStatus
        state={state}
        amount={intent?.amount || amount}
        method={intent?.method || method}
        recipientName={recipientName}
      />
    );
  }

  return (
    <>
      {/* Pre-flight confirmation */}
      {showPreFlight ? (
        <PreFlightConfirm
          amount={amount}
          method={method}
          recipientName={recipientName}
          onConfirm={handlePreFlightConfirm}
          onCancel={handlePreFlightCancel}
          isLoading={isOpening}
        />
      ) : (
        /* Main Pay button */
        <Button
          onClick={handlePayClick}
          className="
            w-full h-14 text-lg font-bold rounded-xl shadow-md
            bg-gradient-to-r from-primary to-accent text-primary-foreground
            hover:from-primary/90 hover:to-accent/90
            active:scale-[0.97] transition-transform
          "
        >
          Pay {formatCurrency(amount)}
        </Button>
      )}

      {/* Recovery bottom sheet */}
      <RecoveryBottomSheet
        isOpen={state === 'recovery_pending'}
        amount={intent?.amount || amount}
        method={intent?.method || method}
        recipientName={recipientName}
        onConfirmPaid={handleConfirmPaid}
        onNotYet={handleNotYet}
        isLoading={isRecording}
      />
    </>
  );
}
