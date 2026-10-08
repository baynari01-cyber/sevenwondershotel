import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/site/section-heading";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { getGallery } from "@/lib/data/public";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery" });
  return { title: t("title"), description: t("intro") };
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("gallery");
  const images = await getGallery();

  return (
    <>
      <section className="border-b border-charcoal/10 bg-ivory-soft">
        <div className="container-x py-16 lg:py-24">
          <div className="animate-fade-up">
            <SectionHeading as="h1" eyebrow={t("eyebrow")} title={t("title")} body={t("intro")} />
          </div>
        </div>
      </section>
      <section className="container-x py-12 lg:py-16">
        <GalleryGrid images={images} />
      </section>
    </>
  );
}
