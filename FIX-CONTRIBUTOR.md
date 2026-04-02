# Fix: Contributor Flow Issues

**Deployed:** 2026-02-07 · https://tidytab.app

## Changes (in `src/components/bill/chip-in-section.tsx`)

### M1: Overpayment Warning
- Added amber warning text below the custom amount input when the entered amount exceeds the remaining balance
- Message: `⚠️ This is more than the remaining balance ($X.XX). Are you sure?`
- Warning only shows when `remaining > 0` (doesn't trigger on already-settled bills)
- Payment is still allowed — it's a soft warning, not a block (covers tip/overpay scenarios)

### M8: "Not you?" Link on Return Visits
- Added a "Not [Name]?" link in the "You're all set!" success state
- Shows the contributor's first name (e.g., "Not Alice?")
- When clicked: clears `tidytab_contributed_{slug}` and `tidytab_person_name` from localStorage, resets the form so a different person can contribute
- Styled subtly (`text-xs text-muted-foreground/50`) below the "Need to pay again?" link

### L3: Name Max Length
- Added `maxLength={50}` to the contributor name `<Input>` field
