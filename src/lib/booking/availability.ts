import { nightsBetween, rangesOverlap, type IsoDate } from "@/lib/utils/dates";

/**
 * Pure availability computation.
 * Available inventory for a night = eligible physical rooms
 *   − rooms held by active reservations that cover the night
 *   − rooms under a maintenance block that covers the night,
 * capped by any date-level inventory restriction (RateOverride.maxInventory) and zero on closed dates.
 * Check-out is end-exclusive, so a reservation holds nights [checkIn, checkOut).
 */

export type RoomInventory = { id: string; isActive: boolean };
export type Occupancy = { roomId: string | null; roomTypeId?: string; checkIn: IsoDate; checkOut: IsoDate };
export type Block = { roomId: string; startDate: IsoDate; endDate: IsoDate };
export type InventoryRestriction = { date: IsoDate; maxInventory: number | null; closed: boolean };

export type NightAvailability = { date: IsoDate; available: number; freeRoomIds: string[] };

export function availabilityForNight(args: {
  date: IsoDate;
  rooms: RoomInventory[];
  occupancies: Occupancy[];
  blocks: Block[];
  restrictions: InventoryRestriction[];
}): NightAvailability {
  const { date, rooms, occupancies, blocks, restrictions } = args;
  const restriction = restrictions.find((r) => r.date === date);
  if (restriction?.closed) return { date, available: 0, freeRoomIds: [] };

  const held = new Set<string>();
  let unassignedHolds = 0;
  for (const o of occupancies) {
    if (o.checkIn <= date && date < o.checkOut) {
      if (o.roomId) held.add(o.roomId);
      else unassignedHolds += 1;
    }
  }
  for (const b of blocks) {
    if (b.startDate <= date && date < b.endDate) held.add(b.roomId);
  }
  const free = rooms.filter((r) => r.isActive && !held.has(r.id)).map((r) => r.id);
  let available = Math.max(0, free.length - unassignedHolds);
  if (typeof restriction?.maxInventory === "number") {
    available = Math.min(available, Math.max(0, restriction.maxInventory));
  }
  return { date, available, freeRoomIds: free };
}

export function availabilityForStay(args: {
  checkIn: IsoDate;
  checkOut: IsoDate;
  rooms: RoomInventory[];
  occupancies: Occupancy[];
  blocks: Block[];
  restrictions: InventoryRestriction[];
}): { available: number; nights: NightAvailability[]; freeRoomIdsForWholeStay: string[] } {
  const nights = nightsBetween(args.checkIn, args.checkOut).map((date) => availabilityForNight({ ...args, date }));
  const perNightMin = nights.length ? Math.min(...nights.map((n) => n.available)) : 0;

  // Rooms that are free on every night of the stay (used for physical room auto-assignment).
  const freeRoomIdsForWholeStay = args.rooms
    .filter((r) => r.isActive)
    .filter((r) => nights.every((n) => n.freeRoomIds.includes(r.id)))
    .map((r) => r.id);

  return { available: Math.min(perNightMin, freeRoomIdsForWholeStay.length), nights, freeRoomIdsForWholeStay };
}

export function roomIsFree(
  roomId: string,
  checkIn: IsoDate,
  checkOut: IsoDate,
  occupancies: Occupancy[],
  blocks: Block[],
): boolean {
  for (const o of occupancies) {
    if (o.roomId === roomId && rangesOverlap(checkIn, checkOut, o.checkIn, o.checkOut)) return false;
  }
  for (const b of blocks) {
    if (b.roomId === roomId && rangesOverlap(checkIn, checkOut, b.startDate, b.endDate)) return false;
  }
  return true;
}
