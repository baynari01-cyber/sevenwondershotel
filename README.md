# Seven Wonders Hotel Petra — Premium website & booking platform (demo)

A proposal demonstration prepared by **BAYNARI** for Seven Wonders Hotel, Wadi Musa, Petra. It is not the hotel's official website and has not been commissioned or approved by the hotel. All rates, availability, reservations and guests are fictional and labelled as such.

- Public website (EN `/`, AR `/ar`): cinematic homepage, rooms & suites, experiences, gallery, about, contact.
- Direct booking engine (`/book`): six steps, server-side pricing, transactional oversell-safe reservations, printable confirmation.
- Hotel dashboard (`/admin`): overview, reservations, occupancy calendar, rooms, rates & availability, content, inbox, reports, settings, users, demo reset.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · Radix primitives (shadcn-style components) · next-intl (EN/AR, RTL) · Prisma 7 + PostgreSQL · Zod · React Hook Form · decimal.js · Vitest · Playwright.

## Quick start

```bash
pnpm install
cp .env.example .env         # fill DATABASE_URL, SESSION_SECRET, DEMO_ADMIN_PASSWORD
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Sign in at `/admin/login` with `admin@demo.baynari.local` and the `DEMO_ADMIN_PASSWORD` you set.

## Documentation

| Document | Purpose |
| --- | --- |
| `docs/HOTEL_RESEARCH.md` | Research report with every fact classified (official / other source / assumed / requires confirmation) |
| `docs/VISUAL_DIRECTION.md` | Creative direction, palette, typography, motion, RTL rules |
| `docs/ASSET_INVENTORY.md` | Photo sources, licences and attribution |
| `docs/FEATURES.md` | Client-facing feature summary and demo script |
| `docs/DEPLOYMENT.md` | Environment variables, Vercel + hosted PostgreSQL setup |
| `docs/QA_REPORT.md` | What was tested, how, and the results |

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` | ESLint (incl. React Compiler rules) / `tsc --noEmit` |
| `pnpm test` | Unit tests (pricing, availability, dates, reports) |
| `pnpm test:integration` | Database tests (concurrency, server-side totals, blocks) |
| `pnpm test:e2e` | Playwright end-to-end (set `PLAYWRIGHT_CHROMIUM_PATH` if browsers are not installed) |
| `pnpm db:migrate` / `pnpm db:deploy` / `pnpm db:seed` / `pnpm db:studio` | Prisma |

## Project layout

```
prisma/              schema, migrations, seed entry point
messages/            en.json, ar.json translation catalogues
public/images/       optimised hotel photography and licensed Petra imagery
src/app/[locale]/    (site) public pages · admin/(dashboard) protected pages · api route handlers
src/components/      ui primitives · site · booking wizard · admin
src/lib/booking/     pure pricing & availability engine + transactional service
src/lib/actions/     server actions (public booking, contact, admin modules)
src/lib/auth/        sessions, permissions, password hashing
src/lib/data/        read models (public, admin, reservations, reports)
src/lib/demo/        seed content and demo reset
tests/, e2e/         Vitest and Playwright suites
```
