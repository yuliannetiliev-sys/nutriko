"use client";

import { useState, useTransition } from "react";
import { deleteOrder, setStatus } from "./actions";
import type { CakeStatus } from "@/lib/planer-common";

const BTN: { s: CakeStatus; label: string; cls: string }[] = [
  { s: "made", label: "Произведена", cls: "bg-sky-700 text-white" },
  { s: "picked_up", label: "Взета", cls: "bg-emerald-700 text-white" },
  { s: "cancelled", label: "Отказана", cls: "border border-neutral-300 bg-white text-neutral-700" },
];

export default function StatusButtons({ id, status, isAdmin }: { id: number; status: CakeStatus; isAdmin: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const go = (s: CakeStatus) =>
    start(async () => {
      setError("");
      const r = await setStatus(id, s);
      if (!r.ok) setError(r.error);
    });

  const del = () => {
    if (!confirm("Да изтрия ли поръчката завинаги? Ако клиентът се е отказал, по-добре „Отказана“.")) return;
    start(async () => {
      setError("");
      const r = await deleteOrder(id);
      if (r && !r.ok) setError(r.error);
    });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {BTN.map((b) => (
          <button
            key={b.s}
            disabled={pending || status === b.s}
            onClick={() => go(b.s)}
            className={
              "h-14 rounded-xl text-base font-semibold active:opacity-80 disabled:opacity-40 " +
              b.cls +
              (status === b.s ? " ring-2 ring-offset-2 ring-neutral-400" : "")
            }
          >
            {b.label}
          </button>
        ))}
      </div>
      {status !== "pending" && (
        <button
          disabled={pending}
          onClick={() => go("pending")}
          className="mt-2 text-sm text-neutral-500 underline disabled:opacity-40"
        >
          Върни като „Чакаща“
        </button>
      )}
      {isAdmin && (
        <button disabled={pending} onClick={del} className="mt-2 block text-sm text-red-600 underline disabled:opacity-40">
          Изтрий поръчката
        </button>
      )}
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
