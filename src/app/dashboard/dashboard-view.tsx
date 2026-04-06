'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ViewTransitionLink } from '@/components/view-transition-link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, getVenmoProfileLink, sanitizeVenmoHandle, sanitizeCashAppHandle, sanitizePayPalHandle } from '@/lib/utils';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import type { BadgeType } from '@/lib/badges';
import type { BillWithItems, Contribution } from '@/lib/types';
import { KeyboardShortcuts, openSearch } from '@/components/keyboard-shortcuts';
import {
  Plus,
  LogOut,
  Share2,
  Settings,
  CheckCircle2,
  Eye,
  Link2,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  Receipt,
  Zap as ZapIcon,
  Award,
  UtensilsCrossed,
  Send,
  Clock,
  Search,
} from 'lucide-react';

interface GroupSummary {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  member_count: number;
  bill_count: number;
}

interface DashboardViewProps {
  bills: BillWithItems[];
  userEmail: string;
  userId: string;
  groups?: GroupSummary[];
}

type Tab = 'active' | 'settled' | 'all';

interface UserBadge {
  badge_type: string;
  badge_data: Record<string, unknown>;
  earned_at: string;
}

/** Bill age in days — for freshness indicator */
function getBillAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

/** Get a freshness label + color for bills */
function getFreshnessIndicator(createdAt: string, status: string): { label: string; className: string } | null {
  if (status === 'settled') return null;
  const days = getBillAgeDays(createdAt);
  if (days <= 1) return null; // Fresh, no indicator needed
  if (days <= 3) return null; // Still recent
  if (days <= 7) return { label: `${days}d old`, className: 'text-amber-500/70' };
  if (days <= 14) return { label: `${days}d old`, className: 'text-coral/70' };
  return { label: `${days}d old`, className: 'text-coral' };
}

/** Auto-detect a restaurant emoji from the bill name */
function getRestaurantEmoji(name: string | null): string {
  if (!name) return '🍽️';
  const lower = name.toLowerCase();
  if (/sushi|japanese|ramen|poke|omakase/.test(lower)) return '🍣';
  if (/pizza|italian|pasta|trattoria/.test(lower)) return '🍕';
  if (/taco|mexican|burrito|enchilada/.test(lower)) return '🌮';
  if (/chinese|dim\s?sum|wok|szechuan|sichuan/.test(lower)) return '🥡';
  if (/thai|pad\s?thai|curry/.test(lower)) return '🍜';
  if (/indian|tandoori|masala|naan/.test(lower)) return '🍛';
  if (/burger|grill|bbq|barbecue|smokehouse/.test(lower)) return '🍔';
  if (/steak|steakhouse|chop/.test(lower)) return '🥩';
  if (/seafood|fish|oyster|lobster|crab/.test(lower)) return '🦞';
  if (/brunch|breakfast|waffle|pancake/.test(lower)) return '🥞';
  if (/coffee|café|cafe|bakery/.test(lower)) return '☕';
  if (/bar|cocktail|drinks|pub|tavern|lounge/.test(lower)) return '🍸';
  if (/korean|bbq|kbbq|bibimbap/.test(lower)) return '🥘';
  if (/french|bistro|brasserie/.test(lower)) return '🥐';
  if (/vegan|vegetarian|plant/.test(lower)) return '🥗';
  if (/wings|chicken|fried/.test(lower)) return '🍗';
  if (/dessert|ice\s?cream|cake|sweet/.test(lower)) return '🍰';
  return '🍽️';
}

export function DashboardView({ bills, userEmail, userId: _userId, groups = [] }: DashboardViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [showClaim, setShowClaim] = useState(false);
  const [claimSlug, setClaimSlug] = useState('');
  const [claimHostKey, setClaimHostKey] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  // Profile state
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileVenmo, setProfileVenmo] = useState('');
  const [profileZelle, setProfileZelle] = useState('');
  const [profileCashapp, setProfileCashapp] = useState('');
  const [profilePaypal, setProfilePaypal] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [preferredPayment, setPreferredPayment] = useState<'venmo' | 'zelle' | 'cashapp' | 'paypal'>('venmo');

  // Badges state
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);

  // Load profile on mount
  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then(({ profile }) => {
        if (profile) {
          setProfileName(profile.display_name || '');
          setProfileVenmo(profile.venmo_handle || '');
          setProfileZelle(profile.zelle_info || '');
          setProfileCashapp(profile.cashapp_handle || '');
          setProfilePaypal(profile.paypal_handle || '');
          if (['venmo', 'zelle', 'cashapp', 'paypal'].includes(profile.preferred_payment)) {
            setPreferredPayment(profile.preferred_payment);
          }
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // Load badges
  useEffect(() => {
    if (userEmail) {
      fetch(`/api/badges?email=${encodeURIComponent(userEmail)}`)
        .then((r) => r.json())
        .then(({ badges }) => {
          if (badges) setUserBadges(badges);
        })
        .catch(() => {})
        .finally(() => setBadgesLoading(false));
    }
  }, [userEmail]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: profileName,
          venmo_handle: profileVenmo,
          zelle_info: profileZelle,
          cashapp_handle: profileCashapp,
          paypal_handle: profilePaypal,
          preferred_payment: preferredPayment,
        }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      // ignore
    } finally {
      setProfileSaving(false);
    }
  };

  // Sort by recent activity: latest contribution or creation date
  const getLatestActivity = (bill: BillWithItems): number => {
    const contribs = bill.contributions || [];
    if (contribs.length > 0) {
      const latest = Math.max(...contribs.map(c => new Date(c.created_at).getTime()));
      return Math.max(latest, new Date(bill.created_at).getTime());
    }
    return new Date(bill.created_at).getTime();
  };

  const filteredBills = bills
    .filter((bill) => {
      if (activeTab === 'active') return bill.status === 'published';
      if (activeTab === 'settled') return bill.status === 'settled';
      return true;
    })
    .sort((a, b) => getLatestActivity(b) - getLatestActivity(a));

  // Summary stats
  const totalBills = bills.length;
  const filterConfirmed = (contribs: Contribution[]) =>
    contribs.filter(c => c.note !== '[cancelled]' && c.note !== '[pending]');
  const totalCollected = bills.reduce((sum, bill) => {
    const paid =
      filterConfirmed(bill.contributions || []).reduce((s: number, c: Contribution) => s + Number(c.amount), 0);
    return sum + paid;
  }, 0);
  const billsNeedingFollowUp = useMemo(
    () =>
      bills.filter((b) => {
        if (b.status !== 'published') return false;
        const paid =
          filterConfirmed(b.contributions || []).reduce((s: number, c: Contribution) => s + Number(c.amount), 0);
        return b.total - paid > 0;
      }),
    [bills]
  );
  const needsFollowUp = billsNeedingFollowUp.length;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleClaim = async () => {
    if (!claimSlug.trim() || !claimHostKey.trim()) return;
    setClaimLoading(true);
    setClaimError('');
    setClaimSuccess('');

    try {
      const res = await fetch(`/api/bills/${claimSlug.trim()}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_key: claimHostKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.error || 'Failed to claim bill');
      } else {
        setClaimSuccess(`Claimed "${data.restaurant_name || 'bill'}" successfully!`);
        setClaimSlug('');
        setClaimHostKey('');
        router.refresh();
      }
    } catch {
      setClaimError('Something went wrong. Please try again.');
    } finally {
      setClaimLoading(false);
    }
  };

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleShare = async (slug: string, restaurantName: string, bill?: BillWithItems) => {
    const url = `${window.location.origin}/b/${slug}`;
    const totalPaidForBill = filterConfirmed(bill?.contributions || []).reduce((s: number, c: Contribution) => s + Number(c.amount), 0);
    const remainingForBill = bill ? Math.max(bill.total - totalPaidForBill, 0) : 0;
    const perPerson = bill?.person_count && bill.person_count > 0
      ? ` (~${formatCurrency(bill.total / bill.person_count)}/person)`
      : '';
    const text = remainingForBill > 0
      ? `Chip in for ${restaurantName || 'dinner'}! ${formatCurrency(remainingForBill)} remaining${perPerson} — pay in one tap 🍽️`
      : `Chip in for ${restaurantName || 'dinner'}!${perPerson}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'TidyTab', text, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2500);
    }
  };

  const handleBulkShare = async () => {
    const links = billsNeedingFollowUp
      .map((b) => `${b.restaurant_name || 'Bill'}: ${window.location.origin}/b/${b.slug}`)
      .join('\n');
    const text = `Here are the bills that still need payment:\n\n${links}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'TidyTab — Bills Reminder', text });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setCopiedSlug('__bulk__');
      setTimeout(() => setCopiedSlug(null), 2500);
    }
  };

  const handleMarkSettled = async (slug: string, hostKey: string) => {
    try {
      await fetch(`/api/bills/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_key: hostKey, status: 'settled' }),
      });
      router.refresh();
    } catch {
      // ignore
    }
  };

  return (
    <main className="bg-background min-h-dvh">
      {/* Keyboard shortcuts — Cmd+N, Cmd+K for power users */}
      <KeyboardShortcuts bills={bills} />

      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-border/50 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <ViewTransitionLink href="/" className="text-xl font-bold font-[family-name:var(--font-main)]">
            <span className="font-extrabold">tidy</span>
            <span className="text-primary font-extrabold">tab</span>
          </ViewTransitionLink>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={openSearch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all min-h-[36px] text-sm"
              aria-label="Search bills"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Search</span>
              <kbd className="hidden sm:inline font-mono text-[10px] bg-muted px-1 py-0.5 rounded ml-1">⌘K</kbd>
            </button>
            <LinkButton href="/new" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Bill</span>
              <span className="sm:hidden">New</span>
            </LinkButton>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Copied toast */}
      {copiedSlug && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-toast">
          <div className="px-4 py-2.5 rounded-full bg-charcoal text-primary-foreground text-sm font-medium shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            {copiedSlug === '__bulk__' ? 'All links copied!' : 'Link copied!'}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="enter">
          <h1 className="text-3xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
            Host Control Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Run your bills, groups, reminders, and payment setup from one place.</p>
        </div>

        {/* Stats — dramatic large numbers */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="enter enter-delay-1">
            <CardContent className="pt-5 pb-5 text-center flex flex-col items-center justify-between h-full">
              <p className={`text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-main)] tracking-tight flex-1 flex items-center ${
                totalBills > 0 ? '' : 'text-muted-foreground'
              }`}>
                {totalBills}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Hosted Bills
              </p>
            </CardContent>
          </Card>
          <Card className="enter enter-delay-2">
            <CardContent className="pt-5 pb-5 text-center flex flex-col items-center justify-between h-full">
              <p className={`text-base sm:text-4xl font-extrabold font-[family-name:var(--font-main)] tracking-tight flex-1 flex items-center font-tnum leading-tight ${
                totalCollected > 0 ? 'text-success' : 'text-muted-foreground'
              }`}>
                {formatCurrency(totalCollected)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Total Collected
              </p>
            </CardContent>
          </Card>
          <Card
            className={`enter enter-delay-3 ${needsFollowUp > 0 ? 'border-primary/30' : ''}`}
          >
            <CardContent className="pt-5 pb-5 text-center flex flex-col items-center justify-between h-full">
              <p
                className={`text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-main)] tracking-tight flex-1 flex items-center ${
                  needsFollowUp > 0 ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {needsFollowUp}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Need Follow-up
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions: host follow-up */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 enter enter-delay-4">
          <LinkButton href="/new" className="gap-2 h-11">
            <Plus className="w-4 h-4" />
            New Bill
          </LinkButton>
          <LinkButton href="/groups/new" variant="outline" className="gap-2 h-11">
            <Users className="w-4 h-4" />
            New Group
          </LinkButton>
          <Button
            onClick={handleBulkShare}
            variant="outline"
            className="gap-2 h-11"
            disabled={needsFollowUp === 0}
          >
            <Send className="w-4 h-4 text-primary" />
            {needsFollowUp > 0 ? `Send ${needsFollowUp} Reminder${needsFollowUp > 1 ? 's' : ''}` : 'No Reminders Needed'}
          </Button>
        </div>

        {/* Groups Section */}
        {(groups.length > 0 || true) && (
          <div className="space-y-3 enter enter-delay-4b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-[family-name:var(--font-main)] flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Groups You Run
              </h2>
              <LinkButton href="/groups/new" size="sm" variant="outline" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                New Group
              </LinkButton>
            </div>
            {groups.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 pb-6 text-center space-y-3">
                  <p className="text-muted-foreground text-sm">
                    No groups yet. Create one to run recurring shared expenses for roommates, trips, clubs, teams, or friend groups.
                  </p>
                  <LinkButton href="/groups/new" size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    Create Group
                  </LinkButton>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {groups.map((group) => (
                  <Link key={group.id} href={`/g/${group.slug}`}>
                    <Card className="card-interactive h-full">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-2xl shrink-0">
                            {group.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold font-[family-name:var(--font-main)] truncate">
                              {group.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {group.member_count} member{group.member_count !== 1 && 's'} · {group.bill_count} bill{group.bill_count !== 1 && 's'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Needs Attention */}
        {needsFollowUp > 0 && (
          <Card className="border-primary/25 bg-primary/5 enter enter-delay-4b">
            <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Needs attention</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {needsFollowUp} hosted bill{needsFollowUp > 1 ? 's still need' : ' still needs'} follow-up.
                </p>
              </div>
              <Button onClick={handleBulkShare} className="gap-2 sm:shrink-0">
                <Send className="w-4 h-4" />
                Remind everyone
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 enter enter-delay-5">
          {(
            [
              { key: 'active' as Tab, icon: ZapIcon, label: 'Active' },
              { key: 'settled' as Tab, icon: CheckCircle2, label: 'Settled' },
              { key: 'all' as Tab, icon: Receipt, label: 'All' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bills List */}
        {filteredBills.length === 0 ? (
          <Card className="animate-spring-in">
            <CardContent className="pt-6 pb-6 text-center space-y-3">
              {/* CSS art empty state */}
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <UtensilsCrossed className="w-7 h-7 text-muted-foreground/40" />
                </div>
                {/* Decorative circles */}
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary/20 animate-float" />
                <div
                  className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 rounded-full bg-accent/20 animate-float"
                  style={{ animationDelay: '2s' }}
                />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-base text-foreground font-[family-name:var(--font-main)]">
                  {activeTab === 'active'
                    ? 'No bills yet — time for dinner? 🍕'
                    : activeTab === 'settled'
                    ? 'No settled bills yet'
                    : 'No bills yet'}
                </p>
              </div>
              <LinkButton href="/new" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Create a Bill
              </LinkButton>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBills.map((bill, index: number) => {
              const activeContribs = filterConfirmed(bill.contributions || []);
              const totalPaid = activeContribs.reduce((s: number, c: Contribution) => s + Number(c.amount), 0);
              const remaining = Math.max(bill.total - totalPaid, 0);
              const progress = bill.total > 0 ? (totalPaid / bill.total) * 100 : 0;
              const contributorCount = activeContribs.length;
              const emoji = getRestaurantEmoji(bill.restaurant_name);
              const hasRemaining = remaining > 0 && bill.status === 'published';
              const freshness = getFreshnessIndicator(bill.created_at, bill.status);

              return (
                <Card
                  key={bill.id}
                  className={`card-interactive enter ${hasRemaining ? 'bill-needs-attention' : ''}`}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 flex items-start gap-3">
                        {/* Restaurant emoji */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center text-lg shrink-0 mt-0.5">
                          {emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <h3 className="font-semibold font-[family-name:var(--font-main)] truncate max-w-[180px] sm:max-w-none" title={bill.restaurant_name || 'Bill'}>
                              {bill.restaurant_name || 'Bill'}
                            </h3>
                            <Badge
                              variant={
                                bill.status === 'settled'
                                  ? 'success'
                                  : remaining <= 0
                                  ? 'success'
                                  : 'default'
                              }
                            >
                              {bill.status === 'settled'
                                ? 'Settled'
                                : remaining <= 0
                                ? 'Fully Covered'
                                : 'Open'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(bill.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {freshness && (
                              <span className={`ml-1 inline-flex items-center gap-0.5 ${freshness.className}`}>
                                <Clock className="w-3 h-3" />
                                {freshness.label}
                              </span>
                            )}
                            {' · '}
                            {contributorCount} {contributorCount === 1 ? 'person' : 'people'} chipped in
                            {(() => {
                              const latestContrib = bill.contributions?.length
                                ? Math.max(...bill.contributions.map(c => new Date(c.created_at).getTime()))
                                : 0;
                              if (latestContrib > 0) {
                                const diffMs = Date.now() - latestContrib;
                                const diffMin = Math.floor(diffMs / 60000);
                                if (diffMin < 60) return ` · ${diffMin}m ago`;
                                const diffHr = Math.floor(diffMin / 60);
                                if (diffHr < 24) return ` · ${diffHr}h ago`;
                                const diffDay = Math.floor(diffHr / 24);
                                if (diffDay === 1) return ' · yesterday';
                                if (diffDay < 7) return ` · ${diffDay}d ago`;
                              }
                              return '';
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold font-[family-name:var(--font-main)]">
                          {formatCurrency(bill.total)}
                        </p>
                        <p className="text-xs text-success">{formatCurrency(totalPaid)} collected</p>
                      </div>
                    </div>

                    <Progress
                      value={progress}
                      max={100}
                      pulse={hasRemaining}
                      className="h-2.5 mb-3"
                    />

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleShare(bill.slug, bill.restaurant_name || 'Bill', bill)}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </Button>
                      <LinkButton
                        href={`/b/${bill.slug}/manage?key=${bill.host_key}`}
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Manage
                      </LinkButton>
                      {bill.status === 'published' && remaining <= 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleMarkSettled(bill.slug, bill.host_key)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Settled
                        </Button>
                      )}
                      <LinkButton
                        href={`/b/${bill.slug}`}
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </LinkButton>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Profile Settings */}
        <Card className="enter enter-delay-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Host Profile & Payouts
              </CardTitle>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
              >
                {showProfile ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Hide
                  </>
                ) : (
                  <>
                    {profileName ? 'Edit' : 'Set up'} <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
            {!showProfile && (
              <div className="min-h-[20px]">
                {profileLoading ? (
                  <Skeleton className="h-4 w-48" />
                ) : profileName ? (
                  <p className="text-sm text-muted-foreground">
                    {profileName}
                    {profileVenmo && ` · Venmo: @${profileVenmo.replace(/^@/, '')}`}
                    {profileZelle && ` · Zelle: ${profileZelle}`}
                    {profileCashapp && ` · CashApp: ${profileCashapp}`}
                    {profilePaypal && ` · PayPal: ${profilePaypal}`}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Set up your host name and payout methods so new bills are ready to go faster.
                  </p>
                )}
              </div>
            )}
          </CardHeader>
          {showProfile && (
            <CardContent className="space-y-4 animate-scale-fade-in">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Your Name</label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g., Alex"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Venmo Handle</label>
                <Input
                  value={profileVenmo}
                  onChange={(e) => setProfileVenmo(sanitizeVenmoHandle(e.target.value))}
                  placeholder="e.g., @alex-doe"
                />
                {profileVenmo && (
                  <a
                    href={getVenmoProfileLink(profileVenmo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    ✓ Verify: {getVenmoProfileLink(profileVenmo)}
                  </a>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Zelle Email or Phone</label>
                <Input
                  value={profileZelle}
                  onChange={(e) => setProfileZelle(e.target.value)}
                  placeholder="e.g., alex@email.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">CashApp Tag</label>
                <Input
                  value={profileCashapp}
                  onChange={(e) => setProfileCashapp(sanitizeCashAppHandle(e.target.value))}
                  placeholder="e.g., $alexdoe"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">PayPal.me Username</label>
                <Input
                  value={profilePaypal}
                  onChange={(e) => setProfilePaypal(sanitizePayPalHandle(e.target.value))}
                  placeholder="e.g., johndoe"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Default payout method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    ['venmo', 'Venmo'],
                    ['zelle', 'Zelle'],
                    ['cashapp', 'Cash App'],
                    ['paypal', 'PayPal'],
                  ] as const).map(([value, label]) => {
                    const disabled =
                      (value === 'venmo' && !profileVenmo.trim()) ||
                      (value === 'zelle' && !profileZelle.trim()) ||
                      (value === 'cashapp' && !profileCashapp.trim()) ||
                      (value === 'paypal' && !profilePaypal.trim());

                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPreferredPayment(value)}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                          preferredPayment === value
                            ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        } ${disabled ? 'opacity-40 cursor-not-allowed hover:text-muted-foreground' : ''}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Returning guests default to this method when we know who they are.
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Button onClick={handleSaveProfile} disabled={profileSaving} className="gap-2">
                  {profileSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </Button>
                {profileSaved && (
                  <span className="text-sm text-success flex items-center gap-1 animate-pop-in">
                    <CheckCircle2 className="w-4 h-4" /> Saved!
                  </span>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Badges Section */}
        {badgesLoading ? (
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ) : userBadges.length > 0 ? (
          <Card className="enter enter-delay-7">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Your Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {userBadges.map((badge) => {
                  const def = BADGE_DEFINITIONS[badge.badge_type as BadgeType];
                  if (!def) return null;
                  return (
                    <span
                      key={badge.badge_type}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${def.color} cursor-default`}
                      title={def.description}
                    >
                      {def.icon} {def.label}
                      <span className="opacity-60 text-xs hidden sm:inline">— {def.description}</span>
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Claim a Bill */}
        <Card className="border-dashed enter enter-delay-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Claim Existing Bill
              </CardTitle>
              <button
                onClick={() => setShowClaim(!showClaim)}
                className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
              >
                {showClaim ? 'Hide' : 'Show'}{' '}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showClaim ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Link a bill you created before signing up.
            </p>
          </CardHeader>
          {showClaim && (
            <CardContent className="space-y-4 animate-scale-fade-in">
              {claimError && (
                <div className="p-3 bg-coral/10 border border-coral/20 rounded-xl text-coral text-sm animate-scale-fade-in">
                  {claimError}
                </div>
              )}
              {claimSuccess && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-success text-sm animate-spring-in">
                  {claimSuccess}
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Bill Slug</label>
                <Input
                  value={claimSlug}
                  onChange={(e) => setClaimSlug(e.target.value)}
                  placeholder="e.g., xK9mQ2"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Host Key</label>
                <Input
                  value={claimHostKey}
                  onChange={(e) => setClaimHostKey(e.target.value)}
                  placeholder="Your host management key"
                  type="password"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can find this in the manage URL of your bill (?key=...)
                </p>
              </div>
              <Button
                onClick={handleClaim}
                className="w-full"
                disabled={claimLoading || !claimSlug.trim() || !claimHostKey.trim()}
              >
                {claimLoading ? 'Claiming...' : 'Claim Bill'}
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </main>
  );
}
