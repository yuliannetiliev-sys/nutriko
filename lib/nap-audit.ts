import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANY } from "@/lib/company";
import { getShopSettings } from "@/lib/shop";
import { VAT_RATE, PAYM_CODE, PSP_ID, docNumber, sofiaParts } from "@/lib/sale-doc";

/**
 * Стандартизиран одиторски файл за НАП — прил. № 38 към Наредба Н-18 (чл. 52т, ал. 2).
 * Подава се всеки месец до 15-о число, за предходния месец, с КЕП в портала на НАП.
 * Структурата следва XSD схемата на НАП `dec_audit.xsd` (кодиране windows-1251).
 *
 * Кои поръчки влизат: с документ за продажба (истинско плащане), предадени на Спиди
 * през месеца — датата на изпращане се приема за дата на доставката. Върнатите суми
 * през месеца (и частично) влизат в раздела за върнати поръчки.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const m2 = (n: number) => n.toFixed(2);

/** Границите на месеца по софийско време, като UTC ISO. */
function monthBounds(year: number, month: number): { from: string; to: string } {
  const offsetAt = (d: Date) => {
    const local = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Sofia" }));
    const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
    return local.getTime() - utc.getTime();
  };
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
  return {
    from: new Date(start.getTime() - offsetAt(start)).toISOString(),
    to: new Date(end.getTime() - offsetAt(end)).toISOString(),
  };
}

export type AuditResult =
  | { ok: true; xml: string; orders: number; returns: number }
  | { ok: false; error: string };

/** `supabase` — сесията на админа (RLS); в базата пише само тя. */
export async function buildNapAudit(supabase: SupabaseClient, year: number, month: number): Promise<AuditResult> {
  const settings = await getShopSettings();
  if (!settings.napEshopNumber) return { ok: false, error: "Липсва номерът на е-магазина от НАП (Админ → Магазин)." };
  const { from, to } = monthBounds(year, month);

  const sel = "*, order_items(title, unit_price_eur, qty, line_total_eur)";
  const [{ data: delivered, error: e1 }, { data: returned, error: e2 }] = await Promise.all([
    supabase
      .from("orders")
      .select(sel)
      .not("doc_number", "is", null)
      .eq("is_test", false)
      .gte("shipped_at", from)
      .lt("shipped_at", to)
      .order("doc_number"),
    supabase
      .from("orders")
      .select("number, refunded_eur, refunded_at")
      .not("doc_number", "is", null)
      .eq("is_test", false)
      .gt("refunded_eur", 0)
      .gte("refunded_at", from)
      .lt("refunded_at", to)
      .order("refunded_at"),
  ]);
  if (e1 || e2) return { ok: false, error: (e1 ?? e2)!.message };
  const orders = (delivered ?? []) as any[];
  const rets = (returned ?? []) as any[];
  if (orders.length === 0) {
    return {
      ok: false,
      error:
        rets.length > 0
          ? "През месеца има върнати суми, но няма изпратени поръчки — схемата на НАП не допуска такъв файл. Питай счетоводителя."
          : "През месеца няма изпратени поръчки — няма какво да се подава.",
    };
  }

  const vatOf = (gross: number) => (VAT_RATE ? Math.round((gross * VAT_RATE * 100) / (100 + VAT_RATE)) / 100 : 0);
  const art = (name: string, qty: number, unitGross: number, sumGross: number) => {
    const vat = vatOf(sumGross);
    const unitNet = VAT_RATE ? Math.round((unitGross * 10000) / (100 + VAT_RATE)) / 100 : unitGross;
    return (
      `<artenum><art_name>${x(name.slice(0, 200))}</art_name><art_quant>${m2(qty)}</art_quant>` +
      `<art_price>${m2(unitNet)}</art_price><art_vat_rate>${VAT_RATE}</art_vat_rate>` +
      `<art_vat>${m2(vat)}</art_vat><art_sum>${m2(sumGross)}</art_sum></artenum>`
    );
  };

  const today = sofiaParts(new Date().toISOString()).date;
  const orderXml = orders
    .map((o) => {
      const items = (o.order_items ?? []) as any[];
      const shipping = Number(o.shipping_eur);
      const total = Number(o.total_eur);
      const vat = vatOf(total);
      return (
        `<orderenum><ord_n>${x(o.number)}</ord_n><ord_d>${sofiaParts(o.created_at).date}</ord_d>` +
        `<doc_n>${docNumber(Number(o.doc_number))}</doc_n><doc_date>${sofiaParts(o.doc_issued_at).date}</doc_date><art>` +
        items.map((i) => art(i.title, Number(i.qty), Number(i.unit_price_eur), Number(i.line_total_eur))).join("") +
        (shipping > 0 ? art("Доставка със Спиди", 1, shipping, shipping) : "") +
        `</art><ord_total1>${m2(total - vat)}</ord_total1><ord_disc>0.00</ord_disc><ord_vat>${m2(vat)}</ord_vat>` +
        `<ord_total2>${m2(total)}</ord_total2><paym>${PAYM_CODE}</paym><pos_n/>` +
        `<trans_n>${x(o.stripe_payment_intent ?? "")}</trans_n><proc_id>${x(PSP_ID)}</proc_id></orderenum>`
      );
    })
    .join("");

  const rTotal = rets.reduce((a, r) => a + Number(r.refunded_eur), 0);
  const returnsXml =
    `<r_ord>${rets.length}</r_ord>` +
    (rets.length
      ? `<rorder>` +
        rets
          .map(
            (r) =>
              `<rorderenum><r_ord_n>${x(r.number)}</r_ord_n><r_amount>${m2(Number(r.refunded_eur))}</r_amount>` +
              `<r_date>${sofiaParts(r.refunded_at).date}</r_date><r_paym>2</r_paym></rorderenum>`
          )
          .join("") +
        `</rorder>`
      : "") +
    `<r_total>${m2(rTotal)}</r_total>`;

  const xml =
    `<?xml version="1.0" encoding="windows-1251"?>\n<audit>` +
    `<eik>${COMPANY.eik}</eik><e_shop_n>${x(settings.napEshopNumber)}</e_shop_n>` +
    `<domain_name>${COMPANY.site}</domain_name><e_shop_type>1</e_shop_type>` +
    `<creation_date>${today}</creation_date><mon>${String(month).padStart(2, "0")}</mon><god>${year}</god>` +
    `<order>${orderXml}</order>${returnsXml}</audit>\n`;
  return { ok: true, xml, orders: orders.length, returns: rets.length };
}

// windows-1251 — кирилицата и няколкото знака, които се срещат в имената; друго става „?“.
const CP1251_EXTRA: Record<number, number> = {
  0x0401: 0xa8, 0x0451: 0xb8, 0x2116: 0xb9, 0x201e: 0x84, 0x201c: 0x93, 0x201d: 0x94,
  0x2013: 0x96, 0x2014: 0x97, 0x00ab: 0xab, 0x00bb: 0xbb, 0x00b0: 0xb0, 0x20ac: 0x88, 0x00b7: 0xb7,
};
export function toCp1251(s: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = c < 0x80 ? c : c >= 0x0410 && c <= 0x044f ? c - 0x0350 : CP1251_EXTRA[c] ?? 0x3f;
  }
  return out;
}
