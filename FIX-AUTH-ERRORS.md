# Fix: Auth Error Display & Magic Link Issues

**Date:** 2026-02-07  
**Deployed:** ✅ https://tidytab.app

---

## M2: Expired magic link shows no error — FIXED ✅

### Root Cause
The server-side auth callback (`/api/auth/callback/route.ts`) only checked for the `code` query parameter from Supabase. When Supabase sends an expired/invalid magic link, it sometimes redirects with `?error=access_denied&error_description=...` instead of a code. This fell through to the generic "Invalid authentication link" message.

Additionally, the error display on the login page was too subtle (light background, no icon).

### Changes Made

#### 1. Server callback — handle Supabase error params
**File:** `src/app/api/auth/callback/route.ts`

Added explicit handling for Supabase `error` and `error_description` query params **before** the code exchange logic. Now the full chain covers:
- Supabase sends `?error=access_denied&error_description=Email link is invalid or has expired` → detected, user-friendly message shown
- Supabase sends `?code=XXX` but code is expired → `exchangeCodeForSession` fails → detected, user-friendly message shown
- No code at all → generic "Invalid authentication link" message

User-friendly messages:
- Expired/invalid: **"Your magic link has expired. Please request a new one."**
- Other errors: **"Authentication failed. Please try again."**

#### 2. Login page — more prominent error display
**File:** `src/app/login/page.tsx`

- Added `AlertCircle` icon from Lucide
- Error box now has: icon, bold "Authentication Error" title, message text
- Slightly stronger background (`bg-coral/15` → more visible) and border (`border-coral/30`)
- Added `useEffect` to clean error params from URL after reading them (prevents stale error on page refresh)

### Error Flow (verified)
```
Expired magic link click
  → Supabase redirects to /api/auth/callback?error=access_denied&error_description=...
    → Server detects error params → redirects to /login?error=auth&message=Your magic link has expired...
      → Login page reads params → displays prominent red error box with icon
        → URL params cleaned from address bar (no stale error on refresh)
```

The client-side callback (`/auth/callback/page.tsx`) also has equivalent error handling as a fallback.

---

## M7: Magic link URL broken in plaintext email — SUPABASE DASHBOARD FIX NEEDED ⚠️

### Root Cause
The `=` sign after `?token` is being stripped/encoded in the **text/plain** version of the magic link email. This is a **Supabase email template** issue, not a TidyTab codebase issue. The magic link email is sent by Supabase's built-in auth system, not by TidyTab's Resend integration.

### How to Fix (Manual — Supabase Dashboard)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → select your project (`conokkoaerwzufjfivvi`)
2. Navigate to **Authentication** → **Email Templates** → **Magic Link**
3. Check the current template. The default uses `{{ .ConfirmationURL }}`
4. **The fix:** Make sure the template does NOT have any HTML encoding around the URL in plaintext context. Common issues:
   - Some email clients process `=` as a soft line break in quoted-printable encoding
   - The template might be wrapping the URL in a way that causes `=` to be encoded as `=3D`

5. **Recommended template:**
   ```html
   <h2>Magic Link</h2>
   <p>Follow this link to log in:</p>
   <p><a href="{{ .ConfirmationURL }}">Log In to TidyTab</a></p>
   ```
   
   The key is that `{{ .ConfirmationURL }}` should be inside an `<a href="...">` tag — email clients will render the clickable link correctly regardless of plaintext encoding issues.

6. **Alternative:** If you want to also show the raw URL as text, put it on its own line:
   ```html
   <p><a href="{{ .ConfirmationURL }}">Log In to TidyTab</a></p>
   <p style="word-break: break-all; font-size: 12px; color: #666;">{{ .ConfirmationURL }}</p>
   ```

### Why this can't be fixed in code
TidyTab uses `supabase.auth.signInWithOtp()` which triggers Supabase's internal email sending. The email template is configured in the Supabase Dashboard, not in the TidyTab codebase. The Resend integration in `/src/lib/emails/` is only used for bill-related notifications.

---

## Files Changed
- `src/app/api/auth/callback/route.ts` — Added Supabase error param handling
- `src/app/login/page.tsx` — Enhanced error display (icon, title, URL cleanup)
