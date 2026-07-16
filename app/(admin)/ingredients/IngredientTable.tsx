"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Ingredient } from "@/lib/types";
import { updateIngredient, createIngredient, deleteIngredient } from "@/app/actions";

const f = (n: number | null, d = 1) =>
  n == null ? "—" : n.toLocaleString("bg-BG", { minimumFractionDigits: d, maximumFractionDigits: d });

function numOrNull(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function IngredientTable({ ingredients }: { ingredients: Ingredient[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [onlyNoPrice, setOnlyNoPrice] = useState(false);
  const [edits, setEdits] = useState<Record<number, string>>({});
  // null = затворено, "new" = нова, иначе редактираме съществуваща
  const [form, setForm] = useState<"new" | Ingredient | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ingredients.filter(
      (i) => (!q || i.name.toLowerCase().includes(q)) && (!onlyNoPrice || !i.price_entered)
    );
  }, [ingredients, search, onlyNoPrice]);

  const changed = Object.entries(edits).filter(([id, v]) => {
    const orig = ingredients.find((i) => i.id === Number(id));
    const origStr = orig?.price_eur_100 != null ? String(orig.price_eur_100) : "";
    return v.trim() !== origStr;
  });

  function saveAllPrices() {
    startTransition(async () => {
      try {
        for (const [id, v] of changed) {
          const res = await updateIngredient(Number(id), { price_eur_100: numOrNull(v) });
          if (!res.ok) {
            setErr(res.error ?? "Грешка при запис на цените");
            return;
          }
        }
        setEdits({});
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка");
      }
    });
  }

  function onDelete(i: Ingredient) {
    if (!confirm(`Изтриване на „${i.name}"?`)) return;
    setErr(null);
    startTransition(async () => {
      try {
        const res = await deleteIngredient(i.id);
        if (!res.ok) {
          setErr(res.error ?? "Грешка при изтриване");
          return;
        }
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка при изтриване");
      }
    });
  }

  const noPriceCount = ingredients.filter((i) => !i.price_entered).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          Съставки <span className="text-neutral-400">· {ingredients.length}</span>
          <span className="ml-2 text-sm font-normal text-amber-600">{noPriceCount} без цена</span>
        </h1>
        <div className="flex items-center gap-2">
          {changed.length > 0 && (
            <button
              onClick={saveAllPrices}
              disabled={pending}
              className="h-9 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Записва…" : `Запази ${changed.length} цени`}
            </button>
          )}
          <button
            onClick={() => { setForm("new"); setErr(null); }}
            className="h-9 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700"
          >
            + Нова съставка
          </button>
        </div>
      </div>

      {err && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {form !== null && (
        <IngredientForm
          key={form === "new" ? "new" : form.id}
          initial={form === "new" ? null : form}
          onDone={() => { setForm(null); router.refresh(); }}
          onError={setErr}
        />
      )}

      <div className="mb-3 flex items-center gap-3">
        <input
          className="h-9 w-64 rounded-md border border-neutral-300 px-3 text-sm"
          placeholder="Търси…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={onlyNoPrice} onChange={(e) => setOnlyNoPrice(e.target.checked)} />
          само без цена
        </label>
        <span className="text-xs text-neutral-400">цените са за 100 g</span>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 shadow-[0_1px_0_0_#e5e5e5] [&_th]:bg-neutral-50">
            <tr>
              <th className="px-3 py-2">Съставка</th>
              <th className="px-3 py-2 text-right">П</th>
              <th className="px-3 py-2 text-right">В</th>
              <th className="px-3 py-2 text-right">М</th>
              <th className="px-3 py-2 text-right">kcal</th>
              <th className="px-3 py-2 text-right" title="Гликемичен индекс">ГИ</th>
              <th className="px-3 py-2 text-right">€/100g</th>
              <th className="px-3 py-2">ед.</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const val = edits[i.id] ?? (i.price_eur_100 != null ? String(i.price_eur_100) : "");
              return (
                <tr key={i.id} className="border-t border-neutral-100">
                  <td className="px-3 py-1.5">{i.name}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-neutral-500">{f(i.protein_100)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-neutral-500">{f(i.carbs_100)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-neutral-500">{f(i.fat_100)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-neutral-500">{f(i.kcal_100, 0)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-neutral-500">{i.gi == null ? "—" : i.gi}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      className={`h-8 w-20 rounded-md border px-2 text-right text-sm ${
                        i.price_entered ? "border-neutral-300" : "border-amber-300 bg-amber-50"
                      }`}
                      value={val}
                      onChange={(e) => setEdits((s) => ({ ...s, [i.id]: e.target.value }))}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-neutral-400">{i.unit}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-right">
                    <button
                      onClick={() => { setForm(i); setErr(null); window.scrollTo({ top: 0 }); }}
                      className="mr-2 text-neutral-400 hover:text-neutral-900"
                      title="Редактирай"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => onDelete(i)}
                      disabled={pending}
                      className="text-neutral-400 hover:text-red-600 disabled:opacity-50"
                      title="Изтрий"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IngredientForm({
  initial,
  onDone,
  onError,
}: {
  initial: Ingredient | null;
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    protein_100: initial?.protein_100 != null ? String(initial.protein_100) : "",
    carbs_100: initial?.carbs_100 != null ? String(initial.carbs_100) : "",
    fat_100: initial?.fat_100 != null ? String(initial.fat_100) : "",
    kcal_100: initial?.kcal_100 != null ? String(initial.kcal_100) : "",
    price_eur_100: initial?.price_eur_100 != null ? String(initial.price_eur_100) : "",
    unit: initial?.unit ?? "g",
    grams_per_unit: initial?.grams_per_unit != null ? String(initial.grams_per_unit) : "",
    gi: initial?.gi != null ? String(initial.gi) : "",
  });
  const cls = "h-9 rounded-md border border-neutral-300 px-2 text-sm";

  function submit() {
    if (!v.name.trim()) {
      onError("Въведи име на съставката.");
      return;
    }
    if (v.unit === "бр." && numOrNull(v.grams_per_unit) == null) {
      onError('За мерна единица „бр." задай колко грама тежи 1 бройка (макросите и цената се въвеждат на 100 g).');
      return;
    }
    const giNum = numOrNull(v.gi);
    const fields = {
      name: v.name.trim(),
      category: v.category.trim() || null,
      protein_100: numOrNull(v.protein_100),
      carbs_100: numOrNull(v.carbs_100),
      fat_100: numOrNull(v.fat_100),
      kcal_100: numOrNull(v.kcal_100),
      price_eur_100: numOrNull(v.price_eur_100),
      unit: v.unit,
      grams_per_unit: v.unit === "бр." ? numOrNull(v.grams_per_unit) : null,
      // ГИ е цяло число (0–100) — закръгляме, за да не гърми при въведено „0.5".
      gi: giNum == null ? null : Math.round(giNum),
    };
    startTransition(async () => {
      try {
        const res = initial
          ? await updateIngredient(initial.id, fields)
          : await createIngredient(fields);
        if (!res.ok) {
          onError(res.error ?? "Грешка при запис");
          return;
        }
        onDone();
      } catch (e) {
        onError(e instanceof Error ? e.message : "Грешка при запис");
      }
    });
  }

  return (
    <div className="mb-4 rounded-lg border border-neutral-300 bg-white p-4">
      <p className="mb-3 text-sm font-medium">
        {initial ? `Редакция · ${initial.name}` : "Нова съставка"}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Labeled label="Име" full>
          <input className={`${cls} w-full`} placeholder="напр. Маскарпоне" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Labeled>
        <Labeled label="Категория">
          <input className={`${cls} w-full`} placeholder="по избор" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} />
        </Labeled>
        <Labeled label="Мерна единица">
          <select className={`${cls} w-full`} value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })}>
            <option value="g">грам (g)</option>
            <option value="ml">милилитър (ml)</option>
            <option value="бр.">бройка (бр.)</option>
          </select>
        </Labeled>
        <Labeled label="Протеин · /100g">
          <input className={`${cls} w-full`} placeholder="напр. 12.6" value={v.protein_100} onChange={(e) => setV({ ...v, protein_100: e.target.value })} />
        </Labeled>
        <Labeled label="Въглехидрати · /100g">
          <input className={`${cls} w-full`} placeholder="напр. 0.7" value={v.carbs_100} onChange={(e) => setV({ ...v, carbs_100: e.target.value })} />
        </Labeled>
        <Labeled label="Мазнини · /100g">
          <input className={`${cls} w-full`} placeholder="напр. 9.5" value={v.fat_100} onChange={(e) => setV({ ...v, fat_100: e.target.value })} />
        </Labeled>
        <Labeled label="Калории · /100g">
          <input className={`${cls} w-full`} placeholder="kcal" value={v.kcal_100} onChange={(e) => setV({ ...v, kcal_100: e.target.value })} />
        </Labeled>
        <Labeled label="Гликемичен индекс (цяло число, по избор)">
          <input className={`${cls} w-full`} placeholder="напр. 45" value={v.gi} onChange={(e) => setV({ ...v, gi: e.target.value })} />
        </Labeled>
        <Labeled label="Цена · €/100g">
          <input className={`${cls} w-full`} placeholder="напр. 1.20" value={v.price_eur_100} onChange={(e) => setV({ ...v, price_eur_100: e.target.value })} />
        </Labeled>
        {v.unit === "бр." && (
          <Labeled label="Грама за 1 бройка">
            <input
              className={`${cls} w-full ${numOrNull(v.grams_per_unit) == null ? "border-amber-400 bg-amber-50" : ""}`}
              placeholder="напр. 57"
              value={v.grams_per_unit}
              onChange={(e) => setV({ ...v, grams_per_unit: e.target.value })}
            />
          </Labeled>
        )}
      </div>
      {v.unit === "бр." && (
        <p className="mt-2 text-xs text-amber-700">
          За „бр.": въведи макросите и цената <b>на 100 g</b> (не на 1 бройка) и задай колко грама тежи 1 бройка. Рецептите смятат по реалните грамове.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button onClick={submit} disabled={pending} className="h-9 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {pending ? "Записва…" : initial ? "Запази промените" : "Добави"}
        </button>
        <button onClick={onDone} className="h-9 rounded-md border border-neutral-300 px-3 text-sm">
          Отказ
        </button>
      </div>
    </div>
  );
}

function Labeled({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "col-span-2" : ""}`}>
      <span className="text-[11px] font-medium text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
