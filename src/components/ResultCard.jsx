import { useState } from 'react'
import { highlightText } from '../lib/highlight.jsx'

const TAFSIR_PREVIEW_LENGTH = 320

export default function ResultCard({ result, query, tafsir, tafsirLoading, t }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = `Surah ${result.surah_name} (${result.surah_number}:${result.ayah}): ${result.translation}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const tafsirPreview = tafsir?.text
    ? tafsir.text.slice(0, TAFSIR_PREVIEW_LENGTH) + (tafsir.text.length > TAFSIR_PREVIEW_LENGTH ? '…' : '')
    : null

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

      <p className="mt-3 italic text-gray-700">{highlightText(result.translation, query)}</p>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t.tafsirLabel}
        </p>
        {tafsirLoading && <p className="text-sm text-gray-400">{t.tafsirLoading}</p>}
        {!tafsirLoading && tafsirPreview && (
          <p className="text-sm text-gray-600">{highlightText(tafsirPreview, query)}</p>
        )}
        {!tafsirLoading && !tafsirPreview && (
          <p className="text-sm text-gray-400">{t.tafsirUnavailable}</p>
        )}
      </div>
    </div>
  )
}
