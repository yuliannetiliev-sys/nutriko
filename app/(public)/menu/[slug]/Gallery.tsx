"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Снимките на продукта — голяма отгоре, малките под нея, уголемяване при клик.
 *
 * ЗАЩО НЕ Е ПРЕПОЛЗВАН ЛАЙТБОКСЪТ ОТ МЕНЮТО: там той обслужва списък от
 * двайсет продукта и живее в MenuView заедно с цялата логика на списъка.
 * Тук има един продукт и няколко негови снимки. Изваждането на общ компонент
 * би събрало два различни случая в едно място заради това, че си приличат
 * външно — а те се разминават при първата промяна на който и да е от двата.
 */
export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touchX = useRef<number | null>(null);
  const step = (d: number) => setI((k) => (k + d + images.length) % images.length);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="group relative block aspect-[4/3] w-full overflow-hidden rounded-3xl border border-ink/10 bg-brand-50"
        aria-label={`Уголеми снимка на ${alt}`}
      >
        <Image
          src={images[i]}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          priority
          className="cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
        />
      </button>

      {images.length > 1 && (
        <div className="mt-3 flex gap-3">
          {images.map((src, k) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Снимка ${k + 1}`}
              aria-current={k === i}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                k === i ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom(false);
            }}
            className="absolute right-3 top-3 z-20 grid h-12 w-12 place-items-center rounded-full bg-ink/50 text-2xl text-cream hover:bg-ink/70"
            aria-label="Затвори"
          >
            ✕
          </button>
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
              if (images.length > 1 && Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
            }}
          >
            <Image src={images[i]} alt={alt} fill sizes="92vw" className="rounded-lg object-contain" />
          </div>
          {images.length > 1 && (
            <span className="absolute bottom-5 rounded-full bg-ink/60 px-3 py-1 text-sm text-cream">
              {i + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
