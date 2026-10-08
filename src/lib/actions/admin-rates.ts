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
  intSchema,
  isoDateSchema,
  moneySchema,
  optionalIdSchema,
  optionalIntSchema,
  optionalIsoDateSchema,
  optionalMoneySchema,
  optionalTextSchema,
  revalidateCatalog,
  signedMoneySchema,
  textSchema,
} from "@/lib/admin/catalog";
import { diffNights, isoToUtcDate, nightsBetween } from "@/lib/utils/dates";
import { EXTRA_ICONS } from "@/lib/admin/constants";

/* ------------------------------------------------------------------ Rate plans */

const ratePlanSchema = z
  .object({
    id: optionalIdSchema,
    code: codeSchema,
    nameEn: textSchema(80),
    nameAr: textSchema(80),
    descriptionEn: textSchema(600),
    descriptionAr: textSchema(600),
    type: z.enum(["ROOM_ONLY", "BED_AND_BREAKFAST", "FLEXIBLE", "NON_REFUNDABLE", "PROMOTIONAL"]),
    adjustmentType: z.enum(["PERCENT", "FIXED"]),
    adjustmentValue: signedMoneySchema,
    includesBreakfast: z.boolean(),
    refundable: z.boolean(),
    cancellationDeadlineDays: intSchema(0, 90),
    cancellationPolicyEn: textSchema(600),
    cancellationPolicyAr: textSchema(600),
    minNights: intSchema(1, 30),
    validFrom: optionalIsoDateSchema,
    validTo: optionalIsoDateSchema,
    isActive: z.boolean(),
    sortOrder: intSchema(0, 999),
  })
  .refine((v) => !v.validFrom || !v.validTo || v.validFrom <= v.validTo, { path: ["validTo"], message: "range" });

export async function saveRatePlanAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(ratePlanSchema.safeParse(raw));
    const { id, ...rest } = input;
    const data = { ...rest, adjustmentValue: decimal(rest.adjustmentValue), validFrom: rest.validFrom ? isoToUtcDate(rest.validFrom) : null, validTo: rest.validTo ? isoToUtcDate(rest.validTo) : null };
    const plan = id ? await prisma.ratePlan.update({ where: { id }, data }) : await prisma.ratePlan.create({ data: { ...data, isDemo: true } });
    await logActivity(user, { action: "rate_update", entityType: "ratePlan", entityId: plan.id, summary: `${id ? "updated" : "created"} rate plan ${plan.code}`, metadata: { code: plan.code } });
    revalidateCatalog();
    return { id: plan.id };
  });
}

export async function setRatePlanActiveAction(raw: unknown): Promise<AdminResult<{ isActive: boolean }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema, isActive: z.boolean() }).safeParse(raw));
    const plan = await prisma.ratePlan.update({ where: { id: input.id }, data: { isActive: input.isActive } });
    await logActivity(user, { action: "rate_update", entityType: "ratePlan", entityId: plan.id, summary: `${input.isActive ? "activated" : "deactivated"} rate plan ${plan.code}`, metadata: { code: plan.code } });
    revalidateCatalog();
    return { isActive: plan.isActive };
  });
}

export async function deleteRatePlanAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    await prisma.$transaction(async (tx) => {
      const plan = await tx.ratePlan.findUnique({ where: { id: input.id }, include: { _count: { select: { reservationRooms: true } } } });
      if (!plan) throw new CatalogError("NOT_FOUND");
      if (plan._count.reservationRooms > 0) throw new CatalogError("HAS_RESERVATIONS");
      await tx.ratePlan.delete({ where: { id: plan.id } });
      await logActivity(user, { action: "rate_update", entityType: "ratePlan", entityId: plan.id, summary: `deleted rate plan ${plan.code}`, metadata: { code: plan.code } }, tx);
    });
    revalidateCatalog();
    return { id: input.id };
  });
}

/* ------------------------------------------------------------------ Seasons */

const seasonSchema = z
  .object({
    id: optionalIdSchema,
    nameEn: textSchema(80),
    nameAr: textSchema(80),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    isActive: z.boolean(),
    rates: z.array(z.object({ roomTypeId: idSchema, rate: optionalMoneySchema })).max(100),
  })
  .refine((v) => v.startDate < v.endDate, { path: ["endDate"], message: "range" });

export async function saveSeasonAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(seasonSchema.safeParse(raw));
    const { id, rates, ...rest } = input;
    const data = { ...rest, startDate: isoToUtcDate(rest.startDate), endDate: isoToUtcDate(rest.endDate) };
    const season = await prisma.$transaction(async (tx) => {
      const s = id ? await tx.season.update({ where: { id }, data }) : await tx.season.create({ data });
      const withRate = rates.filter((r): r is { roomTypeId: string; rate: string } => r.rate !== null);
      const typeIds = Array.from(new Set(withRate.map((r) => r.roomTypeId)));
      const count = await tx.roomType.count({ where: { id: { in: typeIds } } });
      if (count !== typeIds.length) throw new CatalogError("NOT_FOUND", "rates");
      await tx.seasonRate.deleteMany({ where: { seasonId: s.id, roomTypeId: { notIn: typeIds } } });
      for (const r of withRate) {
        await tx.seasonRate.upsert({ where: { seasonId_roomTypeId: { seasonId: s.id, roomTypeId: r.roomTypeId } }, create: { seasonId: s.id, roomTypeId: r.roomTypeId, rate: decimal(r.rate) }, update: { rate: decimal(r.rate) } });
      }
      await logActivity(user, { action: "rate_update", entityType: "season", entityId: s.id, summary: `${id ? "updated" : "created"} season ${s.nameEn}`, metadata: { season: s.nameEn } }, tx);
      return s;
    });
    revalidateCatalog();
    return { id: season.id };
  });
}

export async function deleteSeasonAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    const s = await prisma.season.delete({ where: { id: input.id } });
    await logActivity(user, { action: "rate_update", entityType: "season", entityId: s.id, summary: `deleted season ${s.nameEn}`, metadata: { season: s.nameEn } });
    revalidateCatalog();
    return { id: s.id };
  });
}

/* ------------------------------------------------------------------ Date overrides */

const overrideFields = {
  roomTypeId: idSchema,
  rate: optionalMoneySchema,
  minStay: optionalIntSchema(1, 30),
  closed: z.boolean(),
  maxInventory: optionalIntSchema(0, 500),
  note: optionalTextSchema(200),
};

const overrideSchema = z.object({ id: optionalIdSchema, date: isoDateSchema, ...overrideFields });

export async function saveRateOverrideAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(overrideSchema.safeParse(raw));
    const { id, date, roomTypeId, ...rest } = input;
    const data = { ...rest, rate: rest.rate ? decimal(rest.rate) : null };
    const o = await prisma.$transaction(async (tx) => {
      if (id) {
        // Changing the date/category of an existing override must not collide with another one.
        const clash = await tx.rateOverride.findFirst({ where: { roomTypeId, date: isoToUtcDate(date), id: { not: id } }, select: { id: true } });
        if (clash) throw new CatalogError("DUPLICATE", "date");
        return tx.rateOverride.update({ where: { id }, data: { ...data, roomTypeId, date: isoToUtcDate(date) } });
      }
      return tx.rateOverride.upsert({ where: { roomTypeId_date: { roomTypeId, date: isoToUtcDate(date) } }, create: { ...data, roomTypeId, date: isoToUtcDate(date) }, update: data });
    });
    await logActivity(user, { action: "rate_update", entityType: "rateOverride", entityId: o.id, summary: `set date override for ${date}`, metadata: { date } });
    revalidateCatalog();
    return { id: o.id };
  });
}

export async function deleteRateOverrideAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    const o = await prisma.rateOverride.delete({ where: { id: input.id } });
    await logActivity(user, { action: "rate_update", entityType: "rateOverride", entityId: o.id, summary: `removed date override`, metadata: {} });
    revalidateCatalog();
    return { id: o.id };
  });
}

const MAX_BULK_DAYS = 366;

const bulkSchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    ...overrideFields,
    /** Only fields flagged here are written; the rest keep whatever each date already has. */
    apply: z.object({ rate: z.boolean(), minStay: z.boolean(), closed: z.boolean(), maxInventory: z.boolean() }),
  })
  .refine((v) => v.from <= v.to, { path: ["to"], message: "range" })
  .refine((v) => diffNights(v.from, v.to) < MAX_BULK_DAYS, { path: ["to"], message: "range" })
  .refine((v) => v.apply.rate || v.apply.minStay || v.apply.closed || v.apply.maxInventory, { path: ["apply"], message: "empty" });

/** Upserts one RateOverride per date in [from, to] inside a single transaction. */
export async function bulkRateOverrideAction(raw: unknown): Promise<AdminResult<{ count: number }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(bulkSchema.safeParse(raw));
    const dates = nightsBetween(input.from, input.to).concat(input.to);
    const patch = {
      ...(input.apply.rate ? { rate: input.rate ? decimal(input.rate) : null } : {}),
      ...(input.apply.minStay ? { minStay: input.minStay } : {}),
      ...(input.apply.closed ? { closed: input.closed } : {}),
      ...(input.apply.maxInventory ? { maxInventory: input.maxInventory } : {}),
      ...(input.note ? { note: input.note } : {}),
    };
    const count = await prisma.$transaction(async (tx) => {
      const type = await tx.roomType.findUnique({ where: { id: input.roomTypeId }, select: { id: true, code: true } });
      if (!type) throw new CatalogError("NOT_FOUND", "roomTypeId");
      for (const date of dates) {
        await tx.rateOverride.upsert({
          where: { roomTypeId_date: { roomTypeId: type.id, date: isoToUtcDate(date) } },
          create: { roomTypeId: type.id, date: isoToUtcDate(date), rate: null, minStay: null, closed: false, maxInventory: null, note: null, ...patch },
          update: patch,
        });
      }
      await logActivity(user, { action: "rate_update", entityType: "rateOverride", entityId: null, summary: `bulk updated ${dates.length} dates for ${type.code} (${input.from} – ${input.to})`, metadata: { code: type.code, from: input.from, to: input.to } }, tx);
      return dates.length;
    });
    revalidateCatalog();
    return { count };
  });
}

/* ------------------------------------------------------------------ Promotions */

const promotionSchema = z
  .object({
    id: optionalIdSchema,
    code: codeSchema,
    nameEn: textSchema(80),
    nameAr: textSchema(80),
    type: z.enum(["PERCENT", "FIXED"]),
    value: moneySchema,
    minNights: intSchema(1, 30),
    validFrom: isoDateSchema,
    validTo: isoDateSchema,
    isActive: z.boolean(),
  })
  .refine((v) => v.validFrom <= v.validTo, { path: ["validTo"], message: "range" });

export async function savePromotionAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(promotionSchema.safeParse(raw));
    const { id, ...rest } = input;
    const data = { ...rest, value: decimal(rest.value), validFrom: isoToUtcDate(rest.validFrom), validTo: isoToUtcDate(rest.validTo) };
    const p = id ? await prisma.promotion.update({ where: { id }, data }) : await prisma.promotion.create({ data });
    await logActivity(user, { action: "rate_update", entityType: "promotion", entityId: p.id, summary: `${id ? "updated" : "created"} promotion ${p.code}`, metadata: { code: p.code } });
    revalidateCatalog();
    return { id: p.id };
  });
}

export async function deletePromotionAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    await prisma.$transaction(async (tx) => {
      const p = await tx.promotion.findUnique({ where: { id: input.id }, include: { _count: { select: { reservations: true } } } });
      if (!p) throw new CatalogError("NOT_FOUND");
      if (p._count.reservations > 0) throw new CatalogError("HAS_RESERVATIONS");
      await tx.promotion.delete({ where: { id: p.id } });
      await logActivity(user, { action: "rate_update", entityType: "promotion", entityId: p.id, summary: `deleted promotion ${p.code}`, metadata: { code: p.code } }, tx);
    });
    revalidateCatalog();
    return { id: input.id };
  });
}

/* ------------------------------------------------------------------ Extras */

const extraSchema = z.object({
  id: optionalIdSchema,
  code: codeSchema,
  nameEn: textSchema(80),
  nameAr: textSchema(80),
  descriptionEn: textSchema(600),
  descriptionAr: textSchema(600),
  price: moneySchema,
  pricing: z.enum(["PER_STAY", "PER_NIGHT", "PER_PERSON", "PER_PERSON_PER_NIGHT"]),
  isInquiryOnly: z.boolean(),
  isActive: z.boolean(),
  sortOrder: intSchema(0, 999),
  icon: z.enum(EXTRA_ICONS),
});

export async function saveExtraAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(extraSchema.safeParse(raw));
    const { id, ...rest } = input;
    const data = { ...rest, price: decimal(rest.price) };
    const e = id ? await prisma.extra.update({ where: { id }, data }) : await prisma.extra.create({ data: { ...data, isDemo: true } });
    await logActivity(user, { action: "rate_update", entityType: "extra", entityId: e.id, summary: `${id ? "updated" : "created"} extra ${e.code}`, metadata: { code: e.code } });
    revalidateCatalog();
    return { id: e.id };
  });
}

export async function deleteExtraAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("rates.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    await prisma.$transaction(async (tx) => {
      const e = await tx.extra.findUnique({ where: { id: input.id }, include: { _count: { select: { reservationExtras: true } } } });
      if (!e) throw new CatalogError("NOT_FOUND");
      if (e._count.reservationExtras > 0) throw new CatalogError("HAS_RESERVATIONS");
      await tx.extra.delete({ where: { id: e.id } });
      await logActivity(user, { action: "rate_update", entityType: "extra", entityId: e.id, summary: `deleted extra ${e.code}`, metadata: { code: e.code } }, tx);
    });
    revalidateCatalog();
    return { id: input.id };
  });
}
