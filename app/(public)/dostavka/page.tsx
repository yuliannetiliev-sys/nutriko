import Link from "next/link";
import type { Metadata } from "next";
import { getShopSettings } from "@/lib/shop";
import { deliveryOptions } from "@/lib/shop-common";
import { COMPANY } from "@/lib/company";
import { eur } from "@/lib/price";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Доставка и връщане",
  description: "Как изпращаме онлайн поръчките на Нутрико със Спиди, колко струва доставката и как се връща продукт.",
  alternates: { canonical: "/dostavka" },
};

export default async function DeliveryPage() {
  const s = await getShopSettings();
  // Цените излизат чак с отварянето на магазина — дотогава в базата може да стоят чернови.
  const options = s.enabled ? deliveryOptions(s) : [];
  const h2 = "font-display text-2xl font-semibold text-ink";

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Доставка и връщане</h1>

      <div className="mt-8 space-y-7 leading-relaxed text-ink/80">
        <section>
          <h2 className={h2}>Как и колко</h2>
          <p className="mt-2">Доставяме със Спиди до цяла България.</p>
          {options.length > 0 ? (
            <ul className="mt-3 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
              {options.map((o) => (
                <li key={o.type} className="flex justify-between px-4 py-3">
                  <span>{o.label}</span>
                  <span className="tabular-nums">{eur(o.price)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Цените за доставка ще бъдат обявени с отварянето на онлайн поръчките.</p>
          )}
          {s.enabled && s.freeFrom != null && <p className="mt-2">Безплатна доставка при поръчка от {eur(s.freeFrom)}.</p>}
        </section>

        <section>
          <h2 className={h2}>Кога</h2>
          <p className="mt-2">
            Изпращаме до 1 работен ден след плащането. Спиди доставя обикновено на следващия работен ден. Щом пратката тръгне,
            получаваш имейл с номера за проследяване.
          </p>
        </section>

        <section>
          <h2 className={h2}>Опаковка и жега</h2>
          <p className="mt-2">
            Всяка кутия е опакована да издържи пътя. Лешниковият крем омеква над 25 °C — затова в горещите месеци може да
            спрем изпращането или да ползваме термоопаковка. При получаване прибери кутията на сухо и хладно място.
          </p>
        </section>

        <section>
          <h2 className={h2}>Връщане</h2>
          <p className="mt-2">
            Неразпечатана кутия може да бъде върната в 14 дни от получаването. Разпечатана — не може, по съображения за
            здравето и хигиената. Ако нещо не е наред с поръчката — повредена, сгрешена или с изтекъл срок — пиши ни със
            снимка и ще я заменим или ще върнем парите. Подробно:{" "}
            <Link href="/usloviya" className="text-brand-600 hover:underline">
              Общи условия
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className={h2}>Въпроси</h2>
          <p className="mt-2">
            <a href={`mailto:${COMPANY.email}`} className="text-brand-600 hover:underline">
              {COMPANY.email}
            </a>{" "}
            ·{" "}
            <a href={`tel:${COMPANY.phone.replace(/\s+/g, "")}`} className="text-brand-600 hover:underline">
              {COMPANY.phone}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
