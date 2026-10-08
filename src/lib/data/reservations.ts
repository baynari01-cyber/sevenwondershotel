import "server-only";
import { prisma } from "@/lib/db";
import { dbDateToIso } from "@/lib/utils/dates";

export type ReservationPublicDTO = {
  id: string;
  reference: string;
  status: string;
  source: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  currency: string;
  roomSubtotal: string;
  extrasTotal: string;
  discountTotal: string;
  taxTotal: string;
  serviceChargeTotal: string;
  grandTotal: string;
  paymentStatus: string;
  paymentMethod: string;
  specialRequests: string | null;
  arrivalTime: string | null;
  promotionCode: string | null;
  cancellationPolicyEn: string;
  cancellationPolicyAr: string;
  locale: string;
  createdAt: Date;
  guest: { firstName: string; lastName: string; email: string; phone: string; country: string };
  rooms: Array<{ id: string; roomTypeNameEn: string; roomTypeNameAr: string; roomNumber: string | null; ratePlanNameEn: string; ratePlanNameAr: string; adults: number; children: number; roomTotal: string; nightly: Array<{ date: string; rate: string }> }>;
  extras: Array<{ id: string; nameEn: string; nameAr: string; quantity: number; unitPrice: string; total: string }>;
};

export async function getReservationByReference(reference: string): Promise<ReservationPublicDTO | null> {
  const r = await prisma.reservation.findUnique({
    where: { reference: reference.trim().toUpperCase() },
    include: { guest: true, rooms: { include: { roomType: true, room: true, ratePlan: true } }, extras: true },
  });
  if (!r) return null;
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    source: r.source,
    checkIn: dbDateToIso(r.checkIn),
    checkOut: dbDateToIso(r.checkOut),
    nights: r.nights,
    adults: r.adults,
    children: r.children,
    currency: r.currency,
    roomSubtotal: r.roomSubtotal.toString(),
    extrasTotal: r.extrasTotal.toString(),
    discountTotal: r.discountTotal.toString(),
    taxTotal: r.taxTotal.toString(),
    serviceChargeTotal: r.serviceChargeTotal.toString(),
    grandTotal: r.grandTotal.toString(),
    paymentStatus: r.paymentStatus,
    paymentMethod: r.paymentMethod,
    specialRequests: r.specialRequests,
    arrivalTime: r.arrivalTime,
    promotionCode: r.promotionCode,
    cancellationPolicyEn: r.cancellationPolicyEn,
    cancellationPolicyAr: r.cancellationPolicyAr,
    locale: r.locale,
    createdAt: r.createdAt,
    guest: { firstName: r.guest.firstName, lastName: r.guest.lastName, email: r.guest.email, phone: r.guest.phone, country: r.guest.country },
    rooms: r.rooms.map((rr) => ({
      id: rr.id,
      roomTypeNameEn: rr.roomType.nameEn,
      roomTypeNameAr: rr.roomType.nameAr,
      roomNumber: rr.room?.number ?? null,
      ratePlanNameEn: rr.ratePlan.nameEn,
      ratePlanNameAr: rr.ratePlan.nameAr,
      adults: rr.adults,
      children: rr.children,
      roomTotal: rr.roomTotal.toString(),
      nightly: Array.isArray(rr.nightlyRates) ? (rr.nightlyRates as Array<{ date: string; rate: string }>) : [],
    })),
    extras: r.extras.map((e) => ({ id: e.id, nameEn: e.nameEn, nameAr: e.nameAr, quantity: e.quantity, unitPrice: e.unitPrice.toString(), total: e.total.toString() })),
  };
}
