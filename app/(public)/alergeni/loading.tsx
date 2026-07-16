// Моментален fallback при навигация към /alergeni (force-dynamic).
export default function AllergensLoading() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14" data-testid="alergeni-skeleton">
      {/* Статично заглавие — показва се веднага */}
      <header className="text-center">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
          <span className="h-px w-8 bg-gold" />
          Информация за потребителя
          <span className="h-px w-8 bg-gold" />
        </p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-ink">Алергени</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Номерата до всеки продукт в менюто отговарят на този официален списък по Регламент (ЕС)
          № 1169/2011.
        </p>
      </header>

      <ol className="mt-12 animate-pulse space-y-3" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li
            key={i}
            className="flex gap-4 rounded-2xl border border-ink/10 bg-white/60 px-5 py-4"
          >
            <div className="h-8 w-6 shrink-0 rounded bg-ink/10" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-1/3 rounded bg-ink/10" />
              <div className="h-3.5 w-2/3 rounded bg-ink/5" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
