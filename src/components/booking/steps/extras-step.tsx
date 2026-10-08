"use client";
import { useLocale, useTranslations } from "next-intl";
import { Car, Clock, Coffee, Map, Minus, Plus, Sparkles, Waves, type LucideIcon } from "lucide-react";
import type { AvailabilitySearch } from "@/lib/booking/service";
import { formatMoney, pickLocale } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { WizardState } from "../types";

const ICONS: Record<string, LucideIcon> = { coffee: Coffee, car: Car, waves: Waves, clock: Clock, map: Map, sparkles: Sparkles };

export function ExtrasStep({ state, availability, onChange, onBack, onContinue }: {
  state: WizardState;
  availability: AvailabilitySearch;
  onChange: (extras: Record<string, number>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const t = useTranslations("booking.extras");
  const tc = useTranslations("common");
  const locale = useLocale();
  const unitLabel: Record<string, string> = {
    PER_STAY: tc("perStay"),
    PER_NIGHT: tc("perNight"),
    PER_PERSON: tc("perPerson"),
    PER_PERSON_PER_NIGHT: tc("perPersonPerNight"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {availability.extras.map((extra) => {
          const Icon = ICONS[extra.icon] ?? Sparkles;
          const qty = state.extras[extra.id] ?? 0;
          const added = qty > 0;
          return (
            <li key={extra.id} data-testid={`extra-${extra.code}`} className={cn("flex flex-col gap-3 rounded-lg border bg-white p-5 shadow-soft transition-colors", added ? "border-copper" : "border-charcoal/10")}>
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sand-100 text-copper"><Icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl">{pickLocale(extra, "name", locale)}</h3>
                    {extra.isDemo ? <Badge variant="sand">{tc("demoBadge")}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{pickLocale(extra, "description", locale)}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-charcoal/10 pt-3">
                <p className="text-sm">
                  {extra.isInquiryOnly ? <span className="text-stone">{tc("inquiryOnly")}</span> : <><span className="num font-semibold text-copper-deep">{formatMoney(extra.price, availability.currency, locale)}</span> <span className="text-xs text-stone">{unitLabel[extra.pricing]}</span></>}
                </p>
                {extra.isInquiryOnly || extra.pricing !== "PER_STAY" ? (
                  <Button variant={added ? "primary" : "outline"} size="sm" onClick={() => onChange({ ...state.extras, [extra.id]: added ? 0 : 1 })} aria-pressed={added}>{added ? t("added") : t("add")}</Button>
                ) : (
                  <div className="inline-flex items-center gap-1 rounded-md border border-charcoal/15 p-0.5">
                    <Button variant="ghost" size="iconSm" onClick={() => onChange({ ...state.extras, [extra.id]: Math.max(0, qty - 1) })} disabled={qty <= 0} aria-label="−"><Minus /></Button>
                    <span className="num w-8 text-center text-sm font-semibold">{qty}</span>
                    <Button variant="ghost" size="iconSm" onClick={() => onChange({ ...state.extras, [extra.id]: Math.min(10, qty + 1) })} aria-label={t("add")}><Plus /></Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>{tc("back")}</Button>
        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={() => { onChange({}); onContinue(); }}>{t("skip")}</Button>
          <Button variant="accent" size="lg" onClick={onContinue} data-testid="continue-guest">{t("continue")}</Button>
        </div>
      </div>
    </div>
  );
}
