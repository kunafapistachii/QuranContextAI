import { useState } from 'react'
import SearchBar from './components/SearchBar.jsx'
import ResultCard from './components/ResultCard.jsx'
import LoadingState from './components/LoadingState.jsx'
import EmptyState from './components/EmptyState.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import DuaWelcomeModal from './components/DuaWelcomeModal.jsx'
import { searchQuran, fetchTafsir } from './lib/api.js'
import { expandQuery, verifyRelevance, summarizeTafsir } from './lib/ai.js'
import { LANGUAGES } from './lib/i18n.js'

const FALLBACK_CANDIDATE_LIMIT = 8

export default function App() {
  const [lang, setLang] = useState('id')
  const t = LANGUAGES[lang]
  const [showWelcome, setShowWelcome] = useState(true)

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
        // Tafsir excerpts can run 10k+ chars — summarize into a few bullet points (in the
        // active UI language) instead of showing the whole thing. A link to the full text
        // on TafsirWeb covers anyone who wants the complete commentary.
        const summary = tafsir?.text ? await summarizeTafsir(tafsir.text, lang) : null
        setTafsirs((prev) => ({ ...prev, [r.verse_key]: { ...tafsir, summary } }))
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
      <header className="border-b border-gray-200 bg-white px-4 py-4 sm:py-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t.title}</h1>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">{t.subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 sm:px-3 sm:py-1 sm:text-sm"
            >
              {t.settingsButton}
            </button>
            <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs sm:text-sm">
              {Object.entries(LANGUAGES).map(([code, l]) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`px-2.5 py-1.5 font-medium sm:px-3 sm:py-1 ${
                    lang === code ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} t={t} />}
      {showWelcome && (
        <DuaWelcomeModal lang={lang} t={t} onContinue={() => setShowWelcome(false)} />
      )}

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
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
            <div className="flex flex-col items-center justify-center px-4 py-10 text-gray-500 sm:py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-center text-sm">{t.fallbackSearching}</p>
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

      <footer className="px-4 py-6 text-center text-xs text-gray-400">
        {t.footerCredit}{' '}
        <a
          href="https://github.com/kunafapistachii"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-emerald-700"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          Kunafapistachii
        </a>
      </footer>
    </div>
  )
}
