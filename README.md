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
- `VITE_UMMAH_API_KEY` — optional, gets a 5x higher rate limit on UmmahAPI. Not required for the app to function.
- `VITE_GEMINI_API_KEY` — optional, powers the Phase 3 fallback search (see below). Without it, fallback is silently skipped and the app just shows the empty state.

Restart `npm run dev` after changing `.env` (Vite only reads env vars at startup).

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

Each card highlights the specific term that verse matched on, and a banner shows which term(s) were used (e.g. "Kewajiban Wudhu" → matched via "basuhlah wajahmu"). This is query-expansion + relevance-filtering, not full semantic re-ranking — cheap (a few hundred tokens per step) and only runs when the direct search comes back empty, so normal searches have zero added latency or cost.

### Language

A toggle in the header switches between Indonesian (ID, default) and English (EN). This changes the UI copy, the suggestion chips, and which translation source is searched (`indonesian` vs `sahih_international`). UmmahAPI has no Indonesian tafsir (only English Ibn Kathir/Ma'arif and Arabic Muyassar/Ibn Kathir), so when the language is set to ID, the fetched English Ibn Kathir excerpt is translated to Indonesian via Gemini before display.

## Project structure

```
src/
  components/
    SearchBar.jsx      # input + suggestion chips
    ResultCard.jsx      # Arabic, translation, tafsir excerpt, copy button
    LoadingState.jsx
    EmptyState.jsx
  lib/
    api.js               # UmmahAPI fetch wrappers
    gemini.js             # Gemini query-expansion fallback
    highlight.jsx         # query-term highlighting helper
  App.jsx                 # search orchestration
```

## Roadmap

- **Phase 2:** tafsir source selector (Ibn Kathir / Ma'arif / Muyassar / Ibn Kathir Arabic), audio playback per ayah, word-by-word breakdown.
- **Phase 3 (done):** hybrid search — Gemini-powered query-expansion fallback when pure API matching returns no results. See above.

## Deployment

Static Vite build, deployable to Vercel or Netlify with no environment variables required.

```bash
npm run build
```

Output is in `dist/`.
