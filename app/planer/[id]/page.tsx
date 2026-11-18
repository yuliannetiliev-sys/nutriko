import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, getPlannerUser, listCakes } from "@/lib/planer";
import { STATUS_BADGE, STATUS_LABEL, dayShort, dmy, hm, showPhone } from "@/lib/planer-common";
import OrderForm from "../OrderForm";
import StatusButtons from "../StatusButtons";

export const dynamic = "force-dynamic";

const at = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("bg-BG", {
        timeZone: "Europe/Sofia",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const [order, cakes, u] = await Promise.all([getOrder(n), listCakes(), getPlannerUser()]);
  if (!order) notFound();

  const times = [
    ["Записана", at(order.created_at)],
    ["Произведена", at(order.made_at)],
    ["Взета", at(order.picked_up_at)],
    ["Отказана", at(order.cancelled_at)],
  ].filter(([, t]) => t);

  return (
    <div>
      <div className="mb-3">
        <Link href="/planer" className="text-sm text-neutral-500">
          ← Поръчки
        </Link>
      </div>

      {ok === "1" && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Промените са записани.</p>
      )}

      <section className="mb-4 rounded-xl border border-neutral-300 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold leading-snug">
              {order.qty > 1 && <span className="mr-1">{order.qty} ×</span>}
              {order.cake_name}
            </h1>
            <p className="mt-1 text-base">
              {dayShort(order.pickup_date)} · {dmy(order.pickup_date)}
              {order.pickup_time && <span className="font-semibold"> · {hm(order.pickup_time)}</span>}
            </p>
          </div>
          <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium " + STATUS_BADGE[order.status]}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        {order.note && <p className="mt-2 text-base italic">„{order.note}“</p>}
        {order.customer && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-base">{order.customer.name}</span>
            {order.customer.phone && (
              <a
                href={`tel:${order.customer.phone}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-base font-medium text-[#1f4733] active:bg-neutral-100"
              >
                📞 {showPhone(order.customer.phone)}
              </a>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-neutral-500">
          {times.map(([w, t]) => `${w}: ${t}`).join(" · ")}
          {order.created_by && ` · въвел: ${order.created_by}`}
        </p>
      </section>

      <section className="mb-8">
        <StatusButtons id={order.id} status={order.status} isAdmin={!!u?.isAdmin} />
      </section>

      <h2 className="mb-3 text-base font-semibold">Промяна</h2>
      <OrderForm cakes={cakes} order={order} />
    </div>
  );
}
