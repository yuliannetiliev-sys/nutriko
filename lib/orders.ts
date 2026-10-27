import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDb, serviceDb, num, numOrNull } from "@/lib/supabase";
import type { PricedCart } from "@/lib/shop";
import type { DeliveryType, OrderStatus } from "@/lib/shop-common";
import { fromCents } from "@/lib/shop-common";

export type OrderItem = {
  shop_item_id: number | null;
  title: string;
  unit_price_eur: number;
  qty: number;
  line_total_eur: number;
};

export type Order = {
  id: number;
  number: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  email: string;
  delivery_type: DeliveryType;
  speedy_site_id: number | null;
  city_name: string | null;
  postcode: string | null;
  speedy_office_id: number | null;
  office_name: string | null;
  address_street: string | null;
  address_no: string | null;
  address_details: string | null;
  customer_note: string | null;
  items_total_eur: number;
  shipping_eur: number;
  total_eur: number;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  waybill_id: string | null;
  admin_note: string | null;
  /** Платена в тестовия режим на Stripe — без товарителница. */
  is_test: boolean;
  /** Документ по чл. 52о от Н-18 — номерът се дава от базата при истинско плащане. */
  doc_number: number | null;
  doc_issued_at: string | null;
  doc_token: string;
  refunded_eur: number;
  refunded_at: string | null;
  /** Партида на изпратените кутии = „Най-добър до“ от етикета; попълва се при опаковане. */
  batch_label: string | null;
  created_at: string;
  paid_at: string | null;
  packed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  items: OrderItem[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapOrder(r: any): Order {
  return {
    id: Number(r.id),
    number: r.number,
    status: r.status,
    customer_name: r.customer_name,
    phone: r.phone,
    email: r.email,
    delivery_type: r.delivery_type,
    speedy_site_id: numOrNull(r.speedy_site_id),
    city_name: r.city_name ?? null,
    postcode: r.postcode ?? null,
    speedy_office_id: numOrNull(r.speedy_office_id),
    office_name: r.office_name ?? null,
    address_street: r.address_street ?? null,
    address_no: r.address_no ?? null,
    address_details: r.address_details ?? null,
    customer_note: r.customer_note ?? null,
    items_total_eur: num(r.items_total_eur),
    shipping_eur: num(r.shipping_eur),
    total_eur: num(r.total_eur),
    stripe_session_id: r.stripe_session_id ?? null,
    stripe_payment_intent: r.stripe_payment_intent ?? null,
    waybill_id: r.waybill_id ?? null,
    admin_note: r.admin_note ?? null,
    is_test: !!r.is_test,
    doc_number: numOrNull(r.doc_number),
    doc_issued_at: r.doc_issued_at ?? null,
    doc_token: r.doc_token,
    refunded_eur: num(r.refunded_eur),
    refunded_at: r.refunded_at ?? null,
    batch_label: r.batch_label ?? null,
    created_at: r.created_at,
    paid_at: r.paid_at ?? null,
    packed_at: r.packed_at ?? null,
    shipped_at: r.shipped_at ?? null,
    delivered_at: r.delivered_at ?? null,
    cancelled_at: r.cancelled_at ?? null,
    items: ((r.order_items ?? []) as any[]).map((i) => ({
      shop_item_id: numOrNull(i.shop_item_id),
      title: i.title,
      unit_price_eur: num(i.unit_price_eur),
      qty: num(i.qty),
      line_total_eur: num(i.line_total_eur),
    })),
  };
}

const SELECT = "*, order_items(shop_item_id, title, unit_price_eur, qty, line_total_eur)";

/** Където е доставката — на един ред, за имейла и админа. */
export function deliveryLine(o: Pick<Order, "delivery_type" | "city_name" | "office_name" | "address_street" | "address_no" | "address_details" | "postcode">): string {
  if (o.delivery_type === "address") {
    const street = [o.address_street, o.address_no].filter(Boolean).join(" ");
    return [o.postcode ? `${o.postcode} ${o.city_name ?? ""}`.trim() : o.city_name, street, o.address_details]
      .filter(Boolean)
      .join(", ");
  }
  // Имената на офисите на Спиди обикновено започват с града („ТЪРГОВИЩЕ - РАКОВСКА") — не го повтаряме.
  const office = o.office_name ?? "";
  const city = o.city_name && !office.toLowerCase().includes(o.city_name.toLowerCase()) ? o.city_name : null;
  return [o.office_name, city].filter(Boolean).join(" — ");
}

export type NewOrder = {
  customer: { name: string; phone: string; email: string };
  delivery: {
    type: DeliveryType;
    siteId: number | null;
    cityName: string | null;
    postcode: string | null;
    officeId: number | null;
    officeName: string | null;
    street: string | null;
    no: string | null;
    details: string | null;
  };
  note: string | null;
};

export async function createPendingOrder(sdb: SupabaseClient, cart: PricedCart, o: NewOrder) {
  const { data: order, error } = await sdb
    .from("orders")
    .insert({
      status: "pending",
      customer_name: o.customer.name,
      phone: o.customer.phone,
      email: o.customer.email,
      delivery_type: o.delivery.type,
      speedy_site_id: o.delivery.siteId,
      city_name: o.delivery.cityName,
      postcode: o.delivery.postcode,
      speedy_office_id: o.delivery.officeId,
      office_name: o.delivery.officeName,
      address_street: o.delivery.street,
      address_no: o.delivery.no,
      address_details: o.delivery.details,
      customer_note: o.note,
      items_total_eur: fromCents(cart.itemsCents),
      shipping_eur: fromCents(cart.shippingCents),
      total_eur: fromCents(cart.totalCents),
      terms_accepted_at: new Date().toISOString(),
    })
    .select("id, number")
    .single();
  if (error || !order) return { ok: false as const, error: error?.message ?? "Поръчката не се записа." };

  const { error: e2 } = await sdb.from("order_items").insert(
    cart.lines.map((l) => ({
      order_id: order.id,
      shop_item_id: l.item.id,
      title: `${l.item.title} — ${l.item.pack_label}`,
      unit_price_eur: fromCents(l.unitCents),
      qty: l.qty,
      line_total_eur: fromCents(l.totalCents),
    }))
  );
  if (e2) {
    await sdb.from("orders").delete().eq("id", order.id);
    return { ok: false as const, error: e2.message };
  }
  return { ok: true as const, id: Number(order.id), number: order.number as string };
}

export async function attachSession(sdb: SupabaseClient, orderId: number, sessionId: string) {
  await sdb
    .from("orders")
    .update({ stripe_session_id: sessionId, updated_at: new Date().toISOString() })
    .eq("id", orderId);
}

/**
 * Платено → „платена". Вика се и от webhook-а, и от страницата „Благодарим" —
 * който стигне първи. Само поръчка в „чака плащане" се сменя, затова двойното
 * извикване е безопасно: `changed` е true само веднъж и имейлите тръгват веднъж.
 */
export async function markOrderPaid(
  sdb: SupabaseClient,
  orderId: number,
  session: { id: string; payment_intent?: string | null; amount_total?: number | null; livemode?: boolean | null }
): Promise<{ changed: boolean; order: Order | null }> {
  const { data: current } = await sdb.from("orders").select(SELECT).eq("id", orderId).maybeSingle();
  if (!current) return { changed: false, order: null };
  if (current.stripe_session_id && current.stripe_session_id !== session.id) {
    return { changed: false, order: mapOrder(current) };
  }

  const expected = Math.round(num(current.total_eur) * 100);
  const mismatch =
    session.amount_total != null && session.amount_total !== expected
      ? `⚠️ Stripe отчете ${(session.amount_total / 100).toFixed(2)} €, а поръчката е ${(expected / 100).toFixed(2)} €.`
      : null;

  const { data: updated } = await sdb
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent: session.payment_intent ?? null,
      stripe_session_id: session.id,
      ...(session.livemode === false ? { is_test: true } : {}),
      ...(mismatch ? { admin_note: [current.admin_note, mismatch].filter(Boolean).join("\n") } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select(SELECT)
    .maybeSingle();

  if (!updated) return { changed: false, order: mapOrder(current) };

  // Наличността (ако е зададена) намалява чак при плащане — неплатената
  // поръчка не бива да заема кутии.
  for (const it of (updated.order_items ?? []) as any[]) {
    if (!it.shop_item_id) continue;
    const { data: si } = await sdb.from("shop_items").select("stock_qty").eq("id", it.shop_item_id).maybeSingle();
    if (si && si.stock_qty != null) {
      await sdb
        .from("shop_items")
        .update({ stock_qty: Math.max(0, Number(si.stock_qty) - Number(it.qty)) })
        .eq("id", it.shop_item_id);
    }
  }
  return { changed: true, order: mapOrder(updated) };
}

/** Изтекла или прекъсната сесия → „отказана", за да не виси в списъка. */
export async function markOrderExpired(sdb: SupabaseClient, orderId: number) {
  await sdb
    .from("orders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending");
}

/**
 * Върнати пари (и частично) → сумата отива в одиторския файл за НАП (прил. № 38).
 * `refundedCents` е общото върнато досега по плащането (Stripe го праща натрупано).
 * Статусът става „върната“ само при пълно връщане.
 */
export async function markRefunded(
  sdb: SupabaseClient,
  paymentIntent: string,
  r: { refundedCents: number; full: boolean }
) {
  const now = new Date().toISOString();
  await sdb
    .from("orders")
    .update({
      refunded_eur: fromCents(r.refundedCents),
      refunded_at: now,
      ...(r.full ? { status: "refunded" } : {}),
      updated_at: now,
    })
    .eq("stripe_payment_intent", paymentIntent);
}

export async function getOrderBySession(sessionId: string): Promise<Order | null> {
  const sdb = serviceDb();
  if (!sdb) return null;
  const { data } = await sdb.from("orders").select(SELECT).eq("stripe_session_id", sessionId).maybeSingle();
  return data ? mapOrder(data) : null;
}

/** По тайния ключ на документа — за публичния документ и QR кода (без входа на клиента). */
export async function getOrderByDocToken(token: string): Promise<Order | null> {
  const sdb = serviceDb();
  if (!sdb || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data } = await sdb.from("orders").select(SELECT).eq("doc_token", token).maybeSingle();
  return data ? mapOrder(data) : null;
}

// ── Админ (през сесията — RLS пуска само админите) ─────────────────────────

export async function adminListOrders(filter: "active" | "all" | OrderStatus = "active", batch?: string): Promise<Order[]> {
  const supabase = await getDb();
  let q = supabase.from("orders").select(SELECT).order("created_at", { ascending: false }).limit(300);
  // Търсене по партида (при изтегляне на продукт) — във всички статуси.
  if (batch) q = q.ilike("batch_label", `%${batch.replace(/[%_,()]/g, " ").trim()}%`);
  else if (filter === "active") q = q.in("status", ["paid", "packed"]);
  else if (filter !== "all") q = q.eq("status", filter);
  const { data } = await q;
  return (data ?? []).map(mapOrder);
}

export async function adminGetOrder(id: number): Promise<Order | null> {
  const supabase = await getDb();
  const { data } = await supabase.from("orders").select(SELECT).eq("id", id).maybeSingle();
  return data ? mapOrder(data) : null;
}

export type OrderEvent = { at: string; actor: string; action: string; details: Record<string, unknown> | null };

/** Дневникът на поръчката — пише го базата (тригер), не приложението. */
export async function adminOrderEvents(orderId: number): Promise<OrderEvent[]> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("order_events")
    .select("at, actor, action, details")
    .eq("order_id", orderId)
    .order("at", { ascending: true });
  return (data ?? []) as OrderEvent[];
}

export async function adminCountNewOrders(): Promise<number> {
  const supabase = await getDb();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .eq("is_test", false);
  return count ?? 0;
}
