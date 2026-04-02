# Copy Audit — Secondary Pages

**Date:** 2026-02-07  
**Deployed:** https://tidytab.app  
**Goal:** Reduce copy by 50%+, make tone confident (not cute)

## Changes Made

### Dashboard (`dashboard-view.tsx`)
- **Empty bill states:** Removed verbose motivational copy ("Time for a group dinner? Create a bill and let the splitting magic happen 🪄"). Now just shows "No active bills" / "No bills yet" + Create button.
- **Group empty state:** "No groups yet. Create one to track shared expenses." (was a full sentence about dinner crews and roommates)
- **Profile description:** Tightened to "Set up your name and payment methods to auto-fill on new bills."
- **Claim a Bill description:** "Link a bill you created before signing up." (was 2 lines)

### Login (`login/page.tsx`)
- **Removed floating blobs** (decorative background circles that added visual noise)
- **Reduced top padding** from `py-16` to `py-8 sm:py-12` — form now sits higher
- **Subtitle:** "Sign in with a magic link. No password needed." (was 2 sentences explaining the dashboard + magic link)
- **Removed** "No account? One will be created automatically." — "Send Magic Link" button is self-explanatory

### About (`about/page.tsx`)
- **The Story:** Cut from 5 paragraphs → 1 paragraph. Kept the 12-person dinner anecdote + "there had to be a better way." Switched to first person ("I built TidyTab").
- **Dead Simple:** Kept 3 steps, shortened descriptions to <10 words each.
- **What I Believe:** Cut from 4 values → 2. "Zero friction > features" + "Free means free."
- **Groups:** Cut 2 explanatory paragraphs → 1 sentence. Shortened bullet point descriptions.
- **Get in Touch:** "Feedback, bugs, or just saying hi" (was a longer sentence)
- **Removed decorative emoji** from all section headers (Sparkles, Heart, Zap, Users icons)
- **Cleaned up unused imports** (Heart, Sparkles, Zap)

### New Bill (`new/page.tsx`)
- **Step 1:** Removed "or drag & drop an image here" text. Removed file format chips (JPG, PNG, HEIC, WebP). Kept one-line note: "Works with paper receipts, screenshots, and photos"
- **Step 2:** Subtitle changed to "Edit anything that looks off" (was "Tweak anything that doesn't look right — you're the boss")
- **Step 3:** Subtitle: "Add your info and publish." (was "Almost done — add your details and you're live"). Tightened all helper text to <10 words:
  - Event name hint: "Add a name + date for easy reference"
  - Email hint: "✓ Linked to your account" / "Get notified when people pay"
  - Payment methods: "At least one required"
- **Error messages:** Made direct. "Add your name so friends know who to pay." / "Add at least one payment method."
- **Publishing state:** Removed "3, 2, 1... ✨" — now just "Generating your share link..."

## Files NOT touched (per instructions)
- `src/app/page.tsx` (homepage)
- `src/components/bill-view.tsx` (bill view)

## Estimated copy reduction
- **Dashboard:** ~50% reduction in empty states and descriptions
- **Login:** ~40% reduction (removed blobs, tightened subtitle, removed extra note)
- **About:** ~60% reduction (5 paragraphs → 1, 4 values → 2, groups section halved)
- **New Bill:** ~45% reduction in instructional/helper copy
