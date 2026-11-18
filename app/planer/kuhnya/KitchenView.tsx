import type { KitchenRow, StaffCheck } from "@/lib/planer";
import { dayShort, hm } from "@/lib/planer-common";
import MadeButton from "./MadeButton";
import Proverka from "./Proverka";

const WORD = ["Днес", "Утре", "Вдругиден"];

function sumLine(rows: KitchenRow[]) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.cake_name, (m.get(r.cake_name) ?? 0) + r.qty);
  return [...m.entries()].map(([n, q]) => `${q} × ${n}`).join(", ");
}

// Кухнята (Ива, от телефона): първо за 360–390 px — трите дни един под друг.
// Без име и телефон на клиента — изгледът `cake_orders_kitchen` няма тези колони.
export default function KitchenView({
  days,
  check,
}: {
  days: { date: string; rows: KitchenRow[] }[];
  check: StaffCheck | null;
}) {
  return (
    <div>
      {/* Проверка преди работа (Прил. 72) — само напомня, не спира работата. */}
      {check && <Proverka check={check} />}

      <div className="space-y-6">
        {days.map(({ date, rows }, i) => {
          const sum = sumLine(rows);
          return (
            <section key={date}>
              <h2 className="mb-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold">{WORD[i]}</span>
                <span className="text-sm text-neutral-500">{dayShort(date)}</span>
              </h2>
              {rows.length === 0 ? (
                <p className="text-sm text-neutral-400">Няма поръчки.</p>
              ) : (
                <>
                  <p className="mb-2 text-base font-medium text-neutral-800">{sum}</p>
                  <ul className="space-y-2">
                    {rows.map((r) => {
                      const late = i === 0 && r.status === "pending";
                      return (
                        <li
                          key={r.id}
                          className={
                            "rounded-xl border-2 p-3 " +
                            (late ? "border-red-500 bg-red-50" : r.status === "made" ? "border-neutral-200 bg-white" : "border-neutral-300 bg-white")
                          }
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-14 shrink-0 text-lg font-semibold tabular-nums">{hm(r.pickup_time) || "—"}</div>
                            <div className={"min-w-0 flex-1 " + (r.status === "made" ? "text-neutral-500" : "")}>
                              <div className="text-lg font-semibold leading-snug">
                                {r.qty > 1 && <span className="mr-1">{r.qty} ×</span>}
                                {r.cake_name}
                              </div>
                              {r.note && <div className="mt-1 text-base italic">„{r.note}“</div>}
                            </div>
                          </div>
                          <MadeButton id={r.id} status={r.status} madeAt={r.made_at} />
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
