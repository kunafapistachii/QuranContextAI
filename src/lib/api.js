const BASE_URL = 'https://ummahapi.com/api'
const API_KEY = import.meta.env.VITE_UMMAH_API_KEY

const headers = API_KEY ? { 'X-API-Key': API_KEY } : undefined

export async function searchQuran(query, { translation = 'sahih_international', limit = 10 } = {}) {
  const url = `${BASE_URL}/quran/search?q=${encodeURIComponent(query)}&translation=${translation}&limit=${limit}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const json = await res.json()
  return json.data?.results ?? []
}

export async function fetchTafsir(tafsirKey, surah, ayah) {
  const url = `${BASE_URL}/tafsir/${tafsirKey}/surah/${surah}/ayah/${ayah}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Tafsir fetch failed: ${res.status}`)
  const json = await res.json()
  return json.data?.tafsir ?? null
}

export async function fetchRandomDua() {
  const url = `${BASE_URL}/duas/random`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Random dua fetch failed: ${res.status}`)
  const json = await res.json()
  return json.data ?? null
}
