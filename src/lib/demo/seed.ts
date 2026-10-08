import type { PrismaClient } from "@/generated/prisma/client";
import type { BookingSource, PaymentMethod, PaymentStatus, ReservationStatus } from "@/generated/prisma/enums";
import bcrypt from "bcryptjs";
import { buildQuote, type RatePlanPricingInput, type RoomTypePricingInput } from "@/lib/booking/pricing";
import { money } from "@/lib/booking/money";
import { addDays, isoToUtcDate, todayIso, type IsoDate } from "@/lib/utils/dates";
import { generateReference } from "@/lib/booking/reference";
import {
  AMENITIES,
  CONTENT_BLOCKS,
  DEMO_GUESTS,
  EXTRAS,
  GALLERY,
  HOTEL_SETTINGS,
  POLICIES,
  PROMOTIONS,
  RATE_PLANS,
  ROOM_TYPES,
  SEASONS,
  USERS,
} from "./content";

export type SeedOptions = {
  adminPassword: string;
  /** Reference date for generating demo reservations (defaults to today in Asia/Amman). */
  today?: IsoDate;
  log?: (message: string) => void;
};

/** Deterministic PRNG so every demo reset produces the same believable dataset. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const d = (iso: IsoDate) => isoToUtcDate(iso);

export async function clearDemoData(prisma: PrismaClient): Promise<void> {
  // Order matters because of foreign keys; users are preserved by design.
  await prisma.activityLog.deleteMany();
  await prisma.reservationNote.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.reservationExtra.deleteMany();
  await prisma.reservationRoom.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.inventoryBlock.deleteMany();
  await prisma.rateOverride.deleteMany();
  await prisma.seasonRate.deleteMany();
  await prisma.season.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.extra.deleteMany();
  await prisma.ratePlan.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomImage.deleteMany();
  await prisma.roomTypeAmenity.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.contentBlock.deleteMany();
  await prisma.hotelPolicy.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.hotelSettings.deleteMany();
}

export async function seedDatabase(prisma: PrismaClient, options: SeedOptions): Promise<{ reservations: number }> {
  const log = options.log ?? (() => undefined);
  const today = options.today ?? todayIso();
  const year = Number(today.slice(0, 4));

  // 1. Users (upserted so passwords/roles survive a demo reset)
  const passwordHash = await bcrypt.hash(options.adminPassword, 12);
  const users: Record<string, { id: string; name: string }> = {};
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true, passwordHash },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
    });
    users[u.role] = { id: user.id, name: user.name };
  }
  log("users ready");

  // 2. Settings & policies
  await prisma.hotelSettings.create({
    data: {
      id: "default",
      ...HOTEL_SETTINGS,
      latitude: HOTEL_SETTINGS.latitude,
      longitude: HOTEL_SETTINGS.longitude,
      displayCurrencies: ["JOD", "USD", "EUR"],
      usdRate: "1.41",
      eurRate: "1.30",
      taxRate: "16",
      serviceChargeRate: "10",
      taxesIncluded: false,
      childAgeLimit: 12,
      weekendDays: [5, 6],
      maxRoomsPerBooking: 5,
      maxNightsPerBooking: 30,
      demoMode: true,
    },
  });
  await prisma.hotelPolicy.createMany({ data: POLICIES.map((p) => ({ ...p })) });

  // 3. Amenities, room types, physical rooms
  const amenityIds: Record<string, string> = {};
  for (const [i, a] of AMENITIES.entries()) {
    const created = await prisma.amenity.create({ data: { ...a, sortOrder: i } });
    amenityIds[a.key] = created.id;
  }

  const roomTypeIds: Record<string, string> = {};
  const roomsByType: Record<string, string[]> = {};
  let sort = 0;
  for (const rt of ROOM_TYPES) {
    const created = await prisma.roomType.create({
      data: {
        code: rt.code,
        slug: rt.slug,
        nameEn: rt.nameEn,
        nameAr: rt.nameAr,
        shortEn: rt.shortEn,
        shortAr: rt.shortAr,
        descriptionEn: rt.descriptionEn,
        descriptionAr: rt.descriptionAr,
        bedConfigEn: rt.bedConfigEn,
        bedConfigAr: rt.bedConfigAr,
        sizeSqm: rt.sizeSqm,
        maxAdults: rt.maxAdults,
        maxChildren: rt.maxChildren,
        maxOccupancy: rt.maxOccupancy,
        baseRate: rt.baseRate,
        weekendRate: rt.weekendRate,
        extraAdultRate: rt.extraAdultRate,
        extraChildRate: rt.extraChildRate,
        hasBalcony: rt.balconyCount > 0,
        isSuite: rt.isSuite,
        isFeatured: rt.isFeatured,
        sortOrder: sort++,
        amenities: { create: rt.amenities.map((key) => ({ amenityId: amenityIds[key] })) },
        images: {
          create: rt.images.map((img, i) => ({ url: `/images/hotel/${img.file}`, altEn: img.altEn, altAr: img.altAr, sortOrder: i })),
        },
      },
    });
    roomTypeIds[rt.code] = created.id;
    roomsByType[rt.code] = [];
    let idx = 0;
    for (let i = 0; i < rt.roomCount; i++) {
      const floor = rt.floors[i % rt.floors.length];
      const number = `${floor}${String(10 + idx + (floor * 3) % 7).padStart(2, "0")}`;
      idx++;
      const room = await prisma.room.create({
        data: {
          roomTypeId: created.id,
          number: `${rt.code}-${number}`,
          floor,
          hasBalcony: i < rt.balconyCount,
          isActive: true,
        },
      });
      roomsByType[rt.code].push(room.id);
    }
  }
  log("inventory ready");

  // 4. Rate plans, seasons, overrides, promotions, extras
  const ratePlanIds: Record<string, string> = {};
  for (const rp of RATE_PLANS) {
    const created = await prisma.ratePlan.create({
      data: {
        code: rp.code,
        type: rp.type,
        nameEn: rp.nameEn,
        nameAr: rp.nameAr,
        descriptionEn: rp.descriptionEn,
        descriptionAr: rp.descriptionAr,
        adjustmentType: rp.adjustmentType,
        adjustmentValue: rp.adjustmentValue,
        includesBreakfast: rp.includesBreakfast,
        refundable: rp.refundable,
        cancellationDeadlineDays: rp.cancellationDeadlineDays,
        cancellationPolicyEn: rp.cancellationPolicyEn,
        cancellationPolicyAr: rp.cancellationPolicyAr,
        minNights: rp.minNights,
        sortOrder: rp.sortOrder,
        isDemo: true,
      },
    });
    ratePlanIds[rp.code] = created.id;
  }

  for (const y of [year, year + 1]) {
    for (const s of SEASONS) {
      await prisma.season.create({
        data: {
          nameEn: `${s.nameEn} ${y}`,
          nameAr: `${s.nameAr} ${y}`,
          startDate: d(`${y}-${s.start}`),
          endDate: d(`${y}-${s.end}`),
          rates: { create: ROOM_TYPES.map((rt) => ({ roomTypeId: roomTypeIds[rt.code], rate: rt.highSeasonRate })) },
        },
      });
    }
  }

  // Demo date overrides: New Year's Eve closed for the suites, Eid-style minimum stays, a peak-price weekend.
  await prisma.rateOverride.createMany({
    data: [
      { roomTypeId: roomTypeIds.STE, date: d(`${year}-12-31`), closed: true, note: "Closed for private event (demo)" },
      { roomTypeId: roomTypeIds.DBL, date: d(addDays(today, 20)), minStay: 2, note: "Weekend minimum stay (demo)" },
      { roomTypeId: roomTypeIds.DBL, date: d(addDays(today, 21)), rate: "95.00", note: "Peak demand (demo)" },
      { roomTypeId: roomTypeIds.TRP, date: d(addDays(today, 21)), maxInventory: 2, note: "Hold 4 rooms for a tour group (demo)" },
    ],
  });

  const promotionIds: Record<string, string> = {};
  for (const p of PROMOTIONS) {
    const created = await prisma.promotion.create({
      data: {
        code: p.code,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        type: p.type,
        value: p.value,
        minNights: p.minNights,
        validFrom: d(`${year}-01-01`),
        validTo: d(`${year + 1}-12-31`),
      },
    });
    promotionIds[p.code] = created.id;
  }

  const extraIds: Record<string, string> = {};
  for (const e of EXTRAS) {
    const created = await prisma.extra.create({ data: { ...e, isDemo: true } });
    extraIds[e.code] = created.id;
  }
  log("rates ready");

  // 5. Content & gallery
  await prisma.contentBlock.createMany({ data: CONTENT_BLOCKS.map((c) => ({ ...c })) });
  await prisma.galleryImage.createMany({
    data: GALLERY.map((g, i) => ({
      url: `/images/${g.file}`,
      captionEn: g.captionEn,
      captionAr: g.captionAr,
      category: g.category,
      width: g.file.startsWith("petra") ? 2400 : 950,
      height: g.file.startsWith("petra") ? 1600 : 500,
      source: g.file.startsWith("petra") ? "Wikimedia Commons (CC licence, see docs/ASSET_INVENTORY.md)" : "sevenwondershotel.com official gallery",
      sortOrder: i,
    })),
  });

  // 6. Maintenance blocks (demo)
  await prisma.inventoryBlock.createMany({
    data: [
      { roomId: roomsByType.DBL[11], startDate: d(addDays(today, -3)), endDate: d(addDays(today, 4)), reason: "MAINTENANCE", note: "Bathroom retiling (demo)", createdById: users.ADMIN.id },
      { roomId: roomsByType.QUD[4], startDate: d(addDays(today, 10)), endDate: d(addDays(today, 13)), reason: "OUT_OF_ORDER", note: "A/C unit replacement (demo)", createdById: users.ADMIN.id },
    ],
  });

  // 7. Demo reservations with real pricing-engine totals and non-overlapping room assignment.
  const rand = mulberry32(7_2026);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const settings = { taxRate: money(16), serviceChargeRate: money(10), taxesIncluded: false, weekendDays: [5, 6] };

  const pricingInputs: Record<string, RoomTypePricingInput> = {};
  for (const rt of ROOM_TYPES) {
    const seasonRates = [year, year + 1].flatMap((y) =>
      SEASONS.map((s) => ({ startDate: `${y}-${s.start}`, endDate: `${y}-${s.end}`, rate: money(rt.highSeasonRate) })),
    );
    pricingInputs[rt.code] = {
      id: roomTypeIds[rt.code],
      baseRate: money(rt.baseRate),
      weekendRate: money(rt.weekendRate),
      extraAdultRate: money(rt.extraAdultRate),
      extraChildRate: money(rt.extraChildRate),
      maxAdults: rt.maxAdults,
      maxChildren: rt.maxChildren,
      maxOccupancy: rt.maxOccupancy,
      minStay: 1,
      seasonRates,
      overrides: [],
    };
  }
  const ratePlanInputs: Record<string, RatePlanPricingInput> = {};
  for (const rp of RATE_PLANS) {
    ratePlanInputs[rp.code] = { id: ratePlanIds[rp.code], adjustmentType: rp.adjustmentType, adjustmentValue: money(rp.adjustmentValue), minNights: rp.minNights };
  }

  const occupancy: Array<{ roomId: string; checkIn: IsoDate; checkOut: IsoDate }> = [];
  const blocked = [
    { roomId: roomsByType.DBL[11], checkIn: addDays(today, -3), checkOut: addDays(today, 4) },
    { roomId: roomsByType.QUD[4], checkIn: addDays(today, 10), checkOut: addDays(today, 13) },
  ];
  const isFree = (roomId: string, ci: IsoDate, co: IsoDate) =>
    ![...occupancy, ...blocked].some((o) => o.roomId === roomId && ci < o.checkOut && o.checkIn < co);

  const sources: BookingSource[] = ["WEBSITE", "WEBSITE", "WEBSITE", "WEBSITE", "OTA", "OTA", "PHONE", "EMAIL", "WALK_IN", "TRAVEL_AGENT"];
  const weights = [
    ["DBL", 32], ["TWN", 18], ["TRP", 16], ["QUD", 10], ["SGL", 12], ["STE", 12],
  ] as const;
  const weightedType = () => {
    const total = weights.reduce((a, [, w]) => a + w, 0);
    let r = rand() * total;
    for (const [code, w] of weights) {
      if ((r -= w) <= 0) return code;
    }
    return "DBL";
  };

  let created = 0;
  let refCounter = 0;
  for (let i = 0; i < 140; i++) {
    const offset = Math.floor(rand() * 150) - 90; // −90 … +60 days
    const checkIn = addDays(today, offset);
    const nights = pick([1, 1, 2, 2, 2, 3, 3, 4]);
    const checkOut = addDays(checkIn, nights);
    const code = weightedType();
    const rt = ROOM_TYPES.find((r) => r.code === code)!;
    const roomId = roomsByType[code].find((id) => isFree(id, checkIn, checkOut));
    if (!roomId) continue;

    const rpCode = nights >= 3 && rand() < 0.35 ? "PETRA3" : pick(["ROOM_ONLY", "BB", "BB", "FLEX", "NRF"] as const);
    const adults = Math.min(rt.maxAdults, pick([1, 2, 2, 2, rt.maxAdults]));
    const children = rt.maxChildren > 0 && rand() < 0.25 ? 1 : 0;

    const extraChoices: Array<{ code: keyof typeof extraIds; quantity: number }> = [];
    if (rand() < 0.3 && rpCode === "ROOM_ONLY") extraChoices.push({ code: "BREAKFAST", quantity: 1 });
    if (rand() < 0.18) extraChoices.push({ code: "TRANSFER", quantity: 1 });
    if (rand() < 0.22) extraChoices.push({ code: "HAMMAM", quantity: 1 });
    if (rand() < 0.1) extraChoices.push({ code: "LATE_CHECKOUT", quantity: 1 });

    const usePromo = rand() < 0.12 && nights >= 2;
    let quote;
    try {
      quote = buildQuote({
        checkIn,
        checkOut,
        rooms: [{ roomType: pricingInputs[code], ratePlan: ratePlanInputs[rpCode], adults, children }],
        extras: extraChoices.map((c) => {
          const e = EXTRAS.find((x) => x.code === c.code)!;
          return { extra: { id: extraIds[c.code], price: money(e.price), pricing: e.pricing, isInquiryOnly: e.isInquiryOnly }, quantity: c.quantity };
        }),
        promotion: usePromo ? { id: promotionIds.WELCOME10, code: "WELCOME10", type: "PERCENT", value: money(10), minNights: 2, validFrom: `${year}-01-01`, validTo: `${year + 1}-12-31`, isActive: true } : null,
        settings,
      });
    } catch {
      continue;
    }

    let status: ReservationStatus;
    if (checkOut <= today) status = rand() < 0.08 ? "NO_SHOW" : "CHECKED_OUT";
    else if (checkIn <= today && checkOut > today) status = "CHECKED_IN";
    else status = rand() < 0.15 ? "PENDING" : "CONFIRMED";
    const cancelled = rand() < 0.11;
    if (cancelled) status = "CANCELLED";
    if (status !== "CANCELLED") occupancy.push({ roomId, checkIn, checkOut });

    const guest = pick(DEMO_GUESTS);
    const source = pick(sources);
    const rp = RATE_PLANS.find((r) => r.code === rpCode)!;
    const bookedAt = new Date(d(checkIn).getTime() - Math.floor(rand() * 40 + 1) * 86_400_000);
    const paymentMethod: PaymentMethod = rpCode === "NRF" ? "SIMULATED_CARD" : source === "WALK_IN" ? "CASH" : "PAY_AT_PROPERTY";
    let paymentStatus: PaymentStatus =
      rpCode === "NRF" ? "SIMULATED_PAID" : status === "CHECKED_OUT" ? "SIMULATED_PAID" : "PAY_AT_PROPERTY";
    if (status === "CANCELLED") paymentStatus = rpCode === "NRF" ? "SIMULATED_PAID" : "UNPAID";

    refCounter++;
    const reference = generateReference(bookedAt, refCounter);
    const guestRecord = await prisma.guest.create({
      data: {
        firstName: guest[0],
        lastName: guest[1],
        email: `${guest[0]}.${guest[1].replace(/[^a-z]/gi, "")}${refCounter}@example.com`.toLowerCase(),
        phone: `+962 79 ${String(100000 + Math.floor(rand() * 899999)).replace(/(\d{3})(\d{3})/, "$1 $2")}`,
        country: guest[2],
      },
    });

    const reservation = await prisma.reservation.create({
      data: {
        reference,
        status,
        source,
        guestId: guestRecord.id,
        checkIn: d(checkIn),
        checkOut: d(checkOut),
        nights,
        adults,
        children,
        currency: "JOD",
        roomSubtotal: quote.roomSubtotal,
        extrasTotal: quote.extrasTotal,
        discountTotal: quote.discountTotal,
        taxTotal: quote.taxTotal,
        serviceChargeTotal: quote.serviceChargeTotal,
        grandTotal: quote.grandTotal,
        paymentStatus,
        paymentMethod,
        promotionId: usePromo ? promotionIds.WELCOME10 : null,
        promotionCode: usePromo ? "WELCOME10" : null,
        cancellationPolicyEn: rp.cancellationPolicyEn,
        cancellationPolicyAr: rp.cancellationPolicyAr,
        locale: guest[2] === "JO" || guest[2] === "SA" || guest[2] === "AE" ? "ar" : "en",
        arrivalTime: pick(["14:00", "15:00", "16:30", "18:00", "20:00", null]),
        specialRequests: rand() < 0.3 ? pick(["High floor if possible", "Quiet room please", "Celebrating an anniversary", "Early check-in requested", "Twin beds preferred"]) : null,
        cancelledAt: status === "CANCELLED" ? new Date(bookedAt.getTime() + 2 * 86_400_000) : null,
        cancellationReason: status === "CANCELLED" ? pick(["Change of travel plans", "Found alternative dates", "Flight cancelled"]) : null,
        createdById: source === "WEBSITE" || source === "OTA" ? null : users.FRONT_DESK.id,
        isDemo: true,
        createdAt: bookedAt,
        updatedAt: bookedAt,
        rooms: {
          create: [
            {
              roomTypeId: roomTypeIds[code],
              roomId: status === "CANCELLED" ? null : roomId,
              ratePlanId: ratePlanIds[rpCode],
              adults,
              children,
              nightlyRates: quote.rooms[0].nightly,
              roomTotal: quote.rooms[0].roomTotal,
            },
          ],
        },
        extras: {
          create: quote.extras.map((q) => {
            const e = EXTRAS.find((x) => extraIds[x.code] === q.extraId)!;
            return { extraId: q.extraId, nameEn: e.nameEn, nameAr: e.nameAr, quantity: q.quantity, unitPrice: q.unitPrice, total: q.total };
          }),
        },
        payments:
          paymentStatus === "SIMULATED_PAID"
            ? { create: [{ amount: quote.grandTotal, method: paymentMethod, status: "SIMULATED_PAID", reference: `DEMO-${reference}`, note: "Simulated demo payment", createdAt: bookedAt }] }
            : undefined,
      },
    });
    if (rand() < 0.2) {
      await prisma.reservationNote.create({
        data: { reservationId: reservation.id, authorId: users.FRONT_DESK.id, body: pick(["Guest called to confirm arrival time.", "VIP: repeat guest, welcome fruit basket.", "Needs airport pickup sign with name.", "Allergic to nuts, kitchen informed."]) },
      });
    }
    created++;
  }
  log(`${created} demo reservations ready`);

  await prisma.activityLog.create({
    data: {
      actorId: users.ADMIN.id,
      actorName: users.ADMIN.name,
      action: "demo.seed",
      entityType: "system",
      summary: `Demo dataset seeded with ${created} reservations`,
    },
  });

  return { reservations: created };
}

export async function resetDemo(prisma: PrismaClient, options: SeedOptions) {
  await clearDemoData(prisma);
  return seedDatabase(prisma, options);
}
