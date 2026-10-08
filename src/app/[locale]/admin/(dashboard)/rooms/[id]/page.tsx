import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/current-user";
import { requirePage } from "@/lib/admin/page-guard";
import { getRoomTypeForEdit, listAmenities } from "@/lib/data/admin-catalog";
import { getSettings } from "@/lib/data/public";
import { pickLocale } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { RoomTypeForm } from "@/components/admin/rooms/room-type-form";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "admin.rooms" });
  const rt = await getRoomTypeForEdit(id);
  return { title: rt ? `${t("editType")} · ${pickLocale(rt, "name", locale)}` : t("editType") };
}

export default async function EditRoomTypePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: paramLocale, id } = await params;
  setRequestLocale(paramLocale);
  const user = await requirePage("rooms.view");
  const locale = await getLocale();
  const [rt, amenities, settings] = await Promise.all([getRoomTypeForEdit(id), listAmenities(), getSettings()]);
  if (!rt) notFound();
  const t = await getTranslations("admin.rooms");
  const canManage = can(user, "rooms.manage");

  return (
    <>
      <Link href="/admin/rooms?tab=types" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-copper"><ArrowLeft className="size-4 rtl:-scale-x-100" />{t("title")}</Link>
      <PageHeader
        title={pickLocale(rt, "name", locale)}
        description={`${t("editType")} · ${rt.code}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {rt.isFeatured ? <Badge variant="sand">{t("featured")}</Badge> : null}
            <Badge variant={rt.isActive ? "success" : "neutral"}>{rt.isActive ? t("active") : t("inactive")}</Badge>
          </div>
        }
      />
      <RoomTypeForm key={rt.id} roomType={rt} amenities={amenities} canManage={canManage} currency={settings.currency} />
    </>
  );
}
