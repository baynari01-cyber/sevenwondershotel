import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, BedDouble, Maximize2, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { RoomTypeDTO } from "@/lib/data/public";
import { formatMoney, pickLocale } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export async function RoomCard({ room, currency, className, priority = false }: { room: RoomTypeDTO; currency: string; className?: string; priority?: boolean }) {
  const locale = await getLocale();
  const t = await getTranslations("rooms");
  const tc = await getTranslations("common");
  const cover = room.images[0];
  return (
    <article className={cn("group flex flex-col overflow-hidden rounded-lg bg-white shadow-soft transition-shadow hover:shadow-lift", className)}>
      <Link href={`/rooms/${room.slug}`} className="img-grade img-warm relative block aspect-[4/3] overflow-hidden">
        {cover ? (
          <Image
            src={cover.url}
            alt={pickLocale(cover, "alt", locale)}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            priority={priority}
          />
        ) : null}
        <div className="absolute start-4 top-4 z-10 flex gap-2">
          {room.isSuite ? <Badge variant="copper">{t("suite")}</Badge> : null}
          {room.hasBalcony ? <Badge variant="sand">{t("balcony")}</Badge> : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl leading-tight">
            <Link href={`/rooms/${room.slug}`} className="hover:text-copper">{pickLocale(room, "name", locale)}</Link>
          </h3>
          <p className="text-end">
            <span className="block text-[10px] uppercase tracking-widest text-stone">{tc("from")}</span>
            <span className="num font-display text-xl text-copper-deep">{formatMoney(room.baseRate, currency, locale, { compact: true })}</span>
            <span className="block text-[10px] text-stone">{tc("perNight")}</span>
          </p>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{pickLocale(room, "short", locale)}</p>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-charcoal-muted">
          <li className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-copper" />{t("sleeps", { count: room.maxOccupancy })}</li>
          <li className="inline-flex items-center gap-1.5"><BedDouble className="size-3.5 text-copper" />{pickLocale(room, "bedConfig", locale)}</li>
          {room.sizeSqm ? <li className="inline-flex items-center gap-1.5"><Maximize2 className="size-3.5 text-copper" /><span className="num">{t("size", { size: room.sizeSqm })}</span></li> : null}
        </ul>
        <div className="mt-6 flex items-center justify-between border-t border-charcoal/10 pt-4">
          <Link href={`/rooms/${room.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-charcoal hover:text-copper">
            {t("viewRoom")} <ArrowUpRight className="size-4 rtl:-scale-x-100" />
          </Link>
          <Link href={`/book?roomType=${room.slug}`} className="text-sm font-semibold text-copper hover:text-copper-deep">{t("reserveRoom")}</Link>
        </div>
      </div>
    </article>
  );
}
