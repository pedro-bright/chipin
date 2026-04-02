# TidyTab — Master Testing Report

**Date:** 2026-02-07  
**Method:** 4 parallel Opus agents doing live browser testing at tidytab.app  
**Viewport:** 390px primary (mobile-first), 320px & 1280px secondary  

---

## Executive Summary

TidyTab's **core happy path is solid** — homepage is beautiful, bill creation works, contributor flow is well-designed with excellent copy and UX touches (prompt payer badges, "claim your dishes", progressive disclosure). The app earns its B+ grade.

However, testing uncovered **18 bugs across 4 severity levels**, with the most critical being a broken auth flow that blocks all authenticated features (groups, dashboard, balances). Several validation gaps and navigation quirks would hurt real-world usage.

**Verdict:** Fix the 5 blockers below before putting this in front of the MBA cohort.

---

## 🔴 CRITICAL (1) — Blocks core functionality

### C1: Magic link auth doesn't persist session
**Source:** Groups, Dashboard reports  
**What:** After clicking the magic link email, tokens arrive in the URL hash but the Supabase PKCE session isn't stored in cookies before the client-side router navigates away. Users can't access dashboard, groups, or any authenticated features.  
**Also:** A `%0A` (newline) in `NEXT_PUBLIC_SUPABASE_ANON_KEY` causes repeated WebSocket auth failures in the console.  
**Impact:** Groups, dashboard, balances, settle-up — ALL blocked.  
**Fix:** Debug the auth callback route; ensure `supabase.auth.exchangeCodeForSession()` completes before any redirect. Strip trailing newline from env var.

---

## 🔴 HIGH (5) — Serious UX/data issues

### H1: Can proceed through bill wizard with zero items
**Source:** Bill Creation report  
**What:** Clicking "Continue" on Step 2 with no items added proceeds to Step 3. Users can publish empty bills.  
**Fix:** Validate `items.length > 0` before allowing Continue. Show toast: "Add at least one item."

### H2: Stale state persists on /new
**Source:** Bill Creation report  
**What:** Items from a previously created bill reappear when visiting /new again. No "start fresh" mechanism.  
**Fix:** Clear bill creation state on mount when no draft flag is set. Or show "Resume draft?" prompt.

### H3: Auto-redirect away from /new after bill creation
**Source:** Bill Creation report  
**What:** After creating a bill, revisiting /new auto-redirects to the last created bill view after ~5-10 seconds.  
**Fix:** Remove the auto-redirect. The `?created=true` param should only apply once.

### H4: /b/[invalid-slug] shows bill creation page instead of 404
**Source:** Dashboard, Contributor reports  
**What:** Invalid bill URLs silently show the bill creation form or redirect to dashboard. No "bill not found" error.  
**Fix:** Add proper error handling in the bill page — if Supabase returns null for the slug, render a "Bill not found" page (similar to the existing `/g/` not-found page).

### H5: Groups feature is completely undiscoverable
**Source:** Groups report  
**What:** No public-facing group creation page exists. `/groups/new` redirects to `/new` (bill creation). The feature is only accessible after auth → dashboard → "New Group" button. New users have zero visibility.  
**Fix:** Add groups to the homepage value prop. Consider `/g/new` as a creation route. Add "Create a Group" link in the nav or homepage.

---

## 🟡 MEDIUM (8) — UX friction, edge cases

### M1: Overpayment allowed
**Source:** Contributor report  
**What:** Custom amount of $100 accepted when only $40.87 remains. No warning.  
**Fix:** Validate `amount <= remaining`. Show warning if exceeding.

### M2: Expired magic link shows no error
**Source:** Dashboard report  
**What:** Invalid/expired tokens silently redirect with no user-facing message.  
**Fix:** Check for `error` param in auth callback, show "Link expired — request a new one."

### M3: PWA install prompt overlaps form at 320px
**Source:** Dashboard report  
**What:** Floating PWA prompt covers subtotal/tax fields on iPhone SE.  
**Fix:** Delay prompt until after bill creation completes, or reposition to top.

### M4: Service worker caches stale pages
**Source:** Groups report  
**What:** Navigating to dynamic routes sometimes shows cached/wrong content.  
**Fix:** Exclude `/g/`, `/b/`, `/dashboard` from SW cache, or use network-first strategy for HTML.

### M5: "Review Items" heading misleading for manual entry
**Source:** Bill Creation report  
**What:** When entering manually, Step 2 says "Review Items" — but there's nothing to review yet.  
**Fix:** Conditional heading: "Add Your Items" for manual entry, "Review Items" for receipt upload.

### M6: No validation on empty item names
**Source:** Bill Creation report  
**What:** Items with blank names can be saved and published.  
**Fix:** Filter out items with empty names on submit, or require names.

### M7: Magic link URL broken in plaintext email
**Source:** Groups report  
**What:** The `=` sign after `?token` is missing in the text/plain email body.  
**Fix:** Fix email template plaintext rendering.

### M8: "Not you?" link missing on return visits
**Source:** Contributor report  
**What:** The identity reset link only appears immediately after payment, not when returning.  
**Fix:** Show "Not [Name]?" whenever the "You're all set!" state is displayed.

---

## 🟢 LOW (4) — Polish items

### L1: 404 page is unstyled default Next.js
**Source:** Dashboard report  
**Fix:** Custom 404 matching app design (already done for `/g/` routes — extend to global).

### L2: Dark mode not implemented
**Source:** Dashboard report  
**Notes:** Only 2 CSS rules reference `.dark`. Low priority for launch but noted.

### L3: No max length on contributor name
**Source:** Contributor report  
**What:** 89+ character names accepted. Could break layout.  
**Fix:** `maxLength={50}` on input.

### L4: `/api/user-groups` returns `[]` instead of 401
**Source:** Groups report  
**Fix:** Return 401 for unauthenticated requests.

---

## ✅ What Works Great

| Area | Assessment |
|------|-----------|
| **Homepage** | Beautiful. Compelling copy, animated demo card, clear value props. |
| **Bill creation wizard** | Intuitive 3-step flow. Tab toggle at 48px tap targets. Tip presets. |
| **Bill view** | Payment above fold. Clear per-person split. Welcome banner for new visitors. |
| **Contributor flow** | Progressive disclosure (buttons appear after name). Flexible payment modes. |
| **Success state** | "You're all set!" with confetti. Prompt payer ⚡ badge. "YOU" badge. |
| **Item claiming** | "Claim my dishes" is a great differentiator. |
| **Copy & voice** | Warm, personal, fun. "Skip the drama." "Be the hero who goes first." |
| **Error pages** | `/g/[invalid]` has a polished custom 404. |
| **Footer** | Correct: "Built by Terry with love ♥️ for MBA cohorts who eat out too much 🎓" |
| **Branding** | Lowercase "tidytab" (bold "tidy" + colored "tab"). Consistent. |
| **320px responsive** | No horizontal scroll. Touch targets adequate. |
| **Fonts** | Space Grotesk with `display: swap`. No FOIT. |
| **Email deliverability** | Magic links arrive in <10s. DKIM/SPF/DMARC pass. |

---

## Priority Fix List (for MBA cohort launch)

### Must fix (this weekend)
1. **C1** — Auth flow + env var newline (blocks groups entirely)
2. **H1** — Empty bill validation
3. **H2** — Clear stale state on /new
4. **H3** — Remove auto-redirect from /new
5. **H4** — Bill not found page

### Should fix
6. **M1** — Overpayment validation
7. **M8** — "Not you?" on return visits
8. **M5** — Conditional Step 2 heading
9. **M6** — Empty item name validation
10. **L1** — Custom global 404 page

### Nice to have
11. **H5** — Groups discoverability
12. **M3** — PWA prompt positioning
13. **M4** — Service worker caching strategy
14. **M2** — Expired magic link error message
15. **L3** — Name max length

---

## Detailed Reports

- [Bill Creation Flow](TESTING-BILL-CREATION.md)
- [Contributor & Payment Flow](TESTING-CONTRIBUTOR-FLOW.md)
- [Groups & Balances](TESTING-GROUPS.md)
- [Dashboard, Nav & Polish](TESTING-DASHBOARD-NAV.md)
