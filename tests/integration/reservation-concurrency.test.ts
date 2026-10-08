/**
 * Integration tests against the real PostgreSQL database (DATABASE_URL from .env).
 * Run with: pnpm test:integration
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { addDays, todayIso } from "@/lib/utils/dates";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// The service module is server-only; import it through the mocked boundary.
let service: typeof import("@/lib/booking/service");

const guest = { firstName: "Concurrency", lastName: "Test", email: "concurrency@example.com", phone: "+962790000000", country: "JO" };
const createdIds: string[] = [];

beforeAll(async () => {
  service = await import("@/lib/booking/service");
});

afterAll(async () => {
  if (createdIds.length) {
    await prisma.reservation.deleteMany({ where: { id: { in: createdIds } } });
  }
  await prisma.guest.deleteMany({ where: { email: guest.email } });
  await prisma.$disconnect();
});

describe("createReservation against the database", () => {
  it("never oversells a category under concurrent bookings", async () => {
    const suite = await prisma.roomType.findUniqueOrThrow({ where: { code: "STE" }, include: { rooms: { where: { isActive: true } } } });
    const ratePlan = await prisma.ratePlan.findUniqueOrThrow({ where: { code: "ROOM_ONLY" } });
    // Pick far-future dates where the suites are free of seeded reservations.
    const checkIn = addDays(todayIso(), 200);
    const checkOut = addDays(checkIn, 1);
    const before = await service.searchAvailability({ checkIn, checkOut, adults: 2, children: 0, rooms: 1 });
    const available = before.roomTypes.find((r) => r.code === "STE")!.available;
    expect(available).toBe(suite.rooms.length);

    const attempts = available + 3;
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, () =>
        service.createReservation({
          checkIn,
          checkOut,
          rooms: [{ roomTypeId: suite.id, ratePlanId: ratePlan.id, adults: 2, children: 0 }],
          extras: [],
          guest,
          paymentMethod: "PAY_AT_PROPERTY",
          locale: "en",
        }),
      ),
    );
    const fulfilled = results.filter((r): r is PromiseFulfilledResult<{ id: string; reference: string }> => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    createdIds.push(...fulfilled.map((r) => r.value.id));

    expect(fulfilled).toHaveLength(available);
    expect(rejected).toHaveLength(3);
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason).toMatchObject({ code: "NOT_AVAILABLE" });
    }

    const after = await service.searchAvailability({ checkIn, checkOut, adults: 2, children: 0, rooms: 1 });
    expect(after.roomTypes.find((r) => r.code === "STE")!.available).toBe(0);

    // Every created reservation holds a distinct physical room.
    const rooms = await prisma.reservationRoom.findMany({ where: { reservationId: { in: createdIds } }, select: { roomId: true } });
    const distinct = new Set(rooms.map((r) => r.roomId));
    expect(distinct.size).toBe(available);
  });

  it("recomputes totals on the server and ignores client-supplied prices", async () => {
    const dbl = await prisma.roomType.findUniqueOrThrow({ where: { code: "DBL" } });
    const bb = await prisma.ratePlan.findUniqueOrThrow({ where: { code: "BB" } });
    const checkIn = addDays(todayIso(), 210);
    const checkOut = addDays(checkIn, 2);
    const { quote } = await service.quoteStay({ checkIn, checkOut, rooms: [{ roomTypeId: dbl.id, ratePlanId: bb.id, adults: 2, children: 0 }], extras: [], promotionCode: null });
    const created = await service.createReservation({
      checkIn,
      checkOut,
      rooms: [{ roomTypeId: dbl.id, ratePlanId: bb.id, adults: 2, children: 0 }],
      extras: [],
      guest,
      paymentMethod: "SIMULATED_CARD",
      locale: "en",
      // @ts-expect-error — a hostile client could send a price; it must be ignored.
      grandTotal: "1.00",
    });
    createdIds.push(created.id);
    const stored = await prisma.reservation.findUniqueOrThrow({ where: { id: created.id }, include: { payments: true } });
    expect(stored.grandTotal.toFixed(2)).toBe(quote.grandTotal);
    expect(stored.paymentStatus).toBe("SIMULATED_PAID");
    expect(stored.payments[0].amount.toFixed(2)).toBe(quote.grandTotal);
  });

  it("respects maintenance blocks and closed dates", async () => {
    const quad = await prisma.roomType.findUniqueOrThrow({ where: { code: "QUD" }, include: { rooms: { where: { isActive: true } } } });
    const checkIn = addDays(todayIso(), 220);
    const checkOut = addDays(checkIn, 1);
    const block = await prisma.inventoryBlock.create({ data: { roomId: quad.rooms[0].id, startDate: new Date(`${checkIn}T00:00:00Z`), endDate: new Date(`${checkOut}T00:00:00Z`), reason: "MAINTENANCE", note: "integration test" } });
    try {
      const search = await service.searchAvailability({ checkIn, checkOut, adults: 4, children: 0, rooms: 1 });
      expect(search.roomTypes.find((r) => r.code === "QUD")!.available).toBe(quad.rooms.length - 1);
    } finally {
      await prisma.inventoryBlock.delete({ where: { id: block.id } });
    }
    const override = await prisma.rateOverride.create({ data: { roomTypeId: quad.id, date: new Date(`${checkIn}T00:00:00Z`), closed: true } });
    try {
      const search = await service.searchAvailability({ checkIn, checkOut, adults: 4, children: 0, rooms: 1 });
      const row = search.roomTypes.find((r) => r.code === "QUD")!;
      expect(row.available).toBe(0);
      expect(row.closed).toBe(true);
    } finally {
      await prisma.rateOverride.delete({ where: { id: override.id } });
    }
  });
});
