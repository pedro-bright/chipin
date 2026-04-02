'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, X, ExternalLink } from 'lucide-react';

interface PaymentOverlayProps {
  amount: number;
  method: 'venmo' | 'zelle' | 'cashapp' | 'paypal';
  recipientName: string;
  onConfirmPaid: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  paymentLink?: string | null;
}

const methodLabels = {
  venmo: 'Venmo',
  zelle: 'Zelle',
  cashapp: 'Cash App',
  paypal: 'PayPal',
};

const methodColors = {
  venmo: '#008CFF',
  zelle: '#6D1ED4',
  cashapp: '#00C244',
  paypal: '#003087',
};

/**
 * Full-page takeover overlay shown after user clicks "Pay with Venmo".
 * The payment app has already been opened — this waits for them to come back
 * and confirm. The contribution is already logged as "pending" in the DB.
 */
export function PaymentOverlay({
  amount,
  method,
  recipientName,
  onConfirmPaid,
  onCancel,
  isLoading,
  paymentLink,
}: PaymentOverlayProps) {
  // Lock body scroll — iOS Safari needs position:fixed to truly prevent scroll
  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    
    // Save original styles
    const origBodyOverflow = body.style.overflow;
    const origBodyPosition = body.style.position;
    const origBodyTop = body.style.top;
    const origBodyWidth = body.style.width;
    const origHtmlOverflow = html.style.overflow;
    
    // Lock everything
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overflow = 'hidden';
    
    return () => {
      body.style.overflow = origBodyOverflow;
      body.style.position = origBodyPosition;
      body.style.top = origBodyTop;
      body.style.width = origBodyWidth;
      html.style.overflow = origHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const label = methodLabels[method];
  const color = methodColors[method];

  return (
    <div 
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in"
      style={{ touchAction: 'none' }}
    >
      {/* Cancel button — top right */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground"
        aria-label="Cancel"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Animated pulse icon */}
        <div className="relative mx-auto w-20 h-20">
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: color }}
          />
          <div
            className="relative w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <ExternalLink className="w-8 h-8" style={{ color }} />
          </div>
        </div>

        {/* Status message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-main)]">
            Complete your payment
          </h2>
          <p className="text-muted-foreground">
            Send <span className="font-semibold text-foreground">{formatCurrency(amount)}</span> to{' '}
            <span className="font-semibold text-foreground">{recipientName}</span> in {label}
          </p>
          <p className="text-sm text-muted-foreground/70">
            Come back here when you&apos;re done
          </p>
        </div>

        {/* Main CTA */}
        <div className="space-y-3">
          <Button
            onClick={onConfirmPaid}
            disabled={isLoading}
            className="w-full h-14 text-lg font-bold rounded-xl shadow-lg bg-success hover:bg-success/90 text-white"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Confirming...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                I&apos;ve Paid
              </span>
            )}
          </Button>

          {/* Re-open payment app link */}
          {paymentLink && (
            <a
              href={paymentLink}
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Reopen {label}
            </a>
          )}
        </div>

        {/* Reassurance */}
        <p className="text-xs text-muted-foreground/60">
          Your payment has been logged as pending.
          <br />
          {recipientName} can see it on their dashboard.
        </p>
      </div>
    </div>
  );
}
