"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity, parseOrThrow, type AdminResult } from "@/lib/admin/action";
import {
  CatalogError,
  catalogGuarded,
  codeSchema,
  decimal,
  idSchema,
  imagePathSchema,
  intSchema,
  moneySchema,
  optionalIdSchema,
  optionalIntSchema,
  optionalMoneySchema,
  optionalTextSchema,
  revalidateCatalog,
  slugSchema,
  textSchema,
} from "@/lib/admin/catalog";

const roomTypeSchema = z
  .object({
    id: optionalIdSchema,
    slug: slugSchema,
    code: codeSchema,
    nameEn: textSchema(80),
    nameAr: textSchema(80),
    shortEn: textSchema(200),
    shortAr: textSchema(200),
    descriptionEn: textSchema(4000),
    descriptionAr: textSchema(4000),
    bedConfigEn: textSchema(120),
    bedConfigAr: textSchema(120),
    sizeSqm: optionalIntSchema(5, 1000),
    maxAdults: intSchema(1, 12),
    maxChildren: intSchema(0, 12),
    maxOccupancy: intSchema(1, 20),
    baseRate: moneySchema,
    weekendRate: optionalMoneySchema,
    extraAdultRate: moneySchema,
    extraChildRate: moneySchema,
    minStay: intSchema(1, 30),
    hasBalcony: z.boolean(),
    isSuite: z.boolean(),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
    sortOrder: intSchema(0, 999),
    amenityIds: z.array(idSchema).max(60),
    images: z.array(z.object({ url: imagePathSchema, altEn: z.string().trim().max(160), altAr: z.string().trim().max(160) })).max(24),
  })
  .refine((v) => v.maxOccupancy >= v.maxAdults, { path: ["maxOccupancy"], message: "occupancy" });

export async function saveRoomTypeAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rooms.manage", async (user) => {
    const input = parseOrThrow(roomTypeSchema.safeParse(raw));
    const { id, amenityIds, images, ...rest } = input;
    const data = {
      ...rest,
      baseRate: decimal(rest.baseRate),
      weekendRate: rest.weekendRate ? decimal(rest.weekendRate) : null,
      extraAdultRate: decimal(rest.extraAdultRate),
      extraChildRate: decimal(rest.extraChildRate),
    };
    const uniqueAmenities = Array.from(new Set(amenityIds));
    const saved = await prisma.$transaction(async (tx) => {
      const amenityCount = await tx.amenity.count({ where: { id: { in: uniqueAmenities } } });
      if (amenityCount !== uniqueAmenities.length) throw new CatalogError("NOT_FOUND", "amenityIds");
      const rt = id
        ? await tx.roomType.update({ where: { id }, data })
        : await tx.roomType.create({ data });
      await tx.roomTypeAmenity.deleteMany({ where: { roomTypeId: rt.id, amenityId: { notIn: uniqueAmenities } } });
      const existing = await tx.roomTypeAmenity.findMany({ where: { roomTypeId: rt.id }, select: { amenityId: true } });
      const have = new Set(existing.map((a) => a.amenityId));
      const toAdd = uniqueAmenities.filter((a) => !have.has(a));
      if (toAdd.length) await tx.roomTypeAmenity.createMany({ data: toAdd.map((amenityId) => ({ roomTypeId: rt.id, amenityId })) });
      await tx.roomImage.deleteMany({ where: { roomTypeId: rt.id } });
      if (images.length) await tx.roomImage.createMany({ data: images.map((img, i) => ({ roomTypeId: rt.id, url: img.url, altEn: img.altEn || rt.nameEn, altAr: img.altAr || rt.nameAr, sortOrder: i + 1 })) });
      await logActivity(user, { action: id ? "roomType_update" : "roomType_create", entityType: "roomType", entityId: rt.id, summary: `${id ? "updated" : "created"} category ${rt.code}`, metadata: { code: rt.code } }, tx);
      return rt;
    });
    revalidateCatalog();
    return { id: saved.id };
  });
}

export async function setRoomTypeActiveAction(raw: unknown): Promise<AdminResult<{ isActive: boolean }>> {
  return catalogGuarded("rooms.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema, isActive: z.boolean() }).safeParse(raw));
    const rt = await prisma.roomType.update({ where: { id: input.id }, data: { isActive: input.isActive } });
    await logActivity(user, { action: "roomType_update", entityType: "roomType", entityId: rt.id, summary: `${input.isActive ? "activated" : "deactivated"} category ${rt.code}`, metadata: { code: rt.code } });
    revalidateCatalog();
    return { isActive: rt.isActive };
  });
}

/** Categories that have ever been reserved cannot be deleted (history must stay intact); deactivate them instead. */
export async function deleteRoomTypeAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rooms.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    await prisma.$transaction(async (tx) => {
      const rt = await tx.roomType.findUnique({ where: { id: input.id }, include: { _count: { select: { reservationRooms: true } }, rooms: { include: { _count: { select: { reservationRooms: true } } } } } });
      if (!rt) throw new CatalogError("NOT_FOUND");
      if (rt._count.reservationRooms > 0 || rt.rooms.some((r) => r._count.reservationRooms > 0)) throw new CatalogError("HAS_RESERVATIONS");
      await tx.room.deleteMany({ where: { roomTypeId: rt.id } });
      await tx.roomType.delete({ where: { id: rt.id } });
      await logActivity(user, { action: "roomType_delete", entityType: "roomType", entityId: rt.id, summary: `deleted category ${rt.code}`, metadata: { code: rt.code } }, tx);
    });
    revalidateCatalog();
    return { id: input.id };
  });
}

const roomSchema = z.object({
  id: optionalIdSchema,
  roomTypeId: idSchema,
  number: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9-]+$/, "number"),
  floor: intSchema(-2, 60),
  hasBalcony: z.boolean(),
  isActive: z.boolean(),
  notes: optionalTextSchema(300),
});

export async function saveRoomAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rooms.manage", async (user) => {
    const input = parseOrThrow(roomSchema.safeParse(raw));
    const { id, ...data } = input;
    const type = await prisma.roomType.findUnique({ where: { id: data.roomTypeId }, select: { id: true } });
    if (!type) throw new CatalogError("NOT_FOUND", "roomTypeId");
    const room = id ? await prisma.room.update({ where: { id }, data }) : await prisma.room.create({ data });
    await logActivity(user, { action: id ? "room_update" : "room_create", entityType: "room", entityId: room.id, summary: `${id ? "updated" : "added"} room ${room.number}`, metadata: { room: room.number } });
    revalidateCatalog();
    return { id: room.id };
  });
}

export async function setRoomActiveAction(raw: unknown): Promise<AdminResult<{ isActive: boolean }>> {
  return catalogGuarded("rooms.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema, isActive: z.boolean() }).safeParse(raw));
    const room = await prisma.room.update({ where: { id: input.id }, data: { isActive: input.isActive } });
    await logActivity(user, { action: "room_update", entityType: "room", entityId: room.id, summary: `${input.isActive ? "activated" : "deactivated"} room ${room.number}`, metadata: { room: room.number } });
    revalidateCatalog();
    return { isActive: room.isActive };
  });
}

export async function deleteRoomAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rooms.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({ where: { id: input.id }, include: { _count: { select: { reservationRooms: true } } } });
      if (!room) throw new CatalogError("NOT_FOUND");
      if (room._count.reservationRooms > 0) throw new CatalogError("HAS_RESERVATIONS");
      await tx.room.delete({ where: { id: room.id } });
      await logActivity(user, { action: "room_delete", entityType: "room", entityId: room.id, summary: `removed room ${room.number}`, metadata: { room: room.number } }, tx);
    });
    revalidateCatalog();
    return { id: input.id };
  });
}
