"use client";

import { useActionState, useState } from "react";
import { saveOrder, lookupCustomer } from "./actions";
import { addDays, dayShort, normPhone, phoneOk, sofiaToday } from "@/lib/planer-common";
import type { Cake, OrderRow } from "@/lib/planer";

const field = "h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base";
const label = "mb-1 block text-sm font-medium text-neutral-700";

export default function OrderForm({ cakes, order }: { cakes: Cake[]; order?: OrderRow }) {
  const [state, action, pending] = useActionState(saveOrder, null);
  const today = sofiaToday();

  const initialProduct = order
    ? order.product_id && cakes.some((c) => c.id === order.product_id)
      ? String(order.product_id)
      : "other"
    : "";
  const [product, setProduct] = useState(initialProduct);
  const [date, setDate] = useState(order?.pickup_date ?? "");
  const [name, setName] = useState(order?.customer?.name ?? "");
  const [email, setEmail] = useState(order?.customer?.email ?? "");
  const [consent, setConsent] = useState(order?.customer?.marketing_consent ?? false);
  const [known, setKnown] = useState<string>("");

  async function onPhoneBlur(e: React.FocusEvent<HTMLInputElement>) {
    const p = normPhone(e.currentTarget.value);
    if (!phoneOk(p) || order) return setKnown("");
    const c = await lookupCustomer(p).catch(() => null);
    if (!c) return setKnown("");
    setKnown(`Познат клиент: ${c.name}${c.consent ? " · съгласен е за оферти" : ""}`);
    if (!name.trim()) setName(c.name);
    if (!email.trim() && c.email) setEmail(c.email);
  }

  const quick = [
    [today, "Днес"],
    [addDays(today, 1), "Утре"],
    [addDays(today, 2), "Вдругиден"],
  ] as const;

  return (
    <form action={action} className="space-y-5">
      {order && <input type="hidden" name="id" value={order.id} />}

      <div>
        <label className={label} htmlFor="product_id">
          Торта
        </label>
        <select
          id="product_id"
          name="product_id"
          required
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className={field}
        >
          <option value="" disabled>
            — изберете —
          </option>
          {cakes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name.replace(/"([^"]*)"/g, "„$1“")}
            </option>
          ))}
          <option value="other">Друга торта…</option>
        </select>
        {product === "other" && (
          <input
            name="cake_other"
            required
            defaultValue={initialProduct === "other" ? order?.cake_name : ""}
            placeholder="Коя торта"
            maxLength={200}
            className={field + " mt-2"}
          />
        )}
      </div>

      <div className="w-28">
        <label className={label} htmlFor="qty">
          Брой
        </label>
        <input id="qty" name="qty" type="number" inputMode="numeric" min={1} max={50} defaultValue={order?.qty ?? 1} className={field} />
      </div>

      <div>
        <span className={label}>Дата на взимане</span>
        <div className="mb-2 grid grid-cols-3 gap-2">
          {quick.map(([d, w]) => (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              className={
                "h-12 rounded-lg border text-sm font-medium leading-tight " +
                (date === d ? "border-[#1f4733] bg-[#1f4733] text-white" : "border-neutral-300 bg-white active:bg-neutral-100")
              }
            >
              {w}
              <span className="block text-xs font-normal opacity-75">{dayShort(d)}</span>
            </button>
          ))}
        </div>
        <input
          name="pickup_date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={field}
          aria-label="Дата на взимане"
        />
      </div>

      <div>
        <label className={label} htmlFor="pickup_time">
          Час на взимане <span className="font-normal text-neutral-400">(може и празно)</span>
        </label>
        <input
          id="pickup_time"
          name="pickup_time"
          type="time"
          step={300}
          defaultValue={order?.pickup_time?.slice(0, 5) ?? ""}
          className={field + " w-40"}
        />
      </div>

      <div>
        <label className={label} htmlFor="phone">
          Телефон
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          required
          defaultValue={order?.customer?.phone ?? ""}
          onBlur={onPhoneBlur}
          placeholder="0879 262 181"
          className={field}
        />
        {known && <p className="mt-1 text-sm text-emerald-700">{known}</p>}
      </div>

      <div>
        <label className={label} htmlFor="name">
          Име на клиента
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
      </div>

      <div>
        <label className={label} htmlFor="note">
          Бележка <span className="font-normal text-neutral-400">(надпис, свещи, алергия)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={500}
          defaultValue={order?.note ?? ""}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base"
        />
      </div>

      <fieldset className="rounded-xl border border-neutral-200 bg-white p-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-6 w-6 shrink-0 accent-[#1f4733]"
          />
          <span className="text-base">
            Съгласен е да получава оферти
            <span className="block text-xs text-neutral-500">
              Само ако клиентът е казал „да“. Без съгласие името и телефонът се трият 1 година след последната поръчка.
            </span>
          </span>
        </label>
        {consent && (
          <div className="mt-3 space-y-3 pl-9">
            <div className="flex gap-4 text-sm">
              <span className="text-neutral-600">Казал е „да“:</span>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="consent_source"
                  value="телефон"
                  defaultChecked={order?.customer?.consent_source !== "на място"}
                  className="h-5 w-5 accent-[#1f4733]"
                />
                по телефона
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="consent_source"
                  value="на място"
                  defaultChecked={order?.customer?.consent_source === "на място"}
                  className="h-5 w-5 accent-[#1f4733]"
                />
                на място
              </label>
            </div>
          </div>
        )}
        <div className="mt-3">
          <label className={label} htmlFor="email">
            Имейл <span className="font-normal text-neutral-400">(по желание)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </div>
      </fieldset>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <button
        disabled={pending}
        className="h-14 w-full rounded-xl bg-[#1f4733] text-lg font-semibold text-white active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Записва…" : order ? "Запиши промените" : "Запиши поръчката"}
      </button>
    </form>
  );
}
