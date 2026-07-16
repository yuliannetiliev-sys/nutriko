import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { listPublishedArticles } from "@/lib/data";
import type { Article } from "@/lib/types";
import { getContent } from "@/lib/content";
import { POLEZNO_SECTIONS } from "@/lib/polezno";
import { ARTICLE, articleHref } from "@/lib/links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Полезно",
  description:
    "Полезни статии на ясен език: как да четеш менюто, протеин и макроси, подсладители, гликемичен товар, истински съставки и алергени — какво стои зад десертите на Нутрико.",
  alternates: { canonical: "/polezno" },
  openGraph: {
    url: "/polezno",
    title: "Полезно · Нутрико",
    description: "Протеин, макроси, подсладители, гликемичен товар и реални съставки — на ясен език.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Нутрико" }],
  },
};

export default async function PoleznoPage() {
  const [articles, c] = await Promise.all([listPublishedArticles(), getContent()]);

  // Групиране по категория (articles идва подреден по sort_order)
  const byCat = new Map<string, Article[]>();
  for (const a of articles) {
    const k = a.category ?? "drugi";
    const list = byCat.get(k);
    if (list) list.push(a);
    else byCat.set(k, [a]);
  }

  const known = new Set(POLEZNO_SECTIONS.map((s) => s.key));
  const sections = POLEZNO_SECTIONS.map((s) => ({
    ...s,
    title: c[s.titleKey],
    intro: c[s.introKey],
    items: byCat.get(s.key) ?? [],
  })).filter((s) => s.items.length > 0);
  const leftover = [...byCat.entries()].filter(([k]) => !known.has(k)).flatMap(([, list]) => list);

  return (
    <div>
      {/* HERO — банер със снимка отгоре (цялата сцена, без overlay), текст отдолу */}
      <section className="mx-auto max-w-5xl px-5 pt-10 sm:pt-12">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-brand-50">
          <Image
            src={c.polezno_hero_image}
            alt="Приятна атмосфера с десертите на Нутрико"
            fill
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
        </div>
        <div className="mt-8 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
            <span className="h-px w-8 bg-gold" />
            Полезно
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {c.polezno_hero_title}
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-muted">{c.polezno_hero_subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Виж менюто
            </Link>
            <Link
              href={articleHref(ARTICLE.chooseDessert)}
              className="rounded-full border border-brand/30 px-6 py-3 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Как да избера десерт
            </Link>
          </div>
        </div>
      </section>

      {/* СЕКЦИИ */}
      <div className="mx-auto max-w-5xl space-y-16 px-5 py-16">
        {sections.map((sec) => (
          <SectionBlock
            key={sec.key}
            title={sec.title}
            intro={sec.intro}
            items={sec.items}
            tone={sec.tone}
          />
        ))}
        {leftover.length > 0 && <SectionBlock title="Други статии" intro={null} items={leftover} />}
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  intro,
  items,
  tone,
}: {
  title: string;
  intro: string | null;
  items: Article[];
  tone?: "safety";
}) {
  const safety = tone === "safety";
  return (
    <section className={safety ? "rounded-3xl border border-gold/30 bg-gold/[0.06] p-6 sm:p-8" : ""}>
      <header className="max-w-2xl">
        <h2 className="font-display text-3xl font-semibold text-brand">{title}</h2>
        <div className="mt-1.5 h-px w-12 bg-gold" />
        {intro && <p className="mt-3 leading-relaxed text-muted">{intro}</p>}
      </header>
      {safety ? (
        <div className="mt-6 space-y-4">
          {items.map((a) => (
            <SafetyCard key={a.slug} a={a} />
          ))}
        </div>
      ) : (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <ArticleCard key={a.slug} a={a} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArticleCard({ a }: { a: Article }) {
  return (
    <Link
      href={articleHref(a.slug)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white/70 transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_20px_45px_-26px_rgba(31,71,51,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {a.cover_image_url && (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-50">
          <Image
            src={a.cover_image_url}
            alt={a.title}
            fill
            sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-brand">
          {a.title}
        </h3>
        {a.excerpt && <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{a.excerpt}</p>}
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
          Прочети{" "}
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}

// Компактна хоризонтална карта за секция „Безопасност" (1 статия → да не е огромна)
function SafetyCard({ a }: { a: Article }) {
  return (
    <Link
      href={articleHref(a.slug)}
      className="group flex items-stretch gap-4 overflow-hidden rounded-2xl border border-ink/10 bg-white/70 p-3 transition duration-200 hover:border-brand/30 hover:shadow-[0_16px_36px_-26px_rgba(31,71,51,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:p-4"
    >
      {a.cover_image_url && (
        <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:w-44">
          <Image
            src={a.cover_image_url}
            alt={a.title}
            fill
            sizes="180px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-col justify-center py-1">
        <h3 className="font-display text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-brand">
          {a.title}
        </h3>
        {a.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted sm:line-clamp-3">
            {a.excerpt}
          </p>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
          Прочети{" "}
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  );
}
