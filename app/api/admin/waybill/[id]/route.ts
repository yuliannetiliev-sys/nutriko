import { requireAdmin } from "@/lib/supabase";
import { adminGetOrder } from "@/lib/orders";
import { printLabel } from "@/lib/speedy";

// PDF на товарителницата на поръчка — за печат и залепване на кутията.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Няма достъп.", { status: 403 });
  }
  const { id } = await ctx.params;
  const order = await adminGetOrder(Number(id));
  if (!order?.waybill_id) return new Response("Няма товарителница.", { status: 404 });

  const r = await printLabel(order.waybill_id);
  if (!r.ok) return new Response(`Спиди: ${r.error}`, { status: 502 });
  return new Response(r.pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="tovaritelnica-${order.number}.pdf"`,
    },
  });
}
