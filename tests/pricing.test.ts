import { describe, expect, it } from "vitest";
import { money } from "@/lib/booking/money";
import {
  buildQuote,
  PricingError,
  priceRoom,
  resolveNightlyRate,
  type RatePlanPricingInput,
  type RoomTypePricingInput,
  type SettingsPricingInput,
} from "@/lib/booking/pricing";

const settings: SettingsPricingInput = {
  taxRate: money(16),
  serviceChargeRate: money(10),
  taxesIncluded: false,
  weekendDays: [5, 6],
};

const double: RoomTypePricingInput = {
  id: "dbl",
  baseRate: money(65),
  weekendRate: money(75),
  extraAdultRate: money(15),
  extraChildRate: money(8),
  maxAdults: 3,
  maxChildren: 1,
  maxOccupancy: 3,
  minStay: 1,
  seasonRates: [{ startDate: "2026-03-01", endDate: "2026-06-01", rate: money(80) }],
  overrides: [
    { date: "2026-03-15", rate: money(120), minStay: null, closed: false },
    { date: "2026-12-24", rate: null, minStay: 3, closed: false },
    { date: "2026-12-31", rate: null, minStay: null, closed: true },
  ],
};

const roomOnly: RatePlanPricingInput = { id: "ro", adjustmentType: "PERCENT", adjustmentValue: money(0), minNights: 1 };
const nonRefundable: RatePlanPricingInput = { id: "nr", adjustmentType: "PERCENT", adjustmentValue: money(-12), minNights: 1 };
const breakfast: RatePlanPricingInput = { id: "bb", adjustmentType: "FIXED", adjustmentValue: money(12), minNights: 1 };

describe("resolveNightlyRate", () => {
  it("uses base rate on weekdays", () => {
    expect(resolveNightlyRate(double, "2026-10-07", settings.weekendDays)).toEqual({ date: "2026-10-07", rate: "65.00", source: "base" });
  });
  it("uses weekend rate on Fridays and Saturdays", () => {
    expect(resolveNightlyRate(double, "2026-10-09", settings.weekendDays).source).toBe("weekend");
    expect(resolveNightlyRate(double, "2026-10-09", settings.weekendDays).rate).toBe("75.00");
  });
  it("season beats weekend", () => {
    expect(resolveNightlyRate(double, "2026-03-13", settings.weekendDays)).toEqual({ date: "2026-03-13", rate: "80.00", source: "season" });
  });
  it("override beats season", () => {
    expect(resolveNightlyRate(double, "2026-03-15", settings.weekendDays).rate).toBe("120.00");
  });
  it("closed dates throw", () => {
    expect(() => resolveNightlyRate(double, "2026-12-31", settings.weekendDays)).toThrow(PricingError);
  });
});

describe("priceRoom", () => {
  it("sums multi-night stays with mixed rates", () => {
    // Thu 8 Oct (base 65) + Fri 9 Oct (weekend 75) + Sat 10 Oct (weekend 75)
    const q = priceRoom({ roomType: double, ratePlan: roomOnly, checkIn: "2026-10-08", checkOut: "2026-10-11", adults: 2, children: 0, settings });
    expect(q.nightly.map((n) => n.rate)).toEqual(["65.00", "75.00", "75.00"]);
    expect(q.roomTotal).toBe("215.00");
  });
  it("applies percentage rate-plan adjustments per night", () => {
    const q = priceRoom({ roomType: double, ratePlan: nonRefundable, checkIn: "2026-10-07", checkOut: "2026-10-08", adults: 2, children: 0, settings });
    expect(q.roomTotal).toBe("57.20");
  });
  it("applies fixed rate-plan adjustments per night", () => {
    const q = priceRoom({ roomType: double, ratePlan: breakfast, checkIn: "2026-10-07", checkOut: "2026-10-09", adults: 2, children: 0, settings });
    expect(q.roomTotal).toBe("154.00");
  });
  it("adds occupancy supplements for a third adult and a child", () => {
    const q = priceRoom({ roomType: double, ratePlan: roomOnly, checkIn: "2026-10-07", checkOut: "2026-10-09", adults: 3, children: 0, settings });
    expect(q.occupancySupplement).toBe("30.00");
    expect(q.roomTotal).toBe("160.00");
    const withChild = priceRoom({ roomType: double, ratePlan: roomOnly, checkIn: "2026-10-07", checkOut: "2026-10-09", adults: 2, children: 1, settings });
    expect(withChild.occupancySupplement).toBe("16.00");
  });
  it("rejects occupancy above the room limits", () => {
    expect(() => priceRoom({ roomType: double, ratePlan: roomOnly, checkIn: "2026-10-07", checkOut: "2026-10-09", adults: 4, children: 0, settings })).toThrow("OCCUPANCY");
    expect(() => priceRoom({ roomType: double, ratePlan: roomOnly, checkIn: "2026-10-07", checkOut: "2026-10-09", adults: 3, children: 1, settings })).toThrow("OCCUPANCY");
  });
  it("enforces date-level minimum stay", () => {
    expect(() => priceRoom({ roomType: double, ratePlan: roomOnly, checkIn: "2026-12-24", checkOut: "2026-12-26", adults: 2, children: 0, settings })).toThrow("MIN_STAY");
    expect(priceRoom({ roomType: double, ratePlan: roomOnly, checkIn: "2026-12-24", checkOut: "2026-12-27", adults: 2, children: 0, settings }).nightly).toHaveLength(3);
  });
  it("rejects zero-night stays", () => {
    expect(() => priceRoom({ roomType: double, ratePlan: roomOnly, checkIn: "2026-10-07", checkOut: "2026-10-07", adults: 2, children: 0, settings })).toThrow("INVALID_DATES");
  });
});

describe("buildQuote", () => {
  it("computes an itemized total with service charge and tax on top", () => {
    const q = buildQuote({
      checkIn: "2026-10-07",
      checkOut: "2026-10-09",
      rooms: [
        { roomType: double, ratePlan: roomOnly, adults: 2, children: 0 },
        { roomType: double, ratePlan: breakfast, adults: 2, children: 0 },
      ],
      extras: [
        { extra: { id: "transfer", price: money(95), pricing: "PER_STAY", isInquiryOnly: false }, quantity: 1 },
        { extra: { id: "bath", price: money(25), pricing: "PER_PERSON", isInquiryOnly: false }, quantity: 1 },
        { extra: { id: "petra", price: money(0), pricing: "PER_STAY", isInquiryOnly: true }, quantity: 1 },
      ],
      promotion: null,
      settings,
    });
    expect(q.nights).toBe(2);
    expect(q.roomSubtotal).toBe("284.00"); // 130 + 154
    expect(q.extrasTotal).toBe("195.00"); // 95 + 25*4 guests
    expect(q.taxableBase).toBe("479.00");
    expect(q.serviceChargeTotal).toBe("47.90");
    expect(q.taxTotal).toBe("84.30"); // (479 + 47.90) * 16% = 84.304
    expect(q.grandTotal).toBe("611.20");
  });

  it("applies a percentage promotion to the room subtotal only", () => {
    const q = buildQuote({
      checkIn: "2026-10-07",
      checkOut: "2026-10-09",
      rooms: [{ roomType: double, ratePlan: roomOnly, adults: 2, children: 0 }],
      extras: [{ extra: { id: "t", price: money(100), pricing: "PER_STAY", isInquiryOnly: false }, quantity: 1 }],
      promotion: { id: "p", code: "WELCOME10", type: "PERCENT", value: money(10), minNights: 2, validFrom: "2026-01-01", validTo: "2026-12-31", isActive: true },
      settings,
    });
    expect(q.discountTotal).toBe("13.00");
    expect(q.taxableBase).toBe("217.00");
  });

  it("rejects promotions outside their validity or minimum nights", () => {
    const promo = { id: "p", code: "X", type: "FIXED" as const, value: money(10), minNights: 3, validFrom: "2026-01-01", validTo: "2026-12-31", isActive: true };
    expect(() =>
      buildQuote({ checkIn: "2026-10-07", checkOut: "2026-10-09", rooms: [{ roomType: double, ratePlan: roomOnly, adults: 2, children: 0 }], extras: [], promotion: promo, settings }),
    ).toThrow("PROMOTION_INVALID");
  });

  it("backs out tax and service charge when prices are tax-inclusive", () => {
    const q = buildQuote({
      checkIn: "2026-10-07",
      checkOut: "2026-10-08",
      rooms: [{ roomType: double, ratePlan: roomOnly, adults: 2, children: 0 }],
      extras: [],
      promotion: null,
      settings: { ...settings, taxesIncluded: true },
    });
    expect(q.grandTotal).toBe("65.00");
    expect(money(q.taxTotal).plus(q.serviceChargeTotal).lt(65)).toBe(true);
  });

  it("is decimal-safe for amounts that break floating point", () => {
    const tricky: RoomTypePricingInput = { ...double, baseRate: money("0.10"), weekendRate: null, seasonRates: [], overrides: [] };
    const q = buildQuote({
      checkIn: "2026-10-05",
      checkOut: "2026-10-08",
      rooms: [{ roomType: tricky, ratePlan: roomOnly, adults: 2, children: 0 }],
      extras: [],
      promotion: null,
      settings: { ...settings, taxRate: money(0), serviceChargeRate: money(0) },
    });
    expect(q.roomSubtotal).toBe("0.30");
  });
});
