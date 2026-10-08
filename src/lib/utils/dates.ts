/**
 * Date helpers for the booking engine.
 * Stay dates are calendar dates (no time component) and are represented as ISO strings "YYYY-MM-DD".
 * Check-out is end-exclusive: a stay 2026-11-10 → 2026-11-12 occupies the nights of the 10th and 11th.
 */

export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = isoToUtcDate(value);
  return !Number.isNaN(d.getTime()) && utcDateToIso(d) === value;
}

export function isoToUtcDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function utcDateToIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = isoToUtcDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return utcDateToIso(d);
}

export function diffNights(checkIn: IsoDate, checkOut: IsoDate): number {
  const a = isoToUtcDate(checkIn).getTime();
  const b = isoToUtcDate(checkOut).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Every night of the stay: [checkIn, checkOut) */
export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): IsoDate[] {
  const nights: IsoDate[] = [];
  let cursor = checkIn;
  while (cursor < checkOut) {
    nights.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return nights;
}

/** 0 = Sunday … 6 = Saturday (UTC calendar day). */
export function dayOfWeek(iso: IsoDate): number {
  return isoToUtcDate(iso).getUTCDay();
}

/** Today's calendar date in the hotel's timezone (Asia/Amman). */
export function todayIso(timeZone = "Asia/Amman", now: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Overlap of two end-exclusive ranges. */
export function rangesOverlap(aStart: IsoDate, aEnd: IsoDate, bStart: IsoDate, bEnd: IsoDate): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function dbDateToIso(date: Date): IsoDate {
  return utcDateToIso(date);
}
