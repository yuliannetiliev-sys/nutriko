"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: [string, string][] = [
  ["/planer", "Поръчки"],
  ["/planer/kuhnya", "Кухня"],
];

export default function PlanerNav() {
  const path = usePathname();
  const kitchen = path.startsWith("/planer/kuhnya");
  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map(([href, label]) => {
        const active = href === "/planer/kuhnya" ? kitchen : !kitchen;
        return (
          <Link
            key={href}
            href={href}
            className={
              "rounded-lg px-3 py-2 font-medium " +
              (active ? "bg-[#1f4733] text-white" : "text-neutral-600 active:bg-neutral-100")
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
