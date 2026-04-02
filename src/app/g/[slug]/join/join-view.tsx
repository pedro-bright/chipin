'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ViewTransitionLink } from '@/components/view-transition-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { Group } from '@/lib/types';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { sanitizeVenmoHandle, sanitizeCashAppHandle, sanitizePayPalHandle } from '@/lib/utils';

interface JoinGroupViewProps {
  group: Group;
  memberNames: string[];
  recentBills: { restaurant_name: string | null; created_at: string }[];
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
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function JoinGroupView({ group, memberNames, recentBills, slug }: JoinGroupViewProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [venmoHandle, setVenmoHandle] = useState('');
  const [zelleInfo, setZelleInfo] = useState('');
  const [cashappHandle, setCashappHandle] = useState('');
  const [paypalHandle, setPaypalHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'venmo' | 'zelle' | 'cashapp' | 'paypal'>('venmo');

  // Check if name already exists (live check for "welcome back")
  const isExistingMember = name.trim() && memberNames.some(
    m => m.trim().toLowerCase() === name.trim().toLowerCase()
  );

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('What should we call you?');
      return;
    }

    // If existing member, just redirect with welcome toast
    if (isExistingMember) {
      setWelcomeBack(true);
      setTimeout(() => {
        router.push(`/g/${slug}?welcome=back`);
      }, 1500);
      return;
    }

    const hasPayment = venmoHandle.trim() || zelleInfo.trim() || cashappHandle.trim() || paypalHandle.trim();
    if (!hasPayment) {
      setError('Add at least one payment method so people can pay you back!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/groups/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          venmo_handle: venmoHandle.trim() || null,
          zelle_info: zelleInfo.trim() || null,
          cashapp_handle: cashappHandle.trim() || null,
          paypal_handle: paypalHandle.trim() || null,
          preferred_payment: selectedPayment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to join');
        return;
      }

      setJoined(true);
      setTimeout(() => {
        router.push(`/g/${slug}?welcome=new`);
      }, 1500);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Welcome back state
  if (welcomeBack) {
    return (
      <main className="bg-background min-h-dvh flex items-center justify-center px-4">
        <div className="text-center space-y-6 animate-spring-in max-w-sm">
          <div className="text-6xl">{group.emoji}</div>
          <div>
            <h1 className="text-3xl font-extrabold font-[family-name:var(--font-main)]">
              Welcome back!
            </h1>
            <p className="text-muted-foreground mt-2">
              You&apos;re already in {group.name} 👋
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Taking you to the group...</p>
        </div>
      </main>
    );
  }

  // Success state
  if (joined) {
    return (
      <main className="bg-background min-h-dvh flex items-center justify-center px-4">
        <div className="text-center space-y-6 animate-spring-in max-w-sm">
          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-success animate-pop-in" />
            </div>
            <div className="absolute -top-2 -right-2 text-2xl animate-float">🎉</div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold font-[family-name:var(--font-main)]">
              You&apos;re in!
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome to {group.emoji} {group.name}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Redirecting to group...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-dvh">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-border/50 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <ViewTransitionLink href="/" className="text-xl font-bold font-[family-name:var(--font-main)]">
            <span className="font-extrabold">tidy</span>
            <span className="text-primary font-extrabold">tab</span>
          </ViewTransitionLink>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-3 enter">
          <div className="text-6xl animate-float">{group.emoji}</div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">You&apos;ve been invited to join</p>
            <h1 className="text-3xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
              {group.name}
            </h1>
          </div>

          {/* Member avatars */}
          {memberNames.length > 0 && (
            <div className="flex items-center justify-center gap-1 mt-3">
              <div className="flex -space-x-2">
                {memberNames.slice(0, 5).map((n) => (
                  <div
                    key={n}
                    className={`w-8 h-8 rounded-full ${nameToColor(n)} flex items-center justify-center text-white text-xs font-bold border-2 border-background`}
                    title={n}
                  >
                    {getInitials(n)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground ml-2">
                {memberNames.length === 1
                  ? `${memberNames[0]} is here`
                  : `${memberNames.length} members`}
              </span>
            </div>
          )}

          {/* Recent activity */}
          {recentBills.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Recent: {recentBills.map((b) => b.restaurant_name || 'a bill').join(', ')}
            </p>
          )}
        </div>

        {/* Join Form */}
        <Card className="enter enter-delay-1">
          <CardContent className="pt-6 space-y-5">
            {error && (
              <div className="p-3 bg-coral/10 border border-coral/20 rounded-xl text-coral text-sm animate-scale-fade-in">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Alex"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Email <span className="text-muted-foreground">(optional)</span></label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
              <p className="text-xs text-muted-foreground mt-1">Get notified about new group bills</p>
            </div>

            <div className="gradient-divider" />

            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Payment Methods</h3>
              <p className="text-xs text-muted-foreground">Add at least one so people can pay you back</p>
            </div>

            {/* Payment method tabs */}
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              {(['venmo', 'zelle', 'cashapp', 'paypal'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setSelectedPayment(method)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedPayment === method
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {method === 'venmo' ? 'Venmo' : method === 'zelle' ? 'Zelle' : method === 'cashapp' ? 'CashApp' : 'PayPal'}
                </button>
              ))}
            </div>

            {selectedPayment === 'venmo' && (
              <div className="animate-scale-fade-in">
                <label className="text-sm font-medium mb-1.5 block">Venmo Handle</label>
                <Input
                  value={venmoHandle}
                  onChange={(e) => setVenmoHandle(sanitizeVenmoHandle(e.target.value))}
                  placeholder="john-doe"
                />
              </div>
            )}

            {selectedPayment === 'zelle' && (
              <div className="animate-scale-fade-in">
                <label className="text-sm font-medium mb-1.5 block">Zelle Email or Phone</label>
                <Input
                  value={zelleInfo}
                  onChange={(e) => setZelleInfo(e.target.value)}
                  placeholder="john@email.com or (555) 123-4567"
                />
              </div>
            )}

            {selectedPayment === 'cashapp' && (
              <div className="animate-scale-fade-in">
                <label className="text-sm font-medium mb-1.5 block">CashApp Tag</label>
                <Input
                  value={cashappHandle}
                  onChange={(e) => setCashappHandle(sanitizeCashAppHandle(e.target.value))}
                  placeholder="johndoe"
                />
              </div>
            )}

            {selectedPayment === 'paypal' && (
              <div className="animate-scale-fade-in">
                <label className="text-sm font-medium mb-1.5 block">PayPal.me Username</label>
                <Input
                  value={paypalHandle}
                  onChange={(e) => setPaypalHandle(sanitizePayPalHandle(e.target.value))}
                  placeholder="johndoe"
                />
              </div>
            )}

            <Button
              onClick={handleJoin}
              disabled={loading}
              className="w-full h-12 text-base gap-2 animate-cta-glow"
              size="lg"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isExistingMember ? 'Welcome back...' : 'Joining...'}
                </>
              ) : isExistingMember ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Welcome Back — Go to Group
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Join {group.name}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground enter enter-delay-2">
          Powered by{' '}
          <ViewTransitionLink href="/" className="text-primary hover:underline font-medium">
            tidytab
          </ViewTransitionLink>
          {' '}— split bills without the drama
        </p>
      </div>
    </main>
  );
}
