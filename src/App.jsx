import { useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import ResultCard from './components/ResultCard.jsx'
import LoadingState from './components/LoadingState.jsx'
import EmptyState from './components/EmptyState.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { searchQuran, fetchTafsir } from './lib/api.js'
import { expandQuery, verifyRelevance, translateText } from './lib/ai.js'
import { LANGUAGES } from './lib/i18n.js'

const FALLBACK_CANDIDATE_LIMIT = 8

export default function App() {
  const [lang, setLang] = useState('id')
  const t = LANGUAGES[lang]

  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [results, setResults] = useState([])
  const [tafsirs, setTafsirs] = useState({})
  const [tafsirLoadingKeys, setTafsirLoadingKeys] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const [fallbackTermMap, setFallbackTermMap] = useState({})
  const [fallbackExhausted, setFallbackExhausted] = useState(false)
  const [fallbackError, setFallbackError] = useState(null) // 'quota' | 'error' | null
  const [settingsOpen, setSettingsOpen] = useState(false)

  const runSearch = async (term) => {
    const q = (term ?? query).trim()
    if (!q) return

    setQuery(q)
    setSubmittedQuery(q)
    setLoading(true)
    setError(null)
    setHasSearched(true)
    setResults([])
    setTafsirs({})
    setFallbackTermMap({})
    setFallbackExhausted(false)
    setFallbackError(null)

    try {
      let searchResults = await searchQuran(q, { translation: t.translationSource })
      let termMap = {}

      if (searchResults.length === 0) {
        setLoading(false)
        const fallback = await runFallbackSearch(q)
        searchResults = fallback.results
        termMap = fallback.termMap
      } else {
        setLoading(false)
      }

      setFallbackTermMap(termMap)
      setResults(searchResults)
      loadTafsirsFor(searchResults)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Expands the query into alternative search terms, searches each, then asks the AI to
  // filter the merged candidates down to ones actually relevant to the original query —
  // this catches false positives like a ghusl verse matching on a loosely-related term.
  const runFallbackSearch = async (q) => {
    setFallbackLoading(true)
    try {
      let alternatives
      try {
        alternatives = await expandQuery(q, lang)
      } catch (err) {
        setFallbackError(err.status === 429 ? 'quota' : 'error')
        return { results: [], termMap: {} }
      }
      if (alternatives.length === 0) return { results: [], termMap: {} }

      const candidatesByKey = new Map()
      for (const term of alternatives) {
        if (candidatesByKey.size >= FALLBACK_CANDIDATE_LIMIT) break
        const found = await searchQuran(term, { translation: t.translationSource, limit: 3 })
        for (const r of found) {
          if (!candidatesByKey.has(r.verse_key)) {
            candidatesByKey.set(r.verse_key, { result: r, term })
          }
        }
      }

      if (candidatesByKey.size === 0) {
        setFallbackExhausted(true)
        return { results: [], termMap: {} }
      }

      const candidatesArr = Array.from(candidatesByKey.entries()).map(([verse_key, c]) => ({
        verse_key,
        translation: c.result.translation,
      }))
      const relevantKeys = await verifyRelevance(q, candidatesArr, lang)

      const results = []
      const termMap = {}
      for (const key of relevantKeys) {
        const entry = candidatesByKey.get(key)
        if (entry) {
          results.push(entry.result)
          termMap[key] = entry.term
        }
      }

      if (results.length === 0) setFallbackExhausted(true)
      return { results, termMap }
    } catch {
      return { results: [], termMap: {} }
    } finally {
      setFallbackLoading(false)
    }
  }

  const loadTafsirsFor = (searchResults) => {
    setTafsirLoadingKeys(new Set(searchResults.map((r) => r.verse_key)))
    searchResults.forEach(async (r) => {
      try {
        const tafsir = await fetchTafsir('ibn_kathir', r.surah_number, r.ayah)
        const localized =
          tafsir?.text && lang === 'id'
            ? { ...tafsir, text: await translateText(tafsir.text.slice(0, 400), 'id') }
            : tafsir
        setTafsirs((prev) => ({ ...prev, [r.verse_key]: localized }))
      } catch {
        setTafsirs((prev) => ({ ...prev, [r.verse_key]: null }))
      } finally {
        setTafsirLoadingKeys((prev) => {
          const next = new Set(prev)
          next.delete(r.verse_key)
          return next
        })
      }
    })
  }

  const fallbackTerms = [...new Set(Object.values(fallbackTermMap))]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="relative border-b border-gray-200 bg-white py-8">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50"
          >
            {t.settingsButton}
          </button>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 text-sm">
            {Object.entries(LANGUAGES).map(([code, l]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`px-3 py-1 font-medium ${
                  lang === code ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="mt-1 text-center text-sm text-gray-500">{t.subtitle}</p>
      </header>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} t={t} />}

      <main className="mx-auto max-w-3xl px-4 py-8">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={() => runSearch()}
          onSuggestionClick={(s) => runSearch(s)}
          loading={loading}
          t={t}
        />

        <div className="mt-8">
          {loading && <LoadingState t={t} />}

          {!loading && fallbackLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-sm">{t.fallbackSearching}</p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">{error}</p>
          )}

          {!loading && !fallbackLoading && !error && hasSearched && results.length === 0 && (
            <>
              <EmptyState query={submittedQuery} t={t} />
              {fallbackError && (
                <div className="-mt-8 flex flex-col items-center gap-2">
                  <p className="max-w-sm text-center text-xs text-amber-700">
                    {fallbackError === 'quota' ? t.fallbackErrorQuota : t.fallbackErrorGeneric}
                  </p>
                  {fallbackError === 'quota' && (
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      {t.settingsButton}
                    </button>
                  )}
                </div>
              )}
              {fallbackExhausted && !fallbackError && (
                <p className="-mt-8 text-center text-xs text-gray-400">{t.fallbackNoneFound}</p>
              )}
            </>
          )}

          {!loading && !fallbackLoading && !error && results.length > 0 && (
            <div className="space-y-4">
              {fallbackTerms.length > 0 && (
                <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  {t.fallbackUsedTerm(fallbackTerms.join(', '))}
                </p>
              )}
              {results.map((r) => (
                <ResultCard
                  key={r.verse_key}
                  result={r}
                  query={fallbackTermMap[r.verse_key] ?? submittedQuery}
                  tafsir={tafsirs[r.verse_key]}
                  tafsirLoading={tafsirLoadingKeys.has(r.verse_key)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
