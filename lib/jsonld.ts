import type { SiteSettings } from "./types";

// Structured data (schema.org) за локален бизнес — помага на Google + Карти
// да показват богат резултат (адрес, часове, телефон, рейтинг-готовност).

const BG_DAYS: Record<string, string> = {
  понеделник: "Monday",
  вторник: "Tuesday",
  сряда: "Wednesday",
  четвъртък: "Thursday",
  петък: "Friday",
  събота: "Saturday",
  неделя: "Sunday",
};
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function coords(mapsUrl: string | null): { lat: number; lng: number } | null {
  if (!mapsUrl) return null;
  let m = mapsUrl.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (!m) m = mapsUrl.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null;
}

// Парсва свободен текст „Понеделник - Петък 07:00 - 19:00" → OpeningHoursSpecification.
function parseHours(hours: string | null) {
  if (!hours) return [];
  const specs: { "@type": string; dayOfWeek: string[]; opens: string; closes: string }[] = [];
  for (const line of hours.split(/\n+/)) {
    const m = line
      .toLowerCase()
      .match(/([а-я]+)\s*[-–]\s*([а-я]+)\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (!m) continue;
    const from = BG_DAYS[m[1]];
    const to = BG_DAYS[m[2]];
    if (!from || !to) continue;
    const i = DAY_ORDER.indexOf(from);
    const j = DAY_ORDER.indexOf(to);
    if (i < 0 || j < 0) continue;
    const days =
      i <= j ? DAY_ORDER.slice(i, j + 1) : [...DAY_ORDER.slice(i), ...DAY_ORDER.slice(0, j + 1)];
    specs.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days,
      opens: m[3].padStart(5, "0"),
      closes: m[4].padStart(5, "0"),
    });
  }
  return specs;
}

export function localBusinessJsonLd(s: SiteSettings, siteUrl: string) {
  const geo = coords(s.maps_url);
  const street = (s.address ?? "")
    .replace(/гр\.?\s*търговище,?/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: s.brand_name || "Нутрико",
    description:
      "Протеинова сладкарница — торти, вафли, халва, шейкове и смутита без добавена бяла захар.",
    url: siteUrl,
    image: s.hero_image_url || `${siteUrl}/opengraph-image`,
    priceRange: "€€",
    currenciesAccepted: "EUR, BGN",
    servesCuisine: "Протеинови десерти, торти, вафли, халва и шейкове",
    address: {
      "@type": "PostalAddress",
      streetAddress: street || "ул. Екзарх Йосиф №4, кв. Вароша",
      addressLocality: "Търговище",
      postalCode: "7703",
      addressCountry: "BG",
    },
  };
  if (s.phone) ld.telephone = s.phone;
  if (s.email) ld.email = s.email;
  if (geo) ld.geo = { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng };
  if (s.maps_url) ld.hasMap = s.maps_url;
  const hours = parseHours(s.hours);
  if (hours.length) ld.openingHoursSpecification = hours;
  const sameAs = [s.instagram_url, s.facebook_url].filter(Boolean);
  if (sameAs.length) ld.sameAs = sameAs;
  return ld;
}
