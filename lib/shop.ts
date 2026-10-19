import "server-only";
import { db, getDb, num, numOrNull } from "@/lib/supabase";
import {
  shippingPrice,
  toCents,
  DELIVERY_LABEL,
  type DeliveryType,
  type ShopSettings,
} from "@/lib/shop-common";

export type Nutrition = {
  energy_kj: number | null;
  energy_kcal: number | null;
  fat_g: number | null;
  saturates_g: number | null;
  carbs_g: number | null;
  sugars_g: number | null;
  polyols_g: number | null;
  fibre_g: number | null;
  protein_g: number | null;
  salt_g: number | null;
};

export type ShopItem = {
  id: number;
  slug: string;
  product_id: number | null;
  title: string;
  subtitle: string | null;
  pack_label: string;
  units_per_pack: number;
  net_weight_g: number;
  price_eur: number | null;
  description: string | null;
  ingredients_text: string | null;
  allergens_text: string | null;
  storage_text: string | null;
  warning_text: string | null;
  shelf_life_days: number | null;
  nutrition: Nutrition;
  nutrition_note: string | null;
  reviews: { text: string; author: string }[];
  images: string[];
  ship_weight_g: number;
  stock_qty: number | null;
  max_per_order: number;
  is_active: boolean;
  sort_order: number | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapShopItem(r: any): ShopItem {
  const n = (k: string) => numOrNull(r[k]);
  return {
    id: Number(r.id),
    slug: r.slug,
    product_id: numOrNull(r.product_id),
    title: r.title,
    subtitle: r.subtitle ?? null,
    pack_label: r.pack_label,
    units_per_pack: num(r.units_per_pack) || 1,
    net_weight_g: num(r.net_weight_g),
    price_eur: numOrNull(r.price_eur),
    description: r.description ?? null,
    ingredients_text: r.ingredients_text ?? null,
    allergens_text: r.allergens_text ?? null,
    storage_text: r.storage_text ?? null,
    warning_text: r.warning_text ?? null,
    shelf_life_days: numOrNull(r.shelf_life_days),
    nutrition: {
      energy_kj: n("energy_kj"),
      energy_kcal: n("energy_kcal"),
      fat_g: n("fat_g"),
      saturates_g: n("saturates_g"),
      carbs_g: n("carbs_g"),
      sugars_g: n("sugars_g"),
      polyols_g: n("polyols_g"),
      fibre_g: n("fibre_g"),
      protein_g: n("protein_g"),
      salt_g: n("salt_g"),
    },
    nutrition_note: r.nutrition_note ?? null,
    reviews: Array.isArray(r.reviews) ? r.reviews : [],
    images: r.images ?? [],
    ship_weight_g: num(r.ship_weight_g) || 1000,
    stock_qty: numOrNull(r.stock_qty),
    max_per_order: num(r.max_per_order) || 5,
    is_active: !!r.is_active,
    sort_order: numOrNull(r.sort_order),
  };
}

export async function getShopSettings(): Promise<ShopSettings> {
  const { data } = await db().from("site_settings").select("*").eq("id", 1).maybeSingle();
  const r: any = data ?? {};
  return {
    enabled: !!r.shop_enabled,
    shipping: {
      office: numOrNull(r.shop_shipping_office_eur),
      apt: numOrNull(r.shop_shipping_apt_eur),
      address: numOrNull(r.shop_shipping_address_eur),
    },
    freeFrom: numOrNull(r.shop_free_shipping_from_eur),
  };
}

/** Публичното четене: RLS пуска само активните. */
export async function listActiveShopItems(): Promise<ShopItem[]> {
  const { data } = await db()
    .from("shop_items")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("title");
  return (data ?? []).map(mapShopItem);
}

export async function getActiveShopItem(slug: string): Promise<ShopItem | null> {
  const { data } = await db().from("shop_items").select("*").eq("slug", slug).maybeSingle();
  return data ? mapShopItem(data) : null;
}

export type CartLine = { item: ShopItem; qty: number; unitCents: number; totalCents: number };
export type PricedCart = {
  lines: CartLine[];
  itemsCents: number;
  shippingCents: number;
  totalCents: number;
  weightG: number;
  shippingName: string;
};

/**
 * Сметката на количката — винаги от базата. Браузърът праща само кое и колко;
 * цената, наличността и доставката се решават тук, иначе някой си плаща кутията
 * 1 цент.
 */
export async function priceCart(
  input: { slug: string; qty: number }[],
  type: DeliveryType,
  settings: ShopSettings
): Promise<{ ok: true; cart: PricedCart } | { ok: false; error: string }> {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "Количката е празна." };

  // Един и същ артикул два пъти → събира се.
  const wanted = new Map<string, number>();
  for (const l of input) {
    const qty = Number(l?.qty);
    if (typeof l?.slug !== "string" || !Number.isInteger(qty) || qty < 1) {
      return { ok: false, error: "Невалидно количество." };
    }
    wanted.set(l.slug, (wanted.get(l.slug) ?? 0) + qty);
  }

  const { data } = await db().from("shop_items").select("*").in("slug", [...wanted.keys()]);
  const items = new Map((data ?? []).map((r) => [r.slug as string, mapShopItem(r)]));

  const lines: CartLine[] = [];
  for (const [slug, qty] of wanted) {
    const item = items.get(slug);
    if (!item || !item.is_active || item.price_eur == null) {
      return { ok: false, error: "Някой от артикулите вече не се предлага." };
    }
    if (qty > item.max_per_order) {
      return { ok: false, error: `„${item.title}“ — най-много ${item.max_per_order} в една поръчка.` };
    }
    if (item.stock_qty != null && qty > item.stock_qty) {
      return {
        ok: false,
        error:
          item.stock_qty === 0
            ? `„${item.title}“ е изчерпан в момента.`
            : `„${item.title}“ — остават само ${item.stock_qty}.`,
      };
    }
    const unitCents = toCents(item.price_eur);
    lines.push({ item, qty, unitCents, totalCents: unitCents * qty });
  }

  const itemsCents = lines.reduce((a, l) => a + l.totalCents, 0);
  const ship = shippingPrice(settings, type, itemsCents / 100);
  if (ship == null) return { ok: false, error: "Този начин на доставка не се предлага." };
  const shippingCents = toCents(ship);

  return {
    ok: true,
    cart: {
      lines,
      itemsCents,
      shippingCents,
      totalCents: itemsCents + shippingCents,
      weightG: lines.reduce((a, l) => a + l.item.ship_weight_g * l.qty, 0),
      shippingName:
        shippingCents === 0
          ? `Безплатна доставка — ${DELIVERY_LABEL[type].toLowerCase()}`
          : `Доставка — ${DELIVERY_LABEL[type].toLowerCase()}`,
    },
  };
}

// ── Админ (през сесията — RLS пуска админа и до неактивните) ─────────────────

export async function adminListShopItems(): Promise<ShopItem[]> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("shop_items")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("title");
  return (data ?? []).map(mapShopItem);
}

/** По адрес, вкл. скритите — през сесията (RLS пуска само админите). За прегледа преди пускане. */
export async function adminGetShopItemBySlug(slug: string): Promise<ShopItem | null> {
  const supabase = await getDb();
  const { data } = await supabase.from("shop_items").select("*").eq("slug", slug).maybeSingle();
  return data ? mapShopItem(data) : null;
}

export async function adminGetShopItem(id: number): Promise<ShopItem | null> {
  const supabase = await getDb();
  const { data } = await supabase.from("shop_items").select("*").eq("id", id).maybeSingle();
  return data ? mapShopItem(data) : null;
}
