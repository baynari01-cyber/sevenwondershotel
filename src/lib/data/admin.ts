import "server-only";
import { prisma } from "@/lib/db";
import type { BlockReason, BookingSource, ReservationStatus, Role } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { ACTIVE_STATUSES } from "@/lib/booking/service";
import { availabilityForNight } from "@/lib/booking/availability";
import { addDays, dbDateToIso, isoToUtcDate, nightsBetween, todayIso, type IsoDate } from "@/lib/utils/dates";

const d = (iso: IsoDate) => isoToUtcDate(iso);

export type OverviewStats = {
  today: IsoDate;
  arrivals: number;
  departures: number;
  inHouse: number;
  occupiedTonight: number;
  totalRooms: number;
  revenueMonth: string;
  bookingsMonth: number;
  adrMonth: string;
  pendingCount: number;
  unreadMessages: number;
  next7: Array<{ date: IsoDate; occupied: number; total: number }>;
};

export async function getOverviewStats(): Promise<OverviewStats> {
  const today = todayIso();
  const monthStart = `${today.slice(0, 7)}-01`;
  const next7 = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const activeWhere = { status: { in: ACTIVE_STATUSES } };

  const [arrivals, departures, inHouse, totalRooms, monthAgg, pendingCount, unreadMessages, nightsInRange, monthRes] = await Promise.all([
    prisma.reservation.count({ where: { checkIn: d(today), status: { in: ["CONFIRMED", "PENDING", "CHECKED_IN"] } } }),
    prisma.reservation.count({ where: { checkOut: d(today), status: { in: ["CHECKED_IN", "CHECKED_OUT"] } } }),
    prisma.reservation.count({ where: { status: "CHECKED_IN" } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.reservation.aggregate({ where: { createdAt: { gte: new Date(`${monthStart}T00:00:00Z`) }, status: { notIn: ["CANCELLED", "NO_SHOW"] } }, _sum: { roomSubtotal: true }, _count: true }),
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.reservationRoom.findMany({
      where: { reservation: { ...activeWhere, checkIn: { lt: d(addDays(today, 7)) }, checkOut: { gt: d(today) } } },
      select: { reservation: { select: { checkIn: true, checkOut: true } } },
    }),
    prisma.reservation.findMany({ where: { createdAt: { gte: new Date(`${monthStart}T00:00:00Z`) }, status: { notIn: ["CANCELLED", "NO_SHOW"] } }, select: { nights: true, rooms: { select: { id: true } } } }),
  ]);

  const perNight = next7.map((date) => ({
    date,
    occupied: nightsInRange.filter((r) => dbDateToIso(r.reservation.checkIn) <= date && date < dbDateToIso(r.reservation.checkOut)).length,
    total: totalRooms,
  }));
  const roomNightsMonth = monthRes.reduce((a, r) => a + r.nights * r.rooms.length, 0);
  const revenueMonth = monthAgg._sum.roomSubtotal ?? new Prisma.Decimal(0);

  return {
    today,
    arrivals,
    departures,
    inHouse,
    occupiedTonight: perNight[0]?.occupied ?? 0,
    totalRooms,
    revenueMonth: revenueMonth.toFixed(2),
    bookingsMonth: monthAgg._count,
    adrMonth: roomNightsMonth ? revenueMonth.div(roomNightsMonth).toFixed(2) : "0.00",
    pendingCount,
    unreadMessages,
    next7: perNight,
  };
}

export type ReservationRowDTO = {
  id: string;
  reference: string;
  status: ReservationStatus;
  source: BookingSource;
  guestName: string;
  guestEmail: string;
  guestCountry: string;
  checkIn: IsoDate;
  checkOut: IsoDate;
  nights: number;
  adults: number;
  children: number;
  rooms: Array<{ roomTypeNameEn: string; roomTypeNameAr: string; roomNumber: string | null }>;
  grandTotal: string;
  currency: string;
  paymentStatus: string;
  createdAt: Date;
};

export type ReservationFilters = {
  q?: string;
  status?: ReservationStatus | "ALL";
  source?: BookingSource | "ALL";
  arrivalFrom?: IsoDate;
  arrivalTo?: IsoDate;
  page?: number;
  pageSize?: number;
  sort?: "createdAt" | "checkIn";
};

function rowFrom(r: {
  id: string; reference: string; status: ReservationStatus; source: BookingSource; checkIn: Date; checkOut: Date; nights: number; adults: number; children: number; grandTotal: Prisma.Decimal; currency: string; paymentStatus: string; createdAt: Date;
  guest: { firstName: string; lastName: string; email: string; country: string };
  rooms: Array<{ roomType: { nameEn: string; nameAr: string }; room: { number: string } | null }>;
}): ReservationRowDTO {
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    source: r.source,
    guestName: `${r.guest.firstName} ${r.guest.lastName}`,
    guestEmail: r.guest.email,
    guestCountry: r.guest.country,
    checkIn: dbDateToIso(r.checkIn),
    checkOut: dbDateToIso(r.checkOut),
    nights: r.nights,
    adults: r.adults,
    children: r.children,
    rooms: r.rooms.map((rr) => ({ roomTypeNameEn: rr.roomType.nameEn, roomTypeNameAr: rr.roomType.nameAr, roomNumber: rr.room?.number ?? null })),
    grandTotal: r.grandTotal.toString(),
    currency: r.currency,
    paymentStatus: r.paymentStatus,
    createdAt: r.createdAt,
  };
}

const rowInclude = { guest: true, rooms: { include: { roomType: { select: { nameEn: true, nameAr: true } }, room: { select: { number: true } } } } } as const;

export async function listReservations(filters: ReservationFilters): Promise<{ rows: ReservationRowDTO[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));
  const where: Prisma.ReservationWhereInput = {};
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.source && filters.source !== "ALL") where.source = filters.source;
  if (filters.arrivalFrom) where.checkIn = { ...(where.checkIn as Prisma.DateTimeFilter | undefined), gte: d(filters.arrivalFrom) };
  if (filters.arrivalTo) where.checkIn = { ...(where.checkIn as Prisma.DateTimeFilter | undefined), lte: d(filters.arrivalTo) };
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { reference: { contains: q.toUpperCase() } },
      { guest: { firstName: { contains: q, mode: "insensitive" } } },
      { guest: { lastName: { contains: q, mode: "insensitive" } } },
      { guest: { email: { contains: q, mode: "insensitive" } } },
      { guest: { phone: { contains: q } } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({ where, include: rowInclude, orderBy: filters.sort === "checkIn" ? { checkIn: "asc" } : { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { rows: rows.map(rowFrom), total, page, pageSize };
}

export async function recentReservations(limit = 8): Promise<ReservationRowDTO[]> {
  const rows = await prisma.reservation.findMany({ include: rowInclude, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(rowFrom);
}

export async function arrivalsOn(date: IsoDate): Promise<ReservationRowDTO[]> {
  const rows = await prisma.reservation.findMany({ where: { checkIn: d(date), status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] } }, include: rowInclude, orderBy: { createdAt: "asc" } });
  return rows.map(rowFrom);
}

export async function departuresOn(date: IsoDate): Promise<ReservationRowDTO[]> {
  const rows = await prisma.reservation.findMany({ where: { checkOut: d(date), status: { in: ["CHECKED_IN", "CHECKED_OUT"] } }, include: rowInclude, orderBy: { createdAt: "asc" } });
  return rows.map(rowFrom);
}

export async function upcomingArrivals(limit = 8): Promise<ReservationRowDTO[]> {
  const today = todayIso();
  const rows = await prisma.reservation.findMany({ where: { checkIn: { gt: d(today) }, status: { in: ["PENDING", "CONFIRMED"] } }, include: rowInclude, orderBy: { checkIn: "asc" }, take: limit });
  return rows.map(rowFrom);
}

export type ActivityDTO = { id: string; actorName: string; action: string; summary: string; entityType: string; entityId: string | null; createdAt: Date; metadata: Record<string, unknown> | null };

export async function recentActivity(limit = 12): Promise<ActivityDTO[]> {
  const rows = await prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((a) => ({ id: a.id, actorName: a.actorName, action: a.action, summary: a.summary, entityType: a.entityType, entityId: a.entityId, createdAt: a.createdAt, metadata: (a.metadata as Record<string, unknown> | null) ?? null }));
}

export type ReservationDetailDTO = {
  id: string;
  reference: string;
  status: ReservationStatus;
  source: BookingSource;
  checkIn: IsoDate;
  checkOut: IsoDate;
  nights: number;
  adults: number;
  children: number;
  currency: string;
  roomSubtotal: string;
  extrasTotal: string;
  discountTotal: string;
  taxTotal: string;
  serviceChargeTotal: string;
  grandTotal: string;
  paidTotal: string;
  paymentStatus: string;
  paymentMethod: string;
  specialRequests: string | null;
  arrivalTime: string | null;
  locale: string;
  promotionCode: string | null;
  cancellationPolicyEn: string;
  cancellationPolicyAr: string;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { name: string } | null;
  guest: { id: string; firstName: string; lastName: string; email: string; phone: string; country: string; notes: string | null };
  rooms: Array<{ id: string; roomTypeId: string; roomTypeNameEn: string; roomTypeNameAr: string; roomId: string | null; roomNumber: string | null; ratePlanId: string; ratePlanNameEn: string; ratePlanNameAr: string; adults: number; children: number; roomTotal: string; nightly: Array<{ date: string; rate: string }>; candidateRooms: Array<{ id: string; number: string; floor: number }> }>;
  extras: Array<{ id: string; nameEn: string; nameAr: string; quantity: number; unitPrice: string; total: string }>;
  payments: Array<{ id: string; amount: string; method: string; status: string; reference: string | null; note: string | null; createdAt: Date }>;
  notes: Array<{ id: string; body: string; authorName: string | null; createdAt: Date }>;
  activity: ActivityDTO[];
};

export async function getReservationDetail(id: string): Promise<ReservationDetailDTO | null> {
  const r = await prisma.reservation.findFirst({
    where: { OR: [{ id }, { reference: id.toUpperCase() }] },
    include: {
      guest: true,
      createdBy: { select: { name: true } },
      rooms: { include: { roomType: { include: { rooms: { where: { isActive: true }, select: { id: true, number: true, floor: true }, orderBy: { number: "asc" } } } }, room: true, ratePlan: true } },
      extras: true,
      payments: { orderBy: { createdAt: "desc" } },
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!r) return null;
  const checkIn = dbDateToIso(r.checkIn);
  const checkOut = dbDateToIso(r.checkOut);

  // Rooms free for the whole stay (for re-assignment), excluding this reservation's own holds.
  const roomTypeIds = r.rooms.map((rr) => rr.roomTypeId);
  const [holds, blocks, activity] = await Promise.all([
    prisma.reservationRoom.findMany({
      where: { roomTypeId: { in: roomTypeIds }, reservationId: { not: r.id }, reservation: { status: { in: ACTIVE_STATUSES }, checkIn: { lt: r.checkOut }, checkOut: { gt: r.checkIn } } },
      select: { roomId: true },
    }),
    prisma.inventoryBlock.findMany({ where: { startDate: { lt: r.checkOut }, endDate: { gt: r.checkIn } }, select: { roomId: true } }),
    prisma.activityLog.findMany({ where: { entityType: "reservation", entityId: r.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const taken = new Set([...holds.map((h) => h.roomId).filter((x): x is string => Boolean(x)), ...blocks.map((b) => b.roomId)]);
  const paid = r.payments.filter((p) => p.status === "SIMULATED_PAID" || p.status === "PARTIALLY_PAID").reduce((a, p) => a.plus(p.amount), new Prisma.Decimal(0));

  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    source: r.source,
    checkIn,
    checkOut,
    nights: r.nights,
    adults: r.adults,
    children: r.children,
    currency: r.currency,
    roomSubtotal: r.roomSubtotal.toString(),
    extrasTotal: r.extrasTotal.toString(),
    discountTotal: r.discountTotal.toString(),
    taxTotal: r.taxTotal.toString(),
    serviceChargeTotal: r.serviceChargeTotal.toString(),
    grandTotal: r.grandTotal.toString(),
    paidTotal: paid.toFixed(2),
    paymentStatus: r.paymentStatus,
    paymentMethod: r.paymentMethod,
    specialRequests: r.specialRequests,
    arrivalTime: r.arrivalTime,
    locale: r.locale,
    promotionCode: r.promotionCode,
    cancellationPolicyEn: r.cancellationPolicyEn,
    cancellationPolicyAr: r.cancellationPolicyAr,
    cancelledAt: r.cancelledAt,
    cancellationReason: r.cancellationReason,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    createdBy: r.createdBy,
    guest: { id: r.guest.id, firstName: r.guest.firstName, lastName: r.guest.lastName, email: r.guest.email, phone: r.guest.phone, country: r.guest.country, notes: r.guest.notes },
    rooms: r.rooms.map((rr) => ({
      id: rr.id,
      roomTypeId: rr.roomTypeId,
      roomTypeNameEn: rr.roomType.nameEn,
      roomTypeNameAr: rr.roomType.nameAr,
      roomId: rr.roomId,
      roomNumber: rr.room?.number ?? null,
      ratePlanId: rr.ratePlanId,
      ratePlanNameEn: rr.ratePlan.nameEn,
      ratePlanNameAr: rr.ratePlan.nameAr,
      adults: rr.adults,
      children: rr.children,
      roomTotal: rr.roomTotal.toString(),
      nightly: Array.isArray(rr.nightlyRates) ? (rr.nightlyRates as Array<{ date: string; rate: string }>) : [],
      candidateRooms: rr.roomType.rooms.filter((room) => !taken.has(room.id) || room.id === rr.roomId),
    })),
    extras: r.extras.map((e) => ({ id: e.id, nameEn: e.nameEn, nameAr: e.nameAr, quantity: e.quantity, unitPrice: e.unitPrice.toString(), total: e.total.toString() })),
    payments: r.payments.map((p) => ({ id: p.id, amount: p.amount.toString(), method: p.method, status: p.status, reference: p.reference, note: p.note, createdAt: p.createdAt })),
    notes: r.notes.map((n) => ({ id: n.id, body: n.body, authorName: n.author?.name ?? null, createdAt: n.createdAt })),
    activity: activity.map((a) => ({ id: a.id, actorName: a.actorName, action: a.action, summary: a.summary, entityType: a.entityType, entityId: a.entityId, createdAt: a.createdAt, metadata: (a.metadata as Record<string, unknown> | null) ?? null })),
  };
}

export { nightsBetween };

// ---------------------------------------------------------------------------
// Occupancy calendar
// ---------------------------------------------------------------------------

export type CalendarReservationDTO = {
  id: string;
  reference: string;
  guestName: string;
  guestLastName: string;
  status: ReservationStatus;
  checkIn: IsoDate;
  checkOut: IsoDate;
  roomId: string | null;
  roomTypeId: string;
  reservationRoomId: string;
};

export type CalendarBlockDTO = { id: string; roomId: string; startDate: IsoDate; endDate: IsoDate; reason: BlockReason; note: string | null };

export type CalendarRoomTypeDTO = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  rooms: Array<{ id: string; number: string; floor: number }>;
  /** Sellable inventory per day of the window (respects blocks, holds and rate overrides). */
  availability: number[];
  closed: boolean[];
};

export type CalendarDTO = {
  start: IsoDate;
  days: number;
  dates: IsoDate[];
  today: IsoDate;
  weekendDays: number[];
  roomTypes: CalendarRoomTypeDTO[];
  reservations: CalendarReservationDTO[];
  blocks: CalendarBlockDTO[];
};

export async function getCalendarData(start: IsoDate, days: number): Promise<CalendarDTO> {
  const end = addDays(start, days);
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i));
  const [roomTypes, holds, blocks, overrides, settings] = await Promise.all([
    prisma.roomType.findMany({
      where: { isActive: true },
      select: { id: true, code: true, nameEn: true, nameAr: true, rooms: { where: { isActive: true }, select: { id: true, number: true, floor: true }, orderBy: { number: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.reservationRoom.findMany({
      where: { reservation: { status: { in: ACTIVE_STATUSES }, checkIn: { lt: d(end) }, checkOut: { gt: d(start) } } },
      select: { id: true, roomId: true, roomTypeId: true, reservation: { select: { id: true, reference: true, status: true, checkIn: true, checkOut: true, guest: { select: { firstName: true, lastName: true } } } } },
      orderBy: { reservation: { checkIn: "asc" } },
    }),
    prisma.inventoryBlock.findMany({ where: { startDate: { lt: d(end) }, endDate: { gt: d(start) }, room: { isActive: true } }, orderBy: { startDate: "asc" } }),
    prisma.rateOverride.findMany({ where: { date: { gte: d(start), lt: d(end) } }, select: { roomTypeId: true, date: true, closed: true, maxInventory: true } }),
    prisma.hotelSettings.findUnique({ where: { id: "default" }, select: { weekendDays: true } }),
  ]);

  const reservations: CalendarReservationDTO[] = holds.map((h) => ({
    id: h.reservation.id,
    reference: h.reservation.reference,
    guestName: `${h.reservation.guest.firstName} ${h.reservation.guest.lastName}`,
    guestLastName: h.reservation.guest.lastName,
    status: h.reservation.status,
    checkIn: dbDateToIso(h.reservation.checkIn),
    checkOut: dbDateToIso(h.reservation.checkOut),
    roomId: h.roomId,
    roomTypeId: h.roomTypeId,
    reservationRoomId: h.id,
  }));
  const blockDtos: CalendarBlockDTO[] = blocks.map((b) => ({ id: b.id, roomId: b.roomId, startDate: dbDateToIso(b.startDate), endDate: dbDateToIso(b.endDate), reason: b.reason, note: b.note }));

  const types: CalendarRoomTypeDTO[] = roomTypes.map((rt) => {
    const roomIds = new Set(rt.rooms.map((r) => r.id));
    const occupancies = reservations.filter((r) => r.roomTypeId === rt.id).map((r) => ({ roomId: r.roomId, checkIn: r.checkIn, checkOut: r.checkOut }));
    const typeBlocks = blockDtos.filter((b) => roomIds.has(b.roomId)).map((b) => ({ roomId: b.roomId, startDate: b.startDate, endDate: b.endDate }));
    const restrictions = overrides.filter((o) => o.roomTypeId === rt.id).map((o) => ({ date: dbDateToIso(o.date), maxInventory: o.maxInventory, closed: o.closed }));
    const rooms = rt.rooms.map((r) => ({ id: r.id, isActive: true }));
    const nights = dates.map((date) => availabilityForNight({ date, rooms, occupancies, blocks: typeBlocks, restrictions }));
    return {
      id: rt.id,
      code: rt.code,
      nameEn: rt.nameEn,
      nameAr: rt.nameAr,
      rooms: rt.rooms,
      availability: nights.map((n) => n.available),
      closed: dates.map((date) => restrictions.some((x) => x.date === date && x.closed)),
    };
  });

  return { start, days, dates, today: todayIso(), weekendDays: settings?.weekendDays ?? [5, 6], roomTypes: types, reservations, blocks: blockDtos };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserRowDTO = { id: string; name: string; email: string; role: Role; isActive: boolean; lastLoginAt: Date | null; createdAt: Date };

export async function listUsers(): Promise<UserRowDTO[]> {
  const rows = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }, orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }] });
  return rows;
}
