import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/current-user";
import { listUsers } from "@/lib/data/admin";
import { permissionsFor } from "@/lib/auth/permissions";
import type { Role } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/admin/page-header";
import { UsersTable } from "@/components/admin/users-table";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.settings" });
  return { title: t("users") };
}

const ROLES: Role[] = ["ADMIN", "MANAGER", "FRONT_DESK", "VIEWER"];

export default async function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser("users.manage");
  const t = await getTranslations("admin.settings");
  const tr = await getTranslations("role");
  const users = await listUsers();

  return (
    <>
      <PageHeader title={t("users")} description={t("usersCount", { count: users.length })} />
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <UsersTable users={users} currentUserId={user.id} />
        <aside className="space-y-3 self-start rounded-lg border border-charcoal/10 bg-ivory-soft p-5">
          <p className="eyebrow">{t("rolesTitle")}</p>
          <ul className="space-y-3">
            {ROLES.map((role) => (
              <li key={role} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-charcoal">{tr(role)}</span>
                  <Badge variant="neutral" className="num normal-case tracking-normal">{permissionsFor(role).length}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{t(`roleDescriptions.${role}`)}</p>
              </li>
            ))}
          </ul>
          <p className="border-t border-charcoal/10 pt-3 text-xs text-muted-foreground">{t("permissions")}: {t("lastAdmin")}</p>
        </aside>
      </div>
    </>
  );
}
