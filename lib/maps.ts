// Помощни функции за Google Maps линкове.
//
// Целта: от това, което въвеждаме в админа (споделен линк към картата и/или адрес),
// да генерираме крос-платформен "directions" линк, който на телефон отваря
// приложението Google Maps (Android) или съответната карта (iPhone) ДИРЕКТНО
// в режим "маршрут" — от текущата локация на потребителя до сладкарницата.
//
// Официален формат на Google (universal cross-platform URL):
//   https://www.google.com/maps/dir/?api=1&destination=<координати или адрес>

// Опитва да извлече координати (lat,lng) от обикновен Google Maps линк.
function extractCoords(url: string): string | null {
  if (!url) return null;
  // ...!3d43.2428!4d26.5683  — ТОЧНАТА карфица на мястото (с приоритет пред @центъра)
  let m = url.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (m) return `${m[1]},${m[2]}`;
  // ?q=42.69,23.32 / &query= / &ll= / &destination= / &daddr=
  m = url.match(/[?&](?:q|query|ll|destination|daddr)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (m) return `${m[1]},${m[2]}`;
  // .../@43.2428,26.5657,17z  — център на картата (резервен вариант)
  m = url.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (m) return `${m[1]},${m[2]}`;
  return null;
}

type MapsSource = { maps_url: string | null; address: string | null };

// Крос-платформен линк за МАРШРУТ (отваря native картата в режим навигация).
// Предпочита точни координати от maps_url; иначе ползва текста на адреса.
export function mapsDirectionsUrl(s: MapsSource): string | null {
  const coords = s.maps_url ? extractCoords(s.maps_url) : null;
  const dest = coords ?? (s.address ? s.address.replace(/\s+/g, " ").trim() : "");
  if (!dest) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
