"use client";

import { useEffect, useState } from "react";

/**
 * Плъзгаща се покана за следване — появява се, след като човек е разгледал
 * менюто, и изчезва завинаги, щом натисне или я затвори.
 *
 * ЗАЩО НЕ ПРОВЕРЯВА ДАЛИ ЧОВЕКЪТ ВЕЧЕ НИ СЛЕДВА: Facebook не дава такава
 * информация на чужд сайт — няма програмен достъп и няма да има, защото би
 * било изтичане на лични данни. Официалният плъгин ПОКАЗВА на човека, че вече
 * следва, но не го КАЗВА на сайта. Затова тук се помни другото, което е
 * изцяло наше: дали този посетител вече е реагирал на поканата.
 *
 * ЗАЩО НЕ Е ИЗСКАЧАЩ ПРОЗОРЕЦ ПРИ ОТВАРЯНЕ: менюто се отваря с QR на масата.
 * Човек, който иска да види какво има, а получава преграда, се дразни — и
 * това е първото му впечатление от заведението. Затова лентата чака, докато
 * той сам разгледа, и никога не пречи на четенето.
 *
 * ⚠️ Изчаква и лентата за бисквитки — иначе двете стоят една върху друга.
 */

const KEY = "nutriko-follow";
const CONSENT_KEY = "nutriko-consent";
const SCROLL_PX = 900; // ~две екрана на телефон: човекът е видял продукти

export default function FollowBar({ fb, ig }: { fb?: string | null; ig?: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!fb && !ig) return;
    let done = false;
    try {
      if (localStorage.getItem(KEY)) return; // вече е реагирал — не го закачаме
    } catch {
      return; // блокирано хранилище: по-добре нищо, отколкото да досаждаме всеки път
    }

    const onScroll = () => {
      if (done || window.scrollY < SCROLL_PX) return;
      try {
        if (!localStorage.getItem(CONSENT_KEY)) return; // бисквитките са още на екрана
      } catch {
        return;
      }
      done = true;
      setShow(true);
      window.removeEventListener("scroll", onScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [fb, ig]);

  if (!show) return null;

  const close = (why: "clicked" | "dismissed") => {
    try {
      localStorage.setItem(KEY, why);
    } catch {
      /* ако хранилището е блокирано, поне за тази сесия изчезва */
    }
    setShow(false);
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-2 rounded-2xl bg-brand px-4 py-3 text-cream shadow-lg sm:flex-row sm:items-center sm:gap-3 sm:px-5">
        {/* На телефон текстът заема целия ред, а бутоните слизат отдолу.
            Ако стоят един до друг, на текста остават ~140 px и изречението
            се начупва на три реда. */}
        <p className="min-w-0 flex-1 text-[13px] leading-snug sm:text-sm">
          <span className="font-medium">Какво има днес?</span>
          <span className="text-cream/80"> Казваме първо там.</span>
        </p>

        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          {fb && (
            <a
              href={fb}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close("clicked")}
              className={`${btn} bg-cream text-brand hover:bg-white`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z" />
              </svg>
              <span className="hidden sm:inline">Facebook</span>
              <span className="sm:hidden">Следвай</span>
            </a>
          )}
          {ig && (
            <a
              href={ig}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close("clicked")}
              aria-label="Instagram"
              className={`${btn} border border-cream/30 text-cream hover:bg-cream/10`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.72 2.12-1.38.66-.66 1.07-1.33 1.38-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.72-1.46-1.38-2.12C21.32 1.35 20.65.94 19.86.63 19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32A6.16 6.16 0 0012 5.84zm0 10.16a4 4 0 110-8 4 4 0 010 8zm7.85-10.4a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" />
              </svg>
            </a>
          )}
          <button
            type="button"
            onClick={() => close("dismissed")}
            aria-label="Скрий"
            className="ml-auto rounded-full p-1.5 sm:ml-0 text-cream/60 transition-colors hover:bg-cream/10 hover:text-cream"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
