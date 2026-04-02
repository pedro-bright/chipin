# TidyTab Groups — Architecture Spec

## Why Groups?
TidyTab today is a single-use tool: create bill → share → collect → done. There's no reason to come back unless you're hosting again. Groups transform TidyTab from a tool into a product with retention.

## Core Concept
A **Group** is a persistent collection of people who regularly split bills together.

Examples:
- "Berkeley MBA Friday Dinners"
- "Roommates — 742 Evergreen"
- "Work Lunch Crew"

## User Stories

### Host (Group Creator)
1. I create a group with a name and optional emoji
2. I get a shareable invite link (like Discord: `tidytab.app/g/berkeley-mba`)
3. I can see all bills in this group, total history, and running balances
4. When I create a new bill, I pick a group → members are auto-suggested
5. I can add/remove members and transfer admin role

### Member
1. I tap an invite link → enter my name + payment method → I'm in
2. I see all group bills (past + active)
3. I see my running balance ("You owe $24" or "You're owed $18")
4. I get notified when a new bill is posted to my group
5. My name + payment preference carry over to every new bill

### Balance Simplification
If A owes B $20 and B owes C $20, simplify to: A owes C $20.
Use minimum-cash-flow algorithm (well-known graph problem).

## Data Model

### `groups` table
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🍽️',
  slug TEXT UNIQUE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_by TEXT NOT NULL, -- email of creator
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `group_members` table
```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT, -- optional, for linking across bills
  venmo_handle TEXT,
  zelle_info TEXT,
  cashapp_handle TEXT,
  preferred_payment TEXT DEFAULT 'venmo',
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, name)
);
```

### `bills` table changes
```sql
ALTER TABLE bills ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX idx_bills_group_id ON bills(group_id);
```

### `group_balances` (materialized view or computed)
Running balances computed from all group bills' contributions:
- For each pair (A, B) in a group, net balance = sum of what A paid for B - sum of what B paid for A
- Simplified via min-cash-flow algorithm for display

## API Routes

### Groups CRUD
- `POST /api/groups` — Create group (name, emoji) → returns group with invite link
- `GET /api/groups/[slug]` — Get group details, members, bills
- `PATCH /api/groups/[slug]` — Update group (admin only)
- `DELETE /api/groups/[slug]` — Delete group (admin only)

### Membership
- `POST /api/groups/[slug]/join` — Join via invite (name, payment info)
- `DELETE /api/groups/[slug]/members/[id]` — Remove member (admin or self)
- `PATCH /api/groups/[slug]/members/[id]` — Update payment info

### Balances
- `GET /api/groups/[slug]/balances` — Computed running balances with simplification

### Bills (updated)
- `POST /api/bills` — Now accepts optional `group_id`
- `GET /api/groups/[slug]/bills` — All bills in a group

## Pages

### `/g/[slug]` — Group Home
- Group name + emoji header
- Members list with avatars (initials-based)
- **Running balances** — "You owe Sarah $24" / "Mike owes you $12"
- **Bill history** — Cards with date, restaurant, total, status
- **"New Bill" button** — Pre-fills group context
- **Invite link** — Share button

### `/g/[slug]/join` — Join Group
- Clean landing: group name, member count, recent activity
- Form: name, Venmo/Zelle/CashApp
- One tap → you're in → redirect to group home

### `/g/[slug]/balances` — Detailed Balances
- Full ledger view
- Simplified debts
- "Settle Up" flow — mark debts as resolved

### Dashboard updates
- Groups section above bills
- Each group shows: name, member count, your balance
- Bills within a group are nested under the group

## Balance Algorithm
```
// Minimum cash flow (greedy)
1. For each member, compute net balance across all group bills
   net[person] = totalPaidByPerson - totalOwedByPerson
2. Separate into creditors (net > 0) and debtors (net < 0)
3. Match largest debtor with largest creditor
4. Transfer min(|debt|, credit) from debtor to creditor
5. Remove settled parties, repeat until all balanced
```

This minimizes total transactions. A group of 8 with complex cross-debts reduces to at most 7 transfers.

## Implementation Phases

### Phase 1: Foundation (this session)
- DB schema (groups, group_members, bills.group_id)
- API routes (CRUD, join, member management)
- Group home page (`/g/[slug]`)
- Join page (`/g/[slug]/join`)
- Create group flow
- Link bills to groups

### Phase 2: Balances
- Balance computation engine
- Balance simplification algorithm
- Balances page
- "Settle up" flow

### Phase 3: Integration
- Dashboard groups section
- New bill flow picks group → auto-suggests members
- Group activity feed
- Invite via native share

### Phase 4: Notifications (later)
- Email notifications for new bills in group
- Balance reminders
- Weekly group summary

## Design Notes
- Group pages follow same design language (warm amber, dark charcoal)
- Member avatars: colored circles with initials (deterministic color from name hash)
- Balance indicators: green = you're owed, red/orange = you owe
- Group invite page should feel welcoming, not transactional
- Mobile-first: group home should show balance + latest bill above fold

## Open Questions for Terry
1. Should groups require email to join? (Enables cross-bill identity but adds friction)
2. Max group size? (Suggest 50)
3. Can a bill belong to multiple groups? (Suggest no — keeps it simple)
4. Should we show individual item claims in balance calculation, or just total contributions?
