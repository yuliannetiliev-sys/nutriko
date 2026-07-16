"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions";

export default function ChangePassword() {
  const [state, action, pending] = useActionState(changePassword, null);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="font-medium">Смяна на парола</h2>
      <p className="mb-3 text-sm text-neutral-500">Въведи нова парола за достъп до админа.</p>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          placeholder="Нова парола (мин. 8 знака)"
          className="h-9 w-64 rounded-md border border-neutral-300 px-3 text-sm"
        />
        <button
          disabled={pending}
          className="h-9 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? "Сменя…" : "Смени паролата"}
        </button>
        {state?.ok && <span className="text-sm text-emerald-600">Готово ✓ — паролата е сменена.</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </form>
    </div>
  );
}
