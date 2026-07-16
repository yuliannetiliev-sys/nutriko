"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4">
      <form action={action} className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Nutrico — админ вход</h1>
        <p className="mb-5 mt-1 text-sm text-neutral-500">Достъп само за управителя.</p>

        <label className="mb-1 block text-xs font-medium text-neutral-500">Имейл</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mb-3 h-10 w-full rounded-md border border-neutral-300 px-3 text-sm"
        />

        <label className="mb-1 block text-xs font-medium text-neutral-500">Парола</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm"
        />

        {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

        <button
          disabled={pending}
          className="mt-5 h-10 w-full rounded-md bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? "Влиза…" : "Влез"}
        </button>
      </form>
    </div>
  );
}
