import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { listPublicMenu, getSiteSettings } from "@/lib/data";
import { mapsDirectionsUrl } from "@/lib/maps";
import { eur } from "@/lib/price";
import { productHref, hasProductPage } from "@/lib/links";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutriko.fit";

/**
 * Страницата за „без глутен".
 *
 * ЗАЩО СЪЩЕСТВУВА: от разговорите с клиенти (29.10.2026) „без глутен" излезе
 * вторият най-силен довод след „без захар" — по-силен от „протеиново", върху
 * което стъпваше цялото ранно позициониране. В Google за „торти без глутен
 * Търговище" не излиза нищо. Сестра е на `/torta-bez-zahar`, която е №1 за
 * своята заявка.
 *
 * ЗАЩО СПИСЪКЪТ Е ПО ЕТИКЕТ, А НЕ ПО КАТЕГОРИЯ: „без глутен" минава напряко
 * през торти, халва и барове. Етикетът се слага само където два независими
 * признака съвпадат — няма алерген 1 И в рецептата няма глутенова съставка.
 */

const TITLE = "Торти и десерти без глутен в Търговище";
const TAG = "без глутен";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · Нутрико` },
  description:
    "Десерти без глутен в Търговище — торти с блат от смлени бадеми и орехи, без пшенично брашно и без добавена захар. Виж вкусовете с грамажите, макросите и цените.",
  alternates: { canonical: "/bez-gluten" },
  openGraph: {
    type: "article",
    url: "/bez-gluten",
    title: `${TITLE} · Нутрико`,
    description: "Торти и десерти без глутен и без захар — ядкови блатове, Търговище.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Нутрико" }],
  },
};

/** Какво пита човек, който избягва глутен — и честният отговор. */
const VAPROSI: { vapros: string; otgovor: string; kade?: { text: string; href: string } }[] = [
  {
    vapros: "С какво е заменено брашното?",
    otgovor:
      "Със смлени бадеми, орехи и лешници. Не с оризово нишесте и не с готова безглутенова смес — ядките дават плътност и ситост, каквито нишестето няма.",
  },
  {
    vapros: "Кухнята обща ли е?",
    otgovor:
      "Да, и това е важно да се знае. В същата кухня се правят Френската селска торта, вафлите и баклавата, които съдържат глутен. Работи се с отделни съдове и повърхности, но при целиакия преценката е твоя — питай на място какво е правено в деня.",
    kade: {
      text: "Алергени и обща кухня — какво трябва да знаеш",
      href: "/polezno/alergeni-i-obshta-kuhnya-kakvo-tryabva-da-znaesh",
    },
  },
  {
    vapros: "Без глутен значи ли без захар?",
    otgovor:
      "Не. Това са две различни неща и повечето безглутенови десерти по магазините са пълни със захар. Тук са и двете — затова до всеки продукт пише какво съдържа.",
    kade: {
      text: "Бялата захар — какво да гледаш на етикета",
      href: "/polezno/byalata-zahar-zashto-ya-ogranichavame",
    },
  },
  {
    vapros: "Как се отразява на кръвната захар?",
    otgovor:
      "До всеки десерт стои изчисленият гликемичен индекс и товар за реалната порция. Числата не са еднакви — ядковите блатове са ниско, а тези с пълнозърнесто брашно и мед са чувствително по-високо. Затова е по продукт, а не общо твърдение.",
    kade: {
      text: "Гликемичен индекс и гликемичен товар",
      href: "/polezno/glikemichen-indeks-i-glikemichen-tovar",
    },
  },
  {
    vapros: "Има ли веган?",
    otgovor:
      "Да — шоколадов тарт и торта „Веган Солен Карамел“, без яйца и мляко. Нови са, затова питай дали са налични този ден.",
  },
];

export default async function BezGlutenPage() {
  const [menu, s] = await Promise.all([listPublicMenu(), getSiteSettings()]);
  const directions = mapsDirectionsUrl(s);
  const ima = (m: { tags: string[] }, tag: string) =>
    m.tags.some((t) => t.trim().toLowerCase() === tag);

  const vsichki = menu.filter((m) => hasProductPage(m) && ima(m, TAG));
  // Най-напред тези с най-нисък гликемичен товар — точно това търси човекът,
  // който си мери кръвната захар. Без стойност отиват накрая.
  const spisak = [...vsichki].sort(
    (a, b) => (a.gl_serving ?? 999) - (b.gl_serving ?? 999)
  );
  const nayNisak = spisak.find((m) => m.gl_serving != null) ?? null;
  const veganski = vsichki.filter((m) => ima(m, "веган"));
  const phoneHref = s.phone ? `tel:${s.phone.replace(/\s+/g, "")}` : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Начало", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Без глутен", item: `${SITE_URL}/bez-gluten` },
    ],
  };
  const listLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Десерти без глутен",
    itemListElement: spisak.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: `${SITE_URL}/menu/${t.slug}`,
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }}
      />

      {/* ===== УВОД ===== */}
      <section className="mx-auto max-w-3xl px-5 pt-12 pb-8 sm:pt-16">
        <nav aria-label="Навигация" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <Link href="/" className="-my-1 rounded px-1 py-1 transition-colors hover:text-brand">
            Начало
          </Link>
          <span className="text-muted/50">/</span>
          <span className="text-ink/70">Без глутен</span>
        </nav>

        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
          Десерти без глутен в Търговище
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Блатът е от смлени бадеми, орехи и лешници — не от пшенично брашно и не от готова
          безглутенова смес. И не само без глутен: тортите са и без добавена захар.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          До всеки десерт стоят грамажът, макросите за реалната порция, алергените и
          гликемичният товар. Числата се смятат от вложените суровини.{" "}
          <Link
            href="/polezno/kak-izchislyavame-makrosite-v-menyuto"
            className="font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            Как ги смятаме →
          </Link>
        </p>

        {nayNisak && (
          <p className="mt-6 rounded-2xl border border-brand/15 bg-brand-50 px-5 py-4 text-sm leading-relaxed text-ink">
            За мащаб:{" "}
            <Link
              href={productHref(nayNisak.slug)}
              className="font-medium text-brand-600 underline-offset-2 hover:underline"
            >
              {nayNisak.name}
            </Link>{" "}
            е с гликемичен товар{" "}
            <b className="font-semibold">~{nayNisak.gl_serving}</b> на парче. Под 10 се смята за
            нисък.
          </p>
        )}

        {veganski.length > 0 && (
          <p className="mt-4 leading-relaxed text-muted">
            <b className="font-medium text-ink">Веган също:</b>{" "}
            {veganski.map((v, i) => (
              <span key={v.slug}>
                {i > 0 && ", "}
                <Link
                  href={productHref(v.slug)}
                  className="font-medium text-brand-600 underline-offset-2 hover:underline"
                >
                  {v.name}
                </Link>
              </span>
            ))}{" "}
            — без яйца и мляко.
          </p>
        )}
      </section>

      {/* ===== СПИСЪКЪТ ===== */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="font-display text-3xl font-semibold text-ink">
          Без глутен {spisak.length > 0 && <span className="text-muted/60">· {spisak.length}</span>}
        </h2>
        <div className="mt-2 h-px w-12 bg-gold" />
        <p className="mt-4 text-sm text-muted">Подредени по гликемичен товар — от най-ниския нагоре.</p>

        {spisak.length === 0 ? (
          <p className="mt-6 text-muted">Менюто се обновява. Заповядайте отново скоро.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {spisak.map((t) => (
              <Link
                key={t.slug}
                href={productHref(t.slug)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_18px_40px_-24px_rgba(31,71,51,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {t.image_url && (
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-50">
                    <Image
                      src={t.image_url}
                      alt={t.name}
                      fill
                      sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-brand">
                    {t.name}
                  </h3>
                  <p className="mt-1.5 text-sm font-medium text-brand-600">
                    {t.gl_serving != null
                      ? `гликемичен товар ~${t.gl_serving}`
                      : `${t.protein_serving_g.toFixed(0)} g протеин`}
                    {t.kcal_serving > 0 && ` · ${t.kcal_serving.toFixed(0)} kcal`}
                  </p>
                  {t.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                      {t.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-baseline justify-between gap-3 pt-4">
                    {t.price_eur != null && (
                      <span className="font-display text-lg font-semibold text-brand tabular-nums">
                        {eur(t.price_eur)}
                      </span>
                    )}
                    {t.whole_price_eur != null && t.servings > 1 && (
                      <span className="text-xs text-muted tabular-nums">
                        цяло {eur(t.whole_price_eur)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/menu"
            className="rounded-full bg-brand px-6 py-3 font-medium text-cream transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Цялото меню →
          </Link>
          <Link
            href="/torta-bez-zahar"
            className="rounded-full border border-brand/30 px-6 py-3 font-medium text-brand-600 transition-colors hover:bg-brand-50"
          >
            Торти без захар
          </Link>
          {phoneHref && (
            <a
              href={phoneHref}
              className="rounded-full border border-brand/30 px-6 py-3 font-medium text-brand-600 transition-colors hover:bg-brand-50"
            >
              Поръчай цяла торта
            </a>
          )}
        </div>
      </section>

      {/* ===== ВЪПРОСИТЕ ===== */}
      <section className="bg-white/60 py-14">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="font-display text-3xl font-semibold text-ink">Преди да опиташ</h2>
          <div className="mt-2 h-px w-12 bg-gold" />
          <p className="mt-5 leading-relaxed text-muted">
            Петте неща, които хората питат най-често — с честния отговор, включително там,
            където той не е удобен.
          </p>

          <ol className="mt-8 space-y-6">
            {VAPROSI.map((e, i) => (
              <li key={e.vapros} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-lg font-semibold text-brand">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">{e.vapros}</h3>
                  <p className="mt-1 leading-relaxed text-muted">{e.otgovor}</p>
                  {e.kade && (
                    <Link
                      href={e.kade.href}
                      className="mt-1.5 inline-block text-sm font-medium text-brand-600 underline-offset-2 hover:underline"
                    >
                      {e.kade.text} →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== КЪДЕ СМЕ ===== */}
      <section className="mx-auto max-w-3xl px-5 py-14">
        <h2 className="font-display text-3xl font-semibold text-ink">Къде да ги намериш</h2>
        <div className="mt-2 h-px w-12 bg-gold" />
        <div className="mt-5 space-y-2 text-muted">
          {s.address && <p className="whitespace-pre-line text-ink">{s.address}</p>}
          {s.hours && <p className="whitespace-pre-line">{s.hours}</p>}
          {s.phone && phoneHref && (
            <p>
              <a href={phoneHref} className="font-medium text-brand-600 hover:text-brand">
                {s.phone}
              </a>
            </p>
          )}
        </div>
        {directions && (
          <div className="mt-6">
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-brand px-6 py-3 font-medium text-cream transition-colors hover:bg-brand-600"
            >
              Маршрут до нас →
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
