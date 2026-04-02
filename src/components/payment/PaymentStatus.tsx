'use client';

import { formatCurrency } from '@/lib/utils';
import type { PaymentState, PaymentMethod } from '@/hooks/usePaymentState';
import { CheckCircle2, Clock, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentStatusProps {
  state: PaymentState;
  amount: number;
  method: PaymentMethod;
  recipientName: string;
  onPayAgain?: () => void;
  className?: string;
}

const methodLabels: Record<PaymentMethod, string> = {
  venmo: 'Venmo',
  zelle: 'Zelle',
  cashapp: 'Cash App',
  paypal: 'PayPal',
};

/**
 * Displays the current payment state to the payer.
 * 
 * States shown:
 * - idle: Nothing (use PaymentButton instead)
 * - intent_captured: Brief confirmation
 * - external_app_opened: "Opening your payment app..."
 * - recovery_pending: (RecoveryBottomSheet handles this)
 * - still_pending: "No rush. You can finish it anytime." + Pay CTA
 * - confirmed_paid: "Payment confirmed ✅"
 */
export function PaymentStatus({
  state,
  amount,
  method,
  recipientName,
  onPayAgain,
  className,
}: PaymentStatusProps) {
  const label = methodLabels[method];

  // idle, intent_captured, recovery_pending — don't show status
  if (state === 'idle' || state === 'intent_captured' || state === 'recovery_pending') {
    return null;
  }

  // external_app_opened — show loading state
  if (state === 'external_app_opened') {
    return (
      <div className={`rounded-2xl bg-muted/50 p-5 text-center space-y-3 animate-pulse ${className || ''}`}>
        <div className="flex justify-center">
          <ExternalLink className="w-8 h-8 text-primary animate-bounce" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            Opening {label}...
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Complete the payment, then come back here.
          </p>
        </div>
      </div>
    );
  }

  // still_pending — encouraging message + pay CTA
  if (state === 'still_pending') {
    return (
      <div className={`rounded-2xl border border-border bg-card p-5 space-y-4 ${className || ''}`}>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground">
            No rush. You can finish it anytime.
          </p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(amount)} to {recipientName}
          </p>
        </div>

        {onPayAgain && (
          <Button
            onClick={onPayAgain}
            className="w-full h-12 gap-2"
          >
            Pay {formatCurrency(amount)}
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  // confirmed_paid — success state
  if (state === 'confirmed_paid') {
    return (
      <div className={`rounded-2xl bg-success/10 border border-success/20 p-6 text-center space-y-3 animate-spring-in ${className || ''}`}>
        <div className="flex justify-center">
          <CheckCircle2 className="w-12 h-12 text-success" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground font-[family-name:var(--font-main)]">
            Payment confirmed
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {recipientName} will see your {formatCurrency(amount)} contribution.
          </p>
        </div>

        {onPayAgain && (
          <button
            onClick={onPayAgain}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-2"
          >
            Need to pay more?
          </button>
        )}
      </div>
    );
  }

  return null;
}
