# GPT-5.2 Design Review — TidyTab Mobile UX
**Date:** 2026-02-07
**Model:** GPT-5.2-chat (Azure)
**Input:** 8 full-page mobile screenshots (390px) of all major flows

---

## Per-Screen Feedback

### 1. Homepage
**Working:** Clear value prop, visible CTA, product screenshots ground the promise
**Not Working:**
- Hierarchy is muddy — everything below the hero competes for attention
- Way too long for mobile — marathon scroll, tells entire story instead of getting users into product
- Visual noise — too many cards, rounded corners, shadows, dotted outlines, badges
- Typography: line lengths too wide, body copy verbose, inconsistent emphasis (bold, orange, icons, emojis all fighting)
**Premium benchmark:** One hero screen = one job: get to bill creation. Cut content 50%. One strong visual instead of many mini cards. Sticky CTA on mobile.

### 2. New Bill — Step 1
**Working:** Clear step indicator, sensible upload/manual fork, large upload target
**Not Working:**
- Toggle looks like buttons, tabs, and cards all at once — no clear selected state
- "Drag & drop" is irrelevant on mobile
- File format chips (JPG, PNG, HEIC, WebP) meaningless to users
- Upload box is enormous, pushes next action off-screen
**Premium benchmark:** Segmented control with bold selected state. Remove drag & drop on mobile. Inline camera access.

### 3. Manual Entry — Step 2
**Working:** Clean card grouping, clear subtotal/tax/tip, prominent Continue button
**Not Working:**
- Price/qty/delete cramped horizontally, qty input tiny and easy to mis-tap
- "Add Receipt" button mid-manual-flow breaks mental model
- Subtotal/Tax/Tip card competes with item entry; Total doesn't feel important enough
**Premium benchmark:** Vertical stacking of inputs. Inline +/- for quantity. Sticky Total at bottom. Eliminate secondary paths mid-flow.

### 4. Bill View (Core Product Screen) ⚠️
**Working:** Share amount is clear, payment methods familiar, items understandable
**Not Working:**
- Overloaded — welcome banner, summary, payment CTA, items, contributors all stacked with no clear primary action
- Payment UX backwards: name field after amount, method selection feels like preference not action
- Information redundancy: remaining bar, % covered, dollar amounts
- "Claim my dishes instead" confusing; emoji + financial action = trust erosion
**Premium benchmark:** ONE primary CTA: "Pay $13.63". Everything else collapsible. Payment method after tapping Pay. Remove welcome copy on scroll.

### 5. Dashboard
**Working:** Clear empty states, group concept understandable, simple stats
**Not Working:**
- Feels like landing page, not a tool — too much instructional copy
- Visual inconsistency between stats cards and bill cards
- CTA dilution — too many competing "Create" actions
**Premium benchmark:** One dominant CTA per state. Shrink instructional copy 60%. Dense and powerful, not explanatory.

### 6. Login
**Working:** Magic link is great, simple form, no password friction
**Not Working:** Generic feel, wasted space with background blobs, CTA could be higher
**Premium benchmark:** Trust reinforcement (security, privacy). More compact layout.

### 7. About
**Working:** Authentic story, clear values, explains the "why"
**Not Working:** Way too long (blog post not product page), too many sections/icons/emojis
**Premium benchmark:** Cut 70%. Story → blog or founder note.

### 8. Create Group
**Working:** Clear form, fun emoji selection, explicit payment fields
**Not Working:** Form fatigue (too many fields upfront), payment feels mandatory even if optional
**Premium benchmark:** Progressive disclosure (create first, payment later). Collapsible emoji picker.

---

## Overall Assessment

### Top 5 Most Impactful Improvements
1. **Ruthlessly simplify screens** — especially Bill View and Homepage
2. **Clarify the primary action on every screen** (one screen = one job)
3. **Reduce copy by at least 50%**
4. **Unify interaction patterns** (cards, buttons, toggles, accordions)
5. **Rework payment flow to feel decisive and trustworthy**

### Design System Inconsistencies
- Button styles vary subtly across screens
- Card padding and border radius inconsistent
- Icons + emojis + text mixed without a system
- Headers don't follow a clear size scale

### Mobile UX Anti-Patterns
- Excessive vertical scrolling
- Desktop language on mobile ("drag & drop")
- Overloaded single-column layouts
- Too many CTAs visible at once

### The Single Biggest Thing
> **"You're trying to explain instead of letting the product speak."**
> Premium products say less, show less, do more with fewer interactions.
> TidyTab feels *friendly and earnest*, but not *confident*. Confidence comes from restraint.
