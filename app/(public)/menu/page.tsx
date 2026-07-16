import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { listPublicMenu, listCategories, getSiteSettings, type MenuItem } from "@/lib/data";
import { ARTICLE, articleHref } from "@/lib/links";
import MenuView from "./MenuView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Меню",
  description:
    "Менюто на Нутрико: протеинови торти, вафли, халва, шейкове и напитки — без добавена захар. С грамажи, макроси, алергени и цени за всеки продукт.",
  alternates: { canonical: "/menu" },
  openGraph: {
    url: "/menu",
    title: "Меню · Нутрико",
    description:
      "Протеинови торти, вафли, халва и шейкове без добавена захар — с макроси, грамажи и цени.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Нутрико" }],
  },
};

export default async function MenuPage() {
  const [items, categories, s] = await Promise.all([
    listPublicMenu(),
    listCategories(),
    getSiteSettings(),
  ]);
  const catMap = new Map(categories.map((c) => [c.key, c]));

  // Групиране по категория
  const byCat = new Map<string, MenuItem[]>();
  for (const it of items) {
    const k = it.category ?? "друго";
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k)!.push(it);
  }

  // Само категории с продукти; скрий menu_visible=false; подреди по sort_order (после по име)
  const groups = [...byCat.entries()]
    .map(([key, list]) => {
      const c = catMap.get(key);
      return {
        key,
        label: c?.label ?? key,
        description: c?.description ?? null,
        sort: c?.sort_order ?? 999,
        visible: c?.menu_visible ?? true,
        items: list,
      };
    })
    .filter((g) => g.visible)
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label, "bg"));

  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      {s.hero_image_url && (
        <div className="relative mb-10 h-36 w-full overflow-hidden rounded-3xl sm:h-44">
          <Image
            src={s.hero_image_url}
            alt="Нутрико"
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      )}
      <header className="text-center">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
          <span className="h-px w-8 bg-gold" />
          Без добавена бяла захар
          <span className="h-px w-8 bg-gold" />
        </p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-ink">Меню</h1>
        <p className="mt-3 text-muted">
          Стойностите са за една порция.{" "}
          <Link href="/alergeni" className="text-brand-600 underline-offset-2 hover:underline">
            Легенда за алергените →
          </Link>
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-muted">
          <span className="text-muted/70">Научи повече:</span>
          <Link
            href={articleHref(ARTICLE.howMacros)}
            className="text-brand-600 underline-offset-2 hover:underline"
          >
            Как изчисляваме макросите
          </Link>
          <span className="text-muted/30" aria-hidden>
            ·
          </span>
          <Link
            href={articleHref(ARTICLE.glycemic)}
            className="text-brand-600 underline-offset-2 hover:underline"
          >
            Гликемичен товар
          </Link>
          <span className="text-muted/30" aria-hidden>
            ·
          </span>
          <Link
            href={articleHref(ARTICLE.noWhiteSugar)}
            className="text-brand-600 underline-offset-2 hover:underline"
          >
            Без добавена захар
          </Link>
        </div>
      </header>

      {groups.length === 0 ? (
        <p className="mt-16 text-center text-muted">Менюто се обновява. Заповядайте отново скоро.</p>
      ) : (
        <MenuView
          groups={groups.map((g) => ({
            key: g.key,
            label: g.label,
            description: g.description,
            items: g.items,
          }))}
        />
      )}

      <p className="mx-auto mt-20 max-w-xl border-t border-ink/10 pt-6 text-center text-xs leading-relaxed text-muted/80">
        Грамажите са приблизителни и може да варират при ръчно приготвяне. Макросите са референтни
        стойности според вложените продукти.
      </p>
    </div>
  );
}
