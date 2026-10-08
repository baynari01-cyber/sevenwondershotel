import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { DemoBanner } from "@/components/site/demo-banner";
import { getSettings } from "@/lib/data/public";

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSettings();
  return (
    <>
      <SiteHeader phone={settings.phone} />
      <main id="main" className="flex-1 pt-[4.5rem] lg:pt-20">
        {children}
      </main>
      {settings.demoMode ? <DemoBanner /> : null}
      <SiteFooter settings={settings} />
    </>
  );
}
