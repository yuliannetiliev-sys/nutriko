import Link from "next/link";
import type { Metadata } from "next";
import { listAllergens } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Алергени",
  description:
    "Списък на 14-те официални алергена съгласно Регламент (ЕС) № 1169/2011. Номерата до продуктите в менюто отговарят на този списък.",
  alternates: { canonical: "/alergeni" },
  openGraph: {
    url: "/alergeni",
    title: "Алергени · Нутрико",
    description: "14-те официални алергена (Регламент ЕС 1169/2011), отговарящи на номерата в менюто.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Нутрико" }],
  },
};

export default async function AllergensPage() {
  const allergens = await listAllergens();

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
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

      <ol className="mt-12 space-y-3">
        {allergens.map((a) => (
          <li
            key={a.id}
            className="flex gap-4 rounded-2xl border border-ink/10 bg-white/60 px-5 py-4"
          >
            <span className="font-display text-2xl font-semibold tabular-nums text-brand">
              {a.id}
            </span>
            <div>
              <p className="font-medium text-ink">{a.name}</p>
              {a.examples && <p className="mt-0.5 text-sm text-muted">{a.examples}</p>}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-xs leading-relaxed text-muted">
        Списъкът е съгласно Приложение II на Регламент (ЕС) № 1169/2011 за предоставяне на
        информация за храните на потребителите (прилага се пряко в България, контролиран от БАБХ).
        Възможно е наличие на следи от алергени поради приготвяне в обща кухня — при съмнение,
        попитайте персонала.
      </p>

      <div className="mt-12 text-center">
        <Link
          href="/menu"
          className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-brand-600"
        >
          ← Към менюто
        </Link>
      </div>
    </div>
  );
}
