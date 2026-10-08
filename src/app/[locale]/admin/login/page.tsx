import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "@/i18n/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.login" });
  return { title: t("title"), robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (user) redirect({ href: "/admin", locale });
  const { next } = await searchParams;
  const t = await getTranslations("admin.login");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-charcoal lg:block">
        <Image src="/images/hotel/rooftop-pool-night.webp" alt="" fill sizes="50vw" className="object-cover opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-ivory">
          <p className="eyebrow text-sand-300">BAYNARI</p>
          <p className="mt-3 font-display text-4xl">Seven Wonders Hotel Petra</p>
          <p className="mt-2 max-w-md text-sm text-ivory/70">{t("subtitle")}</p>
        </div>
      </div>
      <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/images/hotel/logo-original.png" alt="" width={40} height={40} className="size-10 object-contain" />
              <span className="font-display text-xl">Seven Wonders</span>
            </Link>
            <LocaleSwitcher />
          </div>
          <h1 className="display-md">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
          <div className="mt-8">
            <LoginForm next={typeof next === "string" ? next : undefined} />
          </div>
          <p className="mt-8 text-xs text-muted-foreground">{t("demoHint")}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-copper hover:text-copper-deep">← {t("backToSite")}</Link>
        </div>
      </div>
    </main>
  );
}
