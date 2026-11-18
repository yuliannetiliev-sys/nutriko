"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/supabase";
import { requirePlanner } from "@/lib/planer";
import { isStatus, normPhone, phoneOk, type CakeStatus } from "@/lib/planer-common";

export type FormState = { error?: string } | null;
export type Result = { ok: true } | { ok: false; error: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const done = () => revalidatePath("/planer", "layout");

/** Познат ли е телефонът — за подсказка във формата („вече е клиент“). */
export async function lookupCustomer(phone: string) {
  await requirePlanner();
  const p = normPhone(phone);
  if (!phoneOk(p)) return null;
  const supabase = await getDb();
  const { data } = await supabase
    .from("customers")
    .select("name, email, marketing_consent")
    .eq("phone", p)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { name: data.name as string, email: (data.email as string) ?? "", consent: !!data.marketing_consent } : null;
}

/** Нова поръчка или редакция (има `id`). */
export async function saveOrder(_prev: FormState, f: FormData): Promise<FormState> {
  try {
    await requirePlanner();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await getDb();
  const id = Number(str(f, "id")) || null;

  // --- торта ---
  const productRaw = str(f, "product_id");
  let productId: number | null = null;
  let cakeName = "";
  if (productRaw && productRaw !== "other") {
    productId = Number(productRaw);
    const { data: p } = await supabase.from("products").select("name").eq("id", productId).maybeSingle();
    if (!p) return { error: "Тортата не е намерена в менюто. Изберете пак." };
    cakeName = p.name as string;
  } else {
    cakeName = str(f, "cake_other");
  }
  if (!cakeName) return { error: "Изберете торта (или „Друга торта“ и напишете коя)." };
  if (cakeName.length > 200) return { error: "Името на тортата е твърде дълго." };

  const qty = Number(str(f, "qty") || "1");
  if (!Number.isInteger(qty) || qty < 1 || qty > 50) return { error: "Броят е от 1 до 50." };

  const date = str(f, "pickup_date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Изберете дата на взимане." };
  const time = str(f, "pickup_time");
  if (time && !/^\d{2}:\d{2}$/.test(time)) return { error: "Часът не е верен." };

  const note = str(f, "note");
  if (note.length > 500) return { error: "Бележката е до 500 знака." };

  // --- клиент ---
  const name = str(f, "name").replace(/\s+/g, " ");
  if (!name) return { error: "Напишете името на клиента." };
  if (name.length > 120) return { error: "Името е твърде дълго." };
  const phone = normPhone(str(f, "phone"));
  if (!phoneOk(phone)) return { error: "Телефонът не е верен (само цифри, например 0879 262 181)." };
  const email = str(f, "email").toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Имейлът не е верен." };
  const consent = f.get("consent") === "on";
  const source = str(f, "consent_source") === "на място" ? "на място" : "телефон";
  const isEdit = !!id;

  const { data: found } = await supabase
    .from("customers")
    .select("id, email, marketing_consent")
    .eq("phone", phone)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  let customerId: number;
  if (found) {
    const upd: Record<string, unknown> = { name };
    // Нова поръчка: празно поле за имейл значи „не е казан“ — старият остава.
    // Редакция: полето е попълнено от базата, празно значи „изтрий го“.
    if (email) upd.email = email;
    else if (isEdit) upd.email = null;
    // Нова поръчка само дава съгласие (ако е отметнато), не го оттегля — служителят може
    // просто да не е питал. В редакция отметката показва сегашното, махането = оттегляне.
    if (consent && !found.marketing_consent) {
      upd.marketing_consent = true;
      upd.consent_source = source;
    } else if (isEdit && !consent && found.marketing_consent) {
      upd.marketing_consent = false;
    }
    const { error } = await supabase.from("customers").update(upd).eq("id", found.id);
    if (error) return { error: "Клиентът не е записан: " + error.message };
    customerId = found.id as number;
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name,
        phone,
        email: email || null,
        marketing_consent: consent,
        consent_source: consent ? source : null,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "Клиентът не е записан: " + (error?.message ?? "") };
    customerId = data.id as number;
  }

  const row = {
    customer_id: customerId,
    product_id: productId,
    cake_name: cakeName,
    qty,
    pickup_date: date,
    pickup_time: time || null,
    note: note || null,
  };
  const { error } = isEdit
    ? await supabase.from("cake_orders").update(row).eq("id", id)
    : await supabase.from("cake_orders").insert(row);
  if (error) return { error: "Поръчката не е записана: " + error.message };

  done();
  redirect(isEdit ? `/planer/${id}?ok=1` : `/planer?nova=1`);
}

export async function setStatus(id: number, status: CakeStatus): Promise<Result> {
  try {
    await requirePlanner();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!Number.isInteger(id) || !isStatus(status)) return { ok: false, error: "Грешна заявка." };
  const supabase = await getDb();
  const { data, error } = await supabase.from("cake_orders").update({ status }).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Поръчката не е намерена." };
  done();
  return { ok: true };
}

/** Трие само админ (RLS). Служителят отбелязва „Отказана“. */
export async function deleteOrder(id: number): Promise<Result> {
  const u = await requirePlanner().catch(() => null);
  if (!u?.isAdmin) return { ok: false, error: "Изтрива само собственикът. Отбележете „Отказана“." };
  const supabase = await getDb();
  const { data, error } = await supabase.from("cake_orders").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Поръчката не е намерена." };
  done();
  redirect("/planer");
}

/** Проверка преди работа (Прил. 72) от кухненския екран. Грешките от базата — както са. */
export async function submitStaffCheck(input: {
  healthOk: boolean;
  reason: string;
  clothingOk: boolean;
  corrective: string;
}): Promise<Result> {
  const supabase = await getDb();
  const { error } = await supabase.rpc("staff_check_submit", {
    p_health_ok: input.healthOk,
    p_health_reason: input.reason,
    p_clothing_ok: input.clothingOk,
    p_corrective: input.corrective,
    p_source: "kuhnya",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/planer/kuhnya");
  return { ok: true };
}
