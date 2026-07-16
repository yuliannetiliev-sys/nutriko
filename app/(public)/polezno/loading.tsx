// Моментален fallback при навигация към /polezno (force-dynamic).
export default function PoleznoLoading() {
  return (
    <div data-testid="polezno-skeleton">
      {/* HERO — банер отгоре, текст отдолу */}
      <section className="mx-auto max-w-5xl px-5 pt-10 sm:pt-12">
        <div className="aspect-[16/9] w-full animate-pulse rounded-3xl bg-ink/10" />
        <div className="mt-8 max-w-2xl animate-pulse">
          <div className="h-4 w-24 rounded bg-ink/10" />
          <div className="mt-4 h-10 w-3/4 rounded-lg bg-ink/10" />
          <div className="mt-4 h-4 w-full rounded bg-ink/5" />
          <div className="mt-2 h-4 w-2/3 rounded bg-ink/5" />
          <div className="mt-7 flex flex-wrap gap-3">
            <div className="h-11 w-32 rounded-full bg-ink/10" />
            <div className="h-11 w-40 rounded-full bg-ink/10" />
          </div>
        </div>
      </section>

      {/* СЕКЦИИ */}
      <div className="mx-auto max-w-5xl space-y-16 px-5 py-16">
        {[0, 1].map((s) => (
          <section key={s} className="animate-pulse">
            <div className="h-8 w-56 rounded-lg bg-ink/10" />
            <div className="mt-1.5 h-px w-12 bg-ink/10" />
            <div className="mt-3 h-4 w-2/3 rounded bg-ink/5" />
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-ink/10 bg-white/60 p-5">
                  <div className="h-5 w-3/4 rounded bg-ink/10" />
                  <div className="mt-3 h-3.5 w-full rounded bg-ink/5" />
                  <div className="mt-2 h-3.5 w-5/6 rounded bg-ink/5" />
                  <div className="mt-4 h-3.5 w-20 rounded bg-ink/10" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
