import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { roleHas, type Permission } from "@/lib/auth/permissions";

/**
 * Page-level guard for admin routes: unauthenticated users go to the login page,
 * authenticated users without the permission are sent back to the overview with a notice.
 * (Server actions use `guarded()` separately, so authorization never relies on the UI.)
 */
export async function requirePage(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) {
    redirect({ href: "/admin/login", locale });
    throw new Error("UNAUTHENTICATED");
  }
  if (!roleHas(user.role, permission)) {
    redirect({ href: "/admin?forbidden=1", locale });
    throw new Error("FORBIDDEN");
  }
  return user;
}
