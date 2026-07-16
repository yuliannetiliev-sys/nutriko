"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MenuItem } from "@/lib/data";
import { dualPrice, bgn } from "@/lib/price";

type Group = { key: string; label: string; description?: string | null; items: MenuItem[] };

export default function MenuView({ groups }: { groups: Group[] }) {
  const [active, setActive] = useState(groups[0]?.key ?? "");
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g, i) => [g.key, i === 0]))
  );
  const [lb, setLb] = useState<{ images: string[]; i: number } | null>(null);
  const openLb = (images: string[], i = 0) => setLb({ images, i });
  const step = (d: number) =>
    setLb((s) => (s ? { ...s, i: (s.i + d + s.images.length) % s.images.length } : s));
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (!lb) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLb(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lb]);

  const activeGroup = groups.find((g) => g.key === active) ?? groups[0];

  return (
    <div className="mt-12">
      {/* ===== ДЕСКТОП: страничен филтър — показва само избраната категория ===== */}
      <div className="hidden lg:grid lg:grid-cols-[210px_1fr] lg:gap-12">
        <aside>
          <nav className="sticky top-24 space-y-1.5">
            {groups.map((g) => {
              const on = g.key === activeGroup?.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActive(g.key)}
                  aria-current={on}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                    on
                      ? "bg-brand text-cream shadow-sm"
                      : "border border-ink/10 bg-white text-ink/80 hover:border-brand/40 hover:bg-brand-50"
                  }`}
                >
                  <span className="truncate">{g.label}</span>
                  <span className={`shrink-0 text-xs ${on ? "text-cream/70" : "text-muted/60"}`}>
                    {g.items.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div>
          {activeGroup && (
            <section key={activeGroup.key} className="animate-[fadeIn_0.25s_ease]">
              <h2 className="font-display text-3xl font-semibold text-brand">{activeGroup.label}</h2>
              <div className="mt-1 h-px w-12 bg-gold" />
              {activeGroup.description && (
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
                  {activeGroup.description}
                </p>
              )}
              <div className="mt-7 space-y-8">
                {activeGroup.items.map((m) => (
                  <Item key={m.slug} m={m} onOpen={openLb} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ===== МОБИЛЕН: хармоника с ясни бутони-карти ===== */}
      <div className="space-y-3 lg:hidden">
        {groups.map((g) => {
          const isOpen = open[g.key] ?? false;
          return (
            <section key={g.key} className="overflow-hidden rounded-2xl border border-ink/10 bg-white/70">
              <button
                type="button"
                onClick={() => setOpen((s) => ({ ...s, [g.key]: !s[g.key] }))}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-xl font-semibold text-brand">{g.label}</span>
                  <span className="text-xs text-muted">· {g.items.length}</span>
                </span>
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-lg leading-none text-cream transition-transform duration-200 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                  aria-hidden
                >
                  +
                </span>
              </button>
              <div className={`${isOpen ? "block" : "hidden"} space-y-6 px-4 pb-5`}>
                {g.description && (
                  <p className="-mt-1 text-sm leading-relaxed text-muted">{g.description}</p>
                )}
                {g.items.map((m) => (
                  <Item key={m.slug} m={m} onOpen={openLb} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {lb && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4"
          onClick={() => setLb(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLb(null);
            }}
            className="absolute right-3 top-3 z-20 grid h-12 w-12 place-items-center rounded-full bg-ink/50 text-2xl text-cream hover:bg-ink/70"
            aria-label="Затвори"
          >
            ✕
          </button>
          {lb.images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="absolute left-3 z-20 grid h-12 w-12 place-items-center rounded-full bg-cream/15 text-3xl text-cream hover:bg-cream/25"
              aria-label="Предишна"
            >
              ‹
            </button>
          )}
          <div
            className="relative h-[85vh] w-[92vw]"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (lb.images.length > 1 && Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
            }}
          >
            {lb.images.map((src, i) => (
              <Image
                key={src}
                src={src}
                alt=""
                fill
                sizes="92vw"
                priority={i === lb.i}
                className={`rounded-lg object-contain transition-opacity duration-200 ${
                  i === lb.i ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
          {lb.images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-3 z-20 grid h-12 w-12 place-items-center rounded-full bg-cream/15 text-3xl text-cream hover:bg-cream/25"
                aria-label="Следваща"
              >
                ›
              </button>
              <span className="absolute bottom-5 rounded-full bg-ink/60 px-3 py-1 text-sm text-cream">
                {lb.i + 1} / {lb.images.length}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Item({ m, onOpen }: { m: MenuItem; onOpen: (images: string[], i?: number) => void }) {
  const imgs = m.image_urls.length ? m.image_urls : m.image_url ? [m.image_url] : [];

  const image = (cls: string) =>
    imgs.length > 0 ? (
      <button
        type="button"
        onClick={() => onOpen(imgs, 0)}
        className={`group relative shrink-0 overflow-hidden rounded-xl ${cls}`}
        aria-label={`Уголеми снимка на ${m.name}`}
      >
        <Image
          src={imgs[0]}
          alt={m.name}
          fill
          sizes="96px"
          className="cursor-zoom-in object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {imgs.length > 1 && (
          <span className="absolute bottom-1 right-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-cream">
            +{imgs.length - 1}
          </span>
        )}
      </button>
    ) : null;

  const price =
    m.price_eur != null ? (
      <span className="shrink-0 whitespace-nowrap font-display font-semibold text-ink tabular-nums">
        €{m.price_eur.toFixed(2)}
        <span className="ml-1 text-sm font-normal text-muted">/ {bgn(m.price_eur)} лв.</span>
      </span>
    ) : null;

  const whole =
    m.whole_price_eur != null && m.servings > 1 ? (
      <p className="mt-1 text-xs text-muted">
        {m.category === "торта" ? "Цяла торта" : "Цяло"} ({m.servings}{" "}
        {m.category === "торта" ? "парчета" : "порции"}):{" "}
        <span className="font-medium text-ink/80">{dualPrice(m.whole_price_eur)}</span>
      </p>
    ) : null;

  const desc = m.description ? (
    <p className="mt-1 text-sm leading-relaxed text-muted">{m.description}</p>
  ) : null;

  // Метаданни на фиксирано място: Грамаж → макроси → тагове → алергени
  const meta = (
    <>
      {m.serving_weight_g > 0 && (
        <p className="text-xs text-muted">
          {m.serving_unit === "ml" ? "Обем" : "Грамаж"}: ~{m.serving_weight_g} {m.serving_unit}
        </p>
      )}
      {m.show_macros && m.kcal_serving > 0 && (
        <p className="mt-1 text-xs font-medium tracking-wide text-brand-600">
          {m.protein_serving_g.toFixed(0)} g протеин · {m.carbs_serving_g.toFixed(0)} g въгл. ·{" "}
          {m.fat_serving_g.toFixed(0)} g мазн. · {m.kcal_serving.toFixed(0)} kcal
        </p>
      )}
      {m.show_macros && m.gi_estimate != null && (
        <p className="mt-1 text-xs text-muted">
          Гликемичен индекс ~{m.gi_estimate}
          {m.gl_serving != null && <> · товар ~{m.gl_serving}/порция</>}{" "}
          <span className="text-muted/70">(референтни)</span>{" "}
          <Link
            href="/polezno/glikemichen-indeks-i-glikemichen-tovar"
            className="font-medium text-brand-600 underline-offset-2 hover:underline"
            title="Какво е гликемичен индекс и товар?"
          >
            ?
          </Link>
        </p>
      )}
      {m.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.tags.map((t) => (
            <span key={t} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-600">
              {t}
            </span>
          ))}
        </div>
      )}
      {m.allergen_ids.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Алергени:{" "}
          <Link
            href="/alergeni"
            className="font-medium text-brand-600 underline-offset-2 hover:underline"
            title="Виж легендата за алергените"
          >
            {[...m.allergen_ids].sort((a, b) => a - b).join(", ")}
          </Link>
        </p>
      )}
    </>
  );

  return (
    <article>
      {/* МОБИЛЕН: заглавие+цена отгоре (пълна ширина), снимка вляво, текстът се увива и под нея */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-2 text-lg">
          <h3 className="font-display font-medium leading-snug text-ink">{m.name}</h3>
          {price}
        </div>
        {whole}
        <div className="mt-2 overflow-hidden">
          {image("float-left mr-3 mb-1 h-24 w-24")}
          {desc}
        </div>
        <div className="mt-2 clear-both">{meta}</div>
      </div>

      {/* ДЕСКТОП: снимка вляво | съдържание вдясно с dotted leader */}
      <div className="hidden gap-4 sm:flex">
        {image("h-24 w-24")}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 text-xl">
            <h3 className="font-display font-medium text-ink">{m.name}</h3>
            <span className="mb-1 flex-1 border-b border-dotted border-ink/25" aria-hidden />
            {price}
          </div>
          {whole}
          {desc}
          <div className="mt-2">{meta}</div>
        </div>
      </div>
    </article>
  );
}
