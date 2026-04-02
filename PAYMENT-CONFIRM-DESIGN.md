# TidyTab Payment Confirmation UX — Design Specification

> **Status:** Ready for implementation  
> **Date:** 2026-02-08  
> **Design collaboration:** Pedro (Claude) × GPT-5.2 (4 rounds of discussion)  
> **Stack:** Next.js 15, Tailwind, mobile-first, no auth

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Design Philosophy](#design-philosophy)
3. [Recommended Approach: The Intent-First Model](#recommended-approach-the-intent-first-model)
4. [Complete State Machine](#complete-state-machine)
5. [Payer UX Flow](#payer-ux-flow)
6. [Host Experience Design](#host-experience-design)
7. [Microcopy Reference](#microcopy-reference)
8. [Edge Cases & Abuse Prevention](#edge-cases--abuse-prevention)
9. [Emotional Design & Micro-interactions](#emotional-design--micro-interactions)
10. [Implementation Architecture](#implementation-architecture)
11. [Alternatives Considered](#alternatives-considered)

---

## Problem Statement

When a TidyTab user needs to pay their share of a bill, they click a payment link (Venmo/Zelle/CashApp) which deep-links to the payment app. After completing payment there, they think they're done — but they never return to TidyTab to click "Confirm Payment." The host sees 0 confirmed contributions.

### Current (Broken) Flow
1. User sees their share amount on the bill page
2. User clicks "Pay via Venmo" → deep link opens Venmo app/site
3. User completes payment in Venmo
4. User closes Venmo, forgets about TidyTab tab
5. Host sees 0 contributions confirmed ❌

### Root Cause
This is **not a confirmation UI problem** — it's a **re-entry failure**. Mobile users do not task-switch back reliably. Every extra step after an app switch causes massive drop-off.

---

## Design Philosophy

> **In honor-system payments, intent is more valuable than confirmation.**

### Core Principles
1. **Capture intent before the app switch** — don't depend on return
2. **Make return feel automatic, not optional** — if they do come back, guide them
3. **Bias toward "paid" socially, not technically** — model confidence, not proof
4. **Never block payment** — the primary goal is getting money to the host
5. **Never lie to the host** — use distinct visual states for different confidence levels
6. **Assume honesty by default** — social pressure is the enforcement mechanism

---

## Recommended Approach: The Intent-First Model

### Summary
Instead of requiring users to return and confirm, we:
1. **Record payment intent on click** (before the redirect)
2. **Filter accidental taps** with a brief grace window
3. **Detect tab return opportunistically** and show a gentle resume card
4. **Auto-promote** pending payments to "Likely Paid" after a timeout
5. **Give the host full override authority** to correct any state

### Why This Wins
| Criterion | Score | Rationale |
|-----------|-------|-----------|
| Friction | ★★★★★ | Zero extra steps for honest payers |
| Accuracy | ★★★★☆ | Social pressure + host override fills gaps |
| Mobile reliability | ★★★★★ | No dependency on tab return |
| Host confidence | ★★★★☆ | Real-time visibility into intent, not silence |
| Abuse resistance | ★★★★☆ | Social accountability + host controls |

---

## Complete State Machine

### Payment States (Server-Authoritative)

```typescript
enum PaymentState {
  NOT_PAID = "not_paid",         // Default state
  PENDING = "pending",           // Intent declared, grace window passed
  LIKELY_PAID = "likely_paid",   // Auto-promoted after timeout
  CONFIRMED_PAID = "confirmed",  // User explicitly confirmed
}
```

### Invariants
- `PENDING` is **never** counted toward paid totals
- `LIKELY_PAID` is **visually distinct** from `CONFIRMED_PAID`
- Only **one active payment intent** per payer per bill
- Switching payment methods cancels the previous intent

### Client-Side Intent Substates (Ephemeral, localStorage only)

```typescript
enum ClientIntentState {
  NONE,              // No intent
  SOFT_INTENT,       // Immediately after tap
  GRACE_ACTIVE,      // 8-second timer running
  INTENT_COMMITTED,  // Sent to server as PENDING
}
```

### State Transition Table

#### From `NOT_PAID`

| Event | Condition | Next State | Server Update | Payer UI | Host UI |
|-------|-----------|------------|---------------|----------|---------|
| Tap payment button | — | `SOFT_INTENT` (client) | None | Button pressed state | No change |
| Grace window expires (8s) | Tab alive or restored | `PENDING` | `state=pending, method, intent_started_at` | Redirects to payment app | Row shows "Paying…" |
| User returns within grace | < 8s elapsed | `NOT_PAID` | None | Reverts silently | No change |
| Tab killed during grace | — | On reload: commit | `state=pending` | Resume card on return | Row shows "Paying…" |

#### From `PENDING`

| Event | Condition | Next State | Server Update | Payer UI | Host UI |
|-------|-----------|------------|---------------|----------|---------|
| User taps "I've Paid" | Manual action | `CONFIRMED_PAID` | `state=confirmed, confirmed_at` | ✅ Success animation | Moves to "Paid" |
| 30 min elapsed | No confirmation | `LIKELY_PAID` | `state=likely_paid, auto_promoted_at` | Soft success state | Shows "Likely Paid" (amber) |
| User returns to tab | visibilitychange | Stays `PENDING` | `last_seen_at` | Resume card appears | Timer updates |
| Host marks paid | Override | `CONFIRMED_PAID` | `host_confirmed=true` | Reflects paid | "Paid" |
| Host marks unpaid | Override | `NOT_PAID` | Reset fields | Reset UI | Reset |
| User switches method | New tap | Stays `PENDING` | `method` updated | New method shown | Method label updates |

#### From `LIKELY_PAID`

| Event | Condition | Next State | Server Update |
|-------|-----------|------------|---------------|
| User confirms later | Manual | `CONFIRMED_PAID` | `confirmed_at` |
| Host marks unpaid | Override | `NOT_PAID` | Reset |
| Nothing | — | Stays | Stable terminal state |

#### From `CONFIRMED_PAID`

Terminal state. Only host override to `NOT_PAID` can change it.

### Failure & Recovery

| Scenario | Behavior |
|----------|----------|
| iOS kills the tab | On reload: check localStorage intent + server state, reconcile, show resume card if pending |
| Page refresh mid-flow | Rehydrate from localStorage → fetch server state → resume |
| Cookies/localStorage cleared | User becomes new identity. Host sees duplicate → can merge via override |
| Multiple people on same device | Each payer gets unique `payer_session_id` (UUID in localStorage). Name entry required before paying |

---

## Payer UX Flow

### Step 1: Bill Page (Starting State)

The payer sees their share and available payment methods:

```
┌─────────────────────────────┐
│  Your share                 │
│  $24.00                     │
│                             │
│  ┌─────────────────────┐    │
│  │  Pay with Venmo     │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  Pay with Zelle     │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  Pay with CashApp   │    │
│  └─────────────────────┘    │
│                             │
│  Already paid?              │
│  [Mark as paid]             │
└─────────────────────────────┘
```

**"Already paid?" link** — for users who paid outside the app flow (e.g., handed cash, paid before seeing the link).

### Step 2: Tap Payment Button

1. Button shows pressed/loading state
2. Intent saved to localStorage with `grace_expires_at = now + 8000ms`
3. Grace timer starts
4. After 8 seconds (or on `visibilitychange` hidden / `pagehide`): commit intent to server, redirect to payment app

**Why 8 seconds?** Legitimate payers almost never return in <10 seconds. Accidental taps almost always bail within 5 seconds. The 8s grace window filters >95% of false positives.

### Step 3: Payment App Opens

TidyTab tab is now backgrounded. The server records:
- `state = PENDING`
- `intent_method = "venmo"`
- `intent_started_at = now`

Host immediately sees the user as "Paying…"

### Step 4: Return to Tab (If It Happens)

**Detection:** `visibilitychange` event + page load check against localStorage.

After a **1.5-second delay** (to avoid jarring re-entry), show an **inline resume card** at the top of the page:

```
┌─────────────────────────────┐
│  Quick check                │
│                             │
│  You said you paid Alex $24 │
│  earlier. Still good?       │
│                             │
│  [Yep, all good]  [Not yet] │
└─────────────────────────────┘
```

This is a **card, not a modal** — non-blocking, warm, not interrogative.

### Step 5: Confirmation Bottom Sheet (If Tapping "I've Paid" Directly)

If the user taps the "Mark as paid" button or "Yep, all good":

```
┌─────────────────────────────┐
│         All set?            │
│                             │
│  Did you just send $24 to   │
│  Alex?                      │
│                             │
│  ┌─────────────────────┐    │
│  │    Yep, sent it      │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │    Not yet           │    │
│  └─────────────────────┘    │
│                             │
│  We'll let Alex know.       │
└─────────────────────────────┘
```

Uses a **bottom sheet** — thumb-zone friendly, non-blocking, feels native on both iOS and Android.

### Step 6: Success State

After confirming:
- Subtle ✅ checkmark animation
- Light haptic tap (if supported)
- Toast: **"Nice 👍 We'll let Alex know."**
- Status updates inline to "Paid ✅"

### Step 7: Auto-Promotion (If User Never Returns)

If 30 minutes pass with no manual confirmation:
- Server promotes `PENDING` → `LIKELY_PAID`
- If the user ever revisits, they see a soft success state
- Host sees "Likely Paid" with visual distinction

---

## Host Experience Design

### Dashboard Layout (Mobile-First)

```
┌─────────────────────────────┐
│  Dinner at Nobu             │
│  $96.00 total               │
│                             │
│  $48.00 collected           │
│  2 Paid · 1 Pending · 1 ⏳  │
│                             │
│ ┌───────────────────────────┐
│ │ ✅ Sarah        $24.00    │
│ │    Paid                   │
│ └───────────────────────────┘
│ ┌───────────────────────────┐
│ │ ✅ Mike         $24.00    │
│ │    Paid                   │
│ └───────────────────────────┘
│ ┌───────────────────────────┐
│ │ 🟡 Alex         $24.00    │
│ │    Likely paid            │
│ │    Auto-marked after 30m  │
│ └───────────────────────────┘
│ ┌───────────────────────────┐
│ │ ⏳ Jordan        $24.00    │
│ │    Says they paid · 2m ago│
│ └───────────────────────────┘
│ ┌───────────────────────────┐
│ │ ⚪ Chris         $24.00    │
│ │    Not paid               │
│ └───────────────────────────┘
└─────────────────────────────┘
```

### Status Badges

| State | Badge | Color | Label |
|-------|-------|-------|-------|
| `CONFIRMED_PAID` | ✅ | Green | "Paid" |
| `LIKELY_PAID` | 🟡 | Amber | "Likely paid" |
| `PENDING` | ⏳ | Gray (animated dot) | "Says they paid · checking" |
| `NOT_PAID` | ⚪ | Gray | "Not paid" |

### Subtext Rules (Contextual)

| State + Context | Subtext |
|----------------|---------|
| Pending, 2 min ago | "Opened Venmo 2m ago" |
| Pending, 15 min ago | "Still pending · may have paid" |
| Likely Paid | "Auto-marked after 30m" |
| Confirmed by user | "Confirmed by user" |
| Confirmed by host | "Confirmed by host" |

### Host Actions (Per Participant)

Accessible via overflow menu (⋯) on each row:

- **"Mark as paid"** — overrides to `CONFIRMED_PAID`
- **"Not received yet"** — demotes to `PENDING` (from `LIKELY_PAID`) or `NOT_PAID`
- **"Undo"** — reverts last action

### Nudge System

The host can nudge unpaid/pending participants. Since there's no auth or contact info:

**Implementation:** Visual nudge only (no SMS/push).

- Host taps "Nudge" on a participant's row
- Sets `nudged_at = now` on server
- **Payer sees** (on next visit or if tab is open):
  > "👋 Alex is checking if you paid"
- **Host sees**:
  > "Nudged 1m ago"

**Future upgrade path:** If phone number is collected during bill creation, nudge via SMS with bill link.

### Summary Bar

```
$96.00 total
$48.00 paid · $24.00 likely · $24.00 pending
```

**Critical rule:** `PENDING` is **never** counted toward "paid" totals. `LIKELY_PAID` is counted but visually distinguished.

### Real-Time Updates

Host dashboard updates live via SSE (≤2 second delay):
- Rows update status in-place
- Pending timers tick live
- Likely Paid auto-animates when promoted
- New confirmations slide in with subtle highlight

---

## Microcopy Reference

### Payer Flow

| Context | Copy |
|---------|------|
| Payment CTA | "Pay with Venmo" / "Pay with Zelle" / "Pay with CashApp" |
| Already paid link | "Already paid? Mark as paid" |
| Loading state | "Marking as paid…" |
| Bottom sheet title | "All set?" |
| Bottom sheet body | "Did you just send **$24** to **Alex**?" |
| Primary confirm | "Yep, sent it" |
| Secondary cancel | "Not yet" |
| Helper text | "We'll let Alex know." |
| Success toast | "Nice 👍 We'll let Alex know." |
| Resume card title | "Quick check" |
| Resume card body | "You said you paid **Alex $24** earlier. Still good?" |
| Resume card confirm | "Yep, all good" |
| Resume card cancel | "I need to send it" |

### Status Labels (Payer View)

| State | Label |
|-------|-------|
| `NOT_PAID` | "Not paid yet" |
| `PENDING` | "Pending — sent just now" |
| `LIKELY_PAID` | "Likely paid ✅" |
| `CONFIRMED_PAID` | "Paid ✅" |

### Host Dashboard

| State | Label |
|-------|-------|
| `NOT_PAID` | "Not paid" |
| `PENDING` | "Says they paid · checking" |
| `LIKELY_PAID` | "Likely paid" |
| `CONFIRMED_PAID` | "Paid" |

### Host Actions

| Action | Label |
|--------|-------|
| Override to paid | "Mark as paid" |
| Override to unpaid | "Not received yet" |
| Revert | "Undo" |

### Nudge

| Context | Copy |
|---------|------|
| Payer-facing nudge | "👋 Alex is checking if you paid" |
| Host nudge sent | "Nudged 1m ago" |
| After 30m pending | "Just a heads up — Alex hasn't seen this yet." |

### Empty States

| Context | Copy |
|---------|------|
| All settled | "Everyone's settled up 🎉" |
| No one paid yet | "Waiting on the crew…" |

### Error States

| Context | Copy |
|---------|------|
| Network error | "Hmm, something didn't load. Try again?" |
| State sync conflict | "We updated this — you're good now." |

---

## Edge Cases & Abuse Prevention

### Trust Model

TidyTab is **social-trust-first, not payment-verification-first**. We don't try to prove payment. We design friction, visibility, and accountability so lying is awkward, rare, and reversible.

This mirrors real dinner behavior:
> "You said you Venmo'd me — cool, I'll see it in a sec."

### Case: User clicks "I've Paid" without actually paying

**Guardrails:**
1. **State wording avoids finality** — "I've paid" → Pending, not "Payment complete ✅"
2. **Host visibility** — host sees who tapped, when, and which method → social accountability
3. **30-minute delay** before auto-promotion gives host time to check their Venmo
4. **Host override** — can mark "Not received yet" at any time
5. **Soft language** — "Likely Paid" ≠ "Settled" — psychological door stays open

### Case: Accidental tap / fat-finger

**Handled by grace window:**
- 8-second timer before committing intent
- If user returns to TidyTab within 8 seconds → auto-reverts silently
- Legitimate payers almost never return in <10 seconds

### Case: Troll clicking everyone's Pay button on shared screen

**Guardrails:**
1. "I've Paid" only affects your own row (bound to `payer_session_id` in localStorage)
2. Grace window self-heals rapid taps
3. Resume card requires context awareness — trolls won't follow through
4. Optional: host can "Lock shared screen" to disable payer interactions on their device

### Case: Venmo payment actually fails (wrong username, insufficient funds)

**By design, this is handled:**
- Pending ≠ Paid — the system assumes good intent, imperfect tools
- Host doesn't see payment arrive → taps "Not received yet"
- Payer checks Venmo, retries, confirms again
- No dead ends, no support tickets

### Case: Disputing a "Likely Paid" status

**Host action: "Not received yet"**
- Immediately demotes to `NOT_PAID`
- Payer sees gentle nudge:
  > "Hey — Alex hasn't seen your payment yet. Mind double-checking Venmo?"
- No blame, no alarms, no red UI

### Case: Same person switches payment methods

- Only one active intent at a time
- Tapping Zelle after Venmo → intent switches to Zelle, old one cancelled
- Host sees: "Paying via Zelle" (latest method only)

### Case: Multiple people on same device

- Each person must enter their name before paying
- Separate `payer_session_id` per person in localStorage
- Namespaced by bill ID

### Case: User clears cookies / uses new device

- Becomes a new payer identity
- Host may see duplicates → can merge by marking one unpaid
- No auth means no perfect identity — this is an acceptable trade-off

---

## Emotional Design & Micro-interactions

### Payer Emotional Journey

| Step | Emotion | Design Response |
|------|---------|----------------|
| Seeing the bill | Mild anxiety ("Do I owe this?") | Clear amount, friendly tone, no countdowns |
| Tapping payment button | Micro-fear ("Did I do this right?") | Soft bottom sheet confirmation, easy escape |
| Confirming payment | Relief ("Okay, I'm done") | ✅ animation, haptic, toast |
| Pending state | Calm neutrality | "Pending" language, no warnings or timers |
| Resume card (if returning) | Gentle reminder, not guilt | Card not modal, 1.5s delay, framed as continuation |
| Likely Paid | Satisfaction ("Basically done") | Soft green accent, subtle checkmark |
| Confirmed Paid | Closure ("Dinner complete") | Finality without celebration spam |

### Micro-interactions Spec

| Trigger | Interaction | Duration | Notes |
|---------|------------|----------|-------|
| Tap "Yep, sent it" | Checkmark draw animation | 400ms | CSS/Lottie, subtle |
| Confirmation success | Haptic tap | — | `navigator.vibrate(10)` if supported |
| Success toast | Slide up + fade | 2500ms visible, 300ms fade | Auto-dismiss |
| Resume card appear | Slide down from top | 300ms ease-out | After 1.5s delay |
| Status change (payer) | Color transition | 200ms | Green pulse then settle |
| Host row update (SSE) | Subtle highlight flash | 500ms | Yellow highlight then fade |

### Design Anti-patterns to Avoid

- ❌ Full-screen modals (too heavy, feels interrogative)
- ❌ Toast-only confirmation (too easy to miss)
- ❌ Inline links for confirm (low affordance)
- ❌ Confetti / over-celebration (cringe for bill splitting)
- ❌ Countdown timers visible to payer (creates anxiety)
- ❌ Red/error colors for unpaid state (creates shame)

---

## Implementation Architecture

### Identity Model (No Auth)

```typescript
// Three identifiers in play
bill_id: string           // UUID, in the URL path
payer_session_id: string  // UUID, localStorage per device
participant_id: string    // UUID, server-generated per payer per bill
```

**`payer_session_id`** is generated on first visit and stored in localStorage. If missing, regenerated. This is the device-level identity.

### Data Storage

#### Server (Postgres / Prisma)

```sql
-- participants table
CREATE TABLE participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id           UUID NOT NULL REFERENCES bills(id),
  display_name      VARCHAR(100) NOT NULL,
  amount            DECIMAL(10,2) NOT NULL,
  state             VARCHAR(20) NOT NULL DEFAULT 'not_paid',
  intent_method     VARCHAR(20),           -- venmo | zelle | cashapp | null
  intent_started_at TIMESTAMPTZ,
  confirmed_at      TIMESTAMPTZ,
  auto_promoted_at  TIMESTAMPTZ,
  last_seen_at      TIMESTAMPTZ,
  nudged_at         TIMESTAMPTZ,
  host_confirmed    BOOLEAN DEFAULT FALSE,
  payer_session_id  UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_participants_bill ON participants(bill_id);
CREATE INDEX idx_participants_pending ON participants(state, intent_started_at) 
  WHERE state = 'pending';
```

#### Client (localStorage)

```typescript
// Keys
`tidytab:payer_session_id`  // UUID string

`tidytab:intent:${bill_id}` // JSON:
{
  participant_id: string,
  method: "venmo" | "zelle" | "cashapp",
  grace_expires_at: number,    // Unix ms
  intent_started_at: number,   // Unix ms
  committed: boolean
}
```

### API Endpoints

```
POST   /api/bills/:billId/participants
       → Create participant (name, amount, payer_session_id)
       → Returns participant_id

POST   /api/participants/:id/intent
       Body: { method: "venmo" }
       → Sets state=pending, intent_method, intent_started_at
       → Returns updated participant

POST   /api/participants/:id/confirm
       → Sets state=confirmed, confirmed_at=now
       → Returns updated participant

POST   /api/participants/:id/seen
       → Sets last_seen_at=now (lightweight ping)

POST   /api/participants/:id/nudge
       → Sets nudged_at=now

POST   /api/participants/:id/override
       Body: { state: "confirmed" | "not_paid" }
       → Host-only action (validated by bill creator session)
       → Returns updated participant

GET    /api/bills/:billId/stream
       → SSE endpoint for real-time host updates
       → Emits participant state changes

POST   /api/internal/auto-promote
       → Cron job: promote pending > 30min to likely_paid
```

### Grace Window Implementation

```typescript
// On payment button tap
function handlePaymentTap(method: string) {
  const intent = {
    participant_id: participantId,
    method,
    grace_expires_at: Date.now() + 8000,
    intent_started_at: Date.now(),
    committed: false,
  };
  
  localStorage.setItem(`tidytab:intent:${billId}`, JSON.stringify(intent));
  
  // Start grace timer
  graceTimer = setTimeout(() => commitIntent(intent), 8000);
  
  // Also commit on tab hide (user switching to payment app)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && !intent.committed) {
      commitIntent(intent);
    }
  }, { once: true });
  
  // Also commit on pagehide (iOS reliability)
  window.addEventListener("pagehide", () => {
    if (!intent.committed) {
      // Use sendBeacon for reliability
      navigator.sendBeacon(
        `/api/participants/${participantId}/intent`,
        JSON.stringify({ method })
      );
      intent.committed = true;
      localStorage.setItem(`tidytab:intent:${billId}`, JSON.stringify(intent));
    }
  }, { once: true });
}

function commitIntent(intent: Intent) {
  clearTimeout(graceTimer);
  intent.committed = true;
  localStorage.setItem(`tidytab:intent:${billId}`, JSON.stringify(intent));
  
  // POST to server
  fetch(`/api/participants/${intent.participant_id}/intent`, {
    method: "POST",
    body: JSON.stringify({ method: intent.method }),
  });
  
  // Redirect to payment app
  window.location.href = getPaymentDeepLink(intent.method, amount, hostUsername);
}
```

### Page Visibility & Return Detection

```typescript
// On page load + visibilitychange
function checkForPendingIntent() {
  const raw = localStorage.getItem(`tidytab:intent:${billId}`);
  if (!raw) return;
  
  const intent = JSON.parse(raw);
  
  // If grace window hasn't expired yet, resume timer
  if (!intent.committed) {
    const remaining = intent.grace_expires_at - Date.now();
    if (remaining > 0) {
      graceTimer = setTimeout(() => commitIntent(intent), remaining);
    } else {
      commitIntent(intent);
    }
    return;
  }
  
  // Intent was committed — fetch server state
  const participant = await fetchParticipant(intent.participant_id);
  
  if (participant.state === "pending") {
    // Show resume card after 1.5s delay
    setTimeout(() => showResumeCard(participant), 1500);
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    checkForPendingIntent();
    // Ping server for last_seen
    fetch(`/api/participants/${participantId}/seen`, { method: "POST" });
  }
});

// Also check on page load (handles iOS tab restoration)
checkForPendingIntent();
```

### Real-Time Host Updates (SSE)

```typescript
// Server: /api/bills/:billId/stream
export async function GET(req: Request, { params }: { params: { billId: string } }) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Poll DB every 2 seconds for changes
      const interval = setInterval(async () => {
        const participants = await getParticipants(params.billId);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(participants)}\n\n`)
        );
      }, 2000);
      
      req.signal.addEventListener("abort", () => clearInterval(interval));
    },
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### Auto-Promotion Cron Job

```typescript
// Runs every 2-5 minutes (Vercel Cron or similar)
export async function POST() {
  const promoted = await prisma.participant.updateMany({
    where: {
      state: "pending",
      intent_started_at: {
        lte: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      },
    },
    data: {
      state: "likely_paid",
      auto_promoted_at: new Date(),
    },
  });
  
  return Response.json({ promoted: promoted.count });
}
```

### Key Implementation Notes

1. **`sendBeacon`** for intent commits on `pagehide` — this is the most reliable way to send data when a mobile tab is being killed
2. **localStorage is the recovery mechanism** — always write intent before any async operation
3. **Server state always wins** — on load, fetch server state and reconcile with local intent
4. **SSE over WebSocket** — simpler, mobile-friendly, one-way is sufficient
5. **No auth validation on payer actions** — the `payer_session_id` is a weak identity, which is fine for an honor system
6. **Host actions should validate** against the bill creator's session (cookie-based)

---

## Alternatives Considered

### ❌ Click = Paid (Eliminate Confirm Step)

- Zero drop-off but lowest accuracy
- Encourages dishonest behavior (even accidentally)
- Breaks trust if hosts notice discrepancies
- Mis-taps and exploration taps become false positives

**Verdict:** Too aggressive. The Intent-First Model captures the same benefit (low friction) with better accuracy.

### ❌ Full Reliance on Page Visibility API

- `visibilitychange` fires ~60-70% on iOS Safari
- Backgrounded tabs may reload entirely on iOS
- `focus` event is inconsistent
- `beforeunload` is not usable on mobile

**Verdict:** Useful as a secondary signal, not a primary mechanism. We use it opportunistically.

### ❌ Two-Step Explicit Flow ("I'm about to pay" → Venmo → "Done!")

- Extra step before payment adds friction
- Still relies on return behavior for "Done!" step
- Users rush past step 1 without reading

**Verdict:** Better than current flow but not enough alone. The Intent-First Model is the two-step flow but smarter — the "about to pay" step is implicit in the click.

### ❌ Push Notifications / SMS Reminders

- Requires collecting contact info (breaks no-auth constraint)
- Notification fatigue
- Over-engineered for the problem

**Verdict:** Good future upgrade, not needed for v1. Visual nudge is sufficient.

### ❌ Pre-filled Payment (Deep Link with Amount)

- Venmo deep links support pre-filled amounts (`venmo://paycharge?txn=pay&recipients=username&amount=24`)
- Doesn't solve the confirmation problem
- Useful as a complementary improvement

**Verdict:** Implement as a nice-to-have alongside the Intent-First Model.

---

## Implementation Priority

### Phase 1 (Ship This)
1. Payment state machine (4 states + transitions)
2. Grace window on payment tap
3. Intent capture to server before redirect
4. Resume card on tab return (Page Visibility)
5. Host dashboard with real-time status (SSE)
6. Host override actions (mark paid / not received)
7. Auto-promotion cron job

### Phase 2 (Fast Follow)
1. Nudge system (visual)
2. Bottom sheet confirmation UX
3. Micro-interactions (haptic, animations)
4. "Already paid?" manual confirm flow
5. Payment method switching

### Phase 3 (Future)
1. SMS nudge (requires phone collection)
2. PWA support (better Page Visibility)
3. Abuse pattern detection
4. Analytics: false positive rate, confirmation rate, drop-off funnel

---

*This document is comprehensive enough to implement from directly. Hand it to engineering and go.*
