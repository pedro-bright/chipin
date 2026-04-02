# Auth Fix Summary — 2026-02-07

## Bug: Magic link auth doesn't persist the session

### Root Causes Identified

1. **Domain mismatch (PRIMARY)**: `NEXT_PUBLIC_APP_URL` was `https://chipin-sepia.vercel.app` but users access `https://tidytab.app`. The `emailRedirectTo` used this env var, so the magic link callback went to `chipin-sepia.vercel.app`. The PKCE `code_verifier` cookie (set by the browser on `tidytab.app`) was invisible to the callback on a different domain → code exchange always failed.

2. **Server-only callback couldn't handle hash fragments**: The callback was an API route (`/api/auth/callback`). If Supabase used implicit flow (tokens in `#access_token=...` hash), the server never saw the tokens — hash fragments aren't sent in HTTP requests.

3. **No `.trim()` on env vars**: Potential trailing newlines in environment variables caused `%0A` encoding in Supabase WebSocket URLs and API requests.

4. **Silent error on expired links**: Failed auth redirected to `/login?error=auth` with a generic "Authentication failed" message — no indication the link expired.

### Changes Made

#### `src/lib/supabase/client.ts`
- Added `.trim()` to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### `src/lib/supabase/server.ts`
- Added `.trim()` to all env vars (URL, anon key, service role key)

#### `src/lib/supabase/middleware.ts`
- Added `.trim()` to env vars
- Changed code interception to redirect to `/auth/callback` (client-side page) instead of `/api/auth/callback` (server route)
- Excluded `/auth/callback` from code interception to prevent redirect loops

#### `src/app/auth/callback/page.tsx` ← NEW
- Client-side auth callback page that handles both auth flows:
  - **PKCE flow** (`?code=`): Calls `exchangeCodeForSession()` from the browser client, which has access to the `code_verifier` cookie on the correct domain
  - **Implicit flow** (`#access_token=`): Supabase browser client auto-detects hash fragments via `detectSessionInUrl`
- Handles error params from Supabase (expired token, invalid link)
- Shows loading spinner during processing
- 5-second timeout fallback for implicit flow
- Protected against React strict mode double-execution

#### `src/app/login/page.tsx`
- Changed `emailRedirectTo` from `NEXT_PUBLIC_APP_URL` to `window.location.origin` — ensures the callback always goes to the same domain the user is on
- Changed callback path from `/api/auth/callback` to `/auth/callback` (client-side page)
- Added support for `?message=` query param to display specific error messages (e.g., "Your magic link has expired")

#### `src/app/api/auth/callback/route.ts`
- Added `.trim()` to env vars
- Improved error messages: expired link detection, specific error messages passed to login page
- Kept as a fallback for direct links / older email templates

### How It Works Now

1. User enters email on `/login` → `signInWithOtp()` called with `emailRedirectTo` = `https://tidytab.app/auth/callback?next=/dashboard`
2. PKCE `code_verifier` cookie set on `tidytab.app` by the browser client
3. User clicks magic link in email → Supabase verifies → redirects to `https://tidytab.app/auth/callback?code=XXX&next=/dashboard`
4. Client-side page loads on `tidytab.app` → calls `exchangeCodeForSession(code)` using browser client
5. Browser client reads `code_verifier` cookie (same domain ✅) → exchange succeeds → session stored in cookies
6. Redirect to `/dashboard` → middleware reads session cookies → user is authenticated

### Deployment
- Built and deployed to production: https://tidytab.app
- Vercel build: clean, no errors
