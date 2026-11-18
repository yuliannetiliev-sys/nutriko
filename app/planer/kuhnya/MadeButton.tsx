"use client";

import { useState, useTransition } from "react";
import { setStatus } from "../actions";
import { sofiaHm, type CakeStatus } from "@/lib/planer-common";

export default function MadeButton({ id, status, madeAt }: { id: number; status: CakeStatus; madeAt: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const go = (s: CakeStatus) =>
    start(async () => {
      setError("");
      const r = await setStatus(id, s);
      if (!r.ok) setError(r.error);
    });

  return (
    <div className="mt-3">
      {status === "made" ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-medium text-sky-800">✓ Произведена {sofiaHm(madeAt)}</span>
          <button disabled={pending} onClick={() => go("pending")} className="text-sm text-neutral-500 underline disabled:opacity-40">
            Върни
          </button>
        </div>
      ) : (
        <button
          disabled={pending}
          onClick={() => go("made")}
          className="h-14 w-full rounded-xl bg-[#1f4733] text-lg font-semibold text-white active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Записва…" : "Произведена"}
        </button>
      )}
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
