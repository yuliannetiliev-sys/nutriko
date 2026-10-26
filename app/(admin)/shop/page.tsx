import Link from "next/link";
import { getShopSettings, adminListShopItems } from "@/lib/shop";
import { eur } from "@/lib/price";
import { stripeMode } from "@/lib/stripe";
import { sofiaParts } from "@/lib/sale-doc";
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
  // Месечният файл за НАП: миналият месец (за подаване до 15-о) и текущият (за преглед).
  const [y, m] = sofiaParts(new Date().toISOString()).date.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const cur = `${y}-${String(m).padStart(2, "0")}`;

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
          nap: settings.napEshopNumber ?? "",
        }}
      />

      <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">НАП — месечен файл (Приложение № 38)</p>
        <p className="mt-2 text-neutral-600">
          Всеки месец до <b>15-о число</b> се подава файлът за изпратените през предходния месец поръчки: портала на НАП
          (portal.nra.bg) → подаване на стандартизиран одиторски файл, с КЕП на фирмата.
        </p>
        <p className="mt-3 flex flex-wrap gap-3">
          <a href={`/api/admin/nap-audit?ym=${prev}`} className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700">
            Свали за {prev}
          </a>
          <a href={`/api/admin/nap-audit?ym=${cur}`} className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50">
            {cur} (текущ — само за преглед)
          </a>
        </p>
      </div>

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
