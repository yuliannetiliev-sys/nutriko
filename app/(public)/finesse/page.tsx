import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getEventVotes } from "@/app/actions";
import { ARTICLE, articleHref } from "@/lib/links";
import FinessePoll from "./FinessePoll";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finesse на 1 година — специални десерти",
  description:
    "За първия рожден ден на Finesse Medical SPA създадохме два специални протеинови десерта в чашка — без брашно и без добавена бяла захар.",
  robots: { index: false, follow: false },
};

// Снимки — реалните чашки от събитието (Higgsfield обработка, светъл студиен фон)
const IMG = {
  hero: "https://xrdanumtjbrpkrjtvyjx.supabase.co/storage/v1/object/public/product-images/events/finesse/hero.webp" as string | null,
  kokosova:
    "https://xrdanumtjbrpkrjtvyjx.supabase.co/storage/v1/object/public/product-images/events/finesse/kokosova.webp",
  kremaMus:
    "https://xrdanumtjbrpkrjtvyjx.supabase.co/storage/v1/object/public/product-images/events/finesse/krema-mus.webp",
};

type Dessert = {
  name: string;
  tagline: string;
  img: string;
  imgAlt: string;
  desc: string;
  ingredients: string[];
  badges: string[];
  // Хранителни стойности на СТАНДАРТНО ПАРЧЕ от оригиналната торта (не на чашката)
  macros: { p: string; c: string; f: string; kcal: string; gi: string };
  allergens: string;
};

const DESSERTS: Dessert[] = [
  {
    name: "Кокосов протеинов десерт",
    tagline: "Нисковъглехидратният избор",
    img: IMG.kokosova,
    imgAlt: "Кокосов протеинов десерт в чашка",
    desc: "Лек кокосов вкус, бадемова основа и крем с маскарпоне, извара и суроватъчен протеин изолат. Приготвен без брашно и без добавена захар — значително повече протеин от типично парче торта.",
    ingredients: ["бадеми", "яйца", "маскарпоне", "извара", "кокосови стърготини", "протеин изолат"],
    badges: ["Без брашно", "Без добавена захар", "Нисковъглехидратен", "Високопротеинов"],
    macros: { p: "25", c: "6", f: "29", kcal: "410", gi: "≈30" },
    allergens: "яйца · мляко · ядки · фъстъци",
  },
  {
    name: "Протеинов десерт Крема Мус",
    tagline: "Подсладен с цели сушени фурми",
    img: IMG.kremaMus,
    imgAlt: "Протеинов десерт Крема Мус в чашка",
    desc: "Лешникова основа, протеинов крем с маскарпоне и цели сушени фурми, завършен с шоколадов мус от белгийски шоколад без захар. Създаден целенасочено като високопротеинов десерт.",
    ingredients: ["лешници", "маскарпоне", "цели сушени фурми", "белгийски шоколад без захар", "протеин изолат"],
    badges: ["Без брашно", "Без рафинирана захар", "Белгийски шоколад без захар", "С цели фурми"],
    macros: { p: "20", c: "22", f: "41", kcal: "541", gi: "≈45" },
    allergens: "мляко · ядки · фъстъци",
  },
];

function MacroCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl bg-brand-50 px-2 py-2.5 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-brand-600">{label}</p>
      <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-muted">{unit}</span>}
      </p>
    </div>
  );
}

function DessertCard({ d }: { d: Dessert }) {
  return (
    <article className="overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
      <div className="relative aspect-square w-full bg-brand-50">
        <Image
          src={d.img}
          alt={d.imgAlt}
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="p-6 sm:p-7">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold">{d.tagline}</p>
        <h3 className="mt-1 font-display text-2xl font-semibold text-ink">{d.name}</h3>
        <p className="mt-3 leading-relaxed text-muted">{d.desc}</p>

        <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-brand-600">
          В него ще откриеш
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{d.ingredients.join(" · ")}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {d.badges.map((b) => (
            <span
              key={b}
              className="rounded-full border border-brand/15 bg-brand-50/60 px-2.5 py-1 text-xs font-medium text-brand-600"
            >
              {b}
            </span>
          ))}
        </div>

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-brand-600">
          Хранителни стойности · стандартно парче торта ≈155 g
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <MacroCell label="Протеин" value={d.macros.p} unit="g" />
          <MacroCell label="Въгл." value={d.macros.c} unit="g" />
          <MacroCell label="Мазнини" value={d.macros.f} unit="g" />
          <MacroCell label="Енергия" value={d.macros.kcal} />
        </div>
        <p className="mt-2 text-xs text-muted">
          kcal · гликемичен индекс {d.macros.gi} · <b className="font-medium text-ink">Алергени:</b>{" "}
          {d.allergens}
        </p>
      </div>
    </article>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <svg
        className="mt-1 h-4 w-4 shrink-0 text-brand"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="leading-relaxed text-muted">{children}</span>
    </li>
  );
}

export default async function FinessePage() {
  const votes = await getEventVotes("finesse");

  return (
    <div className="pb-16">
      {/* HERO */}
      <section className="mx-auto max-w-3xl px-5 pt-12 text-center sm:pt-16">
        <p className="mb-4 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.22em] text-brand-600">
          <span className="h-px w-10 bg-gold" aria-hidden="true" />
          Finesse × Нутрико
          <span className="h-px w-10 bg-gold" aria-hidden="true" />
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Finesse на 1 година
        </h1>
        <p className="mt-4 font-display text-xl italic text-brand-600 sm:text-2xl">
          „Грижата се разпознава във всеки детайл."
        </p>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted">
          Днес{" "}
          <a
            href="https://finesse-spa.bg"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 underline decoration-gold underline-offset-4 hover:text-brand"
          >
            Finesse Medical SPA
          </a>{" "}
          празнува своя първи рожден ден. Специално за празничния коктейл създадохме два
          индивидуални протеинови десерта — <b className="text-ink">без брашно</b>,{" "}
          <b className="text-ink">без добавена бяла захар</b> и с добавен суроватъчен протеин
          изолат.
        </p>
      </section>

      {IMG.hero && (
        <section className="mx-auto mt-10 max-w-4xl px-5">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-brand-50">
            <Image
              src={IMG.hero}
              alt="Двата празнични десерта в чашки — кокосов и Крема Мус"
              fill
              priority
              sizes="(min-width: 1024px) 896px, 100vw"
              className="object-cover"
            />
          </div>
        </section>
      )}

      {/* ДВАТА ДЕСЕРТА */}
      <section className="mx-auto mt-14 max-w-4xl px-5">
        <h2 className="text-center font-display text-3xl font-semibold text-ink">
          Два десерта. Две различни идеи.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center leading-relaxed text-muted">
          Двата най-харесвани вкуса на Нутрико — в индивидуални чашки. Кокосовият десерт е
          нисковъглехидратният избор, а Крема Мус носи дълбочината на белгийския шоколад и
          сладостта на цели сушени фурми.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {DESSERTS.map((d) => (
            <DessertCard key={d.name} d={d} />
          ))}
        </div>
        <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed text-muted">
          Празничните десерти са сервирани в по-малки индивидуални чашки. Показаните хранителни
          стойности са за стандартно парче от оригиналната торта в менюто на Нутрико и служат за
          продуктова ориентация.
        </p>
      </section>

      {/* ЗАЩО ЦЕЛИ ФУРМИ + ДОБАВЕНА СТОЙНОСТ */}
      <section className="mx-auto mt-14 max-w-3xl space-y-6 px-5">
        <div className="rounded-3xl bg-brand-50 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Защо цели сушени фурми?
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            Използването на целия сушен плод е различно от добавянето само на захар или захарен
            сироп. Заедно с естествената сладост в десерта остават и естествено съдържащите се във
            фурмите фибри и минерали. Крема Мус съдържа естествени захари, но не е подсладен с бяла
            захар или захарен сироп.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Какво означава „десерт с добавена стойност"?
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            Не е просто продукт с етикет „фитнес" или „здравословен" — а десерт, при който всяка
            основна съставка има конкретна роля:
          </p>
          <ul className="mt-4 space-y-2.5">
            <CheckItem>млечните продукти и протеиновият изолат повишават съдържанието на протеин</CheckItem>
            <CheckItem>ядките добавят естествени мазнини, фибри и плътност</CheckItem>
            <CheckItem>кокосът и бадемите заменят традиционното брашно</CheckItem>
            <CheckItem>сушените фурми осигуряват сладостта — без бяла захар или сироп</CheckItem>
            <CheckItem>белгийският шоколад без захар и протеин изолатът правят шоколадовия мус смислено подбран</CheckItem>
          </ul>
          <p className="mt-4 leading-relaxed text-muted">
            Десертът остава удоволствие — но е приготвен с повече внимание към това какво съдържа.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={articleHref(ARTICLE.noWhiteSugar)}
              className="rounded-full border border-brand/25 px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand hover:text-cream"
            >
              „Без захар" ≠ „без калории"
            </Link>
            <Link
              href={articleHref(ARTICLE.glycemic)}
              className="rounded-full border border-brand/25 px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand hover:text-cream"
            >
              Гликемичен индекс и товар
            </Link>
          </div>
        </div>
      </section>

      {/* АНКЕТА */}
      <section className="mx-auto mt-14 max-w-3xl px-5">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Кой десерт спечели сърцето ти?
        </h2>
        <p className="mb-5 mt-2 text-muted">Гласът ти помага да изберем какво влиза в менюто.</p>
        <FinessePoll initial={votes} />
      </section>

      {/* ПОЗДРАВ КЪМ FINESSE */}
      <section className="mx-auto mt-16 max-w-3xl px-5 text-center">
        <p className="mb-4 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.22em] text-brand-600">
          <span className="h-px w-10 bg-gold" aria-hidden="true" />
          С пожелание
          <span className="h-px w-10 bg-gold" aria-hidden="true" />
        </p>
        <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Честит първи рожден ден, Finesse!
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted">
          Една година, посветена на здравето, красотата, възстановяването и персоналната грижа.
          Защото грижата не се изразява само в големите решения — тя се разпознава в начина, по
          който посрещаме хората, в атмосферата, която създаваме, и в това, което избираме да им
          поднесем.
        </p>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted">
          Пожелаваме на целия екип още много години на развитие, доверие, вдъхновение и
          удовлетворени клиенти.
        </p>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-12 max-w-3xl px-5 text-center">
        <div className="rounded-3xl bg-brand px-6 py-10 sm:px-10">
          <h2 className="font-display text-3xl font-semibold text-cream">Finesse × Nutriko</h2>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-cream/80">
            Партньорство, основано на обща идея: удоволствието и грижата могат да вървят заедно.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/menu"
              className="rounded-full bg-cream px-6 py-3 text-sm font-medium text-brand transition-colors hover:bg-white"
            >
              Разгледай менюто на Нутрико
            </Link>
            <a
              href="https://finesse-spa.bg"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-cream/40 px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-brand-600"
            >
              Finesse Medical SPA ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
