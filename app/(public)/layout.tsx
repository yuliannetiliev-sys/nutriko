import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { getSiteSettings } from "@/lib/data";
import { mapsDirectionsUrl } from "@/lib/maps";
import CookieConsent from "./CookieConsent";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const s = await getSiteSettings();
  const brand = s.brand_name || "НУТРИКО";
  const directions = mapsDirectionsUrl(s);

  return (
    <div className="min-h-full bg-cream text-ink">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-brand">
            {brand}
          </Link>
          <nav className="flex items-center gap-4 text-sm sm:gap-6">
            <Link
              href="/"
              className="-my-2 rounded px-1 py-2 text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Начало
            </Link>
            <Link
              href="/polezno"
              className="-my-2 rounded px-1 py-2 text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Полезно
            </Link>
            <Link
              href="/menu"
              className="rounded-full bg-brand px-5 py-2 font-medium text-cream transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Меню
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mt-24 border-t border-ink/10 bg-brand text-cream">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-14 sm:grid-cols-3">
          <div>
            <p className="font-display text-2xl font-semibold">{brand}</p>
            <p className="mt-2 max-w-xs text-sm text-cream/70">
              Протеинова сладкарница — десерти без добавена захар, с повече протеин и истински
              съставки.
            </p>
            {(s.instagram_url || s.facebook_url) && (
              <div className="mt-4 flex gap-3 text-sm">
                {s.instagram_url && (
                  <a href={s.instagram_url} className="text-cream/85 hover:text-white">
                    Instagram
                  </a>
                )}
                {s.facebook_url && (
                  <a href={s.facebook_url} className="text-cream/85 hover:text-white">
                    Facebook
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="text-sm">
            <p className="mb-3 font-medium uppercase tracking-wider text-cream/60">Разгледай</p>
            <ul className="space-y-2 text-cream/85">
              <li>
                <Link href="/" className="hover:text-white">
                  Начало
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-white">
                  Меню
                </Link>
              </li>
              <li>
                <Link href="/polezno" className="hover:text-white">
                  Полезно
                </Link>
              </li>
              <li>
                <Link href="/alergeni" className="hover:text-white">
                  Алергени
                </Link>
              </li>
            </ul>
          </div>

          <div className="text-sm">
            <p className="mb-3 font-medium uppercase tracking-wider text-cream/60">Контакти</p>
            <div className="space-y-1.5 text-cream/85">
              {s.address &&
                (directions ? (
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block whitespace-pre-line underline-offset-2 hover:text-white hover:underline"
                    title="Отвори маршрут в Google Maps"
                  >
                    {s.address}
                  </a>
                ) : (
                  <p className="whitespace-pre-line">{s.address}</p>
                ))}
              {s.phone && (
                <p>
                  <a href={`tel:${s.phone.replace(/\s+/g, "")}`} className="hover:text-white">
                    {s.phone}
                  </a>
                </p>
              )}
              {s.email && (
                <p>
                  <a href={`mailto:${s.email}`} className="hover:text-white">
                    {s.email}
                  </a>
                </p>
              )}
              {s.hours && <p className="whitespace-pre-line text-cream/60">{s.hours}</p>}
              {!s.address && !s.phone && !s.email && (
                <p className="text-cream/50">Добави контакти от админ → Сайт.</p>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-cream/15">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-5 text-xs text-cream/50">
            <span>© {new Date().getFullYear()} {brand}. Всички права запазени.</span>
            <Link href="/poveritelnost" className="hover:text-white">
              Поверителност
            </Link>
          </div>
        </div>
      </footer>
      <CookieConsent />
      <Analytics />
    </div>
  );
}
