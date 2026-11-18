import { getPlannerUser, kitchenDays, staffCheckToday } from "@/lib/planer";
import KitchenView from "./KitchenView";
import AutoRefresh from "./AutoRefresh";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const [{ days }, check, u] = await Promise.all([kitchenDays(), staffCheckToday(), getPlannerUser()]);
  // Собственикът също има ред в `staff` (роля owner) — проверката е за персонала в кухнята и бара.
  const showCheck = !!u?.staff && u.staff.role !== "owner";

  return (
    <>
      <AutoRefresh seconds={60} />
      <KitchenView days={days} check={showCheck ? check : null} />
    </>
  );
}
