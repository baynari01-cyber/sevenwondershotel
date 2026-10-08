import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePage } from "@/lib/admin/page-guard";
import { listAmenities } from "@/lib/data/admin-catalog";
import { getSettings } from "@/lib/data/public";
import { PageHeader } from "@/components/admin/page-header";
import { RoomTypeForm } from "@/components/admin/rooms/room-type-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.rooms" });
  return { title: t("newType") };
}

export default async function NewRoomTypePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage("rooms.manage");
  const [amenities, settings] = await Promise.all([listAmenities(), getSettings()]);
  const t = await getTranslations("admin.rooms");
  return (
    <>
      <Link href="/admin/rooms?tab=types" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-copper"><ArrowLeft className="size-4 rtl:-scale-x-100" />{t("title")}</Link>
      <PageHeader title={t("newType")} description={t("newTypeHint")} />
      <RoomTypeForm roomType={null} amenities={amenities} canManage currency={settings.currency} />
    </>
  );
}
