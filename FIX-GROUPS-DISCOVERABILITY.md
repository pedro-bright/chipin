# Fix: Groups Discoverability & API Error Message

**Date:** 2026-02-07
**Deployed to:** https://tidytab.app

## Changes Made

### M-NEW-1: Groups Discoverability

The Groups feature was completely hidden — no mention on homepage, nav, or about page.

**1. Nav bar — added Groups link** (`src/components/nav.tsx`)
- Added a "Groups" ghost button with Users icon in the nav bar
- Shows icon-only on mobile, "Groups" label on desktop
- Links to `/dashboard` (which requires login → redirects to `/login`)
- Can be hidden via `hide={['groups']}` prop

**2. Homepage — social proof strip** (`src/app/page.tsx`)
- Added "👥 Groups — Split with your crew" as a 4th item in the feature highlights strip

**3. Homepage — Groups CTA section** (`src/app/page.tsx`)
- Added a dedicated `GroupsCTA` section below "How It Works"
- Features a visual mockup of a group card with member balances
- "New" badge to draw attention
- "Create a Group" CTA button → `/groups/new`
- "Learn more →" link → `/about#groups`

**4. About page — Groups section** (`src/app/about/page.tsx`)
- Added a "Groups" section with `id="groups"` anchor (linkable from homepage)
- Describes the feature: saved payment info, running history, invite links
- Includes a "Create a Group" CTA button → `/groups/new`

### M-NEW-2: API Error Message Improvement

**File:** `src/app/api/groups/route.ts`

**Before:** API checked for `created_by` field and returned `"Creator email is required"` — misleading when the real issue was the user wasn't logged in.

**After:**
- Auth check happens **first** using `@supabase/ssr` with cookie-based session detection
- Returns `{"error": "Please log in to create a group"}` with `401` status for unauthenticated users
- Field validation only runs after auth is confirmed
- Service role client still used for the actual DB operations (bypasses RLS)

## Files Modified
- `src/components/nav.tsx` — Groups nav link
- `src/app/page.tsx` — Social proof strip + GroupsCTA section
- `src/app/about/page.tsx` — Groups section with anchor
- `src/app/api/groups/route.ts` — Auth-first error handling
