import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePage } from "@/lib/admin/page-guard";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/data/public";
import { PageHeader } from "@/components/admin/page-header";
import { ManualReservationForm } from "@/components/admin/manual-reservation-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.reservations" });
  return { title: t("manualTitle") };
}

export default async function NewReservationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage("reservations.manage");
  const t = await getTranslations("admin.reservations");
  const [roomTypes, ratePlans, extras, settings] = await Promise.all([
    prisma.roomType.findMany({ where: { isActive: true }, select: { id: true, nameEn: true, nameAr: true, maxAdults: true, maxChildren: true }, orderBy: { sortOrder: "asc" } }),
    prisma.ratePlan.findMany({ where: { isActive: true }, select: { id: true, nameEn: true, nameAr: true }, orderBy: { sortOrder: "asc" } }),
    prisma.extra.findMany({ where: { isActive: true }, select: { id: true, nameEn: true, nameAr: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title={t("manualTitle")} description={t("manualHint")} />
      <ManualReservationForm roomTypes={roomTypes} ratePlans={ratePlans} extras={extras} currency={settings.currency} />
    </>
  );
}
