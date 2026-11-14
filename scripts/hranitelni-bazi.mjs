// Експорт на СОБСТВЕНОТО производство за хранителни бази (FatSecret, MyFitnessPal,
// Open Food Facts) и за вътрешна справка.
//
// Пуска се от корена на проекта:   node scripts/hranitelni-bazi.mjs
// Изход: папка ХРАНИТЕЛНИ-БАЗИ/ — два CSV-а, JSON и README.
//
// Защо два CSV-а: българският Excel иска разделител „точка и запетая" и десетична
// ЗАПЕТАЯ, а всеки чужд импорт иска „запетая" и десетична ТОЧКА. Един файл не
// може и двете.
//
// Препродажбата НЕ влиза. Чуждите марки не са наши за подаване — FatSecret го
// пише изрично: подаваш само марки, които притежаваш и контролираш.

import fs from 'node:fs';
import path from 'node:path';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;   // рецептите са под RLS
if (!URL_ || !KEY) throw new Error('Липсва NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local');

async function get(p) {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`${p}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// ── Кое е наше ───────────────────────────────────────────────────────────────
// Ключ на категория → как се нарича една порция в текста на приложението.
const NASHE = {
  'торта':         s => `парче ${s} г`,
  'тава':          s => `парче ${s} г`,
  'вафла':         s => `1 бр. ${s} г`,
  'ядкови барове': s => `1 бр. ${s} г`,
  'халва':         s => `${s} г`,
  'шейк':          s => `${s} мл`,
};
const BRAND = 'Нутрико';
const ERITRITOL_ID = 166;

const ALERGEN_KRATKO = {
  1: 'Глутен', 2: 'Ракообразни', 3: 'Яйца', 4: 'Риба', 5: 'Фъстъци', 6: 'Соя',
  7: 'Мляко', 8: 'Ядки', 9: 'Целина', 10: 'Синап', 11: 'Сусам', 12: 'Сулфити',
  13: 'Лупина', 14: 'Мекотели',
};
const ALERGEN_EN = {
  1: 'Gluten', 2: 'Crustaceans', 3: 'Eggs', 4: 'Fish', 5: 'Peanuts', 6: 'Soy',
  7: 'Milk', 8: 'Tree nuts', 9: 'Celery', 10: 'Mustard', 11: 'Sesame', 12: 'Sulphites',
  13: 'Lupin', 14: 'Molluscs',
};

const [menu, products, pIng] = await Promise.all([
  get('public_menu_v?select=*'),
  get('products?select=id,slug'),
  get(`product_ingredients?select=product_id,grams&ingredient_id=eq.${ERITRITOL_ID}`),
]);

const idBySlug = new Map(products.map(p => [p.slug, p.id]));
const eritritolPoProdukt = new Map();
for (const r of pIng) {
  eritritolPoProdukt.set(r.product_id, (eritritolPoProdukt.get(r.product_id) ?? 0) + Number(r.grams || 0));
}

// ── Подготовка на редовете ───────────────────────────────────────────────────
const r1 = x => x == null ? null : Math.round(Number(x) * 10) / 10;
const r0 = x => x == null ? null : Math.round(Number(x));

// ── MyFitnessPal: марка в отделно поле, въглехидратите НЕТО (решено 14.11) ─────
// MFP няма поле за полиоли. Собственикът реши: в „Carbohydrates" отива НЕТО,
// а еритритолът се казва в името — „въглехидрати нето, + 17,5 г еритритол".
// Хората четат голямото число като „не е за мен", без да гледат калориите.
// На етикета на пакетирана кутия законът иска ОБЩО (с ред „от които полиоли").
const MFP_EDINICA = {
  'торта': g => `парче (${g} г)`, 'тава': g => `парче (${g} г)`,
  'вафла': g => `бр. (${g} г)`, 'ядкови барове': g => `бр. (${g} г)`,
  'халва': g => `порция (${g} г)`, 'шейк': g => `шейк (${g} мл)`,
};
const zapetaya = x => String(x).replace('.', ',');
function imeMFP(kategoria, ime, porciaOpisanie, eritritol) {
  let n = ime.replace(/\s+/g, ' ').trim().replace(/"([^"]+)"/g, '„$1“');
  if (kategoria === 'торта' && !/торта|тарт|кейк/i.test(n)) n = `Торта ${n}`;
  const erit = eritritol > 0 ? ` · въглехидрати нето, + ${zapetaya(eritritol)} г еритритол` : '';
  return `${n} (${porciaOpisanie}${erit})`;
}

const redove = menu
  .filter(m => NASHE[m.category] && m.show_macros && m.serving_weight_g)
  .map(m => {
    const porcii = Number(m.servings) || 1;
    const gram = Number(m.serving_weight_g);
    const pid = idBySlug.get(m.slug);
    const eritCialo = eritritolPoProdukt.get(pid) ?? 0;
    const eritPorcia = eritCialo / porcii;
    const vuglNeto = Number(m.carbs_serving_g);

    return {
      slug: m.slug,
      kategoria: m.category,
      marka: BRAND,
      produkt: m.name.replace(/\s+/g, ' ').trim(),
      imeZaPrilozhenie: `${BRAND} — ${m.name.replace(/\s+/g, ' ').trim()} (${NASHE[m.category](r0(gram))})`,
      kod: `NUTRIKO-${m.slug.toUpperCase()}`,
      porciaOpisanie: NASHE[m.category](r0(gram)),
      porciaKolichestvo: r0(gram),
      porciaEdinica: m.serving_unit === 'ml' ? 'ml' : 'g',
      kcal: r0(m.kcal_serving),
      protein: r1(m.protein_serving_g),
      vuglNeto: r1(vuglNeto),
      eritritol: r1(eritPorcia),
      vuglObshto: r1(vuglNeto + eritPorcia),
      mazniny: r1(m.fat_serving_g),
      kcal100: r1(m.kcal_100g),
      protein100: r1(m.protein_100g),
      vugl100: r1(m.carbs_100g),
      mazniny100: r1(m.fat_100g),
      gi: m.gi_estimate ?? null,
      gt: m.gl_serving ?? null,
      alergeniBG: (m.allergen_ids ?? []).map(Number).sort((a, b) => a - b).map(i => ALERGEN_KRATKO[i] ?? `#${i}`).join(', '),
      alergeniEN: (m.allergen_ids ?? []).map(Number).sort((a, b) => a - b).map(i => ALERGEN_EN[i] ?? `#${i}`).join(', '),
      sustav: (m.description ?? '').replace(/\s+/g, ' ').trim(),
      etiketi: (m.tags ?? []).join(', '),
      porcii,
      cialoTeglo: r0(gram * porcii),
      stranica: `https://nutriko.fit/menu/${m.slug}`,
      belezhka: m.carbs_note ?? '',
      mfpIme: imeMFP(m.category, m.name, NASHE[m.category](r0(gram)), r1(eritPorcia)),
      mfpPorcia: MFP_EDINICA[m.category](r0(gram)),
    };
  })
  .sort((a, b) => a.kategoria.localeCompare(b.kategoria, 'bg') || a.produkt.localeCompare(b.produkt, 'bg'));

// ── Сравнение с подаденото ───────────────────────────────────────────────────
// Приложенията пазят КОПИЕ на числата, никой не ги тегли от нашата база. Затова
// при всяко пускане скриптът сравнява с това, което е подадено, и пише
// ПРОМЕНИ.md: кои продукти са мръднали достатъчно, за да си струва да се
// поправят на ръка, и кои са с дребни разлики.
//
//   node scripts/hranitelni-bazi.mjs                    → само отчет
//   node scripts/hranitelni-bazi.mjs --podadeno         → СЛЕД като си поправил
//        приложенията: сегашните числа стават „подадени" (podadeno.json)
//   node scripts/hranitelni-bazi.mjs --podadeno slug …  → само за тези продукти
//
// Докато podadeno.json го няма (нищо не е подадено), сравнява с предишното
// пускане — с последния nutriko-foods.json.
const OUT = 'ХРАНИТЕЛНИ-БАЗИ';
fs.mkdirSync(OUT, { recursive: true });

const PRAG = {
  kcalProcent: 5,   // калории: поне 5 % разлика...
  kcalMin: 5,       // ...и поне 5 kcal на порция
  gram: 1,          // протеин, въглехидрати, мазнини, еритритол: поне 1 г на порция
};
// [ключ, етикет, мярка, вид] — вид „vinagi" = всяка промяна е за поправяне,
// „malko" = само за сведение. Името носи грамажа, затова и то е „vinagi".
const POLETA = [
  ['imeZaPrilozhenie', 'Име в приложението', '', 'vinagi'],
  ['mfpIme', 'Име в MyFitnessPal', '', 'vinagi'],
  ['porciaKolichestvo', 'Порция', null, 'vinagi'],
  ['kcal', 'Калории', 'kcal', 'kcal'],
  ['protein', 'Протеин', 'г', 'gram'],
  ['vuglObshto', 'Въглехидрати общо', 'г', 'gram'],
  ['eritritol', '…от тях еритритол', 'г', 'gram'],
  ['vuglNeto', 'Въглехидрати нето', 'г', 'gram'],
  ['mazniny', 'Мазнини', 'г', 'gram'],
  ['alergeniBG', 'Алергени', '', 'vinagi'],
  ['sustav', 'Състав (описание)', '', 'malko'],
];

const PODADENO = path.join(OUT, 'podadeno.json');
const PREDISHEN = path.join(OUT, 'nutriko-foods.json');
const chetiJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

function dataBG(d = new Date()) {
  const [dt, t] = d.toLocaleString('sv-SE', { timeZone: 'Europe/Sofia' }).split(' ');
  const [y, m, dd] = dt.split('-');
  return `${dd}.${m}.${y} ${t.slice(0, 5)}`;
}

let baza = null;   // { opisanie, produkti, podadeno: bool }
if (fs.existsSync(PODADENO)) {
  const p = chetiJson(PODADENO);
  baza = { opisanie: `подаденото на ${p.podadeno_na}`, produkti: p.produkti, podadeno: true };
} else if (fs.existsSync(PREDISHEN)) {
  baza = {
    opisanie: `предишното пускане на скрипта (${dataBG(fs.statSync(PREDISHEN).mtime)}) — ` +
      'още нищо не е отбелязано като подадено',
    produkti: chetiJson(PREDISHEN),
    podadeno: false,
  };
}

function sravni(predi, sega) {
  const stari = new Map(predi.map(r => [r.slug, r]));
  const segashni = new Set(sega.map(r => r.slug));
  const rez = { zaPoprava: [], malki: [], novi: [], mahnati: [] };
  for (const r of sega) {
    const s = stari.get(r.slug);
    if (!s) { rez.novi.push(r); continue; }
    const razliki = [];
    for (const [k, etiket, merka, vid] of POLETA) {
      const a = s[k] ?? null, b = r[k] ?? null;
      if (a === b) continue;
      let znachima;
      if (vid === 'vinagi' || a == null || b == null) znachima = vid !== 'malko';
      else if (vid === 'kcal') {
        const d = Math.abs(b - a);
        znachima = d >= PRAG.kcalMin && (a === 0 || (d / Math.abs(a)) * 100 >= PRAG.kcalProcent);
      } else if (vid === 'gram') znachima = Math.round(Math.abs(b - a) * 10) / 10 >= PRAG.gram;
      else znachima = false;
      razliki.push({ k, etiket, merka: merka ?? (r.porciaEdinica === 'ml' ? 'мл' : 'г'), a, b, znachima });
    }
    if (!razliki.length) continue;
    (razliki.some(x => x.znachima) ? rez.zaPoprava : rez.malki).push({ r, s, razliki });
  }
  for (const s of predi) if (!segashni.has(s.slug)) rez.mahnati.push(s);
  return rez;
}

const chislo = (x, merka) => x == null || x === '' ? '—'
  : typeof x === 'number' ? `${String(x).replace('.', ',')}${merka ? ' ' + merka : ''}` : String(x);

function otchet(rez, opisanie, podadeno) {
  const L = [];
  L.push('# Промени в макросите спрямо подаденото', '');
  L.push('Генерирано от `node scripts/hranitelni-bazi.mjs` — презаписва се при всяко пускане.', '');
  L.push(`**Пуснато:** ${dataBG()} · **Сравнено с:** ${opisanie}`, '');
  L.push(`**Праг:** калории ±${PRAG.kcalProcent} % (и поне ${PRAG.kcalMin} kcal) · протеин, въглехидрати, ` +
    `мазнини, еритритол ±${PRAG.gram} г на порция · всяка промяна в грамажа, името или алергените.`, '');

  L.push(`## За поправяне в приложенията: ${rez.zaPoprava.length}`, '');
  if (!rez.zaPoprava.length) L.push('Няма. Всичко в приложенията е в рамките на прага.', '');
  for (const { r, s, razliki } of rez.zaPoprava) {
    L.push(`### ${r.produkt}`, '');
    if (s.imeZaPrilozhenie !== r.imeZaPrilozhenie) L.push(`Ново име: **${r.imeZaPrilozhenie}**  `, `Старо: ${s.imeZaPrilozhenie}`, '');
    else L.push(`В приложението: ${r.imeZaPrilozhenie}`, '');
    if ((s.mfpIme ?? null) !== r.mfpIme) L.push(`MyFitnessPal — ново описание: **${r.mfpIme}**  `, `Старо: ${s.mfpIme ?? '—'}`, '');
    else L.push(`MyFitnessPal: ${r.mfpIme}`, '');
    L.push('| | Беше | Сега | |', '|---|---|---|---|');
    const smeneni = new Map(razliki.map(x => [x.k, x]));
    for (const [k, etiket, merka] of POLETA) {
      if (k === 'imeZaPrilozhenie' || k === 'mfpIme' || k === 'sustav') continue;
      const m = merka ?? (r.porciaEdinica === 'ml' ? 'мл' : 'г');
      const x = smeneni.get(k);
      const belezhka = !x ? '' : x.znachima ? '**← смени**' : 'дребно';
      L.push(`| ${etiket} | ${chislo(s[k], m)} | ${x ? '**' + chislo(r[k], m) + '**' : chislo(r[k], m)} | ${belezhka} |`);
    }
    L.push('');
    if (smeneni.has('sustav')) L.push('Описанието на състава също е сменено — новото е в CSV-а.', '');
  }

  L.push(`## Дребни промени — не е нужно да пипаш приложенията: ${rez.malki.length}`, '');
  if (!rez.malki.length) L.push('Няма.', '');
  for (const { r, razliki } of rez.malki) {
    const t = razliki.map(x => x.k === 'sustav' ? 'описанието на състава'
      : `${x.etiket.replace('…', '').toLowerCase()} ${chislo(x.a, x.merka)} → ${chislo(x.b, x.merka)}`);
    L.push(`- **${r.produkt}:** ${t.join('; ')}`);
  }
  if (rez.malki.length) L.push('');

  if (rez.novi.length) {
    L.push(`## ${podadeno ? 'Нови — още не са подадени' : 'Нови спрямо предишното пускане'}: ${rez.novi.length}`, '');
    for (const r of rez.novi) L.push(`- ${r.imeZaPrilozhenie} · ${r.kcal} kcal · протеин ${chislo(r.protein, 'г')}`);
    L.push('');
  }
  if (rez.mahnati.length) {
    L.push(`## Махнати от менюто: ${rez.mahnati.length}`, '');
    if (podadeno) L.push('Подадени са, а вече ги няма. Скрий ги или ги изтрий в приложенията.', '');
    for (const s of rez.mahnati) L.push(`- ${s.imeZaPrilozhenie}`);
    L.push('');
  }
  L.push('---', '');
  L.push('След като поправиш приложенията: `node scripts/hranitelni-bazi.mjs --podadeno` ' +
    '(или `--podadeno <slug> …` само за поправените). Тогава сегашните числа стават „подадени" ' +
    'и следващият отчет брои от тях.', '');
  return L.join('\n');
}

const args = process.argv.slice(2);
const iPod = args.indexOf('--podadeno');
const slugoveZaPodadeno = iPod >= 0 ? args.slice(iPod + 1).filter(a => !a.startsWith('--')) : null;
const rezultat = baza ? sravni(baza.produkti, redove) : null;

// ── Писане ───────────────────────────────────────────────────────────────────

const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
const zap = x => x == null ? '' : String(x).replace('.', ',');   // десетична запетая
const toch = x => x == null ? '' : String(x);                     // десетична точка

// 1) За Excel на български: разделител „;", десетична запетая, с BOM
const bgGlavi = ['Марка', 'Продукт', 'Име за приложението', 'Код', 'Категория', 'Порция',
  'Количество', 'Мярка', 'Калории/порция', 'Протеин/порция (г)', 'Въглехидрати/порция НЕТО (г)',
  'Еритритол/порция (г)', 'Въглехидрати/порция ОБЩО (г)', 'Мазнини/порция (г)',
  'Калории/100', 'Протеин/100 (г)', 'Въглехидрати/100 НЕТО (г)', 'Мазнини/100 (г)',
  'ГИ', 'ГТ на порция', 'Алергени', 'Състав', 'Етикети', 'Порции в цялото',
  'Тегло на цялото (г)', 'Страница', 'Бележка', 'MyFitnessPal — описание', 'MyFitnessPal — порция'];
const bgRedove = redove.map(r => [r.marka, r.produkt, r.imeZaPrilozhenie, r.kod, r.kategoria,
  r.porciaOpisanie, zap(r.porciaKolichestvo), r.porciaEdinica === 'ml' ? 'мл' : 'г',
  zap(r.kcal), zap(r.protein), zap(r.vuglNeto), zap(r.eritritol), zap(r.vuglObshto), zap(r.mazniny),
  zap(r.kcal100), zap(r.protein100), zap(r.vugl100), zap(r.mazniny100),
  zap(r.gi), zap(r.gt), r.alergeniBG, r.sustav, r.etiketi, zap(r.porcii), zap(r.cialoTeglo),
  r.stranica, r.belezhka, r.mfpIme, r.mfpPorcia].map(q).join(';'));
fs.writeFileSync(path.join(OUT, 'НУТРИКО-макроси-Excel.csv'),
  '﻿' + [bgGlavi.map(q).join(';'), ...bgRedove].join('\r\n'), 'utf8');

// 2) За чужд импорт: разделител „,", десетична точка, английски глави, без BOM
const enGlavi = ['brand', 'product_name', 'app_entry_name', 'code', 'category', 'serving_description',
  'serving_amount', 'serving_unit', 'calories', 'protein_g', 'carbohydrate_net_g', 'sugar_alcohol_g',
  'carbohydrate_total_g', 'fat_g', 'calories_per_100', 'protein_per_100_g', 'carbohydrate_net_per_100_g',
  'fat_per_100_g', 'glycemic_index', 'glycemic_load_per_serving', 'allergens', 'ingredients_short',
  'tags', 'servings_per_container', 'total_weight_g', 'url', 'mfp_description', 'mfp_serving_unit'];
const enRedove = redove.map(r => [r.marka, r.produkt, r.imeZaPrilozhenie, r.kod, r.kategoria,
  r.porciaOpisanie, toch(r.porciaKolichestvo), r.porciaEdinica,
  toch(r.kcal), toch(r.protein), toch(r.vuglNeto), toch(r.eritritol), toch(r.vuglObshto), toch(r.mazniny),
  toch(r.kcal100), toch(r.protein100), toch(r.vugl100), toch(r.mazniny100),
  toch(r.gi), toch(r.gt), r.alergeniEN, r.sustav, r.etiketi, toch(r.porcii), toch(r.cialoTeglo),
  r.stranica, r.mfpIme, r.mfpPorcia].map(q).join(','));
fs.writeFileSync(path.join(OUT, 'nutriko-foods-upload.csv'),
  [enGlavi.map(q).join(','), ...enRedove].join('\n'), 'utf8');

// 3) JSON — ако потрябва на скрипт или на сайта
fs.writeFileSync(path.join(OUT, 'nutriko-foods.json'), JSON.stringify(redove, null, 2), 'utf8');

// ── Отчет в конзолата ────────────────────────────────────────────────────────
process.stdout.write(`Изнесени: ${redove.length} собствени продукта\n`);
const poKat = {};
for (const r of redove) (poKat[r.kategoria] ??= []).push(r);
for (const [k, v] of Object.entries(poKat)) process.stdout.write(`  ${k}: ${v.length}\n`);

const sErit = redove.filter(r => r.eritritol > 0);
process.stdout.write(`\nС еритритол: ${sErit.length} от ${redove.length} — при тях ОБЩО се различава от НЕТО\n`);
for (const r of sErit.sort((a, b) => b.eritritol - a.eritritol))
  process.stdout.write(`  ${r.produkt}: нето ${r.vuglNeto} + ${r.eritritol} еритритол = ${r.vuglObshto} г общо\n`);

const bezGi = redove.filter(r => r.gi == null);
if (bezGi.length) process.stdout.write(`\n⚠ Без ГИ: ${bezGi.map(r => r.produkt).join(', ')}\n`);
const bezAlergeni = redove.filter(r => !r.alergeniBG);
if (bezAlergeni.length) process.stdout.write(`⚠ Без алергени: ${bezAlergeni.map(r => r.produkt).join(', ')}\n`);

// 4) Промените спрямо подаденото → ПРОМЕНИ.md (+ podadeno.json при --podadeno)
if (rezultat) {
  process.stdout.write(`\nПромени спрямо ${baza.opisanie}:\n`);
  process.stdout.write(`  За поправяне в приложенията: ${rezultat.zaPoprava.length}` +
    (rezultat.zaPoprava.length ? ` — ${rezultat.zaPoprava.map(x => x.r.produkt).join(', ')}` : '') + '\n');
  process.stdout.write(`  Дребни: ${rezultat.malki.length} · Нови: ${rezultat.novi.length} · Махнати: ${rezultat.mahnati.length}\n`);
} else {
  process.stdout.write('\nПромени: няма с какво да се сравни — това е първото пускане.\n');
}

let zaOtchet = baza;
if (slugoveZaPodadeno) {
  const poznati = new Set(redove.map(r => r.slug));
  const nepoznati = slugoveZaPodadeno.filter(s => !poznati.has(s));
  if (nepoznati.length) {
    process.stdout.write(`\n✗ Няма такива продукти: ${nepoznati.join(', ')} — нищо не е отбелязано като подадено.\n`);
    process.exitCode = 1;
  } else {
    let produkti;
    if (!slugoveZaPodadeno.length) produkti = redove;
    else {
      const m = new Map((baza?.podadeno ? baza.produkti : []).map(r => [r.slug, r]));
      for (const r of redove) if (slugoveZaPodadeno.includes(r.slug)) m.set(r.slug, r);
      produkti = [...m.values()];
    }
    const koga = dataBG();
    fs.writeFileSync(PODADENO, JSON.stringify({ podadeno_na: koga, produkti }, null, 2), 'utf8');
    zaOtchet = { opisanie: `подаденото на ${koga}`, produkti, podadeno: true };
    process.stdout.write(`\n✓ Отбелязано като подадено: ${slugoveZaPodadeno.length ? slugoveZaPodadeno.join(', ') : `всички ${produkti.length}`}\n`);
  }
}

fs.writeFileSync(path.join(OUT, 'ПРОМЕНИ.md'), zaOtchet
  ? otchet(sravni(zaOtchet.produkti, redove), zaOtchet.opisanie, zaOtchet.podadeno)
  : `# Промени в макросите\n\nПуснато: ${dataBG()}. Първо пускане — няма с какво да се сравни.\n`, 'utf8');
process.stdout.write(`  → ${OUT}/ПРОМЕНИ.md\n`);
