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
