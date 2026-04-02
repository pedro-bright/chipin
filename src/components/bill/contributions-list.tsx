'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { isPromptPayer } from '@/lib/badges';
import { Zap, Users, ChevronDown, CheckCircle2 } from 'lucide-react';
import type { Contribution } from '@/lib/types';

/** Relative time — "just now", "5m ago", "2h ago", etc. */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const AVATAR_COLORS = [
  { bg: 'bg-primary/10', text: 'text-primary' },
  { bg: 'bg-lavender/10', text: 'text-lavender' },
  { bg: 'bg-success/10', text: 'text-success' },
  { bg: 'bg-coral/10', text: 'text-coral' },
];

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

interface ContributionsListProps {
  contributions: Contribution[];
  newContribIds: Set<string>;
  billCreatedAt: string;
  billSlug?: string;
  status: string;
  remaining: number;
  hostKey?: string;
  isAuthHost?: boolean;
  onContributionConfirmed?: () => void;
}

export function ContributionsList({
  contributions,
  newContribIds,
  billCreatedAt,
  billSlug,
  status,
  remaining,
  hostKey,
  isAuthHost,
  onContributionConfirmed,
}: ContributionsListProps) {
  const [myName, setMyName] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());

  const isHost = !!(hostKey || isAuthHost);

  useEffect(() => {
    try {
      if (billSlug) {
        const saved = localStorage.getItem(`tidytab_contributed_${billSlug}`);
        if (saved) {
          const data = JSON.parse(saved);
          // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage init
          setMyName(data.name?.toLowerCase() || null);
        }
      }
      if (!myName) {
        const savedName = localStorage.getItem('tidytab_person_name');
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage init
        if (savedName) setMyName(savedName.toLowerCase());
      }
    } catch { /* ignore */ }
  }, [billSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand when a new real-time contribution arrives
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- responsive UI
    if (newContribIds.size > 0) setExpanded(true);
  }, [newContribIds]);

  const handleConfirmPayment = useCallback(async (contributionId: string) => {
    if (!billSlug) return;
    setConfirmingId(contributionId);
    try {
      const res = await fetch(`/api/bills/${billSlug}/contribute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contribution_id: contributionId, note: null }),
      });
      if (res.ok) {
        setConfirmedIds(prev => new Set(prev).add(contributionId));
        onContributionConfirmed?.();
      }
    } catch { /* ignore */ }
    finally {
      setConfirmingId(null);
    }
  }, [billSlug, onContributionConfirmed]);

  // Separate pending and confirmed contributions
  const visibleContributions = contributions.filter(
    c => (c as unknown as { note?: string }).note !== '[cancelled]'
  );
  const pendingContributions = visibleContributions.filter(
    c => (c as unknown as { note?: string }).note === '[pending]' && !confirmedIds.has(c.id)
  );
  const confirmedContributions = visibleContributions.filter(
    c => (c as unknown as { note?: string }).note !== '[pending]' || confirmedIds.has(c.id)
  );
  const totalVisible = visibleContributions.length;
  const pendingCount = pendingContributions.length;

  // Auto-expand on first render if there are pending payments
  // NOTE: Must be declared before early returns to comply with React hooks rules
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  useEffect(() => {
    if (pendingCount > 0 && !hasAutoExpanded) {
      setExpanded(true);
      setHasAutoExpanded(true);
    }
  }, [pendingCount, hasAutoExpanded]);

  // Empty state — nobody paid yet and no pending
  if (totalVisible === 0 && status !== 'settled' && remaining > 0) {
    return null;
  }
  if (totalVisible === 0) return null;

  const sortedConfirmed = [...confirmedContributions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const sortedPending = [...pendingContributions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const isExpanded = expanded;

  return (
    <Card className="enter enter-delay-4">
      {/* Collapsed header — always visible */}
      <button
        className="w-full px-6 py-4 flex items-center justify-between text-left min-h-[52px] active:bg-muted/30 transition-colors rounded-t-2xl"
        onClick={() => setExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold font-[family-name:var(--font-main)] text-lg leading-tight">
                Who&apos;s Chipped In
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {confirmedContributions.length} {confirmedContributions.length === 1 ? 'person' : 'people'}
              </span>
              {pendingCount > 0 && (
                <>
                  <span className="text-xs text-muted-foreground/50">·</span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {pendingCount} pending
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expandable list */}
      {isExpanded && (
        <CardContent className="pt-0 animate-scale-fade-in">
          <div className="space-y-1">
            {/* ─── Pending payments section ─── */}
            {sortedPending.length > 0 && (
              <div className="space-y-1 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-2 pt-1 pb-1">
                  Awaiting confirmation
                </p>
                {sortedPending.map((contribution, contribIndex) => {
                  const isNew = newContribIds.has(contribution.id);
                  const isMe = myName && contribution.person_name.toLowerCase() === myName;
                  const avatarColor = getAvatarColor(contribIndex);
                  const canConfirm = isHost || isMe;

                  return (
                    <div
                      key={contribution.id}
                      className={`flex items-center justify-between py-3 enter rounded-xl px-3 -mx-2 bg-amber-500/5 border border-amber-500/15 ${
                        isNew ? 'new-contribution' : ''
                      }`}
                      style={{ animationDelay: `${contribIndex * 60}ms` }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full ${isMe ? 'bg-primary/15 text-primary ring-2 ring-primary/30' : `${avatarColor.bg} ${avatarColor.text}`} flex items-center justify-center text-sm font-semibold shrink-0`}
                        >
                          {contribution.person_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium flex items-center gap-1.5">
                            <span className="truncate">{contribution.person_name}</span>
                            {isMe && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {relativeTime(contribution.created_at)}
                            {contribution.payment_method && (
                              <span> · via {contribution.payment_method}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-sm font-semibold font-tnum text-amber-600 dark:text-amber-400">
                          {formatCurrency(Number(contribution.amount))}
                        </span>
                        {canConfirm ? (
                          <button
                            onClick={() => handleConfirmPayment(contribution.id)}
                            disabled={confirmingId === contribution.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-success/10 text-success hover:bg-success/20 transition-all active:scale-[0.96] disabled:opacity-50 flex items-center gap-1 min-w-[84px] justify-center"
                          >
                            {confirmingId === contribution.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-success/30 border-t-success rounded-full animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Confirm
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Confirmed payments section ─── */}
            {sortedConfirmed.map((contribution, contribIndex) => {
              const isNew = newContribIds.has(contribution.id);
              const isPrompt = isPromptPayer(billCreatedAt, contribution.created_at);
              const isMe = myName && contribution.person_name.toLowerCase() === myName;
              const avatarColor = getAvatarColor(contribIndex + sortedPending.length);

              return (
                <div
                  key={contribution.id}
                  className={`flex items-center justify-between py-2.5 enter rounded-xl px-2 -mx-2 ${
                    isNew
                      ? 'new-contribution'
                      : isMe
                        ? 'bg-primary/5 ring-1 ring-primary/15'
                        : ''
                  }`}
                  style={{ animationDelay: `${(contribIndex + sortedPending.length) * 60}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full ${isMe ? 'bg-primary/15 text-primary ring-2 ring-primary/30' : `${avatarColor.bg} ${avatarColor.text}`} flex items-center justify-center text-sm font-semibold shrink-0`}
                    >
                      {contribution.person_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-1.5">
                        {contribution.person_name}
                        {isMe && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                        {isPrompt && (
                          <span className="text-amber-500" title="Prompt payer — paid within 1 hour">
                            <Zap className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(contribution.created_at)}
                        {contribution.payment_method && (
                          <span> · via {contribution.payment_method}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">
                    {formatCurrency(Number(contribution.amount))}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
