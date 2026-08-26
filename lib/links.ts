// Слъгове на статии, към които сочим от КОДА (меню „?", hero бутони и т.н.).
// Държим ги на едно място — ако статия се преименува, се обновява само тук,
// и нищо в кода не се чупи. Виж памет: nutrico-article-slug-links.
export const ARTICLE = {
  howToReadMenu: "kak-da-chetesh-menuto-na-nutriko",
  chooseDessert: "koy-desert-da-izbera-spored-tselta-si",
  glycemic: "glikemichen-indeks-i-glikemichen-tovar",
  howMacros: "kak-izchislyavame-makrosite-v-menyuto",
  noWhiteSugar: "bez-dobavena-zahar-ne-oznachava-bez-kalorii",
} as const;

export const articleHref = (slug: string) => `/polezno/${slug}`;

// ---------- Продукти ----------

export const productHref = (slug: string) => `/menu/${slug}`;

/**
 * Кой продукт заслужава собствена страница.
 *
 * Нашите рецепти — да: имат описание, макроси, алергени, снимки. Купеното
 * отвън (бутилка вода, инстантно кафе, пакетче чай) няма какво да каже на цяла
 * страница; линк към нея е задънена улица за човека и празна страница за
 * Google. Признакът е същият, по който менюто решава дали да показва макроси.
 *
 * Правилото стои ТУК, а не в страницата, защото три места го питат: менюто
 * (дали да сложи линк), самата страница (дали да се индексира) и картата на
 * сайта (дали да я обяви).
 */
export function hasProductPage(m: { show_macros: boolean; kcal_serving: number }): boolean {
  return m.show_macros && m.kcal_serving > 0;
}
