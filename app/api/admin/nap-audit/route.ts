import { requireAdmin, getDb } from "@/lib/supabase";
import { buildNapAudit, toCp1251 } from "@/lib/nap-audit";

/** Месечният одиторски файл за НАП (прил. № 38) — `?ym=2026-11`. Само за админи. */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Няма достъп.", { status: 401 });
  }
  const ym = new URL(request.url).searchParams.get("ym") ?? "";
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return new Response("Месецът е във вида 2026-11.", { status: 400 });

  const r = await buildNapAudit(await getDb(), Number(m[1]), Number(m[2]));
  if (!r.ok) {
    return new Response(r.error, { status: 422, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return new Response(toCp1251(r.xml), {
    headers: {
      "content-type": "application/xml; charset=windows-1251",
      "content-disposition": `attachment; filename="nutriko-nap-${ym}.xml"`,
      "cache-control": "no-store",
    },
  });
}
