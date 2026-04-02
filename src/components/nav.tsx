'use client';

import { ViewTransitionLink } from '@/components/view-transition-link';
import { LinkButton } from '@/components/ui/link-button';
import { Plus, Users } from 'lucide-react';

interface NavProps {
  /** Hide specific nav items */
  hide?: ('dashboard' | 'create' | 'groups')[];
}

export function Nav({ hide = [] }: NavProps) {
  return (
    <nav className="glass-nav nav-shadow sticky top-0 z-50 px-4 sm:px-6 py-3">
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
        {/* Logo: lowercase tidytab, bold "tidy", primary "tab" */}
        <ViewTransitionLink
          href="/"
          className="text-lg sm:text-xl tracking-tight font-[family-name:var(--font-main)] flex items-center gap-0"
        >
          <span className="font-bold text-foreground">tidy</span>
          <span className="font-bold text-primary">tab</span>
        </ViewTransitionLink>

        {/* Nav actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!hide.includes('groups') && (
            <LinkButton
              href="/dashboard"
              variant="ghost"
              size="sm"
              className="rounded-full px-3 sm:px-4 gap-1.5 text-xs sm:text-sm font-semibold min-h-[40px]"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Groups</span>
            </LinkButton>
          )}
          {!hide.includes('dashboard') && (
            <LinkButton
              href="/dashboard"
              variant="outline"
              size="sm"
              className="rounded-full px-4 text-xs sm:text-sm font-semibold min-h-[40px]"
            >
              Dashboard
            </LinkButton>
          )}
          {!hide.includes('create') && (
            <LinkButton
              href="/new"
              size="sm"
              className="rounded-full px-4 gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground border-none text-xs sm:text-sm font-semibold min-h-[40px]"
            >
              <Plus className="w-3.5 h-3.5" />
              New Bill
            </LinkButton>
          )}
        </div>
      </div>
    </nav>
  );
}
