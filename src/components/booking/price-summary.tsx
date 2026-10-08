"use client";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Users } from "lucide-react";
import type { QuoteResult } from "@/lib/booking/service";
import { formatDate, formatMoney, pickLocale } from "@/lib/utils/format";
import type { WizardState } from "./types";
import { Skeleton } from "@/components/ui/skeleton";

export function PriceSummary({ state, quote, loading }: { state: WizardState; quote: QuoteResult | null; loading?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("booking.review");
  const tc = useTranslations("common");
  const avail = state.availability;
  const currency = avail?.currency ?? "JOD";
  const nights = avail?.nights ?? 0;
  const guests = state.selectedRooms.reduce((a, r) => a + r.adults + r.children, 0) || state.search.adults + state.search.children;

  return (
    <aside className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft" aria-live="polite">
      <p className="eyebrow">{t("stay")}</p>
      <ul className="mt-3 space-y-2 text-sm text-charcoal">
        <li className="flex items-center gap-2"><CalendarDays className="size-4 text-copper" /><span className="num">{formatDate(state.search.checkIn, locale)}</span> → <span className="num">{formatDate(state.search.checkOut, locale)}</span></li>
        <li className="flex items-center gap-2 text-muted-foreground"><Users className="size-4 text-copper" />{tc("nights", { count: nights })} · {tc("guests", { count: guests })}</li>
      </ul>
      {avail && state.selectedRooms.length ? (
        <ul className="mt-4 divide-y divide-charcoal/10 border-t border-charcoal/10 text-sm">
          {state.selectedRooms.map((room, i) => {
            const rt = avail.roomTypes.find((r) => r.roomTypeId === room.roomTypeId);
            const offer = rt?.offers.find((o) => o.ratePlanId === room.ratePlanId);
            const q = quote?.rooms[i];
            return (
              <li key={room.key} className="flex items-start justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium">{rt ? pickLocale(rt, "name", locale) : ""}</p>
                  <p className="text-xs text-muted-foreground">{offer ? pickLocale(offer, "name", locale) : tc("adults", { count: room.adults })}</p>
                </div>
                <span className="num text-end">{q ? formatMoney(q.roomTotal, currency, locale) : offer ? formatMoney(offer.roomTotal, currency, locale) : "—"}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {loading ? (
        <div className="mt-4 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
      ) : quote ? (
        <dl className="mt-4 space-y-1.5 border-t border-charcoal/10 pt-4 text-sm">
          <Row label={t("roomSubtotal")} value={formatMoney(quote.roomSubtotal, currency, locale)} />
          {Number(quote.extrasTotal) > 0 ? <Row label={t("extrasTotal")} value={formatMoney(quote.extrasTotal, currency, locale)} /> : null}
          {Number(quote.discountTotal) > 0 ? <Row label={t("discount", { code: quote.promotionCode ?? "" })} value={`− ${formatMoney(quote.discountTotal, currency, locale)}`} tone="success" /> : null}
          {quote.taxesIncluded ? <p className="text-xs text-muted-foreground">{t("taxesIncludedNote")}</p> : (
            <>
              <Row label={t("serviceCharge", { rate: Number(quote.serviceChargeRate) })} value={formatMoney(quote.serviceChargeTotal, currency, locale)} muted />
              <Row label={t("tax", { rate: Number(quote.taxRate) })} value={formatMoney(quote.taxTotal, currency, locale)} muted />
            </>
          )}
          <div className="flex items-baseline justify-between border-t border-charcoal/10 pt-3">
            <dt className="font-semibold">{t("grandTotal")}</dt>
            <dd className="num font-display text-2xl text-copper-deep">{formatMoney(quote.grandTotal, currency, locale)}</dd>
          </div>
        </dl>
      ) : null}
    </aside>
  );
}

function Row({ label, value, muted, tone }: { label: string; value: string; muted?: boolean; tone?: "success" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd className={`num ${tone === "success" ? "text-success" : ""}`}>{value}</dd>
    </div>
  );
}
