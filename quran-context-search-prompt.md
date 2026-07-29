<role>
You are a senior full-stack engineer with expertise in React, Vite, and integrating third-party REST APIs into production-grade web apps.
Your audience: a solo builder who already has a working prototype (as an inline HTML/JS widget) and wants to turn it into a proper, deployable React project.
Communication style: direct and practical. Explain tradeoffs briefly when they matter, but default to shipping working code over lengthy explanations.
</role>

<task>
Build a "Quran Context Search" web app that lets users search the Quran by topic or meaning (e.g. "haidh", "rizq", "sabr") rather than by exact keyword, and returns the most relevant ayat along with its tafsir, in a copy-paste-friendly card format.

Key requirements:
- Set up a React + Vite project (Tailwind for styling)
- Port the existing prototype UI/logic into proper components
- Improve search relevance beyond simple keyword matching (see Context for current approach and its limits)
- Add tafsir source selection, audio playback, and word-by-word breakdown as follow-up features (see Output for phased scope)
- Prepare for deployment (Vercel or Netlify)
</task>

<context>
**API being used:** UmmahAPI (https://ummahapi.com/api/docs) — free, no signup required, 12 Islamic-content services. Base URL: `https://ummahapi.com/api`

**Endpoints relevant to this project:**
- `GET /api/quran/search?q={term}&translation={translation}&limit={n}` — search Quran translations/transliterations for a keyword. Default translation: sahih_international.
- `GET /api/tafsir` — list available tafsir sources (keys, names, languages, authors)
- `GET /api/tafsir/{tafsir}/surah/{surah}/ayah/{ayah}` — get tafsir for one ayah. `tafsir` key can be `ibn_kathir`, `maarif`, `muyassar`, `ibn_kathir_ar`, or `all`.
- `GET /api/quran/surah/{number}` — full surah with Arabic, transliteration, translations, audio
- `GET /api/quran/surah/{surah}/ayah/{ayah}` — single verse with Arabic, transliteration, all translations, audio from all reciters
- `GET /api/quran/words/{surah}/{ayah}` — word-by-word Arabic, transliteration, English meaning for one verse
- `GET /api/quran/reciters` — list reciters with IDs, for audio endpoints
- `GET /api/quran/audio/{surah}` and `/api/quran/audio/{surah}/{ayah}` — audio recitation URLs
- `GET /api/quran/random` — random verse (useful for a "daily verse" feature later)
- API key is optional — used only for 5x higher rate limits, not required to function

**Current approach — "pure API matching" (phase 1, already agreed with the user):**
1. User types a free-text query (e.g. "ayat tentang haidh")
2. Call `/api/quran/search?q={query}` to get candidate ayat
3. For each candidate, fetch tafsir via `/api/tafsir/ibn_kathir/surah/{surah}/ayah/{ayah}`
4. Display results as cards: translation text, truncated tafsir preview with query keyword highlighted, and a copy button
5. No LLM involved yet — this is intentionally simple keyword-vs-translation-and-tafsir matching

**Known limitation to solve next:** `/api/quran/search` only matches against translation/transliteration text, not tafsir content, so genuinely contextual queries (e.g. "ayat tentang haidh" matching Al-Baqarah 222) may not surface the right ayah if the word "haidh" itself doesn't appear in the English translation. The user explicitly wants to eventually move to a **hybrid model**: keep pure API matching as the fast first pass, then fall back to an LLM-assisted semantic pass (via the Anthropic API) when results are weak or absent, to interpret user intent and re-rank/re-query.

**Existing prototype (already built and shown to the user as an inline widget):** a single-page HTML/JS mockup with:
- A search input + search button
- Predefined quick-search suggestion chips (Haidh, Rizq, Sabr, Dua)
- Loading, empty, and no-results states
- Result cards showing: surah/ayah reference, translation in italics, a truncated + keyword-highlighted tafsir excerpt, and a "Copy" button (copies "Surah X Ayah Y: {translation}" to clipboard)
- Styling used CDS-style CSS variables (`--surface-1`, `--text-secondary`, `--border`, etc.) which do NOT exist outside that sandbox — these need to be replaced with real Tailwind classes / a real design system in the new project

**User's stated priorities, in order:** accuracy and speed. Sharing is intentionally simple — just copy-paste, no native share-sheet integration needed for now.
</context>

<examples>
Example 1 — good search result card content:
Query: "haidh"
Expected top result: Surah Al-Baqarah, Ayah 222, showing the Sahih International translation about menstruation and its rulings, plus an Ibn Kathir tafsir excerpt that explains the context of the revelation and the ruling derived from it, with "haidh"-related terms highlighted.

Example 2 — good empty/fallback state:
Query: "something obscure with no direct keyword match"
Expected behavior: show a friendly no-results state (not a blank screen or console error), and in the phase-2 hybrid version, this is exactly the case that should trigger an LLM-assisted fallback search instead of just failing.
</examples>

<output>
Format: working React + Vite project (component files, not a single HTML blob), plus a short README explaining setup and API usage
Length: N/A (code output, scoped by phase — see Structure)
Structure, phased:
1. Phase 1 (this task): scaffold project, port the prototype into components (SearchBar, ResultCard, EmptyState, LoadingState), wire up real Tailwind styling, connect to `/api/quran/search` + `/api/tafsir/...` exactly as in the prototype
2. Phase 2: add tafsir source selector (ibn_kathir / maarif / muyassar / ibn_kathir_ar), audio playback per ayah, word-by-word breakdown view
3. Phase 3: hybrid search — add an LLM-assisted fallback/re-ranking pass using the Anthropic API when pure API matching returns weak or no results
</output>

<constraints>
- Do not require an API key for core functionality — UmmahAPI works without one; only mention the optional key for rate limits
- Do not reintroduce CDS-only CSS variables (`--surface-1`, `--bg-accent`, etc.) — use Tailwind or plain CSS custom properties defined in the new project
- Keep phase 1 scope to pure API matching only — do not add LLM calls yet, that's phase 3
- Prioritize accuracy and speed of search results over visual polish, per the user's stated priorities
- Sharing stays simple (copy-to-clipboard) unless the user asks to expand it
</constraints>

<instructions>
For complex tasks: think through your approach step-by-step, then provide the final answer in the requested format.
If information is missing or uncertain (e.g. exact shape of the `/api/quran/search` or tafsir response JSON), state this explicitly and verify by making a real request against the live API rather than guessing the schema.
</instructions>
