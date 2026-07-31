// One-time (re-run manually when needed) script that pre-translates every dua from
// UmmahAPI's /api/duas catalog into Indonesian via DeepSeek, and bundles the result as a
// static JSON file. This means the welcome modal never has to call the AI at runtime for
// any dua already in this set — zero ongoing token cost for the common case.
//
// Run with: node --env-file=.env scripts/generate-dua-translations.mjs

const UMMAH_BASE = 'https://ummahapi.com/api'
const DEEPSEEK_URL = 'https://api.deepseek.com/anthropic/v1/messages'
const OUTPUT_PATH = new URL('../src/data/duaTranslations.json', import.meta.url)
const CONCURRENCY = 5

const apiKey = process.env.DEEPSEEK_API_KEY
if (!apiKey) {
  console.error('DEEPSEEK_API_KEY not set. Run with: node --env-file=.env scripts/generate-dua-translations.mjs')
  process.exit(1)
}

async function fetchAllDuas() {
  const catsRes = await fetch(`${UMMAH_BASE}/duas`)
  const catsJson = await catsRes.json()
  const categories = catsJson.data.categories

  const allDuas = []
  for (const cat of categories) {
    const res = await fetch(`${UMMAH_BASE}/duas/category/${cat.id}`)
    const json = await res.json()
    allDuas.push(...(json.data?.duas ?? []))
  }
  return allDuas
}

async function translateDua(dua) {
  const prompt = `Translate the following Islamic dua's title and translation into natural Indonesian. Respond with ONLY a JSON object, no markdown, no explanation: {"title": "...", "translation": "..."}\n\nTitle: ${dua.title}\nTranslation: ${dua.translation}`

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      max_tokens: 300,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`DeepSeek request failed for dua ${dua.id}: ${res.status}`)
  const json = await res.json()
  const text = json.content?.[0]?.text ?? '{}'
  const cleaned = text.trim().replace(/^```json\s*|^```\s*|```$/g, '')
  return JSON.parse(cleaned)
}

async function main() {
  console.log('Fetching dua catalog...')
  const duas = await fetchAllDuas()
  console.log(`Found ${duas.length} duas. Translating...`)

  const result = {}
  let done = 0

  for (let i = 0; i < duas.length; i += CONCURRENCY) {
    const batch = duas.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map(async (dua) => {
        try {
          const translated = await translateDua(dua)
          result[dua.id] = { title: translated.title, translation: translated.translation }
        } catch (err) {
          console.error(`Failed dua ${dua.id} (${dua.title}):`, err.message)
        }
        done++
        process.stdout.write(`\r${done}/${duas.length}`)
      }),
    )
  }

  console.log(`\nWriting ${Object.keys(result).length} translations to ${OUTPUT_PATH.pathname}`)
  const fs = await import('node:fs/promises')
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2))
  console.log('Done.')
}

main()
