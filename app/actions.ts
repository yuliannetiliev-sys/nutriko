"use server";

import { db, getDb, requireAdmin } from "@/lib/supabase";
import { sendContactNotification } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------- Auth ----------

export async function signIn(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await getDb();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Грешен имейл или парола." };
  redirect("/products");
}

export async function signOut() {
  const supabase = await getDb();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changePassword(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  await requireAdmin();
  const pw = String(formData.get("password") ?? "");
  if (pw.length < 8) return { error: "Паролата трябва да е поне 8 знака." };
  const supabase = await getDb();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: error.message };
  return { ok: true };
}

// ---------- Рецепти (админ) ----------

export type SavePayload = {
  name: string;
  category: string | null;
  servings: number;
  finished_weight_g: number | null;
  sell_price_eur: number | null;
  purchase_price_eur: number | null;
  whole_price_eur: number | null;
  menu_weight_g: number | null;
  price_multiplier: number | null;
  menu_ready: boolean;
  is_published: boolean;
  show_macros: boolean;
  serving_unit: string;
  description: string | null;
  prep_notes: string | null;
  allergen_ids: number[];
  image_urls: string[];
  tags: string[];
  lines: { ingredient_id: number; grams: number }[];
};

export async function saveRecipe(productId: number, payload: SavePayload) {
  await requireAdmin();
  const supabase = await getDb();

  const { error: e1 } = await supabase
    .from("products")
    .update({
      name: payload.name,
      category: payload.category,
      servings: payload.servings,
      finished_weight_g: payload.finished_weight_g,
      sell_price_eur: payload.sell_price_eur,
      purchase_price_eur: payload.purchase_price_eur,
      whole_price_eur: payload.whole_price_eur,
      menu_weight_g: payload.menu_weight_g,
      price_multiplier: payload.price_multiplier,
      menu_ready: payload.menu_ready,
      is_published: payload.is_published,
      show_macros: payload.show_macros,
      serving_unit: payload.serving_unit,
      description: payload.description,
      prep_notes: payload.prep_notes,
      allergen_ids: payload.allergen_ids,
      image_urls: payload.image_urls,
      image_url: payload.image_urls[0] ?? null,
      tags: payload.tags,
    })
    .eq("id", productId);
  if (e1) throw new Error(e1.message);

  const { error: e2 } = await supabase
    .from("product_ingredients")
    .delete()
    .eq("product_id", productId);
  if (e2) throw new Error(e2.message);

  const merged = new Map<number, number>();
  for (const l of payload.lines) {
    if (l.grams > 0) merged.set(l.ingredient_id, (merged.get(l.ingredient_id) ?? 0) + l.grams);
  }
  const rows = [...merged.entries()].map(([ingredient_id, grams]) => ({
    product_id: productId,
    ingredient_id,
    grams,
  }));
  if (rows.length) {
    const { error: e3 } = await supabase.from("product_ingredients").insert(rows);
    if (e3) throw new Error(e3.message);
  }

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return { ok: true };
}

export async function uploadProductImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  const productId = String(formData.get("productId") ?? "misc").replace(/[^0-9a-z]/gi, "") || "misc";
  if (!file || file.size === 0) return { error: "Няма избран файл." };
  if (file.size > 10_000_000) return { error: "Файлът е твърде голям (макс. 10 MB)." };
  const supabase = await getDb();
  const extRaw = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ext = /^(jpg|jpeg|png|webp|avif)$/.test(extRaw) ? extRaw : "jpg";
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${productId}/${rand}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

// Качване на корична снимка за статия (същия bucket, префикс articles/<slug>/)
export async function uploadArticleImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Няма файл" };
  const slug = ((formData.get("slug") as string) || "misc").replace(/[^a-z0-9-]/g, "") || "misc";
  const supabase = await getDb();
  const extRaw = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ext = /^(jpg|jpeg|png|webp|avif)$/.test(extRaw) ? extRaw : "jpg";
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `articles/${slug}/${rand}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

// Качване на снимка за редактируемо съдържание (hero банер и др.). Уникално име →
// смяната се вижда веднага, без кеш проблеми.
export async function uploadContentImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Няма файл" };
  const supabase = await getDb();
  const extRaw = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ext = /^(jpg|jpeg|png|webp|avif)$/.test(extRaw) ? extRaw : "jpg";
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `content/${rand}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim() || "Нов продукт";
  const supabase = await getDb();
  const slug = "produkt-" + Math.random().toString(36).slice(2, 8);
  const { data, error } = await supabase
    .from("products")
    .insert({ slug, name, servings: 12 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/products");
  redirect(`/products/${data!.id}`);
}

export async function duplicateProduct(id: number, newName?: string) {
  await requireAdmin();
  const supabase = await getDb();
  const { data: src, error: e0 } = await supabase.from("products").select("*").eq("id", id).single();
  if (e0 || !src) throw new Error(e0?.message ?? "Продуктът не е намерен");

  const slug = "produkt-" + Math.random().toString(36).slice(2, 8);
  const { data: created, error: e1 } = await supabase
    .from("products")
    .insert({
      slug,
      name: newName?.trim() || `${src.name} (копие)`,
      category: src.category,
      servings: src.servings,
      finished_weight_g: src.finished_weight_g,
      sell_price_eur: src.sell_price_eur,
      purchase_price_eur: src.purchase_price_eur,
      whole_price_eur: src.whole_price_eur,
      menu_weight_g: src.menu_weight_g,
      price_multiplier: src.price_multiplier,
      description: src.description,
      prep_notes: src.prep_notes,
      allergen_ids: src.allergen_ids,
      tags: src.tags,
      show_macros: src.show_macros,
      serving_unit: src.serving_unit,
      menu_ready: false,
      is_published: false,
    })
    .select("id")
    .single();
  if (e1) throw new Error(e1.message);

  const { data: lines } = await supabase
    .from("product_ingredients")
    .select("ingredient_id,grams")
    .eq("product_id", id);
  if (lines && lines.length) {
    const rows = lines.map((l: any) => ({
      product_id: created!.id,
      ingredient_id: l.ingredient_id,
      grams: l.grams,
    }));
    const { error: e2 } = await supabase.from("product_ingredients").insert(rows);
    if (e2) throw new Error(e2.message);
  }

  revalidatePath("/products");
  redirect(`/products/${created!.id}`);
}

export async function archiveProduct(id: number) {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase
    .from("products")
    .update({ archived: true, is_published: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/products");
  return { ok: true };
}

export async function unarchiveProduct(id: number) {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase.from("products").update({ archived: false }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/products");
  return { ok: true };
}

export async function removeProduct(id: number) {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/products");
  return { ok: true };
}

// ---------- Съставки (админ) ----------

export type IngredientFields = {
  name: string;
  category: string | null;
  protein_100: number | null;
  carbs_100: number | null;
  fat_100: number | null;
  kcal_100: number | null;
  price_eur_100: number | null;
  unit: string;
  grams_per_unit: number | null;
  gi: number | null;
};

// Превежда суровата грешка от Postgres/PostgREST в разбираемо съобщение.
// Връщаме я (а не хвърляме), защото в production Next.js маскира хвърлените
// грешки с общото „Server Components render…", което не казва нищо на потребителя.
function ingredientError(err: { code?: string; message: string }): string {
  if (err.code === "23505") return "Съставка с това име вече съществува.";
  if (err.code === "22P02" || err.code === "22003")
    return "Невалидна числова стойност — провери полетата (гликемичният индекс трябва да е цяло число).";
  return err.message;
}

export async function updateIngredient(
  id: number,
  f: Partial<IngredientFields>
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getDb();
  const patch: Record<string, unknown> = { ...f };
  if ("price_eur_100" in f) patch.price_entered = f.price_eur_100 != null;
  const { error } = await supabase.from("ingredients").update(patch).eq("id", id);
  if (error) return { ok: false, error: ingredientError(error) };
  revalidatePath("/ingredients");
  return { ok: true };
}

export async function createIngredient(
  f: IngredientFields
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase
    .from("ingredients")
    .insert({ ...f, price_entered: f.price_eur_100 != null });
  if (error) return { ok: false, error: ingredientError(error) };
  revalidatePath("/ingredients");
  return { ok: true };
}

export async function deleteIngredient(id: number): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase.from("ingredients").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return { ok: false, error: "Съставката се използва в рецепта — премахни я от рецептите първо." };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/ingredients");
  return { ok: true };
}

// ---------- Събития (публични QR страници) ----------

// Позволени анкети и опции — сървърна валидация, за да не влиза боклук от публичната страница.
const EVENT_POLLS: Record<string, readonly string[]> = {
  finesse: ["kokosova", "krema-mus"],
};

export async function getEventVotes(event: string): Promise<Record<string, number>> {
  const options = EVENT_POLLS[event];
  if (!options) return {};
  const supabase = db();
  const { data } = await supabase.from("event_votes").select("choice").eq("event", event);
  const counts: Record<string, number> = Object.fromEntries(options.map((o) => [o, 0]));
  for (const r of data ?? []) if (r.choice in counts) counts[r.choice]++;
  return counts;
}

export async function submitEventVote(
  event: string,
  choice: string
): Promise<{ ok: boolean; counts: Record<string, number> }> {
  const options = EVENT_POLLS[event];
  if (!options || !options.includes(choice)) return { ok: false, counts: {} };
  const supabase = db();
  const { error } = await supabase.from("event_votes").insert({ event, choice });
  return { ok: !error, counts: await getEventVotes(event) };
}

// ---------- Настройки (админ) ----------

export type SiteSettingsPayload = {
  brand_name?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_image_url?: string | null;
  address?: string | null;
  maps_url?: string | null;
  phone?: string | null;
  email?: string | null;
  hours?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  contact_to_email?: string | null;
};

export async function saveSiteSettings(p: SiteSettingsPayload) {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase
    .from("site_settings")
    .update({ ...p, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/site");
  return { ok: true };
}

// ---------- Категории на менюто (админ) ----------

function slugifyKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function createCategory(
  label: string,
  key?: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const lbl = label.trim();
  if (!lbl) return { ok: false, error: "Въведи име на категорията." };
  const k = (key?.trim() || slugifyKey(lbl)).slice(0, 60);
  if (!k) return { ok: false, error: "Невалиден ключ на категорията." };
  const supabase = await getDb();
  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = ((last?.sort_order as number) ?? 0) + 10;
  const { error } = await supabase.from("categories").insert({ key: k, label: lbl, sort_order });
  if (error) {
    if (error.code === "23505") return { ok: false, error: `Категория с ключ „${k}" вече съществува.` };
    return { ok: false, error: error.message };
  }
  revalidatePath("/categories");
  revalidatePath("/menu");
  return { ok: true };
}

export async function updateCategory(
  key: string,
  fields: { label?: string; sort_order?: number; menu_visible?: boolean; description?: string | null }
) {
  await requireAdmin();
  const patch: Record<string, unknown> = {};
  if (fields.label != null) patch.label = fields.label.trim();
  if (fields.sort_order != null) patch.sort_order = fields.sort_order;
  if (fields.menu_visible != null) patch.menu_visible = fields.menu_visible;
  if (fields.description !== undefined) patch.description = (fields.description || "").trim() || null;
  const supabase = await getDb();
  const { error } = await supabase.from("categories").update(patch).eq("key", key);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
  revalidatePath("/menu");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategory(key: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getDb();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category", key);
  if ((count ?? 0) > 0)
    return { ok: false, error: `Има ${count} продукт(а) в тази категория — премести ги в друга първо.` };
  const { error } = await supabase.from("categories").delete().eq("key", key);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/categories");
  revalidatePath("/menu");
  return { ok: true };
}

// ---------- Статии („Полезно") ----------

export type ArticleFields = {
  slug: string;
  title: string;
  seo_title: string | null;
  meta_description: string | null;
  excerpt: string | null;
  category: string | null;
  cover_image_url: string | null;
  body: string;
  published: boolean;
  sort_order: number;
};

export async function createArticle(f: ArticleFields): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase.from("articles").insert(f);
  if (error)
    return { ok: false, error: error.code === "23505" ? "Вече има статия с този адрес (slug)." : error.message };
  revalidatePath("/articles");
  revalidatePath("/polezno");
  return { ok: true };
}

export async function updateArticle(
  id: number,
  f: Partial<ArticleFields>
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase
    .from("articles")
    .update({ ...f, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error)
    return { ok: false, error: error.code === "23505" ? "Вече има статия с този адрес (slug)." : error.message };
  revalidatePath("/articles");
  revalidatePath("/polezno");
  if (f.slug) revalidatePath(`/polezno/${f.slug}`);
  return { ok: true };
}

export async function deleteArticle(id: number): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/articles");
  revalidatePath("/polezno");
  return { ok: true };
}

// Пренарежда статиите: задава sort_order = позицията на всяко id в подадения ред.
export async function reorderArticles(
  orderedIds: number[]
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getDb();
  const results = await Promise.all(
    orderedIds.map((id, i) => supabase.from("articles").update({ sort_order: i }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };
  revalidatePath("/articles");
  revalidatePath("/polezno");
  return { ok: true };
}

// ---------- Текстове на началната (site_content) ----------

export async function saveContent(
  values: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getDb();
  const rows = Object.entries(values).map(([key, value]) => ({ key, value: value ?? "" }));
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/content");
  return { ok: true };
}

// ---------- Контактна форма ----------

// Публично (анонимно) — затова ползва анонимния клиент.
export async function submitContactMessage(p: {
  name: string;
  contact: string | null;
  message: string;
}) {
  if (!p.name?.trim() || !p.contact?.trim() || !p.message?.trim())
    throw new Error("Моля попълни име, имейл или телефон и съобщение.");
  const supabase = db();
  const { error } = await supabase.from("contact_messages").insert({
    name: p.name.trim(),
    contact: p.contact?.trim() || null,
    message: p.message.trim(),
  });
  if (error) throw new Error(error.message);

  // Известяване по имейл — не бива да блокира потвърждението към клиента, ако се провали.
  try {
    const { data: settings } = await supabase
      .from("site_settings")
      .select("contact_to_email")
      .limit(1)
      .maybeSingle();
    const res = await sendContactNotification({
      to: settings?.contact_to_email ?? null,
      name: p.name.trim(),
      contact: p.contact?.trim() || null,
      message: p.message.trim(),
    });
    if (!res.sent) console.error("[contact] имейл известието не е изпратено:", res.error);
  } catch (e) {
    console.error("[contact] грешка при имейл известие:", e);
  }

  return { ok: true };
}

export async function setMessageHandled(id: number, handled: boolean) {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase.from("contact_messages").update({ handled }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/site");
  return { ok: true };
}

export async function deleteMessage(id: number) {
  await requireAdmin();
  const supabase = await getDb();
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/site");
  return { ok: true };
}
