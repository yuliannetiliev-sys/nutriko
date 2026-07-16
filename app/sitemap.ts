import type { MetadataRoute } from "next";
import { listPublishedArticles } from "@/lib/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutriko.fit";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let articles: { slug: string }[] = [];
  try {
    articles = await listPublishedArticles();
  } catch {
    articles = [];
  }
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/menu`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/polezno`, changeFrequency: "weekly", priority: 0.6 },
    ...articles.map((a) => ({
      url: `${SITE_URL}/polezno/${a.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${SITE_URL}/alergeni`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
