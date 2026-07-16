// QR карта за печат — събитие „1 година Finesse" (2026-07-16).
// Изход: A6 карта (300 dpi) + A4 лист с 4 карти за рязане.
//   node scripts/make-finesse-qr.mjs
import QRCode from "qrcode";
import sharp from "sharp";

const OUT = "C:/Users/YU/Downloads/CLAUDE/Nutriko/nutriko-photos/events/finesse";
const URL = "https://nutriko.fit/finesse";

const GREEN = "#1f4733";
const CREAM = "#faf6ee";
const GOLD = "#c69a5b";
const SERIF = "Georgia, 'Times New Roman', serif";

// A6 @ 300 dpi
const W = 1240;
const H = 1748;
const QR_BOX = 880; // кремав панел
const QR = 780; // самият код

const bg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${GREEN}"/>
  <text x="${W / 2}" y="185" text-anchor="middle" font-family="${SERIF}" font-size="88" font-weight="600" letter-spacing="14" fill="${CREAM}">НУТРИКО</text>
  <rect x="${W / 2 - 80}" y="222" width="160" height="6" rx="3" fill="${GOLD}"/>
  <text x="${W / 2}" y="308" text-anchor="middle" font-family="${SERIF}" font-size="44" font-style="italic" fill="${GOLD}">за гостите на Finesse</text>
  <text x="${W / 2}" y="460" text-anchor="middle" font-family="${SERIF}" font-size="76" font-weight="600" fill="${CREAM}">Какво има в чашката?</text>
  <rect x="${(W - QR_BOX) / 2}" y="530" width="${QR_BOX}" height="${QR_BOX}" rx="40" fill="${CREAM}"/>
  <text x="${W / 2}" y="1530" text-anchor="middle" font-family="${SERIF}" font-size="42" fill="${CREAM}">Сканирай с камерата на телефона</text>
  <text x="${W / 2}" y="1600" text-anchor="middle" font-family="${SERIF}" font-size="40" font-weight="600" fill="${GOLD}">nutriko.fit/finesse</text>
  <rect x="${W / 2 - 80}" y="1642" width="160" height="5" rx="2.5" fill="${GOLD}"/>
  <text x="${W / 2}" y="1706" text-anchor="middle" font-family="${SERIF}" font-size="34" fill="${CREAM}" opacity="0.85">Без добавена бяла захар · Повече протеин</text>
</svg>`;

async function run() {
  // QR кодът: тъмнозелени модули върху крема (висок контраст, error correction H)
  const qrPng = await QRCode.toBuffer(URL, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 0,
    width: QR,
    color: { dark: GREEN, light: CREAM },
  });

  const card = await sharp(Buffer.from(bg))
    .composite([{ input: qrPng, left: Math.round((W - QR) / 2), top: 530 + (QR_BOX - QR) / 2 }])
    .png()
    .toBuffer();
  await sharp(card).toFile(`${OUT}/qr-card-a6.png`);
  console.log("OK qr-card-a6.png (1240x1748 @300dpi)");

  // A4 лист (2480×3508) с 4 карти 2×2 — печаташ и режеш
  const a4 = await sharp({
    create: { width: 2480, height: 3508, channels: 3, background: "#ffffff" },
  })
    .composite([
      { input: card, left: 0, top: 4 },
      { input: card, left: 1240, top: 4 },
      { input: card, left: 0, top: 1756 },
      { input: card, left: 1240, top: 1756 },
    ])
    .png()
    .toFile(`${OUT}/qr-sheet-a4.png`);
  console.log("OK qr-sheet-a4.png (A4, 4 карти за рязане)");
}

run().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
