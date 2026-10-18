import { NextResponse } from "next/server";
import { searchSites, listOffices, speedyConfigured } from "@/lib/speedy";

// Посредник към Спиди за формата за поръчка: градове и офиси/автомати.
// Само четене — ключовете остават на сървъра, а браузърът не може да прати
// нищо друго към Спиди през този адрес.
export async function POST(request: Request) {
  if (!speedyConfigured()) {
    return NextResponse.json({ error: "Изборът на офис временно не работи." }, { status: 503 });
  }
  const body = await request.json().catch(() => null);

  if (body?.action === "sites") {
    const name = String(body.name ?? "").trim();
    if (name.length < 2) return NextResponse.json({ sites: [] });
    return NextResponse.json({ sites: await searchSites(name) });
  }

  if (body?.action === "offices") {
    const siteId = Number(body.siteId);
    const kind = body.kind === "apt" ? "APT" : "OFFICE";
    if (!Number.isInteger(siteId) || siteId <= 0) return NextResponse.json({ offices: [] });
    const offices = (await listOffices(siteId)).filter((o) => o.kind === kind);
    return NextResponse.json({ offices });
  }

  return NextResponse.json({ error: "Непозната заявка." }, { status: 400 });
}
