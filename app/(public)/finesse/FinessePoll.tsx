"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { submitEventVote } from "@/app/actions";

const LS_KEY = "nutriko-finesse-vote";

const OPTIONS = [
  {
    key: "kokosova",
    label: "Кокосовият десерт",
    img: "https://xrdanumtjbrpkrjtvyjx.supabase.co/storage/v1/object/public/product-images/events/finesse/kokosova.webp",
  },
  {
    key: "krema-mus",
    label: "Крема Мус",
    img: "https://xrdanumtjbrpkrjtvyjx.supabase.co/storage/v1/object/public/product-images/events/finesse/krema-mus.webp",
  },
] as const;

export default function FinessePoll({
  initial,
  showResults = false,
}: {
  initial: Record<string, number>;
  // Режим „наблюдение" (?rezultati) — показва резултатите без гласуване
  showResults?: boolean;
}) {
  const [counts, setCounts] = useState(initial);
  const [voted, setVoted] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // localStorage е достъпен само в браузъра
  useEffect(() => {
    setVoted(localStorage.getItem(LS_KEY));
  }, []);

  async function vote(choice: (typeof OPTIONS)[number]["key"]) {
    if (voted || pending) return;
    setPending(true);
    try {
      const res = await submitEventVote("finesse", choice);
      if (res.ok) {
        setCounts(res.counts);
        setVoted(choice);
        localStorage.setItem(LS_KEY, choice);
      }
    } finally {
      setPending(false);
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Режим „наблюдение": директно резултатите, с бройки, без гласуване
  if (showResults) {
    return (
      <div className="rounded-2xl border border-brand/15 bg-white p-5">
        <p className="mb-4 text-sm font-medium text-brand-600">
          Резултати на живо · общо {total} {total === 1 ? "глас" : "гласа"}
        </p>
        <div className="space-y-4">
          {OPTIONS.map((o) => {
            const n = counts[o.key] ?? 0;
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <div key={o.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink">{o.label}</span>
                  <span className="font-medium tabular-nums text-ink">
                    {n} {n === 1 ? "глас" : "гласа"} · {pct}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-brand-50">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted">Обнови страницата за най-новите гласове.</p>
      </div>
    );
  }

  if (!voted) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => vote(o.key)}
            disabled={pending}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-white p-3 text-left transition-all hover:border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                <Image src={o.img} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <span className="font-medium text-ink">{o.label}</span>
            </span>
            <span className="mr-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors group-hover:bg-brand group-hover:text-cream">
              {pending ? "…" : "Гласувай"}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand/15 bg-white p-5">
      <p className="mb-4 text-sm font-medium text-brand-600">
        Благодарим ти!{" "}
        {total === 1
          ? "Ти си първият гласувал."
          : total > 1
            ? `Ето какво избраха ${total} гости досега:`
            : ""}
      </p>
      <div className="space-y-4">
        {OPTIONS.map((o) => {
          const n = counts[o.key] ?? 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          const mine = voted === o.key;
          return (
            <div key={o.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className={mine ? "font-semibold text-ink" : "text-muted"}>
                  {o.label} {mine && "· твоят глас ✓"}
                </span>
                <span className="font-medium tabular-nums text-ink">{pct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-brand-50">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${mine ? "bg-brand" : "bg-brand/40"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
