import Link from "next/link";
import { listCakes } from "@/lib/planer";
import OrderForm from "../OrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const cakes = await listCakes();
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/planer" className="text-sm text-neutral-500">
          ← Поръчки
        </Link>
        <h1 className="text-xl font-semibold">Нова поръчка</h1>
      </div>
      <OrderForm cakes={cakes} />
    </div>
  );
}
