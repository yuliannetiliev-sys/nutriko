import Link from "next/link";
import { getUser } from "@/lib/supabase";
import { signOut } from "@/app/actions";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();

  return (
    <>
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Link href="/products" className="font-semibold tracking-tight">
            Nutrico <span className="text-neutral-400">калкулатор</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/products" className="hover:text-neutral-900">Продукти</Link>
            <Link href="/ingredients" className="hover:text-neutral-900">Съставки</Link>
            <Link href="/categories" className="hover:text-neutral-900">Категории</Link>
            <Link href="/articles" className="hover:text-neutral-900">Полезно</Link>
            <Link href="/content" className="hover:text-neutral-900">Текстове</Link>
            <Link href="/site" className="hover:text-neutral-900">Сайт</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" className="text-neutral-400 hover:text-neutral-900">Виж сайта →</Link>
            {user?.email && (
              <span className="hidden text-neutral-400 sm:inline">{user.email}</span>
            )}
            <form action={signOut}>
              <button className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50">
                Изход
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </>
  );
}
