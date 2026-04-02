# ChipIn Design Brief — UX-Driven Redesign

## User Research

### User 1: The Host (bill creator)
- **Who**: MBA student, just paid for group dinner
- **Context**: At the restaurant or just left. Mobile, one-handed, slightly anxious about getting paid back
- **Need**: Snap receipt → share link → done. Check back later to see who's paid.
- **Constraint**: Speed. Every extra tap = abandonment risk.

### User 2: The Contributor (payer) — THE MOST IMPORTANT USER
- **Who**: Friend who received a link via iMessage/WhatsApp/text
- **Context**: Didn't choose this app. Received a link. Mobile. Low patience.
- **Need**: See what I owe → pay → done. Under 30 seconds.
- **Constraint**: ZERO tolerance for confusion. If it's not obvious, they "pay later" and forget.
- **Key insight**: Contributors outnumber hosts 5-10x. The bill view page IS the product for most users.

### User 3: Returning Host (dashboard user)
- **Who**: Regular ChipIn user managing multiple bills
- **Need**: Quick overview of who's paid and who hasn't
- **Constraint**: Wants actionable info, not vanity metrics

---

## Per-Screen Assessment

### Homepage — "Convert curious visitor to bill creator"
**North star**: "This is the easiest way to split a bill. Zero friction."

**Current issues**:
- Generic AI-generated look — flat cream bg, standard card grid, formulaic 3-step layout
- No social proof (no real numbers, no testimonials)
- No product preview — user can't see what the actual bill page looks like
- CTA competes with nav buttons visually

**Design principles**: Reassure + prompt action. Warm, fun, casual — dinner with friends, not filing taxes.

**Changes**:
1. Add atmospheric background — subtle gradient or warm noise texture
2. Social proof line ("Trusted by Berkeley MBA students" or "$XX,000+ split")
3. Product preview — phone mockup showing the bill view
4. Stronger visual hierarchy — hero headline should dominate
5. Move "how it works" to a more casual/integrated presentation
6. Make the single CTA unmissable

### Bill View — "Show what you owe, let you pay in 10 seconds"
**North star**: "Here's what you owe. Tap to pay. Done."

**Current issues**:
- Too many taps to payment: land → scroll → choose mode (claim/split/custom) → enter name → choose payment app → tap pay. That's 5-6 actions.
- The progress card is information-dense but the MOST important number (your share) isn't shown until you pick a mode
- "How would you like to chip in?" is a decision tree when most people just want to split evenly
- Items list + totals breakdown is thorough but overwhelming for a casual contributor
- Host badges and streak system add visual clutter

**Design principles**: Clarity + speed. Big numbers, clear hierarchy, minimal decisions. Friendly, low-pressure.

**Changes**:
1. Show the suggested split amount prominently ABOVE the chip-in options (if person_count exists)
2. Default to "split evenly" as the primary action, with claim/custom as secondary
3. Collapse the items list by default (expandable) — most contributors just want the number
4. Reduce the payment flow: pre-select the first available payment method
5. Bigger, more colorful payment buttons
6. Move host badges to a subtle position — this page is for the PAYER, not showcasing the host

### /new (Create Bill) — "Guide with confidence and speed"
**North star**: "Upload your receipt. We'll handle the rest."

**Current issues**:
- Upload area is a standard dashed-border dropzone
- Step indicator in header is small
- Review step is dense (many rows of inputs)
- Details step has two separate cards (Basic Info + Payment Methods) — could consolidate

**Design principles**: Guide → strong visual hierarchy, clear CTA. Efficient, confident.

**Changes**:
1. Larger, more inviting upload area with warmer styling
2. Better step indicator — larger, with step descriptions
3. Streamline the details step — single card flow
4. More encouraging copy during AI parsing ("Almost there...")

### Dashboard — "Show what needs attention first"
**North star**: "Bills that need follow-up are front and center."

**Current issues**:
- Profile section is above bills — hosts come here to check on bills, not edit their name
- Stats cards are vanity metrics (Total Bills, Collected, Active) — what they WANT is "2 bills need follow-up"
- Tab system works but "Active" should highlight unpaid contributors

**Design principles**: Inform + enable action. In control, organized.

**Changes**:
1. Move profile to bottom (or collapse it)
2. Replace generic stats with actionable ones ("2 bills need follow-up", "X outstanding")
3. Add visual urgency to bills that aren't fully covered

---

## Global Visual Direction

**Aesthetic**: Warm approachable fintech — Cash App energy meets cozy restaurant vibe

**Typography**: Keep Space Grotesk (Terry chose it, it works) but use it more boldly:
- Extreme weight contrast (200 vs 800)
- Bigger size jumps (3x+)
- Hero headlines should be much larger

**Color**: Lean harder into the warm amber/orange:
- Richer backgrounds (subtle warm gradients, not flat cream)
- More intentional use of accent colors
- Success green for fully-paid states

**Motion**: 
- Keep enter animations but make them more purposeful
- Add micro-interactions on payment actions (satisfying confirmations)
- Subtle hover states on desktop

**Atmosphere**:
- Subtle grain/noise texture overlay for warmth and depth
- Gradient accents on key sections
- Cards with more depth (subtle warm shadows)

**Performance rules (non-negotiable)**:
- No backdrop-filter
- No transition-all on interactive elements
- No min-h-dvh + flex centering
- contain: layout style on sticky headers
- Hover effects gated to @media (hover: hover)
- Custom scrollbar gated to @media (pointer: fine)
