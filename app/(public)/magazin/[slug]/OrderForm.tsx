"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { DeliveryOption, DeliveryType } from "@/lib/shop-common";
import { eur } from "@/lib/price";

type Site = { id: number; name: string; type: string; postCode: string; region: string };
type Office = { id: number; name: string; address: string };

async function speedy<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetch("/api/shop/speedy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export default function OrderForm({
  item,
  options,
  freeFrom,
}: {
  item: { slug: string; title: string; packLabel: string; price: number; max: number };
  options: DeliveryOption[];
  freeFrom: number | null;
}) {
  const [qty, setQty] = useState(1);
  const [type, setType] = useState<DeliveryType>(options[0].type);

  // Населено място: търсене → избор.
  const [cityQ, setCityQ] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [searching, setSearching] = useState(false);

  // Офис или автомат в избраното място.
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeId, setOfficeId] = useState<number | null>(null);
  const [loadingOffices, setLoadingOffices] = useState(false);

  const [street, setStreet] = useState("");
  const [no, setNo] = useState("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Търсенето и офисите тръгват от действието на човека (писане, избор), не от ефект.
  // Броячите отхвърлят закъснели отговори — важи само последната заявка.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);
  const officeSeq = useRef(0);

  function onCityInput(v: string) {
    setCityQ(v);
    if (timer.current) clearTimeout(timer.current);
    const n = ++searchSeq.current;
    if (v.trim().length < 2) {
      setSites([]);
      setSearching(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const r = await speedy<{ sites: Site[] }>({ action: "sites", name: v });
      if (n !== searchSeq.current) return;
      setSites(r?.sites ?? []);
      setSearching(false);
    }, 350);
  }

  function loadOffices(s: Site | null, t: DeliveryType) {
    const n = ++officeSeq.current;
    setOfficeId(null);
    setOffices([]);
    if (!s || t === "address") {
      setLoadingOffices(false);
      return;
    }
    setLoadingOffices(true);
    speedy<{ offices: Office[] }>({ action: "offices", siteId: s.id, kind: t }).then((r) => {
      if (n !== officeSeq.current) return;
      setOffices((r?.offices ?? []).sort((a, b) => a.name.localeCompare(b.name, "bg")));
      setLoadingOffices(false);
    });
  }

  function pickSite(s: Site) {
    if (timer.current) clearTimeout(timer.current);
    searchSeq.current++;
    setSite(s);
    setSites([]);
    setSearching(false);
    loadOffices(s, type);
  }

  function clearSite() {
    setSite(null);
    setCityQ("");
    loadOffices(null, type);
  }

  function pickType(t: DeliveryType) {
    setType(t);
    loadOffices(site, t);
  }

  const itemsTotal = Math.round(item.price * qty * 100) / 100;
  const opt = options.find((o) => o.type === type)!;
  const shipping = freeFrom != null && itemsTotal >= freeFrom ? 0 : opt.price;
  const total = Math.round((itemsTotal + shipping) * 100) / 100;

  function problem(): string | null {
    if (!site) return "Избери населено място от списъка.";
    if (type !== "address" && !officeId) return type === "apt" ? "Избери автомат." : "Избери офис.";
    if (type === "address" && (!street.trim() || !no.trim())) return "Попълни улица и номер.";
    if (name.trim().length < 3) return "Попълни име и фамилия.";
    if (!/^\+?\d{9,15}$/.test(phone.replace(/[^\d+]/g, ""))) return "Провери телефона.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Провери имейла.";
    if (!terms) return "Нужно е съгласие с общите условия.";
    return null;
  }

  async function submit() {
    const p = problem();
    if (p) {
      setErr(p);
      return;
    }
    setErr(null);
    setBusy(true);
    const office = offices.find((o) => o.id === officeId);
    try {
      const r = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ slug: item.slug, qty }],
          delivery: {
            type,
            siteId: site!.id,
            cityName: site!.name,
            postcode: site!.postCode,
            officeId,
            officeName: office ? `${office.name}${office.address ? `, ${office.address}` : ""}` : null,
            street,
            no,
            details,
          },
          customer: { name, phone, email },
          note,
          termsAccepted: terms,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) {
        window.location.href = j.url;
        return;
      }
      setErr(j.error ?? "Нещо се обърка. Опитай отново.");
    } catch {
      setErr("Няма връзка. Опитай отново.");
    }
    setBusy(false);
  }

  const input =
    "h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-[15px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
  const label = "mb-1.5 block text-sm font-medium text-ink/80";
  const step = "font-display text-xl font-semibold text-ink";

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <div>
          <p className={step}>1. Колко кутии</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-ink/15 bg-white">
              <button
                type="button"
                aria-label="По-малко"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-11 w-11 place-items-center text-xl text-ink/70 disabled:opacity-30"
                disabled={qty <= 1}
              >
                −
              </button>
              <span className="w-8 text-center text-lg font-medium tabular-nums">{qty}</span>
              <button
                type="button"
                aria-label="Повече"
                onClick={() => setQty((q) => Math.min(item.max, q + 1))}
                className="grid h-11 w-11 place-items-center text-xl text-ink/70 disabled:opacity-30"
                disabled={qty >= item.max}
              >
                +
              </button>
            </div>
            <span className="text-sm text-muted">
              {item.packLabel.toLowerCase()} · {eur(item.price)}
            </span>
          </div>
          {freeFrom != null && itemsTotal < freeFrom && (
            <p className="mt-2 text-sm text-brand-600">Безплатна доставка при поръчка от {eur(freeFrom)}.</p>
          )}
        </div>

        <div>
          <p className={step}>2. Доставка със Спиди</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {options.map((o) => (
              <label
                key={o.type}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition ${
                  type === o.type ? "border-brand bg-brand-50 ring-1 ring-brand" : "border-ink/15 bg-white hover:border-ink/30"
                }`}
              >
                <input type="radio" name="delivery" className="sr-only" checked={type === o.type} onChange={() => pickType(o.type)} />
                <span className="block font-medium text-ink">{o.label}</span>
                <span className="text-muted">
                  {freeFrom != null && itemsTotal >= freeFrom ? "безплатна" : eur(o.price)}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label className={label} htmlFor="city">
              Населено място
            </label>
            {site ? (
              <div className="flex h-11 items-center justify-between rounded-xl border border-brand/40 bg-brand-50 px-3 text-[15px]">
                <span>
                  {site.type} {site.name}
                  {site.postCode && <span className="text-muted"> · {site.postCode}</span>}
                </span>
                <button
                  type="button"
                  className="text-sm text-brand-600 hover:underline"
                  onClick={clearSite}
                >
                  смени
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  id="city"
                  className={input}
                  placeholder="Започни да пишеш — напр. Варна"
                  value={cityQ}
                  autoComplete="off"
                  onChange={(e) => onCityInput(e.target.value)}
                />
                {(sites.length > 0 || searching) && (
                  <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-ink/10 bg-white py-1 shadow-lg">
                    {searching && <li className="px-3 py-2 text-sm text-muted">Търси…</li>}
                    {sites.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-[15px] hover:bg-brand-50"
                          onClick={() => pickSite(s)}
                        >
                          {s.type} {s.name}
                          <span className="text-sm text-muted">
                            {s.region ? ` · ${s.region}` : ""}
                            {s.postCode ? ` · ${s.postCode}` : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {site && type !== "address" && (
            <div className="mt-4">
              <label className={label} htmlFor="office">
                {type === "apt" ? "Автомат" : "Офис"}
              </label>
              {loadingOffices ? (
                <p className="text-sm text-muted">Зарежда…</p>
              ) : offices.length === 0 ? (
                <p className="text-sm text-muted">
                  Тук няма {type === "apt" ? "автомат" : "офис"} на Спиди — избери друго място или друг начин на доставка.
                </p>
              ) : (
                <select
                  id="office"
                  className={input}
                  value={officeId ?? ""}
                  onChange={(e) => setOfficeId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— избери —</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                      {o.address ? ` — ${o.address}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {site && type === "address" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
              <div>
                <label className={label}>Улица / ж.к.</label>
                <input className={input} value={street} onChange={(e) => setStreet(e.target.value)} />
              </div>
              <div>
                <label className={label}>Номер</label>
                <input className={input} value={no} onChange={(e) => setNo(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Блок, вход, етаж, апартамент</label>
                <input className={input} value={details} onChange={(e) => setDetails(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div>
          <p className={step}>3. Получател</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Име и фамилия</label>
              <input className={input} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={label}>Телефон</label>
              <input className={input} type="tel" autoComplete="tel" placeholder="08…" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className={label}>Имейл</label>
              <input className={input} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Бележка (по избор)</label>
              <input className={input} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-ink/10 bg-white p-5 lg:sticky lg:top-6">
        <p className="font-display text-lg font-semibold text-ink">Твоята поръчка</p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink/80">
              {qty} × {item.packLabel.toLowerCase()}
            </dt>
            <dd className="tabular-nums">{eur(itemsTotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink/80">Доставка</dt>
            <dd className="tabular-nums">{shipping === 0 ? "безплатна" : eur(shipping)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-ink/10 pt-2 text-base font-semibold">
            <dt>Общо</dt>
            <dd className="tabular-nums">{eur(total)}</dd>
          </div>
        </dl>

        <label className="mt-4 flex items-start gap-2 text-sm text-ink/80">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#1f4733]" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            Съгласен/на съм с{" "}
            <Link href="/usloviya" target="_blank" className="text-brand-600 underline">
              общите условия
            </Link>{" "}
            и{" "}
            <Link href="/dostavka" target="_blank" className="text-brand-600 underline">
              доставката и връщането
            </Link>
            .
          </span>
        </label>

        {err && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-full bg-brand px-6 py-3.5 font-medium text-cream transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? "Отваря плащането…" : `Плащане с карта · ${eur(total)}`}
        </button>
        <p className="mt-2 text-center text-xs text-muted">Плащането е през Stripe. Данните на картата не минават през нас.</p>
      </aside>
    </div>
  );
}
