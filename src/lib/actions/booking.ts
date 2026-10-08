"use server";

import { getLocale } from "next-intl/server";
import { BookingError, createReservation, quoteStay, searchAvailability, type AvailabilitySearch, type QuoteResult } from "@/lib/booking/service";
import { createReservationSchema, quoteSchema, searchSchema } from "@/lib/booking/schemas";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; details?: Record<string, unknown> };

function fail(e: unknown): ActionResult<never> {
  if (e instanceof BookingError) return { ok: false, error: e.code, details: e.details };
  console.error("[booking action]", e);
  return { ok: false, error: "GENERIC" };
}

export async function searchAvailabilityAction(raw: unknown): Promise<ActionResult<AvailabilitySearch>> {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "INVALID_DATES" };
  try {
    return { ok: true, data: await searchAvailability(parsed.data) };
  } catch (e) {
    return fail(e);
  }
}

export async function quoteAction(raw: unknown): Promise<ActionResult<QuoteResult>> {
  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "INVALID_DATES" };
  try {
    const { quote } = await quoteStay({ ...parsed.data, promotionCode: parsed.data.promotionCode ?? null });
    return { ok: true, data: quote };
  } catch (e) {
    return fail(e);
  }
}

export async function createReservationAction(raw: unknown): Promise<ActionResult<{ reference: string }>> {
  const parsed = createReservationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "VALIDATION", details: { issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } };
  const locale = await getLocale();
  try {
    const { guest, paymentMethod, ...rest } = parsed.data;
    const created = await createReservation({
      ...rest,
      promotionCode: rest.promotionCode ?? null,
      guest: { ...guest, arrivalTime: guest.arrivalTime || null, specialRequests: guest.specialRequests || null },
      paymentMethod,
      locale,
      source: "WEBSITE",
      status: "CONFIRMED",
    });
    return { ok: true, data: { reference: created.reference } };
  } catch (e) {
    return fail(e);
  }
}
