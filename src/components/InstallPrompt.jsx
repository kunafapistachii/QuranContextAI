import { dismissInstall } from '../lib/pwaInstall.js'

/** iOS share glyph, so the instructions point at the button the user is actually looking for. */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-text-bottom"
      aria-hidden="true"
    >
      <path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5" />
      <path d="M4.5 11v5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-5" />
    </svg>
  )
}

/**
 * Install affordance. Rendered as a dismissible bottom sheet on first visit, or as a plain
 * panel when opened deliberately from the header button (`variant="modal"`).
 */
export default function InstallPrompt({ mode, onInstall, onClose, t, variant = 'banner' }) {
  const handleInstall = async () => {
    const accepted = await onInstall()
    // Chromium discards the prompt event once used, so either outcome ends this UI.
    if (accepted !== false) onClose()
  }

  const handleDismiss = () => {
    dismissInstall()
    onClose()
  }

  const body = (
    <>
      <div className="flex items-start gap-3">
        <img src="/pwa-192x192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">{t.installTitle}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{t.installBody}</p>
        </div>
      </div>

      {mode === 'native' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {t.installLater}
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t.installButton}
          </button>
        </div>
      )}

      {mode === 'ios-safari' && (
        <>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-gray-600">
            <li>
              {t.installIosStep1} <ShareIcon />
            </li>
            <li>{t.installIosStep2}</li>
            <li>{t.installIosStep3}</li>
          </ol>
          <button
            onClick={handleDismiss}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t.installGotIt}
          </button>
        </>
      )}

      {mode === 'ios-other' && (
        <>
          <p className="mt-3 text-xs text-gray-600">{t.installIosOtherBrowser}</p>
          <button
            onClick={handleDismiss}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t.installGotIt}
          </button>
        </>
      )}
    </>
  )

  if (variant === 'modal') {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {body}
        </div>
      </div>
    )
  }

  return (
    // pb-[env(safe-area-inset-bottom)] keeps the sheet clear of the iOS home indicator.
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        {body}
      </div>
    </div>
  )
}
