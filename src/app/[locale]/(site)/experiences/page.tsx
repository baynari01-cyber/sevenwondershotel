import Image from "next/image";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Compass, Info, Moon, Sunrise, Ticket, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { getContentBlocks } from "@/lib/data/public";
import { pickLocale } from "@/lib/utils/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "experiences" });
  return { title: t("title"), description: t("intro") };
}

const TIPS: Array<{ key: "ticket" | "night" | "walk" | "beidha"; icon: LucideIcon }> = [
  { key: "ticket", icon: Ticket },
  { key: "night", icon: Moon },
  { key: "walk", icon: Sunrise },
  { key: "beidha", icon: Compass },
];

export default async function ExperiencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  const locale = await getLocale();
  const t = await getTranslations("experiences");
  const tc = await getTranslations("common");
  const blocks = await getContentBlocks("experiences");

  return (
    <>
      {/* Hero band */}
      <section className="relative overflow-hidden bg-charcoal text-ivory">
        <Image src="/images/hotel/terrace-evening.webp" alt="" fill priority sizes="100vw" className="object-cover object-center opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/30" aria-hidden="true" />
        <div className="grain absolute inset-0" aria-hidden="true" />
        <div className="container-x relative z-10 py-24 lg:py-36">
          <div className="animate-fade-up">
            <SectionHeading as="h1" tone="dark" eyebrow={t("eyebrow")} title={t("title")} body={t("intro")} />
          </div>
          {blocks.length > 0 ? (
            <nav aria-label={t("title")} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 animate-fade-up [animation-delay:150ms]">
              {blocks.map((b) => (
                <a key={b.key} href={`#${b.section}`} className="text-xs uppercase tracking-[0.2em] text-sand-200/80 transition-colors hover:text-ivory">
                  {pickLocale(b, "title", locale)}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      {/* One editorial section per content block */}
      <div className="py-20 lg:py-28">
        <div className="container-x space-y-24 lg:space-y-32">
          {blocks.map((block, i) => {
            const flip = i % 2 === 1;
            const title = pickLocale(block, "title", locale);
            return (
              <Reveal key={block.key}>
                <section id={block.section} aria-labelledby={`${block.section}-title`} className="grid items-center gap-8 scroll-mt-28 lg:grid-cols-12 lg:gap-12">
                  <div className={`img-grade img-warm relative aspect-[16/10] overflow-hidden rounded-lg lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
                    {block.imageUrl ? <Image src={block.imageUrl} alt={title} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" /> : null}
                    <span className="num absolute start-5 top-5 z-10 font-display text-sm tracking-widest text-ivory/80">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className={`lg:col-span-5 ${flip ? "lg:order-1 lg:pe-8" : "lg:ps-8"}`}>
                    {block.subtitleEn || block.subtitleAr ? <p className="eyebrow">{pickLocale(block, "subtitle", locale)}</p> : null}
                    <h2 id={`${block.section}-title`} className="display-md mt-3">{title}</h2>
                    <div className="hairline-copper mt-5" />
                    <p className="mt-5 leading-relaxed text-muted-foreground">{pickLocale(block, "body", locale)}</p>
                    {block.linkHref ? (
                      <Link href={block.linkHref} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-copper hover:text-copper-deep">
                        {tc("learnMore")} <ArrowUpRight className="size-4 rtl:-scale-x-100" />
                      </Link>
                    ) : null}
                  </div>
                </section>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Plan your Petra days */}
      <section className="border-y border-charcoal/10 bg-sand-100/50 py-20 lg:py-28">
        <div className="container-x">
          <Reveal>
            <SectionHeading eyebrow={t("tipsEyebrow")} title={t("petraTitle")} align="center" />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TIPS.map(({ key, icon: Icon }, i) => (
              <Reveal key={key} delay={i * 0.08} className="flex">
                <article className="flex flex-1 flex-col rounded-lg border border-charcoal/10 bg-white p-6 shadow-soft">
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-sand-100 text-copper">
                    <Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-display text-xl">{t(`petraTipTitles.${key}`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`petraTips.${key}`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="mx-auto mt-8 flex max-w-2xl items-start justify-center gap-2 text-center text-xs text-stone">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>{t("tipsNote")}</span>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-charcoal py-24 text-center text-ivory">
        <Image src="/images/hotel/twin-room-balcony-curtains.webp" alt="" fill sizes="100vw" className="object-cover opacity-30" />
        <div className="container-x relative z-10">
          <Reveal>
            <h2 className="display-lg text-ivory">{t("ctaTitle")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-ivory/75">{t("ctaBody")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild variant="accent" size="lg"><Link href="/book">{tc("bookNow")}</Link></Button>
              <Button asChild variant="inverseOutline" size="lg"><Link href="/rooms">{tc("viewAll")}</Link></Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
