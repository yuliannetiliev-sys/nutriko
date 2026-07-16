// Инвентаризация на Supabase Storage bucket `product-images` + кръстосване с базата.
// САМО ЧЕТЕ. Нищо не мести, не трие, не качва.
//
// Стартиране: node scripts/storage-inventory.mjs
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "product-images";
const PUBLIC_PREFIX = `${URL_BASE}/storage/v1/object/public/${BUCKET}/`;

if (!URL_BASE || !KEY) {
  console.error("Липсва SUPABASE URL или SERVICE_ROLE_KEY в .env.local");
  process.exit(1);
}

// Storage REST иска apikey хедър (НЕ Authorization: Bearer → 403 при новите sb_secret ключове)
const H = { apikey: KEY, "Content-Type": "application/json" };

async function listFolder(prefix) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }),
  });
  if (!res.ok) throw new Error(`list ${prefix}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Рекурсивно обхождане: записите с id===null са „папки"
async function walk(prefix = "", out = []) {
  const items = await listFolder(prefix);
  for (const it of items) {
    const full = prefix ? `${prefix}${it.name}` : it.name;
    if (it.id === null) {
      await walk(`${full}/`, out);
    } else {
      out.push({
        path: full,
        size: it.metadata?.size ?? null,
        mimetype: it.metadata?.mimetype ?? null,
        updated_at: it.updated_at,
      });
    }
  }
  return out;
}

async function rest(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`rest ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Извлича пътя в bucket-а от публичен URL (или връща null ако не е от нашия bucket)
function toPath(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith(PUBLIC_PREFIX)) return decodeURIComponent(url.slice(PUBLIC_PREFIX.length));
  // също render/image вариант
  const m = url.match(/\/object\/(?:public|sign)\/[^/]+\/(.+)$/);
  return m ? decodeURIComponent(m[1].split("?")[0]) : null;
}

const files = await walk();

const products = await rest(
  "products?select=id,slug,name,category,archived,image_url,image_urls&order=id"
);
const articles = await rest("articles?select=id,slug,title,cover_image_url&order=id");
const siteContent = await rest("site_content?select=key,value&key=eq.polezno_hero_image");
const siteSettings = await rest("site_settings?select=id,hero_image_url");

// Събери всички пътища, реферирани от базата
const referenced = new Map(); // path -> [referenceri]
function ref(path, who) {
  if (!path) return;
  if (!referenced.has(path)) referenced.set(path, []);
  referenced.get(path).push(who);
}
for (const p of products) {
  ref(toPath(p.image_url), `products#${p.id}.image_url`);
  for (const u of p.image_urls ?? []) ref(toPath(u), `products#${p.id}.image_urls[]`);
}
for (const a of articles) ref(toPath(a.cover_image_url), `articles#${a.id}.cover_image_url`);
for (const c of siteContent) ref(toPath(c.value), `site_content[${c.key}]`);
for (const s of siteSettings) ref(toPath(s.hero_image_url), `site_settings#${s.id}.hero_image_url`);

// Хардкоднати в кода (НЕ в базата) — за информация
const codeRefs = [
  "site/texture-slice.png",
  "site/ingredients-tahini.png",
  "site/ingredients-coconut.png",
  "site/atmosphere-coffee.png",
  "site/polezno-hero-v4.webp",
].filter((p) => true);

const filePaths = new Set(files.map((f) => f.path));
const refPaths = new Set([...referenced.keys()]);

// Групиране по top-level директория
const byTop = {};
for (const f of files) {
  const top = f.path.includes("/") ? f.path.split("/")[0] : "(root)";
  (byTop[top] ??= []).push(f);
}

// Orphan файлове (в storage, но никъде не реферирани — нито в базата, нито в кода)
const codeSet = new Set(codeRefs);
const orphans = files.filter((f) => !refPaths.has(f.path) && !codeSet.has(f.path));

// Счупени референции (в базата сочат към път, който липсва в storage)
const broken = [];
for (const [p, who] of referenced) {
  if (!filePaths.has(p)) broken.push({ path: p, who });
}

const report = {
  bucket: BUCKET,
  totalFiles: files.length,
  totalBytes: files.reduce((s, f) => s + (f.size ?? 0), 0),
  topLevel: Object.fromEntries(
    Object.entries(byTop).map(([k, v]) => [
      k,
      { count: v.length, bytes: v.reduce((s, f) => s + (f.size ?? 0), 0) },
    ])
  ),
  counts: {
    products: products.length,
    productsWithImage: products.filter((p) => p.image_url || (p.image_urls ?? []).length).length,
    articles: articles.length,
    articlesWithCover: articles.filter((a) => a.cover_image_url).length,
  },
  orphans: orphans.map((f) => f.path),
  brokenRefs: broken,
};

writeFileSync(
  new URL("../scripts/storage-inventory.json", import.meta.url),
  JSON.stringify({ report, files, referenced: Object.fromEntries(referenced), products, articles, siteContent, siteSettings }, null, 2)
);

// --- Печат ---
console.log("=== STORAGE ИНВЕНТАР:", BUCKET, "===");
console.log(`Общо файлове: ${report.totalFiles}  (${(report.totalBytes / 1e6).toFixed(2)} MB)`);
console.log("\nПо директория (top-level):");
for (const [k, v] of Object.entries(report.topLevel).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${k.padEnd(14)} ${String(v.count).padStart(4)} файла   ${(v.bytes / 1e6).toFixed(2)} MB`);
}
console.log("\nБаза:");
console.log(`  продукти: ${report.counts.products} (${report.counts.productsWithImage} със снимка)`);
console.log(`  статии:   ${report.counts.articles} (${report.counts.articlesWithCover} с корица)`);
console.log(`\nOrphan файлове (в storage, но нереферирани никъде): ${orphans.length}`);
for (const o of orphans) console.log("  - " + o);
console.log(`\nСчупени референции (база сочи липсващ файл): ${broken.length}`);
for (const b of broken) console.log("  ! " + b.path + "  ←  " + b.who.join(", "));
console.log("\nПълни данни: scripts/storage-inventory.json");
