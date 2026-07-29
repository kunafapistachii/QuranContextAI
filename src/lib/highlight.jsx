export function highlightText(text, query) {
  if (!text || !query) return text
  const terms = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
  if (terms.length === 0) return text

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)
  const matchSet = new Set(terms.map((t) => t.toLowerCase()))

  return parts.map((part, i) =>
    matchSet.has(part.toLowerCase()) ? (
      <mark key={i} className="bg-emerald-200 text-emerald-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
