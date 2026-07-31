const STORAGE_KEY = 'quran_ai_deepseek_key'

// User-supplied DeepSeek key, kept in the browser only. Overrides the app's shared key
// (which has shared rate limits) so a heavy user doesn't starve everyone else.
export function getUserApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setUserApiKey(key) {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage unavailable (private mode etc.) — silently no-op
  }
}

// Calls our own /api/ai serverless proxy instead of DeepSeek directly — this keeps the
// app's shared DEEPSEEK_API_KEY server-side only. If the user has set their own key, it's
// sent along and the server prefers it over the shared one.
async function callAI(prompt, maxTokens = 500) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens, apiKey: getUserApiKey() || undefined }),
  })
  if (!res.ok) {
    const err = new Error(`AI request failed: ${res.status}`)
    err.status = res.status
    throw err
  }
  const json = await res.json()
  return json.text ?? ''
}

function parseJsonArray(text) {
  const cleaned = text.trim().replace(/^```json\s*|^```\s*|```$/g, '')
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const LANG_NAMES = { id: 'Indonesian', en: 'English' }

// Suggests alternative search terms likely to appear VERBATIM in the translation text.
// Covers two distinct failure modes: (1) the query is a fiqh/topic label that the translation
// never uses verbatim — it describes the ritual by its literal action instead (e.g. "wudhu" →
// "basuhlah wajahmu"); (2) the query is a proper noun (a prophet's/person's name) spelled or
// transliterated differently than the translation uses (e.g. "zakariya" → "zakaria").
export async function expandQuery(query, lang) {
  const langName = LANG_NAMES[lang] ?? 'English'
  const prompt = `A user searched the Quran for "${query}" but the search (literal keyword match against ${langName} Quran translation text) returned no results.

There are two common reasons a query finds nothing:
1. It's a religious concept/ritual label, but the translation describes the ritual by its literal action instead of naming it (e.g. for "wudhu" it says "basuhlah wajahmu dan tanganmu" — wash your face and hands — never the word "wudhu" itself). Fiqh/topic labels rarely appear verbatim.
2. It's a proper noun (a prophet's or other Quranic figure's name) spelled/transliterated differently than the standard ${langName} Quran translation uses (e.g. "zakariya" vs "zakaria", "yusuf" vs "yusuff", "ibrahim" vs "ibrohim"). If "${query}" looks like a name, put your best guess(es) at the standard translation spelling FIRST.

Suggest 6 alternative search terms in ${langName} that are likely to appear VERBATIM in the ${langName} Quran translation text, ordered from most to least likely:
1. If it's a name: the standard/common spelling variant(s) used in Quran translations
2. Otherwise: literal action/imperative phrases the translation would use to describe the ruling (e.g. "basuhlah", "membasuh muka")
3. Then, close synonyms of the core concept word
4. Only as a last resort, the fiqh/topic term itself

Each term should be specific to "${query}" — do not suggest generic terms for a broader or different concept (e.g. do not suggest "mandi"/ghusl-related terms when the query is specifically about wudhu).

Respond with ONLY a JSON array of strings, no explanation, no markdown. Example: ["term1", "term2", "term3", "term4", "term5", "term6"]`

  const text = await callAI(prompt, 400)
  return parseJsonArray(text).filter((t) => typeof t === 'string' && t.trim())
}

// Given the original query and a shortlist of candidate ayat (found via expanded search
// terms), asks the AI to filter out false-positive matches — e.g. a ghusl verse that matched
// on "mandi" but isn't actually about wudhu — and return only the verse_keys genuinely
// relevant to the user's original query.
export async function verifyRelevance(query, candidates, lang) {
  if (candidates.length === 0) return []

  const langName = LANG_NAMES[lang] ?? 'English'
  const list = candidates
    .map((c, i) => `${i + 1}. [${c.verse_key}] ${c.translation.slice(0, 200)}`)
    .join('\n')

  const prompt = `A user searched the Quran (in ${langName}) for: "${query}"

These ayat were found via keyword search using AI-suggested alternative terms, so some may be false positives (matched on a word but are actually about a different, unrelated topic):

${list}

Return ONLY a JSON array of the verse_key strings (e.g. "5:6") that are genuinely relevant to the user's query "${query}", ordered by relevance. Exclude any that are off-topic. If none are relevant, return an empty array. No explanation, no markdown.`

  try {
    const text = await callAI(prompt, 300)
    const keys = parseJsonArray(text).filter((k) => typeof k === 'string')
    return keys.length > 0 ? keys : candidates.map((c) => c.verse_key)
  } catch {
    return candidates.map((c) => c.verse_key)
  }
}

export async function translateText(text, lang, maxTokens = 1200) {
  if (lang !== 'id' || !text) return text

  const prompt = `Translate the following Islamic text into natural Indonesian. Only output the translation itself, no notes, no markdown, no added commentary:\n\n${text}`

  try {
    return (await callAI(prompt, maxTokens)).trim() || text
  } catch {
    return text
  }
}

// Tafsir excerpts can run 10k+ characters — instead of dumping the whole thing, ask the AI
// for a short bullet-point summary (translated to Indonesian when needed) covering the
// context of revelation and the core ruling/meaning. A link to the full text elsewhere
// covers users who want the complete commentary.
export async function summarizeTafsir(text, lang) {
  if (!text) return null

  const langName = LANG_NAMES[lang] ?? 'English'
  const prompt = `Summarize the following Islamic tafsir (Quranic exegesis) commentary as a concise bullet-point list in ${langName}. Cover the key points only: context of revelation (if mentioned), the core meaning or ruling, and any important scholarly notes. 3-6 short bullets, each on its own line starting with "- ". No introduction, no conclusion, no markdown headers — just the bullet list.\n\n${text}`

  try {
    return (await callAI(prompt, 600)).trim() || null
  } catch {
    return null
  }
}
