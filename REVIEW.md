# 🔍 TidyTab — Comprehensive Holistic Review

**Reviewer:** Pedro (AI)  
**Date:** February 6, 2026  
**Scope:** Full codebase, live app (chipin-sepia.vercel.app), design, UX, security, performance, product

---

## Executive Summary

TidyTab is a **well-built MVP with genuine product-market fit** in its MBA niche. The core flow — snap receipt → AI parse → share link → friends pay — works and solves a real problem. The codebase is clean, the stack is modern, and the design documents show serious strategic thinking.

But here's the honest truth: **TidyTab currently looks and feels like a competent developer's side project, not a product people screenshot and share with friends.** It's functional without being memorable. Warm without being hot. Good without being great.

Terry wants mass adoption and design personality. That requires honest criticism and bold changes. Here it is.

---

## Part 1: Current State Assessment

### What Works Well ✅

1. **Zero-friction architecture is genuinely brilliant.** No app download, no account for participants — this is a legitimate structural advantage over Splitwise. The product strategy doc nails this.

2. **The three-mode chip-in system** (claim dishes / split evenly / custom amount) covers the real use cases. The "claim dishes" flow with proportional tax+tip is particularly thoughtful — most competitors don't handle this.

3. **Real-time updates via Supabase Realtime** — seeing contributions appear live creates social proof and urgency. Good use of the tech.

4. **AI receipt parsing with GPT-4o Vision** — this is the killer feature. Free receipt OCR when Splitwise charges $5/month for it. The prompt engineering is solid (structured JSON output, edge case handling).

5. **Email notification system** — contribution alerts, "fully covered" celebrations, and cadenced reminders show product maturity beyond an MVP.

6. **Dark mode support** — fully implemented with a warm zinc palette, not an afterthought.

7. **Performance-conscious CSS** — the `contain: layout style` on headers, `@media (hover: hover)` gating, no `backdrop-filter`, `pointer: fine` scrollbar gating — someone did their homework on scroll perf.

8. **Rate limiting on sensitive endpoints** — parse-receipt (5/min), upload (10/min), contribute (10/min). In-memory but effective for the scale.

9. **The confetti system** — multi-burst confetti on bill creation and full settlement. It's delightful.

10. **Multi-receipt support** — the "Add Receipt" button that merges items from multiple receipts is a genuinely useful feature most competitors lack.

### What Doesn't Work ❌

1. **The homepage is generic.** It looks like a template. Warm cream background, centered text, 3-step card grid — this is the default layout of 10,000 SaaS landing pages. There's nothing that makes someone stop and think "this is different."

2. **No product preview on the homepage.** Users can't see what the bill page actually looks like before creating one. This is a major conversion killer for a web product — you're asking people to trust a tool they've never seen.

3. **The bill view page buries the most important action.** A participant who opens the link sees: header → progress card → share button → "Your Share" card → "Pay Your Share" card (requires scrolling). On mobile, they might have to scroll past 500px of content before they even see how to pay. The DESIGN-BRIEF.md correctly identifies this as a problem.

4. **The "how to chip in" decision tree adds friction.** Most people just want to split evenly. The current flow: see bill → scroll down → see 3 options → decide → click → enter name → choose payment method → tap payment link → tap "I've Paid." That's 7+ actions. Splitwise is simpler for the common case.

5. **Items are collapsed by default** — but the items ARE the receipt. For the "claim dishes" flow, you have to expand items, then go back up to click "Claim my dishes," then items appear inline inside the Pay Your Share card. Two separate item lists with different purposes is confusing.

6. **The dashboard is information-rich but action-poor.** Stats cards (Total Bills, Collected, Need Follow-up) are fine, but the primary action hosts need — "re-share this link because 3 people haven't paid" — requires clicking "Share" on each bill individually.

7. **No onboarding or explanation for new contributors.** Someone who receives a TidyTab link for the first time lands on a page with zero context about what this service is or why they should trust it. There's no "First time? Here's how it works" micro-tutorial.

8. **The footer says "Built with love ♥️ for people who eat out with friends 🍕"** — but the MEMORY says it should be "Built by Terry with love ♥️ for MBA cohorts who eat out too much 🎓". The current footer is more generic and less charming. The original had personality.

9. **OG meta tags are minimal.** The shared link preview in iMessage/WhatsApp will show "Dinner at Nobu — TidyTab" with a generic description. No preview image, no rich card. This is the most important marketing surface — every bill share is a marketing impression.

10. **"TidyTab" branding is everywhere but the URL.** The app lives at `chipin-sepia.vercel.app`. This is a branding gap — the URL says "chipin" but the app says "TidyTab." Custom domain is needed.

---

## Part 2: Design Critique

### Visual Identity: 6/10

The warm amber/orange palette is the right instinct — it differentiates from cold fintech blue. Space Grotesk is a great font choice with genuine personality. But the execution is safe:

**What's missing:**

- **No logo.** The "🧾 TidyTab" wordmark with an emoji is charming for an MVP but won't scale. There's no favicon beyond a generic one, no brand mark that could appear on a share card or sticker.

- **No visual texture or depth.** The homepage has a `warm-hero-gradient` and `noise-texture` overlay, but at 3.5% opacity it's nearly invisible. The overall feel is "flat cream rectangle with white cards." Compare to Linear (dynamic gradients), Cash App (bold color blocking), or even Notion (subtle shadows and depth). TidyTab needs at least one signature visual element.

- **The three step cards on the homepage are indistinguishable from every other SaaS.** Rounded rectangles with icons, titles, and descriptions. The numbered badges are a nice touch but don't save the layout from being forgettable.

- **No illustration, no photography, no visual storytelling.** The entire app is text + icons. There's not a single image, illustration, or visual that conveys "friends splitting dinner." The about page talks about "the awkward 'who had the fish' moment" — where's the visual representation of that moment?

### Typography: 7/10

Space Grotesk is excellent — distinctive, modern, friendly. But it's underutilized:

- The hero headline is `text-5xl sm:text-7xl font-extrabold` — that's bold but not bold enough. The most impactful landing pages use extreme scale (120px+ headlines). At `text-7xl` (~72px), it's just... big.

- There's no typographic contrast. Everything is Space Grotesk at similar weights. The design brief mentions "extreme weight contrast (200 vs 800)" but this isn't implemented. A thin-weight subheadline paired with the extrabold headline would create dramatic hierarchy.

- Body copy is all `text-sm` or `text-base` — functional but monotonous.

### Color: 7/10

The amber/orange palette works. The warm cream background (`#FFF8F0`) is pleasant. But:

- **The success green (`#2ECC71`)** feels detached from the warm palette. A warmer green (like `#34D399` or `#4ADE80`) would blend better.

- **The lavender (`#A29BFE`)** appears on Zelle-related elements but feels random. If it's a brand color, use it more consistently; if not, drop it.

- **The primary gradient (`from-primary to-accent`)** on the CTA button is nice but appears on too many elements (CTA, share button, progress bar), diluting its impact.

### Spacing & Layout: 7/10

Generally good — consistent `max-w-2xl` content width, comfortable padding. But:

- The bill view page is a long vertical scroll with no visual landmarks. It's card → card → card → card. There's no rhythm or breathing room.

- The homepage has awkward spacing: hero text → CTA → cards → footer. The cards feel disconnected from the hero because of the large `mt-12` gap with nothing between.

### Mobile Experience: 7.5/10

It works — `min-h-svh`, responsive text sizes, touch-friendly buttons. The `active:scale-[0.98]` on buttons adds tactile feedback. But:

- The nav bar on mobile shows "Dashboard" and "Create Bill" side by side with small text — it feels cramped.
- The step indicator on `/new` hides labels on mobile (`hidden sm:inline`) but the numbered dots are hard to parse at a glance.
- The payment buttons (Venmo/Zelle/CashApp) grid on mobile could be larger — they're only `p-3` with `text-xs` labels.

### Animations & Micro-interactions: 8/10

This is the strongest design element. The CSS animations are thoughtful:

- `springIn` for card entrance with staggered delays
- `scaleFadeIn` for mode switches
- `popIn` for success states
- The animated SVG checkmark on payment confirmation
- `progress-bar-fill` with smooth transitions
- The shimmer on the progress bar while filling

**But:** These are mostly entrance animations. There are very few *interactive* animations — button hover states are minimal, there's no item claim animation, and the mode-switching between claim/split/custom is instantaneous rather than crossfading.

---

## Part 3: Code Quality Review

### Architecture: 8/10

**Strengths:**
- Clean separation: server components for data fetching (`page.tsx`), client components for interactivity (`bill-view.tsx`, `dashboard-view.tsx`)
- Proper use of Next.js 15+ App Router patterns (async params, server-side metadata generation)
- Supabase client separation: browser client (`supabase.ts`), SSR client (`supabase/server.ts`), middleware client (`supabase/middleware.ts`)
- The `LinkButton` component with `useTransition` for client-side navigation with loading states is elegant

**Weaknesses:**
- `src/lib/supabase.ts` exports a `createServerClient()` that uses the **service role key** — this bypasses all RLS policies. It's used everywhere (API routes, badges, etc.). This is a significant security concern because it means all API-route database access has admin privileges. Should use per-request auth context where possible.
- No error boundary components anywhere. If a client component throws, the entire page crashes.
- The `bill-view.tsx` file is **450+ lines** — a monolithic component that handles all three chip-in modes, payment links, real-time subscriptions, confetti, share functionality, and contribution display. It should be decomposed.

### Error Handling: 6/10

- API routes have try/catch with generic error responses — adequate but not great
- Client-side errors often fail silently (`catch {}`, `catch(() => {})`)
- The contribution submission catches errors but just sets `isSubmitting` to false without informing the user
- No toast notification system — errors appear as banner divs that require manual dismissal
- No retry logic for failed API calls or Supabase subscription disconnects

### TypeScript: 7/10

- Types are defined in `types.ts` — clean and comprehensive
- Some `any` holes: `(bill as unknown as { host_streak?: number })` is a type escape hatch
- Good use of TypeScript for props interfaces
- Missing explicit return types on most functions

### Accessibility: 5/10

**Problems:**
- No `aria-label` on icon-only buttons (the trash icon, share icon, copy icon)
- The item claiming flow uses `<div onClick>` instead of `<button>` — not keyboard accessible
- No skip-to-content link
- No `role="alert"` or `aria-live` on error messages (the error banners won't be announced by screen readers)
- The step progress indicator uses visual-only cues (color) to indicate state
- Payment method selection uses `<button>` but no `aria-pressed` or radio group pattern
- Form labels use `<label>` with text blocks — but no `htmlFor` on several labels (they rely on structure rather than explicit association)

### Performance: 7/10

**Good:**
- No heavy animation libraries (pure CSS + `canvas-confetti`)
- Font loaded via `next/font/google` with variable CSS (optimal)
- `contain: layout style` on sticky headers
- Skeleton loading states on all pages
- The `CountUp` component uses `requestAnimationFrame` properly

**Concerns:**
- Receipt images (`bill.receipt_image_url`) are rendered with `<img>` not `next/image` — no lazy loading, no size optimization, no blur placeholder. These are user-uploaded photos that could be 5MB+.
- No `loading="lazy"` on the receipt image `<details>` expand
- The `canvas-confetti` library is imported eagerly even on pages that might never use it
- The `bill-view.tsx` imports all Lucide icons individually but they're tree-shaken so this is fine
- `profiles` table is fetched on every page where user is logged in — no caching

---

## Part 4: Security Audit

### 🔴 Critical Issues

1. **Service role key used in client-accessible contexts.** `createServerClient()` in `src/lib/supabase.ts` uses `SUPABASE_SERVICE_ROLE_KEY` and is used in API routes. While this runs server-side, it means ALL database operations in API routes bypass RLS. If any API route has an injection vulnerability, the entire database is exposed. The API routes should prefer the per-user auth context where possible and use admin client only when necessary (like the dashboard fetch).

2. **Host key exposed in dashboard page.** In `dashboard-view.tsx`, the "Manage" button renders `href={/b/${bill.slug}/manage?key=${bill.host_key}}` — this means the full bill data including `host_key` is passed from server component to client component. While this is intentional (the dashboard is auth-protected), the `host_key` appears in the HTML source of the dashboard page. If the user has any browser extension that reads page content, it could leak.

3. **No CSRF protection on mutation endpoints.** The `/api/bills` POST, `/api/bills/[slug]/contribute` POST, and `/api/bills/[slug]` PATCH routes accept JSON POST/PATCH without any CSRF token. In theory, a malicious page could submit contributions to someone else's bill.

4. **`.env.local` contains live API keys.** The file at `.env.local` has production Supabase service role key, OpenAI API key, Resend API key, and CRON_SECRET in plaintext. While `.env*` is in `.gitignore`, this file exists on the local filesystem. If this repo was accidentally pushed to a public repo, all credentials would be exposed.

### 🟡 Medium Issues

5. **The GET `/api/bills/[slug]` endpoint returns `host_key` to authorized callers.** When `isHostAuthorized` is true, the response includes `{ ...bill, isHostAuthorized: true }` — this sends `host_key` in the API response. Anyone who intercepts this response (proxy, browser devtools, extension) gets the management key.

6. **No input sanitization on `person_name`.** The contribution name is stored as-is and rendered in email templates. While React auto-escapes in JSX, the email HTML templates use string interpolation (`${p.personName}`) which is vulnerable to HTML injection in emails.

7. **Rate limiting is in-memory only.** Vercel serverless functions spin up multiple instances. Each instance has its own rate limit map. An attacker could simply make requests fast enough to hit different instances, effectively bypassing rate limiting. The code acknowledges this ("For production at scale, swap with Upstash Redis").

8. **Unsubscribe endpoint uses `host_key` as token.** The `/api/bills/[slug]/unsubscribe?token=<host_key>` route uses the host_key as the unsubscribe token. This means the unsubscribe link in emails contains the host management key. If someone forwards the reminder email, the recipient gets the host key.

9. **No validation on contribution amounts.** A user could submit a negative contribution or an astronomically large one. The API only checks `if (!person_name || !amount)` — it doesn't validate that amount is a positive, reasonable number.

10. **Badges endpoint is public.** `GET /api/badges?email=anyone@email.com` returns all badges for any email. This leaks information about who has used the app and their activity patterns.

### 🟢 Fixed Since Last Audit

- The GET endpoint previously leaked `host_key` to all callers — now it strips sensitive fields for non-host callers ✅
- Rate limiting was added to expensive endpoints ✅
- The RLS policies allow broader read access now but the API handles authorization ✅

---

## Part 5: Product Review

### Feature Gaps vs. Competitors

| Feature | TidyTab | Splitwise | Tab | Tricount |
|---------|---------|-----------|-----|----------|
| No app download | ✅ | ❌ | ❌ | ❌ |
| No signup for contributors | ✅ | ❌ | ✅ | ✅ |
| Receipt OCR | ✅ (free) | ✅ ($5/mo) | ✅ | ❌ |
| Item claiming | ✅ | ❌ | ✅ | ❌ |
| Payment deep links | ✅ | ❌ | Venmo only | ❌ |
| Real-time updates | ✅ | ❌ | ❌ | ❌ |
| Group/trip tracking | ❌ | ✅ | ❌ | ✅ |
| Recurring splits | ❌ | ✅ | ❌ | ❌ |
| Multi-currency | ❌ | ✅ ($) | ❌ | ✅ |
| Offline mode | ❌ | ❌ | ❌ | ✅ |
| PWA / installable | ❌ | N/A (native) | N/A | N/A |
| Social share cards | ❌ | ✅ | ❌ | ❌ |
| Tip/tax per-person calc | ✅ | ❌ | ✅ | ❌ |

**Critical gaps:**
1. **No group/favorites.** Can't save "Thursday Haas Crew" and reuse it. Every bill is a standalone entity.
2. **No spending history.** No way to see "how much have I spent dining with friends this semester."
3. **No rich share cards.** The OG meta doesn't include an image. Share links in iMessage look plain.
4. **No PWA manifest.** Can't install to home screen.
5. **No "who owes who" optimization.** When a group has complex debts, there's no way to simplify (e.g., "Alex pays Sarah directly instead of through the host").

### User Flow Friction Points

1. **Cold open friction:** New user lands on homepage → clicks "Create a Bill" → sees upload UI with no context about what happens next. There's no "here's what your bill will look like" preview.

2. **Receipt parsing wait:** After uploading, the user sees "AI is reading your receipt..." with a spinner. No humor, no progress indication, no estimated time. The DELIGHT-RESEARCH.md suggested humor here ("Reading your sommelier's handwriting...") but it wasn't implemented.

3. **Details step overload:** Step 3 has two cards (Basic Info + Payment Methods) with 7 input fields. On mobile, this is a lot of scrolling. The email field's explanation text differs based on auth state — good attention to detail but the step could be streamlined.

4. **Contributor cold open:** Someone receives a link → opens it → sees a bill page with no explanation of TidyTab, no trust indicators, no "how this works." They're expected to trust this random web page with their name and payment action.

5. **Post-payment uncertainty:** After tapping "I've Paid," there's a success card that says "Thanks for chipping in!" — but the contributor has no way to verify their contribution was recorded, no receipt/confirmation email, no "share with others" prompt.

---

## Part 6: Bold Redesign Vision

Terry said he's not afraid of a complete redesign. Here's what I'd propose:

### The "Linear of Bill Splitting" Vision

The goal: make TidyTab feel like Linear, Arc, or Raycast — a tool so well-crafted that people use it as a flex. Not "I use this bill-splitting app" but "have you SEEN this bill-splitting app?"

### 1. Homepage Redesign: "Show the Product"

**Kill the 3-step cards.** Everyone does this. Instead:

- **Hero:** Massive headline ("Your tab. Tidied." or "Split it. Forget it.") with the primary CTA
- **Below the fold:** An interactive product demo. Show an actual bill being split in real-time. Use a mock bill with animated contributions appearing, the progress bar filling, confetti at the end. Let people SEE the product before they use it.
- **Social proof:** Not just "Trusted by 500+ MBA students" — show actual numbers. "$127,000 split across 1,400 dinners." Make the numbers big and bold.
- **Comparison callout:** "Splitwise charges $5/month for receipt scanning. We do it for free." Direct, confident.

### 2. Bill View Redesign: "The Contributor IS the Customer"

The bill view page is seen by 8x more people than any other page. It should be the best page on the internet for "see what I owe, pay it, done."

**Proposed layout (top to bottom on mobile):**

1. **Trust bar** (8px): TidyTab branding + "Secure bill splitting" micro-copy
2. **Hero card** (200px): Restaurant name, date, host name, total amount — big and beautiful
3. **Your share callout** (120px): If person_count exists, show split amount prominently in a warm gradient card with a prominent "Pay Now" CTA right here
4. **Quick payment buttons** (80px): Venmo / Zelle / CashApp — big colorful buttons, one tap
5. **"Or choose your share"** toggle: Expandable section for claim dishes / custom amount
6. **Progress + contributors** (expandable): Who's paid, progress bar
7. **Items** (expandable): The receipt details

**Key changes:**
- Move the primary payment action ABOVE the fold — within 300px of landing
- Default to "Split Evenly" with the big gradient CTA, not a modal choice
- Make the first-time contributor flow 3 taps: open link → tap "Pay $XX via Venmo" → tap "I've Paid" (keep the name entry but make it inline)

### 3. Visual Identity Upgrade

**Custom logo:** Commission a simple logomark — a receipt with a "✓" or a stylized fork/knife/receipt. Drop the 🧾 emoji.

**Signature visual element:** A subtle receipt-paper texture on the bill view page. Not gimmicky — just enough to subconsciously signal "this is a receipt." Think receipt paper's slightly warm, slightly textured feel.

**Color evolution:**
- Keep the amber/orange primary
- Add a deeper charcoal for text (current `#1A1A2E` is good)
- Introduce an unexpected accent for delight moments — a bright coral or electric violet for confetti, badges, celebrations
- Consider a subtle animated gradient on the hero (like Linear's homepage) — slow, organic, warm

**Typography upgrade:**
- Use Space Grotesk at extreme weights: 300 for body, 800 for headlines
- Hero headline: 96px+ on desktop, 48px on mobile
- Use font-feature-settings for tabular numbers on currency amounts (prevents layout shifts)

### 4. "Wow Factor" Ideas

These are features/design elements that would make people screenshot and share:

**a) "Split-o-graphic" Share Card**
After a bill is fully settled, generate a beautiful social card:
```
┌──────────────────────────────────┐
│ 🎉 Dinner at Nobu               │
│ 8 friends · $847 total           │
│ Settled in 12 minutes            │
│                                  │
│ ████████████████████ 100%        │
│                                  │
│ Split with TidyTab · tidytab.app │
└──────────────────────────────────┘
```
Shareable to Instagram Stories, iMessage, WhatsApp. Every share is free marketing.

**b) "Who's Next" Rotation**
Track who paid last across bills. Show "🎯 It's Sarah's turn to pick up the check" at the top of the group. Gamifies fairness, creates recurring usage.

**c) Receipt Fortune**
After scanning a receipt, show a fun fact: "🍕 You ordered 14 items. Your group spent $23/person. That's 4.6 burritos at Chipotle." Make the mundane delightful.

**d) Streak Animations**
When a host reaches a streak milestone (5, 10, 25, 50 bills), trigger a special animation on their dashboard — a badge unlocking animation like Duolingo.

**e) "I Only Had a Salad" Mode**
A tongue-in-cheek way to handle the fairest split. When someone clicks "Claim my dishes" and their total is significantly less than the even split, show a playful message: "Smart choice! You're saving $12.50 compared to splitting evenly 🥗"

**f) One-Tap Share with Preview Card**
When the host taps "Share," pre-generate a rich link preview card with the restaurant name, total, and number of people. Make it beautiful in iMessage/WhatsApp. This requires proper OG image generation (dynamic OG images via Vercel's `@vercel/og`).

---

## Part 7: Prioritized Improvements

### 🔴 P0 — Do Immediately (Security + Critical UX)

1. **Fix input sanitization in email templates.** Escape HTML in `personName`, `hostName`, `restaurantName` before interpolating into email HTML strings. XSS in emails is a real vector.

2. **Validate contribution amounts.** Add server-side validation: `amount > 0 && amount <= bill.total * 2` (allow some overflow for tips but prevent absurd values).

3. **Add CSRF protection** or at minimum verify `Origin`/`Referer` headers on mutation endpoints.

4. **Move contributor payment action above the fold.** The single biggest UX improvement. Show the split amount + payment button within 300px of page load on the bill view.

5. **Add a custom domain.** `tidytab.app` is claimed per the contact email. Point it to the Vercel deployment.

### 🟡 P1 — Do This Month (Product + Design)

6. **Generate dynamic OG images** for bill share links using `@vercel/og`. Include restaurant name, total, host name, and progress. This alone could improve the viral coefficient significantly.

7. **Add an interactive product demo on the homepage.** Show a mock bill splitting in action. This replaces the 3-step cards with actual product proof.

8. **Add a "first time?" micro-tutorial on the bill view.** A dismissible tooltip that says "Welcome! [Host name] shared this bill with you. Choose how to pay below." — for first-time TidyTab users.

9. **Decompose `bill-view.tsx`.** Split into `BillHeader`, `ProgressCard`, `ChipInSection`, `PaymentActions`, `ContributionsList`, `ItemsList`. Each < 100 lines. Improves maintainability and enables independent testing.

10. **Add error boundaries.** Wrap main page content in error boundaries with friendly fallback UIs.

11. **Use `next/image` for receipt photos.** Add lazy loading, blur placeholders, and size optimization.

12. **Add PWA manifest and service worker.** Let users install TidyTab to their home screen. This is the lowest-friction path to "app-like" without the app store.

### 🟢 P2 — Do This Quarter (Growth + Polish)

13. **Social share card generation** ("Split-o-graphic") — generate a beautiful PNG summary card when a bill is fully settled.

14. **"Who's Next" rotation** — track who's hosted across a group, suggest whose turn it is.

15. **Spending insights** — "Your group has spent $3,200 together this semester."

16. **Animated loading messages** during receipt parsing ("Deciphering your server's handwriting...", "Counting appetizers...", "Almost there...").

17. **Sound effects** (opt-in) — cash register "cha-ching" on payment, confetti sound on settlement.

18. **Keyboard shortcuts** — for power users (hosts managing multiple bills).

19. **Group favorites** — save frequently-used groups for quick re-splits.

20. **Export to CSV/PDF** — for expense reports and record-keeping.

---

## Part 8: Technical Debt

1. **Duplicate Supabase client patterns.** There are 3 different ways to create a Supabase client: `src/lib/supabase.ts` (browser + admin), `src/lib/supabase/client.ts` (browser SSR), `src/lib/supabase/server.ts` (server + admin). Consolidate to 2: browser client and server client.

2. **Inconsistent `font-[family-name:var(--font-main)]`** appears on almost every heading. This should be in the base CSS on `h1-h6` (which it already is) rather than repeated inline.

3. **No testing.** Zero test files. For a product handling money-adjacent operations, at minimum: unit tests for `calculateProportionalPrice`, `generateVenmoLink`, `rateLimit`; integration tests for the bill creation and contribution flows.

4. **README says "Next.js 16"** but `package.json` says `16.1.6`. The SPEC says "Next.js 15". Keep docs accurate.

5. **The `profiles` table** is referenced in code but not in any SQL migration file. It was presumably created manually.

6. **Email templates are raw HTML strings** with React components exported but unused. The `ContributionNotificationEmail` React component exists but `renderContributionNotification` uses manual HTML string concatenation. Pick one approach.

---

## Final Verdict

**TidyTab is a 7/10 product trying to become a 10/10.** The foundation is solid — the architecture, the core flow, the strategic thinking are all there. What's missing is the *magic* — the design personality, the unexpected delight, the visual confidence that makes someone say "this is special."

The biggest lever for growth isn't a new feature — it's making the bill view page so good that every contributor thinks "I want to use this next time I pay." That's the viral loop. That's the 10/10.

Terry has the right instincts. The design brief and delight research show someone who understands what "great" looks like. Now it's about executing that vision with courage — not just polishing what exists, but being willing to throw out the safe choices and make bold ones.

The app works. Now make it *unforgettable.*

---

*Review completed February 6, 2026 by Pedro*
