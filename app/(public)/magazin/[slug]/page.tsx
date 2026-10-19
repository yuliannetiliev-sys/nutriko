import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveShopItem, adminGetShopItemBySlug, getShopSettings, type ShopItem } from "@/lib/shop";
import { isAdmin } from "@/lib/supabase";
import { stripeMode } from "@/lib/stripe";
import { deliveryOptions, nutr, splitBold, type NutrKind } from "@/lib/shop-common";
import { eur } from "@/lib/price";
import Gallery from "../../menu/[slug]/Gallery";
import OrderForm from "./OrderForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [found, s, admin] = await Promise.all([getActiveShopItem(slug), getShopSettings(), isAdmin()]);
  const item = found ?? (admin ? await adminGetShopItemBySlug(slug) : null);
  if (!item) return { title: "Няма такъв продукт" };
  const title = `${item.title} — ${item.pack_label.toLowerCase()} с доставка`;
  const description = item.description ?? `${item.title} от Нутрико с доставка със Спиди до цяла България.`;
  return {
    title,
    description,
    alternates: { canonical: `/magazin/${item.slug}` },
    // Докато магазинът е затворен, страницата няма място в Google.
    ...(s.enabled && item.is_active ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title: `${title} · Нутрико`,
      description,
      url: `/magazin/${item.slug}`,
      images: item.images[0] ? [{ url: item.images[0], alt: item.title }] : [{ url: "/og.jpg" }],
    },
  };
}

function Bolded({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((p, i) => (p.bold ? <b key={i} className="font-semibold text-ink">{p.text}</b> : <span key={i}>{p.text}</span>))}
    </>
  );
}

function NutritionTable({ item }: { item: ShopItem }) {
  const n = item.nutrition;
  const unitG = item.units_per_pack > 1 ? Math.round(item.net_weight_g / item.units_per_pack) : null;
  // На порция се смята от суровата стойност и чак тогава се закръглява.
  const per = (v: number | null, kind: NutrKind) => (v == null || unitG == null ? "" : nutr((v * unitG) / 100, kind));
  // Редът е по Регламент 1169/2011 (прил. XV); полиоли и фибри — само ако са попълнени.
  const rows: [string, number | null, NutrKind][] = (
    [
      ["Мазнини", n.fat_g, "macro"],
      ["от които наситени", n.saturates_g, "saturates"],
      ["Въглехидрати", n.carbs_g, "macro"],
      ["от които захари", n.sugars_g, "macro"],
      ["от които полиоли", n.polyols_g, "macro"],
      ["Фибри", n.fibre_g, "macro"],
      ["Белтъци", n.protein_g, "macro"],
      ["Сол", n.salt_g, "salt"],
    ] as [string, number | null, NutrKind][]
  ).filter(([label, v]) => v != null || !(label === "от които полиоли" || label === "Фибри"));
  const cell = "px-3 py-2 text-right tabular-nums";
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 text-left font-medium">Хранителна стойност</th>
            <th className={`${cell} font-medium`}>100 г</th>
            {unitG && <th className={`${cell} font-medium`}>1 вафла ({unitG} г)</th>}
          </tr>
        </thead>
        <tbody className="text-ink/80">
          <tr className="border-b border-ink/5">
            <td className="px-3 py-2">Енергийна стойност</td>
            <td className={cell}>
              {nutr(n.energy_kj, "energy")} kJ / {nutr(n.energy_kcal, "energy")} kcal
            </td>
            {unitG && (
              <td className={cell}>
                {per(n.energy_kj, "energy")} kJ / {per(n.energy_kcal, "energy")} kcal
              </td>
            )}
          </tr>
          {rows.map(([label, v, kind]) => (
            <tr key={label} className="border-b border-ink/5 last:border-0">
              <td className={`px-3 py-2 ${label.startsWith("от които") ? "pl-6 text-muted" : ""}`}>{label}</td>
              <td className={cell}>{nutr(v, kind)} г</td>
              {unitG && <td className={cell}>{per(v, kind)} г</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ShopItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ prekasnato?: string }>;
}) {
  const { slug } = await params;
  const { prekasnato } = await searchParams;
  const [found, settings, admin] = await Promise.all([getActiveShopItem(slug), getShopSettings(), isAdmin()]);
  // Скрит артикул: клиентите получават „няма такава страница“, а админът — страницата с надпис.
  const item = found ?? (admin ? await adminGetShopItemBySlug(slug) : null);
  if (!item) notFound();
  const hidden = !item.is_active;

  const options = deliveryOptions(settings);
  // Изключен магазин: клиентите виждат „скоро“, а влезлият админ — формата, за пробна поръчка.
  const canOrder = (settings.enabled || admin) && item.price_eur != null && options.length > 0;
  const mode = admin ? stripeMode() : null;
  const unitG = item.units_per_pack > 1 ? Math.round(item.net_weight_g / item.units_per_pack) : null;
  const cheapest = options.length ? Math.min(...options.map((o) => o.price)) : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Начало
        </Link>
        <span className="text-muted/50">/</span>
        <span className="text-ink/70">Онлайн поръчка</span>
      </nav>

      {admin && (hidden || !settings.enabled || mode !== "live") && (
        <div className="mb-6 space-y-1 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {hidden && (
            <p>
              <b>Скрит артикул — вижда го само админ.</b> За клиентите тази страница не съществува. За пробна поръчка
              го направи „активен“ в Админ → Магазин.
            </p>
          )}
          {!settings.enabled && (
            <p>
              <b>Магазинът е изключен</b> — клиентите не могат да поръчат, а ти като админ виждаш формата.
            </p>
          )}
          {mode === "test" && (
            <p>
              Stripe е в <b>тестов режим</b>: плати с карта 4242 4242 4242 4242, всяка бъдеща дата и всеки CVC. Пари не се
              взимат, а поръчката излиза в админа като „тест“.
            </p>
          )}
          {mode === null && <p>Stripe още не е свързан (липсва ключ във Vercel) — плащането няма да тръгне.</p>}
        </div>
      )}

      {prekasnato && (
        <p className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink/80">
          Плащането беше прекъснато и поръчката <b>не е платена</b>. Можеш да опиташ отново по-долу.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          {item.images.length > 0 ? (
            <Gallery images={item.images} alt={item.title} />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-3xl border border-ink/10 bg-brand-50 text-sm text-muted">
              Снимките — скоро
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-brand-600">
            <span className="h-px w-6 bg-gold" />
            Онлайн поръчка · доставка до цяла България
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink">{item.title}</h1>
          {item.subtitle && <p className="mt-2 text-sm font-medium text-ink/70">{item.subtitle}</p>}

          <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {item.price_eur != null ? (
              <>
                <span className="font-display text-3xl font-semibold text-brand tabular-nums">{eur(item.price_eur)}</span>
                <span className="text-sm text-muted">
                  {item.pack_label.toLowerCase()}, {item.net_weight_g} г
                  {unitG && item.price_eur ? ` · ${eur(item.price_eur / item.units_per_pack)} на вафла` : ""}
                </span>
              </>
            ) : (
              <span className="text-lg text-muted">Цената — скоро</span>
            )}
          </p>

          {item.description && <p className="mt-5 leading-relaxed text-ink/80">{item.description}</p>}

          <ul className="mt-6 space-y-2 text-sm text-ink/80">
            <li>📦 Изпращаме до 1 работен ден със Спиди{cheapest != null ? ` — доставка от ${eur(cheapest)}` : ""}.</li>
            <li>💳 Плащане с карта, Apple Pay или Google Pay.</li>
            {item.shelf_life_days && <li>🗓️ Срок на годност {item.shelf_life_days} дни от производството.</li>}
          </ul>

          {canOrder ? (
            <a
              href="#poruchka"
              className="mt-8 inline-block rounded-full bg-brand px-7 py-3.5 font-medium text-cream transition-colors hover:bg-brand-600"
            >
              Поръчай
            </a>
          ) : (
            <p className="mt-8 rounded-xl border border-ink/10 bg-brand-50 px-4 py-3 text-sm text-ink/80">
              Онлайн поръчките стартират скоро. Дотогава ги намираш в сладкарницата в Търговище, кв. Вароша.
            </p>
          )}
        </div>
      </div>

      {item.reviews.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-ink">Какво казват клиентите</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {item.reviews.map((r, i) => (
              <figure key={i} className="rounded-2xl border border-ink/10 bg-white p-5">
                <blockquote className="leading-relaxed text-ink/80">„{r.text}“</blockquote>
                <figcaption className="mt-3 text-sm text-muted">— {r.author}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Какво има вътре</h2>
          {item.ingredients_text && (
            <p className="mt-4 text-sm leading-relaxed text-ink/80">
              <span className="font-medium text-ink">Съставки: </span>
              <Bolded text={item.ingredients_text} />
            </p>
          )}
          <p className="mt-2 text-xs text-muted">Алергените са с удебелен шрифт.</p>
          {item.allergens_text && <p className="mt-3 text-sm text-ink/80">{item.allergens_text}</p>}
          {item.warning_text && <p className="mt-3 text-sm text-ink/80">{item.warning_text}</p>}
          {item.storage_text && (
            <p className="mt-3 text-sm text-ink/80">
              <span className="font-medium text-ink">Съхранение: </span>
              {item.storage_text}
            </p>
          )}
          <p className="mt-3 text-sm text-ink/80">
            <span className="font-medium text-ink">Нето: </span>
            {item.net_weight_g} г ({item.units_per_pack} бр.)
          </p>
          <p className="mt-3 text-sm text-ink/80">
            <span className="font-medium text-ink">Производител: </span>НУТРИКО ООД, ул. „Екзарх Йосиф“ № 4, Търговище
          </p>
        </div>
        <div>
          <NutritionTable item={item} />
        </div>
      </section>

      {canOrder && (
        <section id="poruchka" className="mt-16 scroll-mt-6">
          <h2 className="font-display text-3xl font-semibold text-ink">Поръчка</h2>
          <OrderForm
            item={{
              slug: item.slug,
              title: item.title,
              packLabel: item.pack_label,
              price: item.price_eur!,
              max: item.stock_qty != null ? Math.min(item.max_per_order, item.stock_qty) : item.max_per_order,
            }}
            options={options}
            freeFrom={settings.freeFrom}
          />
        </section>
      )}

      <section className="mt-16">
        <h2 className="font-display text-2xl font-semibold text-ink">Въпроси</h2>
        <div className="mt-4 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {[
            ["Колко издържат?", item.shelf_life_days ? `${item.shelf_life_days} дни от производството, ако се пазят на сухо и хладно. Датата е на етикета на кутията.` : "Срокът на годност е на етикета на кутията."],
            ["Топят ли се?", "Кремът омеква над 25 °C. Дръж кутията на хладно и далеч от слънце — така кората остава хрупкава."],
            ["Кога пристигат?", "Изпращаме до 1 работен ден. Спиди доставя обикновено на следващия работен ден."],
            ["Мога ли да ги взема от сладкарницата?", "Да — в обекта в Търговище, кв. Вароша, се продават на брой. Онлайн поръчката е за доставка."],
            ["Как се плаща?", "С карта, Apple Pay или Google Pay, през Stripe. Данните на картата не минават през нас."],
          ].map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-medium text-ink">{q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          <Link href="/dostavka" className="text-brand-600 hover:underline">
            Доставка и връщане
          </Link>{" "}
          ·{" "}
          <Link href="/usloviya" className="text-brand-600 hover:underline">
            Общи условия
          </Link>
        </p>
      </section>
    </div>
  );
}
