# Visual Polish — Homepage & Bill View

**Date:** 2026-02-07  
**Deployed to:** https://tidytab.app

## Changes Made

### Homepage (`src/app/page.tsx`)

1. **Hero height fixed for mobile** — Removed `min-h-[85svh]` and `lg:py-0`. Hero now uses `py-16 sm:py-24` padding only, so headline + subtitle + CTA + mockup all fit above the fold on a 390×844 viewport.

2. **Feature strip text legibility** — Changed `text-[11px]` → `text-xs` (12px) and `gap-3` → `gap-4 sm:gap-10` for better spacing and readability.

3. **Progress bar shows 75%** — Both `MobileMockupTeaser` and `ProductMockup` progress bars changed from `width: '0%'` → `width: '75%'` to match the "3 of 4 paid ✓" text (3/4 = 75%).

4. **Social proof line added** — Below the hero CTA button: *"Loved by MBA cohorts & friend groups"* — subtle `text-xs text-muted-foreground`, keeps personality without being loud.

### Bill View

5. **Items accordion icon** (`src/components/bill/items-list.tsx`) — Added `<UtensilsCrossed>` icon before "Items" text to match the `<Users>` icon on the Contributions accordion. Both rows are now consistent: `[icon] [title] [count] ... [chevron]`.

6. **"More options" grouped with pay block** (`src/components/bill/chip-in-section.tsx`) — Wrapped YOUR SHARE card + Pay button + More Options in a tight `space-y-3` inner container. Outer container changed to `space-y-6`, creating clear visual separation: `[Share + Pay + Options]` block, then `[Progress]` block below.

7. **Warm shadow on YOUR SHARE card** — Added `shadow-[0_4px_24px_rgba(255,155,80,0.12)]` to the `warm-share-card` for subtle depth with a warm orange tone.

## Files Changed
- `src/app/page.tsx`
- `src/components/bill/items-list.tsx`
- `src/components/bill/chip-in-section.tsx`
