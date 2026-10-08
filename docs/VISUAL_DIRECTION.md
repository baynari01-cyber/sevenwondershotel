# Visual Direction — "A rooftop above the valley"

## Concept

Petra is sandstone, shadow and copper light. The hotel sits above the town that guards the ancient city, with a rooftop pool and Turkish baths as its signature. The design treats the site like an editorial travel feature: large photography, calm typography, generous space, one accent colour used sparingly.

## Palette (CSS custom properties in `src/app/globals.css`)

| Token | Hex | Use |
| --- | --- | --- |
| ivory `--ivory` | #F7F1E7 | Page background |
| ivory-soft | #FBF8F2 | Alternate sections, admin canvas |
| sand-100 / 200 / 300 | #EFE3D1 / #E2CFB3 / #CFB28B | Tinted sections, badges, chart bases |
| copper `--copper` | #B5673B | Primary accent: CTAs, eyebrows, active states |
| copper-deep | #8C4A27 | Prices, hover |
| sunset / rose | #D98654 / #C46F5C | Rare warm accents |
| charcoal `--charcoal` | #1F1B18 | Text, dark sections, admin sidebar |
| charcoal-muted / stone | #4D453F / #8A8077 | Secondary text, labels |
| success / warning / danger / info | #3F7D5A / #B9862C / #A7432F / #3F6F8A | Status semantics only |

## Typography

- Display (EN): Cormorant Garamond 400–600 — editorial serif for headlines and prices.
- Body (EN): Manrope 400–700.
- Display (AR): Amiri — classical naskh with generous line-height (1.3–1.35) for headlines.
- Body (AR): IBM Plex Sans Arabic — modern, highly legible UI face.
- Numerals: always Latin digits with tabular spacing (`.num`), which keeps prices, dates and references aligned in both languages. Phone numbers and emails are forced LTR (`.ltr-field`).
- Eyebrows: 0.72 rem, +0.22 em tracking, uppercase, copper (reduced tracking for Arabic).

Type scale: `display-xl` clamp(2.6–5.25 rem) hero · `display-lg` clamp(2.1–3.5 rem) section titles · `display-md` clamp(1.6–2.4 rem).

## Layout and rhythm

- Container 80 rem with 1 / 1.5 / 2.5 rem gutters; section padding 5–7 rem.
- Alternating image/text bands with 12-column grid (7/5 split) on desktop; single column on mobile.
- Cards: white, 1 px hairline (`rgba(31,27,24,.12)`), 6 px radius, soft shadow; lift shadow on hover.
- Image treatment: `img-grade` adds a bottom-weighted charcoal gradient; `img-warm` lightly desaturates and warms the older hotel photography so it sits in the palette.
- Dark bands (Petra section, final CTA, footer) use charcoal with a 5 % film-grain overlay.

## Motion

- One entrance pattern only: fade-up 18–24 px over 0.9 s on an expo-out curve, triggered on scroll with a small stagger for grids. Content renders visible by default (SSR/no-JS/print) and respects `prefers-reduced-motion`.
- Hover: 1.03–1.04 image scale over 700 ms, underline grow on nav links, colour transitions 200 ms. No parallax, no autoplay carousels.

## Components

- Buttons: primary (charcoal), accent (copper), outline, ghost, inverse (on dark). 44 px tall by default.
- Booking search bar: white floating panel over the hero; inline variant on rooms pages and in a charcoal band on room detail.
- Room cards: 4:3 image, suite/balcony badges, serif price with "from … per night", meta line (sleeps, bedding, size).
- Stepper: six pills with check marks; completed steps are clickable.
- Admin: charcoal sidebar, ivory canvas, white cards, copper for primary actions and chart bars, status badges with semantic tones.

## RTL rules

- `dir="rtl"` on `<html>` for Arabic; only logical properties (`ps/pe/ms/me`, `start/end`, `text-align: start`).
- Directional icons flip with `rtl:-scale-x-100`; translate-based animations flip via `rtl:` variants.
- Mixed content (reference codes, phone numbers, emails, dates) is bidi-isolated; forms for dates and emails are LTR by default.

## What we deliberately avoided

Generic hotel template blocks, emoji icons, gradient-heavy buttons, star ratings and reviews we could not verify, fabricated awards, stock photos presented as the hotel, and decorative-only mockups.
