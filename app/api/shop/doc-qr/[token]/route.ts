import QRCode from "qrcode";
import { getOrderByDocToken } from "@/lib/orders";
import { getShopSettings } from "@/lib/shop";
import { qrPayload } from "@/lib/sale-doc";

/**
 * QR кодът на документа за продажба (прил. № 18а) като PNG — за имейла и страницата.
 * Адресът е по тайния ключ на поръчката, не по номера, за да не може да се изреждат.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [order, settings] = await Promise.all([getOrderByDocToken(token), getShopSettings()]);
  if (!order?.doc_number || !order.doc_issued_at || !settings.napEshopNumber) {
    return new Response("Няма такъв документ.", { status: 404 });
  }
  const png = await QRCode.toBuffer(qrPayload({ ...order, doc_number: order.doc_number, doc_issued_at: order.doc_issued_at }, settings.napEshopNumber), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
  });
  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
  });
}
