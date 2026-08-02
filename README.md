# Quran Context Search

Search the Quran by topic or meaning and get the most relevant ayat with a tafsir excerpt, in a copy-paste-friendly card.

## Stack

- React 18 + Vite
- Tailwind CSS
- [UmmahAPI](https://ummahapi.com/api/docs) — free, no signup required

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### API keys

Copy `.env.example` to `.env` and set:
- `VITE_UMMAH_API_KEY` — optional, gets a 5x higher rate limit on UmmahAPI. Not required for the app to function. Client-side (bundled into the JS) — fine to expose since it's a free service with no billing risk.
- `DEEPSEEK_API_KEY` — optional, powers the Phase 3 fallback search (see below). **Server-side only** (no `VITE_` prefix) — read by [api/ai.js](api/ai.js), a Vercel serverless function, so the key is never bundled into client JS. Without it (and without a user-supplied key, see below), fallback is silently skipped and the app just shows the empty state.

Restart `npm run dev` after changing `.env` (Vite only reads env vars at startup).

**Local dev note:** `vite dev` doesn't run Vercel's serverless functions, so [vite.config.js](vite.config.js) mounts `api/ai.js` as dev middleware — `npm run dev` exercises the real AI path, not just the failure path. Without `DEEPSEEK_API_KEY` set, AI features degrade gracefully (empty summaries, no fallback search) while the rest of the app works normally.

## How it works (Phase 1 — pure API matching)

1. User types a free-text query, or clicks a suggestion chip (Haidh, Rizq, Sabr, Dua).
2. `GET /api/quran/search?q={query}` returns candidate ayat matched against Arabic, transliteration, and the Sahih International translation.
3. For each candidate, `GET /api/tafsir/ibn_kathir/surah/{surah}/ayah/{ayah}` fetches an Ibn Kathir tafsir excerpt, loaded in parallel per card.
4. Results render as cards: Arabic text, translation (query terms highlighted), an AI tafsir summary (see below), and a Copy button that copies the Arabic ayah plus `Surah X Ayah Y: {translation}` to the clipboard.
5. No API key is required — one is only needed for a 5x higher rate limit, not for core functionality.

### Known limitation

`/api/quran/search` only matches translation/transliteration text, not tafsir content. A query like "haidh" won't match against the Sahih International translation because it says "menstruation" instead. Searching "menstruation" (EN) or "haid" (ID, the correct Indonesian spelling) correctly surfaces Al-Baqarah 2:222 and At-Talaq 65:4. Phase 3 (below) closes this gap automatically.

## Phase 3 — hybrid search fallback (DeepSeek)

When the direct API search returns zero results, [src/lib/ai.js](src/lib/ai.js) runs a 3-step fallback using DeepSeek's Anthropic-compatible API (`deepseek-v4-flash`, thinking disabled for speed/cost):

1. **Expand** — ask the model for 6 alternative search terms in the active UI language. The prompt specifically asks for the *literal action phrasing* the Quran translation would use (e.g. "basuhlah wajahmu" for wudhu), not just topic/fiqh labels, and separately for proper-noun spelling variants (e.g. "zakariya" → "zakaria") when the query looks like a name.
2. **Search** — retry `/api/quran/search` with each alternative term and merge all unique verses found (capped at 8 candidates) into a shortlist.
3. **Verify** — send the shortlist back to the model along with the original query and ask it to filter out false positives (e.g. a ghusl/"mandi" verse that matched a term but isn't actually about wudhu) and return only the genuinely relevant verses.

Each card highlights the specific term that verse matched on, and a banner shows which term(s) were used (e.g. "Kewajiban Wudhu" → matched via "basuhlah wajahmu"). This is query-expansion + relevance-filtering, not full semantic re-ranking — cheap (well under a hundredth of a cent per step) and only runs when the direct search comes back empty, so normal searches have zero added latency or cost.

### Bring-your-own DeepSeek key

DeepSeek's shared key can hit rate limits or (during peak UTC hours) 2x pricing under shared public traffic. A gear icon (⚙ AI) in the header opens a settings panel where any user can paste their own DeepSeek API key ([platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)); it's stored in `localStorage` only and sent along with each fallback request, where [api/ai.js](api/ai.js) prefers it over the app's shared `DEEPSEEK_API_KEY`. If the shared key hits a rate limit, the app surfaces a clear message pointing at this setting instead of silently showing an empty result (see `fallbackError` state in [src/App.jsx](src/App.jsx)) — a plain connection/server failure gets a separate generic message.

### Tafsir

Rather than dumping the full Ibn Kathir excerpt (some run 10k+ characters), each card gets a 3-6 bullet AI summary (translated to Indonesian when the UI is in ID). Cards show **one** bullet by default; "Baca selengkapnya..." expands the rest and reveals a link to the matching ayah on [tafsirweb.com](https://tafsirweb.com) for the full commentary — the link stays hidden while collapsed so the default card stays tidy. Ayat translations also get a footnote-marker cleanup pass ([src/lib/cleanText.js](src/lib/cleanText.js)) — UmmahAPI embeds reference numbers directly in the string with no brackets ("wives1", "themselves,2"), which read as random stray digits otherwise.

### Dua welcome modal & pre-translated cache

On first load, a modal shows a random dua from `/api/duas/random` with a Continue button gating access. Rather than translating it live on every page load (burning AI tokens on the same ~126 duas repeatedly), [scripts/generate-dua-translations.mjs](scripts/generate-dua-translations.mjs) pre-translates the entire dua catalog once into [src/data/duaTranslations.json](src/data/duaTranslations.json), bundled as a static asset — the modal looks up the dua's Indonesian text there first (zero AI cost, instant). A [src/lib/duaCache.js](src/lib/duaCache.js) `localStorage` cache is the fallback for any dua not in the bundle (e.g. one UmmahAPI adds later), and only a genuinely new dua triggers a live translation, which then gets cached for next time.

Re-run the script if UmmahAPI's dua catalog changes:

```bash
node --env-file=.env scripts/generate-dua-translations.mjs
```

### Language

A toggle in the header switches between Indonesian (ID, default) and English (EN). This changes the UI copy, the suggestion chips, and which translation source is searched (`indonesian` vs `sahih_international`). UmmahAPI has no Indonesian tafsir (only English Ibn Kathir/Ma'arif and Arabic Muyassar/Ibn Kathir), so tafsir summaries are translated to Indonesian via DeepSeek when the UI is in ID.

### Installable (PWA)

The app is a Progressive Web App — installable to the home screen on Android and iOS, with the app shell precached by a service worker so it opens instantly and survives a flaky connection. UmmahAPI responses are cached at runtime with a NetworkFirst strategy, so previously-viewed searches still render offline while a reachable network always wins.

Install is offered on first visit (after the dua modal, so overlays never stack) and stays available from a **Pasang / Install** button in the header for anyone who dismissed it. Three paths, because the platforms genuinely differ:

| Platform | Behaviour |
|---|---|
| Android / desktop Chromium | Captures `beforeinstallprompt` and triggers the browser's native install dialog |
| iOS **Safari** | No install API exists — shows the manual Share → *Add to Home Screen* steps |
| iOS Chrome / Firefox / Edge | Apple only exposes Add to Home Screen in Safari, so it says to reopen in Safari |

Icons are generated from the same artwork as the favicon by [scripts/generate-pwa-icons.mjs](scripts/generate-pwa-icons.mjs) — re-run it if the artwork changes:

```bash
node scripts/generate-pwa-icons.mjs
```

The service worker only runs in a production build, so use `npm run preview` (not `npm run dev`) to test PWA behaviour locally.

## Project structure

```
api/
  ai.js                     # Vercel serverless proxy — keeps DEEPSEEK_API_KEY server-side
scripts/
  generate-dua-translations.mjs  # one-time batch: pre-translate all duas to Indonesian
  generate-pwa-icons.mjs         # renders the PWA/apple/maskable icon set
src/
  components/
    SearchBar.jsx          # input + suggestion chips
    ResultCard.jsx         # Arabic, translation, tafsir bullets, copy button
    LoadingState.jsx
    EmptyState.jsx
    SettingsModal.jsx      # bring-your-own DeepSeek key panel
    DuaWelcomeModal.jsx    # first-load random dua gate
    InstallPrompt.jsx      # PWA install banner / modal
  data/
    duaTranslations.json   # pre-translated dua catalog (id -> {title, translation})
  lib/
    api.js                 # UmmahAPI fetch wrappers
    ai.js                   # DeepSeek query-expansion fallback + BYOK key storage
    cleanText.js             # strips embedded footnote-marker digits
    duaCache.js              # localStorage cache for on-demand dua translations
    pwaInstall.js            # install-prompt capture + platform detection
    tafsirweb.js             # builds tafsirweb.com deep links
    highlight.jsx           # query-term highlighting helper
  App.jsx                   # search orchestration
```

## Roadmap

- **Phase 2:** tafsir source selector (Ibn Kathir / Ma'arif / Muyassar / Ibn Kathir Arabic), audio playback per ayah, word-by-word breakdown.
- **Phase 3 (done):** hybrid search — DeepSeek-powered query-expansion fallback when pure API matching returns no results. See above.

## Deployment

Deployed on [Vercel](https://vercel.com) (required for the `api/ai.js` serverless function — a plain static host like Netlify won't run it). Set `VITE_UMMAH_API_KEY` and `DEEPSEEK_API_KEY` in Project Settings → Environment Variables, then redeploy.

```bash
npm run build
```

Output is in `dist/`.
