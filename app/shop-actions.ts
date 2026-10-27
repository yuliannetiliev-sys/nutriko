"use server";

import { revalidatePath } from "next/cache";
import { getDb, requireAdmin } from "@/lib/supabase";
import { adminGetOrder } from "@/lib/orders";
import { createShipment, speedyConfigured, trackingUrl } from "@/lib/speedy";
import { sendShippedEmail } from "@/lib/email";
import type { OrderStatus } from "@/lib/shop-common";

// Мутациите ВРЪЩАТ { ok, error } — не хвърлят: в production Next крие текста на
// хвърлената грешка зад „Server Components render", и човек не вижда какво стана.
type Result = { ok: true } | { ok: false; error: string };
const bad = (error: string): Result => ({ ok: false, error });

const money = (v: unknown): number | null => {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
};

export async function saveShopSettings(s: {
  enabled: boolean;
  office: string;
  apt: string;
  address: string;
  freeFrom: string;
  nap: string;
}): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return bad("Няма достъп.");
  }
  const vals = [money(s.office), money(s.apt), money(s.address), money(s.freeFrom)];
  if (vals.some((v) => Number.isNaN(v))) return bad("Цените за доставка трябва да са числа.");
  const [office, apt, address, freeFrom] = vals;
  if (s.enabled && office == null && apt == null && address == null) {
    return bad("Магазинът не може да се отвори без поне един начин на доставка с цена.");
  }
  // Номерът от НАП (прил. № 33) влиза в QR кода на всеки документ за продажба — без него не се продава.
  const nap = s.nap.trim().toUpperCase().replace(/\s+/g, "");
  if (nap && !/^[A-Z]{2}\d{5,8}$/.test(nap)) return bad("Номерът от НАП изглежда така: RF1234567.");
  if (s.enabled && !nap) return bad("Магазинът не може да се отвори без номера на е-магазина от НАП.");
  const supabase = await getDb();
  const { error } = await supabase
    .from("site_settings")
    .update({
      shop_enabled: s.enabled,
      shop_shipping_office_eur: office,
      shop_shipping_apt_eur: apt,
      shop_shipping_address_eur: address,
      shop_free_shipping_from_eur: freeFrom,
      nap_eshop_number: nap || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return bad(error.message);
  revalidatePath("/shop");
  revalidatePath("/magazin", "layout");
  return { ok: true };
}

export type ShopItemPayload = {
  title: string;
  subtitle: string;
  pack_label: string;
  units_per_pack: string;
  net_weight_g: string;
  price_eur: string;
  description: string;
  ingredients_text: string;
  allergens_text: string;
  storage_text: string;
  warning_text: string;
  shelf_life_days: string;
  energy_kj: string;
  energy_kcal: string;
  fat_g: string;
  saturates_g: string;
  carbs_g: string;
  sugars_g: string;
  protein_g: string;
  salt_g: string;
  images: string[];
  reviews: { text: string; author: string }[];
  ship_weight_g: string;
  stock_qty: string;
  max_per_order: string;
  is_active: boolean;
};

export async function saveShopItem(id: number, p: ShopItemPayload): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return bad("Няма достъп.");
  }
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const int = (v: string) => {
    const n = num(v);
    return n == null ? null : Math.round(n);
  };
  const price = money(p.price_eur);
  if (Number.isNaN(price)) return bad("Цената трябва да е число.");
  if (p.is_active && price == null) return bad("Без цена артикулът не може да е активен.");
  if (!p.title.trim() || !p.pack_label.trim()) return bad("Заглавието и опаковката са задължителни.");
  const net = int(p.net_weight_g);
  if (!net || net <= 0) return bad("Нето масата е задължителна.");

  const nutr = ["energy_kj", "energy_kcal", "fat_g", "saturates_g", "carbs_g", "sugars_g", "protein_g", "salt_g"] as const;
  const n: Record<string, number | null> = {};
  for (const k of nutr) {
    const v = num(p[k]);
    if (v != null && (!Number.isFinite(v) || v < 0)) return bad("Хранителните стойности трябва да са числа.");
    n[k] = v;
  }

  const supabase = await getDb();
  const { error } = await supabase
    .from("shop_items")
    .update({
      title: p.title.trim(),
      subtitle: p.subtitle.trim() || null,
      pack_label: p.pack_label.trim(),
      units_per_pack: int(p.units_per_pack) ?? 1,
      net_weight_g: net,
      price_eur: price,
      description: p.description.trim() || null,
      ingredients_text: p.ingredients_text.trim() || null,
      allergens_text: p.allergens_text.trim() || null,
      storage_text: p.storage_text.trim() || null,
      warning_text: p.warning_text.trim() || null,
      shelf_life_days: int(p.shelf_life_days),
      ...n,
      images: p.images,
      reviews: p.reviews.filter((r) => r.text.trim() && r.author.trim()),
      ship_weight_g: int(p.ship_weight_g) ?? 1000,
      stock_qty: int(p.stock_qty),
      max_per_order: int(p.max_per_order) ?? 5,
      is_active: p.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return bad(error.message);
  revalidatePath("/shop");
  revalidatePath("/magazin", "layout");
  return { ok: true };
}

const STAMP: Partial<Record<OrderStatus, string>> = {
  packed: "packed_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
};

/** Без партида кутия не тръгва — иначе при изтегляне не се знае до кого е стигнала. */
async function needsBatch(id: number): Promise<string | null> {
  const supabase = await getDb();
  const { data } = await supabase.from("orders").select("batch_label, is_test").eq("id", id).maybeSingle();
  if (!data) return "Поръчката не е намерена.";
  if (!data.is_test && !String(data.batch_label ?? "").trim()) {
    return "Първо запиши партидата (датата „Най-добър до“ от етикета на кутиите).";
  }
  return null;
}

export async function saveOrderBatch(id: number, batch: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return bad("Няма достъп.");
  }
  const value = batch.trim().replace(/\s+/g, " ").slice(0, 80);
  const supabase = await getDb();
  const { error } = await supabase
    .from("orders")
    .update({ batch_label: value || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return bad(error.message);
  revalidatePath("/orders");
  return { ok: true };
}

export async function setOrderStatus(id: number, status: OrderStatus): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return bad("Няма достъп.");
  }
  if (status === "packed" || status === "shipped") {
    const missing = await needsBatch(id);
    if (missing) return bad(missing);
  }
  const supabase = await getDb();
  const stamp = STAMP[status];
  const { error } = await supabase
    .from("orders")
    .update({ status, ...(stamp ? { [stamp]: new Date().toISOString() } : {}), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return bad(error.message);
  revalidatePath("/orders");
  return { ok: true };
}

export async function saveOrderNote(id: number, note: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return bad("Няма достъп.");
  }
  const supabase = await getDb();
  const { error } = await supabase
    .from("orders")
    .update({ admin_note: note.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return bad(error.message);
  return { ok: true };
}

/**
 * Товарителница в Спиди → поръчката става „изпратена" и клиентът получава
 * номера за проследяване. ⚠️ Създава ИСТИНСКА пратка — Спиди няма тестова среда.
 */
export async function createOrderWaybill(id: number): Promise<Result & { waybill?: string }> {
  try {
    await requireAdmin();
  } catch {
    return bad("Няма достъп.");
  }
  if (!speedyConfigured()) return bad("Спиди не е настроен (SPEEDY_USER / SPEEDY_PASS във Vercel).");
  const order = await adminGetOrder(id);
  if (!order) return bad("Поръчката не е намерена.");
  if (!order.is_test && !order.batch_label?.trim()) {
    return bad("Първо запиши партидата (датата „Най-добър до“ от етикета на кутиите).");
  }
  if (order.is_test) {
    return bad("Пробна поръчка (тестов режим на Stripe) — товарителница не се прави: при Спиди всяка е истинска пратка.");
  }
  if (order.waybill_id) return bad(`Вече има товарителница ${order.waybill_id}.`);
  if (order.status !== "paid" && order.status !== "packed") return bad("Товарителница се прави за платена поръчка.");

  // Теглото — от артикулите към момента (кутиите не сменят теглото си).
  const supabase = await getDb();
  const ids = order.items.map((i) => i.shop_item_id).filter((x): x is number => x != null);
  const { data: items } = await supabase.from("shop_items").select("id, ship_weight_g").in("id", ids);
  const w = new Map((items ?? []).map((r) => [Number(r.id), Number(r.ship_weight_g) || 1000]));
  const weightG = order.items.reduce((a, i) => a + (w.get(i.shop_item_id ?? -1) ?? 1000) * i.qty, 0);

  const r = await createShipment({ ...order, weightG });
  if (!r.ok) return bad(`Спиди: ${r.error}`);

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("orders")
    .update({ waybill_id: r.waybill, status: "shipped", shipped_at: now, updated_at: now })
    .eq("id", id);
  if (error) return bad(`Товарителница ${r.waybill} е създадена, но не се записа: ${error.message}`);

  const sent = await sendShippedEmail({ ...order, waybill_id: r.waybill }, trackingUrl(r.waybill));
  if (!sent.sent) console.error("[waybill] имейл до клиента:", sent.error);
  revalidatePath("/orders");
  return { ok: true, waybill: r.waybill };
}
