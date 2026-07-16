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
  },
};

export default nextConfig;
