import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { Permission } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/current-user";
import { guarded, ValidationError, type AdminResult } from "@/lib/admin/action";
import { isIsoDate } from "@/lib/utils/dates";

/**
 * Domain errors raised by the catalogue modules (rooms, rates, content, inbox).
 * They are surfaced to the client as a VALIDATION result whose single issue carries the code,
 * so the existing `guarded` wrapper and result shape stay unchanged.
 */
export type CatalogErrorCode = "DUPLICATE" | "HAS_RESERVATIONS" | "NOT_FOUND" | "INVALID_RANGE" | "IMMUTABLE";

export class CatalogError extends Error {
  readonly code: CatalogErrorCode;
  readonly path: string;
  constructor(code: CatalogErrorCode, path = "") {
    super(code);
    this.code = code;
    this.path = path;
  }
}

function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Field behind a unique violation. The query engine reports `meta.target: ["slug"]`; the pg driver adapter reports
 * the constraint name (`RoomType_slug_key`, `RateOverride_roomTypeId_date_key`) under `meta.driverAdapterError`.
 */
function uniqueTargetField(e: Prisma.PrismaClientKnownRequestError): string {
  const meta = (e.meta ?? {}) as Record<string, unknown>;
  if (Array.isArray(meta.target)) return meta.target.map(String).join(".");
  const adapter = meta.driverAdapterError as { cause?: { constraint?: { index?: string; fields?: string[] } } } | undefined;
  const fields = adapter?.cause?.constraint?.fields;
  if (Array.isArray(fields) && fields.length) return String(fields[fields.length - 1]);
  const index = adapter?.cause?.constraint?.index;
  if (typeof index === "string") {
    const parts = index.replace(/_key$/, "").split("_").slice(1);
    return parts[parts.length - 1] ?? "";
  }
  return "";
}

function isNotFound(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
}

/**
 * `guarded` with catalogue error translation. Every catalogue mutation still runs through `guarded`,
 * which performs authentication + permission checks on the server.
 */
export function catalogGuarded<T>(permission: Permission, fn: (user: CurrentUser) => Promise<T>): Promise<AdminResult<T>> {
  return guarded(permission, async (user) => {
    try {
      return await fn(user);
    } catch (e) {
      if (e instanceof CatalogError) throw new ValidationError([{ path: e.path, message: e.code }]);
      if (isUniqueViolation(e)) throw new ValidationError([{ path: uniqueTargetField(e), message: "DUPLICATE" }]);
      if (isNotFound(e)) throw new ValidationError([{ path: "", message: "NOT_FOUND" }]);
      throw e;
    }
  });
}

/** Revalidates the admin area and the whole public site (it reads from the database on each request). */
export function revalidateCatalog() {
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]", "layout");
}

/* ------------------------------------------------------------------------------------------------
   Shared zod building blocks. Money is validated as a decimal string and never parsed to a float.
------------------------------------------------------------------------------------------------ */

export const idSchema = z.string().min(1).max(64);
export const optionalIdSchema = z.string().max(64).optional();

const MONEY = /^\d{1,8}(\.\d{1,2})?$/;
const SIGNED_MONEY = /^-?\d{1,8}(\.\d{1,2})?$/;

export const moneySchema = z.string().trim().regex(MONEY, "money");
export const signedMoneySchema = z.string().trim().regex(SIGNED_MONEY, "money");
/** Empty string → null (for optional amounts coming from text inputs). */
export const optionalMoneySchema = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.union([z.null(), z.string().regex(MONEY, "money")]));

export const isoDateSchema = z.string().refine((v) => isIsoDate(v), "date");
export const optionalIsoDateSchema = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.union([z.null(), z.string().refine((v) => isIsoDate(v), "date")]));

export const intSchema = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
export const optionalIntSchema = (min: number, max: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
    .pipe(z.union([z.null(), z.number().int().min(min).max(max)]));

export const textSchema = (max: number) => z.string().trim().min(1).max(max);
export const optionalTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug");

export const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(24)
  .regex(/^[A-Z0-9_-]+$/, "code");

/**
 * Images must be site-relative paths (e.g. /images/hotel/… or /uploads/…): the public site renders them
 * through next/image, which only allows the hosts configured in next.config.ts.
 */
export const imagePathSchema = z
  .string()
  .trim()
  .min(2)
  .max(300)
  .regex(/^\/(?!\/)[A-Za-z0-9/_\-.%]+$/, "imagePath")
  .refine((v) => !v.includes(".."), "imagePath");

export const optionalImagePathSchema = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.union([z.null(), imagePathSchema]));

export const decimal = (value: string) => new Prisma.Decimal(value);
