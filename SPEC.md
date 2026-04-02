# ChipIn — Spec & Architecture

> Split group bills the chill way. Upload a receipt, share a link, let people chip in.

## Core Flow

```
Host uploads receipt → AI extracts items → Host reviews/edits → Publishes bill
→ Shares link → People open link → See items + remaining balance
→ Choose: claim dishes / pay average / pay custom amount
→ Tap Venmo/Zelle link → Mark "I paid" → Balance updates in real-time
```

## Pages

### 1. Landing `/`
- Hero: "Split bills without the awkwardness"
- One big CTA: "Create a Bill"
- Maybe show recent public stats (X bills split, $Y settled)

### 2. Create Bill `/new`
- Step 1: Upload receipt photo (drag-drop or camera)
- Step 2: AI extracts items → shows editable table
  - Each row: item name, price, quantity
  - Auto-detected: subtotal, tax, tip, total
  - Host can add/remove/edit any row
- Step 3: Bill details
  - Restaurant name (auto-detected or manual)
  - Host name
  - Number of people (optional, for avg calc)
  - Venmo handle (for deep links)
  - Zelle email/phone (optional)
  - CashApp tag (optional)
- Step 4: Preview → Publish → Get shareable link

### 3. Bill Page `/b/[slug]`  (THE MAIN PAGE)
- Header: Restaurant name, date, host name
- Receipt image (expandable)
- **Item list** with prices (tax+tip proportionally included)
- **Three ways to chip in:**
  - 🍽️ "Claim dishes" — tap items you had, auto-calculates your share (incl proportional tax+tip)
  - 👥 "Split evenly" — shows total ÷ number of people
  - 💰 "Custom amount" — enter whatever you want
- After choosing amount → shows payment buttons:
  - Venmo deep link (pre-filled amount + note)
  - Zelle instructions
  - Cash / other
- Enter your name → click "I Paid" → logs contribution
- **Live dashboard:**
  - Progress bar: $X of $Y covered (Z% remaining)
  - List of who paid what, when
  - Remaining balance prominently displayed
- All updates in real-time (Supabase Realtime)

### 4. Host Edit `/b/[slug]/manage?key=[hostKey]`
- Edit items, prices, totals
- See all contributions
- Mark contributions as verified/unverified
- Close the bill when settled
- Protected by a host key (generated at creation, no auth needed)

## Database Schema (Supabase Postgres)

```sql
-- Bills
CREATE TABLE bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  host_key text NOT NULL, -- secret key for host management
  host_name text NOT NULL,
  restaurant_name text,
  receipt_image_url text,
  subtotal numeric(10,2),
  tax numeric(10,2),
  tip numeric(10,2),
  total numeric(10,2),
  person_count int,
  venmo_handle text,
  zelle_info text,
  cashapp_handle text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'settled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bill line items
CREATE TABLE bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  quantity int DEFAULT 1,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Contributions (who paid what)
CREATE TABLE contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_method text DEFAULT 'venmo',
  claimed_item_ids uuid[] DEFAULT '{}',
  note text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bills_slug ON bills(slug);
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_contributions_bill_id ON contributions(bill_id);
```

### Row Level Security

```sql
-- Bills: anyone can read published bills, anyone can create
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published" ON bills FOR SELECT USING (status = 'published');
CREATE POLICY "Anyone can create" ON bills FOR INSERT WITH CHECK (true);
CREATE POLICY "Host can update" ON bills FOR UPDATE USING (true); -- checked via host_key in app

-- Bill items: public read, insert/update via app logic
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON bill_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert" ON bill_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update" ON bill_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete" ON bill_items FOR DELETE USING (true);

-- Contributions: public read, anyone can insert
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON contributions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert" ON contributions FOR INSERT WITH CHECK (true);
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (Postgres)
- **Real-time:** Supabase Realtime (subscriptions on contributions table)
- **Receipt OCR:** OpenAI GPT-4o Vision (via API route)
- **Image storage:** Supabase Storage (receipt photos)
- **Deployment:** Vercel
- **Payment links:** Venmo/Zelle/CashApp deep links (no payment API)

## API Routes

### `POST /api/parse-receipt`
- Input: image file
- Process: Send to GPT-4o Vision with structured extraction prompt
- Output: `{ restaurant, items: [{name, price, qty}], subtotal, tax, tip, total }`

### `POST /api/bills`
- Create a new bill (returns bill + host_key)

### `PATCH /api/bills/[slug]`
- Update bill (requires host_key)

### `POST /api/bills/[slug]/contribute`
- Add a contribution (name, amount, method, claimed items)

## Payment Deep Links

### Venmo
```
Mobile: venmo://paycharge?txn=pay&recipients=HANDLE&amount=AMOUNT&note=NOTE
Web: https://venmo.com/HANDLE?txn=pay&amount=AMOUNT&note=NOTE
```

### Zelle
No universal deep link. Show: "Send $X to [email/phone] via Zelle"

### CashApp
```
https://cash.app/$HANDLE/AMOUNT
```

## Slug Generation
- 6-char nanoid, URL-safe: `b/xK9mQ2`
- Short enough to text/share easily

## Mobile-First Design
- Primary use case: people opening the link on their phones at/after dinner
- Big tap targets for claiming dishes
- Easy one-tap payment links
- Progress bar prominent at top

## Future Ideas (not v1)
- Recurring group (same crew, different dinners)
- Settlement analytics
- WhatsApp/iMessage share buttons

---

# v2 — Host Accounts & Email Notifications

## Overview

Add lightweight host accounts (magic link email auth) so hosts can:
1. Access all their bills from any device
2. Get email notifications when someone chips in
3. Receive auto-reminders for open bills with outstanding balances

Design principle: **never add friction to the happy path.** Bill creation stays fast. Email is optional but unlocks superpowers.

## Auth: Magic Link (Passwordless)

Using **Supabase Auth** magic link — host enters email, gets a login link, no passwords.

### Flow: New Host
```
Host creates bill → enters email (optional) in details step
→ Bill created immediately (no email verification blocking)
→ If new email: Supabase creates auth user, sends magic link
→ Host clicks link → logged in → sees dashboard with their bill
```

### Flow: Returning Host
```
Host visits /dashboard → enters email → gets magic link
→ Clicks link → sees all their past bills
```

### Flow: Claiming Anonymous Bills
```
Host created a bill without email (v1 style) → visits /dashboard
→ "Claim a bill" → enters slug + host_key → bill linked to their account
```

### Key Decisions
- **Email is optional at creation.** Anonymous bills still work exactly like v1. Zero friction for one-off users.
- **No passwords.** Magic link only. Fits the casual vibe.
- **Session persistence.** Supabase Auth session stored in cookies. Stays logged in across tabs/visits.
- **Auto-link.** If a host creates a new bill while logged in, it's automatically linked to their account.

## Database Changes

```sql
-- Add columns to bills table
ALTER TABLE bills
  ADD COLUMN host_email text,
  ADD COLUMN host_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN email_notifications boolean DEFAULT true,
  ADD COLUMN last_reminder_sent_at timestamptz;

-- Index for dashboard queries
CREATE INDEX idx_bills_host_user_id ON bills(host_user_id);
CREATE INDEX idx_bills_host_email ON bills(host_email);

-- Update RLS: hosts can read all their own bills
CREATE POLICY "Hosts read own bills"
  ON bills FOR SELECT
  USING (auth.uid() = host_user_id OR status = 'published');
```

No new tables needed — Supabase Auth handles users via `auth.users`.

## Pages

### 5. Dashboard `/dashboard`
- **Auth required** (redirect to `/login` if not authenticated)
- **Tabs:** Active | Settled | All
- **Bill cards** showing:
  - Restaurant name, date
  - Total amount, amount collected, % progress
  - Number of contributors
  - Status badge (open / fully covered / settled)
- **Quick actions per bill:**
  - 📤 Share link
  - 🔔 Send reminder to self (re-share prompt)
  - ✅ Mark as settled
  - ⚙️ Manage (goes to `/b/[slug]/manage`)
- **Summary stats at top:**
  - Total bills created
  - Total $ collected across all bills
  - Average settlement rate

### 6. Login `/login`
- Clean, simple page
- Email input → "Send magic link" button
- Success message: "Check your email! Click the link to log in."
- After clicking magic link → redirect to `/dashboard`

### 7. Updated Bill Creation `/new`
- Step 3 (Details) adds:
  - **Email field** (optional): "Enter your email to track this bill and get notified when people pay"
  - Small text: "We'll send you a magic link — no password needed"
- If user is already logged in → email pre-filled, auto-linked

### 8. Updated Bill View `/b/[slug]`
- If logged-in user is the host → show "Manage" button (no host_key URL needed)
- Falls back to localStorage host_key check (current behavior)

## Email Notifications

### Provider: **Resend**
- Simple API, generous free tier (100 emails/day)
- Great Next.js/Vercel integration
- Beautiful transactional emails with React Email templates

### Trigger: Supabase Database Webhook → API Route

```
contributions INSERT → Supabase webhook → POST /api/webhooks/contribution
→ Look up bill + host email → Send notification via Resend
```

### Email: "Someone chipped in!" 🎉
```
Subject: {person_name} chipped in ${amount} for {restaurant_name}!

Hey {host_name},

{person_name} just chipped in ${amount} for your {restaurant_name} bill.

💰 Collected so far: ${total_paid} of ${total} ({percent}%)
📊 {remaining == 0 ? "Fully covered! 🎉" : "${remaining} still outstanding"}
👥 {contributor_count} people have chipped in

[View Bill →]  [Manage Bill →]

—
ChipIn · Built by Terry with love ♥️
```

### Email: "Bill fully covered!" 🎉🎉
- Sent when remaining hits $0
- Celebratory tone, summary of all contributors
- Prompt to mark as settled

## Payment Reminders

### Trigger: Vercel Cron Job

```
vercel.json:
{
  "crons": [{
    "path": "/api/cron/reminders",
    "schedule": "0 10 * * *"   // Daily at 10 AM UTC
  }]
}
```

### Logic: `GET /api/cron/reminders`
```
1. Query bills WHERE:
   - status = 'published'
   - host_email IS NOT NULL
   - email_notifications = true
   - total > (SELECT COALESCE(SUM(amount), 0) FROM contributions WHERE bill_id = bills.id)
   - created_at < now() - interval '2 days'
   - (last_reminder_sent_at IS NULL OR last_reminder_sent_at < now() - interval '3 days')

2. For each bill:
   - Send reminder email to host
   - UPDATE bills SET last_reminder_sent_at = now()

3. Stop reminding after 30 days (stale bill cutoff)
```

### Email: "Your bill still has an open balance"
```
Subject: ${restaurant_name} — ${remaining} still outstanding

Hey {host_name},

Your {restaurant_name} bill from {date} still has ${remaining} outstanding.

💰 ${total_paid} of ${total} collected ({percent}%)
👥 {contributor_count} people have chipped in so far

Maybe re-share the link with your group?

[Share Bill Link →]  [Mark as Settled →]

—
Tip: Reply "stop" or visit your dashboard to turn off reminders.
ChipIn · Built by Terry with love ♥️
```

### Reminder Cadence
| Days since creation | Reminder frequency |
|---|---|
| 2-7 days | Every 3 days |
| 7-14 days | Every 5 days |
| 14-30 days | Every 7 days |
| 30+ days | Stop reminding |

## API Routes (New)

### `POST /api/auth/magic-link`
- Input: `{ email }`
- Calls `supabase.auth.signInWithOtp({ email })`
- Returns success message

### `GET /api/auth/callback`
- Supabase Auth callback handler
- Exchanges code for session
- Redirects to `/dashboard`

### `POST /api/webhooks/contribution`
- Called by Supabase database webhook on `contributions` INSERT
- Looks up bill → host email
- Sends notification email via Resend
- Sends "fully covered" email if remaining = 0

### `GET /api/cron/reminders`
- Called by Vercel Cron (daily)
- Secured by `CRON_SECRET` env var
- Queries open bills, sends reminder emails, updates `last_reminder_sent_at`

### `POST /api/bills/[slug]/claim`
- Input: `{ host_key }`
- Links anonymous bill to authenticated user
- Requires valid auth session

## Environment Variables (New)

```
RESEND_API_KEY=re_...
CRON_SECRET=... (for Vercel cron auth)
NEXT_PUBLIC_APP_URL=https://chipin-sepia.vercel.app
```

## Migration Path (v1 → v2)

1. **Zero breaking changes.** All existing bills continue working.
2. **New columns are nullable.** `host_email`, `host_user_id`, `last_reminder_sent_at` all default to NULL.
3. **Anonymous bill creation still works.** Email field is optional.
4. **Existing hosts can claim bills** via slug + host_key on the dashboard.
5. **localStorage fallback stays.** host_key in localStorage still works for manage access.

## Implementation Order

1. **Phase 1: Auth + Dashboard** (~2hrs)
   - Supabase Auth magic link setup
   - Login page
   - Dashboard page with bill list
   - Update bill creation to optionally link email
   - Update bill view to check auth for manage access

2. **Phase 2: Email Notifications** (~1hr)
   - Set up Resend
   - Create email templates (React Email)
   - Database webhook for contribution notifications
   - "Fully covered" celebration email

3. **Phase 3: Reminders** (~1hr)
   - Vercel Cron job
   - Reminder logic with cadence rules
   - Unsubscribe/settings on dashboard
   - Stale bill cutoff

Total estimate: ~4 hours of build time.
