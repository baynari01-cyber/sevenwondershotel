import "server-only";
import { prisma } from "@/lib/db";
import { computeReportMetrics, resolvePeriod, type ReportMetrics, type ReportPeriodKey, type ReportReservation } from "@/lib/reports/metrics";
import { addDays, dbDateToIso, isIsoDate, isoToUtcDate, todayIso, type IsoDate } from "@/lib/utils/dates";

export type ReportQuery = { period: ReportPeriodKey; from?: string; to?: string };

export type ReportResult = ReportMetrics & { period: ReportPeriodKey; today: IsoDate; currency: string };

/** Hotel-local calendar date on which a timestamp happened. */
function hotelDateOf(at: Date): IsoDate {
  return todayIso("Asia/Amman", at);
}

export async function getReport(query: ReportQuery): Promise<ReportResult> {
  const today = todayIso();
  const custom = { from: isIsoDate(query.from) ? query.from : undefined, to: isIsoDate(query.to) ? query.to : undefined };
  const { from, to } = resolvePeriod(query.period, today, custom);
  const fromDate = isoToUtcDate(from);
  const toDate = isoToUtcDate(to);
  // Creation timestamps are compared in the hotel timezone, so widen the UTC window by a day on each side and filter in JS.
  const createdWindow = { gte: isoToUtcDate(addDays(from, -1)), lt: isoToUtcDate(addDays(to, 1)) };

  const [reservations, activeRooms, blocks, roomTypes, settings] = await Promise.all([
    prisma.reservation.findMany({
      where: { OR: [{ checkIn: { lt: toDate }, checkOut: { gt: fromDate } }, { createdAt: createdWindow }] },
      select: { id: true, status: true, source: true, createdAt: true, checkIn: true, checkOut: true, rooms: { select: { roomTypeId: true, roomTotal: true } } },
    }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.inventoryBlock.findMany({ where: { room: { isActive: true }, startDate: { lt: toDate }, endDate: { gt: fromDate } }, select: { startDate: true, endDate: true } }),
    prisma.roomType.findMany({ select: { id: true, nameEn: true, nameAr: true }, orderBy: { sortOrder: "asc" } }),
    prisma.hotelSettings.findUnique({ where: { id: "default" }, select: { currency: true } }),
  ]);

  const rows: ReportReservation[] = reservations.map((r) => ({
    id: r.id,
    status: r.status,
    source: r.source,
    createdOn: hotelDateOf(r.createdAt),
    checkIn: dbDateToIso(r.checkIn),
    checkOut: dbDateToIso(r.checkOut),
    rooms: r.rooms.map((x) => ({ roomTypeId: x.roomTypeId, roomTotal: x.roomTotal.toString() })),
  }));

  const metrics = computeReportMetrics({
    from,
    to,
    reservations: rows,
    activeRooms,
    blocks: blocks.map((b) => ({ startDate: dbDateToIso(b.startDate), endDate: dbDateToIso(b.endDate) })),
    roomTypes,
  });

  return { ...metrics, period: query.period, today, currency: settings?.currency ?? "JOD" };
}
