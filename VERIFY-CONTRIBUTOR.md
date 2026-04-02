# Contributor Flow — Verification Report

**Date:** 2026-02-07  
**Test Bills:** `lANf8r` (3-person split), `ZylOBx` (overpay test)  
**Method:** Browser (openclaw profile) + API calls + source code review

---

## Test Results

### 1. Overpayment Warning (M1) — ✅ PASS

- Entered custom amount of $100 on a $34 bill
- **Amber warning appeared:** `⚠️ This is more than the remaining balance ($34.00). Are you sure?`
- Warning uses `text-amber-600` / `dark:text-amber-400` (amber/yellow styling)
- Payment form remains functional (soft warning, not blocking)
- Name field and payment method still visible below warning
- **API backend:** Allows up to 2x total ($68 for a $34 bill). Amounts >2x are hard-blocked (HTTP 400)

### 2. Name Max Length (L3) — ✅ PASS

- Name input has `maxLength={50}` attribute confirmed via DOM inspection
- Browser enforces the 50-character limit on user typing
- Source code: `<Input ... maxLength={50} />`

### 3. Chip In + Return Visit — ✅ PASS

- **Success state:** "You're all set!" with amount displayed and confetti
- **localStorage persistence:** After refresh, success state persists (`tidytab_contributed_{slug}` + `tidytab_person_name`)
- **"Not TestUser?" link (M8):** ✅ Visible below success state as `Not {firstName}?`
- **Reset on click:** Clicking "Not TestUser?" clears:
  - `localStorage.tidytab_person_name` → null
  - `localStorage.tidytab_contributed_{slug}` → null
  - Form resets to "Pay Your Share" with empty name field
  - User can contribute as someone else

### 4. Full Bill Lifecycle — ✅ PASS

- **Bill 1 (lANf8r):** TestUser ($11.33) + Alice ($11.33) + Bob ($11.34) = $34.00
  - Progress bar: 100% covered ✅
  - Completion state: 🎉 "All squared up!" banner ✅
  - Split summary card with contributor avatars ✅
  - "Who's Chipped In" list with all 3 contributors ✅
  - Prompt payer badges awarded ✅
- **Bill 2 (ZylOBx):** OverpayTest ($50.00) on $34 bill
  - Overpayment accepted (≤2x total) ✅
  - Shows "Fully covered!" / 100% / $50.00 paid ✅

---

## Summary

| Fix | ID | Status | Notes |
|-----|----|--------|-------|
| Overpayment warning | M1 | ✅ PASS | Amber warning, soft (non-blocking) |
| Name max length | L3 | ✅ PASS | maxLength=50 on input |
| Return visit persistence | — | ✅ PASS | localStorage working |
| "Not X?" identity switch | M8 | ✅ PASS | Clears localStorage, resets form |
| Full coverage completion | — | ✅ PASS | 🎉 banner, progress bar, summary |

**All 5 verification tests passed.** No remaining issues found.

---

### Note: Browser Stability Issue

The openclaw browser profile experienced persistent redirects from `/b/{slug}` to `/login` caused by stale Supabase auth cookies (PKCE code verifier error). Workaround: clear cookies via JS before each navigation. This is a browser testing environment issue, not a TidyTab bug. For future testing, ensure cookies are cleared before accessing bill pages.
