# TidyTab Fixes Report — Feb 7, 2026

**Deployed to:** https://tidytab.app  
**All 7 fixes shipped.** Build clean, zero errors.

---

## Fix 1: "All settled up!" misleading message ✅
**File:** `src/app/g/[slug]/group-view.tsx`

**Problem:** The "All settled up!" check only looked at `transfers.length === 0`, which can be true even when members have outstanding balances (e.g., host is owed money but no debtors are tracked yet).

**Fix:** Changed `allSettled` to also verify ALL `netBalances` are near-zero (`Math.abs(v) < 0.01`). Added a new `hasOutstandingBalances` state that renders a proper balance breakdown showing who's owed what, instead of the misleading "All settled up!" message.

---

## Fix 2: Middleware `?code=` robustness ✅
**File:** `src/lib/supabase/middleware.ts`

**Problem:** Middleware caught ALL URLs with `?code=` and redirected to auth callback, with a fragile exception for group join pages.

**Fix:** Removed the group join exception since invite links don't use `?code=` at all (they use path-based `/g/{slug}/join`). Cleaned up comments to clarify that `?code=` is exclusively for Supabase auth. The middleware now also preserves the original path as the redirect target instead of always going to `/dashboard`.

---

## Fix 3: Auto-link bills by email ✅
**Files:** `src/app/api/auth/callback/route.ts`, `src/app/dashboard/page.tsx`

**Problem:** Bills created before signup didn't appear on dashboard immediately.

**Fix:** Dashboard already had email-based querying + auto-linking (was implemented previously). Added **immediate auto-linking on login** in the auth callback — as soon as the user's session is established, any bills matching their email are linked to their `user_id`. This means bills show up on the very first dashboard load after signup, not just after a refresh.

---

## Fix 4: Receipt upload vs manual entry — tab toggle ✅
**File:** `src/app/new/page.tsx`

**Problem:** "Enter items by hand" was a small text link below the fold, making manual entry feel second-class.

**Fix:** Added a prominent tab toggle at the top of step 1 with two equal options: "📷 Upload Receipt" and "✏️ Enter Manually". Tabs are big (≥48px min-height), tappable, and visually balanced using the same `bg-muted` rounded pill pattern used elsewhere in the app. The old text link is removed. Page title changed from "Upload Your Receipt" to "Add Your Bill" to be neutral.

---

## Fix 5: Confirmation before deleting contributions ✅
**File:** `src/app/b/[slug]/manage/page.tsx`

**Problem:** Native `window.confirm()` was ugly and jarring.

**Fix:** Replaced with a proper in-app confirmation dialog (bottom sheet on mobile, centered modal on desktop). Shows the person's name and amount clearly: "Remove Alex's $25.00 contribution? This can't be undone." with Cancel/Remove buttons. Delete button touch target also bumped to 44px minimum.

---

## Fix 6: Search discoverability ✅
**Files:** `src/app/dashboard/dashboard-view.tsx`, `src/components/keyboard-shortcuts.tsx`

**Problem:** ⌘K search worked but was invisible to users.

**Fix:** Added a visible search button in the dashboard header (magnifying glass icon on mobile, "Search ⌘K" with keyboard shortcut hint on desktop). The button triggers the same command palette as ⌘K. Exported an `openSearch()` function from the keyboard shortcuts component for external triggers. Removed the old hidden desktop-only hint text.

---

## Fix 7: "Not you?" link near pre-filled name ✅
**File:** `src/components/bill/chip-in-section.tsx`

**Problem:** Name persists in localStorage. Second person on same device sees wrong name pre-filled.

**Fix:** Added a "Not [FirstName]?" link that appears next to the "Your Name" label whenever a name is pre-filled. Clicking it clears both the input field and the localStorage entry (`tidytab_person_name`), letting the new person type their own name. Uses first name only for brevity.
