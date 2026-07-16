import { listCategories } from "@/lib/data";
import { getDb } from "@/lib/supabase";
import CategoriesManager from "./CategoriesManager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();
  const supabase = await getDb();
  const { data: prods } = await supabase.from("products").select("category");
  const counts: Record<string, number> = {};
  for (const p of prods ?? []) {
    const k = (p as { category: string | null }).category;
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  }

  return <CategoriesManager categories={categories} counts={counts} />;
}
