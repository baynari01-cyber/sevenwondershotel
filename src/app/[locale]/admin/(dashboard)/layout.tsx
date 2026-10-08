import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { permissionsFor } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/lib/actions/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/admin/login", locale });
    return null;
  }
  const [unreadMessages, pendingCount] = await Promise.all([
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.reservation.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <div className="flex min-h-screen flex-col bg-ivory-soft lg:flex-row">
      <AdminSidebar user={user} permissions={permissionsFor(user.role)} unreadMessages={unreadMessages} pendingCount={pendingCount} signOut={logoutAction} />
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
