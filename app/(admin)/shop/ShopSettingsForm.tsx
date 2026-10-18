"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShopSettings } from "@/app/shop-actions";

type S = { enabled: boolean; office: string; apt: string; address: string; freeFrom: string };

export default function ShopSettingsForm({ initial }: { initial: S }) {
  const router = useRouter();
  const [v, setV] = useState<S>(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof S, val: string | boolean) => {
    setV((s) => ({ ...s, [k]: val }));
    setSaved(false);
  };

  function save() {
    start(async () => {
      setErr(null);
      const r = await saveShopSettings(v);
      if (!r.ok) setErr(r.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  const input = "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-neutral-500";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={v.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
        <span>
          <span className="font-medium">Магазинът е отворен</span>
          <span className="block text-xs text-neutral-500">
            Изключен: страниците показват „скоро“, поръчка не може да се направи. Включи го чак след
            регистрацията в БАБХ и декларирането в НАП.
          </span>
        </span>
      </label>

      <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-neutral-400">
        Доставка със Спиди — празно поле = не се предлага
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className={label}>До офис (€)</label>
          <input className={input} inputMode="decimal" value={v.office} onChange={(e) => set("office", e.target.value)} />
        </div>
        <div>
          <label className={label}>До автомат (€)</label>
          <input className={input} inputMode="decimal" value={v.apt} onChange={(e) => set("apt", e.target.value)} />
        </div>
        <div>
          <label className={label}>До адрес (€)</label>
          <input className={input} inputMode="decimal" value={v.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div>
          <label className={label}>Безплатна от (€)</label>
          <input
            className={input}
            inputMode="decimal"
            placeholder="никога"
            value={v.freeFrom}
            onChange={(e) => set("freeFrom", e.target.value)}
          />
        </div>
      </div>
      <p className="mt-1 text-[11px] text-neutral-400">
        „Безплатна от“ е сумата на артикулите, над която доставката е 0 — напр. 2 кутии.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Записва…" : "Запази"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Запазено ✓</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}
