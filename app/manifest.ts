import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Нутрико — протеинова сладкарница",
    short_name: "Нутрико",
    description: "Протеинови торти, вафли, халва и шейкове без добавена захар.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ee",
    theme_color: "#1f4733",
    lang: "bg",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
