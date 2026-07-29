export default function LoadingState({ t }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      <p className="mt-3 text-sm">{t.loadingSearch}</p>
    </div>
  )
}
