import { useEffect, useState } from 'react'
import { fetchRandomDua } from '../lib/api.js'
import { translateText } from '../lib/ai.js'

export default function DuaWelcomeModal({ lang, t, onContinue }) {
  const [dua, setDua] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchRandomDua()
      .then(async (data) => {
        if (!data || cancelled) return
        const translation =
          lang === 'id' ? await translateText(data.translation, 'id') : data.translation
        if (!cancelled) setDua({ ...data, translation })
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
            <h2 className="text-lg font-semibold text-gray-900">{dua.title}</h2>

            <p dir="rtl" lang="ar" className="mt-4 text-right text-xl leading-loose text-gray-900">
              {dua.arabic}
            </p>

            <p className="mt-2 text-xs italic text-gray-400">{dua.transliteration}</p>

            <p className="mt-3 text-gray-700">{dua.translation}</p>

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
