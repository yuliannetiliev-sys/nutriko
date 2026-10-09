import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Снимки от телефон надхвърлят дефолтния 1 MB лимит за server actions
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  // Оптимизация на снимките от нашия Supabase Storage (resize + webp)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xrdanumtjbrpkrjtvyjx.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Vercel таксува „трансформация" за всяка нова двойка (снимка + ширина).
    // По подразбиране кешът живее само 4 часа, тоест всяка снимка се обработва
    // наново по няколко пъти на ден и безплатните 5000/месец се изчерпват за
    // седмици. 31 дни означава веднъж месечно на снимка.
    minimumCacheTTL: 2678400,
    // Най-широкото място в дизайна е 1024 px. 3840 (4K) никой тук не го иска,
    // а всяка излишна ширина е отделна трансформация.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Миниатюрите в менюто и галерията са между 56 и 384 px
    imageSizes: [64, 96, 128, 256, 384],
  },
};

export default nextConfig;
