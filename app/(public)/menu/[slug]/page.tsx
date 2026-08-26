import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  getPublicMenuItem,
  listPublicMenu,
  listAllergens,
  listCategories,
  getSiteSettings,
  type MenuItem,
} from "@/lib/data";
import { eur } from "@/lib/price";
import { ARTICLE, articleHref } from "@/lib/links";
import Gallery from "./Gallery";
import FollowBar from "../../FollowBar";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutriko.fit";

/**
 * Изречението, което казва КАКВО е това — не с думите на менюто, а с думите,
 * с които хората търсят. „Протеинова торта" и „торта без захар" не се срещат
 * никъде в имената на продуктите, а точно тях пишат в Google.
 */
const KAKVO: Record<string, string> = {
  торта: "Протеинова торта без добавена захар",
  вафла: "Протеинови вафли без добавена захар",
  халва: "Протеинова халва без добавена захар",
  шейк: "Протеинов шейк без добавена захар",
};

const OSHTE: Record<string, string> = {
  торта: "торти",
  вафла: "вафли",
  халва: "халва",
  шейк: "шейкове",
};

function porciya(m: MenuItem): string {
  return m.category === "торта" ? "парчето" : "порцията";
}

/** Продукти без макроси са купени отвън (вода, кафе, чай) — нямат какво да кажат. */
function nasheProizvodstvo(m: MenuItem): boolean {
  return m.show_macros && m.kcal_serving > 0;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = await getPublicMenuItem(slug);
  if (!m) return { title: "Продуктът не е намерен" };

  const kakvo = KAKVO[m.category ?? ""] ?? "Без добавена захар";
  const macros = nasheProizvodstvo(m)
    ? `${m.protein_serving_g.toFixed(0)} g протеин и ${m.kcal_serving.toFixed(0)} kcal в ${porciya(m)}. `
    : "";
  const description =
    (m.description?.trim() ? `${m.description.trim()} ` : `${kakvo}. `) +
    macros +
    "Нутрико — протеинова сладкарница в Търговище.";

  return {
    // Заглавието се пише цялото тук, а не през шаблона „%s · Нутрико":
    // трябва да събере името, „без захар" и града, а шаблонът би го издул.
    title: { absolute: `${m.name} · без захар · Нутрико, Търговище` },
    description: description.slice(0, 300),
    alternates: { canonical: `/menu/${m.slug}` },
    // Купените отвън напитки нямат съдържание, което да заслужава място в
    // Google. По-добре ги няма, отколкото да разреждат сайта.
    ...(nasheProizvodstvo(m) ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "article",
      url: `/menu/${m.slug}`,
      title: `${m.name} · Нутрико`,
      description: description.slice(0, 200),
      images: [{ url: m.image_url ?? "/og.jpg", width: 1200, height: 630, alt: m.name }],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [m, all, allergens, categories, s] = await Promise.all([
    getPublicMenuItem(slug),
    listPublicMenu(),
    listAllergens(),
    listCategories(),
    getSiteSettings(),
  ]);
  if (!m) notFound();

  const url = `${SITE_URL}/menu/${m.slug}`;
  const imgs = m.image_urls.length ? m.image_urls : m.image_url ? [m.image_url] : [];
  const catLabel = categories.find((c) => c.key === m.category)?.label ?? m.category ?? "Меню";
  const kakvo = KAKVO[m.category ?? ""] ?? null;
  const alerName = new Map(allergens.map((a) => [a.id, a.name]));
  const mine = [...m.allergen_ids].sort((a, b) => a - b);

  const related = all
    .filter((x) => x.slug !== m.slug && x.category === m.category && nasheProizvodstvo(x))
    .sort((a, b) => (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0))
    .slice(0, 3);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Начало", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Меню", item: `${SITE_URL}/menu` },
      { "@type": "ListItem", position: 3, name: m.name, item: url },
    ],
  };

  // Product + Offer. „InStoreOnly" е точното: продава се на място, не онлайн —
  // и не се твърди наличност, каквато магазинът още не може да гарантира.
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: m.name,
    ...(m.description ? { description: m.description } : {}),
    ...(imgs.length ? { image: imgs } : {}),
    brand: { "@type": "Brand", name: "Нутрико" },
    category: catLabel,
    url,
  };
  if (m.price_eur != null) {
    productLd.offers = {
      "@type": "Offer",
      price: m.price_eur.toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStoreOnly",
      url,
    };
  }

  const cell = "px-3 py-2 text-right tabular-nums";

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <nav aria-label="Навигация" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        <Link href="/" className="-my-1 rounded px-1 py-1 transition-colors hover:text-brand">
          Начало
        </Link>
        <span className="text-muted/50">/</span>
        <Link href="/menu" className="-my-1 rounded px-1 py-1 transition-colors hover:text-brand">
          Меню
        </Link>
        <span className="text-muted/50">/</span>
        <span className="text-ink/70">{m.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>{imgs.length > 0 && <Gallery images={imgs} alt={m.name} />}</div>

        <div>
          {kakvo && (
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-brand-600">
              <span className="h-px w-6 bg-gold" />
              {kakvo}
            </p>
          )}
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink">
            {m.name}
          </h1>

          {m.price_eur != null && (
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-3xl font-semibold text-brand tabular-nums">
                {eur(m.price_eur)}
              </span>
              <span className="text-sm text-muted">
                за {m.category === "торта" ? "парче" : "порция"}
                {m.serving_weight_g > 0 && ` ~${m.serving_weight_g} ${m.serving_unit}`}
              </span>
            </p>
          )}
          {m.whole_price_eur != null && m.servings > 1 && (
            <p className="mt-1 text-sm text-muted">
              {m.category === "торта" ? "Цяла торта" : "Цяло"} ({m.servings}{" "}
              {m.category === "торта" ? "парчета" : "порции"}):{" "}
              <span className="font-medium text-ink/80">{eur(m.whole_price_eur)}</span>
            </p>
          )}

          {m.description && <p className="mt-5 leading-relaxed text-muted">{m.description}</p>}

          {m.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {m.tags.map((t) => (
                <span key={t} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-600">
                  {t}
                </span>
              ))}
            </div>
          )}

          {nasheProizvodstvo(m) && (
            <div className="mt-7 overflow-hidden rounded-2xl border border-ink/10 bg-white/70">
              <table className="w-full text-sm">
                <caption className="border-b border-ink/10 bg-brand-50/60 px-4 py-2.5 text-left font-display text-base font-semibold text-ink">
                  Хранителни стойности
                </caption>
                <thead>
                  <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 text-left font-medium"> </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {m.category === "торта" ? "Парче" : "Порция"}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">100 {m.serving_unit}</th>
                  </tr>
                </thead>
                <tbody className="text-ink">
                  <tr className="border-b border-ink/5 bg-brand-50/40 font-medium">
                    <td className="px-3 py-2 text-left">Протеин</td>
                    <td className={cell}>{m.protein_serving_g.toFixed(1)} g</td>
                    <td className={`${cell} text-muted`}>{m.protein_100g.toFixed(1)} g</td>
                  </tr>
                  <tr className="border-b border-ink/5">
                    <td className="px-3 py-2 text-left">Въглехидрати</td>
                    <td className={cell}>{m.carbs_serving_g.toFixed(1)} g</td>
                    <td className={`${cell} text-muted`}>{m.carbs_100g.toFixed(1)} g</td>
                  </tr>
                  <tr className="border-b border-ink/5">
                    <td className="px-3 py-2 text-left">Мазнини</td>
                    <td className={cell}>{m.fat_serving_g.toFixed(1)} g</td>
                    <td className={`${cell} text-muted`}>{m.fat_100g.toFixed(1)} g</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-left">Калории</td>
                    <td className={cell}>{m.kcal_serving.toFixed(0)} kcal</td>
                    <td className={`${cell} text-muted`}>{m.kcal_100g.toFixed(0)} kcal</td>
                  </tr>
                  {m.gi_estimate != null && (
                    <tr className="border-t border-ink/10 bg-white/60">
                      <td colSpan={3} className="px-3 py-2.5 text-left text-xs leading-relaxed text-muted">
                        Гликемичен индекс{" "}
                        <b className="font-medium text-ink/80 tabular-nums">~{m.gi_estimate}</b>
                        {m.gl_serving != null && (
                          <>
                            {" · гликемичен товар "}
                            <b className="font-medium text-ink/80 tabular-nums">~{m.gl_serving}</b>
                            {` на ${m.category === "торта" ? "парче" : "порция"}`}
                          </>
                        )}
                        <span className="text-muted/70"> (референтни)</span>{" "}
                        <Link
                          href={articleHref(ARTICLE.glycemic)}
                          className="font-medium text-brand-600 underline-offset-2 hover:underline"
                          title="Какво е гликемичен индекс и товар?"
                        >
                          ?
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {mine.length > 0 && (
            <div className="mt-6">
              <h2 className="font-display text-lg font-semibold text-ink">Алергени</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {mine.map((id) => (
                  <li
                    key={id}
                    className="rounded-full border border-ink/15 bg-white/70 px-3 py-1 text-xs text-ink/80"
                  >
                    <span className="font-medium text-brand-600">{id}</span> ·{" "}
                    {alerName.get(id) ?? "—"}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Номерата следват{" "}
                <Link
                  href="/alergeni"
                  className="font-medium text-brand-600 underline-offset-2 hover:underline"
                >
                  официалната легенда за 14-те алергена
                </Link>
                .
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="rounded-full bg-brand px-6 py-3 font-medium text-cream transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              ← Цялото меню
            </Link>
            {s.phone && (
              <a
                href={`tel:${s.phone.replace(/\s+/g, "")}`}
                className="rounded-full border border-brand/30 px-6 py-3 font-medium text-brand-600 transition-colors hover:bg-brand-50"
              >
                Поръчай по телефона
              </a>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-ink/10 pt-10">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Още {OSHTE[m.category ?? ""] ?? "от менюто"}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/menu/${r.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_16px_36px_-24px_rgba(31,71,51,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {r.image_url && (
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-50">
                    <Image
                      src={r.image_url}
                      alt={r.name}
                      fill
                      sizes="(min-width: 640px) 300px, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-display text-base font-semibold leading-snug text-ink transition-colors group-hover:text-brand">
                    {r.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {r.protein_serving_g.toFixed(0)} g протеин · {r.kcal_serving.toFixed(0)} kcal
                  </p>
                  {r.price_eur != null && (
                    <p className="mt-auto pt-3 font-display font-semibold text-brand tabular-nums">
                      {eur(r.price_eur)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mx-auto mt-16 max-w-xl border-t border-ink/10 pt-6 text-center text-xs leading-relaxed text-muted/80">
        Грамажите са приблизителни и може да варират при ръчно приготвяне. Макросите са референтни
        стойности, изчислени от вложените продукти.
      </p>

      <FollowBar fb={s.facebook_url} ig={s.instagram_url} />
    </div>
  );
}
