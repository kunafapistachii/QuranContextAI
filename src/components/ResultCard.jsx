import { useState } from 'react'
import { highlightText } from '../lib/highlight.jsx'
import { stripFootnoteMarkers } from '../lib/cleanText.js'
import { translateText } from '../lib/ai.js'

const TAFSIR_PREVIEW_LENGTH = 320

export default function ResultCard({
  result,
  query,
  tafsir,
  tafsirLoading,
  t,
  lang,
  tafsirExpanded,
  onToggleTafsir,
}) {
  const [copied, setCopied] = useState(false)
  const [fullTafsir, setFullTafsir] = useState(null)
  const [translatingFull, setTranslatingFull] = useState(false)

  const isId = lang === 'id'
  const cleanTranslation = stripFootnoteMarkers(result.translation)

  const handleCopy = async () => {
    const text = `${result.arabic}\n\nSurah ${result.surah_name} (${result.surah_number}:${result.ayah}): ${cleanTranslation}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleToggleTafsir = async () => {
    onToggleTafsir()
    // Fetch the full translation lazily, only when the user actually expands — the
    // original English tafsir (tafsir.text) can run 10k+ chars, so we don't translate
    // the whole thing up front for every result.
    if (!tafsirExpanded && isId && tafsir?.text && !fullTafsir) {
      setTranslatingFull(true)
      try {
        setFullTafsir(await translateText(tafsir.text, 'id', 6000))
      } finally {
        setTranslatingFull(false)
      }
    }
  }

  const previewText = isId
    ? tafsir?.previewText
    : tafsir?.text &&
      tafsir.text.slice(0, TAFSIR_PREVIEW_LENGTH) + (tafsir.text.length > TAFSIR_PREVIEW_LENGTH ? '…' : '')

  const canExpand = isId ? (tafsir?.text?.length ?? 0) > 500 : (tafsir?.text?.length ?? 0) > TAFSIR_PREVIEW_LENGTH

  const expandedText = isId ? fullTafsir : tafsir?.text
  const showTranslatingFull = tafsirExpanded && isId && translatingFull
  const bodyText = tafsirExpanded ? expandedText : previewText

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-emerald-700">
          {result.surah_name} ({result.surah_number}:{result.ayah})
        </span>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-emerald-500 hover:text-emerald-700"
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>

      <p dir="rtl" lang="ar" className="mt-3 text-right text-lg leading-loose text-gray-900 sm:text-xl">
        {result.arabic}
      </p>

      <p className="mt-3 italic text-gray-700">{highlightText(cleanTranslation, query)}</p>
      {t.translationSourceNote && (
        <p className="mt-1 text-xs text-gray-400">{t.translationSourceNote}</p>
      )}

      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t.tafsirLabel}
        </p>
        {tafsirLoading && <p className="text-sm text-gray-400">{t.tafsirLoading}</p>}

        {!tafsirLoading && showTranslatingFull && (
          <p className="text-sm text-gray-400">{t.translatingFull}</p>
        )}

        {!tafsirLoading && !showTranslatingFull && bodyText && (
          <p className="text-sm text-gray-600">{highlightText(stripFootnoteMarkers(bodyText), query)}</p>
        )}

        {!tafsirLoading && !showTranslatingFull && !bodyText && (
          <p className="text-sm text-gray-400">{t.tafsirUnavailable}</p>
        )}

        {!tafsirLoading && canExpand && (
          <button
            onClick={handleToggleTafsir}
            className="mt-1 text-xs font-medium text-emerald-700 hover:underline"
          >
            {tafsirExpanded ? t.readLess : t.readMore}
          </button>
        )}
      </div>
    </div>
  )
}
