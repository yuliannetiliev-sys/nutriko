import Link from "next/link";
import type { OrderRow } from "@/lib/planer";
import { STATUS_BADGE, STATUS_LABEL, dayShort, hm, showPhone } from "@/lib/planer-common";

/** Една поръчка в списъка. Цялата карта отваря поръчката; телефонът се набира отделно. */
export default function OrderCard({ o, showDate = false }: { o: OrderRow; showDate?: boolean }) {
  const off = o.status === "cancelled" || o.status === "picked_up";
  return (
    <li className={"rounded-xl border bg-white " + (off ? "border-neutral-200 opacity-60" : "border-neutral-300")}>
      <Link href={`/planer/${o.id}`} className="block px-3 pb-2 pt-3 active:bg-neutral-50">
        <div className="flex items-start gap-3">
          <div className="w-14 shrink-0 text-center">
            {showDate && <div className="text-xs text-neutral-500">{dayShort(o.pickup_date)}</div>}
            <div className="text-lg font-semibold tabular-nums">{hm(o.pickup_time) || "—"}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className={"text-base font-semibold leading-snug " + (o.status === "cancelled" ? "line-through" : "")}>
              {o.qty > 1 && <span className="mr-1">{o.qty} ×</span>}
              {o.cake_name}
            </div>
            <div className="mt-0.5 truncate text-sm text-neutral-600">{o.customer?.name ?? "(клиентът е изтрит)"}</div>
            {o.note && <div className="mt-1 text-sm italic text-neutral-700">„{o.note}“</div>}
          </div>
          <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " + STATUS_BADGE[o.status]}>
            {STATUS_LABEL[o.status]}
          </span>
        </div>
      </Link>
      {o.customer?.phone && (
        <a
          href={`tel:${o.customer.phone}`}
          className="mx-3 mb-3 ml-[4.25rem] inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-sm font-medium text-[#1f4733] active:bg-neutral-100"
        >
          📞 {showPhone(o.customer.phone)}
        </a>
      )}
    </li>
  );
}
