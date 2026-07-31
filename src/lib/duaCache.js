// Per-browser cache for on-demand dua translations, keyed by dua id. Covers duas that
// aren't in the pre-translated static bundle (src/data/duaTranslations.json) — e.g. if
// UmmahAPI adds new duas before the bundle is regenerated — so each dua only ever costs an
// AI call once per browser instead of once per page load.
const STORAGE_KEY = 'quran_ai_dua_translations'

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getCachedDuaTranslation(id) {
  return readCache()[id] ?? null
}

export function setCachedDuaTranslation(id, translation) {
  try {
    const cache = readCache()
    cache[id] = translation
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage unavailable (private mode etc.) — silently no-op
  }
}
