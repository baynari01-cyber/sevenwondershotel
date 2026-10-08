"use client";
import { useTranslations } from "next-intl";
import { useAdminFeedback } from "@/components/admin/use-admin-feedback";

/**
 * `useAdminFeedback` pre-loaded with the catalogue error codes raised by the rooms / rates / content
 * actions (see `src/lib/admin/catalog.ts`) and the bare zod issue codes used by their schemas.
 */
export function useCatalogFeedback() {
  const tv = useTranslations("validation");
  return useAdminFeedback({
    DUPLICATE: tv("duplicate"),
    HAS_RESERVATIONS: tv("inUse"),
    NOT_FOUND: tv("notFound"),
    IMMUTABLE: tv("immutable"),
    INVALID_RANGE: tv("range"),
    money: tv("money"),
    date: tv("date"),
    slug: tv("slug"),
    code: tv("codeFormat"),
    number: tv("codeFormat"),
    imagePath: tv("imagePath"),
    link: tv("imagePath"),
    key: tv("codeFormat"),
    section: tv("codeFormat"),
    range: tv("range"),
    occupancy: tv("occupancy"),
    empty: tv("required"),
  });
}
