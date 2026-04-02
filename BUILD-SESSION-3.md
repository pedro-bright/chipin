# Build Session 3 — Feb 7, 2025

## What Was Done

### 1. Edge Middleware Rate Limiting ✅
**File:** `src/middleware.ts`
- Moved rate limiting to edge middleware layer — now applies to ALL API routes automatically
- Added per-route rate limit configs (receipt parsing: 8/min, uploads: 10/min, bill creation: 15/min, contributions: 10/min)
- Returns proper `429` with `Retry-After` and `X-RateLimit-*` headers
- Pattern matching for dynamic routes (`/api/bills/*/contribute`)
- Default generous limit (60/min) for other API routes
- Still in-memory (edge warm instances), but now a proper first line of defense
- **To upgrade:** Replace with Upstash Redis (@upstash/ratelimit) when traffic demands it

### 2. Error Recovery for Receipt Parse ✅
**File:** `src/app/new/page.tsx`
- When OCR fails, error banner now includes a prominent "Enter items by hand instead" CTA button
- Button appears contextually: on upload step or when review step has no items
- Uses the existing `skipToManual()` flow — no new state needed
- Button has proper touch target (44px min-height), good contrast against coral error bg

### 3. Bill Creation API Validation ✅
**File:** `src/app/api/bills/route.ts`
- Added input validation for all fields:
  - Host name: required, max 100 chars
  - Total: must be positive, max $1M
  - Items: required, max 500, each must have name (max 500 chars)
  - Email: regex validation when provided
  - Restaurant name: truncated to 200 chars
- Item prices clamped to 0+, quantities clamped to 1+
- Item names trimmed and truncated, fallback to "Item" if empty

### 4. 320px iPhone SE Mobile Fixes ✅
**Files:** `src/app/globals.css`, `src/app/page.tsx`
- Hero title: reduced minimum clamp from 2.75rem → 2.25rem for 320px
- Social proof strip: tighter gaps, shorter text ("Reads every item" → "Reads every item")
- Step numbers: thinner stroke (1.5px) on narrow screens, 2px on 400px+
- Added `@media (max-width: 359px)` rules: tighter padding, word-break on h1
- Social proof sub-text shortened to prevent overflow

### 5. Manage Page UX Improvements ✅
**File:** `src/app/b/[slug]/manage/page.tsx`
- **Quick Settle Banner**: When bill is fully covered, shows prominent "Mark as Settled" button at top
- **Progress bar**: Added visual progress bar to summary card
- **Delete contributions**: Host can now remove incorrect/duplicate contributions with delete button
  - On mobile: always visible (not just hover)
  - Requires confirmation dialog before deletion
  - Shows loading spinner during deletion
- **Quick-fill amounts**: Record Payment now has chip buttons for "Split amount" and "Remaining"
- **Empty state**: Better empty contributions state with icon and messaging
- **Contribution notes**: Shows notes (e.g., "Added by host") in contribution list
- **Status-aware styling**: Summary card changes to green when settled

### 6. Items Display — Long Name Handling ✅
**Files:** Already handled via `truncate` class in `items-list.tsx`
- Item names use `min-w-0 flex-1 mr-3` + `truncate` — verified this works for long names
- Bill API now enforces max 500 char item names server-side

## What Wasn't Done (Future Sessions)

### Performance Audit
- Bundle size analysis needed (consider dynamic imports for confetti, heavy components)
- Image optimization — receipts should use `next/image` with proper `sizes`
- Check for unnecessary re-renders in bill view (many `useEffect`s)

### Email Notifications
- Resend integration exists but not verified end-to-end
- Email templates could use more design polish

### True Persistent Rate Limiting
- Current edge middleware rate limiting is still in-memory
- For production scale: integrate Upstash Redis or Vercel KV
- Consider adding: rate limit by API key, IP reputation, etc.

### Share Experience
- OG images are solid (verified)
- Loading skeleton is comprehensive
- Could add: branded share card for WhatsApp/iMessage preview text

## Architecture Notes
- Middleware now handles both auth (non-API routes) and rate limiting (API routes)
- Next.js 16.1.6 shows "middleware deprecated" warning — suggests migrating to "proxy" convention
- Build succeeds clean, no type errors

## Deployed
- **URL:** https://tidytab.app
- **Build time:** ~27s on Vercel
- **Deploy:** Production via `npx vercel --prod --yes`
