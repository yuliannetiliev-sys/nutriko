import type { SiteSettings } from "@/lib/types";

/**
 * Покана за следване — слага се в дъното на менюто.
 *
 * ЗАЩО НЕ Е ОФИЦИАЛНИЯТ БУТОН НА FACEBOOK: плъгинът иска JS SDK-то на Meta,
 * което зарежда тяхното проследяване. Това го вкарва под съгласието за
 * бисквитки — тоест повечето хора няма да го видят изобщо. Отгоре на това
 * блокерите го спират, а на телефон често така или иначе се изражда в линк.
 * Обикновен линк работи навсякъде, не иска съгласие и не бави страницата;
 * на телефон Facebook го отваря директно в приложението.
 *
 * ЗАЩО В ДЪНОТО: човекът е дошъл да разгледа менюто. Покана отгоре му пречи;
 * покана отдолу идва, след като вече е видял стоката.
 *
 * Линковете идват от настройките (/site), не се пишат тук — иначе биха се
 * разминали с тези във футъра.
 */
export default function FollowCard({
  s,
  className = "mt-16",
}: {
  s: SiteSettings;
  /** отстъпът отгоре — в менюто е голям, на началната страница секцията си има свой */
  className?: string;
}) {
  const fb = s.facebook_url?.trim();
  const ig = s.instagram_url?.trim();
  if (!fb && !ig) return null;

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 " +
    "text-sm font-medium transition-colors";

  return (
    <aside className={`mx-auto ${className} max-w-2xl rounded-3xl border border-ink/10 bg-brand-50 px-6 py-8 text-center sm:px-10`}>
      <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
        <span className="h-px w-6 bg-gold" />
        Всеки ден
        <span className="h-px w-6 bg-gold" />
      </p>

      <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        Витрината се сменя
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
        Кое е готово днес и какво ново излиза — казваме първо там.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {fb && (
          <a
            href={fb}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} bg-brand text-cream hover:bg-brand-600`}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
              <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z" />
            </svg>
            Facebook
          </a>
        )}
        {ig && (
          <a
            href={ig}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} border border-ink/15 bg-white text-ink hover:border-brand/40 hover:bg-white`}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
              <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.72 2.12-1.38.66-.66 1.07-1.33 1.38-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.72-1.46-1.38-2.12C21.32 1.35 20.65.94 19.86.63 19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32A6.16 6.16 0 0012 5.84zm0 10.16a4 4 0 110-8 4 4 0 010 8zm7.85-10.4a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" />
            </svg>
            Instagram
          </a>
        )}
      </div>
    </aside>
  );
}
