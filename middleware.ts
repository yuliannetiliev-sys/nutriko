import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_EMAIL = "yulian.net.iliev@gmail.com";
const ADMIN_PATHS = ["/products", "/ingredients", "/categories", "/site", "/articles", "/content"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://xrdanumtjbrpkrjtvyjx.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_FFbgzGOpCgPastoJ57Ztig_6kIXFTvE",
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const needsAdmin = ADMIN_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (needsAdmin && (!user || user.email !== ADMIN_EMAIL)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
