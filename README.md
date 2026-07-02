# Pintona

*Tu look de hoy, con IA.* — a digital wardrobe PWA. Snap your clothes, build outfits,
get an honest style opinion, and keep a board of looks you love. Available in
English, Spanish, and Vietnamese.

## Overview

Pintona is a **no-build vanilla-JS Progressive Web App**. There is no bundler,
no framework, no transpile step — just ES modules loaded directly by the
browser. This is a deliberate choice (see "No build step by design" below).

- **Auth / data / storage:** Firebase (Auth, Firestore, Storage)
- **AI look feedback:** Vercel serverless function `/api/gemini` proxies to
  **Gemini 2.5 Flash**
- **Background removal:** Vercel serverless function `/api/removebg` proxies
  to **remove.bg**
- **i18n:** `i18n.js` ships `en`, `es`, `vi` translations, switchable in-app
- **PWA:** installable, offline-aware via `sw.js`, manifest at `manifest.json`

## Architecture

```
 Browser (vanilla JS, ES modules, no build)
   │
   ├─ Firebase Auth ───────────────► Firebase project (Google sign-in)
   ├─ Firestore ───────────────────► wardrobe items, outfits, board, profile
   ├─ Firebase Storage ────────────► garment / reference photos
   │
   ├─ fetch('/api/gemini') ──► Vercel serverless ──► Gemini 2.5 Flash API
   │                              (verifies Firebase ID token first)
   │
   └─ fetch('/api/removebg') ► Vercel serverless ──► remove.bg API
                                  (verifies Firebase ID token first)
```

## Local setup

1. Serve the static files (no build step, any static server works):
   ```
   npx serve .
   ```
2. Copy the Firebase web config and fill in your project's values:
   ```
   cp firebase-config.example.js firebase-config.js
   ```
   `firebase-config.js` is git-ignored; it holds only public Firebase web
   config values (safe to expose client-side), not secrets.
3. Open the served URL in a browser and sign in with Google.

The serverless API routes (`/api/gemini`, `/api/removebg`) only work when
deployed to Vercel (or run via `vercel dev` locally), since they're not part
of the static file set.

## Environment variables

Set these in the Vercel project (Project Settings → Environment Variables):

| Variable              | Required | Purpose                                                              |
|-----------------------|----------|-----------------------------------------------------------------------|
| `GEMINI_API_KEY`      | Yes      | Calls Gemini 2.5 Flash from `/api/gemini` for look feedback           |
| `REMOVEBG_API_KEY`    | Yes      | Calls remove.bg from `/api/removebg` for background removal           |
| `FIREBASE_WEB_API_KEY`| No       | Used by the API to verify Firebase ID tokens; falls back to the public web API key already embedded in `firebase-config.js` if unset |

## Deploying

**Firebase rules** (Firestore + Storage security rules):
```
firebase deploy --only firestore:rules,storage
```

**App + API** (Vercel):
```
vercel --prod
```

## No build step by design

Pintona intentionally ships plain ES modules straight to the browser:

- Zero tooling means zero drift between "what's on disk" and "what runs."
- Any file can be opened, read top to bottom, and understood without
  reverse-engineering a bundle.
- Deploys are just "copy the files" — Vercel serves the static assets as-is
  and only the `/api/*` routes run as serverless functions.

If the project ever needs bundling (code-splitting, TypeScript, etc.), treat
that as a deliberate, separately-discussed migration — not an incremental
drift.
