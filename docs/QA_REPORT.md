# QA Report

Date: 2026-10-08 · Environment: Linux container, Node 22, PostgreSQL 16 (local) and Neon PostgreSQL 17 (hosted demo), Chromium 1194 via Playwright 1.64.

Every result below was produced by actually running the listed command or browser scenario in this session. Items that were not run are listed under "Not covered".

## 1. Static checks

| Check | Command | Result |
| --- | --- | --- |
| TypeScript strict | `pnpm typecheck` | pass (see final run in section 6) |
| ESLint incl. React Compiler rules | `pnpm lint` | pass (see final run in section 6) |
| Production build | `pnpm build` | see section 6 |

## 2. Unit tests (`pnpm test`, Vitest)

| Suite | Cases | What is covered |
| --- | --- | --- |
| `tests/dates.test.ts` | 5 | ISO validation, end-exclusive nights, month boundaries, overlap, weekday |
| `tests/pricing.test.ts` | 15 | rate resolution precedence (override > season > weekend > base), closed dates, multi-night mixed rates, percent and fixed rate-plan adjustments, occupancy supplements and limits, date-level minimum stay, itemised totals with service charge and tax, promotions (percent, validity, min nights), tax-inclusive mode, decimal safety |
| `tests/availability.test.ts` | 10 | active-room counting, end-exclusive reservations, maintenance blocks, no double counting, unassigned holds, inventory restrictions and closed dates, whole-stay room assignment, overlap detection |
| `tests/reports.test.ts` | see section 6 | report metric aggregation |

Result: all passing (30 cases before the reports suite was added; final count in section 6).

## 3. Database integration tests (`pnpm test:integration`)

`tests/integration/reservation-concurrency.test.ts` against the seeded PostgreSQL database:

| Case | Result |
| --- | --- |
| 6 concurrent bookings for a category with 3 free suites → exactly 3 succeed, 3 fail with `NOT_AVAILABLE`, availability becomes 0, each success holds a distinct physical room | pass |
| Client-supplied `grandTotal` is ignored; stored total equals the server quote; simulated card payment recorded | pass |
| Maintenance block reduces availability by one; a closed date yields 0 availability and `closed=true` | pass |

## 4. End-to-end browser tests (`pnpm test:e2e`, Playwright)

Desktop Chrome project:

| Scenario | Result |
| --- | --- |
| Invalid dates (check-out = check-in) are rejected with a visible error | pass |
| Two-night booking: select room → rate → extra → guest → review; page refresh keeps the quote; confirmation shows a `SW-YYMM-XXXXX` reference and the demo stamp; availability for the same dates drops by one; reservation visible in the admin list and detail with the same total; cancelling from the admin restores availability | pass |
| Two rooms of the same category in one reservation, both assigned distinct physical rooms | pass |
| Arabic booking flow (`/ar/book`): `dir="rtl"`, Flexible rate, confirmation in Arabic | pass |
| Anonymous access to `/admin/reservations` redirects to login with `next` | pass |
| Wrong credentials rejected | pass |
| Overview metrics in English and Arabic | pass |
| Viewer role sees no mutating controls | pass |
| Front-desk user creates a manual reservation priced on the server | pass |

Mobile project (Pixel 7 emulation):

| Scenario | Result |
| --- | --- |
| Homepage: no horizontal overflow; mobile menu opens and navigates | pass |
| Arabic homepage RTL without overflow | pass |
| Search bar deep-links into the booking page; availability page has no overflow | pass |

## 5. Manual browser verification (screenshots reviewed in session)

- Homepage desktop (EN) and mobile (AR): hero, facts strip, intro, featured rooms, experiences, Petra band, gallery, location, final CTA, footer.
- Rooms list with filters (guests, balcony, suites, sort) in Arabic; room detail on mobile with gallery lightbox and availability band.
- Experiences, gallery (filter + lightbox), about, contact (form submits and stores a message; honeypot verified).
- Booking: availability list, rate selection, extras, guest form, review, confirmation (print layout).
- Admin: login, overview (EN/AR), reservation detail, status change CONFIRMED → CHECKED_IN logged in the activity feed.
- Known environment limitation: Google Maps embeds render blank inside the sandbox because outbound Google requests are blocked; the iframe URL is correct and renders on a normal network.

## 6. Final verification run

Filled in after the admin modules were merged — see the end of this file.

### Final run (after all modules were integrated)

| Check | Result |
| --- | --- |
| `pnpm typecheck` | 0 errors |
| `pnpm lint` | 0 errors, 0 warnings |
| `pnpm test` | 4 files, 39 tests passed (dates 5, pricing 15, availability 10, reports 9) |
| `pnpm test:integration` | 3 tests passed (concurrency / server-side totals / blocks & closed dates) |
| `pnpm build` | success; all application routes server-rendered on demand, icons/robots/sitemap static |
| `pnpm test:e2e` against `next start` (production build) | 12 passed (9 desktop, 3 mobile) |

Admin modules were additionally exercised in the browser by their implementers during this session (results reported in the session log): rooms (category CRUD with photo upload via the magic-byte-validated upload route, physical rooms), rates (rate plans, seasons, overrides incl. bulk update, promotions, extras), content (blocks visible on the public site after edit, gallery, policies), inbox, calendar (end-exclusive bars, block overlap rejection), reports (revenue 4,677.12 / 48 room nights / 56 created / 6 cancelled matched direct SQL for the last-30-days window), settings (change visible on public site), users (self-deactivation and last-admin rules), demo reset (140 reservations reloaded, users kept), and viewer-role authorization (server actions return `FORBIDDEN` when replayed with viewer cookies).

### Live deployment

The same Playwright suite was run against https://sevenwonders-baynari-demo.vercel.app (Vercel production, Neon database): 12 passed in 1.4 min. Every public route returned HTTP 200 (first-hit times 0.3–3.2 s including cold starts). The hosted demo dataset was reset to its pristine state afterwards.

## 7. Not covered / known limitations

- Google Maps embeds could not be rendered inside the sandbox (outbound Google blocked); verified only that the iframe URLs are correct.
- Image uploads are stored on local disk; the Vercel deployment needs object storage for persistent uploads (documented in `docs/DEPLOYMENT.md`).
- Real payment processing and transactional email are intentionally out of scope for the demo.
- Cross-browser testing was limited to Chromium (desktop and Pixel 7 emulation); Safari/Firefox were not available in the environment.
- Accessibility was checked by code review and keyboard interaction in the lightbox and forms; no automated axe audit was run.
