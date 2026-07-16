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
