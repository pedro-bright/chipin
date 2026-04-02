# Design Token Standardization — 2026-02-07

## What Was Done

### Audit Summary
Reviewed all 8 target files for typography, card, button, and emoji consistency. The existing design system was already **mostly consistent** — the base components (`button.tsx`, `card.tsx`, `input.tsx`, `globals.css`) are well-defined and used correctly across pages.

### Changes Made

#### 1. `groups/new/page.tsx` — Form Tightening & Progressive Disclosure
- **Collapsible emoji picker**: Emoji grid now hidden by default behind a toggle button showing the selected emoji. Reduces initial form length significantly. Uses `ChevronDown` rotation animation.
- **Payment section de-emphasis**: Venmo/Zelle/CashApp fields wrapped in a visually distinct "Optional" section with muted background (`bg-muted/20`), smaller label text (`text-xs`), and an "Optional" pill badge. Clear message: "You can add this later from your profile."
- **Added `CreditCard` icon** to payment section header for visual hierarchy.

#### 2. `group-view.tsx` — Emoji Reduction & Button Consistency
- **Replaced `🍽️` in empty bills state** with a proper `UtensilsCrossed` Lucide icon in a styled container (`w-16 h-16 rounded-2xl bg-primary/10`). Matches the icon-in-container pattern used on the group creation page.
- **Standardized settle modal CTA**: Changed from inline `className="w-full h-12 text-base font-bold"` to `size="lg" className="w-full"`, using the button component's built-in sizing. Now matches all other primary CTAs across the app.

#### 3. `balances-view.tsx` — Emoji Reduction
- **Replaced `📋` in empty ledger state** with `ClipboardList` Lucide icon in a styled container (`w-12 h-12 rounded-xl bg-muted`). Consistent with the icon-in-container pattern.

### What Was Already Consistent (No Changes Needed)

| Token | Standard | Status |
|-------|----------|--------|
| Page titles (standalone) | `text-3xl font-extrabold` | ✅ Consistent across groups/new, group-view, join-view |
| Page titles (sub-page) | `text-2xl font-extrabold` | ✅ balances-view correctly smaller |
| Section headers (cards) | `text-lg` via CardTitle | ✅ All pages use CardTitle with `text-lg` override |
| Sub-section headers | `text-sm font-semibold` | ✅ "Your Info", "Payment Methods" etc. |
| Body text | `text-sm` | ✅ Uniform |
| Helper/caption | `text-xs text-muted-foreground` | ✅ Uniform |
| Card base | `rounded-2xl` + shadow | ✅ All use Card component, no rogue overrides |
| Card padding | `p-6` (standard) / `pt-5 pb-5` (compact stats) | ✅ Intentional variation |
| Primary buttons | `size="lg"` → `h-12 rounded-xl px-8 text-base font-semibold` | ✅ Now consistent |
| Input fields | `h-12 rounded-xl` | ✅ Uniform |
| Touch targets | `min-height: 44px` on coarse pointers | ✅ Via globals.css |

### Emoji Policy (Documented)

| Context | Emoji? | Example |
|---------|--------|---------|
| Group identity | ✅ Keep | Group emoji in header, metadata |
| Success states | ✅ Keep | `✨` all settled, `🎉` join success |
| Welcome toasts | ✅ Keep | `🎉`, `👋` |
| Empty states | ❌ Replace with Lucide icon | `UtensilsCrossed`, `ClipboardList` |
| Section headers | ❌ Use Lucide icons | `Wallet`, `Users`, `Receipt` (already done) |
| Form labels | ❌ No emoji | Clean text labels |

### Files NOT Edited (per instructions)
- `src/app/page.tsx`
- `src/components/bill-view.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/login/page.tsx`
- `src/app/about/page.tsx`
- `src/app/new/page.tsx`
- `globals.css` — no changes needed, tokens are solid
- `button.tsx` — no changes needed, variants well-defined
- `card.tsx` — no changes needed, base consistent
- `input.tsx` — no changes needed

## Deployed
- Production: https://tidytab.app
- Build: clean, no warnings
