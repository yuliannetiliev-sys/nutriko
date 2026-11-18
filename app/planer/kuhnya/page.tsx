import { getPlannerUser, kitchenDays, staffCheckToday } from "@/lib/planer";
import KitchenView from "./KitchenView";
import AutoRefresh from "./AutoRefresh";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const [{ days }, check, u] = await Promise.all([kitchenDays(), staffCheckToday(), getPlannerUser()]);
  // Всеки с ред в `staff` отмята. Собственикът (роля owner) — без червена лента, само с бутон,
  // когато работи с храна (решение 18.11: „Само когато работя“).
  const showCheck = !!u?.staff;
  const manualCheck = u?.staff?.role === "owner";

  return (
    <>
      <AutoRefresh seconds={60} />
      <KitchenView days={days} check={showCheck ? check : null} manualCheck={manualCheck} />
    </>
  );
}
