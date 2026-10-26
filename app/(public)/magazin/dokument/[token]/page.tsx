import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrderByDocToken } from "@/lib/orders";
import { getShopSettings } from "@/lib/shop";
import { SALE_DOC_TITLE, TAX_GROUP, PAYMENT_LABEL, SELLER_LINES, docNumber, sofiaParts } from "@/lib/sale-doc";
import { eur } from "@/lib/price";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: SALE_DOC_TITLE, robots: { index: false, follow: false } };

/**
 * Документът за регистриране на продажбата (чл. 52о от Н-18) — същият като в имейла.
 * Без лични данни на клиента: законът не ги изисква, а линкът може да бъде препратен.
 */
export default async function SaleDocPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [o, settings] = await Promise.all([getOrderByDocToken(token), getShopSettings()]);
  if (!o?.doc_number || !o.doc_issued_at) notFound();
  const t = sofiaParts(o.doc_issued_at);
  const cell = "border-b border-ink/10 px-2 py-1.5";

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <div className="rounded-2xl border border-ink/15 bg-white p-6 text-sm text-ink">
        <h1 className="text-lg font-semibold">{SALE_DOC_TITLE}</h1>
        <p className="mt-1">
          № <b className="tabular-nums">{docNumber(o.doc_number)}</b> · {t.display}
        </p>

        <div className="mt-4 space-y-0.5 text-ink/80">
          {SELLER_LINES.map((l) => (
            <p key={l}>{l}</p>
          ))}
          {settings.napEshopNumber && <p>Електронен магазин nutriko.fit · № в НАП {settings.napEshopNumber}</p>}
        </div>

        <div className="mt-4 space-y-0.5">
          <p>
            Поръчка: <b>{o.number}</b>
          </p>
          <p className="break-all">
            Трансакция: <span className="font-mono text-xs">{o.stripe_payment_intent}</span>
          </p>
        </div>

        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="text-xs text-muted">
              <th className={cell}>Стока</th>
              <th className={`${cell} text-center`}>Гр.</th>
              <th className={`${cell} text-right`}>К-во</th>
              <th className={`${cell} text-right`}>Ед. цена</th>
              <th className={`${cell} text-right`}>Стойност</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {o.items.map((i, k) => (
              <tr key={k}>
                <td className={cell}>{i.title}</td>
                <td className={`${cell} text-center`}>{TAX_GROUP}</td>
                <td className={`${cell} text-right`}>{i.qty}</td>
                <td className={`${cell} text-right`}>{eur(i.unit_price_eur)}</td>
                <td className={`${cell} text-right`}>{eur(i.line_total_eur)}</td>
              </tr>
            ))}
            {o.shipping_eur > 0 && (
              <tr>
                <td className={cell}>Доставка със Спиди</td>
                <td className={`${cell} text-center`}>{TAX_GROUP}</td>
                <td className={`${cell} text-right`}>1</td>
                <td className={`${cell} text-right`}>{eur(o.shipping_eur)}</td>
                <td className={`${cell} text-right`}>{eur(o.shipping_eur)}</td>
              </tr>
            )}
            <tr className="font-semibold">
              <td className="px-2 pt-2" colSpan={4}>
                Обща сума
              </td>
              <td className="px-2 pt-2 text-right">{eur(o.total_eur)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-ink/80">Плащане: {PAYMENT_LABEL}</p>
        <p className="mt-1 text-xs text-muted">Продавачът не е регистриран по ЗДДС.</p>

        {settings.napEshopNumber && (
          // eslint-disable-next-line @next/next/no-img-element -- PNG от нашия API, не се оптимизира
          <img src={`/api/shop/doc-qr/${o.doc_token}`} alt="QR код на документа" width={160} height={160} className="mt-5" />
        )}
      </div>
    </div>
  );
}
