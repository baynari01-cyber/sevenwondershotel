import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const intl = createIntlMiddleware(routing);

const ADMIN_PATH = /^\/(?:(en|ar)\/)?admin(?:\/|$)/;
const LOGIN_PATH = /^\/(?:(en|ar)\/)?admin\/login(?:\/|$)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optimistic admin gate: full session verification happens server-side in the admin layout
  // and in every server action. This only prevents unauthenticated users from loading admin HTML.
  if (ADMIN_PATH.test(pathname) && !LOGIN_PATH.test(pathname)) {
    const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!hasSession) {
      const localeMatch = pathname.match(/^\/(en|ar)\//);
      const prefix = localeMatch && localeMatch[1] !== routing.defaultLocale ? `/${localeMatch[1]}` : "";
      const url = request.nextUrl.clone();
      url.pathname = `${prefix}/admin/login`;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return intl(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
