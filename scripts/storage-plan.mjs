// Генерира предложен план за реорганизация от storage-inventory.json.
// САМО ИЗЧИСЛЯВА нови пътища + DB ъпдейти. Нищо не мести/трие/качва.
import { readFileSync, writeFileSync } from "node:fs";

const d = JSON.parse(readFileSync(new URL("./storage-inventory.json", import.meta.url)));
const PUB = "https://xrdanumtjbrpkrjtvyjx.supabase.co/storage/v1/object/public/product-images/";
const toPath = (u) => (u && u.startsWith(PUB) ? decodeURIComponent(u.slice(PUB.length)) : u);
const toUrl = (p) => PUB + p;
const ext = (p) => p.split(".").pop().toLowerCase();
const uniq = (arr) => [...new Set(arr.filter(Boolean))];

const moves = []; // { from, to, reason }
const dbUpdates = []; // { table, id, field, oldVal, newVal }
const codeEdits = []; // { file, old, new }
const deletes = []; // { path, reason }

// ---- Продукти ----
for (const p of d.products) {
  const ordered = uniq([toPath(p.image_url), ...((p.image_urls || []).map(toPath))]);
  if (!ordered.length) continue;
  const dir = `products/${p.id}-${p.slug}`;
  const newPaths = ordered.map((src, i) => `${dir}/${String(i + 1).padStart(2, "0")}.${ext(src)}`);
  ordered.forEach((src, i) => {
    if (src !== newPaths[i]) moves.push({ from: src, to: newPaths[i], reason: `продукт #${p.id} ${p.slug}` });
  });
  const newImageUrl = toUrl(newPaths[0]);
  const newImageUrls = newPaths.map(toUrl);
  if (p.image_url !== newImageUrl)
    dbUpdates.push({ table: "products", id: p.id, field: "image_url", oldVal: p.image_url, newVal: newImageUrl });
  // image_urls трябва да следва същия ред като ordered (dedup-нат)
  dbUpdates.push({ table: "products", id: p.id, field: "image_urls", oldVal: p.image_urls, newVal: newImageUrls });
}

// ---- Site settings hero (DB) ----
for (const s of d.siteSettings) {
  const cur = toPath(s.hero_image_url);
  if (!cur) continue;
  const to = `site/home-hero.${ext(cur)}`;
  if (cur !== to) {
    moves.push({ from: cur, to, reason: "начален hero (site_settings)" });
    dbUpdates.push({ table: "site_settings", id: s.id, field: "hero_image_url", oldVal: s.hero_image_url, newVal: toUrl(to) });
  }
}

// ---- Polezno hero (КОД default, не DB) ----
{
  const from = "site/polezno-hero-v4.webp";
  const to = "site/polezno-hero.webp";
  moves.push({ from, to, reason: "polezno hero (default в lib/content.ts)" });
  codeEdits.push({ file: "lib/content.ts", old: PUB + from, new: PUB + to });
}

// ---- Orphans → delete (по желание: архив в Drive преди това) ----
for (const o of d.report.orphans) {
  if (o === "site/polezno-hero-v4.webp") continue; // това НЕ е orphan реално (default в кода)
  deletes.push({ path: o, reason: "нереферирано (стара версия/дубликат)" });
}

// ---- Articles: без промяна (вече articles/<slug>/cover.webp) ----

const plan = { moves, dbUpdates, codeEdits, deletes };
writeFileSync(new URL("./storage-plan.json", import.meta.url), JSON.stringify(plan, null, 2));

// ---- Печат ----
const sz = (p) => {
  const f = d.files.find((x) => x.path === p);
  return f ? `${(f.size / 1e6).toFixed(1)}MB` : "?";
};
console.log(`=== ПРЕМЕСТВАНИЯ (${moves.length}) ===`);
let lastReason = "";
for (const m of moves) {
  if (m.reason !== lastReason) { console.log(`\n• ${m.reason}`); lastReason = m.reason; }
  console.log(`    ${m.from}  (${sz(m.from)})\n      → ${m.to}`);
}
console.log(`\n=== DB ЪПДЕЙТИ (${dbUpdates.length}) ===`);
for (const u of dbUpdates) {
  const ov = Array.isArray(u.oldVal) ? `[${u.oldVal.length} URL]` : (u.oldVal ? "…/" + toPath(u.oldVal) : u.oldVal);
  const nv = Array.isArray(u.newVal) ? `[${u.newVal.length} URL]` : "…/" + toPath(u.newVal);
  console.log(`  ${u.table}#${u.id}.${u.field}:  ${ov}  →  ${nv}`);
}
console.log(`\n=== КОД ПРОМЕНИ (${codeEdits.length}) ===`);
for (const c of codeEdits) console.log(`  ${c.file}:  …/${toPath(c.old)}  →  …/${toPath(c.new)}`);
console.log(`\n=== ТРИЕНЕ orphan (${deletes.length}) ===`);
for (const x of deletes) console.log(`  ${x.path}  (${sz(x.path)})  — ${x.reason}`);
console.log(`\nПодробен план: scripts/storage-plan.json`);
