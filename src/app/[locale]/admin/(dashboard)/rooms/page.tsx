import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/current-user";
import { requirePage } from "@/lib/admin/page-guard";
import { listRoomTypeOptions, listRoomTypeRows, listRooms } from "@/lib/data/admin-catalog";
import { getSettings } from "@/lib/data/public";
import { PageHeader } from "@/components/admin/page-header";
import { UrlTabs } from "@/components/admin/url-tabs";
import { RoomTypeTable } from "@/components/admin/rooms/room-type-table";
import { RoomInventory } from "@/components/admin/rooms/room-inventory";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.rooms" });
  return { title: t("title") };
}

export default async function RoomsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage("rooms.view");
  const sp = await searchParams;
  const t = await getTranslations("admin.rooms");
  const [types, rooms, options, settings] = await Promise.all([listRoomTypeRows(), listRooms(), listRoomTypeOptions(), getSettings()]);
  const canManage = can(user, "rooms.manage");
  const tab = sp.tab === "inventory" ? "inventory" : "types";
  const activeRooms = rooms.filter((r) => r.isActive).length;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("summary", { types: types.length, active: activeRooms, total: rooms.length })}
        actions={canManage ? <Button asChild variant="accent"><Link href="/admin/rooms/new"><Plus />{t("newType")}</Link></Button> : undefined}
      />
      <UrlTabs defaultValue={tab}>
        <TabsList aria-label={t("title")}>
          <TabsTrigger value="types">{t("types")}</TabsTrigger>
          <TabsTrigger value="inventory">{t("inventory")}</TabsTrigger>
        </TabsList>
        <TabsContent value="types"><RoomTypeTable rows={types} canManage={canManage} currency={settings.currency} /></TabsContent>
        <TabsContent value="inventory"><RoomInventory rooms={rooms} roomTypes={options} canManage={canManage} /></TabsContent>
      </UrlTabs>
    </>
  );
}
