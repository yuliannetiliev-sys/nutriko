"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveContent, uploadContentImage } from "@/app/actions";
import { compressImage } from "@/lib/compressImage";
import type { ContentMap } from "@/lib/content";

type Field = { key: string; label: string; area?: boolean; hint?: string; image?: boolean };
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Лента под hero (без добавена захар)",
    fields: [{ key: "sugar_note", label: "Текст", area: true }],
  },
  {
    title: "Кога да минеш",
    fields: [
      { key: "occasions_heading", label: "Заглавие" },
      { key: "occasions_intro", label: "Въвеждащ ред" },
      { key: "occasions", label: "Поводи", area: true, hint: "по 1 на ред" },
      { key: "occasions_cta", label: "Бутон" },
    ],
  },
  {
    title: "За кого е",
    fields: [
      { key: "audience_heading", label: "Заглавие" },
      { key: "audience", label: "Точки", area: true, hint: "по 1 на ред" },
      { key: "audience_footer", label: "Заключителен ред" },
    ],
  },
  {
    title: "Какво ни прави различни",
    fields: [
      { key: "different_heading", label: "Заглавие" },
      { key: "differentiators", label: "Точки", area: true, hint: "по 1 на ред, формат: Заглавие | Описание" },
    ],
  },
  {
    title: "Цели торти за повод",
    fields: [
      { key: "cakes_heading", label: "Заглавие" },
      { key: "cakes_body", label: "Текст", area: true },
      { key: "cakes_note", label: "Бележка отдолу" },
    ],
  },
  {
    title: "Скоро отваряме",
    fields: [
      { key: "prelaunch_heading", label: "Заглавие" },
      { key: "prelaunch_body", label: "Текст", area: true },
    ],
  },
  {
    title: "Преди да дойдеш",
    fields: [
      { key: "before_heading", label: "Заглавие" },
      { key: "before", label: "Точки", area: true, hint: "по 1 на ред" },
    ],
  },
  {
    title: "Често задавани въпроси (FAQ)",
    fields: [{ key: "faq", label: "Въпроси", area: true, hint: "по 1 на ред, формат: Въпрос | Отговор" }],
  },
  {
    title: "Полезно — hero (горе на страницата)",
    fields: [
      { key: "polezno_hero_title", label: "Заглавие" },
      { key: "polezno_hero_subtitle", label: "Подзаглавие", area: true },
      { key: "polezno_hero_image", label: "Банер снимка", image: true, hint: "качи файл или постави URL" },
    ],
  },
  {
    title: "Полезно — секция 1: Започни оттук",
    fields: [
      { key: "polezno_sec1_title", label: "Заглавие" },
      { key: "polezno_sec1_intro", label: "Въведение", area: true },
    ],
  },
  {
    title: "Полезно — секция 2: Протеин и макроси",
    fields: [
      { key: "polezno_sec2_title", label: "Заглавие" },
      { key: "polezno_sec2_intro", label: "Въведение", area: true },
    ],
  },
  {
    title: "Полезно — секция 3: Захар и подсладители",
    fields: [
      { key: "polezno_sec3_title", label: "Заглавие" },
      { key: "polezno_sec3_intro", label: "Въведение", area: true },
    ],
  },
  {
    title: "Полезно — секция 4: Гликемичен отговор и съставки",
    fields: [
      { key: "polezno_sec4_title", label: "Заглавие" },
      { key: "polezno_sec4_intro", label: "Въведение", area: true },
    ],
  },
  {
    title: "Полезно — секция 5: Безопасност и алергени",
    fields: [
      { key: "polezno_sec5_title", label: "Заглавие" },
      { key: "polezno_sec5_intro", label: "Въведение", area: true },
    ],
  },
  {
    title: "Начало — промо блок към Полезно",
    fields: [
      { key: "polezno_promo_heading", label: "Заглавие" },
      { key: "polezno_promo_body", label: "Текст", area: true },
    ],
  },
];

export default function ContentForm({ content }: { content: ContentMap }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of GROUPS) for (const f of g.fields) init[f.key] = content[f.key] ?? "";
    return init;
  });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  function set(k: string, val: string) {
    setV((s) => ({ ...s, [k]: val }));
    setSaved(false);
  }

  function save() {
    setErr(null);
    startTransition(async () => {
      try {
        const res = await saveContent(v);
        if (!res.ok) {
          setErr(res.error ?? "Грешка при запис");
          return;
        }
        setSaved(true);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка при запис");
      }
    });
  }

  const input = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

  function SaveBtn() {
    return (
      <button
        onClick={save}
        disabled={pending}
        className="h-9 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Записва…" : "Запази"}
      </button>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-b border-neutral-200 bg-neutral-50/95 px-4 py-3 backdrop-blur">
        <h1 className="text-xl font-semibold">Текстове на сайта</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-600">Запазено ✓</span>}
          <SaveBtn />
        </div>
      </div>

      {err && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <p className="mb-4 text-sm text-neutral-500">
        Празно поле → ползва се текстът по подразбиране. „Запази" обновява сайта.
      </p>

      <div className="space-y-5">
        {GROUPS.map((g) => (
          <div key={g.title} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">{g.title}</p>
            <div className="space-y-3">
              {g.fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="mb-1 block text-[11px] font-medium text-neutral-500">
                    {f.label}
                    {f.hint && <span className="ml-1 font-normal text-neutral-400">· {f.hint}</span>}
                  </span>
                  {f.image ? (
                    <div className="flex items-start gap-3">
                      {v[f.key] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v[f.key]}
                          alt=""
                          className="h-16 w-28 shrink-0 rounded-md border border-neutral-200 object-cover"
                        />
                      ) : (
                        <div className="grid h-16 w-28 shrink-0 place-items-center rounded-md border border-dashed border-neutral-300 text-[10px] text-neutral-400">
                          няма
                        </div>
                      )}
                      <div className="flex-1 space-y-1.5">
                        <input
                          className={input}
                          value={v[f.key]}
                          onChange={(e) => set(f.key, e.target.value)}
                          placeholder="URL или качи файл отдолу"
                        />
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingKey === f.key}
                            className="text-xs"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingKey(f.key);
                              setErr(null);
                              const fd = new FormData();
                              fd.append("file", await compressImage(file));
                              const res = await uploadContentImage(fd);
                              setUploadingKey(null);
                              if (res.error) setErr(res.error);
                              else if (res.url) set(f.key, res.url);
                            }}
                          />
                          {uploadingKey === f.key && (
                            <span className="text-xs text-neutral-400">Качване…</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : f.area ? (
                    <textarea
                      className={`${input} min-h-[90px] leading-relaxed`}
                      value={v[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  ) : (
                    <input className={input} value={v[f.key]} onChange={(e) => set(f.key, e.target.value)} />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <SaveBtn />
        {saved && <span className="text-sm text-emerald-600">Запазено ✓</span>}
      </div>
    </div>
  );
}
