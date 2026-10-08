"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { guarded, logActivity, parseOrThrow, type AdminResult } from "@/lib/admin/action";
import { ACTIVE_STATUSES, BookingError } from "@/lib/booking/service";
import { isIsoDate, isoToUtcDate } from "@/lib/utils/dates";

const isoDate = z.string().refine(isIsoDate, { message: "date" });

const createBlockSchema = z
  .object({
    roomId: z.string().min(1).max(64),
    startDate: isoDate,
    endDate: isoDate,
    reason: z.enum(["MAINTENANCE", "OUT_OF_ORDER", "OWNER_USE", "OTHER"]),
    note: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.endDate > v.startDate, { message: "range", path: ["endDate"] });

function revalidate() {
  revalidatePath("/[locale]/admin", "layout");
}

/**
 * Creates a maintenance block on a physical room. Rejected when the room already holds an active
 * reservation (or another block) on any night of the range, so blocking never strands a guest.
 */
export async function createBlockAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return guarded("rooms.manage", async (user) => {
    const input = parseOrThrow(createBlockSchema.safeParse(raw));
    const start = isoToUtcDate(input.startDate);
    const end = isoToUtcDate(input.endDate);
    const id = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUniqueOrThrow({ where: { id: input.roomId }, select: { id: true, number: true, roomTypeId: true, isActive: true } });
      if (!room.isActive) throw new BookingError("NOT_AVAILABLE", { reason: "inactive" });
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${room.roomTypeId}))`;
      const clash = await tx.reservationRoom.findFirst({
        where: { roomId: room.id, reservation: { status: { in: ACTIVE_STATUSES }, checkIn: { lt: end }, checkOut: { gt: start } } },
        select: { reservation: { select: { reference: true } } },
      });
      if (clash) throw new BookingError("NOT_AVAILABLE", { reason: "reservation", reference: clash.reservation.reference });
      const overlapping = await tx.inventoryBlock.findFirst({ where: { roomId: room.id, startDate: { lt: end }, endDate: { gt: start } }, select: { id: true } });
      if (overlapping) throw new BookingError("NOT_AVAILABLE", { reason: "block" });
      const block = await tx.inventoryBlock.create({
        data: { roomId: room.id, startDate: start, endDate: end, reason: input.reason, note: input.note || null, createdById: user.id },
      });
      await logActivity(user, {
        action: "block_create",
        entityType: "room",
        entityId: room.id,
        summary: `${room.number}: ${input.reason} ${input.startDate} → ${input.endDate}${input.note ? ` (${input.note})` : ""}`,
        metadata: { room: room.number, reason: input.reason, startDate: input.startDate, endDate: input.endDate },
      }, tx);
      return block.id;
    });
    revalidate();
    return { id };
  });
}

export async function deleteBlockAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return guarded("rooms.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: z.string().min(1).max(64) }).safeParse(raw));
    await prisma.$transaction(async (tx) => {
      const block = await tx.inventoryBlock.findUniqueOrThrow({ where: { id: input.id }, include: { room: { select: { number: true } } } });
      await tx.inventoryBlock.delete({ where: { id: block.id } });
      await logActivity(user, {
        action: "block_delete",
        entityType: "room",
        entityId: block.roomId,
        summary: `${block.room.number}: removed ${block.reason} block`,
        metadata: { room: block.room.number, reason: block.reason },
      }, tx);
    });
    revalidate();
    return { id: input.id };
  });
}
