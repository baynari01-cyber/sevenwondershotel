import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { BookingWizard } from "@/components/booking/wizard";
import { getSettings } from "@/lib/data/public";
import { isIsoDate } from "@/lib/utils/dates";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "booking" });
  return { title: t("title") };
}

function num(value: string | string[] | undefined, fallback?: number): number | undefined {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export default async function BookPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("booking");
  const settings = await getSettings();

  const checkIn = typeof sp.checkIn === "string" && isIsoDate(sp.checkIn) ? sp.checkIn : undefined;
  const checkOut = typeof sp.checkOut === "string" && isIsoDate(sp.checkOut) ? sp.checkOut : undefined;
  const initial = {
    checkIn,
    checkOut,
    adults: num(sp.adults),
    children: num(sp.children),
    rooms: num(sp.rooms),
    roomType: typeof sp.roomType === "string" ? sp.roomType : undefined,
    promo: typeof sp.promo === "string" ? sp.promo.toUpperCase().slice(0, 30) : undefined,
  };
  const autoSearch = Boolean(checkIn && checkOut);

  return (
    <div className="bg-ivory">
      <div className="container-x py-10 lg:py-14">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="display-lg mt-2">{t("title")}</h1>
          </div>
          <p className="inline-flex max-w-md items-start gap-2 rounded-md border border-copper/30 bg-copper/5 px-3 py-2 text-xs text-copper-deep">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />{t("demoBanner")}
          </p>
        </div>
        <BookingWizard
          key={`${checkIn ?? ""}-${checkOut ?? ""}-${initial.rooms ?? ""}`}
          settings={{ childAgeLimit: settings.childAgeLimit, maxRoomsPerBooking: settings.maxRoomsPerBooking, maxNightsPerBooking: settings.maxNightsPerBooking, checkInTime: settings.checkInTime }}
          initial={initial}
          autoSearch={autoSearch}
        />
      </div>
    </div>
  );
}
