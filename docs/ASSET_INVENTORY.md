# Asset Inventory

All files live under `public/images/`. Originals were converted to WebP with `scripts/optimize-images.mjs` (sharp, quality 74–80).

## Official hotel photography (source: https://www.sevenwondershotel.com/images/)

Copyright remains with Seven Wonders Hotel. Used here solely to demonstrate a redesign proposal to the hotel. Original size 950 × 500 px.

| File | Original | Subject |
| --- | --- | --- |
| hotel/hotel-exterior-street.webp | s4.jpg | Hotel façade from the main street |
| hotel/hotel-exterior-rooftop.webp | s7.jpg | Rooftop terrace and balconies |
| hotel/lobby-lounge.webp | aa7.jpg | Lobby lounge |
| hotel/majlis-seating.webp | aa15.jpg | Majlis seating |
| hotel/room-double-window.webp | aa1.jpg | Room with window and seating |
| hotel/room-tv-desk.webp | aa5.jpg | In-room TV and desk |
| hotel/double-room-warm.webp | aa19.jpg | Double room |
| hotel/twin-room-balcony-curtains.webp | aa9.jpg | Twin room with balcony curtains |
| hotel/twin-beds-detail.webp | aa12.jpg | Twin beds |
| hotel/triple-room.webp | aa8.jpg | Triple room |
| hotel/quad-room-beds.webp | aa14.jpg | Four single beds |
| hotel/suite-lounge.webp | aa21.jpg | Suite lounge |
| hotel/al-babour-restaurant.webp | aa2.jpg | Al Babour Restaurant |
| hotel/buffet-counter.webp | aa10.jpg | Buffet counter |
| hotel/buffet-salads.webp | aa11.jpg | Buffet detail |
| hotel/salad-buffet-wide.webp | aa20.jpg | Salad buffet |
| hotel/mezze-buffet.webp | aa18.jpg | Mezze buffet |
| hotel/dessert-buffet.webp | aa17.jpg | Desserts |
| hotel/rooftop-pool-night.webp | aa4.jpg | Rooftop pool at night |
| hotel/rooftop-pool-day.webp | aa23.jpg | Rooftop pool by day |
| hotel/terrace-pergola.webp | aa16.jpg | Terrace pergola |
| hotel/terrace-evening.webp | aa25.jpg | Terrace in the evening |
| hotel/roof-of-wonders-terrace-guests.webp | aa6.jpg | Roof of Wonders with guests |
| hotel/turkish-bath-hall.webp | aa13.jpg | Afra Turkish Baths steam hall |
| hotel/sauna-cabin.webp | aa24.jpg | Sauna cabin |
| hotel/sauna-bucket.webp | aa3.jpg | Sauna detail |
| hotel/logo-original.png | logo.png | Hotel logo (trimmed) |

Not used: aa5 duplicate crops, model1–3.png collages, smallslider images, TripAdvisor 2014 award widgets (not reproduced to avoid implying current awards).

## Licensed destination photography (Wikimedia Commons)

Used for the Petra destination sections only; captions never imply these show the hotel. Attribution is required by the licences and is reproduced here and in `GalleryImage.source`.

| File | Commons title | Author | Licence |
| --- | --- | --- | --- |
| petra/petra-treasury-night.webp | File:Petra Al-Kaznah by Night.jpg | Mustafa Waad Saeed | CC BY-SA 4.0 |
| petra/petra-treasury-day.webp | File:Petra Jordan BW 20.JPG | Berthold Werner | CC BY-SA 3.0 |
| petra/petra-siq.webp | File:Petra Jordan BW 12.JPG | Berthold Werner | CC BY 3.0 |
| petra/petra-outer-siq.webp | File:Petra Jordan BW 27.JPG | Berthold Werner | CC BY 3.0 |
| petra/petra-landscape.webp | File:Petra Jordan BW 8.JPG | Berthold Werner | CC BY 3.0 |
| petra/petra-sandstone-texture.webp | File:Petra Jordan BW 29.JPG | Berthold Werner | CC BY 3.0 |

Each also has a `-1200.webp` variant for smaller viewports. Licence texts: https://creativecommons.org/licenses/by-sa/4.0/ · https://creativecommons.org/licenses/by-sa/3.0/ · https://creativecommons.org/licenses/by/3.0/

## Uploads

Images uploaded through the admin dashboard are stored under `public/uploads/` on local disk. On Vercel the filesystem is ephemeral, so production should swap the upload handler for object storage (Vercel Blob or S3-compatible); see `docs/DEPLOYMENT.md`.
