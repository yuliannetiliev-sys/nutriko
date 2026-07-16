import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Публични стойности (анон ключът е публичен по дизайн; RLS пази данните).
// Fallback-ите позволяват деплой без ръчно конфигуриране на env.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://xrdanumtjbrpkrjtvyjx.supabase.co";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_FFbgzGOpCgPastoJ57Ztig_6kIXFTvE";

// Единствен админ — RLS политиките и проверките са вързани за този имейл.
export const ADMIN_EMAIL = "yulian.net.iliev@gmail.com";

// Анонимен клиент (без сесия) — за публичните четения и контактната форма.
export function db() {
  return createClient(URL!, ANON!, { auth: { persistSession: false } });
}

// Клиент със сесия от бисквитките — става „authenticated" при вписан админ.
export async function getDb() {
  const store = await cookies();
  return createServerClient(URL!, ANON!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Извикано от Server Component — middleware опреснява сесията.
        }
      },
    },
  });
}

export async function getUser() {
  const supabase = await getDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAdmin() {
  const user = await getUser();
  if (!user || user.email !== ADMIN_EMAIL) throw new Error("Няма достъп. Влез в админа.");
  return user;
}

export const num = (v: unknown): number =>
  v === null || v === undefined ? 0 : typeof v === "number" ? v : Number(v);

export const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);
