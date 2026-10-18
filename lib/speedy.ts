import "server-only";

// Спиди REST API — същият акаунт и същите заявки като при книгите на Apex
// (landing/book-landing/api/speedy.js), които работят на живо от 27.05.
// ⚠️ Няма тестова среда: товарителница, създадена оттук, е истинска.
// Пробната се анулира ръчно в MySpeedy.

const API = "https://api.speedy.bg/v1/";

// Публичният телефон на обекта; офис 132 „Търговище – Раковска" е мястото,
// където се сдават пратките (без куриер до адреса на изпращача).
export const SENDER_PHONE = process.env.SPEEDY_SENDER_PHONE ?? "0879262181";
export const DROPOFF_OFFICE_ID = Number(process.env.SPEEDY_DROPOFF_OFFICE_ID ?? 132);
const SERVICE_ID = 505; // стандартна доставка до следващ работен ден

function creds() {
  const userName = process.env.SPEEDY_USER;
  const password = process.env.SPEEDY_PASS;
  return userName && password ? { userName, password, language: "BG" } : null;
}

export function speedyConfigured(): boolean {
  return creds() != null;
}

async function call(endpoint: string, body: Record<string, unknown>) {
  const c = creds();
  if (!c) return { ok: false as const, error: "Спиди не е настроен (SPEEDY_USER / SPEEDY_PASS)" };
  try {
    const res = await fetch(API + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, ...body }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      return { ok: false as const, error: data?.error?.message ?? `Спиди ${res.status}` };
    }
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Спиди не отговаря" };
  }
}

export type SpeedySite = { id: number; name: string; type: string; postCode: string; region: string };
export type SpeedyOffice = { id: number; name: string; kind: "OFFICE" | "APT"; address: string };

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function searchSites(name: string): Promise<SpeedySite[]> {
  const r = await call("location/site", { countryId: 100, name: name.trim().slice(0, 50) });
  if (!r.ok) return [];
  return ((r.data.sites ?? []) as any[]).slice(0, 15).map((s) => ({
    id: Number(s.id),
    name: String(s.name ?? ""),
    type: String(s.type ?? ""),
    postCode: String(s.postCode ?? ""),
    region: String(s.region ?? s.municipality ?? ""),
  }));
}

export async function listOffices(siteId: number): Promise<SpeedyOffice[]> {
  const r = await call("location/office", { countryId: 100, siteId });
  if (!r.ok) return [];
  return ((r.data.offices ?? []) as any[]).map((o) => ({
    id: Number(o.id),
    name: String(o.name ?? ""),
    kind: String(o.type ?? "").toUpperCase() === "APT" ? ("APT" as const) : ("OFFICE" as const),
    address: String(o.address?.fullAddressString ?? o.address?.localAddressString ?? ""),
  }));
}

/** Днес, ако е делник преди 15:00 в София; иначе следващият делник. YYYY-MM-DD. */
function pickupDate(): string {
  const sofia = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Sofia" }));
  const d = new Date(sofia);
  const weekday = (x: Date) => x.getDay() !== 0 && x.getDay() !== 6;
  if (!(weekday(d) && d.getHours() < 15)) {
    do d.setDate(d.getDate() + 1);
    while (!weekday(d));
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type ShipmentOrder = {
  number: string;
  customer_name: string;
  phone: string;
  email: string;
  delivery_type: "office" | "apt" | "address";
  speedy_site_id: number | null;
  speedy_office_id: number | null;
  address_street: string | null;
  address_no: string | null;
  address_details: string | null;
  weightG: number;
};

export async function createShipment(o: ShipmentOrder) {
  const recipient: Record<string, unknown> = {
    privatePerson: true,
    clientName: o.customer_name,
    phone1: { number: o.phone.replace(/[^\d+]/g, "") },
    ...(o.email ? { email: o.email } : {}),
  };
  if (o.delivery_type === "address") {
    recipient.address = {
      countryId: 100,
      siteId: o.speedy_site_id,
      streetName: o.address_street ?? "",
      streetNo: o.address_no ?? "",
      ...(o.address_details ? { addressNote: o.address_details } : {}),
    };
  } else {
    recipient.pickupOfficeId = o.speedy_office_id;
  }

  const r = await call("shipment", {
    sender: { phone1: { number: SENDER_PHONE }, dropoffOfficeId: DROPOFF_OFFICE_ID },
    recipient,
    service: { serviceId: SERVICE_ID, pickupDate: pickupDate() },
    content: {
      parcelsCount: 1,
      totalWeight: Math.max(0.1, Math.round(o.weightG / 100) / 10),
      contents: "Вафли (храна)",
      package: "BOX",
    },
    // Доставката е платена от клиента при поръчката — към Спиди плаща Нутрико.
    payment: { courierServicePayer: "SENDER" },
    ref1: o.number,
  });
  if (!r.ok) return r;
  const id = r.data.parcels?.[0]?.id ?? r.data.id;
  if (!id) return { ok: false as const, error: "Спиди не върна номер на товарителница" };
  return { ok: true as const, waybill: String(id) };
}

/** PDF на товарителницата за печат (A6 — етикет за кутията). */
export async function printLabel(parcelId: string) {
  const c = creds();
  if (!c) return { ok: false as const, error: "Спиди не е настроен" };
  try {
    const res = await fetch(API + "print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, paperSize: "A6", parcels: [{ parcel: { id: parcelId } }] }),
      cache: "no-store",
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("pdf")) {
      const data = await res.json().catch(() => ({}));
      return { ok: false as const, error: data?.error?.message ?? `Спиди ${res.status}` };
    }
    return { ok: true as const, pdf: await res.arrayBuffer() };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Спиди не отговаря" };
  }
}

export function trackingUrl(waybill: string): string {
  return `https://www.speedy.bg/bg/track-shipment?shipmentNumber=${encodeURIComponent(waybill)}`;
}
