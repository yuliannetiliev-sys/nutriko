import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { listActiveShopItems, adminListShopItems, getShopSettings } from "@/lib/shop";
import { isAdmin } from "@/lib/supabase";
import { eur } from "@/lib/price";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getShopSettings();
  return {
    title: "Онлайн поръчка с доставка",
    description: "Вафли и десерти от Нутрико с доставка със Спиди до цяла България.",
    alternates: { canonical: "/magazin" },
    ...(s.enabled ? {} : { robots: { index: false, follow: false } }),
  };
}

// Докато има един артикул, списъкът само пречи — водим направо към него.
export default async function ShopIndex() {
  // Админът вижда и скритите артикули — за прегледа преди пускане.
  const items = (await isAdmin()) ? await adminListShopItems() : await listActiveShopItems();
  if (items.length === 1) redirect(`/magazin/${items[0].slug}`);

  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Онлайн поръчка</h1>
      {items.length === 0 ? (
        <p className="mt-4 text-ink/80">Онлайн поръчките стартират скоро.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Link key={it.id} href={`/magazin/${it.slug}`} className="group overflow-hidden rounded-3xl border border-ink/10 bg-white">
              <div className="relative aspect-[4/3] bg-brand-50">
                {it.images[0] && (
                  <Image src={it.images[0]} alt={it.title} fill sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                )}
              </div>
              <div className="p-5">
                <p className="font-display text-xl font-semibold text-ink group-hover:text-brand">{it.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {it.pack_label}
                  {it.price_eur != null ? ` · ${eur(it.price_eur)}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
