"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContactMessage } from "@/lib/types";
import { setMessageHandled, deleteMessage } from "@/app/actions";

export default function MessagesList({ messages }: { messages: ContactMessage[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  if (messages.length === 0) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-400">
        Все още няма съобщения.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`rounded-lg border bg-white p-4 ${
            m.handled ? "border-neutral-200 opacity-60" : "border-neutral-300"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {m.name}
                {m.contact && <span className="ml-2 text-sm font-normal text-neutral-500">{m.contact}</span>}
              </p>
              <p className="text-xs text-neutral-400">
                {new Date(m.created_at).toLocaleString("bg-BG")}
              </p>
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              <button
                onClick={() => run(() => setMessageHandled(m.id, !m.handled))}
                disabled={pending}
                className="text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
              >
                {m.handled ? "Върни" : "Обработено"}
              </button>
              <button
                onClick={() => {
                  if (confirm("Изтриване на съобщението?")) run(() => deleteMessage(m.id));
                }}
                disabled={pending}
                className="text-neutral-400 hover:text-red-600 disabled:opacity-50"
              >
                Изтрий
              </button>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{m.message}</p>
        </div>
      ))}
    </div>
  );
}
