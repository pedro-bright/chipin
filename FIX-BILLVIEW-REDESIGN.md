# Bill View Redesign — Feb 7, 2026

## Problem
GPT-5.2 identified the bill view as the #1 improvement opportunity. The page was overloaded: welcome banner + progress bar + share button + per-person amount + payment form + items + contributors all stacked with no clear primary action. Payment UX was backwards (name field shown before tapping pay, method selection felt like a preference not an action).

## Changes Made

### 1. Payment Flow → 2-Step Progressive Disclosure (`chip-in-section.tsx`)
- **Before**: Mode selection grid (split/claim/custom) → amount → name → payment method → confirm — all visible at once
- **After**: 
  - Step 1: **YOUR SHARE: $XX.XX** (hero) + single **"Pay $XX.XX"** button (large, orange, confident)
  - Step 2: On tap "Pay" → expands to show name field → payment method → confirm
  - "Claim my dishes" and "Custom amount" moved behind a **"More options"** link
  - Bills without split amounts show claim/custom options directly

### 2. Information Hierarchy Reordered (`bill-view.tsx`)
- **Before**: Title → Progress → Share → Payment → Attendees → Items → Contributors
- **After**: Title → **YOUR SHARE + Pay CTA** → Progress → Items (collapsed) → Contributors (collapsed)
- Bill name + host + date consolidated into compact header (date inline with host, not separate line)
- Share button removed from main flow (kept only for host/creator in subtle placement)
- Attendees section removed from main view (redundant with contributors list)

### 3. Progress Card Simplified (`progress-card.tsx`)
- **Before**: Remaining amount + "of $total" + "X% covered" + progress bar + "$X paid" + "X people"
- **After**: Single metric — **"$40.87 remaining of $54.50"** + progress bar. That's it.

### 4. Trust Banner Compacted (`trust-banner.tsx`)
- **Before**: Multi-line block with emoji, 3 paragraphs explaining TidyTab
- **After**: Single line — **"[HostName] shared this bill with you"** with dismiss X

### 5. Contributors List Collapsed (`contributions-list.tsx`)
- **Before**: Always expanded card with full list
- **After**: Collapsed accordion — **"Who's Chipped In (3 people)"** → click to expand
- Auto-expands when real-time contribution arrives
- Empty state removed (no empty card shown)

### 6. Creator Share Toast Compacted (`bill-view.tsx`)
- **Before**: Giant block with emoji, 4 text lines, full-width button, copy link, footer text
- **After**: Compact row — "Your bill is live!" + "Share" button

### 7. Tone Adjustments
- Removed playful emoji from financial action areas (payment buttons, progress, settled states)
- Removed "Zero awkward texts needed ✨" from success state → clean "Payment recorded."
- Removed "No awkward texts needed ✨" from settlement overlay
- Kept emoji only in non-financial areas (settlement celebration, split summary)

### 8. Success State Cleaned Up
- "You're all set!" ✓ with amount
- "Not [Name]?" link
- No emoji in the payment confirmation text

## Files Modified
- `src/app/b/[slug]/bill-view.tsx` — Main layout reorder, compact creator toast, removed redundant share buttons and attendees section
- `src/components/bill/chip-in-section.tsx` — Complete rewrite: 2-step payment flow with progressive disclosure
- `src/components/bill/progress-card.tsx` — Simplified to single metric
- `src/components/bill/trust-banner.tsx` — Compacted to 1 line
- `src/components/bill/contributions-list.tsx` — Collapsed by default with accordion

## Preserved
- All existing functionality (payment submission, Venmo/Zelle/CashApp deep links, item claiming, custom amounts)
- Data flow intact (localStorage, real-time subscriptions, contribution refetch)
- Confetti on successful payment and settlement
- Mobile-first (390px) design
- Host key localStorage logic
- Badge display for hosts

## Deployed
- Production: https://tidytab.app
- Build: Clean, zero errors
