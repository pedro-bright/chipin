'use client';

import { ViewTransitionLink } from '@/components/view-transition-link';
import { LinkButton } from '@/components/ui/link-button';
import { Settings, Plus, LayoutDashboard } from 'lucide-react';

interface BillHeaderProps {
  slug: string;
  hostKey?: string;
  isAuthHost?: boolean;
}

export function BillHeader({ slug, hostKey, isAuthHost }: BillHeaderProps) {
  return (
    <nav className="glass-header sticky top-0 z-40 border-b border-border/50 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <ViewTransitionLink href="/" className="text-xl font-bold font-[family-name:var(--font-main)]">
          <span className="font-extrabold">tidy</span>
          <span className="text-primary font-extrabold">tab</span>
        </ViewTransitionLink>
        <div className="flex items-center gap-2">
          {(hostKey || isAuthHost) && (
            <>
              <LinkButton
                href="/dashboard"
                variant="outline"
                size="sm"
                className="gap-1.5 px-2 sm:px-3"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </LinkButton>
              <LinkButton
                href={
                  hostKey
                    ? `/b/${slug}/manage?key=${hostKey}`
                    : `/b/${slug}/manage?auth=true`
                }
                variant="outline"
                size="sm"
                className="gap-1.5 px-2 sm:px-3"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Manage</span>
              </LinkButton>
            </>
          )}
          <LinkButton href="/new" size="sm" variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Bill</span>
            <span className="sm:hidden">New</span>
          </LinkButton>
        </div>
      </div>
    </nav>
  );
}
