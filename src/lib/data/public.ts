import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { GalleryCategory } from "@/generated/prisma/enums";

export type SettingsDTO = {
  nameEn: string;
  nameAr: string;
  taglineEn: string;
  taglineAr: string;
  addressEn: string;
  addressAr: string;
  city: string;
  country: string;
  postalBox: string | null;
  phone: string;
  phoneSecondary: string | null;
  fax: string | null;
  email: string;
  whatsapp: string | null;
  latitude: number;
  longitude: number;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  displayCurrencies: string[];
  usdRate: string;
  eurRate: string;
  taxRate: string;
  serviceChargeRate: string;
  taxesIncluded: boolean;
  childAgeLimit: number;
  weekendDays: number[];
  maxRoomsPerBooking: number;
  maxNightsPerBooking: number;
  demoMode: boolean;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tripadvisorUrl: string | null;
};

export const getSettings = cache(async (): Promise<SettingsDTO> => {
  const s = await prisma.hotelSettings.findUnique({ where: { id: "default" } });
  if (!s) throw new Error("Hotel settings are not seeded. Run `pnpm db:seed`.");
  return {
    nameEn: s.nameEn,
    nameAr: s.nameAr,
    taglineEn: s.taglineEn,
    taglineAr: s.taglineAr,
    addressEn: s.addressEn,
    addressAr: s.addressAr,
    city: s.city,
    country: s.country,
    postalBox: s.postalBox,
    phone: s.phone,
    phoneSecondary: s.phoneSecondary,
    fax: s.fax,
    email: s.email,
    whatsapp: s.whatsapp,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    checkInTime: s.checkInTime,
    checkOutTime: s.checkOutTime,
    currency: s.currency,
    displayCurrencies: s.displayCurrencies,
    usdRate: s.usdRate.toString(),
    eurRate: s.eurRate.toString(),
    taxRate: s.taxRate.toString(),
    serviceChargeRate: s.serviceChargeRate.toString(),
    taxesIncluded: s.taxesIncluded,
    childAgeLimit: s.childAgeLimit,
    weekendDays: s.weekendDays,
    maxRoomsPerBooking: s.maxRoomsPerBooking,
    maxNightsPerBooking: s.maxNightsPerBooking,
    demoMode: s.demoMode,
    facebookUrl: s.facebookUrl,
    instagramUrl: s.instagramUrl,
    tripadvisorUrl: s.tripadvisorUrl,
  };
});

export type ContentBlockDTO = {
  key: string;
  section: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string | null;
  subtitleAr: string | null;
  bodyEn: string;
  bodyAr: string;
  imageUrl: string | null;
  linkHref: string | null;
  sortOrder: number;
};

export const getContentBlocks = cache(async (page: string): Promise<ContentBlockDTO[]> => {
  const blocks = await prisma.contentBlock.findMany({ where: { page, isVisible: true }, orderBy: { sortOrder: "asc" } });
  return blocks.map((b) => ({
    key: b.key,
    section: b.section,
    titleEn: b.titleEn,
    titleAr: b.titleAr,
    subtitleEn: b.subtitleEn,
    subtitleAr: b.subtitleAr,
    bodyEn: b.bodyEn,
    bodyAr: b.bodyAr,
    imageUrl: b.imageUrl,
    linkHref: b.linkHref,
    sortOrder: b.sortOrder,
  }));
});

export function blockByKey(blocks: ContentBlockDTO[], key: string): ContentBlockDTO | undefined {
  return blocks.find((b) => b.key === key);
}

export type RoomTypeDTO = {
  id: string;
  slug: string;
  code: string;
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
  descriptionEn: string;
  descriptionAr: string;
  bedConfigEn: string;
  bedConfigAr: string;
  sizeSqm: number | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  baseRate: string;
  weekendRate: string | null;
  extraAdultRate: string;
  extraChildRate: string;
  minStay: number;
  hasBalcony: boolean;
  isSuite: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  roomCount: number;
  balconyCount: number;
  images: Array<{ id: string; url: string; altEn: string; altAr: string }>;
  amenities: Array<{ key: string; labelEn: string; labelAr: string; icon: string }>;
};

function toRoomTypeDTO(rt: {
  id: string; slug: string; code: string; nameEn: string; nameAr: string; shortEn: string; shortAr: string; descriptionEn: string; descriptionAr: string;
  bedConfigEn: string; bedConfigAr: string; sizeSqm: number | null; maxAdults: number; maxChildren: number; maxOccupancy: number;
  baseRate: { toString(): string }; weekendRate: { toString(): string } | null; extraAdultRate: { toString(): string }; extraChildRate: { toString(): string };
  minStay: number; hasBalcony: boolean; isSuite: boolean; isFeatured: boolean; isActive: boolean; sortOrder: number;
  rooms: Array<{ isActive: boolean; hasBalcony: boolean }>;
  images: Array<{ id: string; url: string; altEn: string; altAr: string; sortOrder: number }>;
  amenities: Array<{ amenity: { key: string; labelEn: string; labelAr: string; icon: string; sortOrder: number } }>;
}): RoomTypeDTO {
  const activeRooms = rt.rooms.filter((r) => r.isActive);
  return {
    id: rt.id,
    slug: rt.slug,
    code: rt.code,
    nameEn: rt.nameEn,
    nameAr: rt.nameAr,
    shortEn: rt.shortEn,
    shortAr: rt.shortAr,
    descriptionEn: rt.descriptionEn,
    descriptionAr: rt.descriptionAr,
    bedConfigEn: rt.bedConfigEn,
    bedConfigAr: rt.bedConfigAr,
    sizeSqm: rt.sizeSqm,
    maxAdults: rt.maxAdults,
    maxChildren: rt.maxChildren,
    maxOccupancy: rt.maxOccupancy,
    baseRate: rt.baseRate.toString(),
    weekendRate: rt.weekendRate ? rt.weekendRate.toString() : null,
    extraAdultRate: rt.extraAdultRate.toString(),
    extraChildRate: rt.extraChildRate.toString(),
    minStay: rt.minStay,
    hasBalcony: rt.hasBalcony,
    isSuite: rt.isSuite,
    isFeatured: rt.isFeatured,
    isActive: rt.isActive,
    sortOrder: rt.sortOrder,
    roomCount: activeRooms.length,
    balconyCount: activeRooms.filter((r) => r.hasBalcony).length,
    images: [...rt.images].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => ({ id: i.id, url: i.url, altEn: i.altEn, altAr: i.altAr })),
    amenities: [...rt.amenities]
      .sort((a, b) => a.amenity.sortOrder - b.amenity.sortOrder)
      .map((a) => ({ key: a.amenity.key, labelEn: a.amenity.labelEn, labelAr: a.amenity.labelAr, icon: a.amenity.icon })),
  };
}

const roomTypeInclude = {
  rooms: { select: { isActive: true, hasBalcony: true } },
  images: true,
  amenities: { include: { amenity: true } },
} as const;

export const getRoomTypes = cache(async (opts?: { includeInactive?: boolean }): Promise<RoomTypeDTO[]> => {
  const list = await prisma.roomType.findMany({
    where: opts?.includeInactive ? undefined : { isActive: true },
    include: roomTypeInclude,
    orderBy: { sortOrder: "asc" },
  });
  return list.map(toRoomTypeDTO);
});

export const getRoomTypeBySlug = cache(async (slug: string): Promise<RoomTypeDTO | null> => {
  const rt = await prisma.roomType.findUnique({ where: { slug }, include: roomTypeInclude });
  return rt && rt.isActive ? toRoomTypeDTO(rt) : null;
});

export type GalleryImageDTO = {
  id: string;
  url: string;
  captionEn: string;
  captionAr: string;
  category: GalleryCategory;
  width: number;
  height: number;
  source: string;
};

export const getGallery = cache(async (): Promise<GalleryImageDTO[]> => {
  const list = await prisma.galleryImage.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } });
  return list.map((g) => ({ id: g.id, url: g.url, captionEn: g.captionEn, captionAr: g.captionAr, category: g.category, width: g.width, height: g.height, source: g.source }));
});

export type PolicyDTO = { key: string; titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; isVerified: boolean };

export const getPolicies = cache(async (): Promise<PolicyDTO[]> => {
  const list = await prisma.hotelPolicy.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } });
  return list.map((p) => ({ key: p.key, titleEn: p.titleEn, titleAr: p.titleAr, bodyEn: p.bodyEn, bodyAr: p.bodyAr, isVerified: p.isVerified }));
});
