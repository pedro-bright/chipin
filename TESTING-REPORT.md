# TidyTab Testing Report
**Tester:** Pedro (AI hands-on tester)  
**Date:** February 7, 2026  
**Device:** iPhone viewport (390px × 844px, also tested 320px × 568px)  
**URL:** https://chipin-sepia.vercel.app  

---

## Test 1: First-time Visitor → Homepage → Create a Bill (no receipt)

### What I did
1. Landed on homepage cold
2. Scrolled through value prop, "How it works" section
3. Tapped "Create a Bill — it's free"
4. Landed on receipt upload page (step 1/3)
5. Tapped "No receipt? Enter items by hand"
6. Entered: Burger $15, Salad $12, Fries $8
7. Clicked Continue → Step 3 "Final Details"
8. Entered: Event name "Team Lunch", Name "Pedro", Venmo "pedro-test"
9. Tapped "Publish & Share"
10. Bill created successfully with share link

### What worked well ✅
- **Homepage is gorgeous.** Clear value prop: "Split the bill. Skip the drama." immediately tells you what this does
- **Social proof**: "Loved by MBA cohorts & friend groups" with avatar pills
- **How it works**: 3-step visual walkthrough is compelling (receipt → link → money)
- **The demo card** (Friday dinner $142.50) makes it feel real before you even sign up
- **Step 2 item entry** is clean — name + price + quantity, tip % quick buttons appear after entering items
- **Loading state** ("Creating your bill... 3, 2, 1... ✨") with rocket animation is delightful
- **No signup required** to create a bill — massive friction reducer

### What was confusing or broken ⚠️
- **Receipt upload is step 1** — the "Enter items by hand" link is below the fold and could be missed. ~60% of casual users might not have a receipt photo handy
- **"# of People" field** on step 3 is easy to skip — no validation warning if you leave it at 0 (though it's optional when using attendees)
- **No back button from step 1 to homepage** — the tidytab logo is the only way back

### Severity & Suggestions
- 🟢 Minor: Make "Enter items by hand" more prominent (maybe a tab toggle: "Upload Receipt | Enter Manually")
- 🟢 Minor: Add explicit back-to-home button on step 1

### Stats
- **Total taps to create a bill**: ~12 (homepage CTA → skip receipt → 3 items × 3 taps each + Continue + fill details + Publish)
- **Time estimate**: ~90 seconds for a 3-item bill
- **Confusion points**: 0 (very intuitive)

---

## Test 2: Share the Bill → Open as Contributor

### What I did
1. Opened `https://chipin-sepia.vercel.app/b/8sY4WR` in new tab
2. Saw bill page: "Team Lunch" hosted by Pedro, $35.00 total
3. "YOUR SHARE: $8.75" ($35 / 4 = $8.75 ✓)
4. Entered name "Alex" in the name field
5. Venmo was pre-selected (only payment method available)
6. "Pay with Venmo $8.75" button appeared with deep link
7. Clicked "I've Paid $8.75"
8. Celebration screen: "You're all set! $8.75"
9. Progress bar updated to 25% covered

### What worked well ✅
- **Immediate clarity**: The share amount is HUGE ($8.75) with "scroll down to pay ↓" hint
- **Venmo deep link** is perfectly constructed: `venmo.com/pedro-test?txn=pay&amount=8.75&note=TidyTab...`
- **"I've Paid" confirmation** is a great trust bridge (honor system but low friction)
- **Celebration animation** with confetti dots and "Zero awkward texts needed ✨" — chef's kiss
- **"Be the hero who goes first — prompt payers earn a ⚡ badge!"** — clever gamification
- **Alex got the ⚡ badge** for paying quickly
- **Real-time update**: Progress bar and "Who's Chipped In" updated instantly
- **No signup needed** to contribute

### What was confusing or broken ⚠️
- **Name persists in localStorage** — if someone else opens the same link on the same device, "Alex" is pre-filled. Could confuse a second person
- **Items section auto-expanded** on contributor page (takes up a lot of screen real estate before the pay section)

### Severity & Suggestions
- 🟢 Minor: Consider collapsing items by default on the contributor view (focus is on paying, not reviewing items)
- 🟢 Minor: Add "Not Alex?" link near the pre-filled name

---

## Test 3: Create a Group → Invite Flow

### What I did
1. From dashboard, clicked "New Group"
2. Entered "Friday Dinner Club", selected 🍕 emoji
3. Filled in name "Pedro", Venmo "pedro-test"
4. Clicked "Create Group" → redirected to group page
5. Copied invite link from the group
6. Opened invite link in new tab: `https://chipin-sepia.vercel.app/g/fvmtpxch/join?code=245a1120ebcb0a0f`

### What worked well ✅
- **Emoji picker** is fun and well-curated (🍽️🍕🍣🍔🌮🥘🏠💼🎉🏖️⚽🎓🍻🎵🚗❤️)
- **Group creation is instant** — no loading spinner
- **Group page** shows members, bills, invite code clearly
- **"Just you so far — invite your crew!"** — friendly empty state
- **Invite page** (after fix) is beautiful: "You've been invited to join Friday Dinner Club" with 🍕 emoji and "Pedro is here" social proof

### What was confusing or broken ⚠️
- 🔴 **BLOCKER (FIXED)**: The `?code=` query parameter in the invite URL conflicted with Supabase's auth code exchange in the middleware. The middleware was intercepting `?code=` on ALL routes and treating it as a Supabase auth code, causing the join page to redirect to `/login?error=auth`
  - **Fix applied**: Added `isGroupJoin` check in middleware to skip auth code exchange for `/g/*/join` routes
  - **Deployed**: ✅
- The invite code is shown at the bottom of the group page as raw text (`245a1120ebcb0a0f`) — not very user-friendly

### Severity & Suggestions
- 🔴 **FIXED**: Invite link `?code=` parameter conflict with auth middleware
- 🟢 Minor: Consider renaming the invite URL parameter from `code` to `invite` to avoid future conflicts

---

## Test 4: Create Bill in Group with Attendees

### What I did
1. From group page, clicked "New Bill"
2. Skipped receipt → entered 4 items: Margherita $18, Pepperoni $22, Garlic Bread $8, Drinks $15
3. Continued to step 3 "Final Details"
4. Group "Friday Dinner Club" was pre-selected
5. "Who was there?" showed Pedro ✅ and Sarah ✅ both pre-checked
6. Per-person amount: $31.50 each ($63 / 2)
7. Filled in event name "Pizza Night - Feb 7"
8. Published bill

### What worked well ✅
- **Group pre-selection** when creating from group page — seamless
- **Attendee checkboxes** with automatic per-person calculation is brilliant
- **"$31.50 each"** shown right next to the attendees — instant clarity
- **"Split $63.00 between 2 people"** summary below
- **"✓ Logged in — bill will be linked to your account"** — reassuring for logged-in users
- **Profile auto-fill** (name, email, Venmo) from the logged-in account — saves time

### What was confusing or broken ⚠️
- 🔴 **BLOCKER (FIXED)**: "YOUR SHARE: $0.00" displayed on the bill page when using attendees without setting `person_count`. The share calculation only used `person_count` field, ignoring the attendee count.
  - **Fix applied**: Updated `splitAmount` calculation to fall back to `attendeeCount` when `person_count` is not set
  - **Deployed**: ✅ Now correctly shows $31.50
- **No way to partially select attendees** or assign different amounts to different people (e.g., if someone only had appetizer)

### Severity & Suggestions
- 🔴 **FIXED**: Split amount showing $0 for attendee-based bills
- 🟡 Annoying: Consider allowing per-attendee custom amounts for uneven splits

---

## Test 5: Contributor Experience in Group Bill

### What I did
1. Opened the Pizza Night bill URL as an anonymous user
2. Saw "YOUR SHARE: $31.50" (after the fix)
3. Entered name "Sarah" in the name field
4. Venmo selected, "Pay with Venmo $31.50" button displayed
5. Clicked "I've Paid $31.50"
6. Celebration: "You're all set! $31.50"
7. "Who was there" section updated: Sarah ✅ ($31.50) — "1 of 2 paid"

### What worked well ✅
- **After the fix**, the share amount is prominently displayed and correct
- **Payment flow** is identical to standalone bills — consistent UX
- **"Who was there" section** clearly shows who's paid and who hasn't
- **Real-time update** when payment is recorded

### What was confusing or broken ⚠️
- **No personalized greeting** for Sarah — the page doesn't recognize that the viewer is an attendee (since there's no auth). It says "Your share" instead of "Sarah's share"
- **Name pre-fill from localStorage** can confuse if a different person used this browser before (showed "Alex" instead of auto-detecting Sarah)

### Severity & Suggestions
- 🟡 Annoying: Add URL parameter or cookie-based member identification so group members see personalized content
- 🟢 Minor: Could add "(You're an attendee!)" message if name matches

---

## Test 6: Check Group Balances

### What I did
1. Navigated to group home page
2. Saw summary: 2 members, 1 bill, $63.00 total
3. "✨ All settled up! No outstanding balances in this group." displayed
4. Pedro shows +$31.50 balance
5. Navigated to `/g/fvmtpxch/balances`
6. Balances page: Pedro +$31.50 "is owed"
7. Status: "All settled up!" 
8. Ledger: Pizza Night, Sarah $31.50

### What worked well ✅
- **Balance display** with green "+$31.50" for Pedro — clear who's owed
- **Ledger section** shows bill history with individual contributions
- **Clean layout** — simple and easy to understand

### What was confusing or broken ⚠️
- 🟡 **"All settled up!" is misleading**: Pedro is owed $31.50 but the status says "All settled up." This is technically correct from a group-debt perspective (Sarah paid Pedro, no inter-member debts), but it's confusing when the bill itself still shows $31.50 remaining
- The status message doesn't match the visual (+$31.50 is owed) displayed right above it

### Severity & Suggestions
- 🟡 Annoying: Either hide the "All settled up!" message when there are outstanding balances, OR clarify: "Sarah has paid Pedro — no outstanding debts between members"
- 🟢 Minor: Link from balances page to the specific bills for context

---

## Test 7: Receipt Upload Flow

### What I did
1. Navigated to "New Bill"
2. Observed the upload page UI
3. Tested the "No receipt? Enter items by hand" flow (skip)
4. Could not test actual receipt parsing (no test image available via CLI tools)

### What worked well ✅
- **Upload zone** is clear and inviting — dashed border, camera icon, "Tap to snap or choose a photo"
- **"or drag & drop"** secondary option for desktop users
- **File format tags** (JPG, PNG, HEIC, WebP) set expectations clearly
- **"Works with paper receipts, screenshots, and photos of screens"** — good messaging
- **"No receipt?" escape hatch** is clearly visible below

### What was confusing or broken ⚠️
- Could not fully test parsing without a real image
- The upload area covers most of the viewport — might overwhelm first-time users who don't have a receipt

### Severity & Suggestions
- 🟢 Minor: Consider a loading skeleton or progress indicator for OCR processing
- 🟢 Minor: Show estimated processing time ("Usually takes 5-10 seconds")

---

## Test 8: Dashboard Experience

### What I did
1. Logged in with email/password (Supabase admin-created user)
2. Viewed dashboard
3. Checked stats, groups, bills, profile, badges

### What worked well ✅
- **Stats row**: 1 Bill, $31.50 Collected, 1 Pending — at a glance
- **"Send 1 Reminder"** button — proactive feature for collecting payments
- **Groups section**: Friday Dinner Club with emoji and member/bill count
- **Bill card**: Rich info — name, date, contributor count, time ago, progress bar, quick actions (Share/Manage/View)
- **"Your Profile"** auto-populated from bill creation data (Pedro · Venmo: @pedro-test)
- **"Your Badges"**: 🎉 First Host — fun gamification element
- **"Claim a Bill"**: Smart feature for linking pre-signup bills to accounts

### What was confusing or broken ⚠️
- **No search** — the ⌘K shortcut or search icon doesn't seem to exist. For users with many bills, this could be an issue
- **The bill I created without auth (Team Lunch)** doesn't appear on the dashboard — need to manually "Claim" it
- **No notification preferences** or email settings visible

### Severity & Suggestions
- 🟡 Annoying: Add search/filter for bills (especially for power users with 10+ bills)
- 🟡 Annoying: Auto-link bills to account when the email matches (instead of requiring manual claim)
- 🟢 Minor: Add a "Settings" section for notification preferences

---

## Test 9: Manage Bill as Host

### What I did
1. Clicked "Manage" on Pizza Night bill from dashboard
2. Reviewed all sections: Edit Details, Items, Record Payment, Contributions, Share
3. Entered "Pedro" as person name, clicked "Remaining: $31.50" (auto-filled amount)
4. Recorded manual payment as Cash
5. Bill showed "Fully covered!" with "Mark as Settled" button

### What worked well ✅
- **"Remaining: $31.50" click-to-fill** is brilliant — saves host from mental math
- **Full edit capability**: restaurant name, payment handles, status
- **Status dropdown**: Published / Settled (Closed) — simple lifecycle
- **Record Payment**: Person name, amount, method (Cash/Venmo/Zelle/CashApp/Other)
- **"Added by host"** badge on manually recorded payments — transparency
- **Delete buttons** on contributions for host corrections
- **"Mark as Settled"** CTA when fully covered — guides the host
- **Share URL** with Copy button

### What was confusing or broken ⚠️
- **"Record Payment" button disabled** state is unclear — no tooltip explaining what's needed
- **No confirmation dialog** before deleting a contribution
- **No way to edit an existing contribution** (only delete and re-add)

### Severity & Suggestions
- 🟢 Minor: Add "Enter name and amount" placeholder text near disabled Record Payment button
- 🟡 Annoying: Add confirmation dialog for contribution deletion ("Are you sure?")
- 🟢 Minor: Allow inline editing of contribution amounts

---

## Test 10: Edge Cases

### What I did
1. **$0 total bill**: Created bill with no items, hit Continue → Step 3 showed "⚠ Total must be greater than $0", Publish button disabled ✅
2. **Empty form submission**: Continue button advances to step 3 even with empty items (item is ignored in total) — acceptable
3. **Very long restaurant name** (120+ chars): Text field scrolls horizontally, no layout break ✅
4. **320px width**: Tested homepage and bill view — everything renders perfectly, no overflow ✅
5. **Dark mode**: No dark mode support — app is light-only

### What worked well ✅
- **$0 validation** is proper — shows warning and disables Publish
- **Responsive design** is excellent down to 320px — nothing breaks
- **Long text handling** is clean — no overflow or layout issues
- **Empty items** are silently ignored (not counted in total)

### What was confusing or broken ⚠️
- **No dark mode** — purely light theme. Not a blocker but some users prefer dark
- **Empty item row** is still visible even if you don't fill it (a bit messy)
- **The stepper (1-2-3) doesn't indicate clickability** — can I go back to step 1 by tapping "1"?

### Severity & Suggestions
- 🟢 Minor: Add dark mode support (many mobile users prefer dark theme at night)
- 🟢 Minor: Auto-remove empty item rows when clicking Continue
- 🟢 Minor: Make step indicators clickable for navigation

---

## Overall Assessment — Brutally Honest

### The Good 🎉
TidyTab is **genuinely impressive for an MVP**. The core flow — create a bill, share a link, get paid — works beautifully with minimal friction. Specific highlights:

1. **Zero-signup bill creation** is the killer feature. No account needed to create OR pay — this removes the #1 barrier to adoption.
2. **The Venmo deep link** with pre-filled amount and note is genius. One tap to pay.
3. **Visual design** is warm, friendly, and polished. The orange/cream palette feels inviting, not corporate.
4. **Celebration moments** (rocket launch, confetti, "Zero awkward texts needed") inject personality and delight.
5. **Gamification** (⚡ prompt payer badge, 🎉 First Host badge) is a nice touch for repeat users.
6. **Mobile responsive** — flawless at both 390px and 320px.
7. **Group features** (attendees, balances, invite flow) add real depth beyond basic bill splitting.

### The Bad 😬
1. **Two blocker bugs found and fixed** — the invite link `?code=` conflict was a showstopper, and the $0 share for attendee-based bills was confusing.
2. **Balances "All settled up!" message** is misleading when there are outstanding amounts.
3. **No search/filter** on the dashboard — will hurt as users accumulate bills.
4. **Bills created before signup aren't auto-linked** — the "Claim a Bill" flow exists but is manual and buried.
5. **No dark mode** — increasingly expected in 2026.

### The Ugly 🤮
Honestly, nothing was truly ugly. The app is well-polished. The closest thing to "ugly" is the invite code displayed as raw hex (`245a1120ebcb0a0f`) at the bottom of the group page — that's developer-facing, not user-facing.

---

## Top 5 Issues by Impact

| Rank | Issue | Severity | Status |
|------|-------|----------|--------|
| 1 | **Invite link `?code=` conflicts with Supabase auth middleware** — group invite links redirected to login error | 🔴 Blocker | ✅ FIXED & deployed |
| 2 | **"YOUR SHARE: $0.00" for attendee-based group bills** — splitAmount didn't consider attendee count | 🔴 Blocker | ✅ FIXED & deployed |
| 3 | **Balances page shows "All settled up!" when money is owed** — confusing mixed signals | 🟡 Annoying | Documented |
| 4 | **No search/filter on dashboard** — will cause friction at scale | 🟡 Annoying | Documented |
| 5 | **Bills created without auth not auto-linked to account** — users lose track of their bills | 🟡 Annoying | Documented |

---

## Fixes Deployed

### Fix 1: Invite Link Middleware Conflict
**File:** `src/lib/supabase/middleware.ts`  
**Change:** Added `isGroupJoin` check to skip auth code exchange for `/g/*/join` routes  
**Impact:** Group invite links now work correctly instead of redirecting to login error

### Fix 2: Split Amount for Attendee-Based Bills  
**File:** `src/app/b/[slug]/bill-view.tsx`  
**Change:** Updated `splitAmount` calculation to use `attendeeCount` when `person_count` is not set. Also fixed `perPerson` in share text.  
**Impact:** Attendee-based group bills now correctly display per-person share amounts

---

## Recommendations for Next Sprint

1. **Fix the balances "All settled up!" message** — show contextual message based on actual debts
2. **Add bill search/filter** — even a simple text search would help
3. **Auto-link bills by email** — when a user signs up, check if any bills match their email and auto-claim them
4. **Rename invite `?code=` to `?invite=`** — prevents future parameter conflicts
5. **Add confirmation dialogs** for destructive actions (delete contribution)
6. **Dark mode** — low effort, high perceived polish
7. **Add "Enter Manually" as a tab/toggle** alongside receipt upload — not just a text link below

---

*Testing completed in ~25 minutes. 2 blocker bugs found, fixed, and deployed. Overall: TidyTab is a polished, delightful bill-splitting app that's very close to production-ready. The core user experience is smooth and the design is top-notch.*
