# Seven Wonders Hotel Petra — Direct Booking Platform

**A proposal demonstration by BAYNARI** · Jordanian digital solutions studio

Live demo: https://sevenwonders-baynari-demo.vercel.app (Arabic: `/ar`, dashboard: `/admin`).

This document summarises what the demonstration shows, in the language a hotel owner or reservation manager cares about. Everything described below is working software, not a mock-up. Rates, availability and guests in the demo are fictional and clearly labelled as such.

## What the hotel gets

### 1. A website that sells the hotel the way it deserves
- Cinematic, mobile-first design in the colours of Petra: sandstone, charcoal and copper, with the hotel's own photography front and centre.
- Full English and Arabic versions with correct right-to-left layout — one site, two languages, no duplicated maintenance.
- Pages: Home, Rooms & Suites (with filters and room galleries), Experiences (rooftop pool, Afra Turkish Baths, Al Babour Restaurant, Roof of Wonders, facilities, Petra programs), Gallery with full-screen lightbox, About, Contact & Location with map and directions.
- Search-engine ready: descriptive metadata on every page, structured hotel data (schema.org Hotel and HotelRoom), optimised images, fast loading.
- Every claim on the site comes from the hotel's official website; demo assumptions are flagged in the admin and in `docs/HOTEL_RESEARCH.md`.

### 2. A direct booking engine that replaces the broken booking link
The current "Book Now" button on sevenwondershotel.com leads to a page that no longer exists. The demo replaces it with a six-step reservation flow:

1. **Dates and guests** — check-in, check-out, adults, children, number of rooms, optional promotion code; invalid dates are blocked.
2. **Rooms** — only categories that are genuinely available for every night are offered, with live inventory ("3 available"), photos, occupancy limits, amenities, nightly rate and the stay total before taxes.
3. **Rate plan** — Room Only, Bed & Breakfast, Flexible, Non-Refundable and promotional rates with transparent cancellation conditions.
4. **Extras** — breakfast, airport transfer, Turkish-bath session, late check-out, Petra excursion inquiry; all configurable by the hotel.
5. **Guest details** — validated form, arrival time, special requests.
6. **Review and confirm** — itemised price with service charge and tax, cancellation terms, pay-at-hotel or simulated card payment, then a printable confirmation with a unique reference (e.g. `SW-2610-ZZJMN`).

Behind the scenes every price is calculated on the server, never in the browser, so a guest cannot manipulate the total. Reservations are written in a database transaction that re-checks inventory at the last moment: two guests can never book the last room at the same time (verified by an automated concurrency test).

### 3. A front-desk dashboard the team will actually use
- **Overview** — today's arrivals and departures, guests in house, occupancy tonight, revenue and bookings this month, average daily rate, seven-day occupancy, latest reservations and an activity log.
- **Reservations** — search by reference, name or email; filter by status, source and arrival dates; open any reservation to confirm, check in, check out, cancel (rooms are released instantly), mark no-show, assign a specific room, record payments, add internal notes, modify dates or rooms (re-priced on the server), and create walk-in, phone or email bookings with the same pricing rules.
- **Occupancy calendar** — room-by-room timeline with arrivals, stays, departures, pending holds and maintenance blocks; add or remove blocks.
- **Rooms** — edit categories (bilingual descriptions, occupancy, rates, amenities, photos with upload), manage each physical room, activate or deactivate inventory.
- **Rates & availability** — rate plans, seasonal rates, weekend rates, promotions, date-level overrides (price, minimum stay, closed dates, maximum rooms to sell) and bulk updates.
- **Content** — edit homepage sections, text, photos, gallery, policies and contact details in both languages without a developer.
- **Reports** — booking trend, occupancy, revenue, ADR, RevPAR, cancellation rate, bookings by source and by category, CSV export, with the formulas shown.
- **Settings** — hotel profile, check-in/out times, child age, currency and display rates, tax and service charge, booking limits, user accounts with four roles (administrator, manager, front desk, read-only), and a one-click **demo reset**.

### 4. The "wow" moment in a sales meeting
1. Open the website on a phone and a laptop. Search dates, pick a room, add a Turkish-bath session, confirm.
2. The confirmation reference appears with a printable confirmation.
3. Switch to the dashboard: the reservation is already in "Latest reservations", the calendar shows the room blocked for those nights, and the available count for that category has dropped by one.
4. Cancel it from the dashboard: the room is released and the website shows it available again.
5. Reset the demo in Settings before the next meeting.

## Security and quality
- Admin area protected by signed sessions; every action is authorised on the server by role.
- No real payments and no card details are ever collected in the demo.
- Automated tests: 30+ unit tests for pricing, availability and reports; database integration tests for overselling, server-side totals, blocks and closed dates; browser end-to-end tests for the booking journey, Arabic flow, mobile layout and the admin.
- Ready to deploy on Vercel with a hosted PostgreSQL database (see `docs/DEPLOYMENT.md`).

## What happens next (if the hotel says yes)
1. Confirm real room categories, rates, taxes and policies (list in `docs/HOTEL_RESEARCH.md`, section 3).
2. New photography session (the current images are from 2013 at 950 × 500 px).
3. Connect a payment gateway if online prepayment is wanted, and email confirmations.
4. Optional: channel-manager connection to OTAs, WhatsApp notifications, multi-property support.
