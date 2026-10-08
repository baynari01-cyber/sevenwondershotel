import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Navigation, Phone, Printer, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { ContactForm } from "@/components/site/contact-form";
import { blockByKey, getContentBlocks, getSettings } from "@/lib/data/public";
import { pickLocale } from "@/lib/utils/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  const locale = await getLocale();
  const t = await getTranslations("contact");
  const [settings, blocks] = await Promise.all([getSettings(), getContentBlocks("contact")]);
  const intro = blockByKey(blocks, "contact.intro");

  const digits = (value: string) => value.replace(/[^\d+]/g, "");
  const mapsEmbed = `https://www.google.com/maps?q=${settings.latitude},${settings.longitude}&z=15&output=embed&hl=${locale}`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${settings.latitude},${settings.longitude}`;
  const whatsappLink = settings.whatsapp ? `https://wa.me/${digits(settings.whatsapp).replace(/^\+/, "")}` : null;

  return (
    <>
      {/* Intro */}
      <section className="border-b border-charcoal/10 bg-ivory-soft">
        <div className="container-x py-16 lg:py-24">
          <div className="animate-fade-up">
            <SectionHeading
              as="h1"
              eyebrow={intro ? pickLocale(intro, "subtitle", locale) : t("eyebrow")}
              title={intro ? pickLocale(intro, "title", locale) : t("title")}
              body={intro ? pickLocale(intro, "body", locale) : undefined}
            />
          </div>
        </div>
      </section>

      {/* Details + form */}
      <section className="container-x grid gap-12 py-16 lg:grid-cols-12 lg:gap-16 lg:py-24">
        <Reveal className="lg:col-span-5">
          <p className="eyebrow">{t("detailsTitle")}</p>
          <h2 className="display-md mt-3">{pickLocale(settings, "name", locale)}</h2>
          <div className="hairline-copper mt-5" />

          <dl className="mt-8 divide-y divide-charcoal/10">
            <div className="flex items-start gap-4 py-4">
              <Phone className="mt-1 size-4 shrink-0 text-copper" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] uppercase tracking-widest text-stone">{t("phone")}</dt>
                <dd className="mt-0.5"><a href={`tel:${digits(settings.phone)}`} className="num text-base font-medium text-charcoal hover:text-copper">{settings.phone}</a></dd>
              </div>
            </div>
            {settings.phoneSecondary ? (
              <div className="flex items-start gap-4 py-4">
                <Smartphone className="mt-1 size-4 shrink-0 text-copper" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] uppercase tracking-widest text-stone">{t("mobile")}</dt>
                  <dd className="mt-0.5"><a href={`tel:${digits(settings.phoneSecondary)}`} className="num text-base font-medium text-charcoal hover:text-copper">{settings.phoneSecondary}</a></dd>
                </div>
              </div>
            ) : null}
            {settings.fax ? (
              <div className="flex items-start gap-4 py-4">
                <Printer className="mt-1 size-4 shrink-0 text-copper" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] uppercase tracking-widest text-stone">{t("fax")}</dt>
                  <dd className="num mt-0.5 text-base font-medium text-charcoal">{settings.fax}</dd>
                </div>
              </div>
            ) : null}
            <div className="flex items-start gap-4 py-4">
              <Mail className="mt-1 size-4 shrink-0 text-copper" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] uppercase tracking-widest text-stone">{t("email")}</dt>
                <dd className="mt-0.5"><a href={`mailto:${settings.email}`} className="ltr-field block truncate text-base font-medium text-charcoal hover:text-copper">{settings.email}</a></dd>
              </div>
            </div>
            <div className="flex items-start gap-4 py-4">
              <MapPin className="mt-1 size-4 shrink-0 text-copper" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] uppercase tracking-widest text-stone">{t("address")}</dt>
                <dd className="mt-0.5 text-base text-charcoal">
                  <address className="not-italic">
                    {pickLocale(settings, "address", locale)}
                    <br />
                    {settings.city}, {settings.country}
                    {settings.postalBox ? <><br /><span className="num text-sm text-charcoal-muted">{settings.postalBox}</span></> : null}
                  </address>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-4 py-4">
              <Clock className="mt-1 size-4 shrink-0 text-copper" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <dt className="sr-only">{t("hours", { checkIn: settings.checkInTime, checkOut: settings.checkOutTime })}</dt>
                <dd className="text-sm text-charcoal-muted">{t("hours", { checkIn: settings.checkInTime, checkOut: settings.checkOutTime })}</dd>
              </div>
            </div>
            <div className="flex items-start gap-4 py-4">
              <MessageCircle className="mt-1 size-4 shrink-0 text-copper" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] uppercase tracking-widest text-stone">{t("whatsapp")}</dt>
                <dd className="mt-0.5">
                  {whatsappLink && settings.whatsapp ? (
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="num inline-flex items-center gap-1 text-base font-medium text-charcoal hover:text-copper">
                      {settings.whatsapp}
                      <ExternalLink className="size-3.5 text-stone" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-xs leading-relaxed text-stone">{t("whatsappUnavailable")}</span>
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="rounded-lg border border-charcoal/10 bg-white p-6 shadow-soft sm:p-8 lg:p-10">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl">{t("formTitle")}</h2>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </Reveal>
      </section>

      {/* Map + directions */}
      <section className="border-t border-charcoal/10 bg-ivory-soft py-16 lg:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-soft lg:col-span-7">
            <iframe
              title={t("map")}
              src={mapsEmbed}
              className="h-[320px] w-full sm:h-[420px] lg:h-full lg:min-h-[520px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="eyebrow">{t("map")}</p>
            <h2 className="display-md mt-3">{t("directionsTitle")}</h2>
            <div className="hairline-copper mt-5" />
            <div className="mt-8 space-y-6">
              <article className="relative ps-8">
                <Navigation className="absolute start-0 top-1 size-4 text-copper rtl:-scale-x-100" aria-hidden="true" />
                <h3 className="font-display text-xl">{t("fromNorth")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("fromNorthBody")}</p>
              </article>
              <article className="relative ps-8">
                <Navigation className="absolute start-0 top-1 size-4 text-copper rtl:-scale-x-100" aria-hidden="true" />
                <h3 className="font-display text-xl">{t("fromSouth")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("fromSouthBody")}</p>
              </article>
            </div>
            <Button asChild variant="outline" className="mt-8">
              <a href={mapsLink} target="_blank" rel="noopener noreferrer">
                {t("openInMaps")} <ExternalLink className="rtl:-scale-x-100" aria-hidden="true" />
              </a>
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
