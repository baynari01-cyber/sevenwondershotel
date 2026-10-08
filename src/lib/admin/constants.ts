/** Shared enumerations for the admin catalogue (safe to import from client components). */
export const EXTRA_ICONS = ["coffee", "car", "waves", "clock", "map", "sparkles"] as const;
export type ExtraIcon = (typeof EXTRA_ICONS)[number];

export const RATE_PLAN_TYPES = ["ROOM_ONLY", "BED_AND_BREAKFAST", "FLEXIBLE", "NON_REFUNDABLE", "PROMOTIONAL"] as const;
export const ADJUSTMENT_TYPES = ["PERCENT", "FIXED"] as const;
export const EXTRA_PRICINGS = ["PER_STAY", "PER_NIGHT", "PER_PERSON", "PER_PERSON_PER_NIGHT"] as const;
export const GALLERY_CATEGORIES = ["HOTEL", "ROOMS", "DINING", "POOL", "WELLNESS", "PETRA"] as const;
export const CONTENT_PAGES = ["home", "about", "experiences", "contact"] as const;
export type ContentPage = (typeof CONTENT_PAGES)[number];
export const CONTENT_PAGE_PATHS: Record<ContentPage, string> = { home: "/", about: "/about", experiences: "/experiences", contact: "/contact" };
