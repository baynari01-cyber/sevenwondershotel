import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { can } from "@/lib/auth/current-user";
import { requirePage } from "@/lib/admin/page-guard";
import { listExtras, listPromotions, listRateOverrides, listRatePlans, listRoomTypeOptions, listSeasons } from "@/lib/data/admin-catalog";
import { getSettings } from "@/lib/data/public";
import { todayIso } from "@/lib/utils/dates";
import { PageHeader } from "@/components/admin/page-header";
import { UrlTabs } from "@/components/admin/url-tabs";
import { RatePlansPanel } from "@/components/admin/rates/rate-plans";
import { SeasonsPanel } from "@/components/admin/rates/seasons";
import { OverridesPanel } from "@/components/admin/rates/overrides";
import { PromotionsPanel } from "@/components/admin/rates/promotions";
import { ExtrasPanel } from "@/components/admin/rates/extras";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.rates" });
  return { title: t("title") };
}

const TABS = ["plans", "seasons", "overrides", "promotions", "extras"] as const;
type Tab = (typeof TABS)[number];

export default async function RatesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage("rates.view");
  const sp = await searchParams;
  const t = await getTranslations("admin.rates");
  const tc = await getTranslations("common");
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "plans";
  const [plans, seasons, overrides, promotions, extras, roomTypes, settings] = await Promise.all([
    listRatePlans(),
    listSeasons(),
    listRateOverrides({ from: todayIso() }),
    listPromotions(),
    listExtras(),
    listRoomTypeOptions(),
    getSettings(),
  ]);
  const canManage = can(user, "rates.manage");
  const weekendNames = settings.weekendDays.map((d) => new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 2, 1 + d)))).join(locale === "ar" ? "، " : ", ");

  return (
    <>
      <PageHeader title={t("title")} description={`${t("weekendDays")}: ${weekendNames} · ${t("currencyNote", { currency: settings.currency })}`} />
      <UrlTabs defaultValue={tab}>
        <TabsList aria-label={t("title")} className="max-w-full">
          <TabsTrigger value="plans">{t("ratePlans")}</TabsTrigger>
          <TabsTrigger value="seasons">{t("seasons")}</TabsTrigger>
          <TabsTrigger value="overrides">{t("overrides")}</TabsTrigger>
          <TabsTrigger value="promotions">{t("promotions")}</TabsTrigger>
          <TabsTrigger value="extras">{t("extras")}</TabsTrigger>
        </TabsList>
        <TabsContent value="plans"><RatePlansPanel plans={plans} canManage={canManage} currency={settings.currency} /></TabsContent>
        <TabsContent value="seasons"><SeasonsPanel seasons={seasons} roomTypes={roomTypes} canManage={canManage} currency={settings.currency} /></TabsContent>
        <TabsContent value="overrides"><OverridesPanel overrides={overrides} roomTypes={roomTypes} canManage={canManage} currency={settings.currency} /></TabsContent>
        <TabsContent value="promotions"><PromotionsPanel promotions={promotions} canManage={canManage} currency={settings.currency} /></TabsContent>
        <TabsContent value="extras"><ExtrasPanel extras={extras} canManage={canManage} currency={settings.currency} /></TabsContent>
      </UrlTabs>
      <p className="mt-8 text-xs text-stone">{tc("demoRates")} · {tc("demoNotice")}</p>
    </>
  );
}
