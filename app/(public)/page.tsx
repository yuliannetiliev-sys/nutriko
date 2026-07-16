import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { listPublicMenu, getSiteSettings } from "@/lib/data";
import { mapsDirectionsUrl } from "@/lib/maps";
import { dualPrice } from "@/lib/price";
import { localBusinessJsonLd } from "@/lib/jsonld";
import { getContent, clines, cpairs } from "@/lib/content";
import { ARTICLE, articleHref } from "@/lib/links";
import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  description:
    "Протеинови торти, вафли, халва, шейкове и смутита — без добавена бяла захар, с повече протеин, ядки и тахан. Скоро отваряме в Търговище. Виж менюто и маршрута.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Нутрико" }],
  },
};

const HERO_TITLE_FALLBACK =
  "Протеинови десерти за хора, които искат сладко — без захарния удар след това";
const HERO_SUB_FALLBACK =
  "Торти, вафли, халва, шейкове и смутита с повече протеин, ядки и тахан. Без добавена бяла захар, с плътен истински вкус.";

const STORAGE = "https://xrdanumtjbrpkrjtvyjx.supabase.co/storage/v1/object/public/product-images/site";
const IMG = {
  texture: `${STORAGE}/texture-slice.png`,
  tahini: `${STORAGE}/ingredients-tahini.png`,
  coconut: `${STORAGE}/ingredients-coconut.png`,
  atmosphere: `${STORAGE}/atmosphere-coffee.png`,
};

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-5 w-5 shrink-0 text-brand"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default async function Home() {
  const [menu, s, c] = await Promise.all([listPublicMenu(), getSiteSettings(), getContent()]);
  const directions = mapsDirectionsUrl(s);
  const featured = menu.filter((m) => m.category === "торта").slice(0, 3);
  const cakeImg =
    (menu.find((m) => m.slug === "kokosova-torta" && m.image_url) ??
      menu.find((m) => m.category === "торта" && m.image_url))?.image_url ?? null;

  // Редактируеми текстове (с fallback към подразбиращите се)
  const occasions = clines(c.occasions);
  const audience = clines(c.audience);
  const differentiators = cpairs(c.differentiators);
  const before = clines(c.before);
  const faq = cpairs(c.faq);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutriko.fit";
  const qrSvg = await QRCode.toString(`${siteUrl}/menu`, {
    type: "svg",
    margin: 0,
    color: { dark: "#1f4733", light: "#00000000" },
  });

  const phoneHref = s.phone ? `tel:${s.phone.replace(/\s+/g, "")}` : null;
  const jsonLd = localBusinessJsonLd(s, siteUrl);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl"
        />
        <div className="mx-auto max-w-5xl px-5 pt-14 pb-10 sm:pt-20">
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
            <span className="h-px w-8 bg-gold" />
            Скоро отваряме в Търговище
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            {s.hero_title || HERO_TITLE_FALLBACK}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            {s.hero_subtitle || HERO_SUB_FALLBACK}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/menu"
              className="rounded-full bg-brand px-7 py-3.5 font-medium text-cream transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Виж менюто →
            </Link>
            {directions && (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-brand/30 px-6 py-3.5 font-medium text-brand-600 transition-colors hover:bg-brand-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="m3 11 19-9-9 19-2-8-8-2z" />
                </svg>
                Вземи маршрут до нас
              </a>
            )}
          </div>
          {s.address && (
            <p className="mt-5 flex items-start gap-2 text-sm text-muted">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="whitespace-pre-line">{s.address}</span>
            </p>
          )}

          {s.hero_image_url && (
            <div className="relative mt-10 aspect-video w-full overflow-hidden rounded-3xl">
              <Image
                src={s.hero_image_url}
                alt="Нутрико — протеинови торти, вафли и шейкове без добавена захар"
                fill
                sizes="(min-width: 1024px) 1024px, 100vw"
                priority
                className="object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {/* ===== БЕЗ ДОБАВЕНА ЗАХАР — пояснение ===== */}
      <section className="border-y border-ink/10 bg-white/60">
        <p className="mx-auto max-w-5xl px-5 py-4 text-center text-sm leading-relaxed text-muted">
          {c.sugar_note}{" "}
          <Link href="/menu" className="text-brand-600 underline-offset-2 hover:underline">
            Виж макросите за всяка порция →
          </Link>
        </p>
      </section>

      {/* ===== КОГА ДА МИНЕШ ===== */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink">{c.occasions_heading}</h2>
            <div className="mt-2 h-px w-12 bg-gold" />
            <p className="mt-5 text-muted">{c.occasions_intro}</p>
            <ul className="mt-4 space-y-3">
              {occasions.map((o) => (
                <li key={o} className="flex items-start gap-3 text-ink">
                  <Check />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/menu"
              className="mt-7 inline-block rounded-full bg-brand px-6 py-3 font-medium text-cream transition-colors hover:bg-brand-600"
            >
              {c.occasions_cta}
            </Link>
          </div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-ink/10">
            <Image
              src={IMG.atmosphere}
              alt="Протеинова торта с капучино"
              fill
              sizes="(min-width: 1024px) 512px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ===== ЗА КОГО Е ===== */}
      <section className="bg-brand text-cream">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="font-display text-3xl font-semibold">{c.audience_heading}</h2>
          <div className="mt-2 h-px w-12 bg-gold" />
          <ul className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {audience.map((a) => (
              <li key={a} className="flex items-start gap-3">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 h-5 w-5 shrink-0 text-gold"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span className="text-cream/90">{a}</span>
              </li>
            ))}
          </ul>
          {c.audience_footer && <p className="mt-8 text-cream/70">{c.audience_footer}</p>}
        </div>
      </section>

      {/* ===== КАКВО НИ ПРАВИ РАЗЛИЧНИ ===== */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="font-display text-3xl font-semibold text-ink">{c.different_heading}</h2>
        <div className="mt-2 h-px w-12 bg-gold" />
        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-center">
          <ol className="space-y-6">
            {differentiators.map((d, i) => (
              <li key={d.a} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-lg font-semibold text-brand">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">{d.a}</h3>
                  {d.b && <p className="mt-1 text-sm leading-relaxed text-muted">{d.b}</p>}
                </div>
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-2xl border border-ink/10">
              <Image src={IMG.texture} alt="Разрез на протеинова торта с тахан и лешници" fill sizes="(min-width: 1024px) 512px, 100vw" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-ink/10">
              <Image src={IMG.tahini} alt="Тахан, бадеми, лешници и какао" fill sizes="(min-width: 1024px) 256px, 50vw" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-ink/10">
              <Image src={IMG.coconut} alt="Тахан, фурми, кокос и какао" fill sizes="(min-width: 1024px) 256px, 50vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== ПЪРВИТЕ ВКУСОВЕ ===== */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-12">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-3xl font-semibold text-ink">
              Първите вкусове, с които стартираме
            </h2>
            <Link href="/menu" className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand">
              Цялото меню →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {featured.map((m) => (
              <article
                key={m.slug}
                className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(31,71,51,0.4)]"
              >
                {m.image_url && (
                  <div className="relative aspect-[4/3] w-full">
                    <Image src={m.image_url} alt={m.name} fill sizes="(min-width: 640px) 300px, 100vw" className="object-cover" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl font-semibold text-ink">{m.name}</h3>
                  {m.show_macros && m.kcal_serving > 0 && (
                    <p className="mt-2 text-sm text-muted">
                      {m.protein_serving_g.toFixed(0)} g протеин · {m.kcal_serving.toFixed(0)} kcal
                      <span className="text-muted/70"> / порция</span>
                    </p>
                  )}
                  {m.price_eur != null && (
                    <p className="mt-auto pt-4 font-display text-lg font-semibold text-brand tabular-nums">
                      {dualPrice(m.price_eur)}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ===== НЕ ЗНАЕШ КАКВО ДА ИЗБЕРЕШ? → Полезно ===== */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="rounded-3xl border border-brand/15 bg-brand-50 px-8 py-10 text-center">
          <h2 className="font-display text-3xl font-semibold text-ink">{c.polezno_promo_heading}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{c.polezno_promo_body}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/polezno"
              className="rounded-full bg-brand px-6 py-3 font-medium text-cream transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Виж полезните статии
            </Link>
            <Link
              href={articleHref(ARTICLE.chooseDessert)}
              className="rounded-full border border-brand/30 px-6 py-3 font-medium text-brand-600 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Как да избера десерт
            </Link>
          </div>
        </div>
      </section>

      {/* ===== ЦЕЛИ ТОРТИ ЗА ПОВОД ===== */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid items-center gap-8 overflow-hidden rounded-3xl border border-ink/10 bg-white sm:grid-cols-2">
          {cakeImg && (
            <div className="relative h-64 w-full sm:h-full sm:min-h-[20rem]">
              <Image src={cakeImg} alt="Протеинова торта за повод" fill sizes="(min-width: 640px) 512px, 100vw" className="object-cover" />
            </div>
          )}
          <div className="p-8">
            <h2 className="font-display text-3xl font-semibold text-ink">{c.cakes_heading}</h2>
            <p className="mt-4 leading-relaxed text-muted">{c.cakes_body}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {phoneHref && (
                <a
                  href={phoneHref}
                  className="rounded-full bg-brand px-6 py-3 font-medium text-cream transition-colors hover:bg-brand-600"
                >
                  Обади се за торта
                </a>
              )}
              <a
                href="#contact"
                className="rounded-full border border-brand/30 px-6 py-3 font-medium text-brand-600 transition-colors hover:bg-brand-50"
              >
                Пиши ни
              </a>
            </div>
            {c.cakes_note && <p className="mt-4 text-xs text-muted">{c.cakes_note}</p>}
          </div>
        </div>
      </section>

      {/* ===== QR / МЕНЮ ===== */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-col items-center gap-8 rounded-3xl bg-brand px-8 py-12 text-center text-cream sm:flex-row sm:justify-between sm:text-left">
          <div className="max-w-md">
            <h2 className="font-display text-3xl font-semibold">Менюто винаги в джоба ти</h2>
            <p className="mt-2 text-cream/75">
              Сканирай кода, за да отвориш менюто с актуални макроси и цени директно на телефона си.
            </p>
            <Link
              href="/menu"
              className="mt-5 inline-block rounded-full bg-cream px-6 py-3 font-medium text-brand transition-colors hover:bg-white"
            >
              Отвори менюто
            </Link>
          </div>
          <div
            className="rounded-2xl bg-cream p-5 [&>svg]:h-40 [&>svg]:w-40"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>
      </section>

      {/* ===== СКОРО ОТВАРЯМЕ (pre-launch) ===== */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="rounded-3xl border border-gold/40 bg-gold/10 px-8 py-10 text-center">
          <h2 className="font-display text-3xl font-semibold text-ink">{c.prelaunch_heading}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{c.prelaunch_body}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#contact"
              className="rounded-full bg-brand px-6 py-3 font-medium text-cream transition-colors hover:bg-brand-600"
            >
              Искам да разбера кога отваряте
            </a>
            {s.instagram_url && (
              <a
                href={s.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-brand/30 px-6 py-3 font-medium text-brand-600 transition-colors hover:bg-brand-50"
              >
                Instagram
              </a>
            )}
            {s.facebook_url && (
              <a
                href={s.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-brand/30 px-6 py-3 font-medium text-brand-600 transition-colors hover:bg-brand-50"
              >
                Facebook
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ===== ПРЕДИ ДА ДОЙДЕШ ===== */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="font-display text-3xl font-semibold text-ink">{c.before_heading}</h2>
        <div className="mt-2 h-px w-12 bg-gold" />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {before.map((b) => (
            <li key={b} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/60 px-5 py-4 text-sm text-ink">
              <Check />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ===== НАМЕРЕТЕ НИ + КОНТАКТ ===== */}
      <section id="contact" className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink">Намерете ни</h2>
            {s.address || s.hours || s.phone || s.maps_url ? (
              <div className="mt-5 space-y-3 text-muted">
                {s.address &&
                  (directions ? (
                    <a
                      href={directions}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block whitespace-pre-line text-ink underline-offset-2 hover:text-brand-600 hover:underline"
                      title="Отвори маршрут в Google Maps"
                    >
                      {s.address}
                    </a>
                  ) : (
                    <p className="whitespace-pre-line text-ink">{s.address}</p>
                  ))}
                {s.hours && <p className="whitespace-pre-line">{s.hours}</p>}
                {s.phone && phoneHref && (
                  <p>
                    <a href={phoneHref} className="font-medium text-brand-600 hover:text-brand">
                      {s.phone}
                    </a>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {directions && (
                    <a
                      href={directions}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-brand-600"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="m3 11 19-9-9 19-2-8-8-2z" />
                      </svg>
                      Маршрут до нас →
                    </a>
                  )}
                  {s.maps_url && (
                    <a
                      href={s.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-full border border-brand/30 px-5 py-2.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
                    >
                      Виж на картата →
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-muted">Адресът и работното време ще бъдат добавени скоро.</p>
            )}
          </div>

          <div>
            <h2 className="font-display text-3xl font-semibold text-ink">Свържете се с нас</h2>
            <p className="mb-5 mt-2 text-muted">Въпрос, поръчка за повод или идея? Пиши ни.</p>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ===== ЧЗВ ===== */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="text-center font-display text-3xl font-semibold text-ink">
          Често задавани въпроси
        </h2>
        <div className="mt-8 space-y-3">
          {faq.map((f) => (
            <details
              key={f.a}
              className="group rounded-2xl border border-ink/10 bg-white/60 px-5 py-4 [&_summary]:cursor-pointer"
            >
              <summary className="flex items-center justify-between gap-3 font-medium text-ink marker:content-none">
                {f.a}
                <span className="text-brand-600 transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.b}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
