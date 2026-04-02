'use client';

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { PaymentMethod } from '@/hooks/usePaymentState';

interface PaymentButtonProps {
  amount: number;
  method: PaymentMethod;
  recipientName: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

const methodStyles: Record<PaymentMethod, { bg: string; hover: string; text: string; label: string }> = {
  venmo: {
    bg: 'bg-[#008CFF]',
    hover: 'hover:bg-[#0070CC]',
    text: 'text-white',
    label: 'Venmo',
  },
  zelle: {
    bg: 'bg-[#6D1ED4]',
    hover: 'hover:bg-[#5A19B0]',
    text: 'text-white',
    label: 'Zelle',
  },
  cashapp: {
    bg: 'bg-[#00C244]',
    hover: 'hover:bg-[#00A83B]',
    text: 'text-white',
    label: 'Cash App',
  },
  paypal: {
    bg: 'bg-[#003087]',
    hover: 'hover:bg-[#002670]',
    text: 'text-white',
    label: 'PayPal',
  },
};

/**
 * Main payment CTA button.
 * Shows "Pay $X with Venmo" style.
 */
export const PaymentButton = forwardRef<HTMLButtonElement, PaymentButtonProps>(
  function PaymentButton(
    { amount, method, recipientName, onClick, disabled, isLoading, className },
    ref
  ) {
    const styles = methodStyles[method];

    return (
      <Button
        ref={ref}
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          w-full h-14 text-lg font-bold rounded-xl shadow-md
          ${styles.bg} ${styles.hover} ${styles.text}
          active:scale-[0.97] transition-all duration-150
          disabled:opacity-60 disabled:cursor-not-allowed
          ${className || ''}
        `}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Opening {styles.label}...
          </span>
        ) : (
          <>Pay {formatCurrency(amount)}</>
        )}
      </Button>
    );
  }
);
