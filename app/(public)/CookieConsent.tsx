"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CLARITY_ID = "x94xqe9rp1";
const KEY = "nutriko-consent";

// Зарежда Microsoft Clarity (само след съгласие).
function loadClarity() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.clarity) return; // вече зареден
  w.clarity =
    w.clarity ||
    function (...args: unknown[]) {
      (w.clarity.q = w.clarity.q || []).push(args);
    };
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.clarity.ms/tag/" + CLARITY_ID;
  document.head.appendChild(s);
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem(KEY);
    if (c === "accepted") loadClarity();
    else if (!c) setShow(true);
  }, []);

  if (!show) return null;

  const accept = () => {
    localStorage.setItem(KEY, "accepted");
    loadClarity();
    setShow(false);
  };
  const reject = () => {
    localStorage.setItem(KEY, "rejected");
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-cream/95 shadow-[0_-8px_30px_-20px_rgba(31,71,51,0.5)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-ink/80">
          Ползваме бисквитки за анонимна статистика (Microsoft Clarity), за да подобряваме сайта.
          Зареждат се само ако приемеш.{" "}
          <Link href="/poveritelnost" className="text-brand-600 underline-offset-2 hover:underline">
            Научи повече
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={reject}
            className="rounded-full border border-ink/20 px-4 py-2 text-sm text-ink/70 transition-colors hover:bg-ink/5"
          >
            Само необходимите
          </button>
          <button
            onClick={accept}
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-brand-600"
          >
            Приемам
          </button>
        </div>
      </div>
    </div>
  );
}
