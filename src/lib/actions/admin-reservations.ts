"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { guarded, logActivity, parseOrThrow, type AdminResult } from "@/lib/admin/action";
import { ACTIVE_STATUSES, BookingError, createReservation, quoteStay } from "@/lib/booking/service";
import { availabilityForStay } from "@/lib/booking/availability";
import { createReservationSchema, quoteSchema } from "@/lib/booking/schemas";
import { dbDateToIso, isoToUtcDate } from "@/lib/utils/dates";

const idSchema = z.string().min(1).max(64);

const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["PENDING", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT", "CONFIRMED"],
  CHECKED_OUT: ["CHECKED_IN"],
  CANCELLED: ["CONFIRMED", "PENDING"],
  NO_SHOW: ["CONFIRMED"],
};

function revalidate(id?: string) {
  revalidatePath("/[locale]/admin", "layout");
  if (id) revalidatePath(`/[locale]/admin/reservations/${id}`, "page");
}

export async function updateReservationStatusAction(raw: unknown): Promise<AdminResult<{ status: ReservationStatus }>> {
  return guarded("reservations.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema, status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]), reason: z.string().trim().max(500).optional() }).safeParse(raw));
    const result = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUniqueOrThrow({ where: { id: input.id }, include: { rooms: true } });
      if (!ALLOWED_TRANSITIONS[r.status].includes(input.status)) throw new BookingError("INVALID_DATES", { reason: "transition", from: r.status, to: input.status });

      // Re-activating a cancelled/no-show reservation must re-check inventory and re-assign rooms.
      if (!ACTIVE_STATUSES.includes(r.status) && ACTIVE_STATUSES.includes(input.status)) {
        for (const rr of r.rooms) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rr.roomTypeId}))`;
          const rooms = await tx.room.findMany({ where: { roomTypeId: rr.roomTypeId, isActive: true }, select: { id: true, isActive: true } });
          const holds = await tx.reservationRoom.findMany({ where: { roomTypeId: rr.roomTypeId, reservationId: { not: r.id }, reservation: { status: { in: ACTIVE_STATUSES }, checkIn: { lt: r.checkOut }, checkOut: { gt: r.checkIn } } }, select: { roomId: true, reservation: { select: { checkIn: true, checkOut: true } } } });
          const blocks = await tx.inventoryBlock.findMany({ where: { room: { roomTypeId: rr.roomTypeId }, startDate: { lt: r.checkOut }, endDate: { gt: r.checkIn } } });
          const avail = availabilityForStay({
            checkIn: dbDateToIso(r.checkIn),
            checkOut: dbDateToIso(r.checkOut),
            rooms,
            occupancies: holds.map((h) => ({ roomId: h.roomId, checkIn: dbDateToIso(h.reservation.checkIn), checkOut: dbDateToIso(h.reservation.checkOut) })),
            blocks: blocks.map((b) => ({ roomId: b.roomId, startDate: dbDateToIso(b.startDate), endDate: dbDateToIso(b.endDate) })),
            restrictions: [],
          });
          const roomId = avail.freeRoomIdsForWholeStay[0];
          if (!roomId) throw new BookingError("NOT_AVAILABLE", { roomTypeId: rr.roomTypeId });
          await tx.reservationRoom.update({ where: { id: rr.id }, data: { roomId } });
        }
      }

      const releasing = input.status === "CANCELLED" || input.status === "NO_SHOW";
      const updated = await tx.reservation.update({
        where: { id: r.id },
        data: {
          status: input.status,
          cancelledAt: input.status === "CANCELLED" ? new Date() : releasing ? r.cancelledAt : null,
          cancellationReason: input.status === "CANCELLED" ? input.reason || null : r.cancellationReason,
          rooms: releasing ? { updateMany: { where: {}, data: { roomId: null } } } : undefined,
        },
      });
      await logActivity(user, {
        action: input.status === "CANCELLED" ? "reservation_cancel" : "reservation_status",
        entityType: "reservation",
        entityId: r.id,
        summary: `${r.reference}: ${r.status} → ${input.status}${input.reason ? ` (${input.reason})` : ""}`,
        metadata: { ref: r.reference, status: input.status },
      }, tx);
      return updated;
    });
    revalidate(input.id);
    return { status: result.status };
  });
}

export async function assignRoomAction(raw: unknown): Promise<AdminResult<{ roomNumber: string }>> {
  return guarded("reservations.manage", async (user) => {
    const input = parseOrThrow(z.object({ reservationRoomId: idSchema, roomId: idSchema }).safeParse(raw));
    const number = await prisma.$transaction(async (tx) => {
      const rr = await tx.reservationRoom.findUniqueOrThrow({ where: { id: input.reservationRoomId }, include: { reservation: true } });
      const room = await tx.room.findUniqueOrThrow({ where: { id: input.roomId } });
      if (room.roomTypeId !== rr.roomTypeId || !room.isActive) throw new BookingError("NOT_AVAILABLE", { reason: "wrong type" });
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${rr.roomTypeId}))`;
      const clash = await tx.reservationRoom.findFirst({
        where: { roomId: room.id, id: { not: rr.id }, reservation: { status: { in: ACTIVE_STATUSES }, checkIn: { lt: rr.reservation.checkOut }, checkOut: { gt: rr.reservation.checkIn } } },
      });
      const blocked = await tx.inventoryBlock.findFirst({ where: { roomId: room.id, startDate: { lt: rr.reservation.checkOut }, endDate: { gt: rr.reservation.checkIn } } });
      if (clash || blocked) throw new BookingError("NOT_AVAILABLE", { reason: "occupied" });
      await tx.reservationRoom.update({ where: { id: rr.id }, data: { roomId: room.id } });
      await logActivity(user, { action: "reservation_assign", entityType: "reservation", entityId: rr.reservationId, summary: `${rr.reservation.reference}: assigned room ${room.number}`, metadata: { ref: rr.reservation.reference, room: room.number } }, tx);
      return room.number;
    });
    revalidate();
    return { roomNumber: number };
  });
}

export async function addReservationNoteAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return guarded("reservations.manage", async (user) => {
    const input = parseOrThrow(z.object({ reservationId: idSchema, body: z.string().trim().min(1).max(2000) }).safeParse(raw));
    const r = await prisma.reservation.findUniqueOrThrow({ where: { id: input.reservationId }, select: { reference: true } });
    const note = await prisma.reservationNote.create({ data: { reservationId: input.reservationId, authorId: user.id, body: input.body } });
    await logActivity(user, { action: "reservation_note", entityType: "reservation", entityId: input.reservationId, summary: `${r.reference}: note added`, metadata: { ref: r.reference } });
    revalidate(input.reservationId);
    return { id: note.id };
  });
}

export async function recordPaymentAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return guarded("reservations.manage", async (user) => {
    const input = parseOrThrow(
      z.object({
        reservationId: idSchema,
        amount: z.coerce.number().positive().max(100000),
        method: z.enum(["PAY_AT_PROPERTY", "SIMULATED_CARD", "BANK_TRANSFER", "CASH"]),
        note: z.string().trim().max(300).optional(),
      }).safeParse(raw),
    );
    const id = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUniqueOrThrow({ where: { id: input.reservationId }, include: { payments: true } });
      const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
      const payment = await tx.payment.create({ data: { reservationId: r.id, amount, method: input.method, status: "SIMULATED_PAID", note: input.note || "Recorded at the front desk (demo)", reference: `DEMO-${r.reference}-${r.payments.length + 1}` } });
      const paid = r.payments.filter((p) => p.status === "SIMULATED_PAID").reduce((a, p) => a.plus(p.amount), new Prisma.Decimal(0)).plus(amount);
      await tx.reservation.update({ where: { id: r.id }, data: { paymentStatus: paid.gte(r.grandTotal) ? "SIMULATED_PAID" : "PARTIALLY_PAID", paymentMethod: input.method } });
      await logActivity(user, { action: "reservation_payment", entityType: "reservation", entityId: r.id, summary: `${r.reference}: payment ${amount.toFixed(2)} ${r.currency} (${input.method})`, metadata: { ref: r.reference, amount: amount.toFixed(2) } }, tx);
      return payment.id;
    });
    revalidate(input.reservationId);
    return { id };
  });
}

/** Re-prices and re-checks availability on the server, then replaces the stay (dates, rooms, extras). */
export async function modifyReservationAction(raw: unknown): Promise<AdminResult<{ grandTotal: string }>> {
  return guarded("reservations.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).and(quoteSchema).safeParse(raw));
    const grandTotal = await prisma.$transaction(async (tx) => {
      const r = await tx.reservation.findUniqueOrThrow({ where: { id: input.id }, include: { rooms: true } });
      if (!ACTIVE_STATUSES.includes(r.status)) throw new BookingError("INVALID_DATES", { reason: "inactive" });
      for (const typeId of Array.from(new Set(input.rooms.map((x) => x.roomTypeId))).sort()) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${typeId}))`;
      }
      const { quote } = await quoteStay({ ...input, promotionCode: input.promotionCode ?? null }, tx, { allowPast: true });
      const checkIn = isoToUtcDate(input.checkIn);
      const checkOut = isoToUtcDate(input.checkOut);
      const assignments: string[] = [];
      const taken = new Set<string>();
      for (const sel of input.rooms) {
        const rooms = await tx.room.findMany({ where: { roomTypeId: sel.roomTypeId, isActive: true }, select: { id: true, isActive: true } });
        const holds = await tx.reservationRoom.findMany({ where: { roomTypeId: sel.roomTypeId, reservationId: { not: r.id }, reservation: { status: { in: ACTIVE_STATUSES }, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } } }, select: { roomId: true, reservation: { select: { checkIn: true, checkOut: true } } } });
        const blocks = await tx.inventoryBlock.findMany({ where: { room: { roomTypeId: sel.roomTypeId }, startDate: { lt: checkOut }, endDate: { gt: checkIn } } });
        const overrides = await tx.rateOverride.findMany({ where: { roomTypeId: sel.roomTypeId, date: { gte: checkIn, lt: checkOut } } });
        const avail = availabilityForStay({
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          rooms,
          occupancies: holds.map((h) => ({ roomId: h.roomId, checkIn: dbDateToIso(h.reservation.checkIn), checkOut: dbDateToIso(h.reservation.checkOut) })),
          blocks: blocks.map((b) => ({ roomId: b.roomId, startDate: dbDateToIso(b.startDate), endDate: dbDateToIso(b.endDate) })),
          restrictions: overrides.map((o) => ({ date: dbDateToIso(o.date), maxInventory: o.maxInventory, closed: o.closed })),
        });
        const existing = r.rooms.find((x) => x.roomTypeId === sel.roomTypeId && x.roomId && avail.freeRoomIdsForWholeStay.includes(x.roomId) && !taken.has(x.roomId));
        const roomId = existing?.roomId ?? avail.freeRoomIdsForWholeStay.find((id) => !taken.has(id));
        if (!roomId || avail.available - Array.from(taken).filter((id) => rooms.some((x) => x.id === id)).length < 1) throw new BookingError("NOT_AVAILABLE", { roomTypeId: sel.roomTypeId });
        taken.add(roomId);
        assignments.push(roomId);
      }
      await tx.reservationRoom.deleteMany({ where: { reservationId: r.id } });
      await tx.reservationExtra.deleteMany({ where: { reservationId: r.id } });
      await tx.reservation.update({
        where: { id: r.id },
        data: {
          checkIn,
          checkOut,
          nights: quote.nights,
          adults: input.rooms.reduce((a, x) => a + x.adults, 0),
          children: input.rooms.reduce((a, x) => a + x.children, 0),
          roomSubtotal: quote.roomSubtotal,
          extrasTotal: quote.extrasTotal,
          discountTotal: quote.discountTotal,
          taxTotal: quote.taxTotal,
          serviceChargeTotal: quote.serviceChargeTotal,
          grandTotal: quote.grandTotal,
          promotionCode: quote.promotionCode,
          cancellationPolicyEn: quote.roomDetails.map((x) => x.cancellationPolicyEn).filter((v, i, a) => a.indexOf(v) === i).join(" "),
          cancellationPolicyAr: quote.roomDetails.map((x) => x.cancellationPolicyAr).filter((v, i, a) => a.indexOf(v) === i).join(" "),
          rooms: { create: input.rooms.map((sel, i) => ({ roomTypeId: sel.roomTypeId, roomId: assignments[i], ratePlanId: sel.ratePlanId, adults: sel.adults, children: sel.children, nightlyRates: quote.rooms[i].nightly, roomTotal: quote.rooms[i].roomTotal })) },
          extras: { create: quote.extras.map((e) => { const dd = quote.extraDetails.find((x) => x.extraId === e.extraId)!; return { extraId: e.extraId, nameEn: dd.nameEn, nameAr: dd.nameAr, quantity: e.quantity, unitPrice: e.unitPrice, total: e.total }; }) },
        },
      });
      await logActivity(user, { action: "reservation_modify", entityType: "reservation", entityId: r.id, summary: `${r.reference}: stay modified → ${input.checkIn} – ${input.checkOut}, ${quote.grandTotal} ${r.currency}`, metadata: { ref: r.reference } }, tx);
      return quote.grandTotal;
    });
    revalidate(input.id);
    return { grandTotal };
  });
}

export async function createManualReservationAction(raw: unknown): Promise<AdminResult<{ id: string; reference: string }>> {
  return guarded("reservations.manage", async (user) => {
    const schema = createReservationSchema.omit({ acceptTerms: true, paymentMethod: true }).extend({
      source: z.enum(["WALK_IN", "PHONE", "EMAIL", "OTA", "TRAVEL_AGENT", "ADMIN"]),
      status: z.enum(["PENDING", "CONFIRMED"]),
      paymentMethod: z.enum(["PAY_AT_PROPERTY", "SIMULATED_CARD", "BANK_TRANSFER", "CASH"]),
    });
    const input = parseOrThrow(schema.safeParse(raw));
    const created = await createReservation({
      ...input,
      promotionCode: input.promotionCode ?? null,
      guest: { ...input.guest, arrivalTime: input.guest.arrivalTime || null, specialRequests: input.guest.specialRequests || null },
      locale: "en",
      createdById: user.id,
      actorName: user.name,
      allowPast: true,
    });
    revalidate();
    return created;
  });
}

export async function quoteForAdminAction(raw: unknown): Promise<AdminResult<Awaited<ReturnType<typeof quoteStay>>["quote"]>> {
  return guarded("reservations.view", async () => {
    const input = parseOrThrow(quoteSchema.safeParse(raw));
    const { quote } = await quoteStay({ ...input, promotionCode: input.promotionCode ?? null }, prisma, { allowPast: true });
    return quote;
  });
}
