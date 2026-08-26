import type { MetadataRoute } from "next";
import { listPublishedArticles, listPublicMenu } from "@/lib/data";
import { hasProductPage } from "@/lib/links";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutriko.fit";

// Менюто се пълни от админа, не от деплой. Ако картата се пече при сглобяване,
// нов продукт остава невидим за Google до следващото качване на кода. Час е
// достатъчно често — обхождачите идват далеч по-рядко.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Картата на сайта не бива да гърми — по-добре непълна, отколкото никаква.
  const [articles, menu] = await Promise.all([
    listPublishedArticles().catch(() => []),
    listPublicMenu().catch(() => []),
  ]);

  // Обявяват се само продуктите със собствена страница. Купеното отвън е с
  // noindex — да го има тук би било молба Google да индексира нещо, което
  // самата страница му забранява.
  const products = menu.filter(hasProductPage);

  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/menu`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/torta-bez-zahar`, changeFrequency: "weekly", priority: 0.9 },
    ...products.map((p) => ({
      url: `${SITE_URL}/menu/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/polezno`, changeFrequency: "weekly", priority: 0.6 },
    ...articles.map((a) => ({
      url: `${SITE_URL}/polezno/${a.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${SITE_URL}/alergeni`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
