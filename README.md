# 🍕 ChipIn — Split Bills Without the Awkwardness

Upload a receipt, share a link, let people chip in. Built for MBA cohorts who eat out too much.

## Features

- **📸 AI Receipt Parsing** — Snap a photo, GPT-4o Vision extracts every line item
- **🍽️ Claim Dishes** — Tap the items you ordered, get your exact share (tax+tip included proportionally)
- **👥 Split Evenly** — Quick even-split for when nobody cares who ate what
- **💰 Custom Amount** — Enter whatever you want to pay
- **💙 One-Tap Payment Links** — Venmo, Zelle, CashApp deep links with pre-filled amounts
- **📊 Real-Time Progress** — Live contribution tracker via Supabase Realtime
- **🎉 Confetti** — Because settling a bill deserves celebration
- **📱 Mobile-First** — Designed for phones at the dinner table

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** + custom components
- **Supabase** (Postgres, Storage, Realtime)
- **OpenAI GPT-4o Vision** for receipt OCR
- **Vercel** for deployment

## Getting Started

### 1. Clone & Install

```bash
cd chipin
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

### 3. Database Setup

Run the SQL schema in `supabase-setup.sql` against your Supabase project:
- Creates `bills`, `bill_items`, and `contributions` tables
- Sets up Row Level Security policies
- Enables Realtime on contributions

Also create a **public** storage bucket named `receipts` in Supabase.

### 4. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy to Vercel

```bash
npx vercel
```

Set the same environment variables in your Vercel project settings.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero + CTA |
| `/new` | Multi-step bill creation (upload → AI parse → edit → publish) |
| `/b/[slug]` | Public bill view with 3 payment modes + real-time progress |
| `/b/[slug]/manage?key=[hostKey]` | Host dashboard (edit bill, view contributions) |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/parse-receipt` | Send receipt image → GPT-4o Vision → structured items |
| `POST` | `/api/bills` | Create bill + generate host_key + slug |
| `GET` | `/api/bills/[slug]` | Fetch bill with items + contributions |
| `PATCH` | `/api/bills/[slug]` | Update bill (host_key required) |
| `POST` | `/api/bills/[slug]/contribute` | Record a contribution |
| `POST` | `/api/upload` | Upload receipt image to Supabase Storage |

## How It Works

1. **Host** uploads a receipt photo (or enters items manually)
2. AI parses the receipt into line items with prices
3. Host reviews/edits items, adds payment info, publishes
4. Host gets a **share link** (`/b/xK9mQ2`) and a **management link**
5. **Friends** open the link, choose how to pay:
   - Claim specific dishes (proportional tax+tip)
   - Split evenly
   - Custom amount
6. One-tap payment link opens Venmo/CashApp/Zelle
7. After paying, mark "I Paid" → contribution appears in real-time
8. Progress bar fills up until the bill is covered 🎉
