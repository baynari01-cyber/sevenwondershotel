import { describe, expect, it } from "vitest";
import { computeReportMetrics, dailyTableToCsv, overlapNights, resolvePeriod, type ReportReservation } from "@/lib/reports/metrics";

const roomTypes = [
  { id: "dbl", nameEn: "Double", nameAr: "مزدوجة" },
  { id: "ste", nameEn: "Suite", nameAr: "جناح" },
];

const base = (over: Partial<ReportReservation>): ReportReservation => ({
  id: "r",
  status: "CONFIRMED",
  source: "WEBSITE",
  createdOn: "2026-10-01",
  checkIn: "2026-10-05",
  checkOut: "2026-10-07",
  rooms: [{ roomTypeId: "dbl", roomTotal: "200.00" }],
  ...over,
});

describe("overlapNights", () => {
  it("is end-exclusive on both ranges", () => {
    expect(overlapNights("2026-10-05", "2026-10-07", "2026-10-01", "2026-10-31")).toBe(2);
    expect(overlapNights("2026-10-05", "2026-10-07", "2026-10-07", "2026-10-31")).toBe(0);
    expect(overlapNights("2026-09-29", "2026-10-03", "2026-10-01", "2026-10-31")).toBe(2);
    expect(overlapNights("2026-10-01", "2026-10-02", "2026-10-02", "2026-10-03")).toBe(0);
  });
});

describe("computeReportMetrics", () => {
  const from = "2026-10-01";
  const to = "2026-10-11"; // 10 nights

  it("prorates revenue by in-period nights and sums room nights", () => {
    const m = computeReportMetrics({
      from,
      to,
      activeRooms: 4,
      blocks: [],
      roomTypes,
      reservations: [
        base({ id: "a" }), // 2 nights fully inside, 200
        base({ id: "b", checkIn: "2026-09-29", checkOut: "2026-10-03", rooms: [{ roomTypeId: "ste", roomTotal: "400.00" }] }), // 4 nights, 2 inside → 200
        base({ id: "c", checkIn: "2026-10-09", checkOut: "2026-10-13", rooms: [{ roomTypeId: "dbl", roomTotal: "300.00" }, { roomTypeId: "ste", roomTotal: "500.00" }] }), // 4 nights, 2 inside → 150 + 250
      ],
    });
    expect(m.nightsInPeriod).toBe(10);
    expect(m.revenue).toBe("800.00");
    expect(m.nightsSold).toBe(2 + 2 + 2 + 2);
    expect(m.nightsAvailable).toBe(40);
    expect(m.occupancy).toBeCloseTo(8 / 40);
    expect(m.adr).toBe("100.00");
    expect(m.revpar).toBe("20.00");
    expect(m.staysInPeriod).toBe(3);
    expect(m.averageStay).toBeCloseTo((2 + 4 + 4) / 3);
    // Daily revenue adds up to the headline figure.
    const dailySum = m.daily.reduce((a, d) => a + Number(d.revenue), 0);
    expect(dailySum).toBeCloseTo(800, 6);
    expect(m.daily.find((d) => d.date === "2026-10-09")?.nightsSold).toBe(2);
    expect(m.daily.find((d) => d.date === "2026-10-03")?.nightsSold).toBe(0);
  });

  it("excludes cancelled and no-show stays from revenue but counts them in the cancellation rate", () => {
    const m = computeReportMetrics({
      from,
      to,
      activeRooms: 2,
      blocks: [],
      roomTypes,
      reservations: [
        base({ id: "a", createdOn: "2026-10-02" }),
        base({ id: "b", createdOn: "2026-10-02", status: "CANCELLED" }),
        base({ id: "c", createdOn: "2026-10-03", status: "NO_SHOW" }),
        base({ id: "d", createdOn: "2026-09-30", status: "CANCELLED" }), // created before the period → not counted
      ],
    });
    expect(m.revenue).toBe("200.00");
    expect(m.nightsSold).toBe(2);
    expect(m.bookingsCreated).toBe(3);
    expect(m.bookingsCancelled).toBe(1);
    expect(m.cancellationRate).toBeCloseTo(1 / 3);
    expect(m.daily.find((d) => d.date === "2026-10-02")).toMatchObject({ created: 2, cancelled: 1 });
  });

  it("removes blocked room-nights from availability", () => {
    const m = computeReportMetrics({
      from,
      to,
      activeRooms: 3,
      blocks: [
        { startDate: "2026-10-02", endDate: "2026-10-05" }, // 3 nights
        { startDate: "2026-10-09", endDate: "2026-10-20" }, // 2 nights inside
      ],
      roomTypes,
      reservations: [],
    });
    expect(m.nightsAvailable).toBe(30 - 5);
    expect(m.daily.find((d) => d.date === "2026-10-03")?.nightsAvailable).toBe(2);
    expect(m.occupancy).toBe(0);
    expect(m.adr).toBe("0.00");
    expect(m.revpar).toBe("0.00");
  });

  it("breaks revenue down by source and room category with shares that sum to one", () => {
    const m = computeReportMetrics({
      from,
      to,
      activeRooms: 4,
      blocks: [],
      roomTypes,
      reservations: [
        base({ id: "a", source: "WEBSITE" }),
        base({ id: "b", source: "OTA", rooms: [{ roomTypeId: "ste", roomTotal: "600.00" }] }),
        base({ id: "c", source: "OTA", rooms: [{ roomTypeId: "dbl", roomTotal: "200.00" }] }),
      ],
    });
    expect(m.bySource).toEqual([
      { key: "OTA", count: 2, revenue: "800.00", share: 0.8 },
      { key: "WEBSITE", count: 1, revenue: "200.00", share: 0.2 },
    ]);
    expect(m.byRoomType.map((r) => [r.nameEn, r.count, r.revenue])).toEqual([
      ["Suite", 2, "600.00"],
      ["Double", 4, "400.00"],
    ]);
    expect(m.bySource.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1);
  });

  it("keeps cents exact when prorating awkward totals", () => {
    const m = computeReportMetrics({
      from,
      to,
      activeRooms: 1,
      blocks: [],
      roomTypes,
      reservations: [base({ id: "a", checkIn: "2026-10-01", checkOut: "2026-10-04", rooms: [{ roomTypeId: "dbl", roomTotal: "100.00" }] })],
    });
    expect(m.revenue).toBe("100.00");
    expect(m.daily.slice(0, 3).map((d) => d.revenue)).toEqual(["33.33", "33.33", "33.33"]);
  });
});

describe("resolvePeriod", () => {
  const today = "2026-10-08";
  it("builds end-exclusive ranges", () => {
    expect(resolvePeriod("last30", today)).toEqual({ from: "2026-09-09", to: "2026-10-09" });
    expect(resolvePeriod("last90", today)).toEqual({ from: "2026-07-11", to: "2026-10-09" });
    expect(resolvePeriod("thisMonth", today)).toEqual({ from: "2026-10-01", to: "2026-11-01" });
    expect(resolvePeriod("thisMonth", "2026-12-15")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(resolvePeriod("next30", today)).toEqual({ from: "2026-10-08", to: "2026-11-07" });
  });
  it("treats custom bounds as inclusive and caps them at a year", () => {
    expect(resolvePeriod("custom", today, { from: "2026-10-01", to: "2026-10-31" })).toEqual({ from: "2026-10-01", to: "2026-11-01" });
    expect(resolvePeriod("custom", today, { from: "2026-10-01", to: "2026-09-01" })).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(resolvePeriod("custom", today, { from: "2024-01-01", to: "2026-10-31" })).toEqual({ from: "2024-01-01", to: "2025-01-01" });
  });
});

describe("dailyTableToCsv", () => {
  it("writes a header and one row per day", () => {
    const csv = dailyTableToCsv([{ date: "2026-10-01", created: 2, cancelled: 1, nightsSold: 3, nightsAvailable: 10, occupancy: 0.3, revenue: "150.00" }]);
    expect(csv.split("\r\n")).toEqual(["date,bookings_created,bookings_cancelled,room_nights_sold,room_nights_available,occupancy_pct,room_revenue", "2026-10-01,2,1,3,10,30.0,150.00", ""]);
  });
});
