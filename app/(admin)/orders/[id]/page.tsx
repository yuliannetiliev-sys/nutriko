import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetOrder, adminOrderEvents, deliveryLine } from "@/lib/orders";
import { SALE_DOC_TITLE, docNumber, sofiaParts } from "@/lib/sale-doc";
import { STATUS_LABEL, DELIVERY_LABEL } from "@/lib/shop-common";
import { trackingUrl } from "@/lib/speedy";
import { eur } from "@/lib/price";
import OrderActions from "./OrderActions";

export const dynamic = "force-dynamic";

const at = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("bg-BG", { timeZone: "Europe/Sofia", dateStyle: "medium", timeStyle: "short" }) : null;

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, events] = await Promise.all([adminGetOrder(Number(id)), adminOrderEvents(Number(id))]);
  if (!o) notFound();

  const card = "rounded-lg border border-neutral-200 bg-white p-5";
  const label = "text-xs font-medium uppercase tracking-wide text-neutral-400";

  return (
    <div className="space-y-4">
      <Link href="/orders" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Всички поръчки
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Поръчка {o.number}</h1>
        <span className="text-sm text-neutral-500">
          {STATUS_LABEL[o.status]}
          {o.batch_label && <> · партида {o.batch_label}</>}
        </span>
      </div>

      {o.doc_number && o.doc_issued_at && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {SALE_DOC_TITLE} <b className="tabular-nums">№ {docNumber(o.doc_number)}</b> · {sofiaParts(o.doc_issued_at).display}{" "}
          ·{" "}
          <a href={`/magazin/dokument/${o.doc_token}`} target="_blank" className="underline">
            виж
          </a>
          {o.refunded_eur > 0 && <> · върнати {eur(o.refunded_eur)}</>}
        </p>
      )}

      {o.is_test && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>Пробна поръчка</b> — платена в тестовия режим на Stripe, пари не са взети. Товарителница не се прави: при
          Спиди всяка е истинска пратка.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <p className={label}>Какво</p>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {o.items.map((i, k) => (
                <tr key={k}>
                  <td className="py-1">
                    {i.qty} × {i.title}
                  </td>
                  <td className="py-1 text-right tabular-nums">{eur(i.line_total_eur)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1 text-neutral-500">Доставка</td>
                <td className="py-1 text-right tabular-nums text-neutral-500">{eur(o.shipping_eur)}</td>
              </tr>
              <tr className="border-t border-neutral-100 font-semibold">
                <td className="py-1.5">Общо</td>
                <td className="py-1.5 text-right tabular-nums">{eur(o.total_eur)}</td>
              </tr>
            </tbody>
          </table>
          {o.customer_note && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <b>Бележка от клиента:</b> {o.customer_note}
            </p>
          )}
        </div>

        <div className={card}>
          <p className={label}>Кому и къде</p>
          <p className="mt-2 text-sm">
            <b>{o.customer_name}</b>
            <br />
            <a href={`tel:${o.phone}`} className="hover:underline">
              {o.phone}
            </a>{" "}
            ·{" "}
            <a href={`mailto:${o.email}`} className="hover:underline">
              {o.email}
            </a>
          </p>
          <p className="mt-3 text-sm">
            <span className="text-neutral-500">{DELIVERY_LABEL[o.delivery_type]}:</span>
            <br />
            {deliveryLine(o)}
          </p>
          {o.waybill_id && (
            <p className="mt-3 text-sm">
              Товарителница <b>{o.waybill_id}</b> ·{" "}
              <a href={trackingUrl(o.waybill_id)} target="_blank" className="text-emerald-700 hover:underline">
                проследи
              </a>{" "}
              ·{" "}
              <a href={`/api/admin/waybill/${o.id}`} target="_blank" className="text-emerald-700 hover:underline">
                печат (PDF)
              </a>
            </p>
          )}
        </div>
      </div>

      <OrderActions id={o.id} status={o.status} hasWaybill={!!o.waybill_id} isTest={o.is_test} note={o.admin_note ?? ""} batch={o.batch_label ?? ""} />

      <div className={`${card} text-xs text-neutral-500`}>
        <p className={label}>История</p>
        <ul className="mt-2 space-y-0.5">
          <li>Създадена: {at(o.created_at)}</li>
          {o.paid_at && <li>Платена: {at(o.paid_at)}</li>}
          {o.packed_at && <li>Опакована: {at(o.packed_at)}</li>}
          {o.shipped_at && <li>Изпратена: {at(o.shipped_at)}</li>}
          {o.delivered_at && <li>Доставена: {at(o.delivered_at)}</li>}
          {o.cancelled_at && <li>Отказана: {at(o.cancelled_at)}</li>}
          {o.stripe_payment_intent && <li>Stripe: {o.stripe_payment_intent}</li>}
        </ul>
        {events.length > 0 && (
          <>
            <p className={`${label} mt-4`}>Дневник (пише го базата — не се трие)</p>
            <ul className="mt-2 space-y-0.5">
              {events.map((e, k) => (
                <li key={k}>
                  {at(e.at)} · {e.actor} · {e.action}
                  {e.details ? ` · ${Object.entries(e.details).map(([a, b]) => `${a}: ${b}`).join(", ")}` : ""}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
