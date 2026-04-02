# Bill Creation Validation Fixes

**Date:** 2026-02-07  
**File:** `src/app/new/page.tsx`  
**Deployed:** https://tidytab.app

## Bugs Fixed

### H1: Can proceed with zero items ✅
- Added `handleContinueToDetails()` function that validates before proceeding from Step 2 → Step 3
- Auto-removes completely empty items (no name AND no price)
- Requires at least one item with a non-empty name and price > 0
- Shows error message if validation fails
- Replaced direct `setStep('details')` on Continue button with validation handler
- Removed `disabled` prop — button is always clickable but validates on click (better UX)

### H2: Stale state persists on /new ✅
- Added mount-time `useEffect` that resets all bill creation state (items, totals, restaurant name, receipt data, etc.) to defaults on fresh component mount — prevents Next.js router cache from preserving stale state
- Added state clearing in `handlePublish` **before** `router.push()` — resets step to 'upload', clears items, totals, receipt data, and all form state before navigating away

### H3: Auto-redirect away from /new ✅
- No explicit redirect logic existed in the code — the issue was caused by Next.js client-side router cache preserving the component in 'publishing' step state
- The mount-time reset (from H2 fix) forces step back to 'upload' on any fresh visit
- The pre-navigation state clear ensures the cached component state is clean

### M5: "Review Items" heading misleading for manual entry ✅
- Added `isManualEntry` state variable
- `skipToManual()` sets `isManualEntry = true`
- Receipt upload success sets `isManualEntry = false`
- Step 2 heading shows **"Add Your Items"** / *"Enter your items below"* for manual entry
- Step 2 heading shows **"Review Items"** / *"Tweak anything that doesn't look right — you're the boss"* for receipt upload

### M6: No validation on empty item names ✅
- Added `validationErrors` state (Set of item indices with errors)
- `handleContinueToDetails` flags items that have a price but no name with red border
- Item name inputs get `border-coral ring-1 ring-coral/30` styling when flagged
- Typing in a flagged input auto-clears its error state
- `handlePublish` also filters out empty-name items as defense in depth
- Completely empty items (no name, no price) are auto-removed on Continue

## Technical Notes
- All fixes are in `src/app/new/page.tsx` — no other files changed
- Receipt upload flow is unaffected (isManualEntry is set to false on upload)
- Profile auto-fill from API still works (mount reset only affects bill-specific state, profile data is loaded separately)
