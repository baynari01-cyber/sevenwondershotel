"use client";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, Wallet } from "lucide-react";
import type { AvailabilitySearch, QuoteResult } from "@/lib/booking/service";
import { formatDate, formatMoney, pickLocale } from "@/lib/utils/format";
import { COUNTRY_NAMES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import type { WizardState } from "../types";

export function ReviewStep({ state, availability, quote, loading, error, onEdit, onChange, onBack, onConfirm, submitting }: {
  state: WizardState;
  availability: AvailabilitySearch;
  quote: QuoteResult | null;
  loading: boolean;
  error: string | null;
  onEdit: (step: number) => void;
  onChange: (patch: Partial<Pick<WizardState, "paymentMethod" | "acceptTerms">>) => void;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const t = useTranslations("booking.review");
  const tc = useTranslations("common");
  const locale = useLocale();
  const currency = availability.currency;
  const country = COUNTRY_NAMES[state.guest.country];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl">{t("title")}</h2>

      <Section title={t("stay")} onEdit={() => onEdit(0)} editLabel={t("edit")}>
        <p><span className="num">{formatDate(state.search.checkIn, locale, "long")}</span> → <span className="num">{formatDate(state.search.checkOut, locale, "long")}</span></p>
        <p className="text-muted-foreground">{tc("nights", { count: availability.nights })} · {tc("adults", { count: state.selectedRooms.reduce((a, r) => a + r.adults, 0) })} · {tc("children", { count: state.selectedRooms.reduce((a, r) => a + r.children, 0) })}</p>
      </Section>

      <Section title={t("roomsTitle")} onEdit={() => onEdit(2)} editLabel={t("edit")}>
        <ul className="divide-y divide-charcoal/10">
          {state.selectedRooms.map((room, i) => {
            const rt = availability.roomTypes.find((r) => r.roomTypeId === room.roomTypeId)!;
            const offer = rt.offers.find((o) => o.ratePlanId === room.ratePlanId);
            const q = quote?.rooms[i];
            return (
              <li key={room.key} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">{pickLocale(rt, "name", locale)}</p>
                  <p className="text-xs text-muted-foreground">{offer ? pickLocale(offer, "name", locale) : ""} · {tc("adults", { count: room.adults })}{room.children ? ` · ${tc("children", { count: room.children })}` : ""}</p>
                  {q && Number(q.occupancySupplement) > 0 ? <p className="text-xs text-stone">{t("occupancySupplement")}: <span className="num">{formatMoney(q.occupancySupplement, currency, locale)}</span></p> : null}
                </div>
                <span className="num">{q ? formatMoney(q.roomTotal, currency, locale) : <Skeleton className="h-4 w-16" />}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      {quote && quote.extras.length ? (
        <Section title={t("extrasTitle")} onEdit={() => onEdit(3)} editLabel={t("edit")}>
          <ul className="divide-y divide-charcoal/10">
            {quote.extras.map((e) => {
              const d = quote.extraDetails.find((x) => x.extraId === e.extraId)!;
              return (
                <li key={e.extraId} className="flex items-center justify-between gap-4 py-2">
                  <span>{pickLocale(d, "name", locale)}{e.quantity > 1 ? <span className="num"> × {e.quantity}</span> : null}</span>
                  <span className="num">{d.isInquiryOnly ? tc("inquiryOnly") : formatMoney(e.total, currency, locale)}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Section title={t("guestTitle")} onEdit={() => onEdit(4)} editLabel={t("edit")}>
        <p className="font-medium">{state.guest.firstName} {state.guest.lastName}</p>
        <p className="text-muted-foreground"><span className="ltr-field">{state.guest.email}</span> · <span className="num">{state.guest.phone}</span>{country ? ` · ${locale === "ar" ? country.ar : country.en}` : ""}</p>
        {state.guest.arrivalTime ? <p className="text-muted-foreground"><span className="num">{state.guest.arrivalTime}</span></p> : null}
        {state.guest.specialRequests ? <p className="mt-1 text-sm italic text-muted-foreground" dir="auto">“{state.guest.specialRequests}”</p> : null}
      </Section>

      <Section title={t("priceTitle")}>
        {loading || !quote ? (
          <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-6 w-1/2" /></div>
        ) : (
          <dl className="space-y-1.5 text-sm" data-testid="price-breakdown">
            <Row label={t("roomSubtotal")} value={formatMoney(quote.roomSubtotal, currency, locale)} />
            {Number(quote.extrasTotal) > 0 ? <Row label={t("extrasTotal")} value={formatMoney(quote.extrasTotal, currency, locale)} /> : null}
            {Number(quote.discountTotal) > 0 ? <Row label={t("discount", { code: quote.promotionCode ?? "" })} value={`− ${formatMoney(quote.discountTotal, currency, locale)}`} className="text-success" /> : null}
            {quote.taxesIncluded ? <p className="text-xs text-muted-foreground">{t("taxesIncludedNote")}</p> : (
              <>
                <Row label={t("serviceCharge", { rate: Number(quote.serviceChargeRate) })} value={formatMoney(quote.serviceChargeTotal, currency, locale)} className="text-muted-foreground" />
                <Row label={t("tax", { rate: Number(quote.taxRate) })} value={formatMoney(quote.taxTotal, currency, locale)} className="text-muted-foreground" />
              </>
            )}
            <div className="flex items-baseline justify-between border-t border-charcoal/10 pt-3">
              <dt className="font-semibold">{t("grandTotal")}</dt>
              <dd className="num font-display text-3xl text-copper-deep" data-testid="grand-total">{formatMoney(quote.grandTotal, currency, locale)}</dd>
            </div>
            <p className="text-end text-xs text-stone">{state.paymentMethod === "PAY_AT_PROPERTY" ? t("payableAtHotel") : t("simulatedCard")}</p>
          </dl>
        )}
      </Section>

      <Section title={t("cancellation")}>
        <ul className="space-y-2 text-sm text-charcoal-muted">
          {(quote?.roomDetails ?? []).filter((r, i, a) => a.findIndex((x) => x.ratePlanId === r.ratePlanId) === i).map((r) => (
            <li key={r.ratePlanId}><span className="font-medium text-charcoal">{pickLocale(r, "ratePlanName", locale)}:</span> {pickLocale(r, "cancellationPolicy", locale)}</li>
          ))}
        </ul>
      </Section>

      <Section title={t("payment")}>
        <div role="radiogroup" aria-label={t("paymentMethod")} className="grid gap-3 sm:grid-cols-2">
          {([
            { key: "PAY_AT_PROPERTY", icon: Wallet, title: t("payAtProperty"), body: t("payAtPropertyBody") },
            { key: "SIMULATED_CARD", icon: CreditCard, title: t("simulatedCard"), body: t("simulatedCardBody") },
          ] as const).map((opt) => {
            const chosen = state.paymentMethod === opt.key;
            return (
              <button key={opt.key} type="button" role="radio" aria-checked={chosen} onClick={() => onChange({ paymentMethod: opt.key })} className={cn("flex items-start gap-3 rounded-lg border p-4 text-start transition-colors", chosen ? "border-copper bg-copper/5 ring-2 ring-copper/20" : "border-charcoal/10 hover:border-copper/50")}>
                <opt.icon className="mt-0.5 size-5 text-copper" />
                <span><span className="block font-medium">{opt.title}</span><span className="block text-xs text-muted-foreground">{opt.body}</span></span>
              </button>
            );
          })}
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm">
          <Checkbox checked={state.acceptTerms} onCheckedChange={(v) => onChange({ acceptTerms: v === true })} aria-required="true" data-testid="accept-terms" />
          <span>{t("terms")}</span>
        </label>
      </Section>

      {error ? <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>{tc("back")}</Button>
        <Button variant="accent" size="lg" disabled={!quote || loading || submitting || !state.acceptTerms} onClick={onConfirm} data-testid="confirm-reservation">{submitting ? t("confirming") : t("confirm")}</Button>
      </div>
    </div>
  );
}

function Section({ title, children, onEdit, editLabel }: { title: string; children: React.ReactNode; onEdit?: () => void; editLabel?: string }) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="eyebrow">{title}</h3>
        {onEdit ? <button type="button" onClick={onEdit} className="text-xs font-semibold text-copper hover:text-copper-deep">{editLabel}</button> : null}
      </div>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
