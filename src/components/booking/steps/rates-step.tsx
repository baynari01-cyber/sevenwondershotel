"use client";
import { useLocale, useTranslations } from "next-intl";
import { Check, Coffee, ShieldCheck, ShieldOff } from "lucide-react";
import type { AvailabilitySearch } from "@/lib/booking/service";
import { formatMoney, pickLocale } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { SelectedRoom, WizardState } from "../types";

export function RatesStep({ state, availability, onChange, onBack, onContinue }: {
  state: WizardState;
  availability: AvailabilitySearch;
  onChange: (rooms: SelectedRoom[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const t = useTranslations("booking.rates");
  const tc = useTranslations("common");
  const tp = useTranslations("ratePlanType");
  const locale = useLocale();
  const allChosen = state.selectedRooms.every((r) => r.ratePlanId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      {state.selectedRooms.map((room, i) => {
        const rt = availability.roomTypes.find((r) => r.roomTypeId === room.roomTypeId)!;
        const offers = rt.offers.filter((o) => o.minNights <= availability.nights);
        const baseline = Math.max(...offers.map((o) => Number(o.roomTotal)));
        return (
          <section key={room.key} aria-labelledby={`rate-${room.key}`} className="space-y-3">
            <h3 id={`rate-${room.key}`} className="text-sm font-semibold uppercase tracking-wider text-stone">{t("perRoom", { room: `${i + 1} · ${pickLocale(rt, "name", locale)}` })}</h3>
            <div role="radiogroup" className="grid gap-3 md:grid-cols-2">
              {offers.map((o) => {
                const chosen = room.ratePlanId === o.ratePlanId;
                const saving = baseline - Number(o.roomTotal);
                return (
                  <button
                    key={o.ratePlanId}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    data-testid={`rate-${o.code}`}
                    onClick={() => onChange(state.selectedRooms.map((r) => (r.key === room.key ? { ...r, ratePlanId: o.ratePlanId } : r)))}
                    className={cn("relative flex flex-col items-start gap-2 rounded-lg border bg-white p-5 text-start shadow-soft transition-colors hover:border-copper/60", chosen ? "border-copper ring-2 ring-copper/20" : "border-charcoal/10")}
                  >
                    <span className={cn("absolute end-4 top-4 flex size-6 items-center justify-center rounded-full border", chosen ? "border-copper bg-copper text-white" : "border-charcoal/20")}>{chosen ? <Check className="size-3.5" strokeWidth={3} /> : null}</span>
                    <span className="flex flex-wrap items-center gap-2 pe-8">
                      <span className="font-display text-xl">{pickLocale(o, "name", locale)}</span>
                      <Badge variant="neutral">{tp(o.type as "ROOM_ONLY")}</Badge>
                      {o.isDemo ? <Badge variant="sand">{tc("demoBadge")}</Badge> : null}
                    </span>
                    <span className="text-sm text-muted-foreground">{pickLocale(o, "description", locale)}</span>
                    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <li className="inline-flex items-center gap-1 text-charcoal-muted"><Coffee className="size-3.5 text-copper" />{o.includesBreakfast ? t("includesBreakfast") : t("roomOnly")}</li>
                      {o.refundable ? <li className="inline-flex items-center gap-1 text-success"><ShieldCheck className="size-3.5" />{t("deadline", { days: o.cancellationDeadlineDays })}</li> : <li className="inline-flex items-center gap-1 text-danger"><ShieldOff className="size-3.5" />{t("nonRefundable")}</li>}
                      {o.minNights > 1 ? <li className="text-stone">{t("minNights", { count: o.minNights })}</li> : null}
                    </ul>
                    <span className="mt-2 flex w-full items-end justify-between border-t border-charcoal/10 pt-3">
                      <span className="text-xs text-stone">{t("roomTotal")}</span>
                      <span className="text-end">
                        <span className="num block font-display text-2xl text-copper-deep">{formatMoney(o.roomTotal, availability.currency, locale)}</span>
                        {saving > 0.005 ? <span className="text-xs text-success">{t("save", { amount: formatMoney(saving, availability.currency, locale) })}</span> : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>{tc("back")}</Button>
        <Button variant="accent" size="lg" disabled={!allChosen} onClick={onContinue} data-testid="continue-extras">{t("continue")}</Button>
      </div>
    </div>
  );
}
