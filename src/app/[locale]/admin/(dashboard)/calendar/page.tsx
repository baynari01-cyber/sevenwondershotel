import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { can, requireUser } from "@/lib/auth/current-user";
import { getCalendarData } from "@/lib/data/admin";
import { isIsoDate, todayIso } from "@/lib/utils/dates";
import { PageHeader } from "@/components/admin/page-header";
import { OccupancyCalendar } from "@/components/admin/occupancy-calendar";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.calendar" });
  return { title: t("title") };
}

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  const user = await requireUser("calendar.view");
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.calendar");
  const start = typeof sp.start === "string" && isIsoDate(sp.start) ? sp.start : todayIso();
  const days = sp.days === "30" ? 30 : 14;
  const data = await getCalendarData(start, days);
  const totalRooms = data.roomTypes.reduce((a, rt) => a + rt.rooms.length, 0);
  const inHouse = data.reservations.filter((r) => r.status === "CHECKED_IN").length;

  return (
    <>
      <PageHeader title={t("title")} description={`${t("roomsOfType", { count: totalRooms })} · ${t("legendCheckedIn")}: ${new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-GB", { numberingSystem: "latn" }).format(inHouse)}`} />
      <OccupancyCalendar data={data} canManage={can(user, "rooms.manage")} />
    </>
  );
}
