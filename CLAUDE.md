# CLAUDE.md

Context for Claude Code sessions. The user is Indonesian and communicates in casual
Indonesian — reply in Indonesian.

## What this is

**Quran Context Search** — a React + Vite + Tailwind SPA that searches the Quran by topic or
meaning (not just exact keywords) and shows matching ayat with a tafsir summary. Deployed on
Vercel, source at https://github.com/kunafapistachii/QuranContextAI.

Data comes from [UmmahAPI](https://ummahapi.com/api/docs) (free, no signup). AI features run
through DeepSeek (`deepseek-v4-flash`) via its Anthropic-compatible endpoint.

## Commands

```bash
npm run dev     # Vite dev server on :5173 (includes an /api/ai dev middleware — see below)
npm run build   # production build to dist/
node --env-file=.env scripts/generate-dua-translations.mjs   # regenerate dua translations
```

## Architecture notes that aren't obvious from the code

**AI calls go through a serverless proxy, never direct.** `src/lib/ai.js` (client) calls
`/api/ai` → `api/ai.js` (Vercel function) → DeepSeek. This keeps `DEEPSEEK_API_KEY`
server-side so it's never bundled into client JS. `vite.config.js` mounts the same handler as
dev middleware so `npm run dev` exercises the real path instead of only the failure path —
without it, `/api/ai` 404s locally and every AI feature silently falls back.

**Users can bring their own DeepSeek key.** Stored in `localStorage`, sent along with each
request, and `api/ai.js` prefers it over the shared key. This exists because the shared key
hits rate limits under public traffic. The ⚙ AI button in the header opens that panel.

**Search is keyword-match first, AI-assisted only on zero results.** `/api/quran/search` only
matches translation/transliteration text, so it misses two classes of query:
- fiqh/topic labels the translation never uses verbatim ("wudhu" → translation says
  "basuhlah wajahmu")
- proper nouns spelled differently ("zakariya" → translation says "zakaria")

On zero results, `runFallbackSearch` in `App.jsx` does: expand query into 6 candidate terms →
search each → ask AI to filter out false positives (a ghusl verse matching "mandi" isn't
actually about wudhu). Both prompts live in `src/lib/ai.js` and encode those two failure
modes explicitly — don't simplify them into generic "find synonyms" prompts, that regression
is what caused the wrong-verse bug for "Kewajiban Wudhu".

**Tafsir is AI-summarized, not dumped.** Ibn Kathir excerpts run 10k+ chars. `summarizeTafsir`
turns each into 3-6 bullets (in the active UI language). Cards show **one** bullet collapsed;
"Baca selengkapnya..." expands the rest and reveals the TafsirWeb link (deliberately hidden
until expanded to keep the collapsed card tidy).

**Dua translations are pre-generated, not translated at runtime.** The welcome modal used to
burn AI tokens re-translating the same ~126 duas on every page load. Now
`scripts/generate-dua-translations.mjs` batch-translates the whole catalog into
`src/data/duaTranslations.json` (bundled static, zero runtime cost). `src/lib/duaCache.js` is
a `localStorage` fallback for duas not in the bundle. Re-run the script if UmmahAPI's catalog
changes.

**Footnote digits must be stripped.** UmmahAPI embeds footnote reference numbers directly in
translation strings with no brackets or spacing ("wives1", "themselves,2", "(luar)1"), and we
don't render the footnotes, so they read as random stray digits. `src/lib/cleanText.js`
handles this — it's capped at 2 digits and requires the digit to be glued to a preceding
letter/punctuation, so real numbers ("70,000", "100 times") survive. Any new surface that
displays API text needs this pass.

**TafsirWeb links are built, not looked up.** `src/lib/tafsirweb.js` — tafsirweb.com tolerates
any numeric ID prefix and 301-redirects to the canonical URL as long as the surah slug and
ayah number are right, so `0-surat-{slug}-ayat-{n}.html` works without needing their ID map.
Verified against surahs with apostrophes/spaces (Al-Ma'idah → al-maidah, Ali 'Imran →
ali-imran).

## Language

ID (default) and EN toggle. This changes UI copy, suggestion chips, *and* which UmmahAPI
translation source is searched (`indonesian` vs `sahih_international`). All UI strings live in
`src/lib/i18n.js` — both languages must be updated together.

Indonesian ayat translations come from Kemenag via UmmahAPI (attributed in the UI, not AI).
Tafsir has no Indonesian source in UmmahAPI, so those summaries *are* AI-translated.

## Env vars

- `VITE_UMMAH_API_KEY` — optional, 5x rate limit. Client-side is fine (free service, no billing).
- `DEEPSEEK_API_KEY` — server-side only, no `VITE_` prefix. Set in Vercel project settings.

`.env` is gitignored. `.claude/` is too — it once leaked an API key into permission history.

## Deployment

Vercel (needed for `api/ai.js` — a plain static host won't run it). Deploy tooling in this
session's MCP connector only had preview-deploy permission, so production deploys go through
the Vercel dashboard / GitHub integration, not the CLI.
