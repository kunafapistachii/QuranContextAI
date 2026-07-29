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
- `GEMINI_API_KEY` — optional, powers the Phase 3 fallback search (see below). **Server-side only** (no `VITE_` prefix) — read by [api/gemini.js](api/gemini.js), a Vercel serverless function, so the key is never bundled into client JS. Without it (and without a user-supplied key, see below), fallback is silently skipped and the app just shows the empty state.

Restart `npm run dev` after changing `.env` (Vite only reads env vars at startup).

**Local dev note:** `npm run dev` runs Vite only, which doesn't serve `/api/*` routes — the Gemini fallback will fail locally with a generic connection error (harmless; the rest of the app works fine). To test the fallback locally, use `vercel dev` instead, or just test after deploying.

## How it works (Phase 1 — pure API matching)

1. User types a free-text query, or clicks a suggestion chip (Haidh, Rizq, Sabr, Dua).
2. `GET /api/quran/search?q={query}` returns candidate ayat matched against Arabic, transliteration, and the Sahih International translation.
3. For each candidate, `GET /api/tafsir/ibn_kathir/surah/{surah}/ayah/{ayah}` fetches an Ibn Kathir tafsir excerpt, loaded in parallel per card.
4. Results render as cards: Arabic text, translation (query terms highlighted), a truncated tafsir excerpt (also highlighted), and a Copy button that copies `Surah X Ayah Y: {translation}` to the clipboard.
5. No API key is required — one is only needed for a 5x higher rate limit, not for core functionality.

### Known limitation

`/api/quran/search` only matches translation/transliteration text, not tafsir content. A query like "haidh" won't match against the Sahih International translation because it says "menstruation" instead. Searching "menstruation" (EN) or "haid" (ID, the correct Indonesian spelling) correctly surfaces Al-Baqarah 2:222 and At-Talaq 65:4. Phase 3 (below) closes this gap automatically.

## Phase 3 — hybrid search fallback (Gemini)

When the direct API search returns zero results, [src/lib/gemini.js](src/lib/gemini.js) runs a 3-step fallback using the Gemini API (`gemini-2.5-flash`, thinking disabled for speed/cost):

1. **Expand** — ask Gemini for 6 alternative search terms in the active UI language. The prompt specifically asks for the *literal action phrasing* the Quran translation would use (e.g. "basuhlah wajahmu" for wudhu), not just topic/fiqh labels — translation text almost never contains a ritual's fiqh name verbatim.
2. **Search** — retry `/api/quran/search` with each alternative term and merge all unique verses found (capped at 8 candidates) into a shortlist.
3. **Verify** — send the shortlist back to Gemini along with the original query and ask it to filter out false positives (e.g. a ghusl/"mandi" verse that matched a term but isn't actually about wudhu) and return only the genuinely relevant verses.

Each card highlights the specific term that verse matched on, and a banner shows which term(s) were used (e.g. "Kewajiban Wudhu" → matched via "basuhlah wajahmu"). This is query-expansion + relevance-filtering, not full semantic re-ranking — cheap (a few hundred tokens per step) and only runs when the direct search comes back empty, so normal searches have zero added latency or cost. The same expansion also catches proper-noun spelling/transliteration variants (e.g. "zakariya" → "zakaria").

### Bring-your-own Gemini key

The Gemini free tier caps out at **20 requests/day per project** — nowhere near enough for shared public traffic. A gear icon (⚙ AI) in the header opens a settings panel where any user can paste their own free Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)); it's stored in `localStorage` only and sent along with each fallback request, where [api/gemini.js](api/gemini.js) prefers it over the app's shared `GEMINI_API_KEY`. If the shared quota is exhausted, the app surfaces a clear message pointing at this setting instead of silently showing an empty result (see `fallbackError` state in [src/App.jsx](src/App.jsx)) — a plain connection/server failure gets a separate generic message.

For real public traffic, enable billing on the Google Cloud project behind the shared key — pay-as-you-go pricing is a fraction of a cent per fallback call, and removes the daily cap entirely.

### Language

A toggle in the header switches between Indonesian (ID, default) and English (EN). This changes the UI copy, the suggestion chips, and which translation source is searched (`indonesian` vs `sahih_international`). UmmahAPI has no Indonesian tafsir (only English Ibn Kathir/Ma'arif and Arabic Muyassar/Ibn Kathir), so when the language is set to ID, the fetched English Ibn Kathir excerpt is translated to Indonesian via Gemini before display.

## Project structure

```
api/
  gemini.js                # Vercel serverless proxy — keeps GEMINI_API_KEY server-side
src/
  components/
    SearchBar.jsx          # input + suggestion chips
    ResultCard.jsx         # Arabic, translation, tafsir excerpt, copy button
    LoadingState.jsx
    EmptyState.jsx
    SettingsModal.jsx      # bring-your-own Gemini key panel
  lib/
    api.js                 # UmmahAPI fetch wrappers
    gemini.js               # Gemini query-expansion fallback + BYOK key storage
    highlight.jsx           # query-term highlighting helper
  App.jsx                   # search orchestration
```

## Roadmap

- **Phase 2:** tafsir source selector (Ibn Kathir / Ma'arif / Muyassar / Ibn Kathir Arabic), audio playback per ayah, word-by-word breakdown.
- **Phase 3 (done):** hybrid search — Gemini-powered query-expansion fallback when pure API matching returns no results. See above.

## Deployment

Deployed on [Vercel](https://vercel.com) (required for the `api/gemini.js` serverless function — a plain static host like Netlify won't run it). Set `VITE_UMMAH_API_KEY` and `GEMINI_API_KEY` in Project Settings → Environment Variables, then redeploy.

```bash
npm run build
```

Output is in `dist/`.
