// Calls our own /api/gemini serverless proxy instead of Google directly — this keeps
// GEMINI_API_KEY server-side only, so it's never bundled into the client JS.
async function callGemini(prompt, maxOutputTokens = 500) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxOutputTokens }),
  })
  if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`)
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
// The Quran translation describes rituals by their literal actions (e.g. "basuhlah wajahmu"
// for wudhu), not by their fiqh label — so we explicitly ask for action phrases, not just
// topic synonyms, otherwise candidates like "mandi" (ghusl) get suggested for "wudhu" and
// match the wrong, unrelated verse.
export async function expandQuery(query, lang) {
  const langName = LANG_NAMES[lang] ?? 'English'
  const prompt = `A user searched the Quran for "${query}" but the search (literal keyword match against ${langName} Quran translation text) returned no results.

The Quran translation text usually describes religious concepts and rituals through their literal actions and phrasing (e.g. for "wudhu" it says "basuhlah wajahmu dan tanganmu" — wash your face and hands — never the word "wudhu" itself). Fiqh/topic labels for a ritual rarely appear verbatim in the translation.

Suggest 6 alternative search terms in ${langName} that are likely to appear VERBATIM in the ${langName} Quran translation text, ordered from most to least likely:
1. First, literal action/imperative phrases the translation would use to describe the ruling (e.g. "basuhlah", "membasuh muka")
2. Then, close synonyms of the core concept word
3. Only as a last resort, the fiqh/topic term itself

Each term should be specific to "${query}" — do not suggest generic terms for a broader or different ritual (e.g. do not suggest "mandi"/ghusl-related terms when the query is specifically about wudhu).

Respond with ONLY a JSON array of strings, no explanation, no markdown. Example: ["term1", "term2", "term3", "term4", "term5", "term6"]`

  const text = await callGemini(prompt, 400)
  return parseJsonArray(text).filter((t) => typeof t === 'string' && t.trim())
}

// Given the original query and a shortlist of candidate ayat (found via expanded search
// terms), asks Gemini to filter out false-positive matches — e.g. a ghusl verse that matched
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
    const text = await callGemini(prompt, 300)
    const keys = parseJsonArray(text).filter((k) => typeof k === 'string')
    return keys.length > 0 ? keys : candidates.map((c) => c.verse_key)
  } catch {
    return candidates.map((c) => c.verse_key)
  }
}

export async function translateText(text, lang) {
  if (lang !== 'id' || !text) return text

  const prompt = `Translate the following Islamic tafsir excerpt into natural Indonesian. Only output the translation itself, one paragraph, no notes, no markdown:\n\n${text}`

  try {
    return (await callGemini(prompt, 600)).trim() || text
  } catch {
    return text
  }
}
