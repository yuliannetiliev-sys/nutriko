"use client";

import { useState, useTransition } from "react";
import { submitContactMessage } from "@/app/actions";

export default function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [v, setV] = useState({ name: "", contact: "", message: "" });

  function submit() {
    setErr(null);
    if (!v.name.trim() || !v.contact.trim() || !v.message.trim()) {
      setErr("Моля попълни име, имейл или телефон и съобщение.");
      return;
    }
    startTransition(async () => {
      try {
        await submitContactMessage({
          name: v.name,
          contact: v.contact || null,
          message: v.message,
        });
        setDone(true);
        setV({ name: "", contact: "", message: "" });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Грешка при изпращане.");
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-brand/20 bg-brand-50 p-6 text-center">
        <p className="font-display text-xl font-semibold text-brand">Благодарим!</p>
        <p className="mt-1 text-sm text-muted">Получихме съобщението ти и ще се свържем скоро.</p>
        <button
          onClick={() => setDone(false)}
          className="mt-4 text-sm font-medium text-brand-600 hover:text-brand"
        >
          Изпрати ново
        </button>
      </div>
    );
  }

  const field =
    "h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="grid gap-3">
        <input
          className={field}
          placeholder="Име *"
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
        <input
          className={field}
          placeholder="Имейл или телефон *"
          value={v.contact}
          onChange={(e) => setV({ ...v, contact: e.target.value })}
        />
        <textarea
          className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          rows={4}
          placeholder="Съобщение *"
          value={v.message}
          onChange={(e) => setV({ ...v, message: e.target.value })}
        />
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <button
        onClick={submit}
        disabled={pending}
        className="mt-4 w-full rounded-full bg-brand px-6 py-3 font-medium text-cream transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        {pending ? "Изпраща…" : "Изпрати"}
      </button>
    </div>
  );
}
