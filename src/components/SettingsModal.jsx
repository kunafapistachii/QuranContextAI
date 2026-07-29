import { useState } from 'react'
import { getUserApiKey, setUserApiKey } from '../lib/ai.js'

export default function SettingsModal({ onClose, t }) {
  const [key, setKey] = useState(getUserApiKey())
  const [savedMessage, setSavedMessage] = useState(false)

  const handleSave = () => {
    setUserApiKey(key.trim())
    setSavedMessage(true)
    setTimeout(() => setSavedMessage(false), 1500)
  }

  const handleClear = () => {
    setKey('')
    setUserApiKey('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-lg sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t.settingsTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={t.close}>
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-600">{t.settingsDescription}</p>

        <label className="mt-4 block text-sm font-medium text-gray-700">{t.apiKeyLabel}</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t.apiKeyPlaceholder}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <a
          href="https://platform.deepseek.com/api_keys"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-emerald-700 hover:underline"
        >
          {t.getApiKeyLink}
        </a>

        <p className="mt-3 text-xs text-gray-400">
          {getUserApiKey() ? t.usingOwnKey : t.usingSharedKey}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={handleClear}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {t.clear}
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {savedMessage ? t.saved : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
