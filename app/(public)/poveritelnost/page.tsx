import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Поверителност и бисквитки",
  description: "Каква информация събираме, как ползваме бисквитки и какви са правата ти.",
  alternates: { canonical: "/poveritelnost" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
        Поверителност и бисквитки
      </h1>
      <p className="mt-3 text-muted">Кратко и на ясен език — каква информация събираме и защо.</p>
      <div className="mt-8 space-y-6 leading-relaxed text-ink/80">
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Кой обработва данните</h2>
          <p className="mt-2">
            Сайтът се поддържа от <b>НУТРИКО ООД</b>, гр. Търговище. За въпроси:{" "}
            <a href="mailto:info@nutriko.fit" className="text-brand-600 hover:underline">
              info@nutriko.fit
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Контактна форма</h2>
          <p className="mt-2">
            Когато ни пишеш през формата, събираме името, контакта (имейл или телефон) и съобщението
            ти — единствено за да ти отговорим. Не ги споделяме с трети страни и не ги ползваме за
            реклама.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Бисквитки и статистика</h2>
          <p className="mt-2">
            За да подобряваме сайта, ползваме <b>Microsoft Clarity</b> — анонимна статистика за
            посещенията (кои страници се разглеждат, устройства, общи записи на сесии без лични
            данни). Clarity ползва бисквитки и се зарежда <b>само ако си приел/а</b> в банера долу.
            Можеш да откажеш — сайтът работи напълно без тях.
          </p>
          <p className="mt-2">
            Ползваме и <b>Vercel Web Analytics</b> за брой посещения — <b>без бисквитки</b> и без
            лични данни.
          </p>
          <p className="mt-2 text-sm text-muted">
            Искаш да промениш избора си за бисквитки? Изчисти данните на сайта в браузъра си или ни
            пиши.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-ink">Твоите права</h2>
          <p className="mt-2">
            Имаш право на достъп, корекция или изтриване на данните си. Пиши ни на{" "}
            <a href="mailto:info@nutriko.fit" className="text-brand-600 hover:underline">
              info@nutriko.fit
            </a>{" "}
            и ще съдействаме.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-ink/10 pt-6">
        <Link href="/" className="text-sm font-medium text-brand-600 hover:text-brand">
          ← Към началната
        </Link>
      </div>
    </div>
  );
}
