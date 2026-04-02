'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Client-side auth callback page.
 *
 * Handles both:
 *  - PKCE flow: `?code=XXX` query param → exchangeCodeForSession on the browser
 *    (the browser client has the code_verifier cookie on the correct domain)
 *  - Implicit flow: `#access_token=...` hash fragment → auto-detected by Supabase client
 *
 * This replaces the previous server-only /api/auth/callback approach which broke
 * when the PKCE code_verifier cookie was on a different domain than the callback URL.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double-execution in React strict mode
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      const supabase = createClient();
      const next = searchParams.get('next') || '/dashboard';

      // 1. Check for error params from Supabase (expired link, invalid token, etc.)
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      if (errorParam) {
        const msg = errorDescription || 'Authentication failed. Please request a new magic link.';
        router.replace(`/login?error=auth&message=${encodeURIComponent(msg)}`);
        return;
      }

      // 2. Handle PKCE flow: exchange code for session using the browser client
      //    The browser client has access to the code_verifier cookie (same domain).
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Auth code exchange failed:', error.message);
          const msg = error.message.includes('expired')
            ? 'Your magic link has expired. Please request a new one.'
            : error.message;
          router.replace(`/login?error=auth&message=${encodeURIComponent(msg)}`);
          return;
        }
        // Session is now stored in cookies by the browser client — redirect
        router.replace(next);
        return;
      }

      // 3. Handle implicit flow: hash fragment with access_token
      //    The Supabase browser client auto-detects #access_token in the URL
      //    via detectSessionInUrl (enabled by default). Listen for the event.
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // The Supabase client should auto-process the hash. Wait for session.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              subscription.unsubscribe();
              router.replace(next);
            }
          }
        );

        // Fallback: if no SIGNED_IN event fires within 5 seconds, check manually
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          subscription.unsubscribe();
          if (session) {
            router.replace(next);
          } else {
            router.replace(
              '/login?error=auth&message=' +
                encodeURIComponent('Session could not be established. The link may have expired.')
            );
          }
        }, 5000);
        return;
      }

      // 4. No code and no hash — nothing to process
      router.replace('/login?error=auth&message=' + encodeURIComponent('Invalid authentication link.'));
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center space-y-4 px-4">
          <p className="text-destructive">{error}</p>
          <a href="/login" className="text-primary hover:underline text-sm font-medium">
            Back to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Signing you in…</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
