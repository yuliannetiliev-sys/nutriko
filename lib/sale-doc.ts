import { COMPANY } from "@/lib/company";

/**
 * Документ за регистриране на продажбата — чл. 52о от Наредба Н-18.
 * Ползва се вместо касов бон при алтернативния режим по чл. 3, ал. 17:
 * е-магазин, плащане само с карта, неприсъствено (Stripe).
 *
 * Номерът се дава от базата (тригер `orders_sale_doc_guard`) в момента на плащането:
 * 10 цифри, нараства с 1, само за истински плащания — тестовите не получават номер.
 */
export const SALE_DOC_TITLE = "Документ за регистриране на продажба";

// НУТРИКО ООД не е регистрирано по ЗДДС: продажбите се отчитат в група „Б“ (както в касата —
// счетоводителят, 24.09.2026), без начислен ДДС. При регистрация по ДДС → VAT_RATE = 20.
export const TAX_GROUP = "Б";
export const VAT_RATE = 0;

export const PAYMENT_LABEL = "Банкова карта — неприсъствено плащане, през Stripe";
/** Прил. № 38, поле PAYM: 4 = доставчик на платежни услуги. */
export const PAYM_CODE = 4;
/** Прил. № 38, поле PROC_ID: за чуждестранно лице — ДДС номер и наименование. */
export const PSP_ID = "IE3206488LH Stripe Payments Europe, Limited";

export const docNumber = (n: number) => String(n).padStart(10, "0");

/** Дата и час по софийско време — така се показват в документа и в QR кода. */
export function sofiaParts(iso: string): { date: string; time: string; display: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Sofia",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value])
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}:${p.second}`,
    display: `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}:${p.second}`,
  };
}

/**
 * Съдържанието на QR кода по прил. № 18а (софтуер по чл. 52т), полета с „*“:
 * номер на е-магазина от НАП * номер на документа * номер на поръчката *
 * референтен номер на трансакцията * дата * час * обща сума.
 * Второто поле в обнародвания текст е празно („< >“); слагаме номера на документа
 * по аналогия с QR кода на касовия бон — да се потвърди със счетоводителя.
 */
export function qrPayload(
  o: { number: string; doc_number: number; doc_issued_at: string; stripe_payment_intent: string | null; total_eur: number },
  napEshopNumber: string
): string {
  const t = sofiaParts(o.doc_issued_at);
  return [napEshopNumber, docNumber(o.doc_number), o.number, o.stripe_payment_intent ?? "", t.date, t.time, o.total_eur.toFixed(2)].join("*");
}

/** Продавачът — както го иска чл. 52о, ал. 1, т. 2. */
export const SELLER_LINES = [
  `${COMPANY.name}, ЕИК ${COMPANY.eik}`,
  `Седалище и адрес на управление: ${COMPANY.seat}`,
  `${COMPANY.email} · ${COMPANY.phone}`,
];
