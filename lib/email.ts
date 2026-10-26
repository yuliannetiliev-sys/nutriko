import { COMPANY } from "@/lib/company";
import { eur } from "@/lib/price";
import { DELIVERY_LABEL } from "@/lib/shop-common";
import { deliveryLine, type Order } from "@/lib/orders";
import { getShopSettings } from "@/lib/shop";
import { SALE_DOC_TITLE, TAX_GROUP, PAYMENT_LABEL, SELLER_LINES, docNumber, sofiaParts } from "@/lib/sale-doc";

// Изпращане на транзакционни имейли през Resend (директно през REST API, без SDK).
// Ползва се за известяване на собственика при ново запитване от контактната форма.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Подател — верифициран домейн в Resend. Сменяй тук, ако смениш домейна.
const FROM = "Нутрико <noreply@nutriko.fit>";

// Резервен получател, ако contact_to_email не е попълнен в админа.
const FALLBACK_TO = "yulian.net.iliev@gmail.com";

function looksLikeEmail(s: string | null | undefined): s is string {
  if (!s) return false;
  // Само ASCII имейл — Resend отказва non-ASCII знаци в адресите (to / reply_to).
  return /^[\w.!#$%&'*+/=?^`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(s.trim());
}

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"));
}

// Известява собственика за ново запитване. Никога не хвърля грешка — само връща дали е изпратено.
export async function sendContactNotification(opts: {
  to: string | null;
  name: string;
  contact: string | null;
  message: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, error: "RESEND_API_KEY липсва" };

  const to = looksLikeEmail(opts.to) ? opts.to.trim() : FALLBACK_TO;
  const contact = opts.contact?.trim() || "—";

  const text =
    `Ново запитване от формата на nutriko.fit:\n\n` +
    `Име: ${opts.name}\n` +
    `Контакт: ${contact}\n\n` +
    `Съобщение:\n${opts.message}\n`;

  const html =
    `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.6">` +
    `<h2 style="margin:0 0 12px;color:#1f4733">Ново запитване от сайта</h2>` +
    `<p style="margin:0 0 4px"><b>Име:</b> ${esc(opts.name)}</p>` +
    `<p style="margin:0 0 12px"><b>Контакт:</b> ${esc(contact)}</p>` +
    `<p style="margin:0 0 4px"><b>Съобщение:</b></p>` +
    `<div style="white-space:pre-wrap;background:#f6f5f1;border-radius:10px;padding:12px 14px">${esc(
      opts.message
    )}</div>` +
    `<p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Изпратено автоматично от контактната форма на nutriko.fit</p>` +
    `</div>`;

  const body: Record<string, unknown> = {
    from: FROM,
    to: [to],
    subject: `Ново запитване от сайта — ${opts.name}`,
    text,
    html,
  };
  // Ако клиентът е оставил имейл, отговорът отива директно към него.
  if (looksLikeEmail(opts.contact)) body.reply_to = opts.contact!.trim();

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { sent: false, error: `Resend ${res.status}: ${detail.slice(0, 300)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Непозната грешка" };
  }
}

// ── Онлайн магазин ─────────────────────────────────────────────────────────


const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutriko.fit";

async function send(body: Record<string, unknown>): Promise<{ sent: boolean; error?: string }> {
  // За локални проби: имейлът се пише в конзолата, не се праща.
  if (process.env.SHOP_EMAIL_DRY_RUN === "1") {
    console.log("[email dry-run]", body.to, "—", body.subject);
    const dir = process.env.SHOP_EMAIL_DRY_RUN_DIR;
    if (dir) {
      const { writeFile } = await import("node:fs/promises");
      const name = String(body.subject).replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60);
      await writeFile(`${dir}/${Date.now()}-${name}.html`, String(body.html ?? ""), "utf8").catch(() => {});
    }
    return { sent: true };
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, error: "RESEND_API_KEY липсва" };
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, ...body }),
    });
    if (!res.ok) return { sent: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Непозната грешка" };
  }
}

function itemsTable(o: Order): string {
  const row = (l: string, r: string, strong = false) =>
    `<tr><td style="padding:6px 0;${strong ? "font-weight:600" : ""}">${l}</td>` +
    `<td style="padding:6px 0;text-align:right;white-space:nowrap;${strong ? "font-weight:600" : ""}">${r}</td></tr>`;
  return (
    `<table style="width:100%;border-collapse:collapse;font-size:15px">` +
    o.items.map((i) => row(`${i.qty} × ${esc(i.title)}`, eur(i.line_total_eur))).join("") +
    row(o.shipping_eur > 0 ? "Доставка" : "Доставка (безплатна)", eur(o.shipping_eur)) +
    `<tr><td colspan="2" style="border-top:1px solid #e5e7eb"></td></tr>` +
    row("Общо", eur(o.total_eur), true) +
    `</table>`
  );
}

// Цял документ с viewport — иначе пощата на телефона го показва смален като за компютър.
const wrap = (inner: string) =>
  `<!doctype html><html lang="bg"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:16px">` +
  `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.6;max-width:560px">${inner}</div>` +
  `</body></html>`;

const sellerBlock =
  `<p style="margin:20px 0 0;font-size:12px;color:#6b7280;line-height:1.5">` +
  `${COMPANY.name} · ЕИК ${COMPANY.eik}<br>${COMPANY.seat}<br>` +
  `${COMPANY.phone} · ${COMPANY.email} · ${COMPANY.site}</p>`;

/** Документът по чл. 52о от Н-18 — в имейла, с QR кода като картинка (Gmail не показва data: адреси). */
function saleDocBlock(o: Order, napEshopNumber: string | null): string {
  if (!o.doc_number || !o.doc_issued_at) {
    return (
      `<div style="margin:18px 0 0;padding:12px 14px;background:#fff4e5;border-radius:10px;font-size:13px">` +
      `<b>Пробна поръчка ${o.number}</b> — платена в тестов режим, без документ за продажба.</div>`
    );
  }
  const t = sofiaParts(o.doc_issued_at);
  const td = (v: string, align = "left") => `<td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:${align}">${v}</td>`;
  const row = (name: string, qty: number, unit: number, total: number) =>
    `<tr>${td(esc(name))}${td(TAX_GROUP, "center")}${td(String(qty), "right")}${td(eur(unit), "right")}${td(eur(total), "right")}</tr>`;
  const rows =
    o.items.map((i) => row(i.title, i.qty, i.unit_price_eur, i.line_total_eur)).join("") +
    (o.shipping_eur > 0 ? row("Доставка със Спиди", 1, o.shipping_eur, o.shipping_eur) : "");
  return (
    `<div style="margin:18px 0 0;padding:14px;border:1px solid #d6d3cc;border-radius:10px;font-size:13px;line-height:1.5">` +
    `<b style="font-size:14px">${SALE_DOC_TITLE} № ${docNumber(o.doc_number)}</b><br>${t.display}<br><br>` +
    SELLER_LINES.map(esc).join("<br>") +
    (napEshopNumber ? `<br>Електронен магазин ${COMPANY.site} · № в НАП ${esc(napEshopNumber)}` : "") +
    `<br><br>Поръчка: <b>${o.number}</b><br>Трансакция: ${esc(o.stripe_payment_intent ?? "")}` +
    `<table style="width:100%;border-collapse:collapse;margin:10px 0 6px;font-size:13px">` +
    `<tr style="color:#6b7280">${td("Стока")}${td("Гр.", "center")}${td("К-во", "right")}${td("Ед. цена", "right")}${td("Стойност", "right")}</tr>` +
    rows +
    `</table>` +
    `<b>Обща сума: ${eur(o.total_eur)}</b><br>Плащане: ${PAYMENT_LABEL}<br>` +
    `<span style="color:#6b7280">Продавачът не е регистриран по ЗДДС.</span>` +
    (napEshopNumber
      ? `<br><img src="${SITE}/api/shop/doc-qr/${o.doc_token}" width="160" height="160" alt="QR код на документа" style="margin-top:10px">`
      : "") +
    `<br><a href="${SITE}/magazin/dokument/${o.doc_token}" style="color:#1f4733">Документът онлайн</a>` +
    `</div>`
  );
}

/** До клиента веднага след плащането. В него е и документът за продажбата (чл. 52о от Н-18). */
export async function sendOrderConfirmation(o: Order) {
  const { napEshopNumber } = await getShopSettings();
  const html = wrap(
    `<h2 style="margin:0 0 8px;color:#1f4733">Благодарим, ${esc(o.customer_name.split(" ")[0])}!</h2>` +
      `<p style="margin:0 0 14px">Поръчката ти е приета и платена. Изпращаме я до 1 работен ден — ` +
      `ще получиш втори имейл с номера за проследяване от Спиди.</p>` +
      itemsTable(o) +
      `<p style="margin:16px 0 4px"><b>Доставка:</b> ${DELIVERY_LABEL[o.delivery_type]} — ${esc(deliveryLine(o))}</p>` +
      `<p style="margin:0 0 4px"><b>Получател:</b> ${esc(o.customer_name)}, ${esc(o.phone)}</p>` +
      `<p style="margin:0 0 4px"><b>Плащане:</b> банкова карта, през Stripe` +
      (o.stripe_payment_intent ? ` · транзакция ${esc(o.stripe_payment_intent)}` : "") +
      `</p>` +
      saleDocBlock(o, napEshopNumber) +
      `<p style="margin:14px 0 0;font-size:13px">Въпроси? Просто отговори на този имейл. ` +
      `<a href="${SITE}/usloviya" style="color:#1f4733">Общи условия</a> · ` +
      `<a href="${SITE}/dostavka" style="color:#1f4733">Доставка и връщане</a></p>` +
      sellerBlock
  );
  return send({
    to: [o.email],
    reply_to: COMPANY.email,
    subject: `${o.is_test ? "[ТЕСТ] " : ""}Поръчка ${o.number} е приета — ${COMPANY.brand}`,
    html,
  });
}

/** До собственика — да опакова. */
export async function sendNewOrderAlert(o: Order, to: string | null) {
  const html = wrap(
    `<h2 style="margin:0 0 8px;color:#1f4733">Нова поръчка ${o.number}</h2>` +
      itemsTable(o) +
      `<p style="margin:16px 0 4px"><b>Клиент:</b> ${esc(o.customer_name)} · ${esc(o.phone)} · ${esc(o.email)}</p>` +
      `<p style="margin:0 0 4px"><b>Доставка:</b> ${DELIVERY_LABEL[o.delivery_type]} — ${esc(deliveryLine(o))}</p>` +
      (o.customer_note ? `<p style="margin:0 0 4px"><b>Бележка:</b> ${esc(o.customer_note)}</p>` : "") +
      `<p style="margin:16px 0 0"><a href="${SITE}/orders/${o.id}" style="display:inline-block;background:#1f4733;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Отвори в админа</a></p>`
  );
  return send({
    to: [looksLikeEmail(to) ? to.trim() : FALLBACK_TO],
    reply_to: o.email,
    subject: `${o.is_test ? "[ТЕСТ] " : ""}🛒 Нова поръчка ${o.number} — ${eur(o.total_eur)}`,
    html,
  });
}

/** До клиента, щом има товарителница. */
export async function sendShippedEmail(o: Order, trackingUrl: string) {
  const html = wrap(
    `<h2 style="margin:0 0 8px;color:#1f4733">Поръчката ти пътува</h2>` +
      `<p style="margin:0 0 12px">Поръчка <b>${o.number}</b> е предадена на Спиди. Номер на товарителницата: <b>${esc(o.waybill_id ?? "")}</b>.</p>` +
      `<p style="margin:0 0 16px"><a href="${trackingUrl}" style="display:inline-block;background:#1f4733;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Проследи пратката</a></p>` +
      `<p style="margin:0 0 4px"><b>Доставка:</b> ${DELIVERY_LABEL[o.delivery_type]} — ${esc(deliveryLine(o))}</p>` +
      `<p style="margin:14px 0 0;font-size:13px">Пази вафлите на сухо и хладно място, до 25 °C. Да ти е сладко!</p>` +
      sellerBlock
  );
  return send({
    to: [o.email],
    reply_to: COMPANY.email,
    subject: `Поръчка ${o.number} е изпратена — ${COMPANY.brand}`,
    html,
  });
}
