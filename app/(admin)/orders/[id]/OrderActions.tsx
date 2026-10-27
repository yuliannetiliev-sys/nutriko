"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatus, createOrderWaybill, saveOrderNote, saveOrderBatch } from "@/app/shop-actions";
import type { OrderStatus } from "@/lib/shop-common";

export default function OrderActions({
  id,
  status,
  hasWaybill,
  isTest,
  note,
  batch,
}: {
  id: number;
  status: OrderStatus;
  hasWaybill: boolean;
  isTest: boolean;
  note: string;
  batch: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [text, setText] = useState(note);
  const [lot, setLot] = useState(batch);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; waybill?: string }>, done?: string) =>
    start(async () => {
      setErr(null);
      setMsg(null);
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Грешка");
      else {
        setMsg(r.waybill ? `Товарителница ${r.waybill} — клиентът получи имейл с проследяване.` : done ?? "Записано.");
        router.refresh();
      }
    });

  const btn = "h-9 rounded-md px-3 text-sm font-medium disabled:opacity-50";
  // Опаковане и товарителница — чак след записана партида (за пробните поръчки не важи).
  const lotMissing = !isTest && !batch.trim() && status !== "cancelled" && status !== "refunded" && status !== "pending";
  const canShip = (status === "paid" || status === "packed") && !hasWaybill && !isTest;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      {(status === "paid" || status === "packed" || status === "shipped" || status === "delivered") && (
        <div className={`mb-4 rounded-md p-3 ${lotMissing ? "bg-amber-50" : "bg-neutral-50"}`}>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Партида — датата „Най-добър до“ от етикета на кутиите
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              className="h-9 w-56 rounded-md border border-neutral-300 px-2 text-sm"
              placeholder="напр. 15.03.2027"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
            />
            <button
              disabled={pending || lot.trim() === batch.trim()}
              onClick={() => run(() => saveOrderBatch(id, lot), "Партидата е записана.")}
              className={`${btn} border border-neutral-300 bg-white hover:bg-neutral-50`}
            >
              Запази партидата
            </button>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {lotMissing
              ? "Без партида поръчката не може да се маркира „Опакована“ и не се прави товарителница."
              : "Кутии от две партиди — запиши двете дати, напр. „15.03.2027 ×1, 22.03.2027 ×1“."}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {status === "paid" && (
          <button disabled={pending || lotMissing} onClick={() => run(() => setOrderStatus(id, "packed"))} className={`${btn} bg-sky-600 text-white hover:bg-sky-700`}>
            Опакована
          </button>
        )}
        {canShip && (
          <button
            disabled={pending || lotMissing}
            onClick={() => {
              if (confirm("Създава ИСТИНСКА товарителница в Спиди и праща номера на клиента. Продължавам?"))
                run(() => createOrderWaybill(id));
            }}
            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            {pending ? "Създава…" : "Товарителница в Спиди"}
          </button>
        )}
        {status === "shipped" && (
          <button disabled={pending} onClick={() => run(() => setOrderStatus(id, "delivered"))} className={`${btn} border border-neutral-300 hover:bg-neutral-50`}>
            Доставена
          </button>
        )}
        {(status === "paid" || status === "packed") && (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("Отказана поръчка. Парите НЕ се връщат автоматично — върни ги от Stripe таблото. Продължавам?"))
                run(() => setOrderStatus(id, "cancelled"));
            }}
            className={`${btn} text-neutral-400 hover:text-red-600`}
          >
            Откажи
          </button>
        )}
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-neutral-500">Бележка (вижда я само админът)</label>
        <textarea
          className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button disabled={pending} onClick={() => run(() => saveOrderNote(id, text), "Бележката е записана.")} className="mt-1 text-xs text-neutral-500 hover:text-neutral-900">
          Запази бележката
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
    </div>
  );
}
