"use client";
import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Menu, Phone, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { key: "rooms", href: "/rooms" },
  { key: "experiences", href: "/experiences" },
  { key: "gallery", href: "/gallery" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
] as const;

export function SiteHeader({ phone }: { phone: string }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const transparent = pathname === "/";
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const dark = transparent && !scrolled && !open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        dark ? "bg-transparent text-ivory" : "bg-ivory/90 text-charcoal shadow-[0_1px_0_rgba(31,27,24,0.08)] backdrop-blur-md",
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-copper focus:px-3 focus:py-2 focus:text-white">
        {tc("skipToContent")}
      </a>
      <div className="container-x flex h-[4.5rem] items-center justify-between gap-4 lg:h-20">
        <Link href="/" className="flex items-center gap-3" aria-label={tc("siteName")}>
          <Image
            src="/images/hotel/logo-original.png"
            alt=""
            width={44}
            height={44}
            className={cn("size-10 object-contain transition-[filter]", dark ? "brightness-0 invert opacity-90" : "")}
            priority
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-tight sm:text-xl">Seven Wonders</span>
            <span className={cn("eyebrow mt-1 text-[0.6rem] tracking-[0.3em]", dark ? "text-sand-200" : "text-copper")}>Hotel · Petra</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "relative text-[0.82rem] font-medium tracking-wide transition-opacity hover:opacity-100",
                  active ? "opacity-100" : "opacity-75",
                  "after:absolute after:inset-x-0 after:-bottom-1.5 after:h-px after:origin-start after:scale-x-0 after:bg-current after:transition-transform hover:after:scale-x-100",
                  active && "after:scale-x-100",
                )}
                aria-current={active ? "page" : undefined}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className={cn("hidden items-center gap-2 text-sm md:inline-flex", dark ? "text-ivory/90" : "text-charcoal")}
            aria-label={t("callUs")}
          >
            <Phone className="size-4" />
            <span className="ltr-field num">{phone}</span>
          </a>
          <LocaleSwitcher tone={dark ? "dark" : "light"} className="hidden sm:inline-flex" />
          <Button asChild variant={dark ? "inverse" : "accent"} size="sm" className="hidden sm:inline-flex">
            <Link href="/book">{t("book")}</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn("inline-flex size-10 items-center justify-center rounded-md lg:hidden", dark ? "text-ivory" : "text-charcoal")}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? tc("closeMenu") : tc("openMenu")}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "fixed inset-0 top-[4.5rem] z-30 flex flex-col bg-ivory px-6 pb-8 pt-4 transition-[opacity,transform] duration-300 lg:hidden",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
        aria-hidden={!open}
      >
        <nav aria-label="Mobile" className="flex flex-col divide-y divide-charcoal/10">
          <Link href="/" className="py-4 font-display text-2xl" onClick={() => setOpen(false)}>{t("home")}</Link>
          {NAV.map((item) => (
            <Link key={item.key} href={item.href} className="py-4 font-display text-2xl" onClick={() => setOpen(false)}>
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Button asChild variant="accent" size="lg">
            <Link href="/book" onClick={() => setOpen(false)}>{t("book")}</Link>
          </Button>
          <div className="flex items-center justify-between">
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-2 text-sm">
              <Phone className="size-4" /> <span className="ltr-field num">{phone}</span>
            </a>
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
