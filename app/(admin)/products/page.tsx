import { listProducts, listCategories } from "@/lib/data";
import ProductsList from "./ProductsList";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);
  return <ProductsList products={products} categories={categories} />;
}
