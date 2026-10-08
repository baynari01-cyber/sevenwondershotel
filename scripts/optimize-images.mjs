// One-off asset pipeline: converts the research originals into optimized WebP assets under public/images.
// Usage: node scripts/optimize-images.mjs <research-dir>
import sharp from "sharp";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

const src = process.argv[2];
if (!src) throw new Error("source directory required");

const hotelMap = {
  "aa1.jpg": "room-double-window",
  "aa2.jpg": "al-babour-restaurant",
  "aa3.jpg": "sauna-bucket",
  "aa4.jpg": "rooftop-pool-night",
  "aa5.jpg": "room-tv-desk",
  "aa6.jpg": "roof-of-wonders-terrace-guests",
  "aa7.jpg": "lobby-lounge",
  "aa8.jpg": "triple-room",
  "aa9.jpg": "twin-room-balcony-curtains",
  "aa10.jpg": "buffet-counter",
  "aa11.jpg": "buffet-salads",
  "aa12.jpg": "twin-beds-detail",
  "aa13.jpg": "turkish-bath-hall",
  "aa14.jpg": "quad-room-beds",
  "aa15.jpg": "majlis-seating",
  "aa16.jpg": "terrace-pergola",
  "aa17.jpg": "dessert-buffet",
  "aa18.jpg": "mezze-buffet",
  "aa19.jpg": "double-room-warm",
  "aa20.jpg": "salad-buffet-wide",
  "aa21.jpg": "suite-lounge",
  "aa23.jpg": "rooftop-pool-day",
  "aa24.jpg": "sauna-cabin",
  "aa25.jpg": "terrace-evening",
  "s4.jpg": "hotel-exterior-street",
  "s7.jpg": "hotel-exterior-rooftop",
};

const petraMap = {
  "night.jpg": "petra-treasury-night",
  "treasury.jpg": "petra-treasury-day",
  "siq.jpg": "petra-siq",
  "outer_siq.jpg": "petra-outer-siq",
  "stone.jpg": "petra-sandstone-texture",
  "siq_above.jpg": "petra-landscape",
};

async function convert(input, output, width, quality) {
  const img = sharp(input).rotate();
  const meta = await img.metadata();
  const w = Math.min(width, meta.width ?? width);
  await img.resize({ width: w, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(output);
  const out = await sharp(output).metadata();
  const size = (await stat(output)).size;
  return { w: out.width, h: out.height, size };
}

await mkdir("public/images/hotel", { recursive: true });
await mkdir("public/images/petra", { recursive: true });
const inventory = [];

for (const file of await readdir(path.join(src, "images"))) {
  const name = hotelMap[file];
  if (!name) continue;
  const out = `public/images/hotel/${name}.webp`;
  const r = await convert(path.join(src, "images", file), out, 1400, 80);
  inventory.push({ file: out, original: `https://www.sevenwondershotel.com/images/${file}`, ...r });
}
for (const [file, name] of Object.entries(petraMap)) {
  const out = `public/images/petra/${name}.webp`;
  const r = await convert(path.join(src, "petra", file), out, 2400, 74);
  inventory.push({ file: out, original: file, ...r });
  const small = `public/images/petra/${name}-1200.webp`;
  const r2 = await convert(path.join(src, "petra", file), small, 1200, 76);
  inventory.push({ file: small, original: file, ...r2 });
}
// Logo: keep PNG with transparency, trimmed.
await sharp(path.join(src, "images", "logo.png")).trim().png({ compressionLevel: 9 }).toFile("public/images/hotel/logo-original.png");
console.table(inventory.map((i) => ({ file: i.file, size: `${Math.round(i.size / 1024)} KB`, dims: `${i.w}x${i.h}` })));
