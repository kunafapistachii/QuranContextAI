export default function SearchBar({ value, onChange, onSearch, onSuggestionClick, loading, t }) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSearch()
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t.searching : t.searchButton}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {t.suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestionClick(s)}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-emerald-500 hover:text-emerald-700"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
