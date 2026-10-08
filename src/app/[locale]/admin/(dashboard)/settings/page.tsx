import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/current-user";
import { requirePage } from "@/lib/admin/page-guard";
import { getSettings } from "@/lib/data/public";
import { PageHeader } from "@/components/admin/page-header";
import { FinancialForm, HotelProfileForm, PoliciesForm } from "@/components/admin/settings-form";
import { DemoResetCard } from "@/components/admin/demo-reset";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.settings" });
  return { title: t("title") };
}

const TABS = ["profile", "policies", "financial", "demo"] as const;
type Tab = (typeof TABS)[number];

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage("settings.view");
  const sp = await searchParams;
  const t = await getTranslations("admin.settings");
  const settings = await getSettings();
  const canManage = can(user, "settings.manage");
  const canReset = can(user, "demo.reset");
  const canUsers = can(user, "users.manage");
  const requested = typeof sp.tab === "string" ? (sp.tab as Tab) : "profile";
  const tab: Tab = TABS.includes(requested) && (requested !== "demo" || canReset) ? requested : "profile";

  return (
    <>
      <PageHeader title={t("title")} description={canManage ? undefined : t("readOnly")} actions={canUsers ? <Button asChild variant="outline"><Link href="/admin/users">{t("users")}</Link></Button> : undefined} />
      <Tabs defaultValue={tab}>
        <TabsList aria-label={t("title")}>
          <TabsTrigger value="profile" data-testid="tab-profile">{t("profile")}</TabsTrigger>
          <TabsTrigger value="policies" data-testid="tab-policies">{t("policies")}</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">{t("financial")}</TabsTrigger>
          {canReset ? <TabsTrigger value="demo" data-testid="tab-demo">{t("demo")}</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="profile"><HotelProfileForm settings={settings} canManage={canManage} /></TabsContent>
        <TabsContent value="policies"><PoliciesForm settings={settings} canManage={canManage} /></TabsContent>
        <TabsContent value="financial"><FinancialForm settings={settings} canManage={canManage} /></TabsContent>
        {canReset ? <TabsContent value="demo"><DemoResetCard /></TabsContent> : null}
      </Tabs>
    </>
  );
}
