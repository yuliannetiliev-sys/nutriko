"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Article } from "@/lib/types";
import {
  createArticle,
  updateArticle,
  deleteArticle,
  reorderArticles,
  uploadArticleImage,
} from "@/app/actions";
import { compressImage } from "@/lib/compressImage";

const BG2LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
};
function slugify(s: string): string {
  return s
    .toLowerCase()
    .split("")
    .map((c) => BG2LAT[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Секциите в /polezno (стойност = articles.category). Подредбата на секциите е в lib/polezno.ts.
const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "zapochni-ottuk", label: "Започни оттук" },
  { value: "protein-makrosi", label: "Протеин и макроси" },
  { value: "zahar-podsladiteli", label: "Захар и подсладители" },
  { value: "glikemichen-sastavki", label: "Гликемичен отговор и съставки" },
  { value: "bezopasnost-alergeni", label: "Безопасност и алергени" },
];

export default function ArticlesManager({ initial }: { initial: Article[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<"new" | Article | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr(null);
    startTransition(async () => {
      try {
        const res = await fn();
        if (!res.ok) {
          setErr(res.error ?? "Грешка");
          return;
        }
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка");
      }
    });
  }

  // Размества статия нагоре/надолу и запазва новия ред (sort_order = позицията).
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= initial.length || pending) return;
    const ids = initial.map((a) => a.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorderArticles(ids));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Полезно · статии <span className="text-neutral-400">· {initial.length}</span>
        </h1>
        <button
          onClick={() => {
            setForm("new");
            setErr(null);
          }}
          className="h-9 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Нова статия
        </button>
      </div>

      {err && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {form !== null && (
        <ArticleForm
          key={form === "new" ? "new" : form.id}
          initial={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            router.refresh();
          }}
          onError={setErr}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-px whitespace-nowrap px-3 py-2">Ред</th>
              <th className="px-3 py-2">Заглавие</th>
              <th className="px-3 py-2">Адрес</th>
              <th className="px-3 py-2 text-center">Статус</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {initial.map((a, i) => (
              <tr key={a.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center tabular-nums text-neutral-400">{i + 1}</span>
                    <div className="flex flex-col leading-none">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={pending || i === 0}
                        className="px-1 text-[10px] leading-none text-neutral-400 hover:text-neutral-900 disabled:opacity-20"
                        title="Премести нагоре"
                        aria-label="Премести нагоре"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={pending || i === initial.length - 1}
                        className="px-1 text-[10px] leading-none text-neutral-400 hover:text-neutral-900 disabled:opacity-20"
                        title="Премести надолу"
                        aria-label="Премести надолу"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">{a.title}</td>
                <td className="px-3 py-2 text-neutral-400">/polezno/{a.slug}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => run(() => updateArticle(a.id, { published: !a.published, slug: a.slug }))}
                    disabled={pending}
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      a.published ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {a.published ? "Публикувана" : "Чернова"}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {a.published && (
                    <Link
                      href={`/polezno/${a.slug}`}
                      target="_blank"
                      className="mr-3 text-neutral-400 hover:text-neutral-900"
                      title="Виж на сайта"
                    >
                      ↗
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setForm(a);
                      setErr(null);
                      window.scrollTo({ top: 0 });
                    }}
                    className="mr-3 text-neutral-400 hover:text-neutral-900"
                    title="Редактирай"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Изтриване на „${a.title}"?`)) run(() => deleteArticle(a.id));
                    }}
                    disabled={pending}
                    className="text-neutral-400 hover:text-red-600 disabled:opacity-50"
                    title="Изтрий"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {initial.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                  Още няма статии. Натисни „Нова статия".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArticleForm({
  initial,
  onClose,
  onSaved,
  onError,
}: {
  initial: Article | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState({
    title: initial?.title ?? "",
    seo_title: initial?.seo_title ?? "",
    slug: initial?.slug ?? "",
    meta_description: initial?.meta_description ?? "",
    excerpt: initial?.excerpt ?? "",
    category: initial?.category ?? "",
    cover_image_url: initial?.cover_image_url ?? "",
    body: initial?.body ?? "",
    published: initial?.published ?? false,
    sort_order: initial?.sort_order != null ? String(initial.sort_order) : "0",
  });
  const [uploading, setUploading] = useState(false);
  const cls = "h-9 w-full rounded-md border border-neutral-300 px-2 text-sm";

  function submit() {
    if (!v.title.trim()) {
      onError("Въведи заглавие.");
      return;
    }
    const slug = v.slug.trim() || slugify(v.title);
    if (!slug) {
      onError("Въведи адрес (slug) на латиница.");
      return;
    }
    const fields = {
      title: v.title.trim(),
      seo_title: v.seo_title.trim() || null,
      slug,
      meta_description: v.meta_description.trim() || null,
      excerpt: v.excerpt.trim() || null,
      category: v.category || null,
      cover_image_url: v.cover_image_url || null,
      body: v.body,
      published: v.published,
      sort_order: Number(v.sort_order) || 0,
    };
    startTransition(async () => {
      try {
        const res = initial ? await updateArticle(initial.id, fields) : await createArticle(fields);
        if (!res.ok) {
          onError(res.error ?? "Грешка при запис");
          return;
        }
        onSaved();
      } catch (e) {
        onError(e instanceof Error ? e.message : "Грешка при запис");
      }
    });
  }

  return (
    <div className="mb-4 rounded-lg border border-neutral-300 bg-white p-4">
      <p className="mb-3 text-sm font-medium">{initial ? `Редакция · ${initial.title}` : "Нова статия"}</p>
      <div className="grid gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-neutral-500">
            Заглавие <span className="text-neutral-400">· голямото заглавие на страницата (H1)</span>
          </span>
          <input
            className={cls}
            placeholder="напр. Как да четеш менюто на Нутрико"
            value={v.title}
            onChange={(e) => setV({ ...v, title: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-neutral-500">
            SEO заглавие{" "}
            <span className="text-neutral-400">
              · таб на браузъра + Google · ако е празно, ползва Заглавие · ~60 знака
            </span>
          </span>
          <input
            className={cls}
            placeholder="ако се различава от заглавието (иначе остави празно)"
            value={v.seo_title}
            onChange={(e) => setV({ ...v, seo_title: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-neutral-500">
            Slug (адрес) · латиница ·{" "}
            <button
              type="button"
              onClick={() => setV((s) => ({ ...s, slug: slugify(s.title) }))}
              className="text-emerald-600 underline"
            >
              предложи от заглавието
            </button>
          </span>
          <input
            className={cls}
            placeholder="напр. kak-da-chetesh-menuto"
            value={v.slug}
            onChange={(e) => setV({ ...v, slug: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-neutral-500">
            Meta описание{" "}
            <span className="text-neutral-400">
              · за Google и при споделяне · ако е празно, ползва краткия текст ·
            </span>{" "}
            <span className={v.meta_description.length > 160 ? "text-red-500" : "text-neutral-400"}>
              {v.meta_description.length}/160
            </span>
          </span>
          <textarea
            className="min-h-[58px] w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm leading-relaxed"
            placeholder="едно изречение, което Google показва в резултатите"
            value={v.meta_description}
            onChange={(e) => setV({ ...v, meta_description: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-neutral-500">
            Кратък текст за картата{" "}
            <span className="text-neutral-400">
              · показва се на картата в списъка и под заглавието в статията
            </span>
          </span>
          <input
            className={cls}
            placeholder="кратко подканващо изречение"
            value={v.excerpt}
            onChange={(e) => setV({ ...v, excerpt: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-neutral-500">
            Секция в „Полезно"{" "}
            <span className="text-neutral-400">· в коя група се показва статията на страницата</span>
          </span>
          <select
            className={cls}
            value={v.category}
            onChange={(e) => setV({ ...v, category: e.target.value })}
          >
            <option value="">— без секция (показва се най-долу) —</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-neutral-500">
            Корична снимка{" "}
            <span className="text-neutral-400">· показва се на картата в списъка (хоризонтална)</span>
          </span>
          <div className="flex items-center gap-3">
            {v.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.cover_image_url}
                alt=""
                className="h-16 w-24 shrink-0 rounded-md border border-neutral-200 object-cover"
              />
            ) : (
              <div className="grid h-16 w-24 shrink-0 place-items-center rounded-md border border-dashed border-neutral-300 text-[10px] text-neutral-400">
                няма
              </div>
            )}
            <div className="flex flex-col gap-1">
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                className="text-xs"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  onError("");
                  const fd = new FormData();
                  fd.append("file", await compressImage(file));
                  fd.append("slug", v.slug || slugify(v.title));
                  const res = await uploadArticleImage(fd);
                  setUploading(false);
                  if (res.error) onError(res.error);
                  else if (res.url) setV((s) => ({ ...s, cover_image_url: res.url! }));
                }}
              />
              {uploading && <span className="text-xs text-neutral-400">Качване…</span>}
              {v.cover_image_url && !uploading && (
                <button
                  type="button"
                  onClick={() => setV((s) => ({ ...s, cover_image_url: "" }))}
                  className="text-left text-xs text-red-500 hover:underline"
                >
                  Премахни снимката
                </button>
              )}
            </div>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-neutral-500">
            Текст · поддържа markdown: <code>## Заглавие</code>, <code>**удебелено**</code>,{" "}
            <code>- списък</code>, <code>[текст](линк)</code>
          </span>
          <textarea
            className="min-h-[280px] w-full rounded-md border border-neutral-300 px-2 py-2 font-mono text-sm leading-relaxed"
            placeholder="## Какво е…&#10;&#10;Текст на абзац…"
            value={v.body}
            onChange={(e) => setV({ ...v, body: e.target.value })}
          />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={v.published}
              onChange={(e) => setV({ ...v, published: e.target.checked })}
            />
            Публикувана (видима на сайта)
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            Ред
            <input
              className="h-8 w-16 rounded-md border border-neutral-300 px-2 text-sm"
              value={v.sort_order}
              onChange={(e) => setV({ ...v, sort_order: e.target.value })}
            />
          </label>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="h-9 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Записва…" : initial ? "Запази промените" : "Създай"}
        </button>
        <button onClick={onClose} className="h-9 rounded-md border border-neutral-300 px-3 text-sm">
          Отказ
        </button>
      </div>
    </div>
  );
}
