import Link from "next/link";
import { getPlannerUser, listPast, listUpcoming, purgeExpiredCustomers, searchOrders, type OrderRow } from "@/lib/planer";
import { dayShort, dayWord, sofiaToday } from "@/lib/planer-common";
import OrderCard from "./OrderCard";

export const dynamic = "force-dynamic";

function sumLine(rows: OrderRow[]) {
  const m = new Map<string, number>();
  for (const r of rows) if (r.status !== "cancelled") m.set(r.cake_name, (m.get(r.cake_name) ?? 0) + r.qty);
  return [...m.entries()].map(([n, q]) => `${q} × ${n}`).join(", ");
}

export default async function PlanerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; minali?: string; nova?: string }>;
}) {
  const { q = "", minali, nova } = await searchParams;
  const query = q.trim().slice(0, 60);
  const past = minali === "1";

  const u = await getPlannerUser();
  // Правилото за 1 година (клиенти без съгласие) — трие само админ.
  if (u?.isAdmin) await purgeExpiredCustomers().catch(() => 0);

  const tab = (on: boolean) =>
    "flex-1 rounded-lg py-2 text-center text-sm font-medium " +
    (on ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Торти — поръчки</h1>
        <Link
          href="/planer/nova"
          className="inline-flex h-12 items-center rounded-xl bg-[#1f4733] px-4 text-base font-semibold text-white active:opacity-80"
        >
          + Нова поръчка
        </Link>
      </div>

      {nova === "1" && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Поръчката е записана.</p>
      )}

      <form action="/planer" className="mb-3 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Търси по име или телефон"
          inputMode="search"
          className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-base"
        />
        <button className="h-11 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium active:bg-neutral-100">
          Търси
        </button>
      </form>

      {query ? (
        <Search q={query} />
      ) : (
        <>
          <div className="mb-4 flex gap-1 rounded-xl bg-neutral-200/70 p-1">
            <Link href="/planer" className={tab(!past)}>
              Предстоящи
            </Link>
            <Link href="/planer?minali=1" className={tab(past)}>
              Минали
            </Link>
          </div>
          {past ? <Past /> : <Upcoming />}
        </>
      )}
    </div>
  );
}

async function Upcoming() {
  const { today, upcoming, late } = await listUpcoming();
  const days = [...new Set(upcoming.map((o) => o.pickup_date))];
  return (
    <div className="space-y-6">
      {late.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-red-700">Минали дни — още не са отбелязани като взети</h2>
          <ul className="space-y-2">
            {late.map((o) => (
              <OrderCard key={o.id} o={o} showDate />
            ))}
          </ul>
        </section>
      )}
      {days.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-neutral-500">
          Няма предстоящи поръчки.
        </p>
      )}
      {days.map((d) => {
        const rows = upcoming.filter((o) => o.pickup_date === d);
        const word = dayWord(d, today);
        const sum = sumLine(rows);
        return (
          <section key={d}>
            <h2 className="mb-1 flex items-baseline gap-2">
              <span className="text-base font-semibold">{word || dayShort(d)}</span>
              {word && <span className="text-sm text-neutral-500">{dayShort(d)}</span>}
            </h2>
            {sum && <p className="mb-2 text-sm text-neutral-600">{sum}</p>}
            <ul className="space-y-2">
              {rows.map((o) => (
                <OrderCard key={o.id} o={o} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

async function Past() {
  const rows = await listPast();
  if (!rows.length)
    return <p className="px-4 py-8 text-center text-neutral-500">Няма минали поръчки.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((o) => (
        <OrderCard key={o.id} o={o} showDate />
      ))}
    </ul>
  );
}

async function Search({ q }: { q: string }) {
  const rows = await searchOrders(q);
  const today = sofiaToday();
  return (
    <div>
      <p className="mb-2 text-sm text-neutral-500">
        „{q}“: {rows.length} {rows.length === 1 ? "поръчка" : "поръчки"} ·{" "}
        <Link href="/planer" className="underline">
          изчисти
        </Link>
      </p>
      <ul className="space-y-2">
        {rows.map((o) => (
          <OrderCard key={o.id} o={o} showDate={o.pickup_date !== today} />
        ))}
      </ul>
    </div>
  );
}
