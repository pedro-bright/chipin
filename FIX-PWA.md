# PWA / Service Worker Fixes — 2026-02-07

## M3: PWA install prompt overlaps form at 320px

**Problem:** The floating install prompt (`fixed bottom-4`) overlapped Subtotal/Tax fields on iPhone SE (320px viewport).

**Fix:** Rewrote `src/components/pwa-install-prompt.tsx`:
- Changed from `fixed bottom-4` overlay → static top banner (non-fixed, flows with content)
- Added route suppression: prompt is hidden on `/new`, `/b/`, `/g/` pages where forms are active
- Dismiss button now has explicit 44×44px touch target (`min-width: 44px; min-height: 44px`)
- Compact single-line layout that doesn't push content significantly

## M4: Service worker caches stale pages

**Problem:** No service worker existed previously (no `sw.js`, no registration). The manifest.json was present but no SW backed it. Dynamic routes could be subject to aggressive browser/CDN caching with no SW to enforce freshness.

**Fix:** Created a proper service worker setup:

### `public/sw.js` (new)
- **Navigation requests** → Network-first strategy (always fetches fresh HTML, falls back to cache only when offline)
- **Static assets** (JS, CSS, fonts, images) → Cache-first strategy (fast loads, offline support preserved)
- **Dynamic/API paths** (`/api/`, `/dashboard`, `/b/`, `/g/`) → Network-only, never cached by SW
- On activate: purges old caches, immediately claims all clients

### `src/components/sw-register.tsx` (new)
- Client component that registers `/sw.js` on mount
- Added to `layout.tsx`

### `src/app/layout.tsx` (updated)
- Imports and renders `<SWRegister />`
- Moved `<PWAInstallPrompt />` from after children to before children (top of page)

## Deployed
- Production: https://tidytab.app
- Deploy URL: https://chipin-9rcd3o5m5-pedro-brights-projects.vercel.app
