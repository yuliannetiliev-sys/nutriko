"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Allergen, Category, Ingredient, Product, RecipeLineFull } from "@/lib/types";
import { computeTotals, gramsToUnit, unitToGrams, round } from "@/lib/calc";
import {
  saveRecipe,
  archiveProduct,
  duplicateProduct,
  uploadProductImage,
  type SavePayload,
} from "@/app/actions";
import { compressImage } from "@/lib/compressImage";

type Row = { ingredient: Ingredient; qty: number };

const f = (n: number, d = 2) =>
  n.toLocaleString("bg-BG", { minimumFractionDigits: d, maximumFractionDigits: d });

function numOrNull(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function RecipeEditor({
  product,
  initialLines,
  catalog,
  allergens,
  categories,
}: {
  product: Product;
  initialLines: RecipeLineFull[];
  catalog: Ingredient[];
  allergens: Allergen[];
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category ?? categories[0]?.key ?? "торта");
  const [servings, setServings] = useState(String(product.servings ?? 12));
  const [finishedWeight, setFinishedWeight] = useState(
    product.finished_weight_g != null ? String(product.finished_weight_g) : ""
  );
  const [servingUnit, setServingUnit] = useState(product.serving_unit ?? "g");
  const [menuWeight, setMenuWeight] = useState(
    product.menu_weight_g != null ? String(product.menu_weight_g) : ""
  );
  const [images, setImages] = useState<string[]>(product.image_urls ?? []);

  function onUploadFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setErr(null);
    startTransition(async () => {
      try {
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.set("file", await compressImage(file));
          fd.set("productId", String(product.id));
          const res = await uploadProductImage(fd);
          if (res.error) {
            setErr(res.error);
            return;
          }
          if (res.url) setImages((s) => [...s, res.url!]);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка при качване");
      }
    });
  }
  function moveImage(i: number, dir: -1 | 1) {
    setImages((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }
  function removeImage(i: number) {
    setImages((s) => s.filter((_, k) => k !== i));
  }
  const [sellPrice, setSellPrice] = useState(
    product.sell_price_eur != null ? String(product.sell_price_eur) : ""
  );
  const [purchasePrice, setPurchasePrice] = useState(
    product.purchase_price_eur != null ? String(product.purchase_price_eur) : ""
  );
  const [wholePrice, setWholePrice] = useState(
    product.whole_price_eur != null ? String(product.whole_price_eur) : ""
  );
  const [multiplier, setMultiplier] = useState(
    product.price_multiplier != null ? String(product.price_multiplier) : ""
  );
  const [menuReady, setMenuReady] = useState(product.menu_ready);
  const [isPublished, setIsPublished] = useState(product.is_published);
  const [showMacros, setShowMacros] = useState(product.show_macros);
  const [tags, setTags] = useState((product.tags ?? []).join(", "));
  const [description, setDescription] = useState(product.description ?? "");
  const [prepNotes, setPrepNotes] = useState(product.prep_notes ?? "");
  const [allergenIds, setAllergenIds] = useState<number[]>(product.allergen_ids ?? []);

  function toggleAllergen(id: number) {
    setAllergenIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id].sort((a, b) => a - b)
    );
  }

  const [rows, setRows] = useState<Row[]>(
    initialLines.map((l) => ({ ingredient: l.ingredient, qty: gramsToUnit(l.grams, l.ingredient) }))
  );
  const [search, setSearch] = useState("");

  const usedIds = useMemo(() => new Set(rows.map((r) => r.ingredient.id)), [rows]);
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((i) => !usedIds.has(i.id) && i.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, catalog, usedIds]);

  const totals = useMemo(
    () =>
      computeTotals(
        rows.map((r) => ({ ingredient: r.ingredient, grams: unitToGrams(r.qty, r.ingredient) })),
        {
          servings: numOrNull(servings) ?? 1,
          finishedWeight: numOrNull(finishedWeight),
          multiplier: numOrNull(multiplier),
          sellPrice: numOrNull(sellPrice),
          purchasePrice: numOrNull(purchasePrice),
          wholePrice: numOrNull(wholePrice),
        }
      ),
    [rows, servings, finishedWeight, multiplier, sellPrice, purchasePrice, wholePrice]
  );

  // Ръчна цена → автоматично преизчислява множителя (множител = цена ÷ себест./порция)
  function onSellPriceChange(v: string) {
    setSellPrice(v);
    const price = numOrNull(v);
    const cps = totals.costPerServing;
    if (price != null && cps > 0) setMultiplier(String(round(price / cps, 2)));
  }

  function addIngredient(i: Ingredient) {
    setRows((r) => [...r, { ingredient: i, qty: i.unit === "бр." ? 1 : 100 }]);
    setSearch("");
  }
  function setQty(idx: number, v: string) {
    const n = numOrNull(v) ?? 0;
    setRows((r) => r.map((row, k) => (k === idx ? { ...row, qty: n } : row)));
  }
  function removeRow(idx: number) {
    setRows((r) => r.filter((_, k) => k !== idx));
  }

  function onSave() {
    setErr(null);
    setSaved(false);
    const payload: SavePayload = {
      name: name.trim() || "Без име",
      category,
      servings: numOrNull(servings) ?? 1,
      finished_weight_g: numOrNull(finishedWeight),
      sell_price_eur: numOrNull(sellPrice),
      purchase_price_eur: numOrNull(purchasePrice),
      whole_price_eur: numOrNull(wholePrice),
      price_multiplier: numOrNull(multiplier),
      menu_ready: menuReady,
      is_published: isPublished,
      show_macros: showMacros,
      serving_unit: servingUnit,
      menu_weight_g: numOrNull(menuWeight),
      description: description.trim() || null,
      prep_notes: prepNotes.trim() || null,
      allergen_ids: allergenIds,
      image_urls: images,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      lines: rows.map((r) => ({
        ingredient_id: r.ingredient.id,
        grams: unitToGrams(r.qty, r.ingredient),
      })),
    };
    startTransition(async () => {
      try {
        await saveRecipe(product.id, payload);
        setSaved(true);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка при запис");
      }
    });
  }

  function onCopy() {
    setErr(null);
    startTransition(async () => {
      try {
        // Копира запазената версия и отваря копието за редакция
        await duplicateProduct(product.id);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка при копиране");
      }
    });
  }

  function onArchive() {
    setErr(null);
    startTransition(async () => {
      try {
        await archiveProduct(product.id);
        router.push("/products");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка при архивиране");
      }
    });
  }

  const inputCls = "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm";
  const labelCls = "block text-xs font-medium text-neutral-500 mb-1";

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2">
        <Link href="/products" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Продукти
        </Link>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-600">Запазено ✓</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
          <button
            onClick={onCopy}
            disabled={pending}
            className="h-9 rounded-md border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            title="Създава копие на запазената рецепта с ново име"
          >
            Копирай
          </button>
          <button
            onClick={onSave}
            disabled={pending}
            className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? "Записва…" : "Запази"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ЛЯВО: рецепта */}
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Име</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Категория</label>
                <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {!categories.some((c) => c.key === category) && category && (
                    <option value={category}>{category}</option>
                  )}
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Порции</label>
                <input className={inputCls} value={servings} onChange={(e) => setServings(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>
                  Готово тегло/обем — общо ({servingUnit}) <span className="text-neutral-400">— по избор, за 100 g</span>
                </label>
                <input
                  className={inputCls}
                  placeholder={`по подразб. ${f(totals.totalGrams, 0)} ${servingUnit}`}
                  value={finishedWeight}
                  onChange={(e) => setFinishedWeight(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Единица на порцията</label>
                <select
                  className={inputCls}
                  value={servingUnit}
                  onChange={(e) => setServingUnit(e.target.value)}
                >
                  <option value="g">грам (g)</option>
                  <option value="ml">милилитър (ml)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Грамаж на парче за менюто ({servingUnit}){" "}
                  <span className="text-neutral-400">— ръчно; не влияе на макросите</span>
                </label>
                <input
                  className={inputCls}
                  placeholder={`по подразб. ~${f(totals.servingWeight, 0)} ${servingUnit} (общо ÷ порции)`}
                  value={menuWeight}
                  onChange={(e) => setMenuWeight(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Тагове (със запетая)</label>
                <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Описание <span className="text-neutral-400">(публично — показва се в менюто)</span>
                </label>
                <textarea
                  className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Бележки за приготвяне{" "}
                  <span className="text-neutral-400">(вътрешни — не се показват на сайта)</span>
                </label>
                <textarea
                  className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  rows={4}
                  placeholder="Стъпки на приготвяне: блат, крем, темпериране, изпичане, бележки…"
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Алергени <span className="text-neutral-400">(Регламент 1169/2011 — показват се в менюто)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {allergens.map((a) => {
                    const on = allergenIds.includes(a.id);
                    return (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => toggleAllergen(a.id)}
                        title={a.examples ?? a.name}
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          on
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        {a.id}. {a.name}
                      </button>
                    );
                  })}
                </div>
                {allergenIds.length > 0 && (
                  <p className="mt-1.5 text-xs text-neutral-500">
                    В менюто ще се покаже: Алергени {[...allergenIds].sort((a, b) => a - b).join(", ")}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={menuReady} onChange={(e) => setMenuReady(e.target.checked)} />
                Влиза в менюто
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                Публикувано на сайта
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showMacros} onChange={(e) => setShowMacros(e.target.checked)} />
                Показвай макроси <span className="text-neutral-400">(изкл. за напитки/комбо)</span>
              </label>
            </div>
          </div>

          {/* Снимки */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">
                Снимки <span className="text-neutral-400">· {images.length}</span>
              </h2>
              <label className="cursor-pointer rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700">
                {pending ? "Качва…" : "+ Качи снимки"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onUploadFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {images.length === 0 ? (
              <p className="text-sm text-neutral-400">
                Няма снимки. Качи напр. цяла торта + парче. Първата е „корица" (показва се в менюто).
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {images.map((url, i) => (
                  <div key={`${url}-${i}`} className="w-28">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-28 w-28 rounded-md border border-neutral-200 object-cover"
                      />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white">
                          корица
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(i, -1)}
                          disabled={i === 0}
                          className="px-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                          title="Наляво"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(i, 1)}
                          disabled={i === images.length - 1}
                          className="px-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                          title="Надясно"
                        >
                          ▶
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="text-neutral-400 hover:text-red-600"
                        title="Махни"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-neutral-400">
              Подреди с ◀▶ — първата е корицата. Не забравяй „Запази".
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
              Препоръчителен формат: <b>квадратна 1:1</b>, напр. <b>1200×1200 px</b> (в менюто се
              показва квадратно). JPG / PNG / WebP, до <b>10 MB</b> на файл.
            </p>
          </div>

          {/* Съставки */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Съставки · {rows.length}</h2>
              <span className="text-xs text-neutral-400">общо {f(totals.totalGrams, 0)} {servingUnit}</span>
            </div>

            <div className="space-y-1">
              {rows.map((row, idx) => {
                const grams = unitToGrams(row.qty, row.ingredient);
                const cost =
                  row.ingredient.price_entered && row.ingredient.price_eur_100 != null
                    ? (grams / 100) * row.ingredient.price_eur_100
                    : null;
                const kcal = (grams / 100) * (row.ingredient.kcal_100 ?? 0);
                return (
                  <div key={row.ingredient.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{row.ingredient.name}</span>
                    <input
                      className="h-8 w-20 rounded-md border border-neutral-300 px-2 text-right text-sm"
                      value={String(row.qty)}
                      onChange={(e) => setQty(idx, e.target.value)}
                    />
                    <span className="w-8 text-xs text-neutral-400">{row.ingredient.unit}</span>
                    <span className="w-20 text-right text-xs tabular-nums text-neutral-500">
                      {cost != null ? `€${f(cost)}` : "—"}
                    </span>
                    <span className="w-16 text-right text-xs tabular-nums text-neutral-400">
                      {f(kcal, 0)} kcal
                    </span>
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-neutral-400 hover:text-red-600"
                      aria-label="Премахни"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <p className="py-4 text-center text-sm text-neutral-400">Няма съставки още.</p>
              )}
            </div>

            {/* Добавяне */}
            <div className="relative mt-3">
              <input
                className={inputCls}
                placeholder="Търси съставка за добавяне…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {matches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
                  {matches.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => addIngredient(i)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                    >
                      <span className="truncate">{i.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-neutral-400">
                        {i.unit === "бр." ? "на бройка" : "g"}
                        {!i.price_entered && " · без цена"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ДЯСНО: жива сметка */}
        <div className="space-y-4 lg:sticky lg:top-16 lg:self-start">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-medium">Цена & маржин</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Множител</label>
                <input className={inputCls} placeholder="напр. 3.3" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Ръчна цена/порция €</label>
                <input className={inputCls} placeholder="по избор" value={sellPrice} onChange={(e) => onSellPriceChange(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>
                  Доставна цена/порция € <span className="text-neutral-400">(за прекупвани, без рецепта)</span>
                </label>
                <input
                  className={inputCls}
                  placeholder="напр. 1.20"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>
                  Цена за цяла торта/продукт € <span className="text-neutral-400">(по избор; иначе = порции × цена/порция)</span>
                </label>
                <input
                  className={inputCls}
                  placeholder={totals.whole != null ? `по подразб. €${f(totals.whole)}` : "по избор"}
                  value={wholePrice}
                  onChange={(e) => setWholePrice(e.target.value)}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Въведеш ли ръчна цена, множителят се изчислява автоматично (цена ÷ себест./порция) — така можеш да дадеш еднаква цена на различни торти. „Доставна цена" се ползва за продукти <b>без рецепта</b> (напитки, прекупвани шоколади) — става себестойност.
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row2 label="Себестойност (общо)" value={`€${f(totals.totalCost)}`} muted={!totals.costComplete} />
              <Row2 label="Себест. / порция" value={`€${f(totals.costPerServing)}`} muted={!totals.costComplete} />
              <Row2 label="Подсказана цена" value={totals.suggested != null ? `€${f(totals.suggested)}` : "—"} />
              <Row2 label="Крайна цена / порция" value={totals.effective != null ? `€${f(totals.effective)}` : "—"} strong />
              {(numOrNull(servings) ?? 1) > 1 && (
                <Row2
                  label={`Цяла торта (${numOrNull(servings) ?? 1} порции)`}
                  value={totals.whole != null ? `€${f(totals.whole)}` : "—"}
                  strong
                />
              )}
              <Row2
                label="Маржин / порция"
                value={
                  totals.margin != null
                    ? `€${f(totals.margin)}${totals.marginPct != null ? ` · ${f(totals.marginPct, 0)}%` : ""}`
                    : "—"
                }
                strong
              />
            </dl>
            {!totals.costComplete && (
              <p className="mt-2 text-xs text-amber-600">Непълна себестойност — има съставка без цена.</p>
            )}
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-medium">Макроси</h2>
            <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">на 100 g</p>
            <MacroRow t={totals.per100} />
            <p className="mb-1 mt-3 text-xs uppercase tracking-wide text-neutral-400">
              за порция
              {(numOrNull(menuWeight) ?? totals.servingWeight) > 0 && (
                <span className="ml-1 normal-case tracking-normal text-neutral-500">
                  · ~{numOrNull(menuWeight) ?? totals.servingWeight} {servingUnit}
                </span>
              )}
            </p>
            <MacroRow t={totals.perServing} />
            {totals.gi != null ? (
              <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Гликемичен индекс <b>~{totals.gi}</b> · гликемичен товар <b>~{totals.gl}</b> на порция
                <span className="ml-1 text-emerald-600/70">(референтни)</span>
              </p>
            ) : (
              <p className="mt-3 text-xs text-neutral-400">
                ГИ/ГТ ще се покажат, щом въведеш гликемичен индекс на въглехидратните съставки.
              </p>
            )}
          </div>

          <button
            onClick={onArchive}
            disabled={pending}
            className="text-xs text-neutral-400 hover:text-amber-600 disabled:opacity-50"
          >
            Архивирай продукта
          </button>
        </div>
      </div>
    </div>
  );
}

function Row2({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold" : ""} ${muted ? "text-neutral-400" : ""}`}>{value}</dd>
    </div>
  );
}

function MacroRow({ t }: { t: { p: number; c: number; f: number; k: number } }) {
  const cell = (label: string, v: string) => (
    <div className="rounded-md bg-neutral-50 px-2 py-1.5 text-center">
      <div className="text-sm font-medium tabular-nums">{v}</div>
      <div className="text-[11px] text-neutral-400">{label}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {cell("протеин", `${round(t.p, 1)}`)}
      {cell("въгл.", `${round(t.c, 1)}`)}
      {cell("мазн.", `${round(t.f, 1)}`)}
      {cell("kcal", `${round(t.k, 0)}`)}
    </div>
  );
}
