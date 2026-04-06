'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ViewTransitionLink } from '@/components/view-transition-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Users, ChevronLeft, ChevronDown, CreditCard } from 'lucide-react';

type PreferredPayment = 'venmo' | 'zelle' | 'cashapp' | 'paypal';
import { sanitizeVenmoHandle, sanitizeCashAppHandle, sanitizePayPalHandle } from '@/lib/utils';

const EMOJI_OPTIONS = ['🍽️', '🍕', '🍣', '🍔', '🌮', '🥘', '🏠', '💼', '🎉', '🏖️', '⚽', '🎓', '🍻', '🎵', '🚗', '❤️'];

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [venmoHandle, setVenmoHandle] = useState('');
  const [zelleInfo, setZelleInfo] = useState('');
  const [cashappHandle, setCashappHandle] = useState('');
  const [paypalHandle, setPaypalHandle] = useState('');
  const [preferredPayment, setPreferredPayment] = useState<PreferredPayment>('venmo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Auto-fill from auth profile
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setCreatorEmail(user.email);
      }
      // Try to load profile
      fetch('/api/profile')
        .then((r) => r.json())
        .then(({ profile }) => {
          if (profile) {
            if (profile.display_name) setCreatorName(profile.display_name);

            const preferred = profile.preferred_payment;
            const hasPreferred =
              (preferred === 'venmo' && profile.venmo_handle) ||
              (preferred === 'zelle' && profile.zelle_info) ||
              (preferred === 'cashapp' && profile.cashapp_handle) ||
              (preferred === 'paypal' && profile.paypal_handle);

            if (['venmo', 'zelle', 'cashapp', 'paypal'].includes(preferred)) {
              setPreferredPayment(preferred);
            }

            if (hasPreferred) {
              setVenmoHandle(preferred === 'venmo' ? profile.venmo_handle || '' : '');
              setZelleInfo(preferred === 'zelle' ? profile.zelle_info || '' : '');
              setCashappHandle(preferred === 'cashapp' ? profile.cashapp_handle || '' : '');
              setPaypalHandle(preferred === 'paypal' ? profile.paypal_handle || '' : '');
            } else {
              if (profile.venmo_handle) setVenmoHandle(profile.venmo_handle);
              if (profile.zelle_info) setZelleInfo(profile.zelle_info);
              if (profile.cashapp_handle) setCashappHandle(profile.cashapp_handle);
              if (profile.paypal_handle) setPaypalHandle(profile.paypal_handle);
            }
          }
        })
        .catch(() => {});
    });
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Give your group a name!');
      return;
    }
    if (!creatorName.trim()) {
      setError('What should we call you?');
      return;
    }
    if (!creatorEmail.trim()) {
      setError('We need your email to create the group');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          emoji,
          created_by: creatorEmail.trim(),
          creator_name: creatorName.trim(),
          venmo_handle: venmoHandle.trim() || null,
          zelle_info: zelleInfo.trim() || null,
          cashapp_handle: cashappHandle.trim() || null,
          paypal_handle: paypalHandle.trim() || null,
          preferred_payment: preferredPayment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create group');
        return;
      }

      router.push(`/g/${data.slug}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-background min-h-dvh">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-border/50 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <ViewTransitionLink href="/" className="text-xl font-bold font-[family-name:var(--font-main)]">
            <span className="font-extrabold">tidy</span>
            <span className="text-primary font-extrabold">tab</span>
          </ViewTransitionLink>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div className="text-center space-y-2 enter">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
            Create a Group
          </h1>
          <p className="text-muted-foreground text-sm">
            For your crew, roommates, or anyone you split with regularly
          </p>
        </div>

        <Card className="enter enter-delay-1">
          <CardContent className="pt-6 space-y-5">
            {error && (
              <div className="p-3 bg-coral/10 border border-coral/20 rounded-xl text-coral text-sm animate-scale-fade-in">
                {error}
              </div>
            )}

            {/* Group Name */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Group Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., "Friday Dinner Crew"'
                autoFocus
                maxLength={100}
              />
            </div>

            {/* Emoji Picker — collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center justify-between w-full text-sm font-medium py-1"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">{emoji}</span>
                  Group Emoji
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showEmojiPicker ? 'rotate-180' : ''}`} />
              </button>
              {showEmojiPicker && (
                <div className="flex flex-wrap gap-2 mt-2 animate-scale-fade-in">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all active:scale-90 ${
                        emoji === e
                          ? 'bg-primary/20 ring-2 ring-primary scale-110'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="gradient-divider" />

            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Your Info</h3>
              <p className="text-xs text-muted-foreground">You&apos;ll be the group admin</p>
            </div>

            {/* Creator details */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Name *</label>
              <Input
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g., Alex"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Email *</label>
              <Input
                type="email"
                value={creatorEmail}
                onChange={(e) => setCreatorEmail(e.target.value)}
                placeholder="you@email.com"
              />
            </div>

            <div className="gradient-divider" />

            <div className="rounded-xl border border-border/50 p-4 space-y-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    Payment Info
                  </h3>
                  <p className="text-xs text-muted-foreground">You can add this later from your profile</p>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Optional</span>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Venmo Handle</label>
                <Input
                  value={venmoHandle}
                  onChange={(e) => setVenmoHandle(sanitizeVenmoHandle(e.target.value))}
                  placeholder="john-doe"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Zelle Email or Phone</label>
                <Input
                  value={zelleInfo}
                  onChange={(e) => setZelleInfo(e.target.value)}
                  placeholder="john@email.com"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">CashApp Tag</label>
                <Input
                  value={cashappHandle}
                  onChange={(e) => setCashappHandle(sanitizeCashAppHandle(e.target.value))}
                  placeholder="johndoe"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">PayPal.me Username</label>
                <Input
                  value={paypalHandle}
                  onChange={(e) => setPaypalHandle(sanitizePayPalHandle(e.target.value))}
                  placeholder="johndoe"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Default payout method</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['venmo', 'Venmo'],
                    ['zelle', 'Zelle'],
                    ['cashapp', 'Cash App'],
                    ['paypal', 'PayPal'],
                  ] as const).map(([value, label]) => {
                    const disabled =
                      (value === 'venmo' && !venmoHandle.trim()) ||
                      (value === 'zelle' && !zelleInfo.trim()) ||
                      (value === 'cashapp' && !cashappHandle.trim()) ||
                      (value === 'paypal' && !paypalHandle.trim());

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
                  New group expenses will default to this method when it&apos;s available.
                </p>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={loading}
              className="w-full h-12 text-base gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Group
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center enter enter-delay-2">
          <ViewTransitionLink href="/dashboard" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </ViewTransitionLink>
        </div>
      </div>
    </main>
  );
}
