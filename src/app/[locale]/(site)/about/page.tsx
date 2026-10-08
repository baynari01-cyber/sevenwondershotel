import Image from "next/image";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpDown, Bath, BedDouble, Building2, Languages, Mail, Phone, Sun, UtensilsCrossed, Waves, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { getContentBlocks, getPolicies, getSettings } from "@/lib/data/public";
import { pickLocale } from "@/lib/utils/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

type FactKey = "built" | "rooms" | "balconies" | "lift" | "pool" | "baths" | "dining" | "languages";

const FACTS: Array<{ key: FactKey; icon: LucideIcon }> = [
  { key: "built", icon: Building2 },
  { key: "rooms", icon: BedDouble },
  { key: "balconies", icon: Sun },
  { key: "lift", icon: ArrowUpDown },
  { key: "pool", icon: Waves },
  { key: "baths", icon: Bath },
  { key: "dining", icon: UtensilsCrossed },
  { key: "languages", icon: Languages },
];

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  const locale = await getLocale();
  const t = await getTranslations("about");
  const tc = await getTranslations("common");
  const tContact = await getTranslations("contact");
  const [settings, blocks, policies] = await Promise.all([getSettings(), getContentBlocks("about"), getPolicies()]);

  const [lead, ...rest] = blocks;

  return (
    <>
      {/* Opening: heading beside the lead image */}
      <section className="container-x grid items-end gap-10 py-16 lg:grid-cols-12 lg:gap-16 lg:py-24">
        <div className="animate-fade-up lg:col-span-5">
          <SectionHeading as="h1" eyebrow={t("eyebrow")} title={t("title")} body={lead ? pickLocale(lead, "body", locale) : pickLocale(settings, "tagline", locale)} />
        </div>
        <div className="animate-fade-up [animation-delay:150ms] lg:col-span-7">
          <div className="img-grade img-warm relative aspect-[4/3] overflow-hidden rounded-lg lg:aspect-[16/11]">
            <Image
              src={lead?.imageUrl ?? "/images/hotel/hotel-exterior-rooftop.webp"}
              alt={lead ? pickLocale(lead, "title", locale) : pickLocale(settings, "name", locale)}
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
          </div>
          {lead ? <p className="mt-4 font-display text-xl text-charcoal sm:text-2xl">{pickLocale(lead, "title", locale)}</p> : null}
        </div>
      </section>

      {/* Remaining story blocks in a flowing editorial rhythm */}
      {rest.length > 0 ? (
        <div className="border-t border-charcoal/10 bg-ivory-soft py-20 lg:py-28">
          <div className="container-x space-y-24 lg:space-y-32">
            {rest.map((block, i) => {
              const flip = i % 2 === 0;
              const title = pickLocale(block, "title", locale);
              return (
                <Reveal key={block.key}>
                  <section id={block.section} className="grid items-center gap-8 scroll-mt-28 lg:grid-cols-12 lg:gap-12">
                    <div className={`img-grade img-warm relative aspect-[4/5] overflow-hidden rounded-lg sm:aspect-[16/10] lg:col-span-7 lg:aspect-[4/3] ${flip ? "lg:order-2" : ""}`}>
                      {block.imageUrl ? <Image src={block.imageUrl} alt={title} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" /> : null}
                    </div>
                    <div className={`lg:col-span-5 ${flip ? "lg:order-1 lg:pe-8" : "lg:ps-8"}`}>
                      {block.subtitleEn || block.subtitleAr ? <p className="eyebrow">{pickLocale(block, "subtitle", locale)}</p> : null}
                      <h2 className="display-md mt-3">{title}</h2>
                      <div className="hairline-copper mt-5" />
                      <p className="mt-5 leading-relaxed text-muted-foreground">{pickLocale(block, "body", locale)}</p>
                    </div>
                  </section>
                </Reveal>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* At a glance */}
      <section className="py-20 lg:py-28">
        <div className="container-x">
          <Reveal>
            <SectionHeading eyebrow={t("eyebrow")} title={t("factsTitle")} align="center" />
          </Reveal>
          <ul className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-charcoal/10 bg-charcoal/10 lg:grid-cols-4">
            {FACTS.map(({ key, icon: Icon }, i) => (
              <li key={key} className="bg-white">
                <Reveal delay={i * 0.04} className="flex h-full flex-col gap-4 p-5 sm:p-7">
                  <Icon className="size-6 text-copper" strokeWidth={1.5} aria-hidden="true" />
                  <p className="text-sm leading-snug text-charcoal sm:text-base">{t(`facts.${key}`)}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Good to know */}
      <section className="border-y border-charcoal/10 bg-sand-100/50 py-20 lg:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-4">
            <SectionHeading title={t("policiesTitle")} body={t("policiesBody")} />
            <div className="mt-8 flex flex-col gap-2 text-xs text-stone">
              <span className="inline-flex items-center gap-2"><Badge variant="success">{tc("verified")}</Badge></span>
              <span className="inline-flex items-center gap-2"><Badge variant="warning">{tc("unverified")}</Badge></span>
            </div>
          </Reveal>
          <div className="lg:col-span-8">
            <dl className="divide-y divide-charcoal/10 rounded-lg border border-charcoal/10 bg-white shadow-soft">
              {policies.map((p) => (
                <div key={p.key} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-8 sm:p-6">
                  <dt>
                    <span className="font-display text-lg leading-tight text-charcoal">{pickLocale(p, "title", locale)}</span>
                    <span className="mt-2 block">
                      <Badge variant={p.isVerified ? "success" : "warning"}>{p.isVerified ? tc("verified") : tc("unverified")}</Badge>
                    </span>
                  </dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">{pickLocale(p, "body", locale)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Reservation team */}
      <section className="py-20 lg:py-28">
        <div className="container-x">
          <Reveal className="relative overflow-hidden rounded-lg bg-charcoal text-ivory">
            <Image src="/images/hotel/lobby-lounge.webp" alt="" fill sizes="100vw" className="object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/85 to-charcoal/40 rtl:bg-gradient-to-l" aria-hidden="true" />
            <div className="relative z-10 grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:items-center lg:p-16">
              <div>
                <p className="eyebrow text-sand-300">{tContact("eyebrow")}</p>
                <h2 className="display-md mt-3 text-ivory">{t("teamTitle")}</h2>
                <div className="hairline-copper mt-5" />
                <p className="mt-5 text-ivory/75">{t("teamBody")}</p>
                <p className="mt-2 text-sm text-ivory/60">{tContact("hours", { checkIn: settings.checkInTime, checkOut: settings.checkOutTime })}</p>
              </div>
              <ul className="space-y-4">
                <li>
                  <a href={`tel:${settings.phone.replace(/\s+/g, "")}`} className="group flex items-center gap-4 rounded-md border border-ivory/15 bg-ivory/5 p-4 transition-colors hover:bg-ivory/10">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-copper text-white"><Phone className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-widest text-sand-300">{tContact("phone")}</span>
                      <span className="num block text-base font-medium text-ivory">{settings.phone}</span>
                    </span>
                  </a>
                </li>
                {settings.phoneSecondary ? (
                  <li>
                    <a href={`tel:${settings.phoneSecondary.replace(/\s+/g, "")}`} className="group flex items-center gap-4 rounded-md border border-ivory/15 bg-ivory/5 p-4 transition-colors hover:bg-ivory/10">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-copper text-white"><Phone className="size-4" aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-widest text-sand-300">{tContact("mobile")}</span>
                        <span className="num block text-base font-medium text-ivory">{settings.phoneSecondary}</span>
                      </span>
                    </a>
                  </li>
                ) : null}
                <li>
                  <a href={`mailto:${settings.email}`} className="group flex items-center gap-4 rounded-md border border-ivory/15 bg-ivory/5 p-4 transition-colors hover:bg-ivory/10">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-copper text-white"><Mail className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-widest text-sand-300">{tContact("email")}</span>
                      <span className="ltr-field block truncate text-base font-medium text-ivory">{settings.email}</span>
                    </span>
                  </a>
                </li>
                <li className="pt-2">
                  <Button asChild variant="inverse"><Link href="/contact">{tContact("formTitle")}</Link></Button>
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
