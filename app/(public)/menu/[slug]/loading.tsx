import Link from "next/link";

// Моментален fallback при навигация към продукт /menu/[slug] (force-dynamic).
// Достига се основно от менюто на телефон — там всяка пауза изглежда като
// счупен линк, затова скелетът повтаря разположението: снимка вляво, текст вдясно.
export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14" data-testid="product-skeleton">
      <Link href="/menu" className="text-sm font-medium text-brand-600 hover:text-brand">
        ← Меню
      </Link>

      <div className="mt-6 grid animate-pulse gap-8 lg:grid-cols-2 lg:gap-12" aria-hidden>
        <div>
          <div className="aspect-[4/3] w-full rounded-3xl bg-ink/10" />
          <div className="mt-3 flex gap-3">
            <div className="h-16 w-16 rounded-xl bg-ink/5" />
            <div className="h-16 w-16 rounded-xl bg-ink/5" />
          </div>
        </div>

        <div>
          <div className="h-3 w-48 rounded bg-ink/5" />
          <div className="mt-4 h-10 w-4/5 rounded-lg bg-ink/10" />
          <div className="mt-5 h-8 w-32 rounded bg-ink/10" />
          <div className="mt-5 space-y-2">
            <div className="h-4 w-full rounded bg-ink/5" />
            <div className="h-4 w-11/12 rounded bg-ink/5" />
          </div>
          <div className="mt-7 h-52 w-full rounded-2xl bg-ink/5" />
        </div>
      </div>
    </div>
  );
}
