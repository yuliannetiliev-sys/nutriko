import Link from "next/link";
import { adminListOrders } from "@/lib/orders";
import { STATUS_LABEL, DELIVERY_LABEL, type OrderStatus } from "@/lib/shop-common";
import { eur } from "@/lib/price";

export const dynamic = "force-dynamic";

const FILTERS: [string, string][] = [
  ["active", "За изпълнение"],
  ["shipped", "Изпратени"],
  ["delivered", "Доставени"],
  ["pending", "Чакат плащане"],
  ["cancelled", "Отказани"],
  ["all", "Всички"],
];

const BADGE: Record<OrderStatus, string> = {
  pending: "bg-neutral-100 text-neutral-500",
  paid: "bg-amber-100 text-amber-800",
  packed: "bg-sky-100 text-sky-800",
  shipped: "bg-emerald-100 text-emerald-800",
  delivered: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-neutral-100 text-neutral-400",
  refunded: "bg-red-50 text-red-600",
};

const short = (iso: string) =>
  new Date(iso).toLocaleString("bg-BG", { timeZone: "Europe/Sofia", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = "active" } = await searchParams;
  const filter = FILTERS.some(([k]) => k === f) ? f : "active";
  const orders = await adminListOrders(filter as never);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Поръчки</h1>
        <Link href="/shop" className="text-sm text-neutral-500 hover:text-neutral-900">
          Настройки на магазина →
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map(([k, label]) => (
          <Link
            key={k}
            href={`/orders?f=${k}`}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === k ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400">
          {filter === "active" ? "Няма поръчки за изпълнение." : "Няма поръчки тук."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-3 py-2">№</th>
                <th className="px-3 py-2">Кога</th>
                <th className="px-3 py-2">Клиент</th>
                <th className="px-3 py-2">Какво</th>
                <th className="px-3 py-2">Доставка</th>
                <th className="px-3 py-2 text-right">Общо</th>
                <th className="px-3 py-2">Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2">
                    <Link href={`/orders/${o.id}`} className="font-medium text-neutral-900 hover:underline">
                      {o.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{short(o.paid_at ?? o.created_at)}</td>
                  <td className="px-3 py-2">{o.customer_name}</td>
                  <td className="px-3 py-2 text-neutral-600">
                    {o.items.map((i) => `${i.qty} × ${i.title}`).join(", ")}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">
                    {DELIVERY_LABEL[o.delivery_type]}
                    {o.city_name ? ` · ${o.city_name}` : ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(o.total_eur)}</td>
                  <td className="px-3 py-2">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                    {o.is_test && (
                      <span className="ml-1 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        тест
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
