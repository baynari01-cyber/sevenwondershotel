import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { BedDouble, Check, Maximize2, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoomGallery } from "@/components/site/room-gallery";
import { RoomCard } from "@/components/site/room-card";
import { BookingSearchBar } from "@/components/site/booking-search-bar";
import { getRoomTypeBySlug, getRoomTypes, getSettings } from "@/lib/data/public";
import { formatMoney, pickLocale } from "@/lib/utils/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const room = await getRoomTypeBySlug(slug);
  if (!room) return {};
  return { title: pickLocale(room, "name", locale), description: pickLocale(room, "short", locale), openGraph: { images: room.images[0] ? [room.images[0].url] : undefined } };
}

export default async function RoomDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: paramLocale, slug } = await params;
  setRequestLocale(paramLocale);
  const locale = await getLocale();
  const [room, settings, all] = await Promise.all([getRoomTypeBySlug(slug), getSettings(), getRoomTypes()]);
  if (!room) notFound();
  const t = await getTranslations("rooms");
  const tc = await getTranslations("common");
  const others = all.filter((r) => r.id !== room.id).slice(0, 3);
  const name = pickLocale(room, "name", locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HotelRoom",
    name,
    description: pickLocale(room, "description", locale),
    occupancy: { "@type": "QuantitativeValue", maxValue: room.maxOccupancy },
    bed: { "@type": "BedDetails", typeOfBed: room.bedConfigEn },
    image: room.images.map((i) => i.url),
    containedInPlace: { "@type": "Hotel", name: settings.nameEn },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="container-x py-10 lg:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
          <Link href="/rooms" className="hover:text-copper">{t("title")}</Link> <span aria-hidden="true">/</span> <span>{name}</span>
        </nav>
        <RoomGallery images={room.images} title={name} />
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">{t("eyebrow")}</p>
              {room.isSuite ? <Badge variant="copper">{t("suite")}</Badge> : null}
              {room.hasBalcony ? <Badge variant="sand">{t("balcony")}</Badge> : null}
              <Badge variant="neutral">{tc("demoRates")}</Badge>
            </div>
            <h1 className="display-lg mt-3">{name}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{pickLocale(room, "short", locale)}</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-charcoal-muted">
              <li className="inline-flex items-center gap-2"><Users className="size-4 text-copper" />{t("maxAdults", { count: room.maxAdults })} {t("maxChildren", { count: room.maxChildren })}</li>
              <li className="inline-flex items-center gap-2"><BedDouble className="size-4 text-copper" />{pickLocale(room, "bedConfig", locale)}</li>
              {room.sizeSqm ? <li className="inline-flex items-center gap-2"><Maximize2 className="size-4 text-copper" /><span className="num">{t("size", { size: room.sizeSqm })}</span></li> : null}
            </ul>
            <div className="hairline-copper mt-8" />
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-charcoal">{pickLocale(room, "description", locale)}</p>
            <p className="mt-4 text-sm text-muted-foreground">{t("inventory", { count: room.roomCount })}{room.balconyCount ? ` · ${t("balconyCount", { count: room.balconyCount })}` : ""}</p>

            <h2 className="mt-12 font-display text-2xl">{t("amenities")}</h2>
            <ul className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {room.amenities.map((a) => (
                <li key={a.key} className="flex items-center gap-2.5"><span className="flex size-6 items-center justify-center rounded-full bg-sand-100 text-copper"><Check className="size-3.5" strokeWidth={3} /></span>{pickLocale(a, "label", locale)}</li>
              ))}
            </ul>
          </div>
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-lg border border-charcoal/10 bg-white p-6 shadow-lift">
              <p className="text-[10px] uppercase tracking-widest text-stone">{tc("from")}</p>
              <p className="num font-display text-4xl text-copper-deep">{formatMoney(room.baseRate, settings.currency, locale, { compact: true })}</p>
              <p className="text-xs text-stone">{tc("perNight")} · {t("ratesNote")}</p>
              <div className="mt-6 space-y-3">
                <Button asChild variant="accent" size="lg" className="w-full"><Link href={`/book?roomType=${room.slug}`}>{t("reserveRoom")}</Link></Button>
                <p className="text-center text-xs text-muted-foreground">{tc("demoNotice")}</p>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-16 rounded-lg bg-charcoal p-6 text-ivory sm:p-8">
          <h2 className="font-display text-2xl">{t("availabilityTitle")}</h2>
          <div className="mt-5"><BookingSearchBar variant="inline" childAgeLimit={settings.childAgeLimit} maxRooms={settings.maxRoomsPerBooking} /></div>
        </section>

        {others.length ? (
          <section className="mt-16">
            <h2 className="font-display text-3xl">{t("otherRooms")}</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {others.map((r) => <RoomCard key={r.id} room={r} currency={settings.currency} />)}
            </div>
          </section>
        ) : null}
      </article>
    </>
  );
}
