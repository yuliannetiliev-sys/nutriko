import { listIngredients } from "@/lib/data";
import IngredientTable from "./IngredientTable";

export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  const ingredients = await listIngredients();
  return <IngredientTable ingredients={ingredients} />;
}
