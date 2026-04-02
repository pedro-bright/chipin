'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { celebrateContribution } from '@/lib/confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCheck } from '@/components/ui/animated-check';
import {
  formatCurrency,
  calculateProportionalPrice,
  generateVenmoLink,
  generateCashAppLink,
  generatePayPalLink,
} from '@/lib/utils';
import type { BillWithItems, BillItem } from '@/lib/types';
import {
  Check,
  UtensilsCrossed,
  Coins,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePaymentState, usePaymentRecovery, usePaymentPersistence, type PaymentMethod } from '@/hooks';
import { PaymentOverlay } from '@/components/payment';

/** Find the viewer's attendee record by matching name from localStorage */
function findViewerAttendee(bill: BillWithItems): { member_name: string; expected_amount: number } | null {
  if (!bill.bill_attendees || bill.bill_attendees.length === 0) return null;
  if (typeof window === 'undefined') return null;
  try {
    const savedName = localStorage.getItem('tidytab_person_name');
    if (!savedName) return null;
    const normalized = savedName.trim().toLowerCase();
    const match = bill.bill_attendees.find(
      a => a.member_name.trim().toLowerCase() === normalized
    );
    if (match) return { member_name: match.member_name, expected_amount: Number(match.expected_amount || 0) };
  } catch { /* ignore */ }
  return null;
}

type PayMode = 'split' | 'claim' | 'custom';

interface ChipInSectionProps {
  bill: BillWithItems;
  remaining: number;
  splitAmount: number;
  onContributionSuccess: () => void;
}

export function ChipInSection({
  bill,
  remaining,
  splitAmount,
  onContributionSuccess,
}: ChipInSectionProps) {
  const viewerAttendee = findViewerAttendee(bill);
  const hasAttendees = bill.bill_attendees && bill.bill_attendees.length > 0;
  const hasSplitAmount = hasAttendees || (bill.person_count && bill.person_count > 0);
  const effectiveSplitAmount = viewerAttendee ? viewerAttendee.expected_amount : splitAmount;

  // --- State ---
  // Determine initial mode from bill's default_mode, falling back to legacy logic
  const initialMode: PayMode = (() => {
    const dm = bill.default_mode;
    if (dm === 'claim' && bill.bill_items && bill.bill_items.length > 0) return 'claim';
    if (dm === 'split' && hasSplitAmount) return 'split';
    if (dm === 'custom') return 'custom';
    // Legacy fallback: split if person count set, otherwise custom
    return hasSplitAmount ? 'split' : 'custom';
  })();
  const [mode, setMode] = useState<PayMode>(initialMode);
  
  // Whether payment form (name + method + confirm) is expanded
  const [payFormExpanded, setPayFormExpanded] = useState(false);
  
  // Whether "More options" is shown (hide if the default mode is already showing what we want)
  const [showMoreOptions, setShowMoreOptions] = useState(initialMode === 'custom' && !hasSplitAmount);

  // Claim mode state: maps virtualId → fraction (1 = full, 0.5 = half, etc.)
  const [claimedItems, setClaimedItems] = useState<Map<string, number>>(new Map());
  // Which item currently has the fraction picker open
  const [fractionPickerFor, setFractionPickerFor] = useState<string | null>(null);
  
  // Custom amount
  const [customAmount, setCustomAmount] = useState('');

  // Payment details
  const [personName, setPersonName] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('tidytab_person_name') || ''; } catch { return ''; }
    }
    return '';
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tidytab_payment_method');
        if (saved === 'venmo' && bill.venmo_handle) return 'venmo';
        if (saved === 'cashapp' && bill.cashapp_handle) return 'cashapp';
        if (saved === 'zelle' && bill.zelle_info) return 'zelle';
        if (saved === 'paypal' && bill.paypal_handle) return 'paypal';
      } catch { /* ignore */ }
    }
    if (bill.venmo_handle) return 'venmo';
    if (bill.cashapp_handle) return 'cashapp';
    if (bill.zelle_info) return 'zelle';
    if (bill.paypal_handle) return 'paypal';
    return 'venmo';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [contributedAmount, setContributedAmount] = useState(0);
  const [zelleCopied, setZelleCopied] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // --- Payment Intent State Machine ---
  const [isRecording, setIsRecording] = useState(false);

  const {
    state: paymentState,
    intent: paymentIntent,
    captureIntent,
    markAppOpened,
    triggerRecovery,
    confirmPaid,
    markStillPending,
    resetToIdle,
  } = usePaymentState({ billId: bill.id, billSlug: bill.slug });

  const { recordContribution } = usePaymentPersistence({ billSlug: bill.slug });

  // Multi-signal recovery detection
  usePaymentRecovery({
    state: paymentState,
    onRecovery: triggerRecovery,
    enabled: paymentState === 'external_app_opened',
  });

  // Check localStorage for previous contribution
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tidytab_contributed_${bill.slug}`);
      if (saved) {
        const data = JSON.parse(saved);
        setShowSuccess(true);
        setContributedAmount(data.amount || 0);
      }
    } catch { /* ignore */ }
  }, [bill.slug]);

  useEffect(() => {
    const hasHover = window.matchMedia('(hover: hover)').matches;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    setIsDesktop(hasHover && !hasCoarsePointer);
  }, []);

  // Detect in-app browsers (WhatsApp, Instagram, Facebook, etc.)
  // These can't handle venmo:// deep links and get 406 from Venmo's WAF
  const isInAppBrowser = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /FBAN|FBAV|Instagram|WhatsApp|Line|Snapchat|Twitter|LinkedIn/i.test(ua)
      || (!/Safari/i.test(ua) && /Mobile/i.test(ua) && /AppleWebKit/i.test(ua)); // generic iOS webview (no "Safari" token)
  }, []);

  // --- Computed values ---

  // Virtual claimable items: expand qty>1 into individual rows for claim mode.
  // Each gets a virtual ID like "realId__1", "realId__2" etc.
  // qty=1 items keep their original ID unchanged.
  interface ClaimableItem {
    virtualId: string;    // ID used for claim tracking
    realId: string;       // Original DB item ID
    name: string;
    displayPrice: number; // Proportional unit price (after tax/tip, before shared_by)
    claimPrice: number;   // What claiming this actually costs (respects shared_by)
    quantity: number;
    shared_by: number | null;
    subIndex?: number;    // e.g. 1 of 3 for expanded items
    subTotal?: number;    // e.g. 3 for expanded items
  }

  const claimableItems = useMemo(() => {
    const result: ClaimableItem[] = [];
    for (const item of bill.bill_items || []) {
      const qty = item.quantity || 1;
      // Proportional price for the FULL line (all qty)
      const fullPropPrice = calculateProportionalPrice(
        Number(item.price) * qty,
        bill.subtotal,
        bill.tax,
        bill.tip
      );
      const unitPropPrice = Math.round((fullPropPrice / qty) * 100) / 100;
      const sharedBy = item.shared_by && item.shared_by >= 2 ? item.shared_by : null;
      const claimPrice = sharedBy ? Math.round((unitPropPrice / sharedBy) * 100) / 100 : unitPropPrice;

      if (qty === 1) {
        result.push({
          virtualId: item.id,
          realId: item.id,
          name: item.name,
          displayPrice: unitPropPrice,
          claimPrice,
          quantity: 1,
          shared_by: sharedBy,
        });
      } else {
        // When expanding qty>1 into individual rows, each row IS one unit.
        // Don't apply shared_by here — the expansion already splits by quantity.
        // shared_by only makes sense for qty=1 items where one dish is shared.
        for (let i = 0; i < qty; i++) {
          result.push({
            virtualId: `${item.id}__${i}`,
            realId: item.id,
            name: `${item.name} (${i + 1}/${qty})`,
            displayPrice: unitPropPrice,
            claimPrice: unitPropPrice,
            quantity: 1,
            shared_by: null,
            subIndex: i + 1,
            subTotal: qty,
          });
        }
      }
    }
    return result;
  }, [bill.bill_items, bill.subtotal, bill.tax, bill.tip]);

  // Legacy helper for non-claim contexts (items list, etc.)
  const getProportionalPrice = (item: BillItem) => {
    return calculateProportionalPrice(
      Number(item.price) * (item.quantity || 1),
      bill.subtotal,
      bill.tax,
      bill.tip
    );
  };

  const claimedTotal = Array.from(claimedItems.entries()).reduce((sum, [virtualId, fraction]) => {
    const ci = claimableItems.find((i) => i.virtualId === virtualId);
    if (!ci) return sum;
    return sum + ci.claimPrice * fraction;
  }, 0);

  // Parse claimed_item_ids which can be "itemId" (full) or "itemId:0.25" (fraction)
  type ClaimEntry = { name: string; fraction: number };

  // Build maps:
  // - itemClaimedBy: virtualId → [{ name, fraction }]
  // - itemClaimedFraction: virtualId → total fraction claimed (0..1+)
  const { itemClaimedBy, itemClaimedFraction } = useMemo(() => {
    const byMap = new Map<string, ClaimEntry[]>();
    const fracMap = new Map<string, number>();

    // Parse all contributions into real item claims
    const realClaims = new Map<string, ClaimEntry[]>();
    for (const c of bill.contributions || []) {
      if (!c.claimed_item_ids || c.claimed_item_ids.length === 0) continue;
      for (const raw of c.claimed_item_ids) {
        // Parse "itemId:fraction" or plain "itemId" (= fraction 1)
        const colonIdx = raw.lastIndexOf(':');
        let itemId: string;
        let fraction: number;
        if (colonIdx > 0) {
          const maybeFrac = parseFloat(raw.slice(colonIdx + 1));
          if (!isNaN(maybeFrac) && maybeFrac > 0 && maybeFrac <= 1) {
            itemId = raw.slice(0, colonIdx);
            fraction = maybeFrac;
          } else {
            itemId = raw;
            fraction = 1;
          }
        } else {
          itemId = raw;
          fraction = 1;
        }
        const existing = realClaims.get(itemId) || [];
        existing.push({ name: c.person_name, fraction });
        realClaims.set(itemId, existing);
      }
    }

    // Map to virtual IDs
    for (const [realId, entries] of realClaims) {
      const virtuals = claimableItems.filter(ci => ci.realId === realId);
      if (virtuals.length === 1) {
        byMap.set(virtuals[0].virtualId, [...entries]);
        fracMap.set(virtuals[0].virtualId, entries.reduce((s, e) => s + e.fraction, 0));
      } else {
        // qty>1 — distribute claims across virtual sub-items sequentially
        let entryIdx = 0;
        for (const v of virtuals) {
          if (entryIdx < entries.length) {
            byMap.set(v.virtualId, [entries[entryIdx]]);
            fracMap.set(v.virtualId, entries[entryIdx].fraction);
            entryIdx++;
          }
        }
      }
    }
    return { itemClaimedBy: byMap, itemClaimedFraction: fracMap };
  }, [bill.contributions, claimableItems]);

  // Convert virtual claims to storage format: "realId:fraction" (e.g. "abc-123:0.25")
  // Full claims (fraction=1) are stored as plain "realId" for backward compat.
  const getClaimedRealIds = (): string[] => {
    return Array.from(claimedItems.entries()).map(([vid, fraction]) => {
      const ci = claimableItems.find(c => c.virtualId === vid);
      const realId = ci ? ci.realId : vid;
      return fraction < 1 ? `${realId}:${fraction}` : realId;
    });
  };

  const getChipInAmount = (): number => {
    if (mode === 'claim') return Math.round(claimedTotal * 100) / 100;
    if (mode === 'split') return effectiveSplitAmount;
    if (mode === 'custom') return Number(customAmount) || 0;
    return 0;
  };

  const chipInAmount = getChipInAmount();

  // Generate payment link
  const getPaymentLink = useCallback(() => {
    const trimmedName = personName.trim();
    const note = `${bill.restaurant_name || 'Dinner'}/${trimmedName}`;
    if (paymentMethod === 'venmo' && bill.venmo_handle) {
      return generateVenmoLink(bill.venmo_handle, chipInAmount, note);
    }
    if (paymentMethod === 'cashapp' && bill.cashapp_handle) {
      return generateCashAppLink(bill.cashapp_handle, chipInAmount);
    }
    if (paymentMethod === 'paypal' && bill.paypal_handle) {
      return generatePayPalLink(bill.paypal_handle, chipInAmount);
    }
    return null;
  }, [paymentMethod, bill.venmo_handle, bill.cashapp_handle, bill.paypal_handle, bill.restaurant_name, personName, chipInAmount]);

  // --- Payment Flow Handlers ---

  // Pending contribution ID (for updating from pending → confirmed)
  const [pendingContributionId, setPendingContributionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem(`tidytab_pending_contrib_${bill.slug}`) || null; } catch { return null; }
    }
    return null;
  });

  // Loading guard for Pay Now button
  const [isPayNowLoading, setIsPayNowLoading] = useState(false);

  // Handle "Pay with Venmo/CashApp" — immediately open app + create pending contribution + show overlay
  const handlePayNow = useCallback(async () => {
    if (!personName.trim() || chipInAmount <= 0) return;
    if (isPayNowLoading) return; // Prevent double-tap
    setIsPayNowLoading(true);
    
    const paymentLink = getPaymentLink();

    // 1. Capture intent in state machine
    captureIntent({
      amount: chipInAmount,
      method: paymentMethod,
      recipientName: bill.host_name,
      payerName: personName.trim(),
    });

    // 2. Create pending contribution in DB immediately
    try {
      const res = await fetch(`/api/bills/${bill.slug}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_name: personName.trim(),
          amount: chipInAmount,
          payment_method: paymentMethod,
          claimed_item_ids: mode === 'claim' ? getClaimedRealIds() : [],
          note: '[pending]',
        }),
      });
      if (res.ok) {
        const contrib = await res.json();
        setPendingContributionId(contrib.id);
        try { localStorage.setItem(`tidytab_pending_contrib_${bill.slug}`, contrib.id); } catch {}
      }
    } catch {
      // Continue even if DB write fails — overlay still shows
    }

    // 3. Mark app as opened + open payment link
    markAppOpened();

    if (paymentMethod !== 'zelle' && paymentLink) {
      if (isDesktop) {
        // Desktop: open in new tab (keeps overlay on current page)
        window.open(paymentLink, '_blank', 'noopener');
        setIsPayNowLoading(false);
      } else if (isInAppBrowser) {
        // In-app browsers (WhatsApp, IG, etc.) can't handle venmo:// deep links
        // and get 406 from Venmo's WAF. Open in system browser instead.
        window.open(paymentLink, '_blank');
        setIsPayNowLoading(false);
      } else {
        // Mobile Safari/Chrome: use location.href for native app deep linking
        window.location.href = paymentLink;
        // Don't reset loading — page is navigating away
      }
    } else {
      setIsPayNowLoading(false);
    }
  }, [
    personName, chipInAmount, getPaymentLink, captureIntent,
    paymentMethod, bill.host_name, bill.slug, markAppOpened,
    mode, claimedItems, isPayNowLoading, isDesktop, isInAppBrowser,
  ]);

  // Handle "I've paid" from overlay — update pending contribution to confirmed
  const handleConfirmPaid = useCallback(async () => {
    setIsRecording(true);

    try {
      // Update the pending contribution to remove [pending] note
      if (pendingContributionId) {
        await fetch(`/api/bills/${bill.slug}/contribute`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contribution_id: pendingContributionId,
            note: null,
          }),
        });
        try { localStorage.removeItem(`tidytab_pending_contrib_${bill.slug}`); } catch {}
      } else {
        // pendingContributionId lost (e.g. localStorage cleared) — create a confirmed
        // entry via POST which will auto-clean any orphaned pending entries for this person
        await fetch(`/api/bills/${bill.slug}/contribute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person_name: personName.trim(),
            amount: chipInAmount,
            payment_method: paymentMethod,
            claimed_item_ids: mode === 'claim' ? getClaimedRealIds() : [],
            note: 'Payment confirmed via TidyTab',
          }),
        });
      }

      // Save contribution locally
      try {
        localStorage.setItem('tidytab_person_name', personName.trim());
        localStorage.setItem(`tidytab_contributed_${bill.slug}`, JSON.stringify({
          name: personName.trim(),
          amount: chipInAmount,
          method: paymentMethod,
          at: new Date().toISOString(),
        }));
      } catch {}

      confirmPaid();
      setShowSuccess(true);
      setContributedAmount(chipInAmount);
      setPayFormExpanded(false);
      setClaimedItems(new Map());
      setCustomAmount('');
      onContributionSuccess();
      celebrateContribution();
    } catch {
      // Confirm anyway — better UX
      confirmPaid();
      setShowSuccess(true);
      setContributedAmount(chipInAmount);
      onContributionSuccess();
      celebrateContribution();
    } finally {
      setIsRecording(false);
    }
  }, [
    pendingContributionId,
    bill.slug,
    confirmPaid,
    personName,
    chipInAmount,
    paymentMethod,
    onContributionSuccess,
    mode,
    claimedItems,
  ]);

  // Handle cancel from overlay — remove pending contribution
  const handleCancelPayment = useCallback(async () => {
    // Delete the pending contribution if we created one
    if (pendingContributionId) {
      try {
        // We'll use a DELETE-style approach: update note to [cancelled] then let host clean up
        // Or just reset state — the pending contribution stays for host to see
        // Actually, let's be clean and remove it
        await fetch(`/api/bills/${bill.slug}/contribute`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contribution_id: pendingContributionId,
            note: '[cancelled]',
          }),
        });
      } catch { /* ignore */ }
      try { localStorage.removeItem(`tidytab_pending_contrib_${bill.slug}`); } catch {}
      setPendingContributionId(null);
    }
    resetToIdle();
    onContributionSuccess(); // Refresh to reflect changes
  }, [pendingContributionId, bill.slug, resetToIdle, onContributionSuccess]);

  // Handle retry payment (from still_pending state)
  const handleRetryPayment = useCallback(() => {
    resetToIdle();
  }, [resetToIdle]);

  // --- Legacy submit handler (for "I've Paid" without opening app) ---
  const handleSubmitContribution = async () => {
    if (!personName.trim()) return;
    if (chipInAmount <= 0) return;

    setIsSubmitting(true);
    try {
      // If there's an existing pending contribution from handlePayNow,
      // update it instead of creating a new one
      if (pendingContributionId) {
        const patchRes = await fetch(`/api/bills/${bill.slug}/contribute`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contribution_id: pendingContributionId,
            note: mode === 'split'
              ? 'Split evenly'
              : mode === 'custom'
                ? 'Custom amount'
                : null,
          }),
        });

        if (patchRes.ok) {
          try {
            localStorage.setItem('tidytab_person_name', personName.trim());
            localStorage.setItem(`tidytab_contributed_${bill.slug}`, JSON.stringify({
              name: personName.trim(),
              amount: chipInAmount,
              method: paymentMethod,
              at: new Date().toISOString(),
            }));
            localStorage.removeItem(`tidytab_pending_contrib_${bill.slug}`);
          } catch {}
          setPendingContributionId(null);
          confirmPaid();
          setShowSuccess(true);
          setContributedAmount(chipInAmount);
          setPayFormExpanded(false);
          setClaimedItems(new Map());
          setCustomAmount('');
          onContributionSuccess();
          celebrateContribution();
          return;
        }
        // If PATCH failed, fall through to POST (which will auto-clean pending via API)
      }

      const res = await fetch(`/api/bills/${bill.slug}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_name: personName,
          amount: chipInAmount,
          payment_method: paymentMethod,
          claimed_item_ids: mode === 'claim' ? getClaimedRealIds() : [],
          note:
            mode === 'split'
              ? 'Split evenly'
              : mode === 'custom'
                ? 'Custom amount'
                : undefined,
        }),
      });

      if (res.ok) {
        try {
          localStorage.setItem('tidytab_person_name', personName.trim());
          localStorage.setItem(`tidytab_contributed_${bill.slug}`, JSON.stringify({
            name: personName.trim(),
            amount: chipInAmount,
            method: paymentMethod,
            at: new Date().toISOString(),
          }));
          localStorage.removeItem(`tidytab_pending_contrib_${bill.slug}`);
        } catch {}
        setPendingContributionId(null);
        confirmPaid();
        setShowSuccess(true);
        setContributedAmount(chipInAmount);
        setPayFormExpanded(false);
        setClaimedItems(new Map());
        setCustomAmount('');
        onContributionSuccess();
        celebrateContribution();
      }
    } catch {
      // fail silently
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Success state ---
  if (showSuccess) {
    return (
      <Card className="bg-success/10 border-success/20 animate-spring-in overflow-hidden">
        <CardContent className="pt-6 pb-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto text-success">
            <AnimatedCheck size={56} />
          </div>
          <p className="text-xl font-bold text-foreground font-[family-name:var(--font-main)]">
            You&apos;re all set!
          </p>
          {contributedAmount > 0 && (
            <p className="text-2xl font-extrabold text-success font-[family-name:var(--font-main)] font-tnum">
              {formatCurrency(contributedAmount)}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Payment recorded.
          </p>
          <button
            onClick={() => {
              setShowSuccess(false);
              resetToIdle();
              try { localStorage.removeItem(`tidytab_contributed_${bill.slug}`); } catch {}
            }}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-2"
          >
            Need to pay again?
          </button>
          {personName.trim() && (
            <button
              onClick={() => {
                setShowSuccess(false);
                setContributedAmount(0);
                setPersonName('');
                resetToIdle();
                try {
                  localStorage.removeItem(`tidytab_contributed_${bill.slug}`);
                  localStorage.removeItem('tidytab_person_name');
                } catch {}
              }}
              className="block mx-auto text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-1"
            >
              Not {personName.trim().split(' ')[0]}?
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Don't show if bill is settled or fully covered
  if (remaining <= 0 || bill.status === 'settled') return null;

  // Show "still pending" state with retry option
  if (paymentState === 'still_pending' && paymentIntent) {
    return (
      <div className="space-y-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-5 text-center space-y-3">
            <p className="text-base font-medium text-foreground">
              No rush. You can finish it anytime.
            </p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(paymentIntent.amount)} to {bill.host_name}
            </p>
            <Button
              onClick={handleRetryPayment}
              className="w-full h-12 gap-2"
            >
              Pay {formatCurrency(paymentIntent.amount)}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show full-page overlay when payment app is open or recovery is pending
  if ((paymentState === 'external_app_opened' || paymentState === 'recovery_pending') && paymentIntent) {
    return (
      <PaymentOverlay
        amount={paymentIntent.amount}
        method={paymentIntent.method}
        recipientName={bill.host_name}
        onConfirmPaid={handleConfirmPaid}
        onCancel={handleCancelPayment}
        isLoading={isRecording}
        paymentLink={getPaymentLink()}
      />
    );
  }

  // Amount to show as hero
  const heroAmount = mode === 'claim'
    ? (claimedTotal > 0 ? claimedTotal : 0)
    : mode === 'custom'
      ? (Number(customAmount) > 0 ? Number(customAmount) : 0)
      : effectiveSplitAmount;

  const hasValidAmount = chipInAmount > 0;
  const paymentLink = getPaymentLink();

  // Get method label for pre-flight
  const methodLabel = paymentMethod === 'venmo' ? 'Venmo' 
    : paymentMethod === 'cashapp' ? 'Cash App' 
    : paymentMethod === 'paypal' ? 'PayPal'
    : 'Zelle';

  return (
    <div className="space-y-6">
      {/* ═══ SHARE + PAY + OPTIONS BLOCK ═══ */}
      <div className="space-y-3">
      {/* ═══ YOUR SHARE — Unified Hero Card ═══ */}
      <div className="warm-share-card rounded-2xl p-6 text-center space-y-3 enter enter-delay-2 shadow-[0_4px_24px_rgba(255,155,80,0.12)]">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          {viewerAttendee ? `${viewerAttendee.member_name}'s share` : 'Your share'}
        </p>

        {/* Split mode — show amount */}
        {mode === 'split' && hasSplitAmount && (
          <>
            <p className="text-5xl font-extrabold font-[family-name:var(--font-main)] text-foreground font-tnum tracking-tight">
              {formatCurrency(effectiveSplitAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(bill.total)} split{' '}
              {hasAttendees
                ? `${bill.bill_attendees!.length} ways`
                : `${bill.person_count} ways`}
            </p>
          </>
        )}

        {/* Claim mode — show claimed total or prompt */}
        {mode === 'claim' && (
          <>
            {claimedTotal > 0 ? (
              <p className="text-5xl font-extrabold font-[family-name:var(--font-main)] text-foreground font-tnum tracking-tight">
                {formatCurrency(claimedTotal)}
              </p>
            ) : (
              <p className="text-2xl font-bold font-[family-name:var(--font-main)] text-muted-foreground">
                Select items below
              </p>
            )}
            {claimedItems.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {claimedItems.size} item{claimedItems.size !== 1 ? 's' : ''} selected
              </p>
            )}
          </>
        )}

        {/* Custom mode — inline input inside the card */}
        {mode === 'custom' && (
          <>
            {Number(customAmount) > 0 ? (
              <p className="text-5xl font-extrabold font-[family-name:var(--font-main)] text-foreground font-tnum tracking-tight">
                {formatCurrency(Number(customAmount))}
              </p>
            ) : null}
            <div className="flex items-center gap-2 max-w-[200px] mx-auto">
              <span className="text-2xl font-semibold text-muted-foreground">$</span>
              <Input
                type="number"
                step="1"
                min="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
                className="text-2xl text-center font-semibold bg-transparent border-0 border-b-2 border-border/40 rounded-none focus:border-primary px-0 shadow-none focus-visible:ring-0"
                autoFocus
              />
            </div>
            {Number(customAmount) > remaining && remaining > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Exceeds remaining balance ({formatCurrency(remaining)})
              </p>
            )}
          </>
        )}
      </div>

      {/* ═══ Claim Items (inline when in claim mode) ═══ */}
      {mode === 'claim' && claimableItems.length > 0 && (
        <Card className="enter animate-scale-fade-in">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground mb-3">
              Tap the items you had — tax &amp; tip included proportionally
            </p>
            <div className="divide-y divide-border/60">
              {claimableItems.map((ci) => {
                const myFraction = claimedItems.get(ci.virtualId);
                const isClaimed = myFraction !== undefined;
                const claimEntries = itemClaimedBy.get(ci.virtualId) || [];
                const totalClaimedFrac = itemClaimedFraction.get(ci.virtualId) || 0;
                const isFullyClaimed = totalClaimedFrac >= 1;
                const isPartiallyClaimed = totalClaimedFrac > 0 && totalClaimedFrac < 1;
                const showPicker = fractionPickerFor === ci.virtualId;
                const fractionLabel = (f: number) => {
                  if (f === 1) return 'Full';
                  if (f === 0.5) return '½';
                  if (Math.abs(f - 1/3) < 0.001) return '⅓';
                  if (f === 0.25) return '¼';
                  return `${Math.round(f * 100)}%`;
                };
                const fractionOptions = [1, 0.5, 1/3, 0.25];

                return (
                  <div key={ci.virtualId} className="relative">
                    <div
                      role="button"
                      aria-label={`${ci.name} — ${formatCurrency(ci.claimPrice)}`}
                      tabIndex={0}
                      className={`flex items-center justify-between py-3.5 cursor-pointer -mx-3 px-3 rounded-xl transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                        isClaimed ? 'bg-primary/5' : isFullyClaimed ? 'bg-success/5 opacity-60' : isPartiallyClaimed ? 'bg-success/5' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => {
                        if (isClaimed) {
                          // Already claimed — unclaim it
                          const next = new Map(claimedItems);
                          next.delete(ci.virtualId);
                          setClaimedItems(next);
                          setFractionPickerFor(null);
                        } else {
                          // First tap — claim full amount + show picker to adjust
                          const next = new Map(claimedItems);
                          next.set(ci.virtualId, 1);
                          setClaimedItems(next);
                          setFractionPickerFor(ci.virtualId);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                            isClaimed
                              ? 'bg-primary border-primary text-white scale-110'
                              : isFullyClaimed
                                ? 'bg-success/30 border-success/60'
                                : 'border-border/80'
                          }`}
                        >
                          {isClaimed && <Check className="w-4 h-4 animate-pop-in" />}
                          {!isClaimed && isFullyClaimed && <Check className="w-3.5 h-3.5 text-success" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isFullyClaimed && !isClaimed ? 'text-muted-foreground' : ''}`}>{ci.name}</p>
                          {isClaimed && myFraction !== undefined && (
                            <p className="text-xs text-primary font-medium">
                              You: {fractionLabel(myFraction)} → {formatCurrency(ci.claimPrice * myFraction)}
                            </p>
                          )}
                          {claimEntries.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {claimEntries.map((entry, i) => (
                                <p key={i} className="text-xs text-success/80">
                                  {entry.name}: {entry.fraction < 1 ? fractionLabel(entry.fraction) : 'Full'}
                                </p>
                              ))}
                            </div>
                          )}
                          {/* Progress bar for partially claimed items */}
                          {(totalClaimedFrac > 0 && totalClaimedFrac < 1) && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-success/70 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(totalClaimedFrac * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {Math.round(totalClaimedFrac * 100)}% claimed
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className={`font-medium font-tnum ${isFullyClaimed && !isClaimed ? 'text-muted-foreground line-through' : ''}`}>
                          {formatCurrency(ci.claimPrice)}
                        </p>
                        {ci.shared_by && !isFullyClaimed && (
                          <p className="text-xs text-muted-foreground line-through font-tnum">{formatCurrency(ci.displayPrice)}</p>
                        )}
                        {isFullyClaimed && (
                          <p className="text-[10px] text-success">✓ covered</p>
                        )}
                      </div>
                    </div>
                    {/* Fraction picker — shown after claiming to let user adjust */}
                    {showPicker && isClaimed && (
                      <div className="py-2.5 px-3 -mx-3 bg-muted/30 rounded-b-xl animate-scale-fade-in space-y-2">
                        <p className="text-[11px] text-muted-foreground">Split this dish? Tap to adjust:</p>
                        <div className="flex gap-2">
                          {fractionOptions.map((f) => (
                            <button
                              key={f}
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = new Map(claimedItems);
                                next.set(ci.virtualId, f);
                                setClaimedItems(next);
                                if (f === myFraction) setFractionPickerFor(null);
                              }}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all active:scale-95 ${
                                myFraction !== undefined && Math.abs(myFraction - f) < 0.001
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/60 hover:border-primary hover:bg-primary/5'
                              }`}
                            >
                              <span className="block text-base">{f === 1 ? '🍽️' : f === 0.5 ? '½' : Math.abs(f - 1/3) < 0.001 ? '⅓' : '¼'}</span>
                              <span className="block text-xs text-muted-foreground mt-0.5">{formatCurrency(ci.claimPrice * f)}</span>
                            </button>
                          ))}
                        </div>
                        {/* Custom amount input */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">Custom $</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={ci.claimPrice}
                            placeholder={ci.claimPrice.toFixed(2)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseFloat((e.target as HTMLInputElement).value);
                                if (val > 0 && val <= ci.claimPrice) {
                                  const frac = Math.round((val / ci.claimPrice) * 10000) / 10000;
                                  const next = new Map(claimedItems);
                                  next.set(ci.virtualId, Math.min(frac, 1));
                                  setClaimedItems(next);
                                  setFractionPickerFor(null);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val > 0 && val <= ci.claimPrice) {
                                const frac = Math.round((val / ci.claimPrice) * 10000) / 10000;
                                const next = new Map(claimedItems);
                                next.set(ci.virtualId, Math.min(frac, 1));
                                setClaimedItems(next);
                              }
                            }}
                            className="flex-1 h-8 px-2 rounded-lg border border-border/60 bg-background text-sm font-tnum focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); setFractionPickerFor(null); }}
                            className="text-xs text-primary font-medium px-2 py-1 hover:bg-primary/5 rounded-lg transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {mode === 'claim' && claimableItems.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground animate-scale-fade-in">
          <p>No items to claim — try custom amount instead.</p>
        </div>
      )}

      {/* ═══ PRIMARY CTA — Pay Button ═══ */}
      {!payFormExpanded && hasValidAmount && (
        <Button
          className="w-full h-14 text-lg font-bold rounded-xl shadow-md bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90 active:scale-[0.97] transition-transform enter enter-delay-3"
          onClick={() => setPayFormExpanded(true)}
        >
          Pay {formatCurrency(chipInAmount)}
        </Button>
      )}

      {/* ═══ Payment Form (expanded after tapping Pay) ═══ */}
      {payFormExpanded && (
        <Card className="border-primary/30 animate-spring-in">
          <CardContent className="pt-5 pb-5 space-y-4">
            {/* Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Your Name</label>
                {personName.trim() && (
                  <button
                    onClick={() => {
                      setPersonName('');
                      try { localStorage.removeItem('tidytab_person_name'); } catch {}
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Not {personName.trim().split(' ')[0]}?
                  </button>
                )}
              </div>
              <Input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="What's your name?"
                className="text-lg"
                maxLength={50}
                autoFocus={!personName}
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="text-sm font-medium mb-2 block">Pay via</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {bill.venmo_handle && (
                  <button
                    aria-label="Pay with Venmo"
                    aria-pressed={paymentMethod === 'venmo'}
                    className={`p-3 min-h-[56px] rounded-xl border text-center transition-all duration-150 active:scale-[0.96] ${
                      paymentMethod === 'venmo'
                        ? 'border-[#008CFF] bg-[#008CFF]/5 ring-2 ring-[#008CFF] shadow-sm'
                        : 'border-border'
                    }`}
                    onClick={() => {
                      setPaymentMethod('venmo');
                      try { localStorage.setItem('tidytab_payment_method', 'venmo'); } catch {}
                    }}
                  >
                    <span className="text-base font-bold block text-[#008CFF]">Venmo</span>
                  </button>
                )}
                {bill.zelle_info && (
                  <button
                    aria-label="Pay with Zelle"
                    aria-pressed={paymentMethod === 'zelle'}
                    className={`p-3 min-h-[56px] rounded-xl border text-center transition-all duration-150 active:scale-[0.96] ${
                      paymentMethod === 'zelle'
                        ? 'border-[#6D1ED4] bg-[#6D1ED4]/5 ring-2 ring-[#6D1ED4] shadow-sm'
                        : 'border-border'
                    }`}
                    onClick={() => {
                      setPaymentMethod('zelle');
                      try { localStorage.setItem('tidytab_payment_method', 'zelle'); } catch {}
                    }}
                  >
                    <span className="text-base font-bold block text-[#6D1ED4]">Zelle</span>
                  </button>
                )}
                {bill.cashapp_handle && (
                  <button
                    aria-label="Pay with Cash App"
                    aria-pressed={paymentMethod === 'cashapp'}
                    className={`p-3 min-h-[56px] rounded-xl border text-center transition-all duration-150 active:scale-[0.96] ${
                      paymentMethod === 'cashapp'
                        ? 'border-[#00C244] bg-[#00C244]/5 ring-2 ring-[#00C244] shadow-sm'
                        : 'border-border'
                    }`}
                    onClick={() => {
                      setPaymentMethod('cashapp');
                      try { localStorage.setItem('tidytab_payment_method', 'cashapp'); } catch {}
                    }}
                  >
                    <span className="text-base font-bold block text-[#00C244]">Cash App</span>
                  </button>
                )}
                {bill.paypal_handle && (
                  <button
                    aria-label="Pay with PayPal"
                    aria-pressed={paymentMethod === 'paypal'}
                    className={`p-3 min-h-[56px] rounded-xl border text-center transition-all duration-150 active:scale-[0.96] ${
                      paymentMethod === 'paypal'
                        ? 'border-[#003087] bg-[#003087]/5 ring-2 ring-[#003087] shadow-sm'
                        : 'border-border'
                    }`}
                    onClick={() => {
                      setPaymentMethod('paypal');
                      try { localStorage.setItem('tidytab_payment_method', 'paypal'); } catch {}
                    }}
                  >
                    <span className="text-base font-bold block text-[#003087]">PayPal</span>
                  </button>
                )}
              </div>
            </div>

            {/* Zelle instructions */}
            {paymentMethod === 'zelle' && bill.zelle_info && (
              <div className="p-4 bg-[#6D1ED4]/5 rounded-xl space-y-3">
                <p className="font-medium text-sm">
                  Send {formatCurrency(chipInAmount)} via Zelle to:
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg flex-1">{bill.zelle_info}</p>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(bill.zelle_info!);
                      setZelleCopied(true);
                      setTimeout(() => setZelleCopied(false), 2000);
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#6D1ED4]/10 text-[#6D1ED4] text-sm font-medium hover:bg-[#6D1ED4]/20 transition-colors"
                  >
                    {zelleCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>1. Open your banking app</p>
                  <p>2. Go to Send Money → Zelle</p>
                  <p>3. Send {formatCurrency(chipInAmount)} to the info above</p>
                </div>
              </div>
            )}

            {/* Confirm buttons */}
            {personName.trim() && (
              <div className="space-y-3">
                {/* Pay with Venmo/CashApp — opens app immediately + creates pending contribution */}
                {paymentLink && (
                  <Button
                    onClick={handlePayNow}
                    disabled={isPayNowLoading}
                    className={`w-full h-14 text-lg font-bold rounded-xl shadow-md ${
                      paymentMethod === 'venmo'
                        ? 'bg-[#008CFF] hover:bg-[#0070CC] text-white'
                        : paymentMethod === 'cashapp'
                          ? 'bg-[#00C244] hover:bg-[#00A83B] text-white'
                          : paymentMethod === 'paypal'
                            ? 'bg-[#003087] hover:bg-[#002670] text-white'
                            : 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                    }`}
                    size="lg"
                  >
                    {isPayNowLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Opening...
                      </>
                    ) : (
                      <>Pay with {methodLabel} {formatCurrency(chipInAmount)}</>
                    )}
                  </Button>
                )}

                {/* Manual "I've Already Paid" button */}
                <Button
                  onClick={handleSubmitContribution}
                  variant={paymentLink ? 'outline' : 'default'}
                  className={`w-full gap-2 ${
                    paymentLink
                      ? 'h-12'
                      : 'h-14 text-lg font-bold rounded-xl shadow-md'
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      I&apos;ve Already Paid {formatCurrency(chipInAmount)}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Collapse payment form */}
            <button
              onClick={() => {
                setPayFormExpanded(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground w-full text-center flex items-center justify-center gap-1 pt-1"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Back
            </button>
          </CardContent>
        </Card>
      )}

      {/* ═══ More Options (collapsed by default when split amount exists) ═══ */}
      {!payFormExpanded && hasSplitAmount && (
        <div className="text-center">
          <button
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            More options
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMoreOptions ? 'rotate-180' : ''}`} />
          </button>

          {showMoreOptions && (
            <div className="flex justify-center gap-3 mt-3 animate-scale-fade-in">
              {bill.bill_items && bill.bill_items.length > 0 && (
                <button
                  onClick={() => {
                    setMode('claim');
                    setShowMoreOptions(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-[0.97] ${
                    mode === 'claim'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  Claim my dishes
                </button>
              )}
              <button
                onClick={() => {
                  setMode('custom');
                  setShowMoreOptions(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-[0.97] ${
                  mode === 'custom'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                }`}
              >
                <Coins className="w-4 h-4" />
                Custom amount
              </button>
            </div>
          )}

          {/* Quick return to split */}
          {mode !== 'split' && hasSplitAmount && (
            <button
              onClick={() => {
                setMode('split');
                setClaimedItems(new Map());
                setCustomAmount('');
              }}
              className="text-xs text-primary hover:underline font-medium mt-3 block mx-auto"
            >
              Back to even split ({formatCurrency(effectiveSplitAmount)})
            </button>
          )}
        </div>
      )}

      {/* ═══ No split — show options directly ═══ */}
      {!payFormExpanded && !hasSplitAmount && (
        <div className="text-center space-y-3">
          <div className="flex justify-center gap-3">
            {bill.bill_items && bill.bill_items.length > 0 && (
              <button
                onClick={() => setMode('claim')}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all active:scale-[0.97] ${
                  mode === 'claim'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                Claim my dishes
              </button>
            )}
            <button
              onClick={() => setMode('custom')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all active:scale-[0.97] ${
                mode === 'custom'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Coins className="w-4 h-4" />
              Custom amount
            </button>
          </div>
        </div>
      )}
      </div>{/* end SHARE + PAY + OPTIONS BLOCK */}
    </div>
  );
}
