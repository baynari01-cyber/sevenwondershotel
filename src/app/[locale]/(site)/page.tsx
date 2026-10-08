import Image from "next/image";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDown, ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BookingSearchBar } from "@/components/site/booking-search-bar";
import { SectionHeading } from "@/components/site/section-heading";
import { RoomCard } from "@/components/site/room-card";
import { Reveal } from "@/components/site/reveal";
import { blockByKey, getContentBlocks, getGallery, getRoomTypes, getSettings } from "@/lib/data/public";
import { pickLocale } from "@/lib/utils/format";
import { HotelJsonLd } from "@/components/site/json-ld";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("home") };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  const locale = await getLocale();
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const [settings, blocks, roomTypes, gallery] = await Promise.all([getSettings(), getContentBlocks("home"), getRoomTypes(), getGallery()]);

  const hero = blockByKey(blocks, "home.hero");
  const intro = blockByKey(blocks, "home.intro");
  const pool = blockByKey(blocks, "home.pool");
  const baths = blockByKey(blocks, "home.baths");
  const dining = blockByKey(blocks, "home.dining");
  const petra = blockByKey(blocks, "home.petra");
  const location = blockByKey(blocks, "home.location");
  const featured = roomTypes.filter((r) => r.isFeatured).slice(0, 3);
  const galleryPreview = gallery.filter((g) => g.category !== "PETRA").slice(0, 6);
  const totalRooms = roomTypes.reduce((a, r) => a + r.roomCount, 0);
  const balconies = roomTypes.reduce((a, r) => a + r.balconyCount, 0);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${settings.latitude},${settings.longitude}`;

  return (
    <>
      <HotelJsonLd settings={settings} locale={locale} />
      {/* Hero */}
      <section className="relative -mt-[4.5rem] flex min-h-[100svh] flex-col justify-end overflow-hidden bg-charcoal text-ivory lg:-mt-20">
        <Image
          src={hero?.imageUrl ?? "/images/petra/petra-treasury-night.webp"}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-charcoal/30" aria-hidden="true" />
        <div className="grain absolute inset-0" aria-hidden="true" />
        <div className="container-x relative z-10 pb-10 pt-40 sm:pb-14 lg:pb-20">
          <div className="max-w-3xl animate-fade-up">
            <p className="eyebrow text-sand-200">{t("heroEyebrow")}</p>
            <h1 className="display-xl mt-5 text-ivory">{hero ? pickLocale(hero, "title", locale) : pickLocale(settings, "name", locale)}</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ivory/80 sm:text-lg">{hero ? pickLocale(hero, "body", locale) : pickLocale(settings, "tagline", locale)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg"><Link href="/book">{t("heroCta")}</Link></Button>
              <Button asChild variant="inverseOutline" size="lg"><Link href="/rooms">{t("heroSecondary")}</Link></Button>
            </div>
          </div>
          <div className="mt-12 animate-fade-up [animation-delay:200ms]">
            <BookingSearchBar childAgeLimit={settings.childAgeLimit} maxRooms={settings.maxRoomsPerBooking} />
          </div>
          <p className="mt-6 hidden items-center gap-2 text-xs uppercase tracking-[0.3em] text-ivory/50 lg:flex"><ArrowDown className="size-3.5" />{t("scroll")}</p>
        </div>
      </section>

      {/* Facts strip */}
      <section className="border-b border-charcoal/10 bg-ivory-soft">
        <div className="container-x grid grid-cols-2 divide-charcoal/10 py-8 sm:grid-cols-4 sm:divide-x rtl:sm:divide-x-reverse">
          {[
            { value: String(totalRooms), label: t("stats.rooms") },
            { value: String(balconies), label: t("stats.balconies") },
            { value: "9×4 m", label: t("stats.pool") },
            { value: "Afra", label: t("stats.baths") },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3 text-center">
              <p className="num font-display text-3xl text-charcoal sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-stone">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Intro */}
      {intro ? (
        <section className="container-x grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
          <Reveal>
            <SectionHeading eyebrow={pickLocale(intro, "subtitle", locale)} title={pickLocale(intro, "title", locale)} body={pickLocale(intro, "body", locale)} />
            <p className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-stone"><span className="size-1.5 rounded-full bg-success" />{t("verifiedFact")}</p>
            <Button asChild variant="outline" className="mt-8"><Link href="/about">{tc("learnMore")}</Link></Button>
          </Reveal>
          <Reveal delay={0.15} className="relative">
            <div className="img-grade img-warm relative aspect-[4/5] overflow-hidden rounded-lg">
              <Image src={intro.imageUrl ?? "/images/hotel/hotel-exterior-street.webp"} alt={pickLocale(intro, "title", locale)} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 -start-4 hidden w-56 rounded-md bg-charcoal p-5 text-ivory shadow-lift md:block">
              <p className="eyebrow text-sand-300">{t("locationEyebrow")}</p>
              <p className="mt-2 text-sm leading-snug">{t("petraDistance")}</p>
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* Featured rooms */}
      <section className="bg-sand-100/50 py-20 lg:py-28">
        <div className="container-x">
          <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow={t("featuredEyebrow")} title={t("featuredTitle")} body={t("featuredBody")} />
            <Link href="/rooms" className="inline-flex items-center gap-1 text-sm font-semibold text-copper hover:text-copper-deep">{tc("viewAll")} <ArrowUpRight className="size-4 rtl:-scale-x-100" /></Link>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((room, i) => (
              <Reveal key={room.id} delay={i * 0.08}><RoomCard room={room} currency={settings.currency} /></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Experiences: pool, baths, dining */}
      <section className="py-20 lg:py-28">
        <div className="container-x">
          <Reveal><SectionHeading eyebrow={t("experiencesEyebrow")} title={t("experiencesTitle")} align="center" /></Reveal>
          <div className="mt-14 space-y-20">
            {[pool, baths, dining].filter(Boolean).map((block, i) => {
              if (!block) return null;
              const flip = i % 2 === 1;
              return (
                <Reveal key={block.key} className={`grid items-center gap-8 lg:grid-cols-12 lg:gap-12 ${flip ? "" : ""}`}>
                  <div className={`img-grade img-warm relative aspect-[16/10] overflow-hidden rounded-lg lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
                    {block.imageUrl ? <Image src={block.imageUrl} alt={pickLocale(block, "title", locale)} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" /> : null}
                  </div>
                  <div className={`lg:col-span-5 ${flip ? "lg:order-1 lg:pe-8" : "lg:ps-8"}`}>
                    <p className="eyebrow">{pickLocale(block, "subtitle", locale)}</p>
                    <h3 className="display-md mt-3">{pickLocale(block, "title", locale)}</h3>
                    <div className="hairline-copper mt-5" />
                    <p className="mt-5 text-muted-foreground leading-relaxed">{pickLocale(block, "body", locale)}</p>
                    <Link href="/experiences" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-copper hover:text-copper-deep">{tc("learnMore")} <ArrowUpRight className="size-4 rtl:-scale-x-100" /></Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Petra destination */}
      {petra ? (
        <section className="relative overflow-hidden bg-charcoal py-24 text-ivory lg:py-36">
          <Image src={petra.imageUrl ?? "/images/petra/petra-siq.webp"} alt="" fill sizes="100vw" className="object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/70 to-transparent rtl:bg-gradient-to-l" aria-hidden="true" />
          <div className="container-x relative z-10">
            <Reveal className="max-w-xl">
              <SectionHeading tone="dark" eyebrow={pickLocale(petra, "subtitle", locale)} title={pickLocale(petra, "title", locale)} body={pickLocale(petra, "body", locale)} />
              <Button asChild variant="inverse" className="mt-8"><Link href="/experiences#petra">{tc("learnMore")}</Link></Button>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* Gallery preview */}
      <section className="py-20 lg:py-28">
        <div className="container-x">
          <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow={t("galleryEyebrow")} title={t("galleryTitle")} />
            <Link href="/gallery" className="inline-flex items-center gap-1 text-sm font-semibold text-copper hover:text-copper-deep">{tc("viewAll")} <ArrowUpRight className="size-4 rtl:-scale-x-100" /></Link>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {galleryPreview.map((img, i) => (
              <Reveal key={img.id} delay={i * 0.05} className={`img-grade img-warm relative overflow-hidden rounded-md ${i === 0 ? "col-span-2 row-span-2 aspect-[4/3] md:aspect-auto" : "aspect-[4/3]"}`}>
                <Link href="/gallery" className="absolute inset-0">
                  <Image src={img.url} alt={pickLocale(img, "caption", locale)} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-700 hover:scale-[1.03]" />
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      {location ? (
        <section className="border-t border-charcoal/10 bg-ivory-soft py-20 lg:py-28">
          <div className="container-x grid gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <SectionHeading eyebrow={pickLocale(location, "subtitle", locale)} title={pickLocale(location, "title", locale)} body={pickLocale(location, "body", locale)} />
              <address className="mt-8 flex items-start gap-3 not-italic text-sm text-charcoal-muted">
                <MapPin className="mt-0.5 size-4 text-copper" />
                <span>{pickLocale(settings, "address", locale)}<br />{settings.city}, {settings.country}</span>
              </address>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="outline"><a href={mapsUrl} target="_blank" rel="noopener noreferrer">{t("directions")}</a></Button>
                <Button asChild variant="ghost"><Link href="/contact">{tc("learnMore")}</Link></Button>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-soft">
              <iframe
                title="Map"
                src={`https://www.google.com/maps?q=${settings.latitude},${settings.longitude}&z=15&output=embed&hl=${locale}`}
                className="h-[360px] w-full lg:h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-charcoal py-24 text-center text-ivory">
        <Image src="/images/hotel/rooftop-pool-night.webp" alt="" fill sizes="100vw" className="object-cover opacity-30" />
        <div className="container-x relative z-10">
          <Reveal>
            <h2 className="display-lg text-ivory">{t("finalTitle")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-ivory/75">{t("finalBody")}</p>
            <Button asChild variant="accent" size="lg" className="mt-8"><Link href="/book">{tc("bookNow")}</Link></Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
