# Pintona — Complete Project Context

> Generated: 2026-05-18. Intended for AI agents continuing work on this project.

---

## 1. Project Overview

Pintona (`marta-wardribe`) is a mobile-first Progressive Web App (PWA) that lets a user manage a personal digital wardrobe and build outfits, then receive AI-generated style feedback. A user signs in with Google (Firebase Auth), uploads photos of clothing items, and the app automatically categorises each item using the Gemini 1.5 Flash vision model. The user can then assemble an outfit from the wardrobe grid and have Gemini score and critique it. The app is currently functional as a single-page vanilla-JS web app: auth works, local wardrobe data is stored in `localStorage`, Gemini is called **directly from the browser** with an inline API key placeholder. Firebase Firestore and Firebase Storage are initialised but **not yet used** — all data is local-only. The `api/gemini.js` serverless proxy exists but is **not wired up**.

---

## 2. Tech Stack

### npm Dependencies (`package.json`)

| Package | Version | Used for | Status |
|---|---|---|---|
| `firebase` | `^12.13.0` | Firebase SDK (Auth, Firestore, Storage) | **Partially wired**: Auth is fully integrated. Firestore and Storage are imported and exported from `firebase.js` but never called anywhere in the application logic. |

### CDN / Runtime Dependencies (not in package.json)

| Source | What it provides |
|---|---|
| Google Fonts (`fonts.googleapis.com`) | `Cormorant Garamond` (headings, scores) and `DM Sans` (body) |
| `esm.sh/firebase@12.13.0` | Firebase SDK loaded via ES Module importmap in `index.html` (mirrors the npm package; both coexist) |
| `generativelanguage.googleapis.com` | Gemini 1.5 Flash REST API — called directly from browser JS |

### Dev tooling
None. There is no bundler, transpiler, linter, or test runner configured. The `package.json` `test` script is a placeholder that exits with an error.

---

## 3. File Structure

```
marta-wardribe/
├── index.html              # Entire application: HTML, CSS (~300 lines), JS (~120 lines)
├── firebase.js             # Firebase init + Google Auth wiring
├── firebase-config.js      # Live Firebase project credentials (gitignored, contains real keys)
├── firebase-config.example.js  # Template with placeholder values
├── sw.js                   # Service Worker (cache-first PWA shell, network-first for API)
├── manifest.json           # PWA manifest (name "Pintona", standalone display)
├── offline.html            # Offline fallback page shown by SW when navigation fails
├── package.json            # Node project metadata, single dependency: firebase
├── README.md               # Empty (only contains the repo name as an H1)
└── api/
    └── gemini.js           # Serverless function handler (Vercel/Next-style) — NOT wired up
```

### Per-file detail

#### `index.html`
- **What it does**: The entire application. Contains all CSS in a `<style>` block, all HTML markup, all vanilla-JS logic in an inline `<script>`, and loads `firebase.js` as a module.
- **State**: Complete and functional for the core wardrobe + outfit + Gemini rating flow.
- **Known issues / TODOs**:
  - `const GEMINI_KEY = 'PASTE_YOUR_KEY_HERE';` — the Gemini API key is a **placeholder**. The app will silently fail on any AI call until this is replaced with a real key. **Security risk**: exposing an API key in client-side HTML. The correct fix is to route through `api/gemini.js`.
  - All wardrobe data is stored in `localStorage` (`marta_items`, `marta_outfit`). Switching to Firestore is planned but not started.
  - Uploaded images are stored as base64 data URLs in `localStorage`. This will hit the ~5 MB localStorage limit quickly. Migration to Firebase Storage is planned but not started.
  - The `callGemini()` function inside the inline script duplicates the logic that belongs in `api/gemini.js`. Once the proxy is wired, this inline function should be removed and replaced with a `fetch('/api/gemini')` call.
  - Mixed UI language: tab labels and button text are in English (`Wardrobe`, `Outfit`, `Add piece`, `Rate this look`, `Sign out`); the tagline, offline page, and some empty states are in Spanish (`Tu look`, `Tu look de hoy, con IA`, `Sin conexión`). No i18n system is in place.
  - No error boundary or toast system — errors are shown only in the feedback box area.

#### `firebase.js`
- **What it does**: Imports Firebase SDK modules, initialises the app, exports `auth`, `db` (Firestore), and `storage`. Wires up Google sign-in popup, `onAuthStateChanged` to toggle `#login-screen` / `#app` visibility, and sign-out.
- **State**: Complete for Auth. `db` and `storage` exports are dead weight — nothing imports `firebase.js` to consume those exports (the module is loaded as a side-effect `<script type="module" src="/firebase.js">`).
- **Known issues / TODOs**:
  - `db` and `storage` are exported but never consumed. Need a data layer module that imports them.
  - The auth state change only toggles UI; it does not load or sync the user's wardrobe from Firestore.

#### `firebase-config.js`
- **What it does**: Exports the `firebaseConfig` object with real project credentials.
- **State**: Contains **live production credentials** (API key, project ID, app ID, measurement ID). This file is described as gitignored but the `.gitignore` is not present in the workspace — verify it is not committed.
- **⚠ Security**: The `apiKey` visible here is the Firebase Web API key, which is intended to be public (Firebase security rules protect the data), but it must still be restricted to authorised domains in the Firebase console.

#### `firebase-config.example.js`
- **What it does**: Template with placeholder strings. New contributors copy this to `firebase-config.js` and fill in their values.
- **State**: Complete as a template.

#### `sw.js`
- **What it does**: Service Worker with `pintona-v1` cache. Pre-caches `/`, `/index.html`, `/offline.html`, `/manifest.json` on install. Uses **network-first** for `/api/*` and `generativelanguage.googleapis.com`. Uses **cache-first** for everything else (same origin + Google Fonts). Serves `/offline.html` for failed navigations, transparent SVG for failed images.
- **State**: Complete and well-structured.
- **Known issues / TODOs**:
  - Cache version is hardcoded (`pintona-v1`). Must be bumped manually on deploys to bust the cache.
  - Does not cache `firebase.js` or the `esm.sh` Firebase CDN bundles, so offline auth state can't be restored without a network call.

#### `manifest.json`
- **What it does**: PWA web app manifest. Sets app name to `Pintona`, standalone display, portrait orientation, background/theme colour `#faf9f7`.
- **State**: Functional.
- **Known issues / TODOs**:
  - Icons point to `https://fav.farm/👗` (a third-party emoji favicon service). For production, replace with proper PNG icons at 192×192 and 512×512 hosted in the repo.
  - No `shortcuts`, `screenshots`, or `categories` defined.

#### `offline.html`
- **What it does**: Full-page offline fallback with the Pintona logo SVG, a Spanish-language message ("Tu ropa está guardada en el dispositivo, pero la IA necesita internet…"), and a link back to `/`.
- **State**: Complete.

#### `api/gemini.js`
- **What it does**: A Vercel/Next.js-style serverless function handler. Reads `prompt`, `imageBase64`, and `mimeType` from `req.body`. Proxies the request to Gemini 1.5 Flash using `process.env.GEMINI_API_KEY` (server-side key). Returns the Gemini response JSON.
- **State**: Stubbed / not wired up. The function is correct but:
  - No deployment config (no `vercel.json`, no `next.config.js`).
  - The app never calls `/api/gemini` — it calls the Gemini API directly with the inline placeholder key.
  - CORS headers are set with `Access-Control-Allow-Origin: *` which is acceptable for a public API proxy but should be locked down to the app's own domain in production.
- **Known issues / TODOs**:
  - Wire this up: remove the inline `callGemini()` from `index.html`, replace with `fetch('/api/gemini', { method: 'POST', body: JSON.stringify({prompt, imageBase64, mimeType}) })`.
  - Add `GEMINI_API_KEY` as an environment variable in the hosting provider.
  - Add error handling / rate limiting.

#### `package.json`
- **What it does**: Node project manifest. No build scripts, no dev server, no test runner.
- **State**: Minimal / placeholder.
- **Known issues / TODOs**:
  - `"main": "sw.js"` is semantically incorrect (a service worker is not a Node entry point). This is harmless but misleading.
  - No `devDependencies`. Consider adding a local dev server (e.g., `vite`, `serve`) to the scripts.

#### `README.md`
- **What it does**: Nothing — contains only `# marta-wardribe`.
- **State**: Empty / placeholder.

---

## 4. Navigation & Routing

There is **no routing library**. The app is a single HTML page with two "views" toggled by CSS (`display: none` / `display: flex`) and a tab bar.

### Tab navigation

| Tab label | View element ID | Description |
|---|---|---|
| `Wardrobe` | `#view-wardrobe` | Clothing grid with category filter chips. Default active tab. |
| `Outfit` | `#view-outfit` | Selected outfit slots + Rate button + AI feedback area. |

**Switch mechanism**: The `switchTab(name, btn)` JS function removes `.active` from all `.tab` and `.view` elements, then adds it to the clicked button and the matching `#view-{name}` element.

### Screens / states

| State | Trigger | What shows |
|---|---|---|
| Auth — loading | Page load | `#login-screen` visible, `#app` hidden (default HTML state) |
| Auth — unauthenticated | `onAuthStateChanged` → `user === null` | `#login-screen` shown, `#app` hidden |
| Auth — authenticated | `onAuthStateChanged` → `user !== null` | `#login-screen` hidden, `#app` shown |
| Offline | SW intercepts failed navigation | `offline.html` served by service worker |

### Deep links / URL routing
None. URL does not change when switching tabs. Back button does nothing meaningful.

---

## 5. State Management

No state management library. All state is plain JS variables and `localStorage`.

### Global JS variables (declared in inline `<script>` in `index.html`)

| Variable | Type | Description | Persisted |
|---|---|---|---|
| `items` | `Array<Item>` | All clothing items in the wardrobe | `localStorage` key `marta_items` |
| `outfit` | `Record<Category, Item>` | Currently selected outfit (at most one item per category) | `localStorage` key `marta_outfit` |
| `activeCategory` | `string` | Currently selected wardrobe filter (`'all'` or a category name) | Not persisted |

### `Item` object shape
```js
{
  id: number,          // Date.now() at upload time
  src: string,         // base64 data URL of the image
  name: string,        // 2–4 word name from Gemini (or '...' while analyzing)
  category: string,    // one of CATS
  analyzing: boolean   // true while Gemini classification is in-flight
}
```

### `localStorage` keys

| Key | Format | Description |
|---|---|---|
| `marta_items` | JSON array of `Item` | Full wardrobe |
| `marta_outfit` | JSON object `{[category]: Item}` | Active outfit selection |

### Firebase Auth state
Managed by `onAuthStateChanged` in `firebase.js`. No user object is stored in a variable accessible to the main script — only the display name is written to `#user-name` in the DOM.

### Planned / not yet implemented
- Firestore: user-scoped wardrobe data synced across devices. `db` is exported from `firebase.js` but never written to.
- Firebase Storage: image hosting instead of base64 in localStorage. `storage` is exported but never used.

---

## 6. Components

There is **no `/components` directory** and no component framework. The UI is constructed with raw DOM manipulation functions in the inline `<script>`.

### Functional "components" (render functions)

#### `renderGrid()`
- **Props / inputs**: Reads global `items`, `outfit`, `activeCategory`.
- **Renders**: `#clothesGrid` — an "Add piece" upload card followed by one `.cloth-card` per item matching the active category. Selected items show a checkmark overlay. Items being analysed show a spinner overlay.
- **State**: Complete.

#### `renderOutfit()`
- **Props / inputs**: Reads global `outfit`.
- **Renders**: `#outfitSlots` — either an empty-state message or one `.outfit-slot` row per selected item in display order (`ORDER` array). Each slot has a thumbnail, category label, name, and a remove (×) button.
- **State**: Complete.

#### Login screen (inline HTML)
- **Renders**: Full-screen overlay with animated SVG logo (stroke-dashoffset draw animation), app title, tagline, Google sign-in button, error message area.
- **State**: Complete.

---

## 7. Screens

### Login Screen (`#login-screen`)

| Aspect | Detail |
|---|---|
| Current UI | Full-screen white overlay, centered card. SVG logo animates drawing itself on load (6-part sequential stroke animation, total ~2.2 s). Title "Pintona" and tagline "Tu look de hoy, con IA" fade up. "Continue with Google" button appears last. |
| Hardcoded | All text; animation timings. |
| Dynamic | Button disabled state while sign-in is in progress. Error message from Firebase auth errors. |
| API calls | `signInWithPopup(auth, provider)` (Google OAuth via Firebase). |
| Missing | No loading spinner between button click and popup opening. No "already authenticated, redirecting…" state (the auth check is instant from cache). |

---

### Wardrobe Tab (`#view-wardrobe`)

| Aspect | Detail |
|---|---|
| Current UI | Horizontal scrollable category filter chips (`All`, `Tops`, `Bottoms`, `Dresses`, `Outerwear`, `Shoes`, `Accessories`). Below: a 3-column CSS grid of clothing cards. First card is always the "Add piece" upload button. |
| Hardcoded | Category list (`CATS`, `ORDER` constants). Grid column count (3). |
| Dynamic | Grid items from `items` array; selected state from `outfit`; spinner overlay while `analyzing: true`. |
| API calls | On file upload: reads image as base64, calls `callGemini()` → Gemini REST API with vision prompt to classify the item into name + category. |
| Missing | No delete/remove individual item from wardrobe. No edit (rename, re-categorise) flow. No empty-state illustration when wardrobe is empty (only shows the upload card). Data is only local — no cross-device sync. Images stored as base64 will quickly exhaust localStorage. |

---

### Outfit Tab (`#view-outfit`)

| Aspect | Detail |
|---|---|
| Current UI | List of selected outfit pieces in `ORDER` sequence. Each row: thumbnail, category badge, item name, remove button. Below the list: "Rate this look ✦" button (disabled if fewer than 2 pieces selected). Below the button: AI feedback box (hidden until rated). |
| Hardcoded | Display order (`ORDER` array). Minimum 2 items to enable rating. |
| Dynamic | Slot list from `outfit` object. Button disabled state. Feedback box content from Gemini response. |
| API calls | `rateOutfit()` calls `callGemini()` with a text-only prompt listing the outfit pieces by category + name. Gemini returns a score and 2–3 sentence critique. |
| Missing | No outfit history / saved looks. No share or screenshot feature. No image-based rating (sends text description only, not the actual images). Feedback box replaces itself on each new rating with no history. |

---

### Offline Screen (`offline.html`)

| Aspect | Detail |
|---|---|
| Current UI | Centered: SVG logo, "Sin conexión" heading, explanatory Spanish-language paragraph, "Volver a Pintona" link. |
| Hardcoded | Everything. |
| Dynamic | Nothing. |
| Missing | Does not indicate which wardrobe data is available locally. |

---

## 8. i18n / Translations

There is **no i18n framework or translation system**. All strings are hardcoded directly in HTML and JS.

### Current language state

The UI is **inconsistently bilingual** — English and Spanish are mixed without a coherent strategy:

| Location | Language | Strings |
|---|---|---|
| `index.html` — tab bar | English | `Wardrobe`, `Outfit` |
| `index.html` — header | Spanish | `Tu look` |
| `index.html` — category chips | English | `All`, `Tops`, `Bottoms`, `Dresses`, `Outerwear`, `Shoes`, `Accessories` |
| `index.html` — upload card | English | `Add piece` |
| `index.html` — rate button | English | `Rate this look ✦` |
| `index.html` — outfit empty state | English | `Select pieces from your wardrobe to build a look` |
| `index.html` — login | Mixed | Title: `Pintona` (brand); tagline: `Tu look de hoy, con IA` (Spanish); button: `Continue with Google` (English); error: `Sign-in failed. Please try again.` (English) |
| `index.html` — feedback error | English | `Could not reach the style engine. Try again.` |
| `index.html` — gemini loading | English | `Analysing the look…` |
| `index.html` — header sign-out | English | `Sign out` |
| `index.html` — manifest description | Spanish | `Tu look de hoy, con IA.` |
| `offline.html` | Spanish | `Sin conexión`, `Tu ropa está guardada en el dispositivo, pero la IA necesita internet. Volvé cuando tengas señal.`, `Volver a Pintona` |
| Gemini prompt (classification) | English | `Categorize this clothing item. Reply ONLY with JSON: {"name":"short name 2-4 words","category":"…"}. No markdown.` |
| Gemini prompt (rating) | English | `I am putting together an outfit: …. Rate it from 1-10 and give 2-3 sentences of honest chic fashion editor feedback. Start with the score like "8/10".` |

### Missing keys / inconsistencies

- The Gemini classification prompt requests item names in English (`"short name 2-4 words"`), so items uploaded by a Spanish speaker will be named in English.
- `offline.html` is entirely in Spanish but the main UI tabs are in English.
- No mechanism to switch language at runtime.
- No translation file of any kind (`.json`, `.po`, etc.).

### Recommended next step
Decide on a single target language (the app's target audience appears Spanish-speaking given `Tu look de hoy, con IA`). Translate all English UI strings to Spanish (or vice versa), then optionally introduce a lightweight i18n map object before adding a third language.

---

## 9. Known Issues & Immediate Next Steps (Priority Order)

1. **🔴 Security — Gemini API key exposed client-side**: Replace `const GEMINI_KEY = 'PASTE_YOUR_KEY_HERE'` with a `fetch('/api/gemini', …)` call and wire up `api/gemini.js` with `GEMINI_API_KEY` as a server-side environment variable.
2. **🔴 Security — Firebase config committed**: Confirm `firebase-config.js` is in `.gitignore`. Restrict the Firebase API key to authorised domains in the Firebase Console.
3. **🟠 Data loss risk — base64 images in localStorage**: Migrate image storage to Firebase Storage. Store only the download URL in Firestore/localStorage.
4. **🟠 No cloud persistence**: Implement Firestore CRUD for the `items` array, scoped to the authenticated user's UID. `db` is already exported from `firebase.js`.
5. **🟡 Language consistency**: Pick one language for the UI and standardise all strings.
6. **🟡 No deploy config for `api/gemini.js`**: Add `vercel.json` or equivalent to make the serverless function deployable.
7. **🟡 No item management**: Add delete and re-categorise actions on wardrobe cards.
8. **🟢 PWA icons**: Replace `fav.farm` emoji icons with locally hosted PNGs.
9. **🟢 README**: Document setup, environment variables, and deployment.
