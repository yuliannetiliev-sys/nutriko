import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { serviceDb } from "@/lib/supabase";
import { getOrderBySession, markOrderPaid, deliveryLine } from "@/lib/orders";
import { getCheckoutSession } from "@/lib/stripe";
import { sendOrderConfirmation, sendNewOrderAlert } from "@/lib/email";
import { getSiteSettings } from "@/lib/data";
import { DELIVERY_LABEL } from "@/lib/shop-common";
import { eur } from "@/lib/price";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Благодарим за поръчката", robots: { index: false, follow: false } };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/magazin");

  let order = await getOrderBySession(session_id);

  // Ако webhook-ът още не е стигнал, питаме Stripe направо. markOrderPaid е
  // безопасна при повторение — имейлите тръгват веднъж, от който стигне първи.
  if (order?.status === "pending") {
    const s = await getCheckoutSession(session_id);
    const sdb = serviceDb();
    if (s?.payment_status === "paid" && s.metadata?.source === "nutriko-shop" && sdb) {
      const res = await markOrderPaid(sdb, order.id, {
        id: s.id,
        payment_intent: typeof s.payment_intent === "string" ? s.payment_intent : null,
        amount_total: typeof s.amount_total === "number" ? s.amount_total : null,
        livemode: typeof s.livemode === "boolean" ? s.livemode : null,
      });
      if (res.changed && res.order) {
        const settings = await getSiteSettings();
        await Promise.all([sendOrderConfirmation(res.order), sendNewOrderAlert(res.order, settings.contact_to_email)]);
      }
      if (res.order) order = res.order;
    }
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">Не намираме поръчката</h1>
        <p className="mt-3 text-ink/80">
          Ако плащането е минало, ще получиш имейл с потвърждение. За всеки случай ни пиши на{" "}
          <a href="mailto:info@nutriko.fit" className="text-brand-600 underline">
            info@nutriko.fit
          </a>
          .
        </p>
      </div>
    );
  }

  // Връзката може да бъде отворена и по-късно — когато поръчката вече е отказана или върната.
  const state =
    order.status === "pending" ? "pending" : order.status === "cancelled" || order.status === "refunded" ? "closed" : "paid";

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <p className="text-5xl">{state === "paid" ? "🎉" : state === "pending" ? "⏳" : "ℹ️"}</p>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink">
        {state === "paid"
          ? "Благодарим!"
          : state === "pending"
            ? "Плащането се обработва"
            : order.status === "refunded"
              ? "Парите са върнати"
              : "Поръчката е отказана"}
      </h1>
      <p className="mt-3 leading-relaxed text-ink/80">
        {state === "paid" ? (
          <>
            Поръчка <b>{order.number}</b> е приета и платена. Изпратихме потвърждение на <b>{order.email}</b>. Изпращаме я
            до 1 работен ден — ще получиш втори имейл с номера за проследяване.
          </>
        ) : state === "pending" ? (
          <>
            Поръчка <b>{order.number}</b> чака потвърждение от банката. Щом дойде, ще получиш имейл на <b>{order.email}</b>.
          </>
        ) : (
          <>
            Поръчка <b>{order.number}</b> е отказана
            {order.status === "refunded" ? " и сумата е възстановена по картата ти" : ""}. Въпроси:{" "}
            <a href="mailto:info@nutriko.fit" className="text-brand-600 underline">
              info@nutriko.fit
            </a>
            .
          </>
        )}
      </p>

      <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        {order.items.map((i, k) => (
          <div key={k} className="flex justify-between gap-3 py-1">
            <span className="text-ink/80">
              {i.qty} × {i.title}
            </span>
            <span className="tabular-nums">{eur(i.line_total_eur)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3 py-1">
          <span className="text-ink/80">Доставка</span>
          <span className="tabular-nums">{order.shipping_eur === 0 ? "безплатна" : eur(order.shipping_eur)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-3 border-t border-ink/10 pt-2 font-semibold">
          <span>Общо</span>
          <span className="tabular-nums">{eur(order.total_eur)}</span>
        </div>
        <p className="mt-4 text-ink/80">
          <span className="text-muted">{DELIVERY_LABEL[order.delivery_type]}:</span> {deliveryLine(order)}
        </p>
      </div>

      <Link href="/" className="mt-8 inline-block text-sm font-medium text-brand-600 hover:text-brand">
        ← Към началната
      </Link>
    </div>
  );
}
