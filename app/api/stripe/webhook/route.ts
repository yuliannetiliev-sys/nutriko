import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";
import { verifyStripeSignature } from "@/lib/stripe";
import { markOrderPaid, markOrderExpired, markRefunded } from "@/lib/orders";
import { sendOrderConfirmation, sendNewOrderAlert } from "@/lib/email";
import { getSiteSettings } from "@/lib/data";

const ok = () => NextResponse.json({ received: true });

/**
 * Stripe → тук. Записва платените поръчки и праща имейлите.
 * Абонамент в Stripe: checkout.session.completed, checkout.session.expired,
 * charge.refunded.
 *
 * Грешка 500 връщаме само когато е наша и си струва повторение (липсващ ключ):
 * Stripe опитва отново дни наред, а markOrderPaid е безопасна при повторение.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET липсва" }, { status: 500 });

  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Невалиден подпис" }, { status: 400 });
  }

  // Обектът е суров JSON от Stripe — полетата се проверяват едно по едно по-долу.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: { type: string; data: { object: any } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Невалиден JSON" }, { status: 400 });
  }
  const obj = event.data?.object ?? {};

  const sdb = serviceDb();
  if (!sdb) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY липсва" }, { status: 500 });

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (obj.metadata?.source !== "nutriko-shop") return ok(); // не е от магазина
    if (obj.payment_status !== "paid") return ok();
    const orderId = Number(obj.metadata?.order_id);
    if (!Number.isInteger(orderId)) return ok();

    const res = await markOrderPaid(sdb, orderId, {
      id: obj.id,
      payment_intent: typeof obj.payment_intent === "string" ? obj.payment_intent : null,
      amount_total: typeof obj.amount_total === "number" ? obj.amount_total : null,
      livemode: typeof obj.livemode === "boolean" ? obj.livemode : null,
    });
    if (res.changed && res.order) {
      const s = await getSiteSettings();
      const [a, b] = await Promise.all([
        sendOrderConfirmation(res.order),
        sendNewOrderAlert(res.order, s.contact_to_email),
      ]);
      if (!a.sent) console.error("[webhook] имейл до клиента:", a.error);
      if (!b.sent) console.error("[webhook] известие до собственика:", b.error);
    }
    return ok();
  }

  if (event.type === "checkout.session.expired") {
    if (obj.metadata?.source === "nutriko-shop" && obj.metadata?.order_id) {
      await markOrderExpired(sdb, Number(obj.metadata.order_id));
    }
    return ok();
  }

  if (event.type === "charge.refunded") {
    // И частичното връщане се записва (за одиторския файл); статусът се сменя само при пълно.
    if (typeof obj.payment_intent === "string" && typeof obj.amount_refunded === "number") {
      await markRefunded(sdb, obj.payment_intent, { refundedCents: obj.amount_refunded, full: obj.refunded === true });
    }
    return ok();
  }

  return ok();
}
