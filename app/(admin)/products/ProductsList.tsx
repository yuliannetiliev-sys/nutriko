"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductListItem } from "@/lib/data";
import type { Category } from "@/lib/types";
import {
  createProduct,
  duplicateProduct,
  archiveProduct,
  unarchiveProduct,
  removeProduct,
} from "@/app/actions";

const f = (n: number, d = 2) =>
  n.toLocaleString("bg-BG", { minimumFractionDigits: d, maximumFractionDigits: d });

type Tab = "menu" | "dev" | "archive";

export default function ProductsList({
  products,
  categories,
}: {
  products: ProductListItem[];
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("menu");
  const [cat, setCat] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const groups = useMemo(
    () => ({
      menu: products.filter((p) => p.menu_ready && !p.archived),
      dev: products.filter((p) => !p.menu_ready && !p.archived),
      archive: products.filter((p) => p.archived),
    }),
    [products]
  );

  const catLabel = useMemo(() => new Map(categories.map((c) => [c.key, c.label])), [categories]);
  const catOptions = useMemo(() => {
    const present = new Set(
      products.map((p) => p.category).filter((c): c is string => !!c)
    );
    const ordered = categories.filter((c) => present.has(c.key)).map((c) => c.key);
    for (const k of present) if (!ordered.includes(k)) ordered.push(k);
    return ordered;
  }, [products, categories]);

  const rows = useMemo(
    () => groups[tab].filter((p) => !cat || p.category === cat),
    [groups, tab, cat]
  );

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка");
      }
    });
  }

  const tabBtn = (key: Tab, label: string, count: number) => (
    <button
      onClick={() => setTab(key)}
      className={`h-9 rounded-md px-3 text-sm font-medium ${
        tab === key ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {label} <span className={tab === key ? "text-neutral-300" : "text-neutral-400"}>· {count}</span>
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Продукти</h1>
        <form action={createProduct} className="flex gap-2">
          <input
            name="name"
            placeholder="Име на нов продукт"
            className="h-9 rounded-md border border-neutral-300 px-3 text-sm"
          />
          <button className="h-9 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700">
            + Нов
          </button>
        </form>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
          {tabBtn("menu", "В менюто", groups.menu.length)}
          {tabBtn("dev", "В разработка", groups.dev.length)}
          {tabBtn("archive", "Архив", groups.archive.length)}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-500">Категория</label>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="h-9 rounded-md border border-neutral-300 px-2 text-sm"
          >
            <option value="">Всички</option>
            {catOptions.map((k) => (
              <option key={k} value={k}>
                {catLabel.get(k) ?? k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {err && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2">Продукт</th>
              <th className="px-3 py-2">Категория</th>
              <th className="px-3 py-2 text-right">Порции</th>
              <th className="px-3 py-2 text-right">Себест./порция</th>
              <th className="px-3 py-2 text-right">Цена</th>
              <th className="px-3 py-2 text-right">Маржин</th>
              <th className="px-3 py-2 text-right">П/В/М/kcal·100g</th>
              <th className="px-3 py-2 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link href={`/products/${p.id}`} className="font-medium text-neutral-900 hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-neutral-600">{p.category ?? "—"}</td>
                <td className="px-3 py-2 text-right">{p.servings}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  €{f(p.cost_per_serving_eur)}
                  {!p.cost_complete && <span className="text-amber-500"> *</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {p.effective_price_eur != null ? `€${f(p.effective_price_eur)}` : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {p.margin_pct != null ? `${f(p.margin_pct, 0)}%` : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-500">
                  {f(p.protein_100g, 0)}/{f(p.carbs_100g, 0)}/{f(p.fat_100g, 0)}/{f(p.kcal_100g, 0)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {tab === "archive" ? (
                    <>
                      <button
                        onClick={() => run(() => unarchiveProduct(p.id))}
                        disabled={pending}
                        className="mr-3 text-emerald-600 hover:underline disabled:opacity-50"
                      >
                        Възстанови
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Окончателно триене на „${p.name}"? Това не може да се върне.`))
                            run(() => removeProduct(p.id));
                        }}
                        disabled={pending}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        Изтрий
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => run(() => duplicateProduct(p.id))}
                        disabled={pending}
                        className="mr-3 text-neutral-600 hover:underline disabled:opacity-50"
                      >
                        Копирай
                      </button>
                      <button
                        onClick={() => run(() => archiveProduct(p.id))}
                        disabled={pending}
                        className="text-neutral-500 hover:underline disabled:opacity-50"
                      >
                        Архивирай
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-neutral-400">
                  Няма продукти тук.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        <span className="text-amber-500">*</span> непълна себестойност — липсва цена на съставка. Архивирането маха продукта от менюто и сайта, без да го трие.
      </p>
    </div>
  );
}
