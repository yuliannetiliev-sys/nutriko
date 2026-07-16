// Секциите на страницата „Полезно" — ред на показване + ключове за редактируемите
// текстове (заглавие/въведение) в site_content. Кои статии влизат в коя секция
// се управлява от колоната articles.category (избира се от админа).
export type PoleznoSection = {
  key: string; // = articles.category
  titleKey: string; // ключ в CONTENT_DEFAULTS / site_content
  introKey: string;
  tone?: "safety"; // визуално отделена секция (алергени/безопасност)
};

export const POLEZNO_SECTIONS: PoleznoSection[] = [
  { key: "zapochni-ottuk", titleKey: "polezno_sec1_title", introKey: "polezno_sec1_intro" },
  { key: "protein-makrosi", titleKey: "polezno_sec2_title", introKey: "polezno_sec2_intro" },
  { key: "zahar-podsladiteli", titleKey: "polezno_sec3_title", introKey: "polezno_sec3_intro" },
  { key: "glikemichen-sastavki", titleKey: "polezno_sec4_title", introKey: "polezno_sec4_intro" },
  {
    key: "bezopasnost-alergeni",
    titleKey: "polezno_sec5_title",
    introKey: "polezno_sec5_intro",
    tone: "safety",
  },
];
