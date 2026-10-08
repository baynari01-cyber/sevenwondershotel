"use server";

import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity, parseOrThrow, type AdminResult } from "@/lib/admin/action";
import {
  CatalogError,
  catalogGuarded,
  idSchema,
  imagePathSchema,
  intSchema,
  optionalIdSchema,
  optionalImagePathSchema,
  optionalTextSchema,
  revalidateCatalog,
  textSchema,
} from "@/lib/admin/catalog";
import { CONTENT_PAGES, GALLERY_CATEGORIES } from "@/lib/admin/constants";

/* ------------------------------------------------------------------ Page sections */

const keySchema = z.string().trim().min(3).max(60).regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, "key");
const sectionSchema = z.string().trim().min(2).max(40).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "section");

const contentBlockSchema = z.object({
  id: optionalIdSchema,
  key: keySchema.optional(),
  page: z.enum(CONTENT_PAGES).optional(),
  section: sectionSchema.optional(),
  titleEn: textSchema(160),
  titleAr: textSchema(160),
  subtitleEn: optionalTextSchema(160),
  subtitleAr: optionalTextSchema(160),
  bodyEn: textSchema(6000),
  bodyAr: textSchema(6000),
  imageUrl: optionalImagePathSchema,
  linkHref: z
    .string()
    .trim()
    .max(200)
    .regex(/^(\/[A-Za-z0-9/_\-.?=&#%]*)?$/, "link")
    .transform((v) => (v === "" ? null : v)),
  isVisible: z.boolean(),
  sortOrder: intSchema(0, 999),
});

/** Existing blocks keep their `key`, `page` and `section`: the public pages look sections up by key. */
export async function saveContentBlockAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("content.manage", async (user) => {
    const input = parseOrThrow(contentBlockSchema.safeParse(raw));
    const { id, key, page, section, ...fields } = input;
    let saved;
    if (id) {
      const existing = await prisma.contentBlock.findUnique({ where: { id }, select: { key: true, page: true, section: true } });
      if (!existing) throw new CatalogError("NOT_FOUND");
      if ((key && key !== existing.key) || (page && page !== existing.page)) throw new CatalogError("IMMUTABLE", "key");
      saved = await prisma.contentBlock.update({ where: { id }, data: fields });
    } else {
      if (!key || !page || !section) throw new CatalogError("NOT_FOUND", "key");
      saved = await prisma.contentBlock.create({ data: { ...fields, key, page, section } });
    }
    await logActivity(user, { action: "content_update", entityType: "contentBlock", entityId: saved.id, summary: `updated content ${saved.key}`, metadata: { key: saved.key } });
    revalidateCatalog();
    return { id: saved.id };
  });
}

export async function setContentBlockVisibleAction(raw: unknown): Promise<AdminResult<{ isVisible: boolean }>> {
  return catalogGuarded("content.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema, isVisible: z.boolean() }).safeParse(raw));
    const b = await prisma.contentBlock.update({ where: { id: input.id }, data: { isVisible: input.isVisible } });
    await logActivity(user, { action: "content_update", entityType: "contentBlock", entityId: b.id, summary: `${input.isVisible ? "showed" : "hid"} content ${b.key}`, metadata: { key: b.key } });
    revalidateCatalog();
    return { isVisible: b.isVisible };
  });
}

/* ------------------------------------------------------------------ Gallery */

const gallerySchema = z.object({
  id: optionalIdSchema,
  url: imagePathSchema,
  captionEn: textSchema(160),
  captionAr: textSchema(160),
  category: z.enum(GALLERY_CATEGORIES),
  width: intSchema(0, 20000),
  height: intSchema(0, 20000),
  source: textSchema(160),
  sortOrder: intSchema(0, 999),
  isVisible: z.boolean(),
});

/** Reads intrinsic dimensions from a file under /public when the form did not supply them. */
async function measurePublicImage(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const file = path.join(process.cwd(), "public", ...url.split("/").filter(Boolean));
    const meta = await sharp(file).metadata();
    if (meta.width && meta.height) return { width: meta.width, height: meta.height };
    return null;
  } catch {
    return null;
  }
}

export async function saveGalleryImageAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("content.manage", async (user) => {
    const input = parseOrThrow(gallerySchema.safeParse(raw));
    const { id, ...rest } = input;
    let { width, height } = rest;
    if (!width || !height) {
      const measured = await measurePublicImage(rest.url);
      if (!measured) throw new CatalogError("NOT_FOUND", "url");
      width = measured.width;
      height = measured.height;
    }
    const data = { ...rest, width, height };
    const g = id ? await prisma.galleryImage.update({ where: { id }, data }) : await prisma.galleryImage.create({ data });
    await logActivity(user, { action: "content_update", entityType: "galleryImage", entityId: g.id, summary: `${id ? "updated" : "added"} gallery image ${g.captionEn}`, metadata: { key: "gallery" } });
    revalidateCatalog();
    return { id: g.id };
  });
}

export async function setGalleryImageVisibleAction(raw: unknown): Promise<AdminResult<{ isVisible: boolean }>> {
  return catalogGuarded("content.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema, isVisible: z.boolean() }).safeParse(raw));
    const g = await prisma.galleryImage.update({ where: { id: input.id }, data: { isVisible: input.isVisible } });
    await logActivity(user, { action: "content_update", entityType: "galleryImage", entityId: g.id, summary: `${input.isVisible ? "showed" : "hid"} gallery image ${g.captionEn}`, metadata: { key: "gallery" } });
    revalidateCatalog();
    return { isVisible: g.isVisible };
  });
}

export async function deleteGalleryImageAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("content.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    const g = await prisma.galleryImage.delete({ where: { id: input.id } });
    await logActivity(user, { action: "content_update", entityType: "galleryImage", entityId: g.id, summary: `removed gallery image ${g.captionEn}`, metadata: { key: "gallery" } });
    revalidateCatalog();
    return { id: g.id };
  });
}

/* ------------------------------------------------------------------ Policies */

const policySchema = z.object({
  id: optionalIdSchema,
  key: keySchema.optional(),
  titleEn: textSchema(160),
  titleAr: textSchema(160),
  bodyEn: textSchema(4000),
  bodyAr: textSchema(4000),
  sortOrder: intSchema(0, 999),
  isVisible: z.boolean(),
  isVerified: z.boolean(),
});

export async function savePolicyAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("content.manage", async (user) => {
    const input = parseOrThrow(policySchema.safeParse(raw));
    const { id, key, ...fields } = input;
    let saved;
    if (id) {
      saved = await prisma.hotelPolicy.update({ where: { id }, data: fields });
    } else {
      if (!key) throw new CatalogError("NOT_FOUND", "key");
      saved = await prisma.hotelPolicy.create({ data: { ...fields, key } });
    }
    await logActivity(user, { action: "content_update", entityType: "hotelPolicy", entityId: saved.id, summary: `updated policy ${saved.key}`, metadata: { key: saved.key } });
    revalidateCatalog();
    return { id: saved.id };
  });
}

export async function deletePolicyAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("content.manage", async (user) => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    const p = await prisma.hotelPolicy.delete({ where: { id: input.id } });
    await logActivity(user, { action: "content_update", entityType: "hotelPolicy", entityId: p.id, summary: `removed policy ${p.key}`, metadata: { key: p.key } });
    revalidateCatalog();
    return { id: p.id };
  });
}

/* ------------------------------------------------------------------ Inbox */

export async function setMessageReadAction(raw: unknown): Promise<AdminResult<{ isRead: boolean }>> {
  return catalogGuarded("content.manage", async () => {
    const input = parseOrThrow(z.object({ id: idSchema, isRead: z.boolean() }).safeParse(raw));
    const m = await prisma.contactMessage.update({ where: { id: input.id }, data: { isRead: input.isRead } });
    revalidateCatalog();
    return { isRead: m.isRead };
  });
}

export async function markAllMessagesReadAction(): Promise<AdminResult<{ count: number }>> {
  return catalogGuarded("content.manage", async () => {
    const r = await prisma.contactMessage.updateMany({ where: { isRead: false }, data: { isRead: true } });
    revalidateCatalog();
    return { count: r.count };
  });
}

export async function deleteMessageAction(raw: unknown): Promise<AdminResult<{ id: string }>> {
  return catalogGuarded("content.manage", async () => {
    const input = parseOrThrow(z.object({ id: idSchema }).safeParse(raw));
    const m = await prisma.contactMessage.delete({ where: { id: input.id } });
    revalidateCatalog();
    return { id: m.id };
  });
}
