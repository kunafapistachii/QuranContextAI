export default function EmptyState({ query, t }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center text-gray-500 sm:py-16">
      <p className="text-lg font-medium text-gray-700">{t.noResultsTitle(query)}</p>
      <p className="mt-1 max-w-md text-sm">{t.noResultsBody}</p>
    </div>
  )
}
