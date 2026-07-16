"use client";

import { useEffect, useState } from "react";
import { submitEventVote } from "@/app/actions";

const LS_KEY = "nutriko-finesse-vote";

const OPTIONS = [
  { key: "kokosova", label: "Кокосова торта", emoji: "🥥" },
  { key: "krema-mus", label: "Торта Крема Мус", emoji: "🍫" },
] as const;

export default function FinessePoll({ initial }: { initial: Record<string, number> }) {
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

  if (!voted) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => vote(o.key)}
            disabled={pending}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-white px-5 py-4 text-left transition-all hover:border-brand hover:shadow-md disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="text-3xl">{o.emoji}</span>
              <span className="font-medium text-ink">{o.label}</span>
            </span>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 transition-colors group-hover:bg-brand group-hover:text-cream">
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
        Благодарим ти! 💚{" "}
        {total === 1 ? "Ти си първият гласувал! 🥇" : `Ето какво избраха ${total} гости досега:`}
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
                  {o.emoji} {o.label} {mine && "· твоят глас ✓"}
                </span>
                <span className="tabular-nums font-medium text-ink">{pct}%</span>
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
