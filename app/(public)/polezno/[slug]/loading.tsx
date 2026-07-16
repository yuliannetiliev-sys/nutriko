import Link from "next/link";

// Моментален fallback при навигация към статия /polezno/[slug] (force-dynamic).
// Често достигана през „?" линка от макросите в менюто.
export default function ArticleLoading() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-14" data-testid="article-skeleton">
      <Link href="/polezno" className="text-sm font-medium text-brand-600 hover:text-brand">
        ← Полезно
      </Link>

      <div className="mt-4 animate-pulse" aria-hidden>
        {/* Заглавие */}
        <div className="h-9 w-11/12 rounded-lg bg-ink/10" />
        <div className="mt-2 h-9 w-2/3 rounded-lg bg-ink/10" />
        {/* Подзаглавие */}
        <div className="mt-5 h-5 w-full rounded bg-ink/5" />
        <div className="mt-2 h-5 w-5/6 rounded bg-ink/5" />

        <div className="mt-6 h-px w-full bg-ink/10" />

        {/* Тяло */}
        <div className="mt-6 space-y-3">
          {[
            "w-full",
            "w-full",
            "w-4/5",
            "w-2/3",
            "w-full",
            "w-11/12",
            "w-3/4",
          ].map((w, i) => (
            <div key={i} className={`h-4 ${w} rounded bg-ink/5`} />
          ))}
        </div>
      </div>
    </article>
  );
}
