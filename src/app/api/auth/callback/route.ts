import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Server-side auth callback (fallback).
 *
 * Primary auth is now handled by the client-side /auth/callback page which
 * has access to the PKCE code_verifier cookie on the correct domain.
 * This route is kept as a fallback for direct links and older email templates.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Handle Supabase error params (e.g. expired magic link → ?error=access_denied&error_description=...)
  const supabaseError = searchParams.get('error');
  const supabaseErrorDesc = searchParams.get('error_description');
  if (supabaseError) {
    const isExpired =
      supabaseErrorDesc?.toLowerCase().includes('expired') ||
      supabaseErrorDesc?.toLowerCase().includes('invalid') ||
      supabaseError === 'access_denied';
    const message = isExpired
      ? 'Your magic link has expired. Please request a new one.'
      : supabaseErrorDesc || 'Authentication failed. Please try again.';
    console.error('Auth callback error from Supabase:', supabaseError, supabaseErrorDesc);
    return NextResponse.redirect(
      `${origin}/login?error=auth&message=${encodeURIComponent(message)}`
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore — may fail if called from a context where cookies are read-only
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Auto-link any bills created before signup (matched by email)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const admin = createAdminClient();
          await admin
            .from('bills')
            .update({ host_user_id: user.id })
            .eq('host_email', user.email)
            .is('host_user_id', null);
        }
      } catch {
        // Non-critical — dashboard will also auto-link
      }

      // Successful auth — redirect to dashboard or requested page
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    // Exchange failed — redirect to login with specific error
    console.error('Auth code exchange failed:', error.message);
    const message = error.message.includes('expired')
      ? 'Your magic link has expired. Please request a new one.'
      : 'Authentication failed. Please try again.';
    return NextResponse.redirect(
      `${origin}/login?error=auth&message=${encodeURIComponent(message)}`
    );
  }

  // No code — redirect to login
  return NextResponse.redirect(
    `${origin}/login?error=auth&message=${encodeURIComponent('Invalid authentication link.')}`
  );
}
