import Decimal from "decimal.js";
import { addDays, diffNights, nightsBetween, type IsoDate } from "@/lib/utils/dates";

/**
 * Pure, Decimal-safe aggregation for the reports module.
 * Periods are end-exclusive date ranges [from, to): "to" is the morning after the last night.
 * Revenue is ReservationRoom.roomTotal prorated by the nights that fall inside the period,
 * so a stay straddling the boundary contributes only its in-period nights.
 */

export type ReportStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";

export type ReportReservation = {
  id: string;
  status: ReportStatus;
  source: string;
  /** Calendar date (hotel timezone) on which the booking was created. */
  createdOn: IsoDate;
  checkIn: IsoDate;
  checkOut: IsoDate;
  rooms: Array<{ roomTypeId: string; roomTotal: string }>;
};

export type ReportBlock = { startDate: IsoDate; endDate: IsoDate };

export type ReportInput = {
  from: IsoDate;
  to: IsoDate;
  reservations: ReportReservation[];
  /** Number of physical rooms that are active (sellable) in the hotel. */
  activeRooms: number;
  /** Maintenance blocks on active rooms. */
  blocks: ReportBlock[];
  roomTypes: Array<{ id: string; nameEn: string; nameAr: string }>;
};

export type DailyRow = {
  date: IsoDate;
  created: number;
  cancelled: number;
  nightsSold: number;
  nightsAvailable: number;
  occupancy: number;
  revenue: string;
};

export type BreakdownRow = { key: string; count: number; revenue: string; share: number };

export type ReportMetrics = {
  from: IsoDate;
  to: IsoDate;
  nightsInPeriod: number;
  revenue: string;
  nightsSold: number;
  nightsAvailable: number;
  occupancy: number;
  adr: string;
  revpar: string;
  bookingsCreated: number;
  bookingsCancelled: number;
  cancellationRate: number;
  averageStay: number;
  staysInPeriod: number;
  bySource: BreakdownRow[];
  byRoomType: Array<BreakdownRow & { nameEn: string; nameAr: string }>;
  daily: DailyRow[];
};

const EXCLUDED: ReportStatus[] = ["CANCELLED", "NO_SHOW"];

export function countsTowardRevenue(status: ReportStatus): boolean {
  return !EXCLUDED.includes(status);
}

/** Number of nights of [aStart, aEnd) that fall inside [bStart, bEnd). */
export function overlapNights(aStart: IsoDate, aEnd: IsoDate, bStart: IsoDate, bEnd: IsoDate): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  return end > start ? diffNights(start, end) : 0;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function computeReportMetrics(input: ReportInput): ReportMetrics {
  const { from, to } = input;
  const dates = nightsBetween(from, to);
  const nightsInPeriod = dates.length;
  const dateIndex = new Map(dates.map((d, i) => [d, i] as const));

  const dailyCreated = new Array<number>(nightsInPeriod).fill(0);
  const dailyCancelled = new Array<number>(nightsInPeriod).fill(0);
  const dailySold = new Array<number>(nightsInPeriod).fill(0);
  const dailyBlocked = new Array<number>(nightsInPeriod).fill(0);
  const dailyRevenue = dates.map(() => new Decimal(0));

  let revenue = new Decimal(0);
  let nightsSold = 0;
  let bookingsCreated = 0;
  let bookingsCancelled = 0;
  let stayNights = 0;
  let staysInPeriod = 0;

  const bySource = new Map<string, { count: number; revenue: Decimal }>();
  const byType = new Map<string, { count: number; revenue: Decimal }>();

  for (const r of input.reservations) {
    const createdIdx = dateIndex.get(r.createdOn);
    if (createdIdx !== undefined) {
      bookingsCreated += 1;
      dailyCreated[createdIdx] += 1;
      if (r.status === "CANCELLED") {
        bookingsCancelled += 1;
        dailyCancelled[createdIdx] += 1;
      }
    }

    if (!countsTowardRevenue(r.status)) continue;
    const totalNights = diffNights(r.checkIn, r.checkOut);
    if (totalNights <= 0) continue;
    const inPeriod = overlapNights(r.checkIn, r.checkOut, from, to);
    if (inPeriod <= 0) continue;

    staysInPeriod += 1;
    stayNights += totalNights;
    let reservationRevenue = new Decimal(0);

    for (const room of r.rooms) {
      const perNight = new Decimal(room.roomTotal).div(totalNights);
      const roomRevenue = perNight.mul(inPeriod);
      reservationRevenue = reservationRevenue.plus(roomRevenue);
      nightsSold += inPeriod;

      const typeAgg = byType.get(room.roomTypeId) ?? { count: 0, revenue: new Decimal(0) };
      typeAgg.count += inPeriod;
      typeAgg.revenue = typeAgg.revenue.plus(roomRevenue);
      byType.set(room.roomTypeId, typeAgg);

      for (const night of nightsBetween(r.checkIn, r.checkOut)) {
        const idx = dateIndex.get(night);
        if (idx === undefined) continue;
        dailySold[idx] += 1;
        dailyRevenue[idx] = dailyRevenue[idx].plus(perNight);
      }
    }

    revenue = revenue.plus(reservationRevenue);
    const sourceAgg = bySource.get(r.source) ?? { count: 0, revenue: new Decimal(0) };
    sourceAgg.count += 1;
    sourceAgg.revenue = sourceAgg.revenue.plus(reservationRevenue);
    bySource.set(r.source, sourceAgg);
  }

  for (const b of input.blocks) {
    for (const night of nightsBetween(b.startDate, b.endDate)) {
      const idx = dateIndex.get(night);
      if (idx !== undefined) dailyBlocked[idx] += 1;
    }
  }

  const dailyAvailable = dailyBlocked.map((blocked) => Math.max(0, input.activeRooms - blocked));
  const nightsAvailable = dailyAvailable.reduce((a, n) => a + n, 0);

  const daily: DailyRow[] = dates.map((date, i) => ({
    date,
    created: dailyCreated[i],
    cancelled: dailyCancelled[i],
    nightsSold: dailySold[i],
    nightsAvailable: dailyAvailable[i],
    occupancy: ratio(dailySold[i], dailyAvailable[i]),
    revenue: dailyRevenue[i].toFixed(2),
  }));

  const toRows = (map: Map<string, { count: number; revenue: Decimal }>): BreakdownRow[] =>
    Array.from(map.entries())
      .map(([key, v]) => ({ key, count: v.count, revenue: v.revenue.toFixed(2), share: revenue.gt(0) ? v.revenue.div(revenue).toNumber() : 0 }))
      .sort((a, b) => Number(b.revenue) - Number(a.revenue) || b.count - a.count || a.key.localeCompare(b.key));

  const byRoomType = toRows(byType).map((row) => {
    const type = input.roomTypes.find((t) => t.id === row.key);
    return { ...row, nameEn: type?.nameEn ?? row.key, nameAr: type?.nameAr ?? row.key };
  });

  return {
    from,
    to,
    nightsInPeriod,
    revenue: revenue.toFixed(2),
    nightsSold,
    nightsAvailable,
    occupancy: ratio(nightsSold, nightsAvailable),
    adr: nightsSold > 0 ? revenue.div(nightsSold).toFixed(2) : "0.00",
    revpar: nightsAvailable > 0 ? revenue.div(nightsAvailable).toFixed(2) : "0.00",
    bookingsCreated,
    bookingsCancelled,
    cancellationRate: ratio(bookingsCancelled, bookingsCreated),
    averageStay: staysInPeriod > 0 ? stayNights / staysInPeriod : 0,
    staysInPeriod,
    bySource: toRows(bySource),
    byRoomType,
    daily,
  };
}

export type ReportPeriodKey = "last30" | "last90" | "thisMonth" | "next30" | "custom";

export const REPORT_PERIODS: ReportPeriodKey[] = ["last30", "last90", "thisMonth", "next30", "custom"];

/** Resolves a period key (plus optional custom bounds, inclusive) to an end-exclusive range. */
export function resolvePeriod(key: ReportPeriodKey, today: IsoDate, custom?: { from?: IsoDate; to?: IsoDate }): { from: IsoDate; to: IsoDate } {
  switch (key) {
    case "last90":
      return { from: addDays(today, -89), to: addDays(today, 1) };
    case "thisMonth": {
      const monthStart = `${today.slice(0, 7)}-01`;
      const [y, m] = monthStart.split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      return { from: monthStart, to: next };
    }
    case "next30":
      return { from: today, to: addDays(today, 30) };
    case "custom": {
      const from = custom?.from ?? addDays(today, -29);
      const toInclusive = custom?.to && custom.to >= from ? custom.to : addDays(from, 29);
      // Cap custom ranges at one year to keep the daily table bounded.
      const capped = diffNights(from, toInclusive) > 365 ? addDays(from, 365) : toInclusive;
      return { from, to: addDays(capped, 1) };
    }
    case "last30":
    default:
      return { from: addDays(today, -29), to: addDays(today, 1) };
  }
}

/** Serialises the daily table as RFC 4180 CSV. */
export function dailyTableToCsv(daily: DailyRow[]): string {
  const header = ["date", "bookings_created", "bookings_cancelled", "room_nights_sold", "room_nights_available", "occupancy_pct", "room_revenue"];
  const lines = daily.map((d) => [d.date, d.created, d.cancelled, d.nightsSold, d.nightsAvailable, (d.occupancy * 100).toFixed(1), d.revenue].join(","));
  return [header.join(","), ...lines].join("\r\n") + "\r\n";
}
