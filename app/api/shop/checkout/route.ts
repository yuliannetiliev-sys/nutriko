import { NextResponse } from "next/server";
import { serviceDb, isAdmin } from "@/lib/supabase";
import { getShopSettings, priceCart } from "@/lib/shop";
import { createCheckoutSession, stripeConfigured } from "@/lib/stripe";
import { createPendingOrder, attachSession } from "@/lib/orders";
import { DELIVERY_TYPES, type DeliveryType } from "@/lib/shop-common";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const intOrNull = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Поръчка → плащане. Записва поръчката като „чака плащане" и връща адреса на
 * Stripe. Платена става чак от webhook-а (или от страницата „Благодарим") —
 * никога от браузъра.
 */
export async function POST(request: Request) {
  const settings = await getShopSettings();
  // Изключен магазин: само влезлият админ може да направи пробна поръчка.
  if (!settings.enabled && !(await isAdmin())) return fail("Онлайн поръчките още не са отворени.", 403);

  const sdb = serviceDb();
  if (!sdb || !stripeConfigured()) return fail("Плащанията временно не работят. Опитайте по-късно.", 503);

  const b = await request.json().catch(() => null);
  if (!b) return fail("Невалидна заявка.");

  // ── Клиент ──
  const name = clip(b.customer?.name, 80);
  const phone = clip(b.customer?.phone, 25).replace(/[^\d+]/g, "");
  const email = clip(b.customer?.email, 120).toLowerCase();
  if (name.length < 3) return fail("Попълнете име и фамилия.");
  if (!/^\+?\d{9,15}$/.test(phone)) return fail("Телефонът изглежда непълен.");
  if (!/^[\w.!#$%&'*+/=?^`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(email)) {
    return fail("Имейлът изглежда грешен.");
  }
  if (b.termsAccepted !== true) return fail("Нужно е съгласие с общите условия.");

  // ── Доставка ──
  const type = b.delivery?.type as DeliveryType;
  if (!DELIVERY_TYPES.includes(type)) return fail("Изберете начин на доставка.");
  const d = b.delivery;
  const delivery = {
    type,
    siteId: intOrNull(d.siteId),
    cityName: clip(d.cityName, 80) || null,
    postcode: clip(d.postcode, 10) || null,
    officeId: type === "address" ? null : intOrNull(d.officeId),
    officeName: type === "address" ? null : clip(d.officeName, 160) || null,
    street: type === "address" ? clip(d.street, 80) || null : null,
    no: type === "address" ? clip(d.no, 20) || null : null,
    details: type === "address" ? clip(d.details, 120) || null : null,
  };
  if (!delivery.siteId || !delivery.cityName) return fail("Изберете населено място от списъка.");
  if (type !== "address" && !delivery.officeId) return fail("Изберете офис или автомат от списъка.");
  if (type === "address" && (!delivery.street || !delivery.no)) return fail("Попълнете улица и номер.");

  // ── Сметката — от базата ──
  const priced = await priceCart(Array.isArray(b.items) ? b.items : [], type, settings);
  if (!priced.ok) return fail(priced.error);
  const cart = priced.cart;

  const order = await createPendingOrder(sdb, cart, {
    customer: { name, phone, email },
    delivery,
    note: clip(b.note, 500) || null,
  });
  if (!order.ok) return fail("Поръчката не се записа. Опитайте отново.", 500);

  const origin = new URL(request.url).origin;
  const slug = cart.lines[0].item.slug;
  const session = await createCheckoutSession({
    orderId: order.id,
    orderNumber: order.number,
    email,
    lines: cart.lines.map((l) => ({
      name: `${l.item.title} — ${l.item.pack_label}`,
      unitCents: l.unitCents,
      qty: l.qty,
    })),
    shipping: { name: cart.shippingName, cents: cart.shippingCents },
    successUrl: `${origin}/magazin/blagodarim?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/magazin/${slug}?prekasnato=1`,
  });

  if (!session.ok) {
    await sdb
      .from("orders")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), admin_note: `Stripe: ${session.error}` })
      .eq("id", order.id);
    return fail("Плащането не можа да започне. Опитайте отново след малко.", 502);
  }

  await attachSession(sdb, order.id, session.id);
  return NextResponse.json({ url: session.url });
}
