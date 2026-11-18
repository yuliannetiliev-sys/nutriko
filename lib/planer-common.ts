// Общо за планера на тортите — ползва се и на сървъра, и в браузъра (без тайни, без база).

export type CakeStatus = "pending" | "made" | "picked_up" | "cancelled";

export const STATUS_LABEL: Record<CakeStatus, string> = {
  pending: "Чакаща",
  made: "Произведена",
  picked_up: "Взета",
  cancelled: "Отказана",
};

export const STATUS_BADGE: Record<CakeStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  made: "bg-sky-100 text-sky-900",
  picked_up: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-neutral-200 text-neutral-500",
};

export const isStatus = (s: unknown): s is CakeStatus =>
  s === "pending" || s === "made" || s === "picked_up" || s === "cancelled";

/**
 * Телефонът се пази в един вид, за да се намира същият клиент:
 * само цифри, а българските +359 / 00359 стават 0… (0879 262 181 → 0879262181).
 * Базата приема `^\+?[0-9]{6,15}$`.
 */
export function normPhone(raw: string): string {
  let s = (raw ?? "").trim().replace(/[\s\-().\/]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+359")) s = "0" + s.slice(4);
  return s;
}

export const phoneOk = (p: string) => /^\+?[0-9]{6,15}$/.test(p);

/** 0879262181 → 0879 262 181 (само за показване) */
export function showPhone(p: string | null | undefined): string {
  if (!p) return "";
  if (/^0\d{9}$/.test(p)) return `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}`;
  return p;
}

/** Днешната дата в София като YYYY-MM-DD. */
export function sofiaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(now);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const WD = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"];

/** 2026-11-19 → „чт 19.11“ */
export function dayShort(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return `${WD[d.getUTCDay()]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

/** 2026-11-19 → „19.11.2026“ */
export const dmy = (iso: string | null | undefined) =>
  iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "";

/** „Днес“ / „Утре“ / „Вдругиден“ или празно */
export function dayWord(iso: string, today: string): string {
  if (iso === today) return "Днес";
  if (iso === addDays(today, 1)) return "Утре";
  if (iso === addDays(today, 2)) return "Вдругиден";
  return "";
}

/** 14:30:00 → 14:30 */
export const hm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

/** Часът на отметка (timestamptz) по софийско време → 07:42 */
export const sofiaHm = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleTimeString("bg-BG", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit" })
    : "";
