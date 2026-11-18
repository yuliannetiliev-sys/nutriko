import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlannerUser } from "@/lib/planer";
import { signOut } from "@/app/actions";
import PlanerNav from "./PlanerNav";

export const metadata: Metadata = {
  title: "Планер",
  robots: { index: false, follow: false },
};

export default async function PlanerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const u = await getPlannerUser();
  if (!u) redirect("/login");

  const exit = (
    <form action={signOut}>
      <button className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-600 active:bg-neutral-100">
        Изход
      </button>
    </form>
  );

  if (!u.isAdmin && !u.staff) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold">Няма достъп до планера</p>
        <p className="text-sm text-neutral-500">
          Профилът {u.email} не е служител на Нутрико или е спрян. Обърнете се към собственика.
        </p>
        {exit}
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3">
          <span className="mr-1 font-semibold tracking-tight text-[#1f4733]">Нутрико</span>
          <PlanerNav />
          <div className="ml-auto flex items-center gap-2">
            {u.isAdmin && (
              <Link href="/products" className="hidden text-sm text-neutral-400 sm:inline">
                Админ →
              </Link>
            )}
            {exit}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-3 pb-16 pt-4">{children}</main>
    </div>
  );
}
