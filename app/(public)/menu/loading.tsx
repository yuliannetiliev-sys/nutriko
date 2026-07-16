import Link from "next/link";

// Показва се МОМЕНТАЛНО при навигация към /menu, докато сървърът
// зарежда продуктите (страницата е force-dynamic). Без този fallback
// тапът върху „Меню" изглежда сякаш не реагира на по-бавна връзка.
export default function MenuLoading() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-14" data-testid="menu-skeleton">
      {/* Заглавието е статично → показваме го веднага, без изчакване */}
      <header className="text-center">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
          <span className="h-px w-8 bg-gold" />
          Без добавена бяла захар
          <span className="h-px w-8 bg-gold" />
        </p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-ink">Меню</h1>
        <p className="mt-3 text-muted">
          Стойностите са за една порция.{" "}
          <Link href="/alergeni" className="text-brand-600 underline-offset-2 hover:underline">
            Легенда за алергените →
          </Link>
        </p>
      </header>

      {/* Скелет на категориите/продуктите, докато се зареждат */}
      <div className="mt-12 animate-pulse space-y-10" aria-hidden>
        {[0, 1].map((g) => (
          <section key={g} className="space-y-7">
            <div className="h-7 w-40 rounded-lg bg-ink/10" />
            <div className="h-px w-12 bg-ink/10" />
            <div className="space-y-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 rounded-xl bg-ink/10" />
                  <div className="min-w-0 flex-1 space-y-2.5 pt-1">
                    <div className="h-5 w-2/3 rounded bg-ink/10" />
                    <div className="h-3.5 w-1/2 rounded bg-ink/5" />
                    <div className="h-3.5 w-3/4 rounded bg-ink/5" />
                    <div className="h-3.5 w-1/3 rounded bg-ink/5" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-muted/70">Зареждаме менюто…</p>
    </div>
  );
}
