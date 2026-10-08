import "server-only";
import { prisma } from "@/lib/db";
import type { AdjustmentType, ExtraPricing, GalleryCategory, RatePlanType } from "@/generated/prisma/enums";
import { dbDateToIso } from "@/lib/utils/dates";

/* ------------------------------------------------------------------ Rooms */

export type RoomTypeRowDTO = {
  id: string;
  slug: string;
  code: string;
  nameEn: string;
  nameAr: string;
  baseRate: string;
  weekendRate: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  isActive: boolean;
  isFeatured: boolean;
  isSuite: boolean;
  sortOrder: number;
  roomCount: number;
  activeRoomCount: number;
  imageUrl: string | null;
  reservationCount: number;
};

export async function listRoomTypeRows(): Promise<RoomTypeRowDTO[]> {
  const list = await prisma.roomType.findMany({
    orderBy: { sortOrder: "asc" },
    include: { rooms: { select: { isActive: true } }, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } }, _count: { select: { reservationRooms: true } } },
  });
  return list.map((rt) => ({
    id: rt.id,
    slug: rt.slug,
    code: rt.code,
    nameEn: rt.nameEn,
    nameAr: rt.nameAr,
    baseRate: rt.baseRate.toString(),
    weekendRate: rt.weekendRate ? rt.weekendRate.toString() : null,
    maxAdults: rt.maxAdults,
    maxChildren: rt.maxChildren,
    maxOccupancy: rt.maxOccupancy,
    isActive: rt.isActive,
    isFeatured: rt.isFeatured,
    isSuite: rt.isSuite,
    sortOrder: rt.sortOrder,
    roomCount: rt.rooms.length,
    activeRoomCount: rt.rooms.filter((r) => r.isActive).length,
    imageUrl: rt.images[0]?.url ?? null,
    reservationCount: rt._count.reservationRooms,
  }));
}

export type RoomTypeEditDTO = {
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
  amenityIds: string[];
  images: Array<{ id: string; url: string; altEn: string; altAr: string }>;
  reservationCount: number;
  roomCount: number;
};

export async function getRoomTypeForEdit(id: string): Promise<RoomTypeEditDTO | null> {
  const rt = await prisma.roomType.findUnique({
    where: { id },
    include: { amenities: { select: { amenityId: true } }, images: { orderBy: { sortOrder: "asc" } }, _count: { select: { reservationRooms: true, rooms: true } } },
  });
  if (!rt) return null;
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
    amenityIds: rt.amenities.map((a) => a.amenityId),
    images: rt.images.map((i) => ({ id: i.id, url: i.url, altEn: i.altEn, altAr: i.altAr })),
    reservationCount: rt._count.reservationRooms,
    roomCount: rt._count.rooms,
  };
}

export type AmenityDTO = { id: string; key: string; labelEn: string; labelAr: string; icon: string; category: string };

export async function listAmenities(): Promise<AmenityDTO[]> {
  const list = await prisma.amenity.findMany({ orderBy: { sortOrder: "asc" } });
  return list.map((a) => ({ id: a.id, key: a.key, labelEn: a.labelEn, labelAr: a.labelAr, icon: a.icon, category: a.category }));
}

export type RoomRowDTO = {
  id: string;
  roomTypeId: string;
  number: string;
  floor: number;
  hasBalcony: boolean;
  isActive: boolean;
  notes: string | null;
  reservationCount: number;
};

export async function listRooms(): Promise<RoomRowDTO[]> {
  const list = await prisma.room.findMany({ orderBy: [{ floor: "asc" }, { number: "asc" }], include: { _count: { select: { reservationRooms: true } } } });
  return list.map((r) => ({ id: r.id, roomTypeId: r.roomTypeId, number: r.number, floor: r.floor, hasBalcony: r.hasBalcony, isActive: r.isActive, notes: r.notes, reservationCount: r._count.reservationRooms }));
}

export type RoomTypeOptionDTO = { id: string; nameEn: string; nameAr: string; code: string; baseRate: string; isActive: boolean };

export async function listRoomTypeOptions(): Promise<RoomTypeOptionDTO[]> {
  const list = await prisma.roomType.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true, nameAr: true, code: true, baseRate: true, isActive: true } });
  return list.map((r) => ({ ...r, baseRate: r.baseRate.toString() }));
}

/* ------------------------------------------------------------------ Rates */

export type RatePlanDTO = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  type: RatePlanType;
  adjustmentType: AdjustmentType;
  adjustmentValue: string;
  includesBreakfast: boolean;
  refundable: boolean;
  cancellationDeadlineDays: number;
  cancellationPolicyEn: string;
  cancellationPolicyAr: string;
  minNights: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  sortOrder: number;
  reservationCount: number;
};

export async function listRatePlans(): Promise<RatePlanDTO[]> {
  const list = await prisma.ratePlan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { reservationRooms: true } } } });
  return list.map((p) => ({
    id: p.id,
    code: p.code,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    descriptionEn: p.descriptionEn,
    descriptionAr: p.descriptionAr,
    type: p.type,
    adjustmentType: p.adjustmentType,
    adjustmentValue: p.adjustmentValue.toString(),
    includesBreakfast: p.includesBreakfast,
    refundable: p.refundable,
    cancellationDeadlineDays: p.cancellationDeadlineDays,
    cancellationPolicyEn: p.cancellationPolicyEn,
    cancellationPolicyAr: p.cancellationPolicyAr,
    minNights: p.minNights,
    validFrom: p.validFrom ? dbDateToIso(p.validFrom) : null,
    validTo: p.validTo ? dbDateToIso(p.validTo) : null,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    reservationCount: p._count.reservationRooms,
  }));
}

export type SeasonDTO = {
  id: string;
  nameEn: string;
  nameAr: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  rates: Array<{ roomTypeId: string; rate: string }>;
};

export async function listSeasons(): Promise<SeasonDTO[]> {
  const list = await prisma.season.findMany({ orderBy: { startDate: "asc" }, include: { rates: true } });
  return list.map((s) => ({
    id: s.id,
    nameEn: s.nameEn,
    nameAr: s.nameAr,
    startDate: dbDateToIso(s.startDate),
    endDate: dbDateToIso(s.endDate),
    isActive: s.isActive,
    rates: s.rates.map((r) => ({ roomTypeId: r.roomTypeId, rate: r.rate.toString() })),
  }));
}

export type RateOverrideDTO = {
  id: string;
  roomTypeId: string;
  date: string;
  rate: string | null;
  minStay: number | null;
  closed: boolean;
  maxInventory: number | null;
  note: string | null;
};

export async function listRateOverrides(opts?: { from?: string }): Promise<RateOverrideDTO[]> {
  const list = await prisma.rateOverride.findMany({
    where: opts?.from ? { date: { gte: new Date(`${opts.from}T00:00:00Z`) } } : undefined,
    orderBy: [{ date: "asc" }, { roomType: { sortOrder: "asc" } }],
    take: 400,
  });
  return list.map((o) => ({ id: o.id, roomTypeId: o.roomTypeId, date: dbDateToIso(o.date), rate: o.rate ? o.rate.toString() : null, minStay: o.minStay, closed: o.closed, maxInventory: o.maxInventory, note: o.note }));
}

export type PromotionDTO = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  type: AdjustmentType;
  value: string;
  minNights: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  reservationCount: number;
};

export async function listPromotions(): Promise<PromotionDTO[]> {
  const list = await prisma.promotion.findMany({ orderBy: { validFrom: "desc" }, include: { _count: { select: { reservations: true } } } });
  return list.map((p) => ({ id: p.id, code: p.code, nameEn: p.nameEn, nameAr: p.nameAr, type: p.type, value: p.value.toString(), minNights: p.minNights, validFrom: dbDateToIso(p.validFrom), validTo: dbDateToIso(p.validTo), isActive: p.isActive, reservationCount: p._count.reservations }));
}

export type ExtraDTO = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: string;
  pricing: ExtraPricing;
  isInquiryOnly: boolean;
  isActive: boolean;
  sortOrder: number;
  icon: string;
  reservationCount: number;
};

export async function listExtras(): Promise<ExtraDTO[]> {
  const list = await prisma.extra.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { reservationExtras: true } } } });
  return list.map((e) => ({ id: e.id, code: e.code, nameEn: e.nameEn, nameAr: e.nameAr, descriptionEn: e.descriptionEn, descriptionAr: e.descriptionAr, price: e.price.toString(), pricing: e.pricing, isInquiryOnly: e.isInquiryOnly, isActive: e.isActive, sortOrder: e.sortOrder, icon: e.icon, reservationCount: e._count.reservationExtras }));
}

/* ------------------------------------------------------------------ Content */

export type ContentBlockAdminDTO = {
  id: string;
  key: string;
  page: string;
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
  isVisible: boolean;
  updatedAt: Date;
};

export async function listContentBlocks(): Promise<ContentBlockAdminDTO[]> {
  const list = await prisma.contentBlock.findMany({ orderBy: [{ page: "asc" }, { sortOrder: "asc" }] });
  return list.map((b) => ({ id: b.id, key: b.key, page: b.page, section: b.section, titleEn: b.titleEn, titleAr: b.titleAr, subtitleEn: b.subtitleEn, subtitleAr: b.subtitleAr, bodyEn: b.bodyEn, bodyAr: b.bodyAr, imageUrl: b.imageUrl, linkHref: b.linkHref, sortOrder: b.sortOrder, isVisible: b.isVisible, updatedAt: b.updatedAt }));
}

export type GalleryImageAdminDTO = {
  id: string;
  url: string;
  captionEn: string;
  captionAr: string;
  category: GalleryCategory;
  width: number;
  height: number;
  source: string;
  sortOrder: number;
  isVisible: boolean;
};

export async function listGalleryImages(): Promise<GalleryImageAdminDTO[]> {
  const list = await prisma.galleryImage.findMany({ orderBy: { sortOrder: "asc" } });
  return list.map((g) => ({ id: g.id, url: g.url, captionEn: g.captionEn, captionAr: g.captionAr, category: g.category, width: g.width, height: g.height, source: g.source, sortOrder: g.sortOrder, isVisible: g.isVisible }));
}

export type PolicyAdminDTO = {
  id: string;
  key: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  sortOrder: number;
  isVisible: boolean;
  isVerified: boolean;
};

export async function listPolicies(): Promise<PolicyAdminDTO[]> {
  const list = await prisma.hotelPolicy.findMany({ orderBy: { sortOrder: "asc" } });
  return list.map((p) => ({ id: p.id, key: p.key, titleEn: p.titleEn, titleAr: p.titleAr, bodyEn: p.bodyEn, bodyAr: p.bodyAr, sortOrder: p.sortOrder, isVisible: p.isVisible, isVerified: p.isVerified }));
}

/* ------------------------------------------------------------------ Inbox */

export type ContactMessageDTO = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  locale: string;
  isRead: boolean;
  createdAt: Date;
};

export async function listContactMessages(filter: "all" | "unread"): Promise<{ rows: ContactMessageDTO[]; total: number; unread: number }> {
  const [rows, total, unread] = await Promise.all([
    prisma.contactMessage.findMany({ where: filter === "unread" ? { isRead: false } : undefined, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);
  return { rows: rows.map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, subject: m.subject, message: m.message, locale: m.locale, isRead: m.isRead, createdAt: m.createdAt })), total, unread };
}
