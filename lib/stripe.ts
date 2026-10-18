import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Stripe през REST, без SDK — както при книгите на Apex. Акаунтът е „Нутрико",
// отделен от този на Apex: свое име на страницата за плащане и на извлечението.

const API = "https://api.stripe.com/v1/";

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** „test“ с ключ sk_test_… (карта 4242 4242 4242 4242), „live“ — истински плащания. */
export function stripeMode(): "test" | "live" | null {
  const k = process.env.STRIPE_SECRET_KEY ?? "";
  return k.startsWith("sk_test_") || k.startsWith("rk_test_") ? "test" : k ? "live" : null;
}

async function stripe(path: string, init: { method?: string; body?: URLSearchParams } = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false as const, error: "STRIPE_SECRET_KEY липсва" };
  try {
    const res = await fetch(API + path, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: init.body?.toString(),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, error: data?.error?.message ?? `Stripe ${res.status}` };
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Stripe не отговаря" };
  }
}

export type CheckoutInput = {
  orderId: number;
  orderNumber: string;
  email: string;
  lines: { name: string; unitCents: number; qty: number }[];
  shipping: { name: string; cents: number };
  successUrl: string;
  cancelUrl: string;
};

export async function createCheckoutSession(o: CheckoutInput) {
  const p = new URLSearchParams();
  p.set("mode", "payment");
  // Само карта: тя минава веднага. Apple Pay и Google Pay вървят като карта.
  // Отложени методи (преводи) биха оставили поръчката „платена" по-късно.
  p.set("payment_method_types[0]", "card");
  p.set("locale", "bg");
  p.set("customer_email", o.email);
  p.set("client_reference_id", o.orderNumber);
  p.set("success_url", o.successUrl);
  p.set("cancel_url", o.cancelUrl);
  // Сесията изтича след час — после поръчката става „отказана".
  p.set("expires_at", String(Math.floor(Date.now() / 1000) + 60 * 60));

  o.lines.forEach((l, i) => {
    p.set(`line_items[${i}][quantity]`, String(l.qty));
    p.set(`line_items[${i}][price_data][currency]`, "eur");
    p.set(`line_items[${i}][price_data][unit_amount]`, String(l.unitCents));
    p.set(`line_items[${i}][price_data][product_data][name]`, l.name);
  });

  p.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  p.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(o.shipping.cents));
  p.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "eur");
  p.set("shipping_options[0][shipping_rate_data][display_name]", o.shipping.name);

  // По source webhook-ът познава своите плащания — и подминава всичко друго.
  for (const [k, v] of Object.entries({
    source: "nutriko-shop",
    order_id: String(o.orderId),
    order_number: o.orderNumber,
  })) {
    p.set(`metadata[${k}]`, v);
    p.set(`payment_intent_data[metadata][${k}]`, v);
  }
  p.set("payment_intent_data[description]", `Нутрико — поръчка ${o.orderNumber}`);

  const r = await stripe("checkout/sessions", { method: "POST", body: p });
  if (!r.ok) return r;
  return { ok: true as const, id: r.data.id as string, url: r.data.url as string };
}

export async function getCheckoutSession(id: string) {
  const r = await stripe(`checkout/sessions/${encodeURIComponent(id)}`);
  return r.ok ? r.data : null;
}

/**
 * Подписът на webhook-а: HMAC-SHA256 на „t.payload" с тайната на endpoint-а.
 * Без проверката всеки може да прати „платено" и да получи кутия безплатно.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSec = 300
): boolean {
  if (!header) return false;
  const parts = header.split(",").map((s) => {
    const i = s.indexOf("=");
    return [s.slice(0, i).trim(), s.slice(i + 1).trim()] as const;
  });
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || sigs.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const exp = Buffer.from(expected);
  return sigs.some((s) => {
    const got = Buffer.from(s);
    return got.length === exp.length && timingSafeEqual(got, exp);
  });
}
