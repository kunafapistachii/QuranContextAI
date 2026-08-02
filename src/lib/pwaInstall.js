import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'quran_ai_install_dismissed'

let deferredPrompt = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn())
}

// Captured at module scope rather than inside a component: `beforeinstallprompt` can fire
// before React mounts, and the event is only usable later if preventDefault() is called on
// it the moment it arrives. Import this module early (main.jsx) so nothing is missed.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

/** True once the app is running from the home screen rather than a browser tab. */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari never matches that media query — it exposes this non-standard flag instead.
    window.navigator.standalone === true
  )
}

function isIos() {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return true
  // iPadOS 13+ identifies itself as a Mac; touch points are what separate it from a desktop.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * Which install affordance this browser can actually offer:
 *  - 'native'     Chromium gave us a prompt event we can trigger
 *  - 'ios-safari' iOS Safari: no prompt API, but Add to Home Screen exists in the share menu
 *  - 'ios-other'  Chrome/Firefox/Edge on iOS: WebKit under the hood, but Apple only exposes
 *                 Add to Home Screen in Safari, so the user has to switch browsers
 *  - 'none'       nothing installable to offer (yet)
 */
export function getInstallMode() {
  if (typeof window === 'undefined') return 'none'
  if (deferredPrompt) return 'native'
  if (isIos()) {
    return /crios|fxios|edgios|opios/i.test(navigator.userAgent) ? 'ios-other' : 'ios-safari'
  }
  return 'none'
}

export async function triggerNativeInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  // The event is single-use; Chromium won't hand us the same one twice.
  deferredPrompt = null
  notify()
  return outcome === 'accepted'
}

export function isInstallDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissInstall() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // localStorage unavailable (private mode etc.) — the prompt just reappears next visit
  }
}

export function usePwaInstall() {
  const [state, setState] = useState(() => ({
    mode: getInstallMode(),
    standalone: isStandalone(),
  }))

  useEffect(() => {
    const sync = () => setState({ mode: getInstallMode(), standalone: isStandalone() })
    listeners.add(sync)
    // Re-check on launch-mode change so the UI drops the prompt the moment it's installed.
    const mq = window.matchMedia?.('(display-mode: standalone)')
    mq?.addEventListener?.('change', sync)
    sync()
    return () => {
      listeners.delete(sync)
      mq?.removeEventListener?.('change', sync)
    }
  }, [])

  return {
    ...state,
    // Nothing to offer if it's already installed, or the browser can't install at all.
    canInstall: !state.standalone && state.mode !== 'none',
    install: triggerNativeInstall,
  }
}
