import { Decimal, money, round2, sum } from "./money";
import { dayOfWeek, nightsBetween, type IsoDate } from "@/lib/utils/dates";

/**
 * Pure pricing engine. No database access here, so it can be unit-tested exhaustively.
 * The server loads the inputs (rates, overrides, settings) and the engine computes the quote.
 */

export type AdjustmentType = "PERCENT" | "FIXED";
export type ExtraPricing = "PER_STAY" | "PER_NIGHT" | "PER_PERSON" | "PER_PERSON_PER_NIGHT";

export type RoomTypePricingInput = {
  id: string;
  baseRate: Decimal;
  weekendRate: Decimal | null;
  extraAdultRate: Decimal;
  extraChildRate: Decimal;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  minStay: number;
  /** seasonal rate per night when a season covers the date */
  seasonRates: Array<{ startDate: IsoDate; endDate: IsoDate; rate: Decimal }>;
  /** date-specific overrides */
  overrides: Array<{ date: IsoDate; rate: Decimal | null; minStay: number | null; closed: boolean }>;
};

export type RatePlanPricingInput = {
  id: string;
  adjustmentType: AdjustmentType;
  adjustmentValue: Decimal;
  minNights: number;
};

export type PromotionPricingInput = {
  id: string;
  code: string;
  type: AdjustmentType;
  value: Decimal;
  minNights: number;
  validFrom: IsoDate;
  validTo: IsoDate;
  isActive: boolean;
};

export type ExtraPricingInput = {
  id: string;
  price: Decimal;
  pricing: ExtraPricing;
  isInquiryOnly: boolean;
};

export type SettingsPricingInput = {
  taxRate: Decimal;
  serviceChargeRate: Decimal;
  taxesIncluded: boolean;
  weekendDays: number[];
};

export type NightlyRate = { date: IsoDate; rate: string; source: "base" | "weekend" | "season" | "override" };

export type RoomQuote = {
  roomTypeId: string;
  ratePlanId: string;
  adults: number;
  children: number;
  nightly: NightlyRate[];
  occupancySupplement: string;
  roomTotal: string;
};

export type ExtraQuote = { extraId: string; quantity: number; unitPrice: string; total: string };

export type Quote = {
  nights: number;
  rooms: RoomQuote[];
  extras: ExtraQuote[];
  roomSubtotal: string;
  extrasTotal: string;
  discountTotal: string;
  taxableBase: string;
  serviceChargeTotal: string;
  taxTotal: string;
  grandTotal: string;
  taxesIncluded: boolean;
  promotionCode: string | null;
};

export class PricingError extends Error {
  readonly code:
    | "MIN_STAY"
    | "CLOSED_DATE"
    | "OCCUPANCY"
    | "RATE_PLAN_MIN_NIGHTS"
    | "PROMOTION_INVALID"
    | "INVALID_DATES";
  readonly details?: Record<string, unknown>;
  constructor(code: PricingError["code"], details?: Record<string, unknown>) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

/** Resolve the raw nightly rate for a room type on a date, before rate-plan adjustment. */
export function resolveNightlyRate(
  roomType: RoomTypePricingInput,
  date: IsoDate,
  weekendDays: number[],
): NightlyRate {
  const override = roomType.overrides.find((o) => o.date === date);
  if (override?.closed) throw new PricingError("CLOSED_DATE", { date, roomTypeId: roomType.id });
  if (override?.rate) return { date, rate: round2(override.rate).toFixed(2), source: "override" };

  const season = roomType.seasonRates.find((s) => date >= s.startDate && date < s.endDate);
  if (season) return { date, rate: round2(season.rate).toFixed(2), source: "season" };

  if (roomType.weekendRate && weekendDays.includes(dayOfWeek(date))) {
    return { date, rate: round2(roomType.weekendRate).toFixed(2), source: "weekend" };
  }
  return { date, rate: round2(roomType.baseRate).toFixed(2), source: "base" };
}

export function applyAdjustment(amount: Decimal, type: AdjustmentType, value: Decimal): Decimal {
  if (type === "PERCENT") return round2(amount.times(money(1).plus(value.div(100))));
  return round2(amount.plus(value));
}

export function effectiveMinStay(roomType: RoomTypePricingInput, checkIn: IsoDate, checkOut: IsoDate): number {
  let min = roomType.minStay;
  for (const night of nightsBetween(checkIn, checkOut)) {
    const o = roomType.overrides.find((x) => x.date === night);
    if (o?.minStay && o.minStay > min) min = o.minStay;
  }
  return min;
}

export function validateOccupancy(roomType: RoomTypePricingInput, adults: number, children: number): void {
  if (adults < 1) throw new PricingError("OCCUPANCY", { reason: "adults" });
  if (adults > roomType.maxAdults) throw new PricingError("OCCUPANCY", { reason: "maxAdults", max: roomType.maxAdults });
  if (children > roomType.maxChildren) throw new PricingError("OCCUPANCY", { reason: "maxChildren", max: roomType.maxChildren });
  if (adults + children > roomType.maxOccupancy) {
    throw new PricingError("OCCUPANCY", { reason: "maxOccupancy", max: roomType.maxOccupancy });
  }
}

export function priceRoom(args: {
  roomType: RoomTypePricingInput;
  ratePlan: RatePlanPricingInput;
  checkIn: IsoDate;
  checkOut: IsoDate;
  adults: number;
  children: number;
  settings: SettingsPricingInput;
}): RoomQuote {
  const { roomType, ratePlan, checkIn, checkOut, adults, children, settings } = args;
  const nights = nightsBetween(checkIn, checkOut);
  if (nights.length < 1) throw new PricingError("INVALID_DATES");
  validateOccupancy(roomType, adults, children);

  const minStay = effectiveMinStay(roomType, checkIn, checkOut);
  if (nights.length < minStay) throw new PricingError("MIN_STAY", { minStay, roomTypeId: roomType.id });
  if (nights.length < ratePlan.minNights) {
    throw new PricingError("RATE_PLAN_MIN_NIGHTS", { minNights: ratePlan.minNights, ratePlanId: ratePlan.id });
  }

  const nightly = nights.map((date) => {
    const raw = resolveNightlyRate(roomType, date, settings.weekendDays);
    const adjusted = applyAdjustment(money(raw.rate), ratePlan.adjustmentType, ratePlan.adjustmentValue);
    return { ...raw, rate: adjusted.toFixed(2) };
  });

  // Occupancy supplements: the base rate covers 2 adults (or 1 for single rooms where maxAdults === 1).
  const includedAdults = Math.min(2, roomType.maxAdults);
  const extraAdults = Math.max(0, adults - includedAdults);
  const supplementPerNight = roomType.extraAdultRate.times(extraAdults).plus(roomType.extraChildRate.times(children));
  const occupancySupplement = round2(supplementPerNight.times(nights.length));

  const roomTotal = round2(sum(nightly.map((n) => money(n.rate))).plus(occupancySupplement));

  return {
    roomTypeId: roomType.id,
    ratePlanId: ratePlan.id,
    adults,
    children,
    nightly,
    occupancySupplement: occupancySupplement.toFixed(2),
    roomTotal: roomTotal.toFixed(2),
  };
}

export function priceExtra(args: {
  extra: ExtraPricingInput;
  quantity: number;
  nights: number;
  guests: number;
}): ExtraQuote {
  const { extra, quantity, nights, guests } = args;
  if (extra.isInquiryOnly) {
    return { extraId: extra.id, quantity, unitPrice: "0.00", total: "0.00" };
  }
  let multiplier = money(1);
  switch (extra.pricing) {
    case "PER_NIGHT":
      multiplier = money(nights);
      break;
    case "PER_PERSON":
      multiplier = money(guests);
      break;
    case "PER_PERSON_PER_NIGHT":
      multiplier = money(guests).times(nights);
      break;
    default:
      multiplier = money(1);
  }
  const unit = round2(extra.price.times(multiplier));
  return { extraId: extra.id, quantity, unitPrice: unit.toFixed(2), total: round2(unit.times(quantity)).toFixed(2) };
}

export function validatePromotion(promo: PromotionPricingInput, checkIn: IsoDate, nights: number): void {
  if (!promo.isActive) throw new PricingError("PROMOTION_INVALID", { reason: "inactive" });
  if (checkIn < promo.validFrom || checkIn > promo.validTo) throw new PricingError("PROMOTION_INVALID", { reason: "dates" });
  if (nights < promo.minNights) throw new PricingError("PROMOTION_INVALID", { reason: "minNights", minNights: promo.minNights });
}

export function buildQuote(args: {
  checkIn: IsoDate;
  checkOut: IsoDate;
  rooms: Array<{ roomType: RoomTypePricingInput; ratePlan: RatePlanPricingInput; adults: number; children: number }>;
  extras: Array<{ extra: ExtraPricingInput; quantity: number }>;
  promotion: PromotionPricingInput | null;
  settings: SettingsPricingInput;
}): Quote {
  const { checkIn, checkOut, settings } = args;
  const nights = nightsBetween(checkIn, checkOut).length;
  if (nights < 1) throw new PricingError("INVALID_DATES");
  if (args.rooms.length < 1) throw new PricingError("INVALID_DATES", { reason: "no rooms" });

  const rooms = args.rooms.map((r) =>
    priceRoom({ roomType: r.roomType, ratePlan: r.ratePlan, checkIn, checkOut, adults: r.adults, children: r.children, settings }),
  );
  const guests = args.rooms.reduce((acc, r) => acc + r.adults + r.children, 0);
  const extras = args.extras
    .filter((e) => e.quantity > 0)
    .map((e) => priceExtra({ extra: e.extra, quantity: e.quantity, nights, guests }));

  const roomSubtotal = round2(sum(rooms.map((r) => money(r.roomTotal))));
  const extrasTotal = round2(sum(extras.map((e) => money(e.total))));

  let discountTotal = money(0);
  if (args.promotion) {
    validatePromotion(args.promotion, checkIn, nights);
    discountTotal =
      args.promotion.type === "PERCENT"
        ? round2(roomSubtotal.times(args.promotion.value.div(100)))
        : round2(Decimal.min(args.promotion.value, roomSubtotal));
  }

  const net = round2(roomSubtotal.plus(extrasTotal).minus(discountTotal));
  let serviceChargeTotal: Decimal;
  let taxTotal: Decimal;
  let grandTotal: Decimal;

  if (settings.taxesIncluded) {
    // Prices already include service charge and tax: back them out for display, total stays as net.
    const divisor = money(1).plus(settings.serviceChargeRate.div(100)).times(money(1).plus(settings.taxRate.div(100)));
    const base = net.div(divisor);
    serviceChargeTotal = round2(base.times(settings.serviceChargeRate.div(100)));
    taxTotal = round2(net.minus(base).minus(serviceChargeTotal));
    grandTotal = net;
  } else {
    serviceChargeTotal = round2(net.times(settings.serviceChargeRate.div(100)));
    taxTotal = round2(net.plus(serviceChargeTotal).times(settings.taxRate.div(100)));
    grandTotal = round2(net.plus(serviceChargeTotal).plus(taxTotal));
  }

  return {
    nights,
    rooms,
    extras,
    roomSubtotal: roomSubtotal.toFixed(2),
    extrasTotal: extrasTotal.toFixed(2),
    discountTotal: discountTotal.toFixed(2),
    taxableBase: net.toFixed(2),
    serviceChargeTotal: serviceChargeTotal.toFixed(2),
    taxTotal: taxTotal.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
    taxesIncluded: settings.taxesIncluded,
    promotionCode: args.promotion?.code ?? null,
  };
}
