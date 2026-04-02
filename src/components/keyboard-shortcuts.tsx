'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, Plus, LayoutDashboard, X } from 'lucide-react';
import type { BillWithItems } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface KeyboardShortcutsProps {
  bills?: BillWithItems[];
}

/**
 * Global keyboard shortcuts + search palette.
 * - Cmd/Ctrl + N → New bill
 * - Cmd/Ctrl + K → Quick search/navigate
 * - Escape → Close search
 *
 * Also exports openSearch() for external triggers (search button, etc.)
 */

// Shared state for triggering search externally
let _openSearchFn: (() => void) | null = null;
export function openSearch() {
  _openSearchFn?.();
}

export function KeyboardShortcuts({ bills = [] }: KeyboardShortcutsProps) {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredBills = bills.filter((bill) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      bill.restaurant_name?.toLowerCase().includes(q) ||
      bill.host_name?.toLowerCase().includes(q) ||
      bill.slug.toLowerCase().includes(q)
    );
  }).slice(0, 6);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setQuery('');
  }, []);

  // Register external trigger
  useEffect(() => {
    _openSearchFn = () => setShowSearch(true);
    return () => { _openSearchFn = null; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Don't capture when typing in an input/textarea
      const target = e.target as HTMLElement;
      if (!isMod && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Cmd/Ctrl + N → New bill
      if (isMod && e.key === 'n') {
        e.preventDefault();
        router.push('/new');
        return;
      }

      // Cmd/Ctrl + K → Search
      if (isMod && e.key === 'k') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
        return;
      }

      // Escape → Close search
      if (e.key === 'Escape' && showSearch) {
        e.preventDefault();
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, showSearch, closeSearch]);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [showSearch]);

  if (!showSearch) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/30 animate-fade-in"
        onClick={closeSearch}
      />

      {/* Command palette */}
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-xl animate-scale-fade-in overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bills or navigate..."
            className="border-0 shadow-none focus:ring-0 h-14 text-base bg-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeSearch();
              // Enter on first result
              if (e.key === 'Enter' && filteredBills.length > 0) {
                const first = filteredBills[0];
                router.push(`/b/${first.slug}`);
                closeSearch();
              }
            }}
          />
          <button
            onClick={closeSearch}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick actions */}
        {!query.trim() && (
          <div className="p-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
              onClick={() => {
                router.push('/new');
                closeSearch();
              }}
            >
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">New Bill</span>
              <kbd className="ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                ⌘N
              </kbd>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
              onClick={() => {
                router.push('/dashboard');
                closeSearch();
              }}
            >
              <LayoutDashboard className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
          </div>
        )}

        {/* Search results */}
        {query.trim() && (
          <div className="p-2 max-h-[300px] overflow-y-auto">
            {filteredBills.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No bills match &ldquo;{query}&rdquo;
              </p>
            ) : (
              filteredBills.map((bill) => (
                <button
                  key={bill.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
                  onClick={() => {
                    router.push(`/b/${bill.slug}`);
                    closeSearch();
                  }}
                >
                  <span className="text-lg">🍽️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {bill.restaurant_name || 'Bill'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(bill.total)} ·{' '}
                      {new Date(bill.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Hint footer */}
        <div className="border-t border-border px-4 py-2 flex gap-4 text-[10px] text-muted-foreground">
          <span>
            <kbd className="font-mono bg-muted px-1 py-0.5 rounded">↵</kbd> Open
          </span>
          <span>
            <kbd className="font-mono bg-muted px-1 py-0.5 rounded">Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
