import { notFound } from "next/navigation";
import { getProduct, listIngredients, listAllergens, listCategories, listPublicMenu } from "@/lib/data";
import RecipeEditor from "./RecipeEditor";

export const dynamic = "force-dynamic";

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pid = Number(id);
  const [data, catalog, allergens, categories, menu] = await Promise.all([
    getProduct(pid),
    listIngredients(),
    listAllergens(),
    listCategories(),
    listPublicMenu(),
  ]);
  if (!data) notFound();

  return (
    <RecipeEditor
      product={data.product}
      initialLines={data.lines}
      catalog={catalog}
      allergens={allergens}
      categories={categories}
      menu={menu.map((m) => ({ slug: m.slug, name: m.name, category: m.category, menu_order: m.menu_order }))}
    />
  );
}
