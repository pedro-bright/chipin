'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Plus, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-background flex items-center justify-center py-20">
          <div className="max-w-md w-full px-4 space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const authError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const authMessage = searchParams.get('message');
  const [error, setError] = useState(
    authError === 'auth'
      ? authMessage || 'Authentication failed. Please try again.'
      : ''
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Clean error params from URL after reading them (prevents stale error on refresh)
  useEffect(() => {
    if (authError === 'auth') {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [authError]);

  // Countdown timer for rate limit
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      // Always use the current origin so the PKCE code_verifier cookie
      // (set on this domain) is available when the callback page loads.
      // Using NEXT_PUBLIC_APP_URL caused domain mismatches (e.g. chipin-sepia.vercel.app
      // vs tidytab.app), breaking the auth code exchange.
      const callbackOrigin = window.location.origin;

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Use the server-side Route Handler for the callback.
          // The server can read the PKCE code_verifier cookie and exchange
          // the code in a single request, avoiding the race condition where
          // middleware's getUser() strips cookies before the client page renders.
          emailRedirectTo: `${callbackOrigin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (authError) {
        if (
          authError.message.toLowerCase().includes('rate') ||
          authError.message.toLowerCase().includes('too many') ||
          authError.message.toLowerCase().includes('email rate limit')
        ) {
          setCooldownSeconds(60);
          setError('');
        } else {
          setError(authError.message);
        }
      } else {
        setSent(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-background relative overflow-hidden">
      {/* Warm gradient background */}
      <div className="absolute inset-0 warm-hero-gradient" />

      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-border/50 px-4 py-4 relative">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-[family-name:var(--font-main)]">
            <span className="font-extrabold">tidy</span>
            <span className="text-primary font-extrabold">tab</span>
          </Link>
          <Link href="/new">
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Bill
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8 sm:py-10 pb-16 relative">
        {!sent ? (
          <div className="space-y-8 enter">
            {/* Hero text */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary mx-auto flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
                Hey there 👋
              </h1>
              <p className="text-muted-foreground text-base max-w-xs mx-auto">
                Sign in with a magic link. No password needed.
              </p>
            </div>

            {/* Login card */}
            <Card className="enter enter-delay-2">
              <CardContent className="pt-6 pb-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <div className="p-4 bg-coral/15 border border-coral/30 rounded-xl text-coral text-sm animate-spring-in flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Authentication Error</p>
                        <p className="mt-0.5 opacity-90">{error}</p>
                      </div>
                    </div>
                  )}
                  {cooldownSeconds > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                      Too many requests. Try again in {cooldownSeconds}s
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email Address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full gap-2"
                    size="lg"
                    disabled={loading || cooldownSeconds > 0}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Send Magic Link
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="enter">
            <Card className="text-center">
              <CardContent className="pt-10 pb-10 space-y-5">
                <div className="w-20 h-20 rounded-full bg-success/10 text-success mx-auto flex items-center justify-center">
                  <Mail className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-extrabold font-[family-name:var(--font-main)] tracking-tight">
                  Check your email!
                </h2>
                <p className="text-muted-foreground">
                  We sent a magic link to{' '}
                  <span className="font-semibold text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Click the link in the email to log in. Check spam if it takes more than a minute!
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setSent(false);
                      setEmail('');
                    }}
                    className="text-sm text-primary hover:underline flex items-center justify-center gap-1 mx-auto font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Use a different email
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
