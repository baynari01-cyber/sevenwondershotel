import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BedDouble } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { RoomCard } from "@/components/site/room-card";
import { RoomFilters } from "@/components/site/room-filters";
import { BookingSearchBar } from "@/components/site/booking-search-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { getRoomTypes, getSettings } from "@/lib/data/public";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "rooms" });
  return { title: t("title"), description: t("intro") };
}

export default async function RoomsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("rooms");
  const [settings, roomTypes] = await Promise.all([getSettings(), getRoomTypes()]);

  const guests = Math.max(0, Math.min(8, Number(sp.guests) || 0));
  const balcony = sp.balcony === "1";
  const suites = sp.suites === "1";
  const sort = typeof sp.sort === "string" && ["price", "size"].includes(sp.sort) ? sp.sort : "recommended";

  let list = roomTypes.filter((r) => (guests ? r.maxOccupancy >= guests : true) && (balcony ? r.hasBalcony : true) && (suites ? r.isSuite : true));
  if (sort === "price") list = [...list].sort((a, b) => Number(a.baseRate) - Number(b.baseRate));
  if (sort === "size") list = [...list].sort((a, b) => (b.sizeSqm ?? 0) - (a.sizeSqm ?? 0));

  return (
    <>
      <section className="border-b border-charcoal/10 bg-ivory-soft">
        <div className="container-x py-14 lg:py-20">
          <SectionHeading as="h1" eyebrow={t("eyebrow")} title={t("title")} body={t("intro")} />
          <div className="mt-10">
            <BookingSearchBar variant="inline" childAgeLimit={settings.childAgeLimit} maxRooms={settings.maxRoomsPerBooking} />
            <p className="mt-3 text-xs text-muted-foreground">{t("ratesNote")}</p>
          </div>
        </div>
      </section>
      <section className="container-x py-12 lg:py-16">
        <RoomFilters guests={guests} balcony={balcony} suites={suites} sort={sort} />
        {list.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.map((room, i) => <RoomCard key={room.id} room={room} currency={settings.currency} priority={i < 3} />)}
          </div>
        ) : (
          <EmptyState className="mt-8" icon={BedDouble} title={t("noResults")} />
        )}
      </section>
    </>
  );
}
