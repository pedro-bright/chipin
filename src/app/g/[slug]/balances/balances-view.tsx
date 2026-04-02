'use client';

import { useState, useEffect, useCallback } from 'react';
import { ViewTransitionLink } from '@/components/view-transition-link';
import { LinkButton } from '@/components/ui/link-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { Group, GroupMember, Settlement } from '@/lib/types';
import type { Transfer } from '@/lib/balances';
import {
  ArrowLeft,
  ArrowRight,
  Receipt,
  HandCoins,
  Share2,
  BarChart3,
  ClipboardList,
} from 'lucide-react';

interface BillSummary {
  id: string;
  host_name: string;
  restaurant_name: string | null;
  total: number;
  created_at: string;
  contributions: { person_name: string; amount: number }[];
}

interface BalancesViewProps {
  group: Group;
  members: GroupMember[];
  bills: BillSummary[];
  settlements: Settlement[];
  slug: string;
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

interface BalanceData {
  netBalances: Record<string, number>;
  transfers: Transfer[];
  totalVolume: number;
}

export function BalancesView({ group, members: _members, bills, settlements, slug }: BalancesViewProps) {
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${slug}/balances`);
      if (res.ok) {
        const data = await res.json();
        setBalanceData(data);
      }
    } catch {
      // silent
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data fetch is legitimate
    fetchBalances();
  }, [fetchBalances]);

  // Build unified timeline
  type TimelineItem =
    | { type: 'bill'; date: string; data: BillSummary }
    | { type: 'settlement'; date: string; data: Settlement };

  const timeline: TimelineItem[] = [
    ...bills.map((b) => ({ type: 'bill' as const, date: b.created_at, data: b })),
    ...settlements.map((s) => ({ type: 'settlement' as const, date: s.settled_at, data: s })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleShare = async () => {
    if (!balanceData) return;
    const lines = ['📊 Group Balances — ' + group.emoji + ' ' + group.name, ''];
    if (balanceData.transfers.length === 0) {
      lines.push('✨ All settled up!');
    } else {
      for (const t of balanceData.transfers) {
        lines.push(`${t.from} → ${t.to}: ${formatCurrency(t.amount)}`);
      }
    }
    lines.push('', `View: ${window.location.origin}/g/${slug}/balances`);
    const text = lines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: `${group.name} Balances`, text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const allSettled = balanceData && balanceData.transfers.length === 0 && bills.length > 0;

  return (
    <main className="bg-background min-h-dvh">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-border/50 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <ViewTransitionLink href={`/g/${slug}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>{group.emoji} {group.name}</span>
          </ViewTransitionLink>
          <button
            onClick={handleShare}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Page title */}
        <div className="enter text-center">
          <h1 className="text-2xl font-extrabold font-[family-name:var(--font-main)] tracking-tight flex items-center justify-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Balances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bills.length} bill{bills.length !== 1 && 's'} · {settlements.length} settlement{settlements.length !== 1 && 's'}
          </p>
        </div>

        {/* Net Balances Grid */}
        {balanceData && Object.keys(balanceData.netBalances).length > 0 && (
          <div className="enter enter-delay-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Net Balances</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(balanceData.netBalances)
                .sort(([, a], [, b]) => b - a)
                .map(([name, balance]) => (
                  <Card key={name} className={balance > 0 ? 'border-success/20' : 'border-orange-500/20'}>
                    <CardContent className="py-4 px-4">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-full ${nameToColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {getInitials(name)}
                        </div>
                        <span className="font-medium text-sm truncate">{name}</span>
                      </div>
                      <p className={`text-xl font-extrabold font-[family-name:var(--font-main)] font-tnum ${balance > 0 ? 'text-success' : 'text-orange-500'}`}>
                        {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {balance > 0 ? 'is owed' : 'owes'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Simplified Debts */}
        {balanceData && (
          <div className="enter enter-delay-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {allSettled ? 'Status' : 'Simplified Debts'}
            </h2>
            {allSettled ? (
              <Card className="border-success/30 bg-success/5">
                <CardContent className="py-6 text-center space-y-2">
                  <div className="text-3xl">✨</div>
                  <p className="text-lg font-bold text-success">All settled up!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {balanceData.transfers.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50"
                  >
                    <div className={`w-8 h-8 rounded-full ${nameToColor(t.from)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {getInitials(t.from)}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className={`w-8 h-8 rounded-full ${nameToColor(t.to)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {getInitials(t.to)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{t.from}</span>
                        <span className="text-muted-foreground"> → </span>
                        <span className="font-medium">{t.to}</span>
                      </p>
                    </div>
                    <span className="text-lg font-extrabold text-primary font-[family-name:var(--font-main)] font-tnum shrink-0">
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timeline / Ledger */}
        <div className="enter enter-delay-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ledger</h2>
          {timeline.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center mb-3">
                  <ClipboardList className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No transactions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {timeline.map((item) => {
                const dateStr = new Date(item.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });

                if (item.type === 'bill') {
                  const bill = item.data;
                  return (
                    <div key={`bill-${bill.id}`} className="flex items-start gap-3 p-3 rounded-xl border border-border/50">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{bill.restaurant_name || 'Bill'}</p>
                        <p className="text-xs text-muted-foreground">
                          {dateStr} · Hosted by {bill.host_name}
                        </p>
                        {bill.contributions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {bill.contributions.map((c, ci) => (
                              <Badge key={ci} variant="secondary" className="text-[10px]">
                                {c.person_name}: {formatCurrency(Number(c.amount))}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold font-[family-name:var(--font-main)] font-tnum text-primary shrink-0">
                        {formatCurrency(Number(bill.total))}
                      </span>
                    </div>
                  );
                } else {
                  const s = item.data;
                  return (
                    <div key={`settle-${s.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-success/20 bg-success/5">
                      <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                        <HandCoins className="w-4 h-4 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {s.from_name} → {s.to_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{dateStr} · Settlement</p>
                      </div>
                      <span className="text-sm font-bold text-success font-[family-name:var(--font-main)] font-tnum shrink-0">
                        {formatCurrency(Number(s.amount))}
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* Back to group */}
        <div className="enter enter-delay-4 text-center pb-4">
          <LinkButton href={`/g/${slug}`} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Group
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
