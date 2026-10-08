"use client";
import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BarChart3, BedDouble, CalendarDays, ClipboardList, ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, PanelsTopLeft, Settings, Tags, Users, X, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import type { Permission } from "@/lib/auth/permissions";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

type Item = { key: string; href: string; icon: LucideIcon; permission: Permission; badge?: number };

export function AdminSidebar({ user, permissions, unreadMessages, pendingCount, signOut }: {
  user: { name: string; email: string; role: string };
  permissions: Permission[];
  unreadMessages: number;
  pendingCount: number;
  signOut: () => Promise<void>;
}) {
  const t = useTranslations("admin.nav");
  const tr = useTranslations("role");
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const has = (p: Permission) => permissions.includes(p);

  const allItems: Item[] = [
    { key: "overview", href: "/admin", icon: LayoutDashboard, permission: "dashboard.view" },
    { key: "reservations", href: "/admin/reservations", icon: ClipboardList, permission: "reservations.view", badge: pendingCount },
    { key: "calendar", href: "/admin/calendar", icon: CalendarDays, permission: "calendar.view" },
    { key: "rooms", href: "/admin/rooms", icon: BedDouble, permission: "rooms.view" },
    { key: "rates", href: "/admin/rates", icon: Tags, permission: "rates.view" },
    { key: "content", href: "/admin/content", icon: PanelsTopLeft, permission: "content.view" },
    { key: "inbox", href: "/admin/inbox", icon: Inbox, permission: "content.view", badge: unreadMessages },
    { key: "reports", href: "/admin/reports", icon: BarChart3, permission: "reports.view" },
    { key: "settings", href: "/admin/settings", icon: Settings, permission: "settings.view" },
    { key: "users", href: "/admin/users", icon: Users, permission: "users.manage" },
  ];
  const items = allItems.filter((i) => has(i.permission));

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-0.5">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-ivory text-charcoal" : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory")}
          >
            <item.icon className="size-4.5 shrink-0" />
            <span className="flex-1">{t(item.key as "overview")}</span>
            {item.badge ? <span className={cn("num rounded-full px-2 py-0.5 text-[10px] font-bold", active ? "bg-copper text-white" : "bg-copper/80 text-white")}>{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto space-y-3 border-t border-ivory/10 pt-4">
      <div className="px-3">
        <p className="text-[10px] uppercase tracking-wider text-ivory/50">{t("signedInAs")}</p>
        <p className="truncate text-sm font-medium text-ivory">{user.name}</p>
        <p className="truncate text-xs text-ivory/60 ltr-field">{user.email}</p>
        <Badge variant="sand" className="mt-2">{tr(user.role as "ADMIN")}</Badge>
      </div>
      <div className="flex items-center justify-between gap-2 px-3">
        <LocaleSwitcher tone="dark" />
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-ivory/70 hover:text-ivory"><ExternalLink className="size-3.5" />{t("viewSite")}</Link>
      </div>
      <form action={signOut} className="px-3">
        <button type="submit" className="flex w-full items-center gap-2 rounded-md px-0 py-2 text-sm text-ivory/70 hover:text-ivory"><LogOut className="size-4" />{t("signOut")}</button>
      </form>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-charcoal p-4 text-ivory lg:flex lg:sticky lg:top-0 lg:h-screen">
        <Link href="/admin" className="mb-8 flex items-center gap-3 px-2">
          <Image src="/images/hotel/logo-original.png" alt="" width={36} height={36} className="size-9 object-contain brightness-0 invert" />
          <span className="leading-tight"><span className="block font-display text-lg">Seven Wonders</span><span className="block text-[10px] uppercase tracking-[0.25em] text-sand-300">Hotel admin</span></span>
        </Link>
        {nav}
        {footer}
      </aside>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-ivory/10 bg-charcoal px-4 py-3 text-ivory lg:hidden">
        <Link href="/admin" className="font-display text-lg">Seven Wonders · Admin</Link>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="admin-mobile-nav" className="rounded-md p-2 hover:bg-ivory/10">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </div>
      {open ? (
        <div id="admin-mobile-nav" className="fixed inset-0 top-[52px] z-20 flex flex-col bg-charcoal p-4 text-ivory lg:hidden">
          {nav}
          {footer}
        </div>
      ) : null}
    </>
  );
}
