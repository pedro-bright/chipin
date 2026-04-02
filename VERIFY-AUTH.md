# TidyTab Auth Verification Report
**Date:** 2026-02-07 16:00 PST  
**Tested at:** https://tidytab.app (production)  
**Browser:** OpenClaw Chrome, 390px mobile viewport

---

## Summary: ❌ Auth is BROKEN in production

The critical auth fixes exist in source code but the **deployed build does NOT include them**. Login via magic link fails consistently.

---

## Test Results

### 1. Auth Flow — ❌ FAIL

| Test | Result | Details |
|------|--------|---------|
| Magic link email sends | ✅ PASS | Email arrives within seconds from `noreply@tidytab.app` |
| "Check your email" confirmation UI | ✅ PASS | Shows correctly after form submit |
| Rate limiting message | ✅ PASS | Shows "request this after 24 seconds" cooldown |
| PKCE code verifier stored | ⚠️ PARTIAL | Cookie `sb-...-auth-token-code-verifier` IS set after form submit |
| Magic link → auth callback redirect | ✅ PASS | Supabase redirects to `/auth/callback?code=XXX` correctly |
| `exchangeCodeForSession` succeeds | ❌ FAIL | **PKCE code verifier not found in storage** — cookie is lost during redirect chain |
| Session persists after redirect | ❌ FAIL | Never reaches dashboard — kicked back to `/login` |
| No `%0A` WebSocket errors | ❌ FAIL | **Still present** — see below |
| Expired link shows clear error | ⚠️ PARTIAL | Auth callback properly redirects to `/login?error=auth&message=...` for PKCE errors. But expired OTP links (old format) redirect to home page silently |

### 2. Dashboard Access — ❌ BLOCKED
Cannot test — auth never completes. `/dashboard` correctly redirects to `/login` for unauthenticated users.

### 3. Groups Flow — ❌ BLOCKED
Cannot test — auth never completes.

---

## Root Cause Analysis

### Issue 1: `.trim()` fix NOT deployed
The source code in `src/lib/supabase/client.ts` has:
```ts
createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
);
```

But the **deployed JS bundle** (`8243bd708e558fd0.js`) shows:
```js
createClient("https://conokkoaerwzufjfivvi.supabase.co\n","eyJ...lLcqk\n")
```

**No `.trim()` call in production.** The env vars have trailing `\n` causing `%0A` in WebSocket URLs.

**Console errors (verbatim):**
```
WebSocket connection to 'wss://conokkoaerwzufjfivvi.supabase.co/realtime/v1/websocket?apikey=eyJ...lLcqk%0A&vsn=2.0.0' failed: HTTP Authentication failed; no valid credentials available
```
These errors repeat continuously (every ~2 seconds).

### Issue 2: PKCE cookie lost during redirect
The flow works like this:
1. User submits email on `/login` → Supabase client stores PKCE verifier in cookie ✅
2. User clicks magic link → Supabase server redirects to `tidytab.app/auth/callback?code=XXX` ✅  
3. Callback page calls `exchangeCodeForSession(code)` → **Needs the verifier cookie → NOT FOUND** ❌

The cookie IS set (confirmed via `document.cookie` right after form submit), but by the time the callback page loads after the cross-origin Supabase redirect, the cookie is gone. This is likely a **SameSite cookie issue** — the redirect from `conokkoaerwzufjfivvi.supabase.co` to `tidytab.app` is cross-site, and the browser may strip `SameSite=Lax` cookies on the initial cross-origin redirect.

### Issue 3: Vercel env vars need `\n` removed
The Vercel environment variables for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` contain trailing newlines. Even with `.trim()` in code, it's better to fix the source:
- Go to Vercel dashboard → Settings → Environment Variables
- Remove trailing whitespace/newlines from both values
- Redeploy

---

## Recommended Fixes (Priority Order)

### P0: Redeploy to production
The `.trim()` fix exists in source but isn't deployed. Run `vercel --prod` or trigger a deploy.

### P0: Fix Vercel env vars
Remove trailing `\n` from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel dashboard. This is the root cause of `%0A` WebSocket errors.

### P0: Fix PKCE cookie SameSite issue  
The PKCE code verifier cookie needs to survive the cross-origin redirect from Supabase. Options:
1. Set cookie with `SameSite=None; Secure` (allows cross-site)
2. Store verifier in `localStorage` instead of cookie (like `@supabase/auth-helpers-nextjs` used to do)
3. Use the server-side API route (`/api/auth/callback`) approach with proper cookie forwarding

### P1: Expired link error display
The expired OTP flow (`#error=access_denied&error_code=otp_expired`) redirects to home page with error info only in the URL hash. The landing page doesn't parse this. Either:
- Add hash parsing to the landing page to show a toast
- Or redirect expired links through `/auth/callback` which already handles errors properly

---

## What Works
- ✅ Magic link emails send successfully (via Resend/SES)
- ✅ Custom branded email template looks good
- ✅ Login page UI (form, validation, rate limit feedback, "check email" state)
- ✅ Error message display on `/login?error=auth&message=...` works
- ✅ Dashboard route protection (redirects to login if not authenticated)
- ✅ `/auth/callback` client-side page exists and handles error cases
- ✅ Source code `.trim()` fix is correct — just needs deployment
