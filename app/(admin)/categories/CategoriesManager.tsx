"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { createCategory, updateCategory, deleteCategory } from "@/app/actions";

export default function CategoriesManager({
  categories,
  counts,
}: {
  categories: Category[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [descs, setDescs] = useState<Record<string, string>>({});
  const [newLabel, setNewLabel] = useState("");

  function run(fn: () => Promise<unknown>) {
    setErr(null);
    startTransition(async () => {
      try {
        const res = (await fn()) as { ok?: boolean; error?: string } | undefined;
        if (res && res.ok === false) {
          setErr(res.error ?? "Грешка");
          return;
        }
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка");
      }
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const a = categories[idx];
    const b = categories[idx + dir];
    if (!a || !b) return;
    run(async () => {
      await updateCategory(a.key, { sort_order: b.sort_order });
      await updateCategory(b.key, { sort_order: a.sort_order });
    });
  }

  function addNew() {
    const lbl = newLabel.trim();
    if (!lbl) return;
    run(async () => {
      await createCategory(lbl);
      setNewLabel("");
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Категории <span className="text-neutral-400">· {categories.length}</span>
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addNew();
          }}
          className="flex gap-2"
        >
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Нова категория (напр. Смути)"
            className="h-9 w-56 rounded-md border border-neutral-300 px-3 text-sm"
          />
          <button
            disabled={pending}
            className="h-9 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            + Добави
          </button>
        </form>
      </div>

      <p className="mb-3 text-sm text-neutral-500">
        Името се показва в менюто и в избора при продуктите. „В менюто" изключено → категорията се
        крие от публичния сайт (продуктите остават). Стрелките определят реда в менюто.
      </p>

      {err && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-16 px-3 py-2">Ред</th>
              <th className="px-3 py-2">Име (показва се)</th>
              <th className="px-3 py-2">Ключ</th>
              <th className="px-3 py-2 text-right">Продукти</th>
              <th className="px-3 py-2 text-center">В менюто</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, idx) => {
              const val = labels[c.key] ?? c.label;
              const labelChanged = val.trim() !== "" && val.trim() !== c.label;
              const desc = descs[c.key] ?? c.description ?? "";
              const descChanged = desc !== (c.description ?? "");
              const n = counts[c.key] ?? 0;
              return (
                <Fragment key={c.key}>
                <tr className="border-t border-neutral-100">
                  <td className="whitespace-nowrap px-3 py-1.5 text-neutral-400">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={pending || idx === 0}
                      className="px-1 hover:text-neutral-900 disabled:opacity-30"
                      title="Нагоре"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={pending || idx === categories.length - 1}
                      className="px-1 hover:text-neutral-900 disabled:opacity-30"
                      title="Надолу"
                    >
                      ↓
                    </button>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        value={val}
                        onChange={(e) => setLabels((s) => ({ ...s, [c.key]: e.target.value }))}
                        className="h-8 w-full max-w-xs rounded-md border border-neutral-300 px-2 text-sm"
                      />
                      {labelChanged && (
                        <button
                          onClick={() => run(() => updateCategory(c.key, { label: val }))}
                          disabled={pending}
                          className="h-8 shrink-0 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Запази
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs text-neutral-400">{c.key}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-neutral-500">{n}</td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={c.menu_visible}
                      onChange={(e) => run(() => updateCategory(c.key, { menu_visible: e.target.checked }))}
                      disabled={pending}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Изтриване на категория „${c.label}"?`)) run(() => deleteCategory(c.key));
                      }}
                      disabled={pending || n > 0}
                      title={n > 0 ? "Има продукти в тази категория — премести ги първо" : "Изтрий"}
                      className="text-neutral-400 hover:text-red-600 disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td colSpan={5} className="px-3 pb-3 pt-0">
                    <div className="flex items-start gap-2">
                      <textarea
                        value={desc}
                        onChange={(e) => setDescs((s) => ({ ...s, [c.key]: e.target.value }))}
                        rows={2}
                        placeholder="Кратко описание/презентация — показва се под заглавието в менюто (по избор)"
                        className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
                      />
                      {descChanged && (
                        <button
                          onClick={() => run(() => updateCategory(c.key, { description: desc }))}
                          disabled={pending}
                          className="h-8 shrink-0 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Запази
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
