# Groups Feature — Phase 1 Build Log

**Date:** 2026-02-07
**Builder:** Pedro (subagent)
**Status:** ✅ Deployed to production

## What Was Built

### 1. Database Schema ✅
- **`groups` table** — id, name, emoji, slug, invite_code, created_by, timestamps
- **`group_members` table** — id, group_id, name, email, payment handles, preferred_payment, role, joined_at
  - Unique constraint on (group_id, name) to prevent duplicate names
- **`bills.group_id`** — new column linking bills to groups (nullable, ON DELETE SET NULL)
- **Indexes** — on slug, invite_code, group_id, group_members.group_id
- **RLS** — enabled with public read/write policies (service role handles auth logic)

### 2. API Routes ✅
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/groups` | POST | Create group + add creator as admin |
| `/api/groups/[slug]` | GET | Get group with members and bills |
| `/api/groups/[slug]` | PATCH | Update group name/emoji |
| `/api/groups/[slug]/join` | POST | Join group (with duplicate name check) |
| `/api/groups/[slug]/members/[id]` | DELETE | Remove member |
| `/api/groups/[slug]/members/[id]` | PATCH | Update member payment info |
| `/api/user-groups` | GET | Get all groups for the logged-in user |

All routes follow existing patterns: CSRF check, rate limiting, input validation.

### 3. Pages ✅
- **`/g/[slug]`** — Group home page
  - Group emoji + name header
  - Stats: members, bills, total spent
  - Invite People button (native share on mobile, clipboard fallback)
  - Members list with deterministic color avatars + admin crown icon
  - Bills history with progress bars
  - New Bill button (pre-links to group)
  
- **`/g/[slug]/join`** — Join page
  - Welcoming landing with emoji, group name, member avatars
  - Name + email form
  - Payment method tabs (Venmo / Zelle / CashApp)
  - Success animation → redirect to group home
  
- **`/groups/new`** — Create group form
  - Group name + emoji picker (16 options)
  - Creator info (name, email, payment methods)
  - Auto-fills from user profile if logged in
  - Creates group + adds creator as admin

- **`/g/[slug]/not-found.tsx`** — 404 page for invalid group slugs

### 4. Dashboard Integration ✅
- Groups section added to dashboard (between stats and bill tabs)
- Shows all groups user belongs to (matched by email)
- Each group card: emoji, name, member count, bill count
- "New Group" button + empty state with CTA
- "Create Your First Group" prompt for users with no groups

### 5. Bill Creation Integration ✅
- Optional group selector in "Details" step of new bill flow
- Shows user's groups as selectable chips
- When group selected, shows member names for reference
- `group_id` sent to POST /api/bills and stored in DB
- URL parameter support: `/new?group=slug` pre-selects the group

## Technical Details

### Slug Generation
Groups use `nanoid(8).toLowerCase()` for slugs (same pattern as bills but 8 chars)

### Invite Codes
Auto-generated 16-char hex via `encode(gen_random_bytes(8), 'hex')` in Postgres

### Member Avatars
Deterministic colors from a name hash function:
- 15 color options (rose through pink via the rainbow)
- `nameToColor(name)` → consistent color per name across sessions
- Initials extracted from first letter of each word

### Design
- Follows existing TidyTab design language (warm amber/coral on light/dark backgrounds)
- Mobile-first (390px)
- Dark mode compatible (uses CSS variables)
- Touch targets ≥44px
- Glass header, card-interactive hover states, animate-spring-in transitions

## Files Changed/Created

### New Files
- `src/app/api/groups/route.ts`
- `src/app/api/groups/[slug]/route.ts`
- `src/app/api/groups/[slug]/join/route.ts`
- `src/app/api/groups/[slug]/members/[id]/route.ts`
- `src/app/api/user-groups/route.ts`
- `src/app/g/[slug]/page.tsx`
- `src/app/g/[slug]/group-view.tsx`
- `src/app/g/[slug]/join/page.tsx`
- `src/app/g/[slug]/join/join-view.tsx`
- `src/app/g/[slug]/not-found.tsx`
- `src/app/groups/new/page.tsx`

### Modified Files
- `src/lib/types.ts` — added Group, GroupMember, GroupWithMembers types
- `src/app/dashboard/page.tsx` — added groups fetch logic
- `src/app/dashboard/dashboard-view.tsx` — added groups section
- `src/app/api/bills/route.ts` — added group_id support
- `src/app/new/page.tsx` — added group selector and member suggestions

## Phase 2 TODO
- Balance computation engine (min-cash-flow algorithm)
- `/g/[slug]/balances` page
- "Settle up" flow
- Group deletion (admin only)
- Member role management
- Activity feed on group home
