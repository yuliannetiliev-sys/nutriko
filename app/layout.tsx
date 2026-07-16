import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nutriko.fit";

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Нутрико — протеинова сладкарница без захар",
    template: "%s · Нутрико",
  },
  description:
    "Протеинови торти, вафли, халва и шейкове с тахан — без добавена захар. По-здравословното изкушение с истински макроси, грамажи и алергени в менюто.",
  applicationName: "Нутрико",
  keywords: [
    "протеинови торти",
    "торти без захар",
    "десерти без захар",
    "протеинова сладкарница",
    "халва с протеин",
    "протеинови вафли",
    "здравословни десерти",
    "сладкарница Търговище",
    "Нутрико",
  ],
  openGraph: {
    type: "website",
    locale: "bg_BG",
    siteName: "Нутрико",
    url: SITE_URL,
    title: "Нутрико — протеинова сладкарница без захар",
    description:
      "Протеинови торти, вафли, халва и шейкове с тахан — без добавена захар. По-здравословното изкушение с истински макроси.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Нутрико — протеинова сладкарница без захар",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Нутрико — протеинова сладкарница без захар",
    description: "Протеинови десерти без добавена захар, с истински макроси.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
  verification: { google: "gxtor0ZFCV-xxAJZyDnqokeRu7iEk9Ai_dMmMDDXHHc" },
};

export const viewport: Viewport = {
  themeColor: "#1f4733",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bg" className={`${playfair.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
