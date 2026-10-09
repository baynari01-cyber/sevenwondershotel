# Deployment Guide

**Live demo (BAYNARI):** https://sevenwonders-baynari-demo.vercel.app · Arabic: https://sevenwonders-baynari-demo.vercel.app/ar · Dashboard: https://sevenwonders-baynari-demo.vercel.app/admin

Hosted on Vercel (team `baynari01`, project `sevenwonders-baynari-demo`, production branch `claude/modest-davinci-m1lpjz`) with a Neon PostgreSQL project `sevenwonders-hotel-demo` (eu-central-1). Demo account passwords were set as the `DEMO_ADMIN_PASSWORD` environment variable in the Vercel project; the Vercel dashboard shows it under Settings → Environment Variables.

The project is a standard Next.js 16 application with Prisma 7 and PostgreSQL. It is prepared for Vercel with a hosted PostgreSQL database (Neon is used for the BAYNARI demo; any PostgreSQL 14+ works).

## 1. Environment variables

Copy `.env.example` and set every value. Never commit `.env`.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. For Neon use the pooled connection string with `?sslmode=require`. Prisma reads it through `prisma.config.ts`; the runtime client uses the `pg` driver adapter. |
| `SESSION_SECRET` | yes | 32+ random characters used to sign admin session cookies (`openssl rand -hex 32`). Rotating it signs everyone out. |
| `DEMO_ADMIN_EMAIL` | seed | Email of the demo administrator created by the seed (default `admin@demo.baynari.local`). |
| `DEMO_ADMIN_PASSWORD` | seed + reset | Password assigned to all four demo accounts by `pnpm db:seed` and by the "Reset demo data" button. Minimum 10 characters. Choose a strong value for a public demo. |
| `NEXT_PUBLIC_SITE_URL` | yes | Public origin, used for canonical URLs, Open Graph and structured data. |

Server-only variables are never exposed to the browser; only `NEXT_PUBLIC_SITE_URL` is public.

## 2. Local development

```bash
pnpm install
cp .env.example .env            # edit values
pnpm db:migrate                 # applies prisma/migrations to DATABASE_URL
pnpm db:seed                    # loads the demo dataset (idempotent: clears demo data, keeps users)
pnpm dev                        # http://localhost:3000
```

Demo accounts after seeding (all share `DEMO_ADMIN_PASSWORD`):

| Email | Role |
| --- | --- |
| admin@demo.baynari.local | Administrator (users, settings, demo reset) |
| manager@demo.baynari.local | Manager |
| frontdesk@demo.baynari.local | Front desk |
| viewer@demo.baynari.local | Read-only |

## 3. Vercel

1. Create a Vercel project from this repository (framework preset: Next.js, package manager pnpm). `postinstall` runs `prisma generate`; the build script runs `prisma generate && next build`.
2. Add the environment variables above for Production (and Preview if you want preview deployments).
3. Provision a PostgreSQL database (e.g. Neon → create project → copy the pooled connection string into `DATABASE_URL`).
4. Apply migrations and seed once from your machine, pointing at the hosted database:
   ```bash
   DATABASE_URL="postgresql://…" pnpm db:deploy
   DATABASE_URL="postgresql://…" DEMO_ADMIN_PASSWORD="…" pnpm db:seed
   ```
   (`db:deploy` runs `prisma migrate deploy`, which is non-interactive and safe for CI.)
5. Deploy. The public site is at `/` (English) and `/ar` (Arabic); the admin is at `/admin`.

Notes

- The admin area is protected by signed HTTP-only cookies and role-based authorization on every server action. For a public sales demo you may additionally enable Vercel Deployment Protection (password) on the whole project.
- Image uploads from the admin are written to `public/uploads` on local disk, which is ephemeral on Vercel. Swap `src/app/api/admin/upload/route.ts` to Vercel Blob or S3 for a production rollout; URLs are stored in the database so no other code changes are needed.
- `robots` is set to `noindex` for the demo. Remove that in `src/app/[locale]/layout.tsx` for a real launch.
- The database connection uses the `pg` pool; on Neon prefer the pooled (`-pooler`) host for serverless functions.

## 4. Demo reset

Administrators and managers can reset the demonstration from **Settings → Demo tools**. The reset deletes every reservation, guest, block and content edit, then re-seeds the original dataset with today's date as the reference point. User accounts are kept. Run it before every presentation.

## 5. Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test                 # unit tests (pricing, availability, dates, reports)
pnpm test:integration     # database tests incl. concurrent overselling guard (needs DATABASE_URL)
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium pnpm test:e2e   # end-to-end, needs a running server (E2E_BASE_URL)
pnpm build
```
