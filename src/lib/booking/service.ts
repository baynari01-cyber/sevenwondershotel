import "server-only";
import { prisma } from "@/lib/db";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { BookingSource, PaymentMethod, PaymentStatus, ReservationStatus } from "@/generated/prisma/enums";
import { money } from "./money";
import {
  buildQuote,
  priceRoom,
  PricingError,
  effectiveMinStay,
  type ExtraPricingInput,
  type PromotionPricingInput,
  type Quote,
  type RatePlanPricingInput,
  type RoomTypePricingInput,
  type SettingsPricingInput,
} from "./pricing";
import { availabilityForStay, type Block, type Occupancy } from "./availability";
import { generateReference } from "./reference";
import { dbDateToIso, diffNights, isIsoDate, isoToUtcDate, todayIso, type IsoDate } from "@/lib/utils/dates";

export const ACTIVE_STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN"];

export class BookingError extends Error {
  readonly code:
    | "INVALID_DATES"
    | "CHECK_IN_PAST"
    | "MAX_NIGHTS"
    | "MAX_ROOMS"
    | "ROOM_TYPE_NOT_FOUND"
    | "RATE_PLAN_NOT_FOUND"
    | "RATE_PLAN_UNAVAILABLE"
    | "EXTRA_NOT_FOUND"
    | "NOT_AVAILABLE"
    | "OCCUPANCY"
    | "MIN_STAY"
    | "CLOSED_DATE"
    | "PROMOTION_INVALID";
  readonly details?: Record<string, unknown>;
  constructor(code: BookingError["code"], details?: Record<string, unknown>) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

type Db = PrismaClient | Prisma.TransactionClient;

export type StayRequest = { checkIn: IsoDate; checkOut: IsoDate };

export function validateStayDates(checkIn: string, checkOut: string, maxNights: number, opts?: { allowPast?: boolean }): { checkIn: IsoDate; checkOut: IsoDate; nights: number } {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) throw new BookingError("INVALID_DATES");
  const nights = diffNights(checkIn, checkOut);
  if (nights < 1) throw new BookingError("INVALID_DATES");
  if (!opts?.allowPast && checkIn < todayIso()) throw new BookingError("CHECK_IN_PAST");
  if (nights > maxNights) throw new BookingError("MAX_NIGHTS", { max: maxNights });
  return { checkIn, checkOut, nights };
}

/* ------------------------------------------------------------------ */
/* Context loading                                                     */
/* ------------------------------------------------------------------ */

export type RoomTypeContext = RoomTypePricingInput & {
  slug: string;
  code: string;
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
  bedConfigEn: string;
  bedConfigAr: string;
  sizeSqm: number | null;
  hasBalcony: boolean;
  isSuite: boolean;
  images: Array<{ url: string; altEn: string; altAr: string }>;
  amenities: Array<{ key: string; labelEn: string; labelAr: string; icon: string }>;
  rooms: Array<{ id: string; number: string; isActive: boolean }>;
  restrictions: Array<{ date: IsoDate; maxInventory: number | null; closed: boolean }>;
};

export type RatePlanContext = RatePlanPricingInput & {
  code: string;
  type: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  includesBreakfast: boolean;
  refundable: boolean;
  cancellationDeadlineDays: number;
  cancellationPolicyEn: string;
  cancellationPolicyAr: string;
  isDemo: boolean;
};

export type ExtraContext = ExtraPricingInput & {
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  pricingLabel: string;
  isDemo: boolean;
  priceText: string;
};

export type PricingContext = {
  settings: SettingsPricingInput & { currency: string; maxRoomsPerBooking: number; maxNightsPerBooking: number; childAgeLimit: number; checkInTime: string; checkOutTime: string };
  roomTypes: RoomTypeContext[];
  ratePlans: RatePlanContext[];
  extras: ExtraContext[];
  occupancies: Occupancy[];
  blocks: Block[];
};

export async function loadSettingsForPricing(db: Db = prisma) {
  const s = await db.hotelSettings.findUniqueOrThrow({ where: { id: "default" } });
  return {
    taxRate: money(s.taxRate.toString()),
    serviceChargeRate: money(s.serviceChargeRate.toString()),
    taxesIncluded: s.taxesIncluded,
    weekendDays: s.weekendDays,
    currency: s.currency,
    maxRoomsPerBooking: s.maxRoomsPerBooking,
    maxNightsPerBooking: s.maxNightsPerBooking,
    childAgeLimit: s.childAgeLimit,
    checkInTime: s.checkInTime,
    checkOutTime: s.checkOutTime,
  };
}

export async function loadPricingContext(stay: StayRequest, db: Db = prisma, opts?: { includeInactiveRoomTypes?: boolean }): Promise<PricingContext> {
  const start = isoToUtcDate(stay.checkIn);
  const end = isoToUtcDate(stay.checkOut);
  const settings = await loadSettingsForPricing(db);

  const [roomTypes, seasons, overrides, ratePlans, extras, reservationRooms, blocks] = await Promise.all([
    db.roomType.findMany({
      where: opts?.includeInactiveRoomTypes ? undefined : { isActive: true },
      include: { rooms: { select: { id: true, number: true, isActive: true } }, images: { orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    db.season.findMany({ where: { isActive: true, startDate: { lt: end }, endDate: { gt: start } }, include: { rates: true } }),
    db.rateOverride.findMany({ where: { date: { gte: start, lt: end } } }),
    db.ratePlan.findMany({
      where: {
        isActive: true,
        OR: [{ validFrom: null }, { validFrom: { lte: start } }],
        AND: [{ OR: [{ validTo: null }, { validTo: { gte: start } }] }],
      },
      orderBy: { sortOrder: "asc" },
    }),
    db.extra.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.reservationRoom.findMany({
      where: { reservation: { status: { in: ACTIVE_STATUSES }, checkIn: { lt: end }, checkOut: { gt: start } } },
      select: { roomId: true, roomTypeId: true, reservation: { select: { checkIn: true, checkOut: true } } },
    }),
    db.inventoryBlock.findMany({ where: { startDate: { lt: end }, endDate: { gt: start } }, select: { roomId: true, startDate: true, endDate: true } }),
  ]);

  const roomTypeCtx: RoomTypeContext[] = roomTypes.map((rt) => ({
    id: rt.id,
    slug: rt.slug,
    code: rt.code,
    nameEn: rt.nameEn,
    nameAr: rt.nameAr,
    shortEn: rt.shortEn,
    shortAr: rt.shortAr,
    bedConfigEn: rt.bedConfigEn,
    bedConfigAr: rt.bedConfigAr,
    sizeSqm: rt.sizeSqm,
    hasBalcony: rt.hasBalcony,
    isSuite: rt.isSuite,
    baseRate: money(rt.baseRate.toString()),
    weekendRate: rt.weekendRate ? money(rt.weekendRate.toString()) : null,
    extraAdultRate: money(rt.extraAdultRate.toString()),
    extraChildRate: money(rt.extraChildRate.toString()),
    maxAdults: rt.maxAdults,
    maxChildren: rt.maxChildren,
    maxOccupancy: rt.maxOccupancy,
    minStay: rt.minStay,
    seasonRates: seasons.flatMap((s) =>
      s.rates.filter((r) => r.roomTypeId === rt.id).map((r) => ({ startDate: dbDateToIso(s.startDate), endDate: dbDateToIso(s.endDate), rate: money(r.rate.toString()) })),
    ),
    overrides: overrides
      .filter((o) => o.roomTypeId === rt.id)
      .map((o) => ({ date: dbDateToIso(o.date), rate: o.rate ? money(o.rate.toString()) : null, minStay: o.minStay, closed: o.closed })),
    restrictions: overrides.filter((o) => o.roomTypeId === rt.id).map((o) => ({ date: dbDateToIso(o.date), maxInventory: o.maxInventory, closed: o.closed })),
    images: rt.images.map((i) => ({ url: i.url, altEn: i.altEn, altAr: i.altAr })),
    amenities: rt.amenities.map((a) => ({ key: a.amenity.key, labelEn: a.amenity.labelEn, labelAr: a.amenity.labelAr, icon: a.amenity.icon })),
    rooms: rt.rooms,
  }));

  return {
    settings,
    roomTypes: roomTypeCtx,
    ratePlans: ratePlans.map((rp) => ({
      id: rp.id,
      code: rp.code,
      type: rp.type,
      nameEn: rp.nameEn,
      nameAr: rp.nameAr,
      descriptionEn: rp.descriptionEn,
      descriptionAr: rp.descriptionAr,
      adjustmentType: rp.adjustmentType,
      adjustmentValue: money(rp.adjustmentValue.toString()),
      minNights: rp.minNights,
      includesBreakfast: rp.includesBreakfast,
      refundable: rp.refundable,
      cancellationDeadlineDays: rp.cancellationDeadlineDays,
      cancellationPolicyEn: rp.cancellationPolicyEn,
      cancellationPolicyAr: rp.cancellationPolicyAr,
      isDemo: rp.isDemo,
    })),
    extras: extras.map((e) => ({
      id: e.id,
      code: e.code,
      nameEn: e.nameEn,
      nameAr: e.nameAr,
      descriptionEn: e.descriptionEn,
      descriptionAr: e.descriptionAr,
      price: money(e.price.toString()),
      priceText: e.price.toString(),
      pricing: e.pricing,
      pricingLabel: e.pricing,
      isInquiryOnly: e.isInquiryOnly,
      icon: e.icon,
      isDemo: e.isDemo,
    })),
    occupancies: reservationRooms.map((r) => ({ roomId: r.roomId, roomTypeId: r.roomTypeId, checkIn: dbDateToIso(r.reservation.checkIn), checkOut: dbDateToIso(r.reservation.checkOut) })),
    blocks: blocks.map((b) => ({ roomId: b.roomId, startDate: dbDateToIso(b.startDate), endDate: dbDateToIso(b.endDate) })),
  };
}

/* ------------------------------------------------------------------ */
/* Availability search                                                 */
/* ------------------------------------------------------------------ */

export type RatePlanOffer = {
  ratePlanId: string;
  code: string;
  type: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  includesBreakfast: boolean;
  refundable: boolean;
  cancellationDeadlineDays: number;
  cancellationPolicyEn: string;
  cancellationPolicyAr: string;
  minNights: number;
  nightly: Array<{ date: IsoDate; rate: string }>;
  roomTotal: string;
  occupancySupplement: string;
  isDemo: boolean;
};

export type RoomTypeAvailability = {
  roomTypeId: string;
  slug: string;
  code: string;
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
  bedConfigEn: string;
  bedConfigAr: string;
  sizeSqm: number | null;
  hasBalcony: boolean;
  isSuite: boolean;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  images: Array<{ url: string; altEn: string; altAr: string }>;
  amenities: Array<{ key: string; labelEn: string; labelAr: string; icon: string }>;
  available: number;
  totalRooms: number;
  minStay: number;
  closed: boolean;
  fromNightly: string | null;
  fromTotal: string | null;
  offers: RatePlanOffer[];
};

export type AvailabilitySearch = {
  checkIn: IsoDate;
  checkOut: IsoDate;
  nights: number;
  adults: number;
  children: number;
  rooms: number;
  currency: string;
  roomTypes: RoomTypeAvailability[];
  extras: Array<Omit<ExtraContext, "price"> & { price: string }>;
  settings: { taxRate: string; serviceChargeRate: string; taxesIncluded: boolean; checkInTime: string; checkOutTime: string; childAgeLimit: number };
};

export function offersForRoomType(ctx: PricingContext, roomType: RoomTypeContext, stay: StayRequest, adults: number, children: number): { offers: RatePlanOffer[]; error: PricingError | null } {
  const offers: RatePlanOffer[] = [];
  let firstError: PricingError | null = null;
  for (const rp of ctx.ratePlans) {
    try {
      const q = priceRoom({ roomType, ratePlan: rp, checkIn: stay.checkIn, checkOut: stay.checkOut, adults, children, settings: ctx.settings });
      offers.push({
        ratePlanId: rp.id,
        code: rp.code,
        type: rp.type,
        nameEn: rp.nameEn,
        nameAr: rp.nameAr,
        descriptionEn: rp.descriptionEn,
        descriptionAr: rp.descriptionAr,
        includesBreakfast: rp.includesBreakfast,
        refundable: rp.refundable,
        cancellationDeadlineDays: rp.cancellationDeadlineDays,
        cancellationPolicyEn: rp.cancellationPolicyEn,
        cancellationPolicyAr: rp.cancellationPolicyAr,
        minNights: rp.minNights,
        nightly: q.nightly.map((n) => ({ date: n.date, rate: n.rate })),
        roomTotal: q.roomTotal,
        occupancySupplement: q.occupancySupplement,
        isDemo: rp.isDemo,
      });
    } catch (e) {
      if (e instanceof PricingError) {
        if (e.code !== "RATE_PLAN_MIN_NIGHTS" && !firstError) firstError = e;
        continue;
      }
      throw e;
    }
  }
  offers.sort((a, b) => Number(a.roomTotal) - Number(b.roomTotal));
  return { offers, error: offers.length ? null : firstError };
}

export async function searchAvailability(input: { checkIn: string; checkOut: string; adults: number; children: number; rooms: number }, db: Db = prisma): Promise<AvailabilitySearch> {
  const settings = await loadSettingsForPricing(db);
  const { checkIn, checkOut, nights } = validateStayDates(input.checkIn, input.checkOut, settings.maxNightsPerBooking);
  if (input.rooms < 1 || input.rooms > settings.maxRoomsPerBooking) throw new BookingError("MAX_ROOMS", { max: settings.maxRoomsPerBooking });
  if (input.adults < 1) throw new BookingError("OCCUPANCY", { reason: "adults" });

  const ctx = await loadPricingContext({ checkIn, checkOut }, db);
  // Occupancy used for pricing preview: guests spread evenly across requested rooms.
  const adultsPerRoom = Math.max(1, Math.ceil(input.adults / input.rooms));
  const childrenPerRoom = Math.ceil(input.children / input.rooms);

  const roomTypes: RoomTypeAvailability[] = ctx.roomTypes.map((rt) => {
    const stayAvail = availabilityForStay({
      checkIn,
      checkOut,
      rooms: rt.rooms,
      occupancies: ctx.occupancies.filter((o) => rt.rooms.some((r) => r.id === o.roomId) || (o.roomId === null && o.roomTypeId === rt.id)),
      blocks: ctx.blocks,
      restrictions: rt.restrictions,
    });
    const previewAdults = Math.min(adultsPerRoom, rt.maxAdults);
    const previewChildren = Math.min(childrenPerRoom, rt.maxChildren);
    const { offers, error } = offersForRoomType(ctx, rt, { checkIn, checkOut }, previewAdults, previewChildren);
    const cheapest = offers[0];
    const cheapestNight = cheapest ? Math.min(...cheapest.nightly.map((n) => Number(n.rate))) : null;
    return {
      roomTypeId: rt.id,
      slug: rt.slug,
      code: rt.code,
      nameEn: rt.nameEn,
      nameAr: rt.nameAr,
      shortEn: rt.shortEn,
      shortAr: rt.shortAr,
      bedConfigEn: rt.bedConfigEn,
      bedConfigAr: rt.bedConfigAr,
      sizeSqm: rt.sizeSqm,
      hasBalcony: rt.hasBalcony,
      isSuite: rt.isSuite,
      maxAdults: rt.maxAdults,
      maxChildren: rt.maxChildren,
      maxOccupancy: rt.maxOccupancy,
      images: rt.images,
      amenities: rt.amenities,
      available: error ? 0 : stayAvail.available,
      totalRooms: rt.rooms.filter((r) => r.isActive).length,
      minStay: effectiveMinStay(rt, checkIn, checkOut),
      closed: error?.code === "CLOSED_DATE",
      fromNightly: cheapestNight !== null && Number.isFinite(cheapestNight) ? cheapestNight.toFixed(2) : null,
      fromTotal: cheapest ? cheapest.roomTotal : null,
      offers,
    };
  });

  return {
    checkIn,
    checkOut,
    nights,
    adults: input.adults,
    children: input.children,
    rooms: input.rooms,
    currency: settings.currency,
    roomTypes,
    extras: ctx.extras.map((e) => ({ ...e, price: e.priceText })),
    settings: {
      taxRate: settings.taxRate.toString(),
      serviceChargeRate: settings.serviceChargeRate.toString(),
      taxesIncluded: settings.taxesIncluded,
      checkInTime: settings.checkInTime,
      checkOutTime: settings.checkOutTime,
      childAgeLimit: settings.childAgeLimit,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Quote                                                               */
/* ------------------------------------------------------------------ */

export type RoomSelection = { roomTypeId: string; ratePlanId: string; adults: number; children: number };
export type ExtraSelection = { extraId: string; quantity: number };

export type QuoteInput = {
  checkIn: string;
  checkOut: string;
  rooms: RoomSelection[];
  extras: ExtraSelection[];
  promotionCode?: string | null;
};

export type QuoteResult = Quote & {
  currency: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  roomDetails: Array<{ roomTypeId: string; ratePlanId: string; nameEn: string; nameAr: string; ratePlanNameEn: string; ratePlanNameAr: string; cancellationPolicyEn: string; cancellationPolicyAr: string; refundable: boolean; includesBreakfast: boolean }>;
  extraDetails: Array<{ extraId: string; nameEn: string; nameAr: string; isInquiryOnly: boolean }>;
  taxRate: string;
  serviceChargeRate: string;
};

async function loadPromotion(code: string | null | undefined, db: Db): Promise<PromotionPricingInput | null> {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return null;
  const promo = await db.promotion.findUnique({ where: { code: trimmed } });
  if (!promo) throw new BookingError("PROMOTION_INVALID", { reason: "unknown" });
  return {
    id: promo.id,
    code: promo.code,
    type: promo.type,
    value: money(promo.value.toString()),
    minNights: promo.minNights,
    validFrom: dbDateToIso(promo.validFrom),
    validTo: dbDateToIso(promo.validTo),
    isActive: promo.isActive,
  };
}

function translatePricingError(e: unknown): never {
  if (e instanceof PricingError) {
    switch (e.code) {
      case "MIN_STAY":
        throw new BookingError("MIN_STAY", e.details);
      case "CLOSED_DATE":
        throw new BookingError("CLOSED_DATE", e.details);
      case "OCCUPANCY":
        throw new BookingError("OCCUPANCY", e.details);
      case "RATE_PLAN_MIN_NIGHTS":
        throw new BookingError("RATE_PLAN_UNAVAILABLE", e.details);
      case "PROMOTION_INVALID":
        throw new BookingError("PROMOTION_INVALID", e.details);
      default:
        throw new BookingError("INVALID_DATES", e.details);
    }
  }
  throw e;
}

export async function quoteStay(input: QuoteInput, db: Db = prisma, opts?: { allowPast?: boolean; ctx?: PricingContext }): Promise<{ quote: QuoteResult; ctx: PricingContext; promotion: PromotionPricingInput | null }> {
  const settings = opts?.ctx?.settings ?? (await loadSettingsForPricing(db));
  const { checkIn, checkOut } = validateStayDates(input.checkIn, input.checkOut, settings.maxNightsPerBooking, { allowPast: opts?.allowPast });
  if (input.rooms.length < 1 || input.rooms.length > settings.maxRoomsPerBooking) throw new BookingError("MAX_ROOMS", { max: settings.maxRoomsPerBooking });
  const ctx = opts?.ctx ?? (await loadPricingContext({ checkIn, checkOut }, db));
  const promotion = await loadPromotion(input.promotionCode, db);

  const rooms = input.rooms.map((sel) => {
    const roomType = ctx.roomTypes.find((r) => r.id === sel.roomTypeId);
    if (!roomType) throw new BookingError("ROOM_TYPE_NOT_FOUND", { roomTypeId: sel.roomTypeId });
    const ratePlan = ctx.ratePlans.find((r) => r.id === sel.ratePlanId);
    if (!ratePlan) throw new BookingError("RATE_PLAN_NOT_FOUND", { ratePlanId: sel.ratePlanId });
    return { roomType, ratePlan, adults: sel.adults, children: sel.children };
  });
  const extras = input.extras
    .filter((e) => e.quantity > 0)
    .map((sel) => {
      const extra = ctx.extras.find((x) => x.id === sel.extraId);
      if (!extra) throw new BookingError("EXTRA_NOT_FOUND", { extraId: sel.extraId });
      return { extra, quantity: Math.min(10, Math.max(1, Math.floor(sel.quantity))) };
    });

  let quote: Quote;
  try {
    quote = buildQuote({ checkIn, checkOut, rooms, extras, promotion, settings: ctx.settings });
  } catch (e) {
    translatePricingError(e);
  }

  return {
    ctx,
    promotion,
    quote: {
      ...quote,
      currency: settings.currency,
      checkIn,
      checkOut,
      taxRate: ctx.settings.taxRate.toString(),
      serviceChargeRate: ctx.settings.serviceChargeRate.toString(),
      roomDetails: rooms.map((r) => ({
        roomTypeId: r.roomType.id,
        ratePlanId: r.ratePlan.id,
        nameEn: r.roomType.nameEn,
        nameAr: r.roomType.nameAr,
        ratePlanNameEn: r.ratePlan.nameEn,
        ratePlanNameAr: r.ratePlan.nameAr,
        cancellationPolicyEn: r.ratePlan.cancellationPolicyEn,
        cancellationPolicyAr: r.ratePlan.cancellationPolicyAr,
        refundable: r.ratePlan.refundable,
        includesBreakfast: r.ratePlan.includesBreakfast,
      })),
      extraDetails: extras.map((e) => ({ extraId: e.extra.id, nameEn: e.extra.nameEn, nameAr: e.extra.nameAr, isInquiryOnly: e.extra.isInquiryOnly })),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Reservation creation (transactional, oversell-safe)                 */
/* ------------------------------------------------------------------ */

export type GuestInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  specialRequests?: string | null;
  arrivalTime?: string | null;
};

export type CreateReservationInput = QuoteInput & {
  guest: GuestInput;
  paymentMethod: PaymentMethod;
  locale: string;
  source?: BookingSource;
  status?: ReservationStatus;
  createdById?: string | null;
  actorName?: string;
  allowPast?: boolean;
};

export type CreatedReservation = { id: string; reference: string };

/**
 * Creates a reservation inside a serializable-ish transaction:
 * 1. takes a per-room-type advisory lock so concurrent bookings for the same category serialise,
 * 2. recomputes availability from the database inside the transaction,
 * 3. assigns a concrete physical room to every requested room,
 * 4. re-prices on the server (client totals are never trusted),
 * 5. writes reservation + rooms + extras + payment + activity log atomically.
 */
export async function createReservation(input: CreateReservationInput): Promise<CreatedReservation> {
  return prisma.$transaction(
    async (tx) => {
      const settings = await loadSettingsForPricing(tx);
      const { checkIn, checkOut, nights } = validateStayDates(input.checkIn, input.checkOut, settings.maxNightsPerBooking, { allowPast: input.allowPast });

      // Serialise concurrent bookings per room type (advisory lock keyed by a stable hash of the id).
      const typeIds = Array.from(new Set(input.rooms.map((r) => r.roomTypeId))).sort();
      for (const id of typeIds) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      }

      const ctx = await loadPricingContext({ checkIn, checkOut }, tx);
      const { quote, promotion } = await quoteStay(input, tx, { allowPast: input.allowPast, ctx });

      // Assign physical rooms, re-validating availability from fresh data.
      const assigned = new Set<string>();
      const assignments: string[] = [];
      for (const sel of input.rooms) {
        const rt = ctx.roomTypes.find((r) => r.id === sel.roomTypeId)!;
        const stayAvail = availabilityForStay({
          checkIn,
          checkOut,
          rooms: rt.rooms,
          occupancies: ctx.occupancies.filter((o) => rt.rooms.some((r) => r.id === o.roomId)),
          blocks: ctx.blocks,
          restrictions: rt.restrictions,
        });
        const alreadyTaken = Array.from(assigned).filter((id) => rt.rooms.some((r) => r.id === id)).length;
        if (stayAvail.available - alreadyTaken < 1) throw new BookingError("NOT_AVAILABLE", { roomTypeId: rt.id });
        const roomId = stayAvail.freeRoomIdsForWholeStay.find((id) => !assigned.has(id));
        if (!roomId) throw new BookingError("NOT_AVAILABLE", { roomTypeId: rt.id });
        assigned.add(roomId);
        assignments.push(roomId);
      }

      const guest = await tx.guest.create({
        data: {
          firstName: input.guest.firstName.trim(),
          lastName: input.guest.lastName.trim(),
          email: input.guest.email.trim().toLowerCase(),
          phone: input.guest.phone.trim(),
          country: input.guest.country,
        },
      });

      let reference = generateReference();
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await tx.reservation.findUnique({ where: { reference }, select: { id: true } });
        if (!clash) break;
        reference = generateReference();
      }

      const status: ReservationStatus = input.status ?? "CONFIRMED";
      const paymentStatus: PaymentStatus = input.paymentMethod === "SIMULATED_CARD" ? "SIMULATED_PAID" : input.paymentMethod === "CASH" ? "UNPAID" : "PAY_AT_PROPERTY";
      const policyEn = quote.roomDetails.map((r) => r.cancellationPolicyEn).filter((v, i, a) => a.indexOf(v) === i).join(" ");
      const policyAr = quote.roomDetails.map((r) => r.cancellationPolicyAr).filter((v, i, a) => a.indexOf(v) === i).join(" ");
      const adults = input.rooms.reduce((a, r) => a + r.adults, 0);
      const children = input.rooms.reduce((a, r) => a + r.children, 0);

      const reservation = await tx.reservation.create({
        data: {
          reference,
          status,
          source: input.source ?? "WEBSITE",
          guestId: guest.id,
          checkIn: isoToUtcDate(checkIn),
          checkOut: isoToUtcDate(checkOut),
          nights,
          adults,
          children,
          currency: settings.currency,
          roomSubtotal: quote.roomSubtotal,
          extrasTotal: quote.extrasTotal,
          discountTotal: quote.discountTotal,
          taxTotal: quote.taxTotal,
          serviceChargeTotal: quote.serviceChargeTotal,
          grandTotal: quote.grandTotal,
          paymentStatus,
          paymentMethod: input.paymentMethod,
          specialRequests: input.guest.specialRequests?.trim() || null,
          arrivalTime: input.guest.arrivalTime?.trim() || null,
          locale: input.locale === "ar" ? "ar" : "en",
          promotionId: promotion?.id ?? null,
          promotionCode: promotion?.code ?? null,
          cancellationPolicyEn: policyEn,
          cancellationPolicyAr: policyAr,
          createdById: input.createdById ?? null,
          isDemo: true,
          rooms: {
            create: input.rooms.map((sel, i) => ({
              roomTypeId: sel.roomTypeId,
              roomId: assignments[i],
              ratePlanId: sel.ratePlanId,
              adults: sel.adults,
              children: sel.children,
              nightlyRates: quote.rooms[i].nightly,
              roomTotal: quote.rooms[i].roomTotal,
            })),
          },
          extras: {
            create: quote.extras.map((e) => {
              const d = quote.extraDetails.find((x) => x.extraId === e.extraId)!;
              return { extraId: e.extraId, nameEn: d.nameEn, nameAr: d.nameAr, quantity: e.quantity, unitPrice: e.unitPrice, total: e.total };
            }),
          },
          payments:
            paymentStatus === "SIMULATED_PAID"
              ? { create: [{ amount: quote.grandTotal, method: "SIMULATED_CARD", status: "SIMULATED_PAID", reference: `DEMO-${reference}`, note: "Simulated demo payment. No card data collected." }] }
              : undefined,
        },
        select: { id: true, reference: true },
      });

      await tx.activityLog.create({
        data: {
          actorId: input.createdById ?? null,
          actorName: input.actorName ?? `${guest.firstName} ${guest.lastName}`,
          action: "reservation_create",
          entityType: "reservation",
          entityId: reservation.id,
          summary: `${input.source ?? "WEBSITE"} reservation ${reference} · ${nights} nights · ${quote.grandTotal} ${settings.currency}`,
          metadata: { ref: reference, source: input.source ?? "WEBSITE" },
        },
      });

      return reservation;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 },
  );
}
