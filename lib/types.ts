export type Ingredient = {
  id: number;
  name: string;
  category: string | null;
  protein_100: number | null;
  carbs_100: number | null;
  fat_100: number | null;
  kcal_100: number | null;
  price_eur_100: number | null;
  price_entered: boolean;
  unit: string; // 'g' | 'бр.'
  grams_per_unit: number | null;
  gi: number | null; // гликемичен индекс (0–100); null = неизвестен
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: string | null;
  servings: number;
  finished_weight_g: number | null;
  sell_price_eur: number | null;
  purchase_price_eur: number | null; // ръчна доставна цена/порция (прекупвани продукти без рецепта)
  whole_price_eur: number | null; // ръчна цена за цяла торта/продукт (иначе = парчета × цена/парче)
  menu_weight_g: number | null; // ръчен грамаж на парче за менюто (само дисплей, не влияе на макросите)
  price_multiplier: number | null;
  description: string | null;
  image_url: string | null; // корица (= image_urls[0])
  image_urls: string[]; // галерия (цяла торта, парче, …)
  is_published: boolean;
  menu_ready: boolean;
  archived: boolean;
  show_macros: boolean;
  serving_unit: string; // 'g' | 'ml' — мерна единица на порцията за дисплея
  tags: string[];
  prep_notes: string | null; // вътрешни бележки за приготвяне — само админ
  allergen_ids: number[]; // официални номера 1–14 (Регламент 1169/2011)
};

// Официален алерген (ЕС Регламент 1169/2011, Приложение II)
export type Allergen = {
  id: number; // официален номер 1–14
  name: string;
  examples: string | null;
};

// Категория на менюто (редактируема от админа). key = стойността в products.category
export type Category = {
  key: string;
  label: string;
  sort_order: number;
  menu_visible: boolean;
  description: string | null;
};

// Статия за раздел „Полезно" (блог) — редактира се от админа
export type Article = {
  id: number;
  slug: string;
  title: string; // основното заглавие (H1 на страницата)
  seo_title: string | null; // SEO <title> / og:title — ако е празно, ползва title
  meta_description: string | null; // meta + og:description — ако е празно, ползва excerpt
  excerpt: string | null; // кратък текст за картата в списъка + подзаглавие в статията
  category: string | null; // секция в /polezno (виж lib/polezno.ts)
  cover_image_url: string | null; // корична снимка за картата + hero на статията
  body: string; // markdown
  published: boolean;
  sort_order: number;
};

export type RecipeLine = {
  id?: number;
  ingredient_id: number;
  grams: number;
};

// Ред от рецептата заедно със съставката (за редактора)
export type RecipeLineFull = RecipeLine & { ingredient: Ingredient };

export type SiteSettings = {
  brand_name: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  address: string | null;
  maps_url: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  contact_to_email: string | null;
};

export type ContactMessage = {
  id: number;
  name: string;
  contact: string | null;
  message: string;
  handled: boolean;
  created_at: string;
};

// Изчислени стойности от product_costs_v (числата идват като string от PostgREST)
export type ProductCost = {
  product_id: number;
  total_grams: number;
  total_cost_eur: number;
  cost_complete: boolean;
  cost_per_serving_eur: number;
  margin_per_serving_eur: number | null;
  margin_pct: number | null;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  kcal_100g: number;
  protein_serving_g: number;
  carbs_serving_g: number;
  fat_serving_g: number;
  kcal_serving: number;
  suggested_price_eur: number | null;
  effective_price_eur: number | null;
  gi_estimate: number | null; // референтен ГИ на продукта (въглехидратно претеглен)
  gl_serving: number | null; // референтен гликемичен товар на порция
};
