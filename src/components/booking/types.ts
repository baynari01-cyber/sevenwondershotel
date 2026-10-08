import type { AvailabilitySearch } from "@/lib/booking/service";

export type SelectedRoom = {
  key: string;
  roomTypeId: string;
  ratePlanId: string | null;
  adults: number;
  children: number;
};

export type GuestDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  arrivalTime: string;
  specialRequests: string;
};

export type WizardState = {
  step: number;
  search: { checkIn: string; checkOut: string; adults: number; children: number; rooms: number; promotionCode: string };
  availability: AvailabilitySearch | null;
  selectedRooms: SelectedRoom[];
  extras: Record<string, number>;
  guest: GuestDraft;
  paymentMethod: "PAY_AT_PROPERTY" | "SIMULATED_CARD";
  acceptTerms: boolean;
};

export const STEPS = ["search", "availability", "rates", "extras", "guest", "review"] as const;
export type StepKey = (typeof STEPS)[number];
