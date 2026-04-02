# FIX: Homepage Simplification

**Date:** 2026-02-07  
**Live:** https://tidytab.app  
**Triggered by:** GPT-5.2 review — "a marathon scroll on mobile"

## What Changed

### Removed
- **"See how it works ↓"** link (redundant secondary CTA in hero)
- **Social proof avatars + "Loved by MBA cohorts"** blurb from hero
- **Full illustrated "How It Works" cards** — SnapVisual, ShareVisual, PayVisual (3 large card components with mock UIs and paragraphs)
- **Groups CTA section** entirely (groups discoverable post-signup)
- **All emoji from headlines** and feature strip
- **Verbose descriptions** on feature badges

### Simplified
- **Subtitle:** cut from 2 lines to 1 → "Snap a receipt, share a link, get paid. No app needed."
- **Hero CTA:** reduced from 2 (button + "see how it works") to 1 ("Create a Bill — it's free")
- **Feature strip:** was 4 cards with emoji + title + subtitle → now 4 plain text labels in one line
- **How It Works:** was 3 alternating illustrated sections with paragraphs → now 3 tight numbered bullets (one sentence each)
- **Bottom CTA copy:** "Ready to try it? Takes 30 seconds." → "Takes 30 seconds. Always free."

### Added
- **Sticky mobile CTA bar:** Fixed bottom bar appears on phones after scrolling past the hero CTA, using IntersectionObserver. Shows "Create a Bill — free" button. Disappears when hero is visible.

## Content Reduction
- **Before:** ~370 lines, 7 visual components (ProductMockup, MobileMockupTeaser, SocialProofStrip, SnapVisual, ShareVisual, PayVisual, GroupsCTA)
- **After:** ~280 lines, 4 visual components (ProductMockup, MobileMockupTeaser, FeatureStrip, StickyMobileCTA)
- **Sections removed:** 2 (Groups CTA, detailed step visuals)
- **Net effect on mobile:** Roughly 50% less scroll. Page feels short and confident.

## Files Changed
- `src/app/page.tsx` — full rewrite

## Deployment
- Build: clean ✓
- Deployed to production via `npx vercel --prod`
- Live at https://tidytab.app
