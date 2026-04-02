# TidyTab — Groups & Balances Testing Report

**Date:** 2026-02-07  
**Tester:** Pedro (automated via OpenClaw subagent)  
**Target:** https://tidytab.app  
**Viewport:** 390×844 (mobile)  
**Duration:** ~25 minutes

---

## Executive Summary

The Groups & Balances features exist in TidyTab as a **behind-authentication feature set**. Groups are created, managed, and linked to bills only when a user is authenticated. The feature includes group creation via `/api/groups`, group member management, attendee selection for bills ("Who was there?"), per-person split calculations, and a balance/settle flow. However, there is **no public-facing group creation page** (e.g., `/groups/new` returns 404). The entire groups workflow requires authentication via magic link email, and the Supabase PKCE auth flow has significant issues that blocked full browser-based testing.

**Critical Finding:** The magic link → redirect → session storage flow is broken or unreliable. Multiple attempts to authenticate via the browser failed due to the Supabase PKCE redirect losing the session during navigation. This is a **Critical** authentication bug that likely affects real users.

---

## Test Results

### 1. Group Creation

| Test Case | Action | Expected | Actual | Status |
|-----------|--------|----------|--------|--------|
| 1.1 Navigate to `/groups/new` | Browser navigate | Group creation form | Redirected to `/new` (bill creation page) | ❌ **FAIL** |
| 1.2 Navigate to `/g/new` | Browser navigate | Group creation form | "Group not found" page (treats "new" as a slug) | ❌ **FAIL** |
| 1.3 Navigate to `/group/new` | Browser navigate | Group creation form | 404 page | ❌ **FAIL** |
| 1.4 API: POST `/api/groups` empty body | curl | Error message | `{"error":"Group name is required"}` | ✅ PASS |
| 1.5 API: POST `/api/groups` with name only | curl | Error about missing fields | `{"error":"Creator email is required"}` — requires auth | ✅ PASS |
| 1.6 API: POST `/api/groups` with all fields, no auth | curl with name+creatorName+email | Creates group or auth error | `{"error":"Creator email is required"}` — confirms auth required | ✅ PASS |
| 1.7 API: POST `/api/groups` rate limiting | Multiple rapid calls | Rate limiting | `{"error":"Too many requests"}` after burst | ✅ PASS |

**Bug GRP-1 (High):** No public-facing group creation page exists. The `/groups/new` path specified in the task description does not exist. Groups can only be created through the API (which requires auth) or presumably through a dashboard UI after login. There is no discoverable path for a new user to create a group.

**Bug GRP-2 (Medium):** The `/g/new` path is treated as a group slug lookup (returns "Group not found") rather than a creation route. Consider redirecting `/g/new` or `/g/create` to a group creation flow.

### 2. Group Home & Join

| Test Case | Action | Expected | Actual | Status |
|-----------|--------|----------|--------|--------|
| 2.1 `/g/nonexistent-slug` | Browser navigate | 404 or "not found" | "🔍 Group not found" with "Go Home" link. HTTP 404 status. | ✅ PASS |
| 2.2 Group not found page content | Inspect page | Helpful error message | Clean UI: emoji icon, clear heading, description, "Go Home" button | ✅ PASS |
| 2.3 Group not found page title | Check `<title>` | Meaningful title | `<title>Group Not Found</title>` | ✅ PASS |
| 2.4 GET `/api/user-groups` (unauthenticated) | curl | Error or empty | `{"groups":[]}` — returns empty array, no auth error | ⚠️ WARN |
| 2.5 GET `/api/user-groups` (with auth cookie) | curl | User's groups | `{"groups":[]}` — auth cookie not recognized via curl | ❌ **BLOCKED** |

**Bug GRP-3 (Low):** `/api/user-groups` returns `{"groups":[]}` for unauthenticated requests instead of a 401 error. While this prevents information leakage, it makes it hard to distinguish "user has no groups" from "user is not authenticated."

### 3. Bills in Group (Code Analysis — from JS Bundle)

From analyzing the JavaScript source (`7b7d4bacabb3b244.js`), the bill creation flow includes:

| Feature | Evidence | Status |
|---------|----------|--------|
| "Link to Group" section | Found in bill details step: `"Link to Group (optional)"` with group selector buttons | ✅ EXISTS |
| Group selector buttons | Code shows "None" button + dynamic buttons for each group with `emoji + name` | ✅ EXISTS |
| "Who was there?" checkboxes | After selecting a group, `eT.map(e => ...)` renders member checkboxes | ✅ EXISTS |
| Per-person split calculation | `Math.round(eV / eP.size * 100) / 100` — divides total by selected attendees | ✅ EXISTS |
| Host auto-selection | Host name is compared to member names with special "host" badge | ✅ EXISTS |
| Attendee data sent to API | `attendees: ek && eP.size > 0 ? eT.filter(e => eP.has(e.id)).map(...)` | ✅ EXISTS |
| Group ID linked to bill | `group_id: ek || null` sent in POST `/api/bills` | ✅ EXISTS |
| Expected amount per attendee | `expected_amount: Math.round(eV / eP.size * 100) / 100` | ✅ EXISTS |

**Bug GRP-4 (Medium):** The attendee expected amount calculation divides total by attendee count equally. There's no support for weighted splits or item-claiming within the group attendee flow. If one person ordered a $50 steak and another had a $10 salad, they'd still split equally when using the group attendee feature.

### 4. Balances

| Test Case | Action | Expected | Actual | Status |
|-----------|--------|----------|--------|--------|
| 4.1 Navigate to `/g/[slug]/balances` | Could not test — no valid group slug | Balance page | **BLOCKED** — requires authenticated group | ❌ BLOCKED |
| 4.2 Balance calculation logic | Code analysis | Accumulative balances | Found `balance` references in bill viewer code, `"settled"` status checks | ✅ EXISTS |
| 4.3 Bill "settled" status | Code analysis | Status indicator | Found: `"settled"===i` shows "✓ Settled" with checkmark icon | ✅ EXISTS |

**Note:** Full balance testing was blocked by authentication issues. Balance features exist in the codebase but could not be exercised through the UI.

### 5. Settle Up

| Test Case | Action | Expected | Actual | Status |
|-----------|--------|----------|--------|--------|
| 5.1 Settle flow | Code analysis | Settlement mechanism | Found `settle` references in bill viewer and homepage demo | ✅ EXISTS |
| 5.2 Bill contribution tracking | Tested via bill page | Track payments | Bill page shows "Nobody's chipped in yet..." with progress bar | ✅ PASS |
| 5.3 Payment methods | Bill page | Venmo/Zelle/CashApp | Shows Venmo (pressed), Zelle, CashApp options | ✅ PASS |
| 5.4 Contribution localStorage | Code analysis | Remember contributions | `localStorage.getItem(\`tidytab_contributed_\${e.slug}\`)` persists payment status | ✅ EXISTS |

### 6. Edge Cases

| Test Case | Action | Expected | Actual | Status |
|-----------|--------|----------|--------|--------|
| 6.1 `/g/nonexistent-slug` | curl & browser | Proper 404 | HTTP 404 + custom "Group not found" UI with Go Home link | ✅ PASS |
| 6.2 Group with 1 member | Could not create group | — | **BLOCKED** | ❌ BLOCKED |
| 6.3 Admin removing member with balance | Could not test | — | **BLOCKED** | ❌ BLOCKED |
| 6.4 `/groups/new` redirect | Browser navigate | Group creation | Redirects to `/new` (bill creation) — confusing | ⚠️ WARN |
| 6.5 Service worker caching | Navigate various URLs | Correct pages | Service worker aggressively caches and sometimes shows stale/wrong page | ❌ **FAIL** |

---

## Authentication Testing (Blocker for Group Features)

### Magic Link Flow

| Test Case | Action | Expected | Actual | Status |
|-----------|--------|----------|--------|--------|
| AUTH-1 Request magic link | POST to Supabase OTP | Email sent | Magic link email received ✅ | ✅ PASS |
| AUTH-2 Email content | Read email | Valid link | Contains valid Supabase verify URL with token | ✅ PASS |
| AUTH-3 Click magic link | Navigate to verify URL | Auth + redirect to app | Redirects to TidyTab with `#access_token=...` in URL hash | ✅ PASS |
| AUTH-4 Session persistence | Navigate to dashboard after auth | Authenticated dashboard | Redirected to `/login` — session NOT persisted | ❌ **FAIL** |
| AUTH-5 Magic link redirect_to | Use custom redirect_to | Redirect to specified page | Redirects to `/login?redirect=/dashboard` with hash, but then loses session on navigation | ❌ **FAIL** |
| AUTH-6 Cookie storage | Check document.cookie after auth | Supabase session cookie | Cookie was set in browser but NOT recognized on server-side navigation | ❌ **FAIL** |
| AUTH-7 Dashboard access | Navigate to `/dashboard` | Dashboard page | Always redirects to `/login?redirect=%2Fdashboard` | ❌ **FAIL** |

**Bug AUTH-1 (Critical):** Magic link authentication flow is broken. The Supabase PKCE flow successfully processes the magic link and receives an access token, but the session is NOT properly stored in cookies for subsequent server-side authentication. This means users cannot access their dashboard, groups, or any authenticated features after clicking the magic link. The page briefly receives the auth tokens in the URL hash fragment but fails to persist them before the client-side router navigates away.

**Bug AUTH-2 (High):** The login page redirects to `/login?redirect=%2Fdashboard` with the auth hash, but the Supabase client-side JS doesn't reliably process the hash before navigation occurs. The browser creates a new page/tab during the redirect chain, losing the hash fragment.

**Bug AUTH-3 (Medium):** Email magic link URL in the text/plain part of the email was truncated — the `=` sign after `?token` was missing in the plaintext body rendering (`?tokena7fd4...` instead of `?token=a7fd4...`). The HTML version had the correct URL.

---

## API Endpoint Testing

| Endpoint | Method | Auth Required | Behavior |
|----------|--------|---------------|----------|
| `/api/groups` | POST | ✅ Yes | Creates group. Validates: `name` (required), then requires authenticated user email |
| `/api/user-groups` | GET | Soft (returns `[]` if no auth) | Returns user's groups array |
| `/api/bills` | POST | Optional | Creates bill, accepts optional `group_id` and `attendees` |
| `/api/bills/[slug]/contribute` | POST | No | Records contribution to a bill |
| `/api/profile` | GET/POST | ✅ Yes | Get/update user profile (display_name, venmo, zelle, cashapp) |
| `/api/upload` | POST | No | Upload receipt image |
| `/api/parse-receipt` | POST | No | AI-parse uploaded receipt |

---

## Bill Page Features Tested (Non-Group)

| Feature | Status | Notes |
|---------|--------|-------|
| Bill creation (manual entry) | ✅ PASS | 3-step flow: Upload → Review → Details → Publish |
| Bill page rendering | ✅ PASS | Shows host, date, total, progress bar, items |
| Payment method display | ✅ PASS | Venmo (default), Zelle, CashApp |
| Share button | ✅ PASS | "Share with Friends" button present |
| Item list toggle | ✅ PASS | "Show/Hide N items" expandable section |
| "Claim my dishes" option | ✅ EXISTS | Button present for item-level claiming |
| "Custom amount" option | ✅ EXISTS | Button present for custom payment |
| Welcome banner | ✅ PASS | Shows welcome message for non-host visitors |
| Per-person calculation | ✅ PASS | "$54.50 split 4 ways" → "$13.63" (correct) |

---

## UX Observations

1. **No discoverable group creation path:** A new user landing on TidyTab has no visible way to create or join a group. The feature is completely hidden behind authentication with no hint of its existence on the public pages.

2. **Service worker interference:** The PWA service worker aggressively caches pages. During testing, navigating to `/g/nonexistent-slug` sometimes showed cached bill pages or the bill creation page instead of the expected 404.

3. **Magic link email UX:** The email arrives quickly (~5 seconds), has good branding, and clear CTA. However, the plaintext version has a broken URL (missing `=` sign in query parameter).

4. **Group feature in bill flow:** The "Link to Group (optional)" section in bill creation only appears for authenticated users who already have groups. There's no inline "create a new group" option — a chicken-and-egg problem.

5. **Mobile responsiveness:** The bill page, bill creation flow, and 404 pages all render well at 390px width. Touch targets appear to be ≥44px (min-h-[44px] classes used throughout).

6. **Error messages:** API error messages are user-friendly but potentially misleading. "Creator email is required" for the groups API actually means "you need to be authenticated" — not that you need to send an email field.

7. **Empty state handling:** The group not found page has a nice empty state with 🔍 emoji and clear messaging. The bill page also handles "nobody's chipped in yet" with encouraging copy.

8. **Dashboard redirect loop:** Without successful auth, clicking "Dashboard" sends users to `/login?redirect=%2Fdashboard`, but after submitting the magic link form and clicking the email link, the user is NOT landed on the dashboard. They end up on a bill page or the home page.

---

## Bug Summary

| ID | Severity | Description |
|----|----------|-------------|
| AUTH-1 | **Critical** | Magic link auth flow doesn't persist session — users can't access authenticated features (groups, dashboard, balances) |
| AUTH-2 | **High** | Login redirect loses auth hash fragment during page navigation |
| GRP-1 | **High** | No public-facing group creation page — feature is undiscoverable |
| AUTH-3 | **Medium** | Magic link URL truncated in plaintext email body |
| GRP-2 | **Medium** | `/g/new` treated as slug lookup instead of creation route |
| GRP-4 | **Medium** | Group attendee split is always equal — no weighted/item-based splits |
| SW-1 | **Medium** | Service worker shows cached/stale pages on navigation |
| GRP-3 | **Low** | `/api/user-groups` returns empty array instead of 401 for unauthenticated users |
| API-1 | **Low** | Misleading "Creator email is required" error message (actually means "auth required") |

---

## Blocked Tests (Due to Auth Failure)

The following tests could not be completed because the authentication flow (AUTH-1) prevented access to authenticated features:

- Group creation via UI
- Group home page viewing
- Member list and empty state
- Invite/join link generation and sharing
- Joining as another member
- Duplicate name handling
- "Welcome Back" detection
- Bills within a group context
- Attendee selection UI
- Balance page (`/g/[slug]/balances`)
- Balance accumulation across multiple bills
- Debt simplification
- Settle up flow
- Group with 1 member behavior
- Admin removing member with balance

---

## Recommendations

1. **Fix auth flow (P0):** The Supabase magic link → session storage → redirect chain needs debugging. The PKCE flow hash fragment must be processed and stored before any client-side navigation occurs.

2. **Add group creation page (P1):** Create a public-facing `/g/new` or `/groups/new` page. Even if it requires auth, it should prompt login first then redirect to creation.

3. **Fix service worker caching (P1):** The service worker should not cache navigation requests for dynamic routes like `/g/[slug]`.

4. **Improve API error messages (P2):** Change "Creator email is required" to "Authentication required" or similar.

5. **Add inline group creation (P2):** In the bill creation "Link to Group" section, add a "+ Create New Group" button for users with no groups.

6. **Fix email plaintext rendering (P2):** Ensure the magic link URL is properly rendered in the plaintext email body.
