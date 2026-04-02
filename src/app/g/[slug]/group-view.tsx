'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ViewTransitionLink } from '@/components/view-transition-link';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import type { Group, GroupMember, BillWithItems, Contribution, Settlement } from '@/lib/types';
import type { Transfer } from '@/lib/balances';
import {
  Users,
  Receipt,
  Share2,
  Plus,
  CheckCircle2,
  UserPlus,
  Crown,
  ArrowRight,
  Wallet,
  X,
  BarChart3,
  UtensilsCrossed,
} from 'lucide-react';

interface GroupViewProps {
  group: Group;
  members: GroupMember[];
  bills: BillWithItems[];
  slug: string;
}

interface BalanceData {
  netBalances: Record<string, number>;
  transfers: Transfer[];
  totalVolume: number;
  settlements: Settlement[];
  billCount: number;
}

/** Deterministic color from name hash */
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
    'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
    'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Build Venmo/CashApp/Zelle/PayPal link for a member */
function getPaymentLink(member: GroupMember | undefined, amount: number, groupName: string): { url: string; label: string } | null {
  if (!member) return null;
  const note = groupName;
  if (member.preferred_payment === 'venmo' && member.venmo_handle) {
    const handle = member.venmo_handle.replace(/^@/, '');
    return {
      url: `https://venmo.com/${encodeURIComponent(handle)}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}&audience=private`,
      label: `Pay @${handle} on Venmo`,
    };
  }
  if (member.preferred_payment === 'cashapp' && member.cashapp_handle) {
    const handle = member.cashapp_handle.replace(/^\$/, '');
    return {
      url: `https://cash.app/$${encodeURIComponent(handle)}/${amount.toFixed(2)}`,
      label: `Pay $${handle} on CashApp`,
    };
  }
  if (member.preferred_payment === 'paypal' && member.paypal_handle) {
    return {
      url: `https://www.paypal.com/paypalme/${encodeURIComponent(member.paypal_handle)}/${amount.toFixed(2)}USD`,
      label: `Pay ${member.paypal_handle} on PayPal`,
    };
  }
  if (member.preferred_payment === 'zelle' && member.zelle_info) {
    return null; // Zelle has no universal deep link
  }
  // Fallback to whichever handle exists
  if (member.venmo_handle) {
    const handle = member.venmo_handle.replace(/^@/, '');
    return {
      url: `https://venmo.com/${encodeURIComponent(handle)}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}&audience=private`,
      label: `Pay @${handle} on Venmo`,
    };
  }
  if (member.cashapp_handle) {
    const handle = member.cashapp_handle.replace(/^\$/, '');
    return {
      url: `https://cash.app/$${encodeURIComponent(handle)}/${amount.toFixed(2)}`,
      label: `Pay $${handle} on CashApp`,
    };
  }
  if (member.paypal_handle) {
    return {
      url: `https://www.paypal.com/paypalme/${encodeURIComponent(member.paypal_handle)}/${amount.toFixed(2)}USD`,
      label: `Pay ${member.paypal_handle} on PayPal`,
    };
  }
  return null;
}

export function GroupView({ group, members, bills, slug }: GroupViewProps) {
  const [copied, setCopied] = useState(false);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [settleModal, setSettleModal] = useState<Transfer | null>(null);
  const [settling, setSettling] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);

  // Check for welcome param from join redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const welcome = params.get('welcome');
    if (welcome === 'new') {
      setWelcomeToast(`Welcome to ${group.emoji} ${group.name}! 🎉`);
      // Clean URL
      window.history.replaceState({}, '', `/g/${slug}`);
      setTimeout(() => setWelcomeToast(null), 4000);
    } else if (welcome === 'back') {
      setWelcomeToast(`Welcome back to ${group.emoji} ${group.name}! 👋`);
      window.history.replaceState({}, '', `/g/${slug}`);
      setTimeout(() => setWelcomeToast(null), 4000);
    }
  }, [group.emoji, group.name, slug]);

  const totalBills = bills.length;
  const totalSpent = bills.reduce((sum, b) => sum + Number(b.total), 0);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${slug}/balances`);
      if (res.ok) {
        const data = await res.json();
        setBalanceData(data);
        // Check if all settled
        if (data.transfers.length === 0 && data.billCount > 0) {
          setShowConfetti(true);
        }
      }
    } catch {
      // Silently fail — balances are supplementary
    } finally {
      setBalanceLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleCopyInvite = async () => {
    const url = `${window.location.origin}/g/${slug}/join`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on TidyTab`,
          text: `${group.emoji} Join "${group.name}" on TidyTab to split bills together!`,
          url,
        });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const handleRemoveMember = async (member: GroupMember) => {
    // Check if member has outstanding balance
    const balance = balanceData?.netBalances[member.name] ??
      balanceData?.netBalances[Object.keys(balanceData?.netBalances || {}).find(
        k => k.toLowerCase() === member.name.toLowerCase()
      ) || ''];
    
    if (balance !== undefined && balance !== null && Math.abs(balance) > 0.01) {
      alert(`${member.name} has an outstanding balance of ${formatCurrency(Math.abs(balance))}. Please settle up before removing.`);
      return;
    }

    if (!confirm(`Remove ${member.name} from the group?`)) return;

    setRemovingMemberId(member.id);
    try {
      const res = await fetch(`/api/groups/${slug}/members/${member.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // error
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleSettle = async (transfer: Transfer) => {
    setSettling(true);
    try {
      const res = await fetch(`/api/groups/${slug}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_name: transfer.from,
          to_name: transfer.to,
          amount: transfer.amount,
        }),
      });
      if (res.ok) {
        setSettleSuccess(true);
        setTimeout(() => {
          setSettleModal(null);
          setSettleSuccess(false);
          fetchBalances(); // refresh
        }, 1500);
      }
    } catch {
      // error
    } finally {
      setSettling(false);
    }
  };

  // Find member by name (case-insensitive)
  const findMember = (name: string): GroupMember | undefined => {
    const normalized = name.trim().toLowerCase();
    return members.find((m) => m.name.trim().toLowerCase() === normalized);
  };

  // Check if truly all settled: no transfers AND all net balances are near-zero
  const allSettled = balanceData && balanceData.billCount > 0 &&
    balanceData.transfers.length === 0 &&
    Object.values(balanceData.netBalances).every((v) => Math.abs(v) < 0.01);

  // Outstanding balances exist but no simplified transfers (e.g., host owed but no debtors tracked)
  const hasOutstandingBalances = balanceData && balanceData.billCount > 0 &&
    !allSettled &&
    Object.values(balanceData.netBalances).some((v) => Math.abs(v) > 0.01);

  return (
    <main className="bg-background min-h-dvh">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{
                  backgroundColor: ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'][i % 6],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-border/50 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <ViewTransitionLink href="/" className="text-xl font-bold font-[family-name:var(--font-main)]">
            <span className="font-extrabold">tidy</span>
            <span className="text-primary font-extrabold">tab</span>
          </ViewTransitionLink>
          <div className="flex items-center gap-3">
            <LinkButton href={`/new?group=${slug}`} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Bill
            </LinkButton>
          </div>
        </div>
      </header>

      {/* Copied toast */}
      {copied && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-toast">
          <div className="px-4 py-2.5 rounded-full bg-charcoal text-primary-foreground text-sm font-medium shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Invite link copied!
          </div>
        </div>
      )}

      {/* Welcome toast */}
      {welcomeToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-toast">
          <div className="px-4 py-2.5 rounded-full bg-charcoal text-primary-foreground text-sm font-medium shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            {welcomeToast}
          </div>
        </div>
      )}

      {/* Settle modal */}
      {settleModal && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => !settling && setSettleModal(null)} />
          <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 space-y-5 animate-slide-up">
            {settleSuccess ? (
              <div className="text-center py-8 space-y-3">
                <div className="text-5xl">✅</div>
                <p className="text-xl font-bold">Settled!</p>
                <p className="text-muted-foreground text-sm">Payment recorded successfully.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Settle Up</h3>
                  <button onClick={() => setSettleModal(null)} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${nameToColor(settleModal.from)} flex items-center justify-center text-white font-bold`}>
                      {getInitials(settleModal.from)}
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    <div className={`w-12 h-12 rounded-full ${nameToColor(settleModal.to)} flex items-center justify-center text-white font-bold`}>
                      {getInitials(settleModal.to)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{settleModal.from}</span>
                    {' pays '}
                    <span className="font-medium text-foreground">{settleModal.to}</span>
                  </p>
                  <p className="text-4xl font-extrabold text-primary font-[family-name:var(--font-main)]">
                    {formatCurrency(settleModal.amount)}
                  </p>
                </div>

                {/* Payment links */}
                {(() => {
                  const toMember = findMember(settleModal.to);
                  const payLink = getPaymentLink(toMember, settleModal.amount, group.name);
                  return payLink ? (
                    <a
                      href={payLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Wallet className="w-4 h-4 inline mr-2" />
                      {payLink.label}
                    </a>
                  ) : toMember?.zelle_info ? (
                    <div className="text-center text-sm text-muted-foreground">
                      Send via Zelle to: <span className="font-medium text-foreground">{toMember.zelle_info}</span>
                    </div>
                  ) : null;
                })()}

                <Button
                  onClick={() => handleSettle(settleModal)}
                  disabled={settling}
                  size="lg"
                  className="w-full"
                >
                  {settling ? 'Recording...' : 'Mark as Settled'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  This records the payment in TidyTab. Send money via your preferred app.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Group Header */}
        <div className="enter text-center">
          <div className="text-5xl mb-3">{group.emoji}</div>
          <h1 className="text-3xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
            {group.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {members.length} member{members.length !== 1 && 's'} · {totalBills} bill{totalBills !== 1 && 's'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 enter enter-delay-1">
          <Card>
            <CardContent className="pt-5 pb-5 text-center">
              <p className="text-3xl font-extrabold font-[family-name:var(--font-main)]">{members.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5 text-center">
              <p className="text-3xl font-extrabold font-[family-name:var(--font-main)]">{totalBills}</p>
              <p className="text-xs text-muted-foreground mt-1">Bills</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5 text-center">
              <p className="text-base sm:text-2xl font-extrabold text-primary font-[family-name:var(--font-main)] font-tnum">
                {formatCurrency(totalSpent)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Balances Section */}
        <div className="enter enter-delay-2">
          {balanceLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-muted rounded w-1/2 mx-auto" />
                  <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ) : balanceData && balanceData.billCount === 0 ? null : allSettled ? (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="py-8 text-center space-y-2">
                <div className="text-4xl">✨</div>
                <p className="text-xl font-bold text-success">All settled up!</p>
                <p className="text-sm text-muted-foreground">No outstanding balances in this group.</p>
              </CardContent>
            </Card>
          ) : hasOutstandingBalances && balanceData.transfers.length === 0 ? (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Balances
                  </CardTitle>
                  <LinkButton href={`/g/${slug}/balances`} size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Details
                  </LinkButton>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center py-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {Object.values(balanceData.netBalances).filter((v) => v > 0.01).length} member{Object.values(balanceData.netBalances).filter((v) => v > 0.01).length !== 1 ? 's' : ''} owed money
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Members need to chip in so balances can be settled
                  </p>
                </div>
                {Object.entries(balanceData.netBalances)
                  .filter(([, v]) => Math.abs(v) > 0.01)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, balance]) => (
                    <div key={name} className="flex items-center justify-between py-2 px-3 -mx-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${nameToColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {getInitials(name)}
                        </div>
                        <span className="font-medium">{name}</span>
                      </div>
                      <span className={`font-bold font-tnum ${balance > 0 ? 'text-success' : 'text-orange-500'}`}>
                        {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ) : balanceData && balanceData.transfers.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Balances
                  </CardTitle>
                  <LinkButton href={`/g/${slug}/balances`} size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Details
                  </LinkButton>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {balanceData.transfers.map((t, i) => {
                  const fromMember = findMember(t.from);
                  const toMember = findMember(t.to);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/20 transition-colors"
                    >
                      {/* From avatar */}
                      <div className={`w-9 h-9 rounded-full ${nameToColor(t.from)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {getInitials(t.from)}
                      </div>

                      {/* Arrow + amount */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-medium truncate">{t.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{t.to}</span>
                        </div>
                        <p className="text-lg font-extrabold text-primary font-[family-name:var(--font-main)] font-tnum">
                          {formatCurrency(t.amount)}
                        </p>
                      </div>

                      {/* To avatar */}
                      <div className={`w-9 h-9 rounded-full ${nameToColor(t.to)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {getInitials(t.to)}
                      </div>

                      {/* Settle button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSettleModal(t)}
                        className="shrink-0 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        Settle
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Invite Button */}
        <div className="enter enter-delay-3">
          <Button onClick={handleCopyInvite} variant="outline" className="w-full gap-2 h-12">
            <UserPlus className="w-4 h-4 text-primary" />
            Invite People
            <Share2 className="w-4 h-4 ml-auto text-muted-foreground" />
          </Button>
        </div>

        {/* Members */}
        <Card className="enter enter-delay-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => {
                const balance = balanceData?.netBalances[member.name] ?? 
                  balanceData?.netBalances[Object.keys(balanceData.netBalances).find(
                    k => k.toLowerCase() === member.name.toLowerCase()
                  ) || ''];
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${nameToColor(member.name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                    >
                      {getInitials(member.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{member.name}</span>
                        {member.role === 'admin' && (
                          <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      {(member.venmo_handle || member.zelle_info || member.cashapp_handle || member.paypal_handle) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.venmo_handle && `Venmo: @${member.venmo_handle.replace(/^@/, '')}`}
                          {member.zelle_info && `${member.venmo_handle ? ' · ' : ''}Zelle: ${member.zelle_info}`}
                          {member.cashapp_handle && `${member.venmo_handle || member.zelle_info ? ' · ' : ''}CashApp: ${member.cashapp_handle}`}
                          {member.paypal_handle && `${member.venmo_handle || member.zelle_info || member.cashapp_handle ? ' · ' : ''}PayPal: ${member.paypal_handle}`}
                        </p>
                      )}
                    </div>
                    {balance !== undefined && balance !== null && Math.abs(balance) > 0.01 && (
                      <span className={`text-sm font-bold font-tnum shrink-0 ${balance > 0 ? 'text-success' : 'text-orange-500'}`}>
                        {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                      </span>
                    )}
                    {/* Remove member button (admin only, non-admin members, no outstanding balance) */}
                    {member.role !== 'admin' && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className="text-muted-foreground hover:text-coral p-1.5 transition-colors shrink-0"
                        title={`Remove ${member.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {members.length === 1 && (
              <div className="mt-4 pt-4 border-t border-border/50 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Just you so far — invite your crew!</p>
                <Button onClick={handleCopyInvite} size="sm" variant="outline" className="gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  Share Invite Link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bills */}
        <Card className="enter enter-delay-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Bills
              </CardTitle>
              <LinkButton href={`/new?group=${slug}`} size="sm" variant="outline" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                New Bill
              </LinkButton>
            </div>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <UtensilsCrossed className="w-8 h-8 text-primary/60" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">No bills yet</p>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    Had a group dinner? Snap the receipt and split it — everyone gets notified automatically.
                  </p>
                </div>
                <LinkButton href={`/new?group=${slug}`} size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Create First Bill
                </LinkButton>
              </div>
            ) : (
              <div className="space-y-3">
                {bills.map((bill) => {
                  const activeContribs = bill.contributions?.filter((c: Contribution) => c.note !== '[cancelled]' && c.note !== '[pending]') || [];
                  const totalPaid = activeContribs.reduce((s: number, c: Contribution) => s + Number(c.amount), 0);
                  const remaining = Math.max(bill.total - totalPaid, 0);
                  const progress = bill.total > 0 ? (totalPaid / bill.total) * 100 : 0;

                  return (
                    <Link key={bill.id} href={`/b/${bill.slug}`} className="block">
                      <div className="p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{bill.restaurant_name || 'Bill'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(bill.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' · '}
                              {bill.host_name}
                              {' · '}
                              {bill.contributions?.length || 0} paid
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold font-[family-name:var(--font-main)]">{formatCurrency(bill.total)}</p>
                            <Badge variant={remaining <= 0 ? 'success' : 'default'} className="text-[10px]">
                              {remaining <= 0 ? 'Covered' : `${formatCurrency(remaining)} left`}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={progress} max={100} className="h-1.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite code info */}
        <div className="text-center text-xs text-muted-foreground enter enter-delay-5">
          <p>Invite code: <code className="bg-muted px-2 py-0.5 rounded">{group.invite_code}</code></p>
        </div>
      </div>
    </main>
  );
}
