# Pintona — Project Context

> Regenerated: 2026-07-01. Intended for AI agents continuing work on this project.
> Supersedes the 2026-05-18 version, which described a much earlier state.

## Overview

Pintona (`marta-wardribe`) is a mobile-first, **no-build** vanilla-JS PWA: a personal
digital wardrobe with AI styling. Users sign in with Google (Firebase Auth), upload
clothing photos (compressed client-side, background removed via remove.bg, stored in
Firebase Storage, auto-categorised by Gemini), assemble outfits, and get an AI rating
tuned by a chosen "vibe" and personal style-reference photos. UI in en / es / vi.

## Architecture

```
Browser (index.html — all CSS + JS inline, ES modules via esm.sh importmap)
 ├─ firebase.js        Auth (Google popup), exports auth/db/storage/currentUid,
 │                     dispatches window event 'pintona:auth' on sign-in
 ├─ i18n.js            translations {en,es,vi}, t()/lang/setLang, localStorage pintona_lang
 ├─ sw.js              SW v2: network-first HTML/JS, SWR fonts+storage images,
 │                     network-only /api/*, offline.html fallback. Bump VERSION on deploy.
 └─ /api (Vercel serverless, CommonJS)
     ├─ _auth.js       verifies Firebase ID token via identitytoolkit accounts:lookup
     ├─ gemini.js      → gemini-2.5-flash; requires Bearer ID token; imageUrls
     │                   restricted to firebasestorage.googleapis.com, max 8; prompt ≤4000
     └─ removebg.js    → remove.bg (size=preview, free tier); requires Bearer ID token
```

## Data model

- Firestore `users/{uid}/items/{id}`: `{id, src, name, category}` — wardrobe, newest-first (`orderBy id desc`)
- Firestore `users/{uid}/board/slots`: `{slot0..slot5: url}` — inspiration photos
- Firestore `users/{uid}/style-profile/{id}`: `{id, src}` — up to 5 style references
- Storage `users/{uid}/items|board|style-profile/…` — images; item delete also deletes the Storage object
- localStorage: `marta_outfit` = `{category: itemId}` (IDs only — resolved at render, pruned on load),
  `pintona_lang`, `pintona_vibe`, `pintona_onboarded`
- Rules (firestore.rules / storage.rules): everything scoped to `request.auth.uid == uid`

## UI

Four tabs (Wardrobe / Outfit / Board / Today) toggled by `switchTab` (View Transitions
API when available). Login screen with stroke-draw hanger logo; 3-step onboarding;
profile sheet (style references); language screen + in-app modal.

Design tokens live in `:root` in index.html (`--bg --ink --card --surface --hairline
--muted-1..5 --error --r-* --font-display --font-body --dur --ease`). Additive CSS layer
provides skeleton shimmer, staggered `.card-enter`, press states, checkmark draw-in,
`#toast`, and inline `EMPTY_ART` line-art empty states — all gated behind
`prefers-reduced-motion: no-preference`. Untrusted text (Gemini/Firestore names,
feedback) must go through `esc()` before `innerHTML`.

## Environment / deploy

- Vercel: static + /api functions. Env vars: `GEMINI_API_KEY`, `REMOVEBG_API_KEY`,
  optional `FIREBASE_WEB_API_KEY`. `vercel.json` sets HSTS/nosniff/CSP headers —
  update CSP when adding external origins.
- Firebase: `firebase deploy --only firestore:rules,storage`
- `firebase-config.js` is committed intentionally (public web config; data guarded by rules).
- No bundler/tests by design. Validate JS with `node --check` (extract inline module first).

## Known gaps / next candidates

- Today tab is not actually AI (copy is honest about it); wiring Gemini suggestion is the
  natural next feature (wardrobe + vibe + style profile → structured outfit JSON).
- No outfit history / saved looks; rating feedback is overwritten each time.
- remove.bg `size: 'preview'` caps item images at ~0.25 MP (free tier trade-off).
- Icons are SVG-only; iOS home-screen prefers PNG apple-touch-icon.
- No rate limiting on /api/* beyond auth.
