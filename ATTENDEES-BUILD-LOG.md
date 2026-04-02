# Attendees Architecture — Build Log

**Date:** 2026-02-07
**Builder:** Pedro (subagent)
**Status:** ✅ Deployed to production (tidytab.app)

## The Problem

TidyTab's group balance engine assumed contributions = obligations. If Alex pays $25 for a $100 dinner, the system knows Alex paid $25. But if Bob doesn't contribute at all, there's NO record he owes anything. The balance engine can't attribute unpaid amounts to specific people.

## The Solution: Attendees + Expected Shares

When creating a group bill, the host selects which group members were present ("attendees"). The system calculates expected shares (equal split). Contributions still work flexibly — pay what you want. The balance engine now knows: **what each person owes vs. what they actually paid**.

## Design Philosophy

### The Key Insight: Two Balance Modes

The balance engine now operates in two modes that coexist seamlessly:

**ATTENDEE MODE** (bills with attendees):
```
credit[host] += total          → host fronted the bill
debit[attendee] += expected    → each attendee owes their share
credit[contributor] += amount  → contributions pay off debt
```

**LEGACY MODE** (bills without attendees — backward compatible):
```
credit[host] += total          → host fronted the bill
debit[contributor] += amount   → contributions = what they owe
```

The fundamental shift: In attendee mode, contributions flip from being **debits** (obligations) to being **credits** (payments toward obligations). The obligations come from `expected_amount` on attendees instead.

### Verification Example

Terry hosts $100 dinner. 4 attendees ($25 each including Terry):
- Terry: credit=100 (hosted), debit=25 (his share) → **net=+75** (owed $75) ✅
- Alex: debit=25 (attendee) → **net=-25** (owes $25) ✅
- Alex contributes $25: credit=25, debit=25 → **net=0** ✅
- Bob doesn't pay: debit=25 → **net=-25** (still owes!) ✅ ← THIS is what was missing

### Edge Cases Handled

1. **Overpayment**: If someone pays MORE than their share, their net goes positive — they're owed money.
2. **Host not an attendee**: Unusual but works. Host gets full credit, no debit. Net = +total.
3. **Non-group bills**: No attendees, no changes. Completely backward compatible.
4. **Legacy group bills**: Bills created before this feature have no attendees → legacy mode.
5. **Rounding**: Equal splits are rounded to 2 decimal places per person.

## What Was Built

### 1. Database: `bill_attendees` Table ✅
```sql
CREATE TABLE bill_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  group_member_id UUID REFERENCES group_members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,     -- denormalized for display
  expected_amount DECIMAL(10,2), -- individual's share
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bill_id, group_member_id)
);
```
- Index on `bill_id` for fast lookups
- RLS enabled with permissive policy
- Migration saved: `supabase/migrations/v4_bill_attendees.sql`

### 2. Balance Engine Rewrite ✅
**File:** `src/lib/balances.ts`

Completely rewritten with dual-mode support:
- `BillData` interface now has optional `attendees?: AttendeeData[]`
- When attendees present: attendee expected_amounts are debits, contributions are credits
- When no attendees: original behavior (contributions are debits)
- Settlements, name normalization, debt simplification all preserved
- Same `computeBalances()` signature — drop-in replacement

### 3. Bill Creation API ✅
**File:** `src/app/api/bills/route.ts`

- Accepts `attendees: [{group_member_id, member_name, expected_amount}]`
- Validates and inserts into `bill_attendees` table
- Only processes attendees when `group_id` is present

### 4. Bill Fetch API ✅
**File:** `src/app/api/bills/[slug]/route.ts`

- Now includes `bill_attendees(*)` in the select query
- Attendees returned alongside items and contributions

### 5. Balances API ✅
**File:** `src/app/api/groups/[slug]/balances/route.ts`

- Fetches `bill_attendees(member_name, expected_amount)` with each bill
- Passes attendee data to balance engine
- Existing bills without attendees still compute correctly

### 6. User Groups API ✅
**File:** `src/app/api/user-groups/route.ts`

- Now returns `memberObjects: [{id, name}]` alongside `members: [name]`
- Member IDs needed for attendee selection in bill creation

### 7. Bill Creation UI — Attendee Selection ✅
**File:** `src/app/new/page.tsx`

When a group is selected in the Details step:
- Shows **"Who was there?"** section with group members as pill-style checkboxes
- All members checked by default
- Host member shown with "host" badge, can't be unchecked
- Live calculation: **"$24.50 each"** updates as people are toggled
- Split amount shown: "Split $98.00 between 4 people"
- Touch targets ≥44px, dark mode compatible
- Attendees sent with bill creation API call

### 8. Bill View — Attendee Status ✅
**File:** `src/app/b/[slug]/bill-view.tsx`

For group bills with attendees:
- **Attendee status card** showing each person with ✅ (paid) or ⏳ (pending)
- Each badge shows name + expected amount
- Host automatically shown as paid
- "3 of 5 paid" progress indicator
- Contributions matched to attendees by name (case-insensitive)

### 9. Chip-In Section — Attendee-Aware ✅
**File:** `src/components/bill/chip-in-section.tsx`

- Detects viewer's identity via `localStorage` name matching
- Shows personalized **"Alex's share"** instead of generic "Your share"
- Pre-fills with viewer's `expected_amount` instead of generic split
- "Pay My Share" button instead of "Split Evenly" for recognized attendees
- Auto-defaults to split mode when attendees exist
- Falls back to standard behavior for non-attendee viewers

### 10. Group Home — Auto-Updated ✅
**File:** `src/app/g/[slug]/page.tsx`

- Bills query now includes `bill_attendees(*)` 
- Balance API already uses new engine
- No additional UI changes needed — balances are now attendee-accurate

## Files Changed/Created

### New Files
- `supabase/migrations/v4_bill_attendees.sql` — Migration SQL
- `ATTENDEES-BUILD-LOG.md` — This file

### Modified Files
- `src/lib/types.ts` — Added `BillAttendee` interface, updated `BillWithItems`
- `src/lib/balances.ts` — Complete rewrite with dual-mode support
- `src/app/api/bills/route.ts` — Accept and store attendees
- `src/app/api/bills/[slug]/route.ts` — Return attendees in bill fetch
- `src/app/api/groups/[slug]/balances/route.ts` — Pass attendees to engine
- `src/app/api/user-groups/route.ts` — Return member IDs
- `src/app/new/page.tsx` — Attendee selection UI
- `src/app/b/[slug]/bill-view.tsx` — Attendee status display
- `src/app/g/[slug]/page.tsx` — Include attendees in bill query
- `src/components/bill/chip-in-section.tsx` — Attendee-aware chip-in

### Database
- Created `bill_attendees` table with index, RLS, and policy

## Architecture Diagram

```
Bill Creation Flow:
  /new → Details step → Group selected → "Who was there?" checkboxes
  → POST /api/bills (with attendees array)
  → bills + bill_attendees tables

Bill View Flow:
  /b/[slug] → GET /api/bills/[slug] (returns bill_attendees)
  → Shows attendee status: ✅ paid / ⏳ pending
  → Chip-in pre-filled with viewer's expected_amount

Balance Computation:
  GET /api/groups/[slug]/balances
  → Fetches bills + contributions + bill_attendees + settlements
  → computeBalances() with dual-mode engine
  → Returns net balances with attendee-attributed debts
```

## What's NOT in This Build (Future Enhancements)

1. **Custom per-attendee amounts** — Currently equal split only. The schema supports custom amounts (expected_amount per attendee), but the UI always calculates equal split.
2. **Edit attendees after creation** — Attendees are set at bill creation and can't be changed. A PATCH endpoint could be added.
3. **Delete/undo attendees** — No UI for removing attendees from existing bills.
4. **Attendee notifications** — No push/email when you're added as an attendee.
5. **Smart identity matching** — Currently matches by name in localStorage. Could use email/auth for stronger matching.
6. **Rounding penny adjustment** — When $100 / 3 = $33.33, the extra penny isn't assigned. Total expected may differ from bill total by a cent.

## Testing Notes

- ✅ TypeScript: `npx tsc --noEmit` — zero errors
- ✅ Build: `npx next build` — successful
- ✅ Deploy: `npx vercel --prod --yes` — live at tidytab.app
- ✅ Database: `bill_attendees` table queryable via Supabase client
- ✅ Backward compatible: Non-group bills and legacy group bills work unchanged
