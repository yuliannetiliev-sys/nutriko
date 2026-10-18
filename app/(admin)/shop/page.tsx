import Link from "next/link";
import { getShopSettings, adminListShopItems } from "@/lib/shop";
import { eur } from "@/lib/price";
import { stripeMode } from "@/lib/stripe";
import ShopSettingsForm from "./ShopSettingsForm";

export const dynamic = "force-dynamic";

// Какво още липсва във Vercel — магазинът не може да приема плащания без него.
// Показва само имената, никога стойностите.
function missingEnv(): string[] {
  return ["SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SPEEDY_USER", "SPEEDY_PASS"].filter(
    (k) => !process.env[k]
  );
}

export default async function ShopAdminPage() {
  const [settings, items] = await Promise.all([getShopSettings(), adminListShopItems()]);
  const missing = missingEnv();
  const mode = stripeMode();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Онлайн магазин</h1>
        <Link href="/orders" className="text-sm text-neutral-500 hover:text-neutral-900">
          Поръчки →
        </Link>
      </div>

      {missing.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Не е готов за плащания.</b> Във Vercel липсват: {missing.join(", ")}.
          Докато ги няма, страницата се вижда, но поръчка не може да се направи.
        </div>
      )}

      {mode && (
        <p
          className={`rounded-lg border p-4 text-sm ${
            mode === "test" ? "border-sky-200 bg-sky-50 text-sky-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {mode === "test" ? (
            <>
              <b>Stripe: тестов режим.</b> Пробвай поръчка, докато магазинът е изключен — като влязъл админ виждаш формата
              на страницата на продукта. Карта 4242 4242 4242 4242; поръчките излизат с етикет „тест“ и без товарителница.
            </>
          ) : (
            <>
              <b>Stripe: истински плащания.</b> Всяка поръчка е с реални пари.
            </>
          )}
        </p>
      )}

      <ShopSettingsForm
        initial={{
          enabled: settings.enabled,
          office: settings.shipping.office?.toString() ?? "",
          apt: settings.shipping.apt?.toString() ?? "",
          address: settings.shipping.address?.toString() ?? "",
          freeFrom: settings.freeFrom?.toString() ?? "",
        }}
      />

      <div className="rounded-lg border border-neutral-200 bg-white">
        <p className="border-b border-neutral-100 px-5 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Артикули
        </p>
        {items.map((it) => (
          <Link
            key={it.id}
            href={`/shop/${it.id}`}
            className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3 last:border-0 hover:bg-neutral-50"
          >
            <span>
              <span className="font-medium">{it.title}</span>{" "}
              <span className="text-sm text-neutral-500">— {it.pack_label}</span>
            </span>
            <span className="flex items-center gap-3 text-sm">
              <span className="tabular-nums">{it.price_eur != null ? eur(it.price_eur) : <i className="text-neutral-400">без цена</i>}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  it.is_active ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {it.is_active ? "активен" : "скрит"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
