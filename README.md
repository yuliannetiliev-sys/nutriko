# Нутрико (nutriko.fit)

Протеинова сладкарница в Търговище — публичен сайт + QR меню + вътрешен админ калкулатор
за рецепти, себестойност, макроси и гликемичен товар. Next.js + Supabase, деплой на Vercel.

> **Източникът на истината за прогреса е [`PROJECT_LOG.md`](./PROJECT_LOG.md)** — чети го първо.
> Този README е само за вдигане на проекта на нова машина.

## Стек

- **Next.js 16** (App Router) + **React 19** + **Tailwind v4**
- **Supabase** (Postgres + Auth + Storage) през `@supabase/ssr`
- **Node 24+** (разработвано на v24)
- Деплой: **Vercel** (CLI)

> ⚠️ Виж [`AGENTS.md`](./AGENTS.md) — това е персонализирана версия на Next.js; при съмнение
> чети `node_modules/next/dist/docs/` вместо да разчиташ на памет.

## Вдигане на нова машина

```bash
git clone <this-repo-url> nutrico
cd nutrico
npm install
# създай .env.local с променливите от таблицата долу
npm run dev                  # http://localhost:3000
```

### Environment променливи (`.env.local`)

`.env.local` **не е в git** (пази тайните). На нова машина го създаваш наново:

| Променлива | Тайна? | Откъде |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | не (публична) | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | не (публична, RLS пази данните) | Supabase → API → publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **ДА — никога в git** | Supabase → API → service_role (`sb_secret_…`). Само за admin скриптове/качване в Storage |
| `RESEND_API_KEY` | **ДА — никога в git** | Resend → API Keys (ключ `nutrico-site`) |

Публичните две имат fallback в кода, така че сайтът тръгва и без тях; тайните две трябват
за качване на снимки (`scripts/`) и за имейл известията от контактната форма.

## Полезни команди

```bash
npm run dev               # локална разработка
npm run build             # production билд (минава и типовете)
npx vercel --prod --yes   # деплой към production (nutriko.fit)
```

## Структура (накратко)

- `app/(public)/` — публичен сайт (меню, полезно, алергени, събития)
- `app/(admin)/` — админ панел (продукти, съставки, статии, текстове, настройки) — зад Supabase Auth
- `lib/` — данни, калкулатор (`calc.ts`), Supabase клиенти, помощници
- `scripts/` — еднократни помощни скриптове (Storage, инвентар)
- `PROJECT_LOG.md` — работен дневник + предстоящо + конвенции
