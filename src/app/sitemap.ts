import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const roomTypes = await prisma.roomType.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } });
  const staticPaths = ["", "/rooms", "/experiences", "/gallery", "/about", "/contact", "/book"];
  const entries: MetadataRoute.Sitemap = [];
  for (const path of staticPaths) {
    entries.push({ url: `${siteUrl}${path}`, alternates: { languages: { en: `${siteUrl}${path}`, ar: `${siteUrl}/ar${path}` } } });
  }
  for (const rt of roomTypes) {
    entries.push({ url: `${siteUrl}/rooms/${rt.slug}`, lastModified: rt.updatedAt, alternates: { languages: { en: `${siteUrl}/rooms/${rt.slug}`, ar: `${siteUrl}/ar/rooms/${rt.slug}` } } });
  }
  return entries;
}
