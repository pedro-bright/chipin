'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Share2, Download, Sparkles } from 'lucide-react';
import type { BillWithItems, Contribution, BillItem } from '@/lib/types';

interface SplitSummaryCardProps {
  bill: BillWithItems;
  contributions: Contribution[];
  totalPaid: number;
}

/** Pick a fun emoji based on bill total */
function getVibeEmoji(total: number, personCount: number | null): string {
  if (!personCount) return '🍽️';
  const perPerson = total / personCount;
  if (perPerson > 100) return '🥂';
  if (perPerson > 60) return '🍷';
  if (perPerson > 35) return '🍝';
  if (perPerson > 20) return '🍔';
  return '🌮';
}

/** Generate a fun stat about the bill */
function getFunStat(
  bill: BillWithItems,
  contributions: Contribution[],
  totalPaid: number,
): string | null {
  const items = bill.bill_items || [];
  const people = contributions.length;

  // Most expensive item
  if (items.length > 0) {
    const priciest = items.reduce((max, item) =>
      Number(item.price) * (item.quantity || 1) > Number(max.price) * (max.quantity || 1) ? item : max
    , items[0]);
    if (priciest && Number(priciest.price) > 0) {
      return `Most expensive item: ${priciest.name} (${formatCurrency(Number(priciest.price))})`;
    }
  }

  // Fallback: average per person
  if (people > 0) {
    return `Average per person: ${formatCurrency(totalPaid / people)}`;
  }

  return null;
}

/** Generate a shareable summary text */
function getShareText(
  bill: BillWithItems,
  contributions: Contribution[],
  totalPaid: number,
): string {
  const name = bill.restaurant_name || 'dinner';
  const people = contributions.length;
  const perPerson = people > 0 ? formatCurrency(totalPaid / people) : '';

  if (people > 1 && perPerson) {
    return `We split ${formatCurrency(totalPaid)} ${people} ways at ${name} — ${perPerson}/person. Zero awkwardness thanks to TidyTab ✨`;
  }
  return `${formatCurrency(totalPaid)} at ${name} — all settled! TidyTab made splitting painless ✨`;
}

/** Quick relative date */
function formatBillDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function SplitSummaryCard({ bill, contributions, totalPaid }: SplitSummaryCardProps) {
  const [shared, setShared] = useState(false);

  const people = contributions.length;
  const perPerson = people > 0 ? totalPaid / people : 0;
  const vibeEmoji = getVibeEmoji(bill.total, people || bill.person_count);
  const funStat = getFunStat(bill, contributions, totalPaid);
  const items = bill.bill_items || [];

  const handleShare = async () => {
    const text = getShareText(bill, contributions, totalPaid);
    const url = `${window.location.origin}/b/${bill.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'TidyTab Split Summary', text, url });
        setShared(true);
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    }
  };

  // Only show when bill is fully covered
  if (totalPaid < bill.total && bill.status !== 'settled') return null;

  return (
    <div className="split-summary-card rounded-2xl overflow-hidden animate-spring-in" role="region" aria-label="Split summary">
      {/* Gradient background */}
      <div className="relative p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-lavender/10 dark:from-primary/15 dark:via-accent/10 dark:to-lavender/15 border border-primary/15 rounded-2xl">
        {/* Decorative corner sparkles */}
        <div className="absolute top-3 right-3 text-primary/20 animate-float">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-accent/20 animate-float" style={{ animationDelay: '3s' }} />

        {/* Header */}
        <div className="text-center space-y-4 mb-6">
          <div className="text-4xl" aria-hidden="true">{vibeEmoji}</div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-1">
              Split complete
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold font-[family-name:var(--font-main)] text-foreground">
              {bill.restaurant_name || 'Dinner'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {formatBillDate(bill.created_at)}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-3 rounded-xl bg-card/60 dark:bg-card/40">
            <p className="text-lg sm:text-xl font-extrabold font-[family-name:var(--font-main)] font-tnum text-foreground">
              {formatCurrency(totalPaid)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">Total</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-card/60 dark:bg-card/40">
            <p className="text-lg sm:text-xl font-extrabold font-[family-name:var(--font-main)] font-tnum text-foreground">
              {people}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">People</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-card/60 dark:bg-card/40">
            <p className="text-lg sm:text-xl font-extrabold font-[family-name:var(--font-main)] font-tnum text-foreground">
              {items.length}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">Items</p>
          </div>
        </div>

        {/* Per person callout */}
        {people > 1 && (
          <div className="text-center mb-5 py-3 px-4 rounded-xl bg-success/10 dark:bg-success/15 border border-success/15">
            <p className="text-xs text-success/80 font-medium uppercase tracking-wider mb-0.5">Per person</p>
            <p className="text-2xl sm:text-3xl font-extrabold font-[family-name:var(--font-main)] font-tnum text-success">
              {formatCurrency(perPerson)}
            </p>
          </div>
        )}

        {/* Fun stat */}
        {funStat && (
          <p className="text-xs text-center text-muted-foreground italic mb-5">
            {funStat}
          </p>
        )}

        {/* Contributors mini-avatars */}
        <div className="flex items-center justify-center gap-1 mb-5">
          {contributions.slice(0, 8).map((c, i) => (
            <div
              key={c.id}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-semibold text-foreground border-2 border-card/80 -ml-1 first:ml-0"
              title={c.person_name}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {c.person_name.charAt(0).toUpperCase()}
            </div>
          ))}
          {contributions.length > 8 && (
            <span className="text-xs text-muted-foreground ml-1">+{contributions.length - 8}</span>
          )}
        </div>

        {/* Share button */}
        <Button
          onClick={handleShare}
          className="w-full gap-2 h-12 text-base rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90 active:scale-[0.97] transition-transform"
        >
          <Share2 className="w-4 h-4" />
          {shared ? 'Shared! 🎉' : 'Share the Recap'}
        </Button>

        {/* Branding — subtle */}
        <p className="text-[10px] text-center text-muted-foreground/50 mt-3 font-medium">
          Split with <span className="font-bold">tidy</span><span className="text-primary font-bold">tab</span> · tidytab.app
        </p>
      </div>
    </div>
  );
}
