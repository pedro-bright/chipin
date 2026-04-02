# TidyTab Testing Report — Dashboard, Navigation, Error Handling & Polish

**Tester**: Automated (subagent)  
**Date**: 2026-02-07  
**Environment**: Chrome (OpenClaw managed browser), macOS  
**Viewports tested**: 320px (iPhone SE), ~390px (mobile), 1280px (desktop)  
**App URL**: https://tidytab.app  
**Auth method**: Magic link via pedro.bright47@gmail.com

---

## 1. Dashboard

### 1.1 Dashboard Layout & Content
**What I did**: Logged in via magic link, navigated to /dashboard  
**What happened**: Dashboard loaded showing:
- "Your Dashboard" heading with email address
- Stats cards: 0 Bills, $0.00 Collected, 0 Pending
- "Your Groups" section with "New Group" + "Create Your First Group" CTA
- Tab filters: Active / Settled / All
- Empty state: "No active bills — Time for a group dinner? Create a bill and let the splitting magic happen 🪄"
- "Your Profile" section with "Set up" expandable card
- "Claim a Bill" section with "Show" expandable card
- Top nav: Search bills (with 🔍 + ⌘K shortcut hint), New Bill, Log out  
**Result**: ✅ PASS  
**Notes**: Clean empty state. Good CTA copy. Stats cards are well-laid-out.

### 1.2 Sort Order / Relative Time / Bill Age
**What I did**: Attempted to create bills linked to the account  
**What happened**: Bills created while not logged in were not linked to the account. Dashboard showed 0 bills. The "Claim a Bill" feature exists for linking previously-created bills, which is a good UX solution.  
**Result**: ⚠️ PARTIAL — Could not fully test with multiple bills on dashboard  
**Notes**: The dashboard has proper infrastructure (Active/Settled/All tabs), but I couldn't populate it with enough data to test sort order and relative time due to auth session instability.

### 1.3 Loading Skeleton
**What I did**: Navigated to dashboard  
**What happened**: Page loaded quickly; no loading skeleton observed (either too fast to see or not implemented)  
**Result**: ⚠️ INCONCLUSIVE  
**Notes**: Should verify with network throttling.

### 1.4 Groups Section
**What I did**: Checked dashboard  
**What happened**: "Your Groups" section present with:
- Heading with icon
- "New Group" button
- Empty state: "Create a group for your dinner crew, roommates, or any group that splits bills regularly."
- "Create Your First Group" CTA button  
**Result**: ✅ PASS

---

## 2. Search

### 2.1 Search Button (Mobile)
**What I did**: Observed search button in dashboard nav  
**What happened**: 🔍 search button visible with "Search" label and "⌘K" shortcut hint  
**Result**: ✅ PASS (UI present)  
**Notes**: Could not fully test search interaction due to auth session issues preventing stable dashboard access.

### 2.2 ⌘K Shortcut (Desktop)
**What I did**: Observed shortcut hint in dashboard nav  
**What happened**: "⌘K" badge visible next to search button at desktop viewport  
**Result**: ⚠️ PARTIAL — UI hint present, functional test not completed

### 2.3 Search for Bill by Name / Empty State
**Result**: ⚠️ NOT TESTED — Auth session instability prevented sustained dashboard access

---

## 3. Navigation

### 3.1 "tidytab" Branding
**What I did**: Inspected nav across all pages  
**What happened**: 
- Homepage: `<link "tidy tab">` with separate styled spans — `tidy` (bold, dark) + `tab` (orange/colored)
- Other pages: "tidytab" as a single word link to /
- Footer: "tidytab" branding consistent  
**Result**: ✅ PASS — Branding correct: lowercase, bold "tidy", colored "tab"

### 3.2 Nav Links
**What I did**: Tested navigation links across pages  
**What happened**:
- **Homepage nav (logged in)**: Dashboard button + New Bill button (orange CTA)
- **Homepage nav (logged out)**: Create Bill link → /new
- **Bill page nav (host)**: Dashboard / Manage / Create Bill
- **Bill page nav (guest)**: Create Bill only
- **Login page nav**: tidytab logo → /, Create Bill → /new
- **About page nav**: tidytab logo → /, "Back to app" → /
- **Footer (all pages)**: tidytab logo → /, About → /about, Contact → mailto:hello@tidytab.app  
**Result**: ✅ PASS

### 3.3 Page Transitions
**What I did**: Navigated between multiple pages  
**What happened**: Transitions are instant (Next.js client-side routing). No visible loading states between page navigations.  
**Result**: ✅ PASS — Smooth transitions

### 3.4 Back Button Behavior
**What I did**: Used "Back" button in bill creation wizard  
**What happened**: Back button in step 2 (Review) returns to step 1 (Upload). Back button in step 3 (Details) returns to step 2. Works correctly within the wizard.  
**Result**: ✅ PASS

---

## 4. Error States

### 4.1 404 Page — /nonexistent-page
**What I did**: Navigated to https://tidytab.app/nonexistent-page  
**What happened**: Shows:
- "404" heading (h1)
- "This page could not be found." (h2)
- Footer still present  
**Result**: ✅ PASS  
**Bug (Low)**: The 404 page is a basic Next.js default — no custom styling, no "Go Home" button, no tidytab branding/nav. Compared to the polished /g/ error page, this feels unfinished.

### 4.2 Fake Bill — /b/fake-bill
**What I did**: Navigated to https://tidytab.app/b/fake-bill  
**What happened**: **Shows the bill CREATION page (step 1: "Add Your Bill")** instead of a "Bill not found" error page.  
**Result**: ❌ FAIL  
**Bug Severity**: 🔴 **HIGH**  
**Details**: When a user follows a link to a bill that doesn't exist, they see the bill creation form. This is confusing — the user expects to see a bill someone shared with them. They may think the link is broken or try to create a new bill unintentionally. Should show an error page similar to /g/fake-group ("Bill not found — This bill doesn't exist or may have been removed.").

### 4.3 Fake Group — /g/fake-group
**What I did**: Navigated to https://tidytab.app/g/fake-group  
**What happened**: Shows:
- 🔍 magnifying glass icon
- "Group not found" heading (h1)
- "This group doesn't exist or may have been removed." description
- "Go Home" link → /  
**Result**: ✅ PASS — Clean, helpful error page

### 4.4 Auth Error — /login?error=auth
**What I did**: Navigated with an expired/invalid magic link token  
**What happened**: Redirected to /login?error=auth, which then further redirected to the bill page (/b/5CF3zB). No visible error message displayed to the user.  
**Result**: ⚠️ CONCERN  
**Bug Severity**: 🟡 **MEDIUM**  
**Details**: When a magic link token is invalid/expired, the user should see a clear "Link expired — please request a new one" message. Instead, they get silently redirected.

---

## 5. Dark Mode

### 5.1 Dark Mode Toggle
**What I did**: Checked for dark mode toggle across all pages; inspected CSS for dark mode rules  
**What happened**: 
- No visible dark mode toggle found in UI
- Only 2 CSS rules referencing `.dark` found across all stylesheets
- `document.documentElement.classList.add('dark')` has minimal effect
- System `prefers-color-scheme: dark` media query returns false (not tested in dark OS setting)  
**Result**: ⚠️ **NOT IMPLEMENTED**  
**Bug Severity**: 🟢 **LOW** (feature not claimed to exist)  
**Notes**: Dark mode is essentially not implemented. The app uses a warm light theme (#FFFBF5 background) throughout. If dark mode is desired, it would need a complete implementation.

---

## 6. Mobile Responsiveness

### 6.1 320px Width (iPhone SE) — No Horizontal Scroll
**What I did**: Resized viewport to 320×568, checked document width vs viewport  
**What happened**: 
- `document.scrollWidth` (314px) < `viewportWidth` (320px) — **no horizontal scroll**
- Bill creation form fits properly
- Bill detail page with items, payment options all fit at 320px
- Footer text wraps nicely  
**Result**: ✅ PASS

### 6.2 Touch Targets
**What I did**: Visually inspected buttons/links at 320px in screenshots  
**What happened**: 
- CTA buttons (Continue, Back, Share, Publish) are large and well-padded (appear to meet 44px minimum)
- Payment method buttons (Venmo, Zelle) are adequately sized
- "Add Item" / "Add Receipt" buttons are good size
- Navigation buttons are properly spaced  
**Result**: ✅ PASS (visual inspection)

### 6.3 active:scale(0.97) Feedback
**What I did**: Could not reliably test CSS transform on active state via automation  
**Result**: ⚠️ NOT TESTED  
**Notes**: Would need manual touch testing on real device.

### 6.4 PWA Install Prompt at 320px
**What I did**: Observed PWA prompt on bill creation page at 320px  
**What happened**: The PWA install prompt ("Add TidyTab to your home screen") overlaps the Subtotal/Tax section of the bill creation form, blocking content.  
**Result**: ❌ FAIL  
**Bug Severity**: 🟡 **MEDIUM**  
**Details**: At 320px viewport, the floating PWA install prompt covers important form content (Subtotal and Tax fields). The dismiss X button is small. On iPhone SE, this would be annoying. Consider:
- Making the prompt dismissible more prominently
- Positioning it at the top of the page instead of floating over content
- Delaying the prompt until after bill creation is complete

---

## 7. About Page & Footer

### 7.1 About Page Content
**What I did**: Navigated to /about  
**What happened**: Comprehensive about page with:
- "About tidytab" heading
- Feature badges: AI Receipt Scanning, Free No Paywalls, Link No App Needed
- "The Story" section — Terry's origin story about MBA group dinners
- "Dead Simple" — 3-step how-it-works (Snap, Share, Get paid)
- "What I Believe" — 4 principles (Zero friction, Free means free, Respect the group, No awkwardness)
- "Get in Touch" — hello@tidytab.app contact link
- Nav: "Back to app" link  
**Result**: ✅ PASS — Well-written, personal, on-brand

### 7.2 Footer Text
**What I did**: Checked footer on every page visited  
**What happened**: Footer consistently shows:
> Built by Terry with love ♥️ for MBA cohorts who eat out too much 🎓

Footer also includes:
- "tidytab" logo/link → /
- "About" link → /about
- "·" separator
- "Contact" link → mailto:hello@tidytab.app  
**Result**: ✅ PASS — Matches spec exactly

### 7.3 No Twitter Link
**What I did**: Inspected footer and about page for social links  
**What happened**: No Twitter/X link found anywhere. Only links: About, Contact (mailto).  
**Result**: ✅ PASS — No Twitter link

---

## 8. Accessibility & Performance

### 8.1 ARIA Labels
**What I did**: Queried for aria-label attributes and roles  
**What happened**: 
- 5 `aria-label` attributes found on bill page (e.g., "Remove item", "Remove Sushi Platter", "0% covered")
- 1 explicit `role` attribute
- Semantic HTML used: `<main>`, `<nav>`, `<contentinfo>` (footer), `<heading>`, `<button>`, `<textbox>`, `<progressbar>`  
**Result**: ✅ PASS (basic) — Good semantic HTML; ARIA labels present on interactive elements  
**Notes**: Could benefit from more ARIA attributes (e.g., form labels, live regions for real-time updates)

### 8.2 Keyboard Navigation
**What I did**: Limited testing via browser automation  
**Result**: ⚠️ PARTIAL — Not fully tested; semantic HTML suggests reasonable keyboard support

### 8.3 Console Errors
**What I did**: Checked browser console  
**What happened**: **3 WebSocket connection errors** (repeated):
```
WebSocket connection to 'wss://conokkoaerwzufjfivvi.supabase.co/realtime/v1/websocket?apikey=...%0A&vsn=2.0.0' failed: HTTP Authentication failed; no valid credentials available
```
**Result**: ❌ FAIL  
**Bug Severity**: 🟡 **MEDIUM**  
**Details**: The Supabase realtime WebSocket URL contains `%0A` (URL-encoded newline) at the end of the API key, before `&vsn=2.0.0`. This suggests there's a trailing newline in the `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variable. The WebSocket connections fail repeatedly. This doesn't break core functionality but:
- Generates console noise
- May prevent real-time bill updates from working
- Could impact performance with retry loops

### 8.4 Fonts with display:swap
**What I did**: Checked `document.fonts` API  
**What happened**: All fonts use `display: swap`. Font family: "Space Grotesk" with system font fallbacks.  
**Result**: ✅ PASS  
**Notes**: 32 font face entries loaded, all with `swap` display property. Good performance practice.

---

## 9. Additional Observations

### 9.1 Bill Creation Wizard
- 3-step stepper (Upload → Review → Details) is clear and well-designed
- Step completion shown with checkmark icons
- Orange active step indicator provides good visual feedback
- "Enter Manually" vs "Upload Receipt" toggle is intuitive
- Tip quick-select buttons (15%, 18%, 20%, 25%) are a nice touch
- Real-time total calculation works

### 9.2 Bill Detail Page (Guest View)
- Welcome banner for new visitors is friendly and informative
- "Claim my dishes instead" / "Custom amount" options are great UX
- Payment method selection (Venmo/Zelle) with clear instructions
- Zelle payment shows full instructions (open banking app, go to Send Money → Zelle, etc.)
- "Nobody's chipped in yet..." empty state with ⚡ badge encouragement
- Items expandable section (Show/Hide toggle)
- Progress bar for payment tracking

### 9.3 Login Flow
- Magic link email arrives within seconds (< 10 sec)
- Welcome email ("🧾 Welcome to TidyTab!") is well-designed with TidyTab branding
- Login email ("🧾 Your TidyTab Login Link") is clean
- DKIM, SPF, DMARC all pass — good email deliverability
- "Use a different email" option on the "check your email" screen

### 9.4 Auth Session Stability Issue
**Bug Severity**: 🟡 **MEDIUM-HIGH**  
During testing, the auth session was very fragile:
- Magic link tokens seemed to be consumed by background/redirect processes
- The browser tab kept getting redirected to `/b/5CF3zB` unexpectedly
- Auth state was lost between page navigations
- The `%0A` in the Supabase API key may be related to auth issues
- Multiple tabs were spawned during auth callbacks

This could be a testing-environment artifact, but if it affects real users, it would be a significant issue.

### 9.5 Homepage
- Beautiful landing page with compelling copy
- Mock bill card (Friday dinner, $142.50) with avatar circles (S, J, M) is engaging
- Feature badges (AI Receipt Scan, No App Needed, Always Free) are clear
- 3-step visual walkthrough with animated/illustrated cards
- Social proof: "Loved by MBA cohorts & friend groups"
- CTA buttons: "Create a Bill — it's free" (green) and "See how it works ↓"
- "Split Your First Bill" secondary CTA at bottom

---

## Bug Summary

| # | Bug | Severity | Page |
|---|-----|----------|------|
| 1 | `/b/fake-bill` shows creation page instead of "Bill not found" error | 🔴 HIGH | /b/{invalid-slug} |
| 2 | WebSocket errors — `%0A` (newline) in Supabase API key URL | 🟡 MEDIUM | All pages |
| 3 | Auth session instability / unexpected redirects | 🟡 MEDIUM-HIGH | Cross-page |
| 4 | Expired magic link shows no user-facing error message | 🟡 MEDIUM | /login |
| 5 | PWA install prompt overlaps form content at 320px | 🟡 MEDIUM | /new (step 2) |
| 6 | 404 page uses default Next.js style (no custom branding) | 🟢 LOW | /nonexistent |
| 7 | Dark mode not implemented | 🟢 LOW | N/A |

---

## Test Coverage Summary

| Area | Status | Notes |
|------|--------|-------|
| Dashboard layout | ✅ Tested | Clean, well-organized |
| Dashboard with bills | ⚠️ Partial | Auth issues prevented sustained access |
| Search UI | ✅ Present | ⌘K hint visible |
| Search function | ⚠️ Not tested | Auth session lost |
| Navigation | ✅ Tested | All links work, transitions smooth |
| Branding | ✅ Tested | Correct: bold "tidy" + colored "tab" |
| 404 page | ✅ Tested | Works but unpolished |
| /b/ error | ❌ Failed | Shows creation page |
| /g/ error | ✅ Tested | Clean error page |
| Dark mode | ⚠️ Not available | Not implemented |
| 320px responsive | ✅ Tested | No h-scroll, good layout |
| Touch targets | ✅ Visual | Appear adequate |
| About page | ✅ Tested | Comprehensive, well-written |
| Footer | ✅ Tested | Correct text, no Twitter |
| ARIA / a11y | ✅ Basic | Semantic HTML, some ARIA labels |
| Console errors | ❌ Found | WebSocket auth failures |
| Font display | ✅ Tested | swap used correctly |
