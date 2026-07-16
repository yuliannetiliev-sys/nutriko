import { db, getDb, num, numOrNull } from "./supabase";
import type {
  Ingredient,
  Product,
  RecipeLineFull,
  SiteSettings,
  ContactMessage,
  Allergen,
  Category,
  Article,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapIngredient(r: any): Ingredient {
  return {
    id: r.id,
    name: r.name,
    category: r.category ?? null,
    protein_100: numOrNull(r.protein_100),
    carbs_100: numOrNull(r.carbs_100),
    fat_100: numOrNull(r.fat_100),
    kcal_100: numOrNull(r.kcal_100),
    price_eur_100: numOrNull(r.price_eur_100),
    price_entered: !!r.price_entered,
    unit: r.unit ?? "g",
    grams_per_unit: numOrNull(r.grams_per_unit),
    gi: numOrNull(r.gi),
  };
}

function mapProduct(p: any): Product {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category ?? null,
    servings: num(p.servings),
    finished_weight_g: numOrNull(p.finished_weight_g),
    sell_price_eur: numOrNull(p.sell_price_eur),
    purchase_price_eur: numOrNull(p.purchase_price_eur),
    whole_price_eur: numOrNull(p.whole_price_eur),
    menu_weight_g: numOrNull(p.menu_weight_g),
    price_multiplier: numOrNull(p.price_multiplier),
    description: p.description ?? null,
    image_url: p.image_url ?? null,
    image_urls: p.image_urls ?? [],
    is_published: !!p.is_published,
    menu_ready: !!p.menu_ready,
    archived: !!p.archived,
    show_macros: p.show_macros ?? true,
    serving_unit: p.serving_unit ?? "g",
    tags: p.tags ?? [],
    prep_notes: p.prep_notes ?? null,
    allergen_ids: (p.allergen_ids ?? []).map(Number),
  };
}

export async function listIngredients(): Promise<Ingredient[]> {
  const supabase = await getDb();
  const { data, error } = await supabase.from("ingredients").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(mapIngredient);
}

export type ProductListItem = Product & {
  total_cost_eur: number;
  cost_complete: boolean;
  cost_per_serving_eur: number;
  margin_per_serving_eur: number | null;
  margin_pct: number | null;
  effective_price_eur: number | null;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  kcal_100g: number;
};

export async function listProducts(): Promise<ProductListItem[]> {
  const supabase = await getDb();
  const [{ data: prods, error: e1 }, { data: costs, error: e2 }] = await Promise.all([
    supabase.from("products").select("*").order("menu_ready", { ascending: false }).order("name"),
    supabase.from("product_costs_v").select("*"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const costMap = new Map<number, any>((costs ?? []).map((c: any) => [c.product_id, c]));
  return (prods ?? []).map((p: any) => {
    const c: any = costMap.get(p.id) ?? {};
    return {
      ...mapProduct(p),
      total_cost_eur: num(c.total_cost_eur),
      cost_complete: !!c.cost_complete,
      cost_per_serving_eur: num(c.cost_per_serving_eur),
      margin_per_serving_eur: numOrNull(c.margin_per_serving_eur),
      margin_pct: numOrNull(c.margin_pct),
      effective_price_eur: numOrNull(c.effective_price_eur),
      protein_100g: num(c.protein_100g),
      carbs_100g: num(c.carbs_100g),
      fat_100g: num(c.fat_100g),
      kcal_100g: num(c.kcal_100g),
    };
  });
}

export async function getProduct(
  id: number
): Promise<{ product: Product; lines: RecipeLineFull[] } | null> {
  const supabase = await getDb();
  const { data: p, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error || !p) return null;
  const { data: lines } = await supabase
    .from("product_ingredients")
    .select("id,grams,ingredient_id, ingredients(*)")
    .eq("product_id", id)
    .order("id");
  const mapped: RecipeLineFull[] = (lines ?? []).map((l: any) => ({
    id: l.id,
    ingredient_id: l.ingredient_id,
    grams: num(l.grams),
    ingredient: mapIngredient(l.ingredients),
  }));
  return { product: mapProduct(p), lines: mapped };
}

export type MenuItem = {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  image_urls: string[];
  tags: string[];
  show_macros: boolean;
  allergen_ids: number[];
  serving_weight_g: number;
  serving_unit: string;
  price_eur: number | null;
  servings: number;
  whole_price_eur: number | null;
  protein_serving_g: number;
  carbs_serving_g: number;
  fat_serving_g: number;
  kcal_serving: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  kcal_100g: number;
  gi_estimate: number | null;
  gl_serving: number | null;
};

// Публичното меню — само публикувани, неархивирани (без цени/маржин вътрешни)
export async function listPublicMenu(): Promise<MenuItem[]> {
  const { data, error } = await db().from("public_menu_v").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    slug: r.slug,
    name: r.name,
    category: r.category ?? null,
    description: r.description ?? null,
    image_url: r.image_url ?? null,
    image_urls: r.image_urls ?? [],
    tags: r.tags ?? [],
    show_macros: r.show_macros ?? true,
    allergen_ids: (r.allergen_ids ?? []).map(Number),
    serving_weight_g: num(r.serving_weight_g),
    serving_unit: r.serving_unit ?? "g",
    price_eur: numOrNull(r.price_eur),
    servings: num(r.servings),
    whole_price_eur: numOrNull(r.whole_price_eur),
    protein_serving_g: num(r.protein_serving_g),
    carbs_serving_g: num(r.carbs_serving_g),
    fat_serving_g: num(r.fat_serving_g),
    kcal_serving: num(r.kcal_serving),
    protein_100g: num(r.protein_100g),
    carbs_100g: num(r.carbs_100g),
    fat_100g: num(r.fat_100g),
    kcal_100g: num(r.kcal_100g),
    gi_estimate: numOrNull(r.gi_estimate),
    gl_serving: numOrNull(r.gl_serving),
  }));
}

// Категории на менюто (публично четими) — за менюто и избора в админа
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await db()
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("label");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    key: r.key,
    label: r.label,
    sort_order: Number(r.sort_order),
    menu_visible: !!r.menu_visible,
    description: r.description ?? null,
  }));
}

// Официалните 14 алергена (публично четими) — за легендата и избора в админа
export async function listAllergens(): Promise<Allergen[]> {
  const { data, error } = await db().from("allergens").select("*").order("id");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    name: r.name,
    examples: r.examples ?? null,
  }));
}

// ---------- Статии („Полезно") ----------

function mapArticle(r: any): Article {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    seo_title: r.seo_title ?? null,
    meta_description: r.meta_description ?? null,
    excerpt: r.excerpt ?? null,
    category: r.category ?? null,
    cover_image_url: r.cover_image_url ?? null,
    body: r.body ?? "",
    published: !!r.published,
    sort_order: Number(r.sort_order ?? 0),
  };
}

// Публично — само публикувани (RLS пуска само published към anon)
export async function listPublishedArticles(): Promise<Article[]> {
  const { data, error } = await db()
    .from("articles")
    .select("*")
    .eq("published", true)
    .order("sort_order")
    .order("title");
  if (error) throw error;
  return (data ?? []).map(mapArticle);
}

export async function getPublishedArticle(slug: string): Promise<Article | null> {
  const { data } = await db()
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return data ? mapArticle(data) : null;
}

// Админ — всички (вкл. чернови)
export async function listArticlesAdmin(): Promise<Article[]> {
  const supabase = await getDb();
  const { data, error } = await supabase.from("articles").select("*").order("sort_order").order("title");
  if (error) throw error;
  return (data ?? []).map(mapArticle);
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data } = await db().from("site_settings").select("*").eq("id", 1).maybeSingle();
  const r: any = data ?? {};
  return {
    brand_name: r.brand_name ?? "НУТРИКО",
    hero_title: r.hero_title ?? null,
    hero_subtitle: r.hero_subtitle ?? null,
    hero_image_url: r.hero_image_url ?? null,
    address: r.address ?? null,
    maps_url: r.maps_url ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    hours: r.hours ?? null,
    instagram_url: r.instagram_url ?? null,
    facebook_url: r.facebook_url ?? null,
    contact_to_email: r.contact_to_email ?? null,
  };
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const supabase = await getDb();
  const { data } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    contact: r.contact ?? null,
    message: r.message,
    handled: !!r.handled,
    created_at: r.created_at,
  }));
}
