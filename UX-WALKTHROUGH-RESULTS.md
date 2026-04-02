# TidyTab UX Walkthrough Results

**Date:** 2026-02-07  
**Tester:** Pedro (AI assistant)  
**Viewport:** 390px (iPhone 14), also tested at 320px (iPhone SE)  
**URL:** https://chipin-sepia.vercel.app

---

## Flow A: Host Creates a Bill ✅

### Step 1: Homepage
- **✅ Delightful:** Clean hero section, compelling copy ("Split the bill. Skip the drama."), fake receipt preview adds personality
- **✅ Clear CTA:** "Create a Bill — it's free" button is prominent, orange gradient
- **✅ Trust signals:** "Loved by MBA cohorts & friend groups", feature badges (AI scan, No app, Free)
- **✅ How-it-works:** 3-step explainer with animated mock UIs is engaging

### Step 2: Receipt Upload (Step 1 of wizard)
- **✅ Good:** Upload area is large and tappable, supports drag & drop
- **✅ Skip option:** "No receipt? Enter items by hand" link is prominent
- **✅ Format support shown:** JPG, PNG, HEIC, WebP badges reassure users

### Step 3: Review Items (Step 2 of wizard)
- **✅ Add Item** and **Add Receipt** buttons side by side — flexibility
- **✅ Live subtotal** updates as items are entered
- **✅ Tip shortcuts** (15%, 18%, 20%, 25%) appear when items exist — saves mental math
- **✅ Total** is bold and prominent

### Step 4: Final Details (Step 3 of wizard)
- **✅ Smart defaults:** Event name placeholder includes date ("Dinner at Nobu — Feb 7")
- **✅ Tip text:** "Tip: adding the date helps people remember which dinner this was"
- **✅ Payment methods:** Venmo, Zelle, CashApp all supported
- **✅ Bill summary card** at bottom shows total before publishing
- **✅ "Publish & Share"** button is clear, rocket emoji adds energy

### Step 5: Bill Created
- **✅ Confetti animation** on creation — delightful!
- **✅ Share prompt** is immediate and prominent: "Your bill is live! Drop this link in the group chat"
- **✅ One-tap share** uses Web Share API

---

## Flow B: Contributor Views & Pays ⚠️

### First Impression
- **✅ Amount is immediately clear:** "YOUR SHARE $11.83" hero card is bold
- **✅ Context:** "$47.30 split 4 ways · scroll down to pay ↓" — user knows what's happening
- **✅ Trust banner** for first-time visitors: "Hey! Welcome to TidyTab"

### Pay Your Share Section
- **✅ Three modes:** Split evenly (default), Claim my dishes, Custom amount
- **✅ Claim mode:** Items have checkboxes, tax/tip added proportionally — smart
- **✅ Venmo deep link** opens app directly
- **✅ Manual "I've Paid"** button as fallback

### Issues Found & Fixed
- **🔧 FIXED: Hero amount disagreed with claim mode.** The "YOUR SHARE" hero card showed $11.83 (even split) even when user claimed items totaling $31.75. Now dynamically updates to show the active selection.
- **⚠️ Minor: PWA install prompt** overlaps the "Your Name" input on first load (after 3+ visits). Position is `fixed bottom-4`, which can temporarily obscure the payment section. Acceptable since it has a dismiss button and only shows to repeat visitors.

---

## Flow C: Host Manages Bill ✅

### Dashboard
- Requires magic link login — appropriate security
- Clean login page with "No account? One will be created automatically" reassurance

### Manage Page
- **✅ Summary card:** Total/Paid/Remaining at top in bold
- **✅ Edit details:** Restaurant name, payment handles, status
- **✅ Record a Payment:** Manual payment entry with name, amount, method — essential feature
- **✅ Contributions list:** Shows who's paid (empty state is clear: "No contributions yet")
- **✅ Share section:** URL with Copy button
- **✅ "Back to Bill"** link in header

---

## Flow D: Edge Cases

### 320px Viewport (iPhone SE)
- **✅ No layout breaks.** Title wraps naturally, buttons remain full-width
- **✅ "Claim my dishes" and "Custom amount"** labels break to two lines gracefully
- **✅ Touch targets** are all ≥44px

### Other Edge Cases
- Empty bill (no items): "No items to claim — try the custom amount option instead" fallback ✅
- Long restaurant names: CSS truncation/wrapping handles well ✅

---

## Phase 2: validate() Function Fix

### Problem
The `validate()` function compared parsed item sum against the model's self-reported subtotal/total. When the model is confidently wrong (misses items, hallucinates prices), both the items AND the self-reported total are wrong in the same way — all self-consistency checks pass.

### Fix Applied
1. **New prompt fields:** `receiptPrintedTotal` and `receiptPrintedSubtotal` — the model must report the EXACT numbers printed on the receipt as separate fields
2. **Cross-validation:** Item sum is compared against `receiptPrintedSubtotal` (or `receiptPrintedTotal` as fallback) instead of the model's own subtotal
3. **Escalation flag:** If mismatch > 35%, `needsEscalation` is set — frontend can show stronger warnings
4. **Model self-consistency check:** The model's reported subtotal is also compared against receipt-printed subtotal to detect hallucination
5. **`visibleLineCount`:** New field for independently estimating whether items were missed (if receipt has 30+ visible lines but only 3 items parsed, something's wrong)
6. **Legacy fallback:** When receipt-printed values aren't available, falls back to the old self-consistency check

### Thresholds
| Check | Threshold | Action |
|-------|-----------|--------|
| Items vs receipt printed subtotal | >10% | Warning |
| Items vs receipt printed total | >20% | Warning + retry |
| Items vs receipt printed total | >35% | Escalation flag |
| Receipt total > 2× item sum | — | Retry + escalation |
| Model subtotal vs receipt subtotal | >10% | Warning + retry |

---

## Phase 3: Other Fixes

### CSRF Protection ✅ (Already in place)
All mutation endpoints have `checkCsrf()`:
- `POST /api/bills` — create bill
- `PATCH /api/bills/[slug]` — update bill
- `POST /api/bills/[slug]/contribute` — add contribution
- `POST /api/bills/[slug]/claim` — claim items
- `POST /api/profile` — update profile
- `POST /api/parse-receipt` — parse receipt
- `POST /api/upload` — upload file

The unsubscribe endpoint uses token-based auth (host_key) which is sufficient.

### bill-view.tsx Decomposition ✅ (Already done)
Components already extracted to `src/components/bill/`:
- `BillHeader` — nav with manage/dashboard links
- `ProgressCard` — remaining amount, progress bar, contribution count
- `ChipInSection` — payment mode selection, claim flow, payment links
- `ContributionsList` — who's paid, with real-time updates
- `ItemsList` — expandable item breakdown with proportional pricing
- `TrustBanner` — first-time visitor welcome

`bill-view.tsx` is ~300 lines (orchestrator only), not 900+.

---

## What Delights 🎉
1. Confetti on bill creation and full settlement
2. "Waiting for the first hero..." empty state with ⚡ badge teaser
3. Random success messages ("Legend move!", "Nailed it!", "Smooth operator!")
4. Real-time contribution updates via Supabase realtime
5. Host streak badges (🔥 3×)
6. Tip shortcut buttons that auto-calculate
7. Web Share API integration

## What Could Be Better 🔮
1. ~~Hero amount doesn't update when switching payment modes~~ **FIXED**
2. PWA prompt timing could be delayed when user is in payment flow
3. Desktop experience could benefit from side-by-side layout (bill + payment)
4. Consider adding a "Share via text" button alongside the generic share
5. Add item search/filter for receipts with 15+ items
