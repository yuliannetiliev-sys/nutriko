import "server-only";
import { getDb, ADMIN_EMAILS } from "@/lib/supabase";
import { addDays, sofiaToday, type CakeStatus } from "@/lib/planer-common";

// Планерът на целите торти (поръчки по телефон и на място).
// Всичко минава през сесията на влезлия — правата ги пази RLS в базата:
// админ и активен служител (`staff`) четат и пишат, трие само админ.

export type PlannerUser = {
  email: string;
  isAdmin: boolean;
  staff: { name: string; role: string } | null;
};

export async function getPlannerUser(): Promise<PlannerUser | null> {
  const supabase = await getDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const isAdmin = !!user.email && ADMIN_EMAILS.includes(user.email);
  const { data } = await supabase
    .from("staff")
    .select("display_name, role, active")
    .eq("user_id", user.id)
    .maybeSingle();
  const staff = data?.active ? { name: data.display_name as string, role: data.role as string } : null;
  return { email: user.email ?? "", isAdmin, staff };
}

export async function requirePlanner(): Promise<PlannerUser> {
  const u = await getPlannerUser();
  if (!u || (!u.isAdmin && !u.staff)) throw new Error("Няма достъп до планера.");
  return u;
}

export type OrderRow = {
  id: number;
  cake_name: string;
  product_id: number | null;
  qty: number;
  pickup_date: string;
  pickup_time: string | null;
  note: string | null;
  status: CakeStatus;
  made_at: string | null;
  picked_up_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  created_by: string | null;
  customer: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    marketing_consent: boolean;
    consent_source: string | null;
  } | null;
};

const ORDER_COLS =
  "id, cake_name, product_id, qty, pickup_date, pickup_time, note, status, made_at, picked_up_at, cancelled_at, created_at, created_by, " +
  "customer:customers(id, name, phone, email, marketing_consent, consent_source)";

const byDateTime = (a: OrderRow, b: OrderRow) =>
  a.pickup_date.localeCompare(b.pickup_date) ||
  // без час — накрая на деня
  (a.pickup_time ?? "99").localeCompare(b.pickup_time ?? "99") ||
  a.id - b.id;

/** Предстоящите (от днес нататък) + неотметнатите от минали дни. */
export async function listUpcoming() {
  const supabase = await getDb();
  const today = sofiaToday();
  const [up, late] = await Promise.all([
    supabase.from("cake_orders").select(ORDER_COLS).gte("pickup_date", today).limit(500),
    supabase
      .from("cake_orders")
      .select(ORDER_COLS)
      .lt("pickup_date", today)
      .in("status", ["pending", "made"])
      .limit(200),
  ]);
  if (up.error) throw new Error(up.error.message);
  if (late.error) throw new Error(late.error.message);
  return {
    today,
    upcoming: ((up.data ?? []) as unknown as OrderRow[]).sort(byDateTime),
    late: ((late.data ?? []) as unknown as OrderRow[]).sort(byDateTime),
  };
}

/** Минали поръчки, най-новите първи. */
export async function listPast(limit = 300) {
  const supabase = await getDb();
  const { data, error } = await supabase
    .from("cake_orders")
    .select(ORDER_COLS)
    .lt("pickup_date", sofiaToday())
    .order("pickup_date", { ascending: false })
    .order("pickup_time", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OrderRow[];
}

/** Търсене по име или телефон във всички поръчки. */
export async function searchOrders(q: string) {
  const supabase = await getDb();
  const { data, error } = await supabase
    .from("cake_orders")
    .select(ORDER_COLS)
    .order("pickup_date", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  const needle = q.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  return ((data ?? []) as unknown as OrderRow[]).filter((o) => {
    const c = o.customer;
    if (!c) return false;
    if (c.name.toLowerCase().includes(needle)) return true;
    return digits.length >= 3 && (c.phone ?? "").includes(digits);
  });
}

export async function getOrder(id: number) {
  const supabase = await getDb();
  const { data, error } = await supabase.from("cake_orders").select(ORDER_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as OrderRow) ?? null;
}

export type Cake = { id: number; name: string };

/** Публикуваните торти от менюто — за избор във формата. */
export async function listCakes(): Promise<Cake[]> {
  const supabase = await getDb();
  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .eq("category", "торта")
    .eq("is_published", true)
    .eq("archived", false)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Cake[];
}

export type KitchenRow = {
  id: number;
  cake_name: string;
  qty: number;
  pickup_date: string;
  pickup_time: string | null;
  note: string | null;
  status: CakeStatus;
  made_at: string | null;
};

/** Кухнята: днес, утре и вдругиден, без име и телефон (изгледът няма тези колони). */
export async function kitchenDays() {
  const supabase = await getDb();
  const today = sofiaToday();
  const days = [today, addDays(today, 1), addDays(today, 2)];
  const { data, error } = await supabase
    .from("cake_orders_kitchen")
    .select("id, cake_name, qty, pickup_date, pickup_time, note, status, made_at")
    .gte("pickup_date", days[0])
    .lte("pickup_date", days[2])
    .in("status", ["pending", "made"])
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as KitchenRow[]).sort(
    (a, b) =>
      a.pickup_date.localeCompare(b.pickup_date) ||
      (a.pickup_time ?? "99").localeCompare(b.pickup_time ?? "99") ||
      a.id - b.id
  );
  return { today, days: days.map((d) => ({ date: d, rows: rows.filter((r) => r.pickup_date === d) })) };
}

export type StaffCheck = {
  staff_name: string;
  done: boolean;
  checked_at: string | null;
  health_ok: boolean | null;
  clothing_ok: boolean | null;
  book_no: string | null;
  book_valid_until: string | null;
  book_state: "missing" | "expired" | "expiring" | "ok";
};

/** Проверката преди работа (Прил. 72) за влезлия служител; null = няма активен профил. */
export async function staffCheckToday(): Promise<StaffCheck | null> {
  const supabase = await getDb();
  const { data, error } = await supabase.rpc("staff_check_today");
  if (error) return null;
  const rows = (data ?? []) as StaffCheck[];
  return rows[0] ?? null;
}

/**
 * Правилото за личните данни (решение на собственика, 14.11): клиент БЕЗ съгласие за оферти
 * се трие 1 година след последната си поръчка. Поръчките остават (тортата и датата — за
 * статистика), връзката към клиента става празна. Трие само админ (RLS), затова се вика,
 * когато админ отвори планера.
 */
export async function purgeExpiredCustomers(): Promise<number> {
  const supabase = await getDb();
  const { data, error } = await supabase
    .from("customers")
    .select("id, created_at, cake_orders(pickup_date)")
    .eq("marketing_consent", false)
    .limit(2000);
  if (error || !data) return 0;
  const cutoff = addDays(sofiaToday(), -365);
  const ids = (data as { id: number; created_at: string; cake_orders: { pickup_date: string }[] }[])
    .filter((c) => {
      const dates = (c.cake_orders ?? []).map((o) => o.pickup_date);
      const last = dates.length ? dates.sort().at(-1)! : c.created_at.slice(0, 10);
      return last < cutoff;
    })
    .map((c) => c.id);
  if (!ids.length) return 0;
  const { error: delErr } = await supabase.from("customers").delete().in("id", ids);
  return delErr ? 0 : ids.length;
}
