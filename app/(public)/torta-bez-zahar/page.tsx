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
 * Страницата за „торта без захар".
 *
 * ЗАЩО СЪЩЕСТВУВА ОТДЕЛНО ОТ МЕНЮТО: менюто отговаря на въпроса „какво имате?"
 * на човек, който вече е в сладкарницата. Тази страница отговаря на въпроса
 * „има ли изобщо такова нещо?" на човек, който още не знае, че Нутрико
 * съществува — и го е написал в Google точно с тези думи.
 *
 * ЗАЩО НЕ ПРЕПИСВА СТАТИИТЕ: в „Полезно" вече стоят 14 статии, между които
 * „Бялата захар — какво да гледаш на етикета" с 12 000 знака. Преписването им
 * тук би направило две страници, които се състезават една с друга за едно и
 * също търсене. Тук стои краткият отговор и вратата към дългия.
 */

const TITLE = "Торта без захар — протеинови торти в Търговище";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · Нутрико` },
  description:
    "Торти без добавена захар, с реален протеин — в Търговище. Виж всички вкусове с грамажите, макросите и цените, и какво да гледаш на етикета, преди да купиш „торта без захар“.",
  alternates: { canonical: "/torta-bez-zahar" },
  openGraph: {
    type: "article",
    url: "/torta-bez-zahar",
    title: `${TITLE} · Нутрико`,
    description:
      "Торти без добавена захар с реален протеин в Търговище — вкусове, макроси и цени.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Нутрико" }],
  },
};

/** Какво да провериш на етикета — не за нашите торти, а за всяка. */
const ETIKET: { vapros: string; otgovor: string; kade?: { text: string; href: string } }[] = [
  {
    vapros: "Има ли захар под друго име?",
    otgovor:
      "Кафява захар, кокосова захар, мед, сироп от агаве, глюкозно-фруктозен сироп — за тялото това пак е захар. „Без бяла захар“ не значи „без захар“.",
    kade: {
      text: "Бялата захар — какво да гледаш на етикета",
      href: "/polezno/byalata-zahar-zashto-ya-ogranichavame",
    },
  },
  {
    vapros: "Има ли малтодекстрин?",
    otgovor:
      "Среща се в десерти, рекламирани като „без захар“. Гликемичният му индекс е по-висок от този на трапезната захар.",
  },
  {
    vapros: "От какво е блатът?",
    otgovor:
      "Бяло брашно и нишесте вдигат кръвната захар почти като захарта. Ядковото брашно се държи различно.",
    kade: {
      text: "Гликемичен индекс и гликемичен товар",
      href: "/polezno/glikemichen-indeks-i-glikemichen-tovar",
    },
  },
  {
    vapros: "Колко грама протеин има в парчето?",
    otgovor:
      "Думата „протеинов“ на кутията не е число. Числото е това, което личи — и то за реалната порция, не за 100 g.",
    kade: {
      text: "Източник на протеин и високо съдържание на протеин",
      href: "/polezno/iztochnik-na-protein-i-visoko-sadarzhanie-na-protein",
    },
  },
  {
    vapros: "С какво е подсладено?",
    otgovor:
      "Еритритол, фурми, стевия, малтитол — държат се различно в тялото и различно на вкус. Разликата си струва да се знае.",
    kade: {
      text: "Подсладителите: еритритол, фурми, мед и други",
      href: "/polezno/podsladiteli-v-desertite",
    },
  },
];

export default async function TortaBezZaharPage() {
  const [menu, s] = await Promise.all([listPublicMenu(), getSiteSettings()]);
  const directions = mapsDirectionsUrl(s);
  const torti = menu
    .filter((m) => m.category === "торта" && hasProductPage(m))
    .sort((a, b) => b.protein_serving_g - a.protein_serving_g);

  const naiProtein = torti[0] ?? null;
  const phoneHref = s.phone ? `tel:${s.phone.replace(/\s+/g, "")}` : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Начало", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Торта без захар", item: `${SITE_URL}/torta-bez-zahar` },
    ],
  };
  // Списъкът сочи към продуктовите страници — те носят цената и снимките.
  const listLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Торти без добавена захар",
    itemListElement: torti.map((t, i) => ({
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
          <span className="text-ink/70">Торта без захар</span>
        </nav>

        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
          Торта без захар в Търговище
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">
          Торти без добавена захар, с блат от ядково брашно и крем с реален суроватъчен протеин
          изолат. Подсладени с фурми и еритритол — не с бяла или кафява захар, не с малтодекстрин.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          Всяка торта в менюто носи грамаж, макроси за реалното парче и списък с алергени.
          Числата не са закръглени нагоре — смятат се от вложените суровини.{" "}
          <Link
            href="/polezno/kak-izchislyavame-makrosite-v-menyuto"
            className="font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            Как ги смятаме →
          </Link>
        </p>

        {naiProtein && (
          <p className="mt-6 rounded-2xl border border-brand/15 bg-brand-50 px-5 py-4 text-sm leading-relaxed text-ink">
            За мащаб:{" "}
            <Link
              href={productHref(naiProtein.slug)}
              className="font-medium text-brand-600 underline-offset-2 hover:underline"
            >
              {naiProtein.name}
            </Link>{" "}
            дава{" "}
            <b className="font-semibold">{naiProtein.protein_serving_g.toFixed(0)} g протеин</b> в
            едно парче от ~{naiProtein.serving_weight_g} g — колкото средна порция месо.
          </p>
        )}
      </section>

      {/* ===== ТОРТИТЕ ===== */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="font-display text-3xl font-semibold text-ink">
          Вкусовете {torti.length > 0 && <span className="text-muted/60">· {torti.length}</span>}
        </h2>
        <div className="mt-2 h-px w-12 bg-gold" />

        {torti.length === 0 ? (
          <p className="mt-6 text-muted">Менюто се обновява. Заповядайте отново скоро.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {torti.map((t) => (
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
                    {t.protein_serving_g.toFixed(0)} g протеин · {t.kcal_serving.toFixed(0)} kcal
                  </p>
                  {t.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                      {t.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-baseline justify-between gap-3 pt-4">
                    <span className="font-display text-lg font-semibold text-brand tabular-nums">
                      {eur(t.price_eur ?? 0)}
                      <span className="ml-1 text-xs font-normal text-muted">/ парче</span>
                    </span>
                    {t.whole_price_eur != null && (
                      <span className="text-xs text-muted tabular-nums">
                        цяла {eur(t.whole_price_eur)}
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
          {phoneHref && (
            <a
              href={phoneHref}
              className="rounded-full border border-brand/30 px-6 py-3 font-medium text-brand-600 transition-colors hover:bg-brand-50"
            >
              Поръчай цяла торта за повод
            </a>
          )}
        </div>
      </section>

      {/* ===== ЕТИКЕТЪТ ===== */}
      <section className="bg-white/60 py-14">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="font-display text-3xl font-semibold text-ink">
            Пет въпроса към всяка „торта без захар“
          </h2>
          <div className="mt-2 h-px w-12 bg-gold" />
          <p className="mt-5 leading-relaxed text-muted">
            Надписът „без захар“ не е защитено понятие. Тези пет въпроса стигат, за да разбереш
            какво държиш — независимо чия е тортата.
          </p>

          <ol className="mt-8 space-y-6">
            {ETIKET.map((e, i) => (
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

          <p className="mt-8 text-sm leading-relaxed text-muted">
            Отговорите за нашите торти стоят на страницата на всяка от тях — съставки, макроси за
            парчето и алергени. Нищо не се крие зад думата „протеинов“.
          </p>
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
        <div className="mt-6 flex flex-wrap gap-3">
          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-brand px-6 py-3 font-medium text-cream transition-colors hover:bg-brand-600"
            >
              Маршрут до нас →
            </a>
          )}
          <Link
            href="/polezno"
            className="rounded-full border border-brand/30 px-6 py-3 font-medium text-brand-600 transition-colors hover:bg-brand-50"
          >
            Полезното четиво
          </Link>
        </div>
      </section>
    </div>
  );
}
