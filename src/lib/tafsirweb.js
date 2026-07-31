// tafsirweb.com accepts any numeric ID prefix and 301-redirects to the canonical URL, as
// long as the surah slug and ayah number are correct — verified against several surahs
// including ones with apostrophes/spaces (Al-Ma'idah -> al-maidah, Ali 'Imran -> ali-imran).
export function tafsirWebUrl(surahName, ayah) {
  const slug = surahName
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, '-')
  return `https://tafsirweb.com/0-surat-${slug}-ayat-${ayah}.html`
}
