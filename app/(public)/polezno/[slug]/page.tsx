import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getPublishedArticle, listPublishedArticles } from "@/lib/data";
import ArticleBody from "./ArticleBody";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutriko.fit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await getPublishedArticle(slug);
  if (!a) return { title: "Полезно" };
  const seoTitle = a.seo_title?.trim() || a.title;
  const desc = (a.meta_description?.trim() || a.excerpt) ?? undefined;
  return {
    title: seoTitle,
    description: desc,
    alternates: { canonical: `/polezno/${a.slug}` },
    openGraph: {
      url: `/polezno/${a.slug}`,
      title: `${seoTitle} · Нутрико`,
      description: desc,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Нутрико" }],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getPublishedArticle(slug);
  if (!a) notFound();

  const url = `${SITE_URL}/polezno/${a.slug}`;
  const desc = a.meta_description?.trim() || a.excerpt || undefined;

  // Свързани статии: първо от същата секция, после допълни с други (макс. 3)
  const all = await listPublishedArticles();
  const related = (() => {
    const out = all.filter((x) => x.slug !== a.slug && a.category && x.category === a.category);
    for (const x of all) {
      if (out.length >= 3) break;
      if (x.slug !== a.slug && !out.some((r) => r.slug === x.slug)) out.push(x);
    }
    return out.slice(0, 3);
  })();

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Начало", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Полезно", item: `${SITE_URL}/polezno` },
      { "@type": "ListItem", position: 3, name: a.title, item: url },
    ],
  };
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    ...(desc ? { description: desc } : {}),
    image: `${SITE_URL}/opengraph-image`,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Нутрико" },
    publisher: { "@type": "Organization", name: "Нутрико" },
  };

  return (
    <article className="mx-auto max-w-2xl px-5 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Навигация" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <Link href="/" className="-my-1 rounded px-1 py-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          Начало
        </Link>
        <span className="text-muted/50">/</span>
        <Link href="/polezno" className="-my-1 rounded px-1 py-1 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          Полезно
        </Link>
        <span className="text-muted/50">/</span>
        <span className="text-ink/70">{a.title}</span>
      </nav>

      {a.cover_image_url && (
        <div className="relative mt-5 aspect-[2/1] w-full overflow-hidden rounded-2xl bg-brand-50 sm:aspect-[21/9]">
          <Image
            src={a.cover_image_url}
            alt={a.title}
            fill
            sizes="(min-width: 768px) 672px, 100vw"
            priority
            className="object-cover"
          />
        </div>
      )}

      <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-ink">
        {a.title}
      </h1>
      {a.excerpt && <p className="mt-3 text-lg leading-relaxed text-muted">{a.excerpt}</p>}
      <div className="mt-6 h-px w-full bg-ink/10" />
      <ArticleBody body={a.body} />
      <p className="mt-10 text-xs leading-relaxed text-muted/80">
        Информацията е с образователна цел и не е медицински съвет. При здравословни въпроси се
        консултирай със специалист.
      </p>

      {related.length > 0 && (
        <section className="mt-12 border-t border-ink/10 pt-8">
          <h2 className="font-display text-2xl font-semibold text-ink">Свързани статии</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/polezno/${r.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-white/70 transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_16px_36px_-24px_rgba(31,71,51,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {r.cover_image_url && (
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-50">
                    <Image
                      src={r.cover_image_url}
                      alt={r.title}
                      fill
                      sizes="(min-width: 640px) 210px, 90vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-display text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-brand">
                    {r.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Навигация в края */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-ink/10 pt-8">
        <Link
          href="/polezno"
          className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          ← Обратно към всички статии
        </Link>
        <Link
          href="/menu"
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Виж менюто на Нутрико →
        </Link>
      </div>
    </article>
  );
}
