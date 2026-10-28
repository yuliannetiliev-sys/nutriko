import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetShopItem, adminRecipeCost } from "@/lib/shop";
import ShopItemForm from "./ShopItemForm";

export const dynamic = "force-dynamic";

export default async function ShopItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await adminGetShopItem(Number(id));
  if (!item) notFound();
  const recipe = await adminRecipeCost(item.product_id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/shop" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Магазин
        </Link>
        <Link href={`/magazin/${item.slug}`} target="_blank" className="text-sm text-emerald-700 hover:underline">
          Виж страницата →
        </Link>
      </div>
      <h1 className="text-xl font-semibold">{item.title}</h1>
      <ShopItemForm item={item} recipe={recipe} />
    </div>
  );
}
