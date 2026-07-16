// A4 флайер за ламиниране — събитие „1 година Finesse".
// Светъл фон, двете обработени чашки отгоре, QR отдолу.
//   node scripts/make-finesse-flyer.mjs
import QRCode from "qrcode";
import sharp from "sharp";

const DIR = "C:/Users/YU/Downloads/CLAUDE/Nutriko/nutriko-photos/events/finesse";
const URL = "https://nutriko.fit/finesse";

const GREEN = "#1f4733";
const CREAM = "#faf6ee";
const GOLD = "#c69a5b";
const INK = "#1d2a22";
const SERIF = "Georgia, 'Times New Roman', serif";

// A4 @ 300 dpi
const W = 2480;
const H = 3508;
const PHOTO = 1080; // страна на квадратната снимка
const GAP = 90; // между снимките
const PX = (W - PHOTO * 2 - GAP) / 2; // ляв отстъп на снимките
const PY = 660; // горен ръб на снимките
const QR_PANEL = 840;
const QR = 720;
const QPX = (W - QR_PANEL) / 2;
const QPY = 1980;

const bg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  <text x="${W / 2}" y="255" text-anchor="middle" font-family="${SERIF}" font-size="104" font-weight="600" letter-spacing="16" fill="${GREEN}">НУТРИКО</text>
  <rect x="${W / 2 - 90}" y="300" width="180" height="6" rx="3" fill="${GOLD}"/>
  <text x="${W / 2}" y="400" text-anchor="middle" font-family="${SERIF}" font-size="52" font-style="italic" fill="${GOLD}">за гостите на Finesse — честита първа година!</text>
  <text x="${W / 2}" y="560" text-anchor="middle" font-family="${SERIF}" font-size="92" font-weight="600" fill="${INK}">Какво има в чашката?</text>

  <text x="${PX + PHOTO / 2}" y="${PY + PHOTO + 88}" text-anchor="middle" font-family="${SERIF}" font-size="56" font-weight="600" fill="${GREEN}">Кокосова торта</text>
  <text x="${PX + PHOTO + GAP + PHOTO / 2}" y="${PY + PHOTO + 88}" text-anchor="middle" font-family="${SERIF}" font-size="56" font-weight="600" fill="${GREEN}">Торта Крема Мус</text>

  <rect x="${QPX}" y="${QPY}" width="${QR_PANEL}" height="${QR_PANEL}" rx="44" fill="#ffffff" stroke="${GOLD}" stroke-width="5"/>

  <text x="${W / 2}" y="${QPY + QR_PANEL + 120}" text-anchor="middle" font-family="${SERIF}" font-size="52" fill="${INK}">Сканирай с камерата — съставки, макроси и още</text>
  <text x="${W / 2}" y="${QPY + QR_PANEL + 205}" text-anchor="middle" font-family="${SERIF}" font-size="56" font-weight="600" fill="${GOLD}">nutriko.fit/finesse</text>
  <rect x="${W / 2 - 90}" y="${QPY + QR_PANEL + 250}" width="180" height="5" rx="2.5" fill="${GOLD}"/>
  <text x="${W / 2}" y="${QPY + QR_PANEL + 330}" text-anchor="middle" font-family="${SERIF}" font-size="46" fill="${GREEN}">Без добавена бяла захар · Повече протеин · Истински съставки</text>
</svg>`;

// Заоблени ъгли за снимка
const roundedMask = (size, r) =>
  Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`
  );

async function roundedPhoto(file, size, r) {
  return sharp(`${DIR}/${file}`)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: roundedMask(size, r), blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function run() {
  const qrPng = await QRCode.toBuffer(URL, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 0,
    width: QR,
    color: { dark: GREEN, light: "#ffffff" },
  });

  const [cocos, mus] = await Promise.all([
    roundedPhoto("kokosova.png", PHOTO, 48),
    roundedPhoto("krema-mus.png", PHOTO, 48),
  ]);

  await sharp(Buffer.from(bg))
    .composite([
      { input: cocos, left: PX, top: PY },
      { input: mus, left: PX + PHOTO + GAP, top: PY },
      { input: qrPng, left: Math.round((W - QR) / 2), top: QPY + (QR_PANEL - QR) / 2 },
    ])
    .png()
    .toFile(`${DIR}/flyer-a4.png`);
  console.log("OK flyer-a4.png (A4 2480x3508 @300dpi, светъл фон)");
}

run().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
