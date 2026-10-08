# Seven Wonders Hotel Petra — Research Report

Prepared by BAYNARI · research date 2026-10-08 · for the website redesign and booking-engine demonstration.

Classification legend used throughout this document:

| Tag | Meaning |
| --- | --- |
| **[Official]** | Verified on the hotel's official website, https://www.sevenwondershotel.com (pages fetched and read on 2026-10-08) |
| **[Other source]** | Verified on another public source, named inline |
| **[Assumed]** | Fictional value created by BAYNARI for the demonstration only |
| **[Confirm]** | Not verifiable from public sources; requires confirmation by the hotel |

Nothing marked *Assumed* or *Confirm* is presented as a hotel fact in the demo. Every demo rate, rate plan, extra and seeded reservation carries an explicit demo label in the interface.

## 1. Identity and contact

| Item | Value | Status |
| --- | --- | --- |
| Name | Seven Wonders Hotel-Petra (site title), "Hotel Seven Wonders in Petra" | [Official] |
| Location | Wadi Musa (spelled "Wadi Mousa" and "Wadi Moussa" on the site), Petra, Jordan | [Official] |
| Street address | Main Street, opposite the Police Station, city centre | [Official] `our-address.html` |
| P.O. Box | 212 – Petra 71810 | [Official] |
| Reservations phone | +962 3 2155 156 | [Official] (also written "+ 962 3 21 55 156") |
| Mobile | +962 79 822 6659 | [Official] `contact.html`, `programs.html` |
| Second landline / fax | +962 3 2155 155 (listed as "Fax" on `our-address.html`, as a phone on other pages) | [Official], role [Confirm] |
| Reservations email | reservations@sevenwondershotel.com | [Official] |
| General email | info@sevenwondershotel.com | [Official] `our-address.html` |
| Facebook | https://www.facebook.com/sevenwondershotel | [Official] link on the site; page content not verified |
| WhatsApp | Not published anywhere on the official website | [Confirm] — demo shows no WhatsApp link until the hotel confirms a number |
| Coordinates | 30.31863, 35.482125 | [Official] (embedded in the site's Google Maps directions link) |
| Reservation manager | Waseem Salameen | [Official] `programs.html` ("Management Team") |
| Website designer credit | "Design: wasim turki", © 2013 | [Official] footer |
| Existing online booking | `booking.html` embeds an iframe to `http://sevenwondershotel.com/reservation` which returns **HTTP 404 "File not found."** (checked 2026-10-08) | [Official] — the public booking link is currently broken |

## 2. Property facts

| Item | Value | Status |
| --- | --- | --- |
| Building | "Newly built", completed in 2012, tower design with lift and stairs | [Official] `about.html` |
| Rooms | 38 city-view rooms, including 3 suites | [Official] `rooms.html` |
| Balconies | 27 rooms have balconies with seating | [Official] |
| Bed arrangements | Single rooms; rooms with 3 and 4 single beds for groups | [Official] |
| In-room | Wireless high-speed internet, satellite TV (LCD), A/C and heating, refrigerator, hairdryer, safety box, iron and ironing board on request, toilet with shower | [Official] |
| Rooftop pool | Outdoor, unheated, 9 m × 4 m, 1.5 m deep, wooden decking, sun loungers, covered terrace; free for guests; closed at 20:00; no diving; the page contradicts itself on lifeguard presence ("we don't have a lifeguard" vs "we do have a lifeguard and spotter") | [Official], lifeguard [Confirm] |
| Afra Turkish Baths | Basement; steam room, authentic sauna, Jacuzzi, fitness room, water feature with tea/coffee, barber, sports/therapeutic massage by a qualified masseur; mixed (men and women) so swimwear required | [Official] `entertainment.html` |
| Al Babour Restaurant | Breakfast buffet 06:30–10:30; lunch buffet 12:00–16:00 (2 or 3 courses); evening à la carte and set menu; international buffet 06:30–22:00; soft-drinks bar | [Official] `dining.html` |
| Roof of Wonders | Rooftop snacks, juices, soft drinks, mineral water, hubble-bubble; 16:00–22:30 | [Official] |
| Room service | 18 hours, delivered in 25 minutes | [Official] |
| Lobby tea & coffee | Until 23:30 | [Official] |
| Reception | Fluent English and Arabic; money exchange at daily rates; guide maps; taxis summoned; accepts cash, Visa and Mastercard only | [Official] `reception.html` |
| Souvenir shop | Authentic Bedouin souvenirs, English guides, small book-swap library (English and Arabic) | [Official] |
| Laundry | Full laundry service incl. dry cleaning and ironing at extra charge; baby cots on request | [Official] |
| Programs | Hotel organises excursions to Petra, Beidha (Little Petra), mountain villages and the Red Sea; vary by season | [Official] `programs.html` |
| Check-in / check-out | 14:00 / 12:00 noon | [Official] `our-address.html` |
| Family policy | Family-oriented; no alcohol served inside the hotel; pets not accommodated | [Official] `about.html` |
| Accessibility | Lift makes the hotel suitable for elderly guests; bathrooms not adapted for wheelchairs or walking aids | [Official] |
| Directions | From Amman/QAIA: Desert Highway ~200 km, right to Petra; from Aqaba ~85 km; hotel on the right directly in front of the main police station | [Official] |
| TripAdvisor | Site shows 2014 "Certificate of Excellence" widget images | [Official] image only — not reproduced in the demo (no fabricated awards; current status unverified) |

### Other public sources (checked 2026-10-08)

- Hotel aggregators (Kayak listings for "Seven Wonders Hotel-Petra") describe 38 air-conditioned rooms with flat-screen TVs and refrigerators, check-in after 14:00 / check-out before 12:00, and list only a generic "Standard room" category with variable third-party prices. **[Other source]** — consistent with the official site; no official room category names or rates are published.
- A separately named property, "Seven Wonders Luxury Camp", exists in Wadi Musa and is **not** the hotel. The demo makes no reference to it.
- The Facebook page could not be read without login in this environment. **[Confirm]** for any social content.

## 3. Items that require client confirmation

- Actual room category names, bed counts per category and the exact inventory per category (the site gives totals only).
- Real nightly rates, seasonal pricing, weekend pricing, taxes (Jordan hotels commonly apply sales tax and service charge; the demo uses 16 % + 10 % as editable **assumptions**), and cancellation terms.
- Breakfast inclusion in standard rates and the price of breakfast when purchased separately.
- Whether airport transfers, Turkish-bath sessions, late check-out or Petra excursions are sold and at what price.
- Children's policy and age limit (demo assumes 12).
- WhatsApp number, Instagram/TripAdvisor profiles, current awards.
- Lifeguard presence at the pool (the official text is contradictory).
- Current photography: the official gallery images are 950 × 500 px from 2012–2013. New professional photography is strongly recommended before launch.

## 4. Demo assumptions (all editable in the admin dashboard)

| Area | Demo value | Status |
| --- | --- | --- |
| Room categories | Classic Single (4 rooms), Deluxe Double (12, 10 balconies), Twin Room with Balcony (8, 6 balconies), Family Triple (6, 5 balconies), Group Quad (5, 3 balconies), Petra Suite (3 suites, 3 balconies) — totals match the official 38 rooms / 3 suites / 27 balconies | [Assumed] |
| Base rates (JOD, per night) | 45 / 65 / 65 / 85 / 105 / 140; weekend (Fri–Sat) and high-season rates slightly higher | [Assumed] |
| Seasons | Spring (1 Mar–31 May) and autumn (15 Sep–30 Nov) high seasons | [Assumed] |
| Rate plans | Room Only, Bed & Breakfast (+12 JOD/night), Flexible (+15 %), Non-Refundable Saver (−12 %), Petra Explorer 3+ nights (−18 %) | [Assumed] |
| Extras | Breakfast 6 JOD pp/night, airport transfer 95 JOD, Turkish bath 25 JOD pp, late check-out 20 JOD, Petra excursion (inquiry only) | [Assumed] |
| Promotion | WELCOME10 (10 % off rooms, min 2 nights) | [Assumed] |
| Taxes | 16 % sales tax + 10 % service charge on top of rates | [Assumed] |
| Occupancy supplements | Extra adult 15 JOD (triple/quad), child 10–12 JOD | [Assumed] |
| Seeded reservations | 140 fictional reservations over −90…+60 days with fictional guests and `@example.com` addresses | [Assumed] |
| Users | Demo accounts (admin, manager, front desk, viewer) at `@demo.baynari.local` | [Assumed] |

## 5. Observations on the current website (sales context)

- Built in 2013 on Bootstrap 2; not responsive on modern phones; mixed HTTP/HTTPS assets.
- Empty `<meta name="description">` on every page; no structured data; no Arabic version.
- The "Book Now" flow leads to a 404 iframe, so direct bookings are effectively impossible online today.
- Duplicate paragraphs on `rooms.html`; the laundry page shows the souvenir text; the contact mailto link points to `someone@example.com`.
- Imagery is low resolution (950 × 500) and dated, but authentic.

These points form the core of the BAYNARI proposal: a mobile-first bilingual site, a working direct-booking engine, and a front-desk dashboard.

## 6. Sources

- https://www.sevenwondershotel.com/ (index, about, rooms, dining, pool, entertainment, reception, souvenir, laundry, programs, our-address, contact, booking, image-hotel) — fetched 2026-10-08.
- http://sevenwondershotel.com/reservation — HTTP 404 on 2026-10-08.
- Kayak hotel listing pages for "Seven Wonders Hotel-Petra" (aggregator data, 2026-10-08).
- Wikimedia Commons file pages for the licensed Petra photographs (see `docs/ASSET_INVENTORY.md`).
