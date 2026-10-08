import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date");

export const searchSchema = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(10),
  rooms: z.number().int().min(1).max(10),
});
export type SearchInput = z.infer<typeof searchSchema>;

export const roomSelectionSchema = z.object({
  roomTypeId: z.string().min(1),
  ratePlanId: z.string().min(1),
  adults: z.number().int().min(1).max(10),
  children: z.number().int().min(0).max(6),
});

export const extraSelectionSchema = z.object({
  extraId: z.string().min(1),
  quantity: z.number().int().min(0).max(10),
});

export const quoteSchema = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  rooms: z.array(roomSelectionSchema).min(1).max(10),
  extras: z.array(extraSelectionSchema).max(20),
  promotionCode: z.string().trim().max(30).optional().nullable(),
});
export type QuoteFormInput = z.infer<typeof quoteSchema>;

export const guestSchema = z.object({
  firstName: z.string().trim().min(2, "validation.minLength").max(60, "validation.maxLength"),
  lastName: z.string().trim().min(2, "validation.minLength").max(60, "validation.maxLength"),
  email: z.string().trim().email("validation.email").max(120),
  phone: z
    .string()
    .trim()
    .min(6, "validation.phone")
    .max(25, "validation.phone")
    .regex(/^[+\d][\d\s().-]{5,}$/, "validation.phone"),
  country: z.string().trim().min(2, "validation.required").max(5),
  arrivalTime: z.string().trim().max(10).optional().or(z.literal("")),
  specialRequests: z.string().trim().max(1000, "validation.maxLength").optional().or(z.literal("")),
});
export type GuestFormInput = z.infer<typeof guestSchema>;

export const createReservationSchema = quoteSchema.extend({
  guest: guestSchema,
  paymentMethod: z.enum(["PAY_AT_PROPERTY", "SIMULATED_CARD"]),
  acceptTerms: z.literal(true, { error: "validation.accept" }),
});
export type CreateReservationFormInput = z.infer<typeof createReservationSchema>;
