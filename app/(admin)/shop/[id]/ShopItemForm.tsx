"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShopItem, type ShopItemPayload } from "@/app/shop-actions";
import { uploadProductImage } from "@/app/actions";
import { compressImage } from "@/lib/compressImage";
import type { ShopItem } from "@/lib/shop";

const s = (v: number | null | undefined) => (v == null ? "" : String(v));

export default function ShopItemForm({ item }: { item: ShopItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [v, setV] = useState<ShopItemPayload>({
    title: item.title,
    subtitle: item.subtitle ?? "",
    pack_label: item.pack_label,
    units_per_pack: s(item.units_per_pack),
    net_weight_g: s(item.net_weight_g),
    price_eur: s(item.price_eur),
    description: item.description ?? "",
    ingredients_text: item.ingredients_text ?? "",
    allergens_text: item.allergens_text ?? "",
    storage_text: item.storage_text ?? "",
    warning_text: item.warning_text ?? "",
    shelf_life_days: s(item.shelf_life_days),
    energy_kj: s(item.nutrition.energy_kj),
    energy_kcal: s(item.nutrition.energy_kcal),
    fat_g: s(item.nutrition.fat_g),
    saturates_g: s(item.nutrition.saturates_g),
    carbs_g: s(item.nutrition.carbs_g),
    sugars_g: s(item.nutrition.sugars_g),
    protein_g: s(item.nutrition.protein_g),
    salt_g: s(item.nutrition.salt_g),
    images: item.images,
    reviews: item.reviews,
    ship_weight_g: s(item.ship_weight_g),
    stock_qty: s(item.stock_qty),
    max_per_order: s(item.max_per_order),
    is_active: item.is_active,
  });

  function set<K extends keyof ShopItemPayload>(k: K, val: ShopItemPayload[K]) {
    setV((x) => ({ ...x, [k]: val }));
    setSaved(false);
  }

  function upload(files: FileList | null) {
    if (!files?.length) return;
    start(async () => {
      setErr(null);
      const added: string[] = [];
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", await compressImage(f));
        fd.set("productId", `shop${item.id}`);
        const r = await uploadProductImage(fd);
        if (r.error) {
          setErr(r.error);
          break;
        }
        if (r.url) added.push(r.url);
      }
      if (added.length) set("images", [...v.images, ...added]);
    });
  }

  function save() {
    start(async () => {
      setErr(null);
      const r = await saveShopItem(item.id, v);
      if (!r.ok) setErr(r.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  const input = "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm";
  const area = "w-full rounded-md border border-neutral-300 px-2 py-1 text-sm";
  const label = "mb-1 block text-xs font-medium text-neutral-500";
  const card = "rounded-lg border border-neutral-200 bg-white p-5";
  const head = "mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400";
  const field = (k: keyof ShopItemPayload, title: string, hint?: string) => (
    <div>
      <label className={label}>{title}</label>
      <input
        className={input}
        inputMode="decimal"
        value={v[k] as string}
        placeholder={hint}
        onChange={(e) => set(k, e.target.value as never)}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className={card}>
        <p className={head}>Продажба</p>
        <label className="mb-4 flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={v.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          <span>
            <span className="font-medium">Активен</span>
            <span className="block text-xs text-neutral-500">Скрит артикул не се показва и не може да се купи. Без цена не може да е активен.</span>
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-4">
          {field("price_eur", "Цена (€)", "напр. 20")}
          {field("max_per_order", "Най-много в поръчка")}
          {field("stock_qty", "Наличност", "без ограничение")}
          {field("shelf_life_days", "Срок на годност (дни)", "за етикета")}
        </div>
      </div>

      <div className={card}>
        <p className={head}>Какво е</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Име</label>
            <input className={input} value={v.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>До името (претенции, „с подсладител“)</label>
            <input className={input} value={v.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </div>
          <div>
            <label className={label}>Опаковка</label>
            <input className={input} value={v.pack_label} onChange={(e) => set("pack_label", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {field("units_per_pack", "Броя")}
            {field("net_weight_g", "Нето (г)")}
            {field("ship_weight_g", "С опаковката (г)")}
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Описание (на страницата)</label>
            <textarea className={area} rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>
      </div>

      <div className={card}>
        <p className={head}>Етикет — Регламент 1169/2011</p>
        <div className="space-y-3">
          <div>
            <label className={label}>Съставки — алергените между **двойни звездички**</label>
            <textarea className={area} rows={4} value={v.ingredients_text} onChange={(e) => set("ingredients_text", e.target.value)} />
          </div>
          <div>
            <label className={label}>Следи от алергени</label>
            <input className={input} value={v.allergens_text} onChange={(e) => set("allergens_text", e.target.value)} />
          </div>
          <div>
            <label className={label}>Съхранение</label>
            <input className={input} value={v.storage_text} onChange={(e) => set("storage_text", e.target.value)} />
          </div>
          <div>
            <label className={label}>Задължителни бележки (естествени захари, слабително действие…)</label>
            <input className={input} value={v.warning_text} onChange={(e) => set("warning_text", e.target.value)} />
          </div>
        </div>
      </div>

      <div className={card}>
        <p className={head}>Хранителна декларация на 100 г</p>
        <div className="grid gap-3 sm:grid-cols-4">
          {field("energy_kj", "Енергия (kJ)")}
          {field("energy_kcal", "Енергия (kcal)")}
          {field("fat_g", "Мазнини")}
          {field("saturates_g", "от тях наситени")}
          {field("carbs_g", "Въглехидрати")}
          {field("sugars_g", "от тях захари")}
          {field("protein_g", "Белтъци")}
          {field("salt_g", "Сол")}
        </div>
        {item.nutrition_note && (
          <p className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-[11px] leading-relaxed text-neutral-500">
            {item.nutrition_note}
          </p>
        )}
      </div>

      <div className={card}>
        <p className={head}>Снимки — първата е главна</p>
        <div className="flex flex-wrap gap-2">
          {v.images.map((url, i) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-28 rounded-md border border-neutral-200 object-cover" />
              <div className="mt-1 flex justify-between text-[11px]">
                {i > 0 ? (
                  <button
                    onClick={() => set("images", [url, ...v.images.filter((u) => u !== url)])}
                    className="text-neutral-500 hover:text-neutral-900"
                  >
                    главна
                  </button>
                ) : (
                  <span className="text-emerald-700">главна</span>
                )}
                <button onClick={() => set("images", v.images.filter((u) => u !== url))} className="text-neutral-400 hover:text-red-600">
                  махни
                </button>
              </div>
            </div>
          ))}
          <label className="flex h-20 w-28 cursor-pointer items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-500 hover:bg-neutral-50">
            {pending ? "Качва…" : "+ снимки"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-neutral-400">Само истински снимки на кутията и вафлите — клиентът получава това, което вижда.</p>
      </div>

      <div className={card}>
        <p className={head}>Отзиви — само истински и с разрешение на човека</p>
        <div className="space-y-2">
          {v.reviews.map((r, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={input}
                placeholder="Текст"
                value={r.text}
                onChange={(e) => set("reviews", v.reviews.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))}
              />
              <input
                className={`${input} max-w-40`}
                placeholder="Мария К."
                value={r.author}
                onChange={(e) => set("reviews", v.reviews.map((x, k) => (k === i ? { ...x, author: e.target.value } : x)))}
              />
              <button onClick={() => set("reviews", v.reviews.filter((_, k) => k !== i))} className="px-2 text-neutral-400 hover:text-red-600">
                ×
              </button>
            </div>
          ))}
          <button onClick={() => set("reviews", [...v.reviews, { text: "", author: "" }])} className="text-sm text-neutral-500 hover:text-neutral-900">
            + отзив
          </button>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-neutral-200 bg-white/95 py-3 backdrop-blur">
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
