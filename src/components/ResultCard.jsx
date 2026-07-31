import { useState } from 'react'
import { highlightText } from '../lib/highlight.jsx'
import { stripFootnoteMarkers } from '../lib/cleanText.js'
import { tafsirWebUrl } from '../lib/tafsirweb.js'

export default function ResultCard({ result, query, tafsir, tafsirLoading, t }) {
  const [copied, setCopied] = useState(false)

  const cleanTranslation = stripFootnoteMarkers(result.translation)

  const handleCopy = async () => {
    const text = `${result.arabic}\n\nSurah ${result.surah_name} (${result.surah_number}:${result.ayah}): ${cleanTranslation}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const bullets = tafsir?.summary
    ? tafsir.summary
        .split('\n')
        .map((line) => stripFootnoteMarkers(line.replace(/^[-•]\s*/, '').trim()))
        .filter(Boolean)
    : []

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

        {!tafsirLoading && bullets.length > 0 && (
          <ul className="list-disc space-y-1 pl-4 text-sm text-gray-600">
            {bullets.map((bullet, i) => (
              <li key={i}>{highlightText(bullet, query)}</li>
            ))}
          </ul>
        )}

        {!tafsirLoading && bullets.length === 0 && (
          <p className="text-sm text-gray-400">{t.tafsirUnavailable}</p>
        )}

        <a
          href={tafsirWebUrl(result.surah_name, result.ayah)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline"
        >
          {t.tafsirFullLink}
        </a>
      </div>
    </div>
  )
}
