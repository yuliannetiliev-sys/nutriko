"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SiteSettings } from "@/lib/types";
import { saveSiteSettings, uploadProductImage } from "@/app/actions";
import { compressImage } from "@/lib/compressImage";

export default function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [v, setV] = useState({
    brand_name: settings.brand_name ?? "",
    hero_title: settings.hero_title ?? "",
    hero_subtitle: settings.hero_subtitle ?? "",
    hero_image_url: settings.hero_image_url ?? "",
    address: settings.address ?? "",
    hours: settings.hours ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    maps_url: settings.maps_url ?? "",
    instagram_url: settings.instagram_url ?? "",
    facebook_url: settings.facebook_url ?? "",
    contact_to_email: settings.contact_to_email ?? "",
  });

  function set(k: keyof typeof v, val: string) {
    setV((s) => ({ ...s, [k]: val }));
    setSaved(false);
  }

  function onBanner(files: FileList | null) {
    if (!files || !files.length) return;
    setErr(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("file", await compressImage(files[0]));
        fd.set("productId", "hero");
        const res = await uploadProductImage(fd);
        if (res.error) {
          setErr(res.error);
          return;
        }
        if (res.url) {
          setV((s) => ({ ...s, hero_image_url: res.url! }));
          setSaved(false);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка при качване");
      }
    });
  }

  function save() {
    setErr(null);
    startTransition(async () => {
      try {
        await saveSiteSettings(
          Object.fromEntries(
            Object.entries(v).map(([k, val]) => [k, val.trim() === "" ? null : val.trim()])
          )
        );
        setSaved(true);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка при запис");
      }
    });
  }

  const input = "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm";
  const label = "block text-xs font-medium text-neutral-500 mb-1";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
        Бранд и начална страница
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Име на бранда</label>
          <input className={input} value={v.brand_name} onChange={(e) => set("brand_name", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Hero заглавие</label>
          <input className={input} value={v.hero_title} onChange={(e) => set("hero_title", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Hero подзаглавие</label>
          <textarea
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            rows={2}
            value={v.hero_subtitle}
            onChange={(e) => set("hero_subtitle", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Банер на началната страница</label>
          <div className="flex items-center gap-3">
            {v.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.hero_image_url}
                alt=""
                className="h-16 w-28 rounded-md border border-neutral-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-28 items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-400">
                няма
              </div>
            )}
            <label className="cursor-pointer rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700">
              {pending ? "Качва…" : "Качи банер"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onBanner(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {v.hero_image_url && (
              <button
                type="button"
                onClick={() => {
                  setV((s) => ({ ...s, hero_image_url: "" }));
                  setSaved(false);
                }}
                className="text-sm text-neutral-400 hover:text-red-600"
              >
                Махни
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Показва се най-горе на началната страница. Не забравяй „Запази".
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
            Препоръчителен формат: <b>широка/хоризонтална 16:9</b>, напр. <b>1920×1080 px</b> (или
            по-голяма, 2560×1440). JPG / PNG / WebP, до <b>10 MB</b>.
          </p>
        </div>
      </div>

      <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-neutral-400">
        Контакти и локация
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Адрес</label>
          <textarea
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            rows={2}
            placeholder="ул. ..., гр. ..."
            value={v.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Работно време</label>
          <textarea
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            rows={2}
            placeholder="Пон–Пет 08:00–19:00&#10;Съб–Нед 09:00–18:00"
            value={v.hours}
            onChange={(e) => set("hours", e.target.value)}
          />
        </div>
        <div>
          <label className={label}>Телефон</label>
          <input className={input} value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label className={label}>Имейл (показван на сайта)</label>
          <input className={input} value={v.email} onChange={(e) => set("email", e.target.value)} />
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
            Публичен — показва се във футъра на сайта. Остави празно или сложи служебен адрес (напр.
            info@nutriko.fit). Не слагай личния си имейл — виждат го всички и ботове.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Имейл за известия (скрит — само за теб)</label>
          <input
            className={input}
            type="email"
            placeholder="напр. yulian.net.iliev@gmail.com"
            value={v.contact_to_email}
            onChange={(e) => set("contact_to_email", e.target.value)}
          />
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
            Тук идват запитванията от формата „Свържете се с нас“. <b>Не се показва на сайта.</b> Ако
            е празно, известията отиват на резервния адрес, зададен в кода.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Линк към карта (Google Maps)</label>
          <input className={input} value={v.maps_url} onChange={(e) => set("maps_url", e.target.value)} />
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
            Постави линк към локацията ви в Google Maps. Бутонът <b>„Маршрут до нас"</b> на сайта се
            генерира автоматично — на телефон отваря Google Maps (Android) или картата на iPhone
            директно с готов маршрут до сладкарницата.
            <br />
            За най-точен маршрут: отвори локацията в Google Maps на компютър и копирай линка от
            адресната лента (той съдържа координатите <code>@42.69…,23.32…</code>). Ако оставиш това
            празно, маршрутът се прави по текста на адреса по-горе.
          </p>
        </div>
        <div>
          <label className={label}>Instagram URL</label>
          <input className={input} value={v.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} />
        </div>
        <div>
          <label className={label}>Facebook URL</label>
          <input className={input} value={v.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
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
