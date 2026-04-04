# tidyTab (chipin)

Group bill-splitting web app built for Terry's MBA cohort at UC Berkeley. "The Linear of bill splitting."

## Quick Start

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

Required env vars (set in `.env.local` and Vercel):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase client (bypasses RLS)
- `AZURE_GPT52_API_KEY` — Azure OpenAI key for GPT-5.4 / GPT-5.4-pro receipt parsing
- `NEXT_PUBLIC_APP_URL` — Canonical app URL (https://tidytab.app)
- Resend API key for transactional emails

## Architecture

**Stack:** Next.js 16.2.0 (App Router) + React 19 + Supabase (Postgres + Storage + Realtime) + Tailwind v4 + shadcn-style UI + Azure OpenAI (GPT-5.4 Vision) + Vercel

**Key patterns:**
- App Router with Server Components for pages, `'use client'` for interactive views
- API routes use `createServerClient()` (service role key, bypasses RLS)
- Browser uses anon key client (`@supabase/ssr` for auth session middleware)
- No heavy auth wall — name-only entry for contributors; optional Supabase Auth for hosts (dashboard, email notifications)
- Host gets a secret `host_key` (nanoid 24) in the manage URL for bill management
- Bill slugs are nanoid(6), e.g. `/b/aB3xYz`
- CSRF protection via Origin/Referer header checking (`src/lib/csrf.ts`)
- Edge-level rate limiting in middleware + per-route rate limiting in API handlers (`src/lib/rate-limit.ts`)

## Project Structure

```
src/
  app/
    page.tsx                    # Homepage (hero, how-it-works)
    layout.tsx                  # Root layout (Space Grotesk + Newsreader fonts, footer, PWA)
    new/page.tsx                # Bill creation wizard (upload -> review -> details -> publish)
    b/[slug]/                   # Bill view (public), manage page (host_key gated)
    g/[slug]/                   # Group view, balances, join page
    groups/new/page.tsx         # Create group
    dashboard/                  # Host dashboard (auth-gated)
    login/page.tsx              # Supabase Auth login
    about/page.tsx              # About page
    api/
      bills/                    # CRUD for bills
      bills/[slug]/contribute/  # POST contribution, PATCH to confirm pending
      bills/[slug]/claim/       # Item claiming
      bills/[slug]/unsubscribe/ # Email unsubscribe
      groups/                   # Groups CRUD, join, settle, balances
      parse-receipt/            # GPT-5.4 Vision receipt OCR
      upload/                   # Supabase Storage upload (HEIC->JPEG conversion)
      og/                       # Dynamic OG image generation
      badges/                   # User badge system
      profile/                  # User profile
      cron/reminders/           # Daily payment reminder emails (Vercel Cron, 10am UTC)
  components/
    bill/                       # Bill display: header, items list, progress, chip-in section, contributions
    payment/                    # Payment flow: PreFlightConfirm -> PaymentFlow -> RecoveryBottomSheet -> PaymentStatus
    ui/                         # Primitives: button, card, input, badge, progress, skeleton, etc.
    nav.tsx                     # Navigation bar
    pwa-install-prompt.tsx      # PWA install banner
    sw-register.tsx             # Service worker registration
  hooks/
    usePaymentState.ts          # Payment state machine (idle -> intent_captured -> external_app_opened -> recovery_pending -> confirmed_paid)
    usePaymentRecovery.ts       # Multi-signal return detection (visibility, focus, etc.)
    usePaymentPersistence.ts    # LocalStorage + server sync for payment state
  lib/
    supabase.ts                 # Client (anon) + server (service role) Supabase clients
    supabase/client.ts          # Browser SSR client
    supabase/server.ts          # Server-side auth client
    supabase/middleware.ts      # Session refresh middleware
    types.ts                    # TypeScript interfaces (Bill, BillItem, Contribution, Group, etc.)
    utils.ts                    # cn(), formatCurrency(), Venmo/CashApp/PayPal link generators, handle sanitizers
    receipt-urls.ts             # Multi-receipt URL encoding (JSON array in single text column)
    csrf.ts                     # CSRF Origin/Referer validation
    rate-limit.ts               # In-memory per-IP rate limiting
    badges.ts                   # Badge awarding logic
    balances.ts                 # Group balance calculations
    confetti.ts                 # canvas-confetti celebration effects
    emails/                     # Resend email templates (contribution notification, bill covered, reminders, group bills)
  middleware.ts                 # Edge middleware: rate limiting for /api/*, Supabase session for pages
```

## Database Schema (Supabase Postgres)

**Tables:**
- `bills` — id (uuid), slug (unique), host_key, host_name, restaurant_name, receipt_image_url (text, may contain JSON array for multi-receipt), subtotal/tax/tip/total (numeric), venmo_handle, zelle_info, cashapp_handle, paypal_handle, default_mode (claim|split|custom), status (draft|published|settled), host_email, host_user_id, email_notifications, group_id
- `bill_items` — id, bill_id (FK), name, price, quantity, sort_order, shared_by (number of people sharing)
- `contributions` — id, bill_id (FK), person_name, amount, payment_method, claimed_item_ids (uuid[]), note (null | '[pending]' | '[cancelled]' | user text)
- `bill_attendees` — id, bill_id (FK), group_member_id, member_name, expected_amount
- `groups` — id, name, emoji, slug, invite_code, created_by
- `group_members` — id, group_id, name, email, venmo/zelle/cashapp/paypal handles, preferred_payment, role (admin|member)
- `settlements` — id, group_id, from_name, to_name, amount, settled_at
- `user_badges` — id, user_email, badge_type, badge_data, earned_at

**Storage:** `receipts` bucket (public read, anyone can upload)

**Realtime:** Enabled on `contributions` and `bills` tables.

**RLS:** Enabled but permissive (public read, anyone can insert/update). Server client uses service role key to bypass RLS.

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/bills` | Create bill + items + attendees |
| GET/PATCH/DELETE | `/api/bills/[slug]` | Read/update/delete bill |
| POST/PATCH | `/api/bills/[slug]/contribute` | Add contribution (POST), update pending (PATCH) |
| POST | `/api/bills/[slug]/claim` | Claim items |
| GET | `/api/bills/[slug]/unsubscribe` | Unsubscribe from email notifications |
| POST/GET | `/api/groups` | Create/list groups |
| GET/PATCH/DELETE | `/api/groups/[slug]` | Group CRUD |
| POST | `/api/groups/[slug]/join` | Join group |
| GET | `/api/groups/[slug]/balances` | Calculate group balances |
| POST | `/api/groups/[slug]/settle` | Record settlement |
| PATCH/DELETE | `/api/groups/[slug]/members/[id]` | Update/remove member |
| POST | `/api/parse-receipt` | GPT-5.4 Vision receipt OCR |
| POST | `/api/upload` | Upload image to Supabase Storage |
| GET | `/api/og` | Dynamic OG image (JSX) |
| GET | `/api/cron/reminders` | Daily payment reminder cron |
| GET | `/api/badges` | User badges |
| GET/PATCH | `/api/profile` | User profile |
| GET | `/api/user-groups` | Groups for logged-in user |

## Receipt Parsing

**Primary model:** GPT-5.4 (Azure, `gpt-5.4` deployment) via OpenAI SDK  
**Escalation model:** GPT-5.4-pro (Azure, `gpt-5.4-pro` deployment) — used when `enhance=true` or validation fails badly

**Flow:**
1. Image upload -> HEIC/HEIF detection -> convert to JPEG via `heic-convert` (fallback: `sharp`)
2. Base64 data URL sent to GPT-5.4 Vision with detailed system prompt
3. Model returns JSON: restaurant, items[], subtotal, tax, tip, total, confidence, orientation, receiptPrintedTotal/Subtotal
4. Normalize: convert line totals to unit prices for qty>1 items
5. Validate: cross-check item sum vs receipt-printed totals, item count ratios, confidence scores
6. If validation fails or orientation != normal: auto-rotate 180 degrees via `sharp`, retry with GPT-5.4, pick better result
7. If still failing badly (>35% discrepancy): flag `needsEscalation`, frontend offers "Enhanced Scan" button which calls GPT-5.4-pro
8. Frontend shows confidence + warnings to user

**Gotchas:**
- HEIC is iPhone's default photo format. The upload route AND parse-receipt route both handle HEIC->JPEG conversion.
- `sharp` is used for image rotation and as a fallback converter.
- Max file size: 10MB.
- The system prompt is extremely detailed about orientation detection, SKU vs quantity disambiguation, and cross-validation.

## Payment Flow

**Philosophy:** Honor system. No payment API integration. Deep links open native payment apps.

**Intent-First Flow** (see `src/components/payment/`):
1. User taps "Pay $X" -> `PreFlightConfirm` overlay shows amount + method
2. User confirms -> `captureIntent()` saves to state machine, opens payment app via deep link
3. State: `idle -> intent_captured -> external_app_opened -> recovery_pending`
4. User returns to app -> `usePaymentRecovery` detects via visibility/focus events -> shows `RecoveryBottomSheet`
5. User taps "I've paid" -> POST to `/api/bills/[slug]/contribute` -> confetti celebration
6. User taps "Not yet" -> `still_pending` state

**Pending contributions:** When user confirms intent (step 2), a `[pending]` contribution is created server-side. On "I've paid", it's updated. On "Not yet", it stays pending. Duplicate pending contributions for same person are deduplicated.

**Deep link formats:**
- **Venmo:** `https://venmo.com/{HANDLE}?txn=pay&amount={X}&note={Y}&audience=private` — MUST use this format, audience=private prevents posting to feed
- **CashApp:** `https://cash.app/${HANDLE}/{AMOUNT}`
- **PayPal:** `https://www.paypal.com/paypalme/{HANDLE}/{AMOUNT}USD`
- **Zelle:** NO universal deep link. Uses copy-to-clipboard UX (copy amount + recipient info, user opens their bank app manually)

**Handle sanitization:** `sanitizeVenmoHandle()`, `sanitizeCashAppHandle()`, `sanitizePayPalHandle()` strip URLs, prefixes (@, $), etc. from user input.

## Design System

**Aesthetic:** "The Linear of bill splitting" — warm, premium, dark-mode-ready

**Fonts:**
- **Space Grotesk** (`--font-main`): Primary font for headings and body
- **Newsreader** (`--font-newsreader`, `--font-serif`): Serif accent for italic flourishes (footer tagline, etc.)

**Core Colors (light mode):**
- Background: `#FFFBF5` (warm cream)
- Foreground/Charcoal: `#0F0F12`
- Primary: `#E67E22` (warm amber/orange)
- Accent: `#F59E0B` (golden amber)
- Destructive/Coral: `#FF6154` (electric coral)
- Success: `#34D399` (warm emerald)
- Lavender: `#A29BFE`
- Border: `#ece5d8`
- Cards: white with subtle borders

**Visual signatures:**
- `receipt-texture` class: subtle horizontal line pattern simulating receipt paper
- `dot-grid` class: Linear-inspired dot pattern background
- `gradient-mesh`: gradient backgrounds on hero
- `mockup-card`: floating card with subtle shadow
- Confetti celebration on contribution (canvas-confetti)
- CTAs use `cta-primary` class with gradient from primary to accent + glow animation

**UI components:** shadcn-style in `src/components/ui/` — Button, Card, Input, Badge, Progress, Skeleton, LinkButton, AnimatedCheck, CountUp

## Multi-Receipt Support

Multiple receipt images stored as JSON array string in `receipt_image_url` text column (no migration needed):
- Single receipt: plain URL string `"https://..."`
- Multiple receipts: JSON array `'["https://...url1","https://...url2"]'`
- Detection: if value starts with `[`, parse as JSON array
- Helpers: `getReceiptUrls(bill)` and `encodeReceiptUrls(urls)` in `src/lib/receipt-urls.ts`

## Deployment

- **Hosting:** Vercel (project name: "chipin")
- **Live URL:** https://chipin-sepia.vercel.app (canonical: https://tidytab.app)
- **Database:** Supabase (hosted Postgres)
- **Storage:** Supabase Storage (`receipts` bucket, public)
- **Email:** Resend
- **Cron:** Vercel Cron — daily payment reminders at 10am UTC (`vercel.json`)
- **PWA:** Service worker (`public/sw.js`), manifest (`public/manifest.json`), install prompt
- **Analytics:** Vercel Analytics (`@vercel/analytics`)
- **OG Images:** Dynamic via `/api/og` route (ImageResponse JSX)
- **GitHub:** `pedro-bright/chipin` (created Apr 1, 2026) — pushes to `origin main`

## Conventions and Gotchas

1. **HEIC conversion is critical.** iPhone photos default to HEIC. Both `/api/upload` and `/api/parse-receipt` must handle conversion. Use `heic-convert` first, fall back to `sharp`.

2. **Venmo links MUST use `audience=private`** to prevent posting transactions to Venmo's social feed. Format: `https://venmo.com/HANDLE?txn=pay&amount=X&note=Y&audience=private`

3. **No universal Zelle deep link exists.** The app uses a copy-to-clipboard UX pattern instead.

4. **Contribution note field is overloaded.** `[pending]` = intent captured but not confirmed. `[cancelled]` = user cancelled. `null` or user text = confirmed payment. Filter accordingly when calculating totals.

5. **Multi-receipt URLs in a single text column.** Don't add a new column; use `receipt-urls.ts` helpers to encode/decode the JSON array format.

6. **Edge + application-level rate limiting.** Middleware handles edge rate limiting for all `/api/*` routes. Individual routes add their own stricter limits via `rateLimit()` from `src/lib/rate-limit.ts`.

7. **Server client vs browser client.** API routes use `createServerClient()` (service role, bypasses RLS). Pages and client components use the anon key client or the SSR auth client.

8. **Next.js 16 async params.** Route handlers and pages receive `params` and `searchParams` as Promises — must `await` them.

9. **Tabular numbers for currency.** Use `font-tnum` class on any element displaying dollar amounts for proper alignment.

10. **Email XSS.** The `src/lib/emails/escape-html.ts` module sanitizes user-provided strings before embedding in email HTML templates.

11. **Bill creation returns management URLs.** `POST /api/bills` returns `{ slug, host_key, url, manage_url }`. The `manage_url` contains the secret host_key.

12. **Footer tagline:** "Built by Terry with love ♥️ for MBA cohorts who eat out too much 🎓" — preserve this exact text.

13. **Payment handle sanitizers** in `utils.ts` strip common user mistakes: full URLs (`venmo.com/u/handle`), leading `@` or `$`, trailing amounts on PayPal links.

14. **Status: v3 DEPLOYED** — full redesign + security hardened + PWA. The codebase has extensive build session logs (`BUILD-SESSION-*.md`, `FIX-*.md`) documenting design decisions.
