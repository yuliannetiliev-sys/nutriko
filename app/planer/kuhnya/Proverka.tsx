"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitStaffCheck } from "../actions";
import { dmy, sofiaHm } from "@/lib/planer-common";
import type { StaffCheck } from "@/lib/planer";

// Проверка „преди работа“ (Приложение 72). Текстовете са дума по дума от
// `!ДоставчициОферти\Отчетност\_работни\proverka-predi-rabota_TEKSTOVE.md` — общи с касата.
// При промяна там се пренасят тук (и обратно — казва се на „Отчетност и каса“).
// Неотметнатата проверка само напомня, не спира работата (решение на собственика 17.11).

function BookLine({ c }: { c: StaffCheck }) {
  const no = c.book_no ?? "";
  const until = dmy(c.book_valid_until);
  switch (c.book_state) {
    case "ok":
      return <p className="text-sm text-neutral-700">Здравна книжка № {no}, валидна до {until}.</p>;
    case "expiring":
      return (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Здравната книжка № {no} изтича на {until}. Запишете час за преглед.
        </p>
      );
    case "expired":
      return (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          Здравната книжка № {no} е изтекла на {until}. Проверката не може да се отметне — първо нов преглед.
        </p>
      );
    default:
      return (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Няма здравна книжка в регистъра. Дайте я на собственика за сканиране.
        </p>
      );
  }
}

export default function Proverka({ check }: { check: StaffCheck }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [healthOk, setHealthOk] = useState(true);
  const [reason, setReason] = useState("");
  const [clothingOk, setClothingOk] = useState(true);
  const [corrective, setCorrective] = useState("Няма");
  const [error, setError] = useState("");
  const [justDone, setJustDone] = useState<{ healthOk: boolean; reason: string } | null>(null);
  const [pending, start] = useTransition();

  const expired = check.book_state === "expired";

  function submit() {
    start(async () => {
      setError("");
      const r = await submitStaffCheck({ healthOk, reason, clothingOk, corrective });
      if (!r.ok) return setError(r.error);
      setJustDone({ healthOk, reason: reason.trim() });
      setOpen(false);
      router.refresh();
    });
  }

  // --- след отмятането ---
  if (check.done || justDone) {
    const ok = justDone ? justDone.healthOk : check.health_ok !== false;
    return (
      <div className="mb-4 space-y-2">
        {justDone && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Проверката за днес е отметната.</p>
        )}
        {!ok ? (
          <p className="rounded-xl bg-neutral-200 px-3 py-3 text-base text-neutral-800">
            Отметнато: не е допуснат до работа{justDone?.reason ? ` — ${justDone.reason}` : ""}.
          </p>
        ) : (
          check.checked_at && (
            <p className="text-sm text-neutral-500">Проверката за днес е отметната в {sofiaHm(check.checked_at)}.</p>
          )
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 rounded-xl bg-red-600 p-3 text-white">
        <p className="text-base font-semibold">Проверката преди работа за днес не е отметната.</p>
        <button
          onClick={() => setOpen(true)}
          className="mt-2 h-12 w-full rounded-lg bg-white text-base font-semibold text-red-700 active:bg-red-50"
        >
          Отметни сега
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
            <h2 className="text-lg font-semibold">Проверка преди работа</h2>
            <p className="mb-3 text-sm text-neutral-500">Лична хигиена и здравен статус. Отмята се всеки ден преди работа.</p>
            <p className="mb-2 text-base font-medium">{check.staff_name}</p>
            <div className="mb-4">
              <BookLine c={check} />
            </div>

            <fieldset className="mb-4">
              <legend className="mb-1 text-sm font-semibold">1. Здравен статус</legend>
              <label className="flex h-11 items-center gap-3 text-base">
                <input type="radio" checked={healthOk} onChange={() => setHealthOk(true)} className="h-5 w-5 accent-[#1f4733]" />
                Допуснат до работа
              </label>
              <label className="flex h-11 items-center gap-3 text-base">
                <input type="radio" checked={!healthOk} onChange={() => setHealthOk(false)} className="h-5 w-5 accent-[#1f4733]" />
                Не е допуснат
              </label>
              {!healthOk && (
                <div className="mt-1">
                  <label className="mb-1 block text-sm font-medium" htmlFor="pr-reason">
                    Причина
                  </label>
                  <input
                    id="pr-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="задължително, напр. настинка, порязване на ръката"
                    className="h-12 w-full rounded-lg border border-neutral-300 px-3 text-base"
                  />
                </div>
              )}
            </fieldset>

            <fieldset className="mb-4">
              <legend className="mb-1 text-sm font-semibold">2. Работно облекло</legend>
              <label className="flex h-11 items-center gap-3 text-base">
                <input type="radio" checked={clothingOk} onChange={() => setClothingOk(true)} className="h-5 w-5 accent-[#1f4733]" />
                Чисто и подходящо
              </label>
              <label className="flex h-11 items-center gap-3 text-base">
                <input type="radio" checked={!clothingOk} onChange={() => setClothingOk(false)} className="h-5 w-5 accent-[#1f4733]" />
                Необходимо подмяна
              </label>
            </fieldset>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold" htmlFor="pr-corr">
                3. Коригиращи мерки
              </label>
              <input
                id="pr-corr"
                value={corrective}
                onChange={(e) => setCorrective(e.target.value)}
                className="h-12 w-full rounded-lg border border-neutral-300 px-3 text-base"
              />
            </div>

            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={pending || expired}
                className="h-12 flex-1 rounded-lg bg-[#1f4733] text-base font-semibold text-white active:opacity-80 disabled:opacity-40"
              >
                {pending ? "Записва…" : "Отметни"}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="h-12 rounded-lg border border-neutral-300 px-4 text-base active:bg-neutral-100"
              >
                По-късно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
