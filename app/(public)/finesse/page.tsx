import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getEventVotes } from "@/app/actions";
import { ARTICLE, articleHref } from "@/lib/links";
import FinessePoll from "./FinessePoll";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "За гостите на Finesse",
  description:
    "Какво има в чашката? Двата десерта на Нутрико за първия рожден ден на Finesse — истински съставки, реални макроси, без добавена бяла захар.",
  robots: { index: false, follow: false },
};

// Снимки на десертите — реалните чашки от събитието (Higgsfield обработка)
const IMG = {
  kokosova:
    "https://xrdanumtjbrpkrjtvyjx.supabase.co/storage/v1/object/public/product-images/events/finesse/kokosova.webp" as string | null,
  kremaMus:
    "https://xrdanumtjbrpkrjtvyjx.supabase.co/storage/v1/object/public/product-images/events/finesse/krema-mus.webp",
};

type Dessert = {
  name: string;
  emoji: string;
  img: string | null;
  imgAlt: string;
  desc: string;
  highlight: string;
  ingredients: string;
  macros: { p: string; c: string; f: string; kcal: string; gi: string };
  allergens: string;
};

// Числата са реални — от рецептите в калкулатора на Нутрико (на 100 g)
const DESSERTS: Dessert[] = [
  {
    name: "Кокосова торта",
    emoji: "🥥",
    img: IMG.kokosova,
    imgAlt: "Кокосова торта в чашка",
    desc: "Копринен кокосов крем върху основа от бадемово брашно, с щипка лиофилизирани малини за свеж завършек. Подсладена единствено с еритритол — нула добавена захар.",
    highlight: "Само 4 g въглехидрати на 100 g",
    ingredients:
      "маскарпоне · извара · яйца · бадемово брашно · кокос · суроватъчен протеин изолат · еритритол · малини · ванилия",
    macros: { p: "17.1", c: "4.1", f: "16.8", kcal: "240", gi: "≈30" },
    allergens: "яйца · мляко · ядки · фъстъци",
  },
  {
    name: "Торта Крема Мус",
    emoji: "🍫",
    img: IMG.kremaMus,
    imgAlt: "Торта Крема Мус в чашка",
    desc: "Три пласта в една чашка: ароматна лешникова основа, копринен крем и плътен шоколадов мус със 75% какао. Сладостта идва от фурми — без грам бяла захар.",
    highlight: "Подсладена само с фурми",
    ingredients:
      "извара · маскарпоне · смлян лешник · фурми · суроватъчен протеин изолат · шоколад 75% · какао · сметана · ванилия",
    macros: { p: "12.8", c: "13.6", f: "25.6", kcal: "341", gi: "≈45" },
    allergens: "мляко · ядки · фъстъци",
  },
];

function MacroChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
      {label} <b className="text-ink">{value}</b>
    </span>
  );
}

function DessertCard({ d }: { d: Dessert }) {
  return (
    <article className="overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
      <div className="relative aspect-square w-full bg-brand-50">
        {d.img ? (
          <Image
            src={d.img}
            alt={d.imgAlt}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl">{d.emoji}</div>
        )}
      </div>
      <div className="p-6">
        <h3 className="font-display text-2xl font-semibold text-ink">{d.name}</h3>
        <p className="mt-1 text-sm font-medium text-gold">{d.highlight}</p>
        <p className="mt-3 leading-relaxed text-muted">{d.desc}</p>

        <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-brand-600">
          Вътре има
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{d.ingredients}</p>

        <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-brand-600">
          На 100 g
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <MacroChip label="Протеин" value={`${d.macros.p} g`} />
          <MacroChip label="Въгл." value={`${d.macros.c} g`} />
          <MacroChip label="Мазнини" value={`${d.macros.f} g`} />
          <MacroChip label="kcal" value={d.macros.kcal} />
          <MacroChip label="ГИ" value={d.macros.gi} />
        </div>

        <p className="mt-4 text-xs text-muted">
          <b className="font-medium text-ink">Алергени:</b> {d.allergens}
        </p>
      </div>
    </article>
  );
}

export default async function FinessePage() {
  const votes = await getEventVotes("finesse");

  return (
    <div className="pb-16">
      {/* HERO */}
      <section className="mx-auto max-w-3xl px-5 pt-12 text-center sm:pt-16">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
          <span className="h-px w-8 bg-gold" />
          Нутрико · специално за Finesse
          <span className="h-px w-8 bg-gold" />
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Честита първа година! 🎉
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted">
          Една година{" "}
          <a
            href="https://finesse-spa.bg"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 underline decoration-gold underline-offset-4 hover:text-brand"
          >
            Finesse
          </a>{" "}
          — една година грижа за тялото и духа. За празника приготвихме нещо сладко в тон с
          философията ви: истински десерти <b className="text-ink">без добавена бяла захар</b> и с
          повече протеин. Пред теб са две чашки — ето какво има вътре.
        </p>
      </section>

      {/* ДВЕТЕ ЧАШКИ */}
      <section className="mx-auto mt-10 grid max-w-4xl gap-6 px-5 sm:grid-cols-2">
        {DESSERTS.map((d) => (
          <DessertCard key={d.name} d={d} />
        ))}
      </section>

      {/* ЗАЩО БЕЗ ЗАХАР */}
      <section className="mx-auto mt-12 max-w-3xl px-5">
        <div className="rounded-3xl bg-brand-50 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Защо без добавена бяла захар?
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            Бялата захар дава бърз пик на кръвната захар — и още по-бърз срив след него. Нашите
            десерти залагат на фурми, еритритол и истински съставки: сладко, което не ти тежи и не
            те приспива след третата хапка. Любопитно ти е как смятаме числата?
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={articleHref(ARTICLE.noWhiteSugar)}
              className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand hover:text-cream"
            >
              „Без захар" ≠ „без калории"
            </Link>
            <Link
              href={articleHref(ARTICLE.glycemic)}
              className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand hover:text-cream"
            >
              Гликемичен индекс и товар
            </Link>
            <Link
              href={articleHref(ARTICLE.howMacros)}
              className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand hover:text-cream"
            >
              Как смятаме макросите
            </Link>
          </div>
        </div>
      </section>

      {/* АНКЕТА */}
      <section className="mx-auto mt-12 max-w-3xl px-5">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Коя чашка спечели сърцето ти?
        </h2>
        <p className="mb-5 mt-2 text-muted">Гласът ти помага да изберем какво влиза в менюто. 😉</p>
        <FinessePoll initial={votes} />
      </section>

      {/* CTA */}
      <section className="mx-auto mt-14 max-w-3xl px-5 text-center">
        <div className="rounded-3xl bg-brand px-6 py-10 sm:px-10">
          <h2 className="font-display text-3xl font-semibold text-cream">
            Хареса ли ти? Това е само началото.
          </h2>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-cream/80">
            Нутрико отваря скоро в Търговище — протеинови торти, шейкове, вафли и халва без
            добавена бяла захар.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/menu"
              className="rounded-full bg-cream px-6 py-3 text-sm font-medium text-brand transition-colors hover:bg-white"
            >
              Разгледай менюто
            </Link>
            <Link
              href="/polezno"
              className="rounded-full border border-cream/40 px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-brand-600"
            >
              Научи повече
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
