'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, calculateProportionalPrice } from '@/lib/utils';
import { ChevronDown, UtensilsCrossed, Check } from 'lucide-react';
import type { BillItem, Contribution } from '@/lib/types';

interface ItemsListProps {
  items: BillItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  defaultOpen?: boolean;
  contributions?: Contribution[];
}

export function ItemsList({
  items,
  subtotal,
  tax,
  tip,
  total,
  defaultOpen = false,
  contributions = [],
}: ItemsListProps) {
  const [showItems, setShowItems] = useState(defaultOpen);

  const getProportionalPrice = (item: BillItem) => {
    return calculateProportionalPrice(
      Number(item.price) * (item.quantity || 1),
      subtotal,
      tax,
      tip
    );
  };

  // Build claimed-by map (parsing fraction format "itemId:0.25")
  const { itemClaimedBy, itemClaimedFraction } = useMemo(() => {
    const byMap = new Map<string, { name: string; fraction: number }[]>();
    const fracMap = new Map<string, number>();
    for (const c of contributions) {
      if (!c.claimed_item_ids || c.claimed_item_ids.length === 0) continue;
      for (const raw of c.claimed_item_ids) {
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
        const existing = byMap.get(itemId) || [];
        existing.push({ name: c.person_name, fraction });
        byMap.set(itemId, existing);
        fracMap.set(itemId, (fracMap.get(itemId) || 0) + fraction);
      }
    }
    return { itemClaimedBy: byMap, itemClaimedFraction: fracMap };
  }, [contributions]);

  return (
    <Card className="enter enter-delay-4">
      <button
        className="w-full px-6 py-4 flex items-center justify-between text-left min-h-[52px] active:bg-muted/30 transition-colors rounded-t-2xl"
        onClick={() => setShowItems(!showItems)}
        aria-expanded={showItems}
        aria-label={`${showItems ? 'Hide' : 'Show'} ${items?.length || 0} items totalling ${formatCurrency(total)}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <UtensilsCrossed className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold font-[family-name:var(--font-main)] text-lg leading-tight">
              Items
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {items?.length || 0} {(items?.length || 0) === 1 ? 'item' : 'items'}
              </span>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
            showItems ? 'rotate-180' : ''
          }`}
        />
      </button>
      {showItems && (
        <CardContent className="pt-0 animate-scale-fade-in">
          <div className="divide-y divide-border/60">
            {items?.map((item, index) => {
              const propPrice = getProportionalPrice(item);
              const claimEntries = itemClaimedBy.get(item.id) || [];
              const totalFrac = itemClaimedFraction.get(item.id) || 0;
              const isFullyClaimed = totalFrac >= 1;
              const isPartiallyClaimed = totalFrac > 0 && totalFrac < 1;
              const fractionLabel = (f: number) => {
                if (f === 1) return 'Full';
                if (f === 0.5) return '½';
                if (Math.abs(f - 1/3) < 0.001) return '⅓';
                if (f === 0.25) return '¼';
                return `${Math.round(f * 100)}%`;
              };

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 enter"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-1.5">
                      {isFullyClaimed && (
                        <div className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-success" />
                        </div>
                      )}
                      <p className={`font-medium truncate ${isFullyClaimed ? 'text-muted-foreground' : ''}`}>{item.name}</p>
                    </div>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">
                        ×{item.quantity}
                      </p>
                    )}
                    {item.shared_by && item.shared_by >= 2 && (
                      <p className="text-xs text-accent">
                        👥 Shared by {item.shared_by} ({formatCurrency(propPrice / item.shared_by)}/ea)
                      </p>
                    )}
                    {claimEntries.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {claimEntries.map((entry, i) => (
                          <p key={i} className="text-xs text-success/70">
                            {entry.name}{entry.fraction < 1 ? ` (${fractionLabel(entry.fraction)})` : ''}
                          </p>
                        ))}
                      </div>
                    )}
                    {isPartiallyClaimed && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full bg-success/70 rounded-full transition-all"
                            style={{ width: `${Math.min(totalFrac * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{Math.round(totalFrac * 100)}%</span>
                      </div>
                    )}
                  </div>
                  <p className={`font-medium font-tnum shrink-0 ${isFullyClaimed ? 'text-muted-foreground line-through' : ''}`}>{formatCurrency(propPrice)}</p>
                </div>
              );
            })}
          </div>

          {/* Totals breakdown */}
          <div className="mt-4 pt-4 gradient-divider mb-4" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tip</span>
                <span>{formatCurrency(tip)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
