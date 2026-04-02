# TidyTab UX Improvements V2

**Date:** 2026-02-07  
**Author:** Pedro (AI, autonomous build session)  
**Deployed:** ✅ https://tidytab.app  
**Build time:** ~20 minutes research + code + deploy

---

## Research Phase — Key Insights

### Splitwise Exodus (Late 2023–2025)
- Users furious about 3 expense/day limit on free tier, receipt scanning behind paywall
- Reddit threads: "I'm tired of Splitwise!" (Feb 2025), "The downfall of Splitwise" (Nov 2023), "SplitWise feels dead to use as a free user" (2025)
- Migration to alternatives: SettlUp, Tricount, Beem, and... potentially TidyTab
- **Lesson for us:** "Free means free" is a competitive moat. Never paywall core features.

### Linear Design Principles
- Reduce visual noise, increase hierarchy/density of navigation
- Minimal color — monochrome base with very few accent colors
- Radix Primitives for accessibility; custom "Orbiter" design system
- Key insight: **every pixel is intentional, motion is functional not decorative**
- TidyTab already embodies this well — warm amber accent on charcoal is a confident palette

### Venmo Social Mechanics
- Emoji culture in transaction notes makes payments feel fun, not transactional
- Social feed creates FOMO and normalizes quick payment
- **Takeaway:** Our success messages and confetti celebrations serve this purpose — make paying feel like a moment, not a chore

### What Makes Utility Apps Sticky
- **Progressive disclosure** — show the minimum needed, reveal complexity on demand
- **Memory** — remember user preferences across sessions (name, payment method)
- **Micro-celebrations** — mark moments of completion with delight
- **Social proof** — show that others have participated
- **Zero-friction re-entry** — PWA install, bookmarkable URLs

---

## Changes Implemented

### 🔴 Performance

#### 1. Dynamic Confetti Import
**Before:** `canvas-confetti` (~15KB) was statically imported in both `bill-view.tsx` and `chip-in-section.tsx`, adding to initial bundle for every bill page load — even when confetti never fires.  
**After:** New `src/lib/confetti.ts` module lazy-loads the library only when a celebration is triggered. Three exported functions: `celebrateCreation()`, `celebrateContribution()`, `celebrateSettlement()`.  
**Impact:** Faster initial load on the most important page (bill view).

#### 2. Haptic Feedback
Added `navigator.vibrate()` calls inside confetti celebrations:
- Bill creation: single 15ms pulse
- Contribution: triple-pulse pattern (10, 30, 10ms)
- Settlement: festive pattern (10, 50, 10, 50, 10ms)
- Gracefully degrades on devices without vibration API.

### 🔴 User Experience

#### 3. Enhanced Settlement Celebration (The Screenshot Moment)
**Before:** Settlement overlay showed generic "All squared up!" + "That was painless, right?"  
**After:** Shows personalized summary: "3 people chipped in $142.50 for Friday Dinner. That was painless ✨"  
- Overlay now has a radial gradient background (warm in light mode, dark in dark mode) for better readability
- Bouncing animation is slightly slower (0.6s vs 0.5s) for more gravitas
- This is designed to be the moment people screenshot and share

#### 4. Richer Success Messages (6 variations, up from 3)
New messages after someone chips in:
- "You're all set!" / "Payment recorded. Zero awkwardness achieved. 🎯"
- "Legend move!" / "Your host just got a notification. They appreciate you 💛"
- "Nailed it!" / "That took less time than deciding what to order 🍕"
- "Done and dusted!" / "No more 'I'll Venmo you later' energy. You're better than that ✨"
- "Smooth operator!" / "Payment logged. Time for dessert 🍰"
- "You're the best!" / "Prompt payers get good karma and better restaurant seats 🪑"

#### 5. Payment Method Memory
Contributors' payment method choice (Venmo/Zelle/CashApp) is now saved in localStorage.  
When they visit another TidyTab bill, their preferred method is pre-selected — if available.  
**Impact:** One fewer tap for repeat users.

#### 6. "Your Share" Card Scroll Hint
Added "scroll down to pay ↓" text to the "Your Share" card so contributors know there's a payment action below.

#### 7. Live Progress Indicator
Added a pulsing green dot next to "Remaining" in the progress card, signaling this is a live, real-time view — contributions appear as they happen.

### 🟡 Retention

#### 8. PWA Install Prompt
New component: `src/components/pwa-install-prompt.tsx`  
- Shows after 3+ visits on mobile devices
- iOS-aware: gives "Tap share → Add to Home Screen" instructions
- Detects if already installed (standalone mode) — won't show
- Dismissible with "X" button, remembers dismissal in localStorage
- Renders as a bottom card with spring animation, doesn't block content

### 🟡 Copy & Personality

#### 9. Creator Share Toast — Better Copy
- "Share this link with your group to start collecting" → "Drop this link in the group chat — friends can pay in one tap"
- Added subtext: "Works on any phone — no app or signup needed"
- Changed emoji from 🎉 to 🚀

#### 10. Share Text Enhancement
When sharing a bill, the share text now includes per-person amount if available:  
"Chip in for dinner! $142.50 total (~$35.63/person) — pay in one tap 🍽️"

#### 11. Settled Banner — More Personality
- Changed from generic "This bill has been settled" to "All squared up 🎉"
- Shows contributor count and total: "4 people chipped in $142.50. Zero awkwardness."
- Background changed from gray to soft green

#### 12. Empty Contributions — Creates Urgency
- "No one's chipped in yet / Be the first!" → "Waiting for the first hero... / Be the one who breaks the ice — prompt payers get a ⚡ badge"
- Connects to the badge system for motivation

#### 13. Homepage "How It Works" — Punchier Copy
- "Share the link" → "Drop the link" (more casual, group chat vocabulary)
- "Everyone pays up" → "Watch the money roll in" (more exciting)
- Added "no squinting at numbers" for receipt scanning
- Added 🎉 to final step description

#### 14. Trust Banner — Warmer
Added "No app, no signup" to the welcome text for first-time visitors.

### 🟢 Bill Creation Flow

#### 15. Smart Date Suggestion
- Placeholder now shows today's date dynamically: "e.g., Dinner at Nobu — Feb 7"
- If user types a restaurant name without a date, shows a clickable "+ Add today's date (Feb 7)" link
- One tap to append the date to the bill name
- Helps contributors identify which dinner this was

#### 16. Manual Entry — First-Class Copy
- "Or enter items manually" → "No receipt? Enter items by hand"
- Feels less like a fallback, more like a deliberate choice

#### 17. More Parsing Messages
Added 3 new AI scanning messages:
- "Making sure nobody snuck in an extra drink..."
- "Converting chicken scratch to line items..."
- "Doing the math so you don't have to..."

#### 18. Publishing State Copy
- "Launching your bill..." → "Creating your bill..."
- "Setting up your share link ✨" → "Generating your share link — almost there ✨"

### 🟢 Manage Page

#### 19. Copy Link Feedback
"Copy" button now shows "✓ Copied!" with green checkmark for 2 seconds after clicking, instead of no visual feedback.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/confetti.ts` | **NEW** — Dynamic confetti loader with haptic feedback |
| `src/components/pwa-install-prompt.tsx` | **NEW** — PWA install prompt for repeat mobile users |
| `src/app/b/[slug]/bill-view.tsx` | Dynamic confetti, enhanced settlement overlay, richer share text, better copy |
| `src/components/bill/chip-in-section.tsx` | Dynamic confetti, 6 success messages, payment method memory, share card hint |
| `src/components/bill/progress-card.tsx` | Live pulse indicator on remaining amount |
| `src/components/bill/contributions-list.tsx` | Enhanced empty state copy with badge motivation |
| `src/components/bill/trust-banner.tsx` | Warmer welcome text |
| `src/app/layout.tsx` | Added PWA install prompt |
| `src/app/page.tsx` | Punchier "How It Works" copy, non-breaking spaces |
| `src/app/new/page.tsx` | Smart date suggestion, more parsing messages, better manual entry CTA |
| `src/app/b/[slug]/manage/page.tsx` | Copy link visual feedback |
| `src/app/globals.css` | Enhanced settlement overlay styling (light + dark mode) |

---

## What's NOT Changing (And Why)

- **Design system palette** — The warm amber/coral on charcoal is strong. Don't touch it.
- **Animation timing** — Spring physics with `cubic-bezier(0.22, 1, 0.36, 1)` is butter. Perfect.
- **No `backdrop-filter`** — Constraint respected everywhere.
- **Receipt parsing flow** — Already excellent with rotation retry + enhanced scan fallback.
- **Supabase real-time** — Rock solid.

---

## Things That Need Terry's Input

### Product Decisions
1. **Bill expiration** — Should bills auto-archive after 30 days? Would reduce dashboard clutter for active hosts.
2. **Split by percentage** — Some groups want 60/40 splits. Would add complexity. Worth it?
3. **Undo contribution** — Allow contributors to retract? Could be abused but adds safety.

### Copy Approval
4. **Footer** — Currently "Built by Terry with love ♥️ for MBA cohorts who eat out too much 🎓" — this is perfect, keeping it.
5. **Success messages** — Review the 6 new variations. Any feel off-brand?

### Future Ideas (Not Yet Built)
6. **Shareable settlement card** — Generate an image of "All settled! 4 people, $142.50" that people can share to Instagram stories
7. **Recurring bill templates** — "Same restaurant, same group" shortcut for weekly dinners
8. **Currency localization** — Non-USD support for international MBA cohorts
9. **Bill analytics** — "Your average dinner costs $35.62" for hosts with 5+ bills
10. **Sound effects** — Subtle "cha-ching" on contribution (would need user opt-in)

---

## Metrics to Watch
- **Contribution completion rate** — do more people complete payment after landing on bill?
- **Time to first contribution** — does the payment method memory + scroll hint reduce friction?
- **PWA installs** — track via `beforeinstallprompt` event or manifest analytics
- **Share rate** — do more hosts share after seeing the new creator toast?
