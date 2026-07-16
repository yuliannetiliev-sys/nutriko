import { listArticlesAdmin } from "@/lib/data";
import ArticlesManager from "./ArticlesManager";

export const dynamic = "force-dynamic";

export default async function ArticlesAdminPage() {
  const articles = await listArticlesAdmin();
  return <ArticlesManager initial={articles} />;
}
