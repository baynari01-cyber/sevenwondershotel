import { describe, expect, it } from "vitest";
import { availabilityForNight, availabilityForStay, roomIsFree } from "@/lib/booking/availability";

const rooms = [
  { id: "101", isActive: true },
  { id: "102", isActive: true },
  { id: "103", isActive: true },
  { id: "104", isActive: false },
];

describe("availability", () => {
  it("counts only active rooms", () => {
    const n = availabilityForNight({ date: "2026-11-10", rooms, occupancies: [], blocks: [], restrictions: [] });
    expect(n.available).toBe(3);
  });

  it("subtracts reservations covering the night with end-exclusive checkout", () => {
    const occupancies = [{ roomId: "101", checkIn: "2026-11-08", checkOut: "2026-11-10" }];
    expect(availabilityForNight({ date: "2026-11-09", rooms, occupancies, blocks: [], restrictions: [] }).available).toBe(2);
    expect(availabilityForNight({ date: "2026-11-10", rooms, occupancies, blocks: [], restrictions: [] }).available).toBe(3);
  });

  it("subtracts maintenance blocks", () => {
    const blocks = [{ roomId: "102", startDate: "2026-11-10", endDate: "2026-11-12" }];
    expect(availabilityForNight({ date: "2026-11-11", rooms, occupancies: [], blocks, restrictions: [] }).available).toBe(2);
  });

  it("does not double count a room that is both reserved and blocked", () => {
    const occupancies = [{ roomId: "101", checkIn: "2026-11-10", checkOut: "2026-11-11" }];
    const blocks = [{ roomId: "101", startDate: "2026-11-10", endDate: "2026-11-11" }];
    expect(availabilityForNight({ date: "2026-11-10", rooms, occupancies, blocks, restrictions: [] }).available).toBe(2);
  });

  it("counts unassigned holds against inventory", () => {
    const occupancies = [{ roomId: null, checkIn: "2026-11-10", checkOut: "2026-11-11" }];
    expect(availabilityForNight({ date: "2026-11-10", rooms, occupancies, blocks: [], restrictions: [] }).available).toBe(2);
  });

  it("honours inventory restrictions and closed dates", () => {
    expect(
      availabilityForNight({ date: "2026-11-10", rooms, occupancies: [], blocks: [], restrictions: [{ date: "2026-11-10", maxInventory: 1, closed: false }] }).available,
    ).toBe(1);
    expect(
      availabilityForNight({ date: "2026-11-10", rooms, occupancies: [], blocks: [], restrictions: [{ date: "2026-11-10", maxInventory: null, closed: true }] }).available,
    ).toBe(0);
  });

  it("stay availability is the minimum across nights and only rooms free the whole stay", () => {
    const occupancies = [
      { roomId: "101", checkIn: "2026-11-10", checkOut: "2026-11-11" },
      { roomId: "102", checkIn: "2026-11-11", checkOut: "2026-11-12" },
    ];
    const stay = availabilityForStay({ checkIn: "2026-11-10", checkOut: "2026-11-12", rooms, occupancies, blocks: [], restrictions: [] });
    expect(stay.freeRoomIdsForWholeStay).toEqual(["103"]);
    expect(stay.available).toBe(1);
  });

  it("roomIsFree detects overlaps", () => {
    const occ = [{ roomId: "101", checkIn: "2026-11-10", checkOut: "2026-11-12" }];
    expect(roomIsFree("101", "2026-11-12", "2026-11-14", occ, [])).toBe(true);
    expect(roomIsFree("101", "2026-11-11", "2026-11-13", occ, [])).toBe(false);
  });
});
