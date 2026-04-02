# Visual Polish: Dashboard, New Bill, Login

**Date:** 2026-02-07
**Deployed:** https://tidytab.app

## Changes Made

### Dashboard (`src/app/dashboard/dashboard-view.tsx`)

1. **Unified stats cards visual weight** — All three stats cards (Bills, Collected, Pending) now use `text-muted-foreground` when their value is 0. Color only applies when there's meaningful data: green for Collected > 0, orange for Pending > 0. No more inconsistent coloring on a fresh dashboard.

2. **Reduced empty state whitespace** — Empty state card padding reduced from `pt-10 pb-10` → `pt-6 pb-6`, spacing from `space-y-5` → `space-y-3`. Illustration shrunk from `w-24 h-24` → `w-16 h-16` with matching icon `w-7 h-7`. Removed the `animate-pulse` on the background (felt jittery). Button changed to `size="sm"` for proportion.

3. **Added personality to empty state** — "No active bills" → "No bills yet — time for dinner? 🍕". Warm gradient background behind the icon kept. Decorative floating circles made proportionally smaller.

### New Bill (`src/app/new/page.tsx`)

4. **Compacted upload area** — Drop zone padding reduced from `p-10 sm:p-16` → `p-8 sm:p-12`. Camera icon area shrunk from `w-20 h-20` → `w-16 h-16`. Spinner similarly shrunk. Text reduced from `text-xl` → `text-lg`. Internal spacing tightened from `space-y-5` → `space-y-4`.

5. **Added warmth to upload area** — The dashed upload box now has a persistent subtle warm tint (`bg-primary/[0.02]`) instead of only on hover. The radial gradient opacity bumped from `0.03` → `0.04` for a slightly warmer feel. Hover deepens to `bg-primary/[0.04]`.

### Login (`src/app/login/page.tsx`)

6. **Fixed "Welcome back" copy** — Changed to "Hey there 👋" — friendly, works for both new and returning users. Subtitle kept as-is.

7. **Reduced dead space** — Removed `min-h-dvh` from the main element (was forcing the page to fill the entire viewport). Added `pb-16` for comfortable bottom spacing without the echoing empty room effect. Suspense fallback also updated to match.

### Bonus Fix: Build Error (`src/components/bill/chip-in-section.tsx`)

- Fixed a pre-existing Turbopack build error caused by a `type` alias declared inside a function component body. Moved `type PayMode` to module scope. This was blocking all deployments.

## Files Modified
- `src/app/dashboard/dashboard-view.tsx`
- `src/app/new/page.tsx`
- `src/app/login/page.tsx`
- `src/components/bill/chip-in-section.tsx` (build fix)
