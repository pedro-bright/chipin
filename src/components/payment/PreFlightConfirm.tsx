'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { PaymentMethod } from '@/hooks/usePaymentState';
import { X } from 'lucide-react';

interface PreFlightConfirmProps {
  amount: number;
  method: PaymentMethod;
  recipientName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const methodLabels: Record<PaymentMethod, string> = {
  venmo: 'Venmo',
  zelle: 'Zelle',
  cashapp: 'Cash App',
  paypal: 'PayPal',
};

const methodStyles: Record<PaymentMethod, { bg: string; hover: string; text: string }> = {
  venmo: {
    bg: 'bg-[#008CFF]',
    hover: 'hover:bg-[#0070CC]',
    text: 'text-[#008CFF]',
  },
  zelle: {
    bg: 'bg-[#6D1ED4]',
    hover: 'hover:bg-[#5A19B0]',
    text: 'text-[#6D1ED4]',
  },
  cashapp: {
    bg: 'bg-[#00C244]',
    hover: 'hover:bg-[#00A83B]',
    text: 'text-[#00C244]',
  },
  paypal: {
    bg: 'bg-[#003087]',
    hover: 'hover:bg-[#002670]',
    text: 'text-[#003087]',
  },
};

/**
 * Inline pre-flight confirmation before redirecting to payment app.
 * Shows: "Pay $18 to Alex via Venmo" + [Open Venmo] / [Cancel]
 */
export function PreFlightConfirm({
  amount,
  method,
  recipientName,
  onConfirm,
  onCancel,
  isLoading,
}: PreFlightConfirmProps) {
  const styles = methodStyles[method];
  const label = methodLabels[method];

  return (
    <div 
      className="animate-scale-fade-in rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4"
      role="dialog"
      aria-labelledby="preflight-title"
    >
      {/* Close button */}
      <div className="flex justify-end -mt-2 -mr-2">
        <button
          onClick={onCancel}
          className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel"
          disabled={isLoading}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="text-center space-y-1 -mt-2">
        <p id="preflight-title" className="text-lg font-bold text-foreground">
          Pay {formatCurrency(amount)} to {recipientName}
        </p>
        <p className={`text-sm font-medium ${styles.text}`}>
          via {label}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 h-12"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className={`
            flex-1 h-12 font-semibold
            ${styles.bg} ${styles.hover} text-white
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Opening...
            </span>
          ) : (
            <>Open {label}</>
          )}
        </Button>
      </div>

      {/* Reassurance */}
      <p className="text-xs text-center text-muted-foreground">
        Complete the payment in {label}, then come back here.
      </p>
    </div>
  );
}
