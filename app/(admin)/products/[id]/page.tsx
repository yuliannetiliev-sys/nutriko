import { notFound } from "next/navigation";
import { getProduct, listIngredients, listAllergens, listCategories } from "@/lib/data";
import RecipeEditor from "./RecipeEditor";

export const dynamic = "force-dynamic";

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pid = Number(id);
  const [data, catalog, allergens, categories] = await Promise.all([
    getProduct(pid),
    listIngredients(),
    listAllergens(),
    listCategories(),
  ]);
  if (!data) notFound();

  return (
    <RecipeEditor
      product={data.product}
      initialLines={data.lines}
      catalog={catalog}
      allergens={allergens}
      categories={categories}
    />
  );
}
