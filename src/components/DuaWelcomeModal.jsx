import { useEffect, useState } from 'react'
import { fetchRandomDua } from '../lib/api.js'
import { translateText } from '../lib/ai.js'
import { stripFootnoteMarkers } from '../lib/cleanText.js'
import { getCachedDuaTranslation, setCachedDuaTranslation } from '../lib/duaCache.js'
import duaTranslations from '../data/duaTranslations.json'

export default function DuaWelcomeModal({ lang, t, onContinue }) {
  const [dua, setDua] = useState(null)
  const [translatedTitle, setTranslatedTitle] = useState(null)
  const [translatedText, setTranslatedText] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchRandomDua()
      .then((data) => {
        if (cancelled || !data) return
        // Render the dua as soon as it's fetched — don't block on translation.
        setDua(data)
        if (lang !== 'id') return

        // Prefer the pre-translated static bundle (zero AI cost, covers virtually every
        // dua the live API can return), then a per-browser cache from a prior on-demand
        // translation, and only fall back to a live AI call — which then gets cached — for
        // a dua neither has yet (e.g. one added to the API after the bundle was generated).
        const bundled = duaTranslations[data.id]
        if (bundled) {
          setTranslatedTitle(bundled.title)
          setTranslatedText(bundled.translation)
          return
        }

        const cached = getCachedDuaTranslation(data.id)
        if (cached) {
          setTranslatedTitle(cached.title)
          setTranslatedText(cached.translation)
          return
        }

        Promise.all([
          data.title ? translateText(data.title, 'id', 100) : Promise.resolve(null),
          data.translation ? translateText(data.translation, 'id') : Promise.resolve(null),
        ]).then(([title, translation]) => {
          if (cancelled) return
          if (title) setTranslatedTitle(title)
          if (translation) setTranslatedText(translation)
          if (title || translation) {
            setCachedDuaTranslation(data.id, {
              title: title ?? data.title,
              translation: translation ?? data.translation,
            })
          }
        })
      })
      .catch(() => {
        if (!cancelled) onContinue()
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        {!dua ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm">{t.duaModalLoading}</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900">{translatedTitle ?? dua.title}</h2>

            <p dir="rtl" lang="ar" className="mt-4 text-right text-xl leading-loose text-gray-900">
              {dua.arabic}
            </p>

            <p className="mt-2 text-xs italic text-gray-400">{dua.transliteration}</p>

            <p className="mt-3 text-gray-700">
              {stripFootnoteMarkers(translatedText ?? dua.translation)}
            </p>

            <p className="mt-3 text-xs text-gray-400">
              {t.duaModalSource}: {dua.source}
            </p>

            <button
              onClick={onContinue}
              className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t.duaModalContinue}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
