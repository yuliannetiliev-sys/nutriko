import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

async function get(path) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

const [items, cats] = await Promise.all([
  get('public_menu_v?select=*'),
  get('categories?select=*'),
]);
const catOf = new Map(cats.map(c => [c.key, c]));

// Торти със свински желатин — установено от product_ingredients, НЕ са вегетариански
const GELATIN = new Set(['Горски плодове', 'Кокосова торта', 'Малина и кокос', 'Ягодов кейк']);

// Наши категории (пълни данни за рецептата) срещу препродажба (важи етикетът на производителя)
const HOUSE = new Set(['Торти', 'Баклава', 'Вафли - домашни', 'Халва', 'Ядкови барове', 'Протеинов шейк']);
const DRINKS = new Set(['Топли напитки', 'Студени напитки']);

const n1 = x => Number(x).toFixed(1).replace('.', ',');
const n0 = x => String(Math.round(Number(x)));
const eur = x => Number(x).toFixed(2);
const money = x => Number(x).toFixed(2).replace('.', ',') + ' €';
const clean = s => s.replace(/\s+/g, ' ').replace(/"/g, '').trim();

// Описателните тагове (състав); онези, които стават етикет или са в името, падат
const SKIP_TAG = /^(без захар|без глутен|веган|протеин|със захар)/i;

// Същите думи, с които сайтът брои продукта — lib/units.ts, по КЛЮЧ на категорията
// `whole: null` значи, че цената на цялото се пише просто като количество („12 бр."),
// за да не измисляме опаковка, която може и да не се продава така.
const UNITS = {
  'торта': { one: 'Парче', many: 'парчета', whole: 'Цяла торта' },
  'тава': { one: 'Парче', many: 'парчета', whole: 'Цяла тава' },
};
const unitsFor = key => UNITS[key] ?? { one: 'Порция', many: 'бр.', whole: null };

// Торти, чийто tagline не влиза в Google. Празно е — и да си остане празно:
// „Само естествен източник на протеин" на Лешников крем НЕ е рекламна претенция,
// а точното описание (в нея няма добавен изолат). Собственикът го потвърди 08.11.2026.
const NO_PROTEIN_CLAIM = new Set();

const dot = s => (/[.!?…]$/.test(s.trim()) ? s.trim() : s.trim() + '.');

function describe(it, cat, key, section) {
  const tags = (it.tags || []).filter(t => !SKIP_TAG.test(t));
  const parts = [];
  const dupTagline = it.tagline && section.toLowerCase().includes(it.tagline.trim().toLowerCase());
  if (it.tagline && !NO_PROTEIN_CLAIM.has(it.name) && !dupTagline)
    parts.push(dot(it.tagline.replace(/ · /g, ', ')));
  if (tags.length) parts.push(tags.join(', ').replace(/^./, c => c.toUpperCase()) + '.');

  if (DRINKS.has(cat)) return parts.join(' ').trim();

  const u = unitsFor(key);
  if (it.show_macros && it.protein_serving_g > 0) {
    const unit = it.serving_unit === 'ml' ? 'мл' : 'г';
    const label = it.serving_unit === 'ml' ? 'Чаша' : (HOUSE.has(cat) ? u.one : 'Опаковка');
    let m = `${label} ${n0(it.serving_weight_g)} ${unit}: ${n1(it.protein_serving_g)} г протеин, ${n1(it.carbs_serving_g)} г въглехидрати`;
    if (it.gi_estimate != null && it.gl_serving != null)
      m += `. Гликемичен индекс ${n0(it.gi_estimate)}, гликемичен товар на порцията ${n1(it.gl_serving)}`;
    parts.push(m + '.');
  }
  const sugarFree = (it.tags || []).some(t => /^без захар$/i.test(t))
    || /без захар/i.test(it.name) || /без добавена захар/i.test(it.tagline || '');
  if (sugarFree && !/без добавена захар/i.test(parts.join(' '))) parts.push('Без добавена захар.');

  if (HOUSE.has(cat) && Number(it.servings) > 1 && it.whole_price_eur)
    parts.push(u.whole
      ? `${u.whole} (${n0(it.servings)} ${u.many}): ${money(it.whole_price_eur)}.`
      : `${n0(it.servings)} ${u.many}: ${money(it.whole_price_eur)}.`);

  return parts.join(' ').trim();
}

function diet(it, cat) {
  const t = (it.tags || []).map(s => s.toLowerCase());
  const a = it.allergen_ids || [];
  const vegan = t.includes('веган');
  const out = [];
  if (HOUSE.has(cat)) {
    // Google третира Vegetarian и Vegan като взаимно изключващи се: щракването върху
    // Vegan изгасва Vegetarian. Затова веган изделията носят само Vegan (проверено 08.11.2026).
    if (vegan) out.push('Vegan');
    else if (!GELATIN.has(it.name)) out.push('Vegetarian');
    if (t.includes('без глутен')) out.push('Gluten-free');
    if (!a.includes(7)) out.push('Dairy-free');
  } else if (vegan) {
    out.push('Vegan');
  }
  return out;
}

const order = ['Торти', 'Баклава', 'Вафли - домашни', 'Халва', 'Ядкови барове', 'Протеинов шейк',
  'Шоколади', 'Шоколади със захар', 'Тахани и кремове', 'Протеинови барове', 'Топли напитки', 'Студени напитки'];

const groups = new Map();
for (const it of items) {
  const c = catOf.get(it.category);
  if (!c || c.menu_visible === false) continue;
  if (!groups.has(c.label)) groups.set(c.label, []);
  groups.get(c.label).push(it);
}

const SECTION_NAME = {
  'Торти': 'Торти без добавена захар',
  'Баклава': 'Баклава',
  'Вафли - домашни': 'Домашни вафли без захар',
  'Халва': 'Халва без захар',
  'Ядкови барове': 'Ядкови барчета',
  'Протеинов шейк': 'Протеинови шейкове',
  'Шоколади': 'Шоколади без захар',
  'Шоколади със захар': 'Шоколади със захар',
  'Тахани и кремове': 'Тахани и кремове',
  'Протеинови барове': 'Протеинови барове',
  'Топли напитки': 'Топли напитки',
  'Студени напитки': 'Студени напитки',
};

const md = [];
const json = [];
let total = 0;
const warn = [];
const unknownCats = [...groups.keys()].filter(k => !order.includes(k));

md.push('# Меню за Google бизнес профила');
md.push('');
md.push('Генерирано от базата (`public_menu_v`) на ' + new Date().toISOString().slice(0, 10) +
  '. Цените и числата НЕ са преписвани на ръка.');
md.push('');
md.push('Полетата отговарят на формата в Google: **Section name** → за всяко изделие **Item name**, ' +
  '**Item price (EUR)**, **Item description**, **Dietary restrictions**.');
md.push('');

for (const label of order) {
  // Нашите десерти водят с най-силното: първите три позиции са това, което хората
  // виждат най-напред, затова се подреждат по протеин на парче, не по азбука.
  const byProtein = HOUSE.has(label) && label !== 'Протеинов шейк';
  const list = (groups.get(label) || []).slice()
    .sort((a, b) => (a.menu_order ?? 999) - (b.menu_order ?? 999)
      || (byProtein ? Number(b.protein_serving_g) - Number(a.protein_serving_g) : 0)
      || a.name.localeCompare(b.name, 'bg'));
  if (!list.length) continue;
  const section = SECTION_NAME[label] || label;
  md.push('---');
  md.push('');
  md.push(`## ${section}  _(${list.length} поз.)_`);
  md.push('');
  for (const it of list) {
    const name = clean(it.name);
    const d = describe(it, label, it.category, section);
    const tg = diet(it, label);
    total++;
    if (d.length > 1000) warn.push(`${name}: описание ${d.length} знака (лимит 1000)`);
    if ((it.tags || []).some(t => /^без глутен$/i.test(t)) && (it.allergen_ids || []).includes(1))
      warn.push(`${name}: етикет „без глутен“, но алергенът „глутен“ е отметнат`);
    if (HOUSE.has(label) && !/без добавена захар/i.test(d))
      warn.push(`${name}: няма „без добавена захар“ — в базата липсва таг „без захар“`);
    md.push(`### ${name} — ${money(it.price_eur)}`);
    md.push(`- **Item name:** \`${name}\``);
    md.push(`- **Item price:** \`${eur(it.price_eur)}\``);
    md.push(`- **Description:** ${d || '_(празно)_'}`);
    md.push(`- **Dietary:** ${tg.length ? tg.join(' · ') : '— (нищо не се отмята)'}`);
    md.push('');
    json.push({ section, name, price: eur(it.price_eur), description: d, dietary: tg });
  }
}

md.push('---');
md.push('');
md.push(`**Общо: ${total} позиции в ${new Set(json.map(x => x.section)).size} раздела.**`);
if (unknownCats.length) { md.push(''); md.push('⚠️ Категории извън подредбата: ' + unknownCats.join(', ')); }
if (warn.length) { md.push(''); md.push('## ⚠️ Автоматично засечено'); for (const w of warn) md.push(`- ${w}`); }

md.push('');
md.push('## ⚠️ Решения, които трябва да са твои');
md.push('');
md.push('**1. Свински желатин в 4 торти.** В `product_ingredients` стои „Желатин 100/120 bloom, ' +
  'свински" при **Горски плодове, Кокосова, Малина и кокос, Ягодов кейк**. Затова при тях ' +
  '`Vegetarian` НЕ е отметнато, а `Halal`/`Kosher` не се отмятат никъде. Ако някога мине на ' +
  'агар или рибен желатин, етикетите се сменят.');
md.push('');
md.push('**2. Двойни записи за вода.** „Девин изворна вода 0.5 л“ = „Минерална вода Девин 0.500“ ' +
  'и „Девин изворна вода 1.5 л“ = „Минерална вода Девин 1.5“ — същата цена, два записа. ' +
  '**В Google са въведени по веднъж** (затова там са 89, а тук 91). ' +
  'В базата и в менюто на сайта все още излизат двойно; чисти се с `archived = true` ' +
  'на двата по-кратки записа — кажи и го правя.');
md.push('');
md.push('**3. Веган кандидати: Сникърс и Кашу и Лешник Бар.** След като медът стана сироп от ' +
  'агаве (08.11.2026), и в двата няма нищо животинско: бадемово брашно, тахан, кокосово масло, ' +
  'агаве и черен шоколад 92% без захар. Алергенът „мляко" не е отметнат при нито един. ' +
  '`Vegan` е един от само шестте етикета в Google, а засега го носят две торти. ' +
  'Кажи и слагам тага „веган" и на двете.');
md.push('');
md.push('**4. Няма етикет „без захар" в Google.** Най-силният ти довод не съществува като ' +
  'отметка — живее в името на раздела и в описанието на всяко изделие.');
md.push('');
md.push('**5. Етикетите следват сайта, не моя преценка.** `Gluten-free` се отмята само където в ' +
  'базата вече пише таг „без глутен" (това, което и сайтът показва). `Dairy-free` — само където ' +
  'алергенът „мляко" не е отметнат, и само за нашите изделия. За купените шоколади и тахани не ' +
  'отмятам нищо освен `Vegan`, където производителят го твърди: там важи техният етикет, не нашата база.');
md.push('');

fs.writeFileSync('ГУГЪЛ-МЕНЮ.md', md.join('\n'), 'utf8');
fs.writeFileSync(process.argv[2] || 'scripts/google-menu.json', JSON.stringify(json, null, 2), 'utf8');
console.log(`ok: ${total} позиции, ${new Set(json.map(x => x.section)).size} раздела`);
if (unknownCats.length) console.log('извън подредбата: ' + unknownCats.join(', '));
if (warn.length) console.log('warn:\n' + warn.join('\n'));
