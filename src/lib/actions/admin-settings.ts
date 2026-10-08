"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { guarded, logActivity, parseOrThrow, type AdminResult } from "@/lib/admin/action";
import { resetDemo } from "@/lib/demo/seed";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https:\/\/[^\s]+$/i.test(v), { message: "url" });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "time" });
const money = (max: number) => z.coerce.number().min(0).max(max);

const profileSchema = z.object({
  nameEn: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().min(2).max(120),
  taglineEn: z.string().trim().min(2).max(200),
  taglineAr: z.string().trim().min(2).max(200),
  addressEn: z.string().trim().min(2).max(300),
  addressAr: z.string().trim().min(2).max(300),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  postalBox: optionalText(40),
  phone: z.string().trim().min(5).max(40),
  phoneSecondary: optionalText(40),
  fax: optionalText(40),
  email: z.string().trim().email().max(120),
  whatsapp: optionalText(40),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tripadvisorUrl: optionalUrl,
  demoMode: z.boolean(),
});

const policiesSchema = z.object({
  checkInTime: time,
  checkOutTime: time,
  childAgeLimit: z.coerce.number().int().min(0).max(17),
  maxRoomsPerBooking: z.coerce.number().int().min(1).max(20),
  maxNightsPerBooking: z.coerce.number().int().min(1).max(90),
  weekendDays: z.array(z.number().int().min(0).max(6)).max(7).transform((days) => Array.from(new Set(days)).sort((a, b) => a - b)),
});

const financialSchema = z.object({
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, { message: "currency" }),
  usdRate: money(1000).refine((v) => v > 0, { message: "positive" }),
  eurRate: money(1000).refine((v) => v > 0, { message: "positive" }),
  taxRate: money(100),
  serviceChargeRate: money(100),
  taxesIncluded: z.boolean(),
});

export type SettingsSection = "profile" | "policies" | "financial";

function revalidateSettings() {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/[locale]/admin", "layout");
}

async function persist(section: SettingsSection, data: Prisma.HotelSettingsUpdateInput, user: Parameters<typeof logActivity>[0], fields: string[]) {
  await prisma.$transaction(async (tx) => {
    await tx.hotelSettings.update({ where: { id: "default" }, data });
    await logActivity(user, { action: "settings_update", entityType: "settings", entityId: "default", summary: `updated ${section} settings (${fields.join(", ")})`, metadata: { section, fields } }, tx);
  });
  revalidateSettings();
}

export async function updateHotelProfileAction(raw: unknown): Promise<AdminResult<{ section: SettingsSection }>> {
  return guarded("settings.manage", async (user) => {
    const input = parseOrThrow(profileSchema.safeParse(raw));
    const { latitude, longitude, ...rest } = input;
    await persist("profile", { ...rest, latitude: new Prisma.Decimal(latitude).toDecimalPlaces(6), longitude: new Prisma.Decimal(longitude).toDecimalPlaces(6) }, user, Object.keys(input));
    return { section: "profile" };
  });
}

export async function updatePoliciesAction(raw: unknown): Promise<AdminResult<{ section: SettingsSection }>> {
  return guarded("settings.manage", async (user) => {
    const input = parseOrThrow(policiesSchema.safeParse(raw));
    await persist("policies", { ...input, weekendDays: { set: input.weekendDays } }, user, Object.keys(input));
    return { section: "policies" };
  });
}

export async function updateFinancialAction(raw: unknown): Promise<AdminResult<{ section: SettingsSection }>> {
  return guarded("settings.manage", async (user) => {
    const input = parseOrThrow(financialSchema.safeParse(raw));
    await persist(
      "financial",
      {
        currency: input.currency,
        usdRate: new Prisma.Decimal(input.usdRate).toDecimalPlaces(4),
        eurRate: new Prisma.Decimal(input.eurRate).toDecimalPlaces(4),
        taxRate: new Prisma.Decimal(input.taxRate).toDecimalPlaces(2),
        serviceChargeRate: new Prisma.Decimal(input.serviceChargeRate).toDecimalPlaces(2),
        taxesIncluded: input.taxesIncluded,
      },
      user,
      Object.keys(input),
    );
    return { section: "financial" };
  });
}

/**
 * Wipes every demo record (reservations, guests, blocks, content changes…) and re-seeds the original dataset.
 * User accounts survive the reset; the demo admin password is re-applied from the environment and never logged.
 */
export async function resetDemoAction(): Promise<AdminResult<{ reservations: number }>> {
  return guarded("demo.reset", async (user) => {
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
    if (!adminPassword) throw new Error("DEMO_ADMIN_PASSWORD is not configured");
    const result = await resetDemo(prisma, { adminPassword });
    // The reset clears the activity log, so record the reset itself afterwards.
    await logActivity(user, { action: "demo_reset", entityType: "demo", entityId: null, summary: `reset the demo dataset (${result.reservations} reservations)`, metadata: { reservations: result.reservations } });
    revalidateSettings();
    return { reservations: result.reservations };
  });
}
