import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { can } from "@/lib/auth/current-user";
import { requirePage } from "@/lib/admin/page-guard";
import { listContentBlocks, listGalleryImages, listPolicies } from "@/lib/data/admin-catalog";
import { PageHeader } from "@/components/admin/page-header";
import { UrlTabs } from "@/components/admin/url-tabs";
import { ContentBlocksPanel } from "@/components/admin/content/content-blocks";
import { GalleryManager } from "@/components/admin/content/gallery-manager";
import { PoliciesPanel } from "@/components/admin/content/policies";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.content" });
  return { title: t("title") };
}

const TABS = ["blocks", "gallery", "policies"] as const;
type Tab = (typeof TABS)[number];

export default async function ContentPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage("content.view");
  const sp = await searchParams;
  const t = await getTranslations("admin.content");
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "blocks";
  const [blocks, gallery, policies] = await Promise.all([listContentBlocks(), listGalleryImages(), listPolicies()]);
  const canManage = can(user, "content.manage");

  return (
    <>
      <PageHeader title={t("title")} description={t("summary", { blocks: blocks.length, images: gallery.filter((g) => g.isVisible).length, policies: policies.length })} />
      <UrlTabs defaultValue={tab}>
        <TabsList aria-label={t("title")}>
          <TabsTrigger value="blocks">{t("blocks")}</TabsTrigger>
          <TabsTrigger value="gallery">{t("gallery")}</TabsTrigger>
          <TabsTrigger value="policies">{t("policies")}</TabsTrigger>
        </TabsList>
        <TabsContent value="blocks"><ContentBlocksPanel blocks={blocks} canManage={canManage} /></TabsContent>
        <TabsContent value="gallery"><GalleryManager images={gallery} canManage={canManage} /></TabsContent>
        <TabsContent value="policies"><PoliciesPanel policies={policies} canManage={canManage} /></TabsContent>
      </UrlTabs>
    </>
  );
}
