'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { PaymentMethod } from '@/hooks/usePaymentState';
import { CheckCircle2, Clock } from 'lucide-react';

interface RecoveryBottomSheetProps {
  isOpen: boolean;
  amount: number;
  method: PaymentMethod;
  recipientName: string;
  onConfirmPaid: () => void;
  onNotYet: () => void;
  isLoading?: boolean;
}

const methodLabels: Record<PaymentMethod, string> = {
  venmo: 'Venmo',
  zelle: 'Zelle',
  cashapp: 'Cash App',
  paypal: 'PayPal',
};

/**
 * Sticky bottom sheet for payment recovery.
 * Shows: "Did you finish the payment?" + [I've paid] / [Not yet]
 * 
 * This is harder to dismiss than a modal, making it mobile-native and
 * ensuring users address the pending payment.
 */
export function RecoveryBottomSheet({
  isOpen,
  amount,
  method,
  recipientName,
  onConfirmPaid,
  onNotYet,
  isLoading,
}: RecoveryBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Focus trap and prevent background scroll
  useEffect(() => {
    if (!isOpen) return;
    
    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the sheet
    sheetRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const label = methodLabels[method];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-charcoal/60 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        tabIndex={-1}
        className="
          fixed bottom-0 left-0 right-0 z-50
          bg-card rounded-t-3xl shadow-2xl
          animate-slide-up-sheet
          safe-area-pb
        "
        style={{ 
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <p id="recovery-title" className="text-xl font-bold text-foreground font-[family-name:var(--font-main)]">
              Did you finish the payment?
            </p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(amount)} to {recipientName} via {label}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={onConfirmPaid}
              disabled={isLoading}
              className="
                w-full h-14 text-lg font-bold rounded-xl shadow-md
                bg-success hover:bg-success/90 text-white
                flex items-center justify-center gap-2
              "
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  I&apos;ve paid
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={onNotYet}
              disabled={isLoading}
              className="w-full h-12 text-base flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Not yet
            </Button>
          </div>

          {/* Reassurance */}
          <p className="text-xs text-center text-muted-foreground">
            We&apos;ll mark it once you&apos;re done. {recipientName} will see your contribution.
          </p>
        </div>
      </div>
    </>
  );
}
