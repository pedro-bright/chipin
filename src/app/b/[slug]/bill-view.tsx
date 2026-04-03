'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { celebrateCreation, celebrateSettlement } from '@/lib/confetti';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import type { BadgeType } from '@/lib/badges';
import { BadgeTooltip } from '@/components/badge-tooltip';
import type { BillWithItems, Contribution } from '@/lib/types';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  BillHeader,
  ProgressCard,
  ChipInSection,
  ContributionsList,
  ItemsList,
  TrustBanner,
  SplitSummaryCard,
} from '@/components/bill';
import Link from 'next/link';
import {
  Share2,
  Flame,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { getReceiptUrls } from '@/lib/receipt-urls';

interface BillViewProps {
  bill: BillWithItems;
  isCreator?: boolean;
  hostKey?: string;
  isAuthHost?: boolean;
  groupInfo?: { name: string; emoji: string; slug: string } | null;
}

interface UserBadge {
  badge_type: string;
  badge_data: Record<string, unknown>;
  earned_at: string;
}

export function BillView({ bill, isCreator, hostKey: initialHostKey, isAuthHost, groupInfo }: BillViewProps) {
  // Filter out cancelled contributions (pending are shown with confirm UI)
  const filterActive = (contribs: Contribution[]) =>
    contribs.filter(c => c.note !== '[cancelled]');
  const [contributions, setContributions] = useState<Contribution[]>(filterActive(bill.contributions || []));
  const [showShareToast, setShowShareToast] = useState(isCreator || false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [hostKey, setHostKey] = useState<string | undefined>(initialHostKey);
  const [newContribIds, setNewContribIds] = useState<Set<string>>(new Set());
  const [hostBadges, setHostBadges] = useState<UserBadge[]>([]);
  const initialContribIdsRef = useRef<Set<string>>(
    new Set(bill.contributions?.map(c => c.id) || [])
  );

  const refetchContributions = useCallback(async () => {
    const { data } = await supabase
      .from('contributions')
      .select('*')
      .eq('bill_id', bill.id)
      .order('created_at', { ascending: true });
    if (data) {
      setContributions(filterActive(data as Contribution[]));
    }
  }, [bill.id]);

  // Confetti on bill creation
  useEffect(() => {
    if (isCreator) {
      const timer = setTimeout(() => celebrateCreation(), 300);
      return () => clearTimeout(timer);
    }
  }, [isCreator]);

  // Sync host key with localStorage (read on mount, write when provided)
  useEffect(() => {
    // Read from localStorage on mount
    const storedKey = localStorage.getItem(`chipin_host_key_${bill.slug}`);
    // Write provided key to storage if not already stored
    if (initialHostKey && !storedKey) {
      localStorage.setItem(`chipin_host_key_${bill.slug}`, initialHostKey);
    }
    // Defer state update to avoid synchronous setState in effect body
    if (storedKey && !hostKey) {
      requestAnimationFrame(() => setHostKey(storedKey));
    }
  }, [bill.slug, hostKey, initialHostKey]);

  // Fetch host badges
  useEffect(() => {
    if (bill.host_email) {
      fetch(`/api/badges?email=${encodeURIComponent(bill.host_email)}`)
        .then(r => r.json())
        .then(({ badges }) => {
          if (badges) setHostBadges(badges);
        })
        .catch(() => {});
    }
  }, [bill.host_email]);

  // Only count confirmed (non-pending) contributions toward totals
  const confirmedContributions = contributions.filter(c => c.note !== '[pending]');
  const totalPaid = confirmedContributions.reduce((sum, c) => sum + Number(c.amount), 0);
  const remaining = Math.max(Math.round((bill.total - totalPaid) * 100) / 100, 0);
  const progress = bill.total > 0 ? (totalPaid / bill.total) * 100 : 0;
  const attendeeCount = bill.bill_attendees?.length || 0;
  const effectivePersonCount = (bill.person_count && bill.person_count > 0)
    ? bill.person_count
    : attendeeCount > 0
      ? attendeeCount
      : 0;
  const splitAmount = effectivePersonCount > 0
    ? Math.round((bill.total / effectivePersonCount) * 100) / 100
    : 0;

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`bill-${bill.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contributions',
          filter: `bill_id=eq.${bill.id}`,
        },
        (payload) => {
          const newContribution = payload.new as Contribution;
          // Skip cancelled contributions
          if (newContribution.note === '[cancelled]') return;
          setContributions((prev) => {
            if (prev.some(c => c.id === newContribution.id)) return prev;
            return [...prev, newContribution];
          });
          if (!initialContribIdsRef.current.has(newContribution.id)) {
            setNewContribIds(prev => new Set(prev).add(newContribution.id));
            setTimeout(() => {
              setNewContribIds(prev => {
                const next = new Set(prev);
                next.delete(newContribution.id);
                return next;
              });
            }, 3000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'contributions',
          filter: `bill_id=eq.${bill.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setContributions((prev) => prev.filter(c => c.id !== deletedId));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contributions',
          filter: `bill_id=eq.${bill.id}`,
        },
        (payload) => {
          const updated = payload.new as Contribution;
          if (updated.note === '[cancelled]') {
            // Remove cancelled contributions
            setContributions((prev) => prev.filter(c => c.id !== updated.id));
          } else {
            // Pending or confirmed — add or update
            setContributions((prev) => {
              const exists = prev.find(c => c.id === updated.id);
              if (exists) {
                return prev.map(c => c.id === updated.id ? updated : c);
              }
              return [...prev, updated];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bill.id]);

  // Settlement confetti - intentionally triggers once when bill is fully paid
  useEffect(() => {
    if (remaining <= 0 && totalPaid > 0 && !showConfetti) {
      // Use requestAnimationFrame to defer state updates after render cycle
      requestAnimationFrame(() => {
        setShowConfetti(true);
        setShowSettlement(true);
        celebrateSettlement();
        setTimeout(() => setShowSettlement(false), 4000);
      });
    }
  }, [remaining, totalPaid, showConfetti]);

  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = async () => {
    const url = window.location.origin + `/b/${bill.slug}`;
    const perPerson = effectivePersonCount > 0
      ? ` (~${formatCurrency(bill.total / effectivePersonCount)}/person)`
      : '';
    const isFullyCovered = remaining <= 0 && totalPaid > 0;
    const text = isFullyCovered
      ? `We split ${formatCurrency(totalPaid)} ${contributions.length > 1 ? `${contributions.length} ways` : ''} at ${bill.restaurant_name || 'dinner'} — zero drama!`
      : `Chip in for ${bill.restaurant_name || 'dinner'}! ${formatCurrency(bill.total)} total${perPerson} — pay in one tap`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'TidyTab', text, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const hostStreak = (bill as unknown as { host_streak?: number }).host_streak || 0;

  return (
    <main className="bg-background">
      {/* Settlement Celebration Overlay */}
      {showSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center settlement-overlay pointer-events-none">
          <div className="settlement-text text-center space-y-3 px-6">
            <div className="text-6xl sm:text-7xl">🎉</div>
            <p className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-main)] text-foreground">
              All squared up!
            </p>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xs mx-auto">
              {contributions.length} {contributions.length === 1 ? 'person' : 'people'} chipped in {formatCurrency(totalPaid)}
              {bill.restaurant_name ? ` for ${bill.restaurant_name}` : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Copied toast */}
      {copiedLink && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-toast">
          <div className="px-4 py-2.5 rounded-full bg-charcoal text-primary-foreground text-sm font-medium shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Link copied!
          </div>
        </div>
      )}

      {/* Header */}
      <BillHeader slug={bill.slug} hostKey={hostKey} isAuthHost={isAuthHost} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ─── Creator share toast (compact) ─── */}
        {isCreator && showShareToast && (
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/15 rounded-xl animate-spring-in">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Your bill is live!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Share the link so friends can pay in one tap
              </p>
            </div>
            <Button onClick={handleShare} size="sm" className="shrink-0 gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
            <button
              onClick={() => setShowShareToast(false)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
              aria-label="Dismiss"
            >
              <span className="text-base leading-none">×</span>
            </button>
          </div>
        )}

        {/* ─── Trust Banner (compact, 1 line) ─── */}
        {!isCreator && !hostKey && !isAuthHost && (
          <TrustBanner hostName={bill.host_name} />
        )}

        {/* ─── Group breadcrumb ─── */}
        {groupInfo && (
          <div className="enter">
            <Link
              href={`/g/${groupInfo.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted"
            >
              <span>{groupInfo.emoji}</span>
              <span className="font-medium">{groupInfo.name}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ─── Bill Title (compact header) ─── */}
        <div className="text-center space-y-1 enter">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-main)]">
            {bill.restaurant_name || 'Bill'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Hosted by <span className="font-medium text-foreground">{bill.host_name}</span>
            {hostStreak >= 3 && (
              <span className="ml-1.5 text-xs text-primary/70">
                <Flame className="w-3 h-3 inline" /> {hostStreak}×
              </span>
            )}
            {hostBadges.length > 0 && (
              <span className="ml-1.5 inline-flex gap-0.5 items-center">
                {hostBadges.slice(0, 2).map((badge) => {
                  const def = BADGE_DEFINITIONS[badge.badge_type as BadgeType];
                  return def ? <BadgeTooltip key={badge.badge_type} icon={def.icon} label={def.label} description={def.description} /> : null;
                })}
                {hostBadges.length > 2 && (
                  <span className="text-[10px] text-muted-foreground ml-0.5">+{hostBadges.length - 2}</span>
                )}
              </span>
            )}
            <span className="mx-1.5 text-border">·</span>
            <span className="text-xs inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(bill.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </p>
        </div>

        {/* ─── YOUR SHARE + PAY CTA (the hero section) ─── */}
        <ErrorBoundary section="chip-in">
          <ChipInSection
            bill={bill}
            remaining={remaining}
            splitAmount={splitAmount}
            onContributionSuccess={refetchContributions}
          />
        </ErrorBoundary>

        {/* ─── Progress (simplified — ONE metric) ─── */}
        <ErrorBoundary section="progress">
          <ProgressCard
            total={bill.total}
            totalPaid={totalPaid}
            remaining={remaining}
            progress={progress}
            contributionCount={contributions.length}
            status={bill.status}
          />
        </ErrorBoundary>

        {/* ─── Host share button (subtle) ─── */}
        {!isCreator && (hostKey || isAuthHost) && (
          <Button
            variant="outline"
            onClick={handleShare}
            className="w-full gap-2 text-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share with friends
          </Button>
        )}

        {/* ─── Items (collapsed by default) ─── */}
        <ErrorBoundary section="items">
          <ItemsList
            items={bill.bill_items || []}
            subtotal={bill.subtotal}
            tax={bill.tax}
            tip={bill.tip}
            total={bill.total}
            defaultOpen={false}
            contributions={contributions}
          />
        </ErrorBoundary>

        {/* ─── Who's Chipped In (collapsed, shows count) ─── */}
        <ErrorBoundary section="contributions">
          <ContributionsList
            contributions={contributions}
            newContribIds={newContribIds}
            billCreatedAt={bill.created_at}
            billSlug={bill.slug}
            status={bill.status}
            remaining={remaining}
            hostKey={hostKey}
            isAuthHost={isAuthHost}
            onContributionConfirmed={refetchContributions}
          />
        </ErrorBoundary>

        {/* ─── Fully covered nudge for host ─── */}
        {remaining <= 0 && totalPaid > 0 && bill.status !== 'settled' && (hostKey || isAuthHost) && (
          <Card className="bg-success/5 border-success/20 animate-spring-in">
            <CardContent className="pt-5 pb-5 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                This bill is fully covered
              </p>
              <p className="text-xs text-muted-foreground">
                Mark it as settled to archive it on your dashboard.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ─── Settled Banner ─── */}
        {bill.status === 'settled' && (
          <Card className="bg-success/5 border-success/20">
            <CardContent className="pt-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
              <p className="font-bold text-foreground font-[family-name:var(--font-main)]">
                All squared up
              </p>
              <p className="text-sm text-muted-foreground">
                {contributions.length} {contributions.length === 1 ? 'person' : 'people'} chipped in {formatCurrency(totalPaid)}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ─── Split Summary (only when complete) ─── */}
        <ErrorBoundary section="split-summary">
          <SplitSummaryCard
            bill={bill}
            contributions={contributions}
            totalPaid={totalPaid}
          />
        </ErrorBoundary>

        {/* ─── Receipt Image(s) ─── */}
        {(() => {
          const urls = getReceiptUrls(bill);
          if (urls.length === 0) return null;
          return (
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 py-2 transition-colors">
                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform duration-200" />
                View Receipt {urls.length > 1 ? `Photos (${urls.length})` : 'Photo'}
              </summary>
              <div className={`mt-2 ${urls.length > 1 ? 'space-y-3' : ''}`}>
                {urls.map((url: string, i: number) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-border relative">
                    {urls.length > 1 && (
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-charcoal/70 text-white text-xs font-medium backdrop-blur-sm">
                        Receipt {i + 1}
                      </div>
                    )}
                    <Image
                      src={url}
                      alt={`Receipt${urls.length > 1 ? ` ${i + 1}` : ''}`}
                      width={600}
                      height={800}
                      className="w-full h-auto"
                      sizes="(max-width: 672px) 100vw, 640px"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </details>
          );
        })()}
      </div>
    </main>
  );
}
