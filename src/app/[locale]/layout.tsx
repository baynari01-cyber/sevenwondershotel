import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, dirFor } from "@/i18n/routing";
import { arabic, arabicDisplay, body, display } from "@/components/site/fonts";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("siteName"), template: `%s · ${t("siteName")}` },
    description:
      locale === "ar"
        ? "فندق في وادي موسى بإطلالة على وادي البتراء، مع مسبح علوي وحمّامات تركية ومطعم البابور. نسخة تجريبية من إعداد BAYNARI."
        : "A hotel in Wadi Musa with dramatic views over the valley of Petra, a rooftop pool, Turkish baths and Al Babour Restaurant. Demonstration by BAYNARI.",
    robots: { index: false, follow: false },
    alternates: { languages: { en: "/", ar: "/ar" } },
    openGraph: { type: "website", locale: locale === "ar" ? "ar_JO" : "en_GB", siteName: t("siteName"), images: ["/images/petra/petra-treasury-night-1200.webp"] },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} dir={dirFor(locale)} className={`${display.variable} ${body.variable} ${arabic.variable} ${arabicDisplay.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <TooltipProvider delayDuration={200}>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
