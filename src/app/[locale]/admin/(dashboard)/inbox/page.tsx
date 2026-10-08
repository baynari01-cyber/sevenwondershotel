import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { can } from "@/lib/auth/current-user";
import { requirePage } from "@/lib/admin/page-guard";
import { listContactMessages } from "@/lib/data/admin-catalog";
import { PageHeader } from "@/components/admin/page-header";
import { InboxList } from "@/components/admin/content/inbox-list";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.inbox" });
  return { title: t("title") };
}

export default async function InboxPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage("content.view");
  const sp = await searchParams;
  const t = await getTranslations("admin.inbox");
  const filter = sp.filter === "unread" ? "unread" : "all";
  const { rows, total, unread } = await listContactMessages(filter);
  return (
    <>
      <PageHeader title={t("title")} description={t("summary", { total, unread })} />
      <InboxList messages={rows} filter={filter} unread={unread} canManage={can(user, "content.manage")} />
    </>
  );
}
