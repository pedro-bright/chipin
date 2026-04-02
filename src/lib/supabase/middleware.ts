import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Handle Supabase auth code exchange.
  // Supabase confirmation emails redirect to the Site URL with ?code=XXX.
  // Route these through /auth/callback (client-side page) which exchanges the
  // code using the browser client — this ensures the PKCE code_verifier cookie
  // (set on the current domain) is available for the exchange.
  //
  // We use ?code= exclusively for auth. Group invites now use ?invite= to avoid
  // any conflict. Only intercept ?code= on pages where it makes sense (not API/auth routes).
  const code = request.nextUrl.searchParams.get('code');
  if (
    code &&
    !request.nextUrl.pathname.startsWith('/api/auth/callback') &&
    !request.nextUrl.pathname.startsWith('/auth/callback')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    url.searchParams.set('code', code);
    // Preserve original path as redirect target (default to /dashboard)
    const next = request.nextUrl.pathname === '/' ? '/dashboard' : request.nextUrl.pathname;
    url.searchParams.set('next', next);
    return NextResponse.redirect(url);
  }

  // Skip session refresh on auth callback paths to avoid interfering with
  // the PKCE code_verifier cookie before the code exchange completes.
  if (request.nextUrl.pathname.startsWith('/auth/callback') ||
      request.nextUrl.pathname.startsWith('/api/auth/callback')) {
    return supabaseResponse;
  }

  // Refresh the auth token - IMPORTANT!
  // Do not remove this line. It refreshes the auth token and persists it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /dashboard route
  if (
    !user &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
