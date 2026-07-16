import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/data";

// OG картинка за споделяне (FB, Viber, Messenger, WhatsApp). Прилага се за целия сайт.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Нутрико — протеинова сладкарница без захар";
export const dynamic = "force-dynamic";

export default async function OgImage() {
  let bg: string | null = null;
  try {
    const s = await getSiteSettings();
    bg = s.hero_image_url ?? null;
  } catch {
    bg = null;
  }

  const cream = "#faf6ee";
  const brand = "#1f4733";
  const bar = { position: "absolute" as const, background: cream, borderRadius: 4 };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: brand,
        }}
      >
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg}
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
            alt=""
          />
        )}
        {/* Долен градиент за контраст */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background:
              "linear-gradient(to top, rgba(31,71,51,0.88) 0%, rgba(31,71,51,0.2) 42%, rgba(31,71,51,0) 68%)",
          }}
        />
        {/* Монограм „Н" badge долу вляво */}
        <div
          style={{
            position: "absolute",
            left: 56,
            bottom: 48,
            display: "flex",
            width: 104,
            height: 104,
            background: brand,
            borderRadius: 24,
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ ...bar, left: 30, top: 28, width: 11, height: 48 }} />
          <div style={{ ...bar, left: 63, top: 28, width: 11, height: 48 }} />
          <div style={{ ...bar, left: 30, top: 46, width: 44, height: 11 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
