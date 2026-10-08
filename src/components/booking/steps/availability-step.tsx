"use client";
import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { BedDouble, Check, ChevronDown, Maximize2, Minus, Plus, Users } from "lucide-react";
import type { AvailabilitySearch, RoomTypeAvailability } from "@/lib/booking/service";
import { formatDate, formatMoney, pickLocale } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";
import type { SelectedRoom, WizardState } from "../types";

export function AvailabilityStep({ state, availability, onChange, onBack, onContinue }: {
  state: WizardState;
  availability: AvailabilitySearch;
  onChange: (rooms: SelectedRoom[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const t = useTranslations("booking.availability");
  const te = useTranslations("booking.errors");
  const tc = useTranslations("common");
  const tr = useTranslations("rooms");
  const locale = useLocale();
  const wanted = state.search.rooms;
  const selected = state.selectedRooms;
  const guests = state.search.adults + state.search.children;
  const anyAvailable = availability.roomTypes.some((r) => r.available > 0);

  function countFor(roomTypeId: string) {
    return selected.filter((r) => r.roomTypeId === roomTypeId).length;
  }

  function add(rt: RoomTypeAvailability) {
    if (selected.length >= wanted) return;
    if (countFor(rt.roomTypeId) >= rt.available) return;
    const remainingAdults = state.search.adults - selected.reduce((a, r) => a + r.adults, 0);
    const remainingChildren = state.search.children - selected.reduce((a, r) => a + r.children, 0);
    const slotsLeft = wanted - selected.length;
    const adults = Math.max(1, Math.min(rt.maxAdults, Math.ceil(remainingAdults / slotsLeft)));
    const children = Math.max(0, Math.min(rt.maxChildren, Math.ceil(remainingChildren / slotsLeft), rt.maxOccupancy - adults));
    onChange([...selected, { key: `${rt.roomTypeId}-${Date.now()}-${selected.length}`, roomTypeId: rt.roomTypeId, ratePlanId: rt.offers[0]?.ratePlanId ?? null, adults, children }]);
  }

  function remove(roomTypeId: string) {
    const idx = [...selected].reverse().findIndex((r) => r.roomTypeId === roomTypeId);
    if (idx === -1) return;
    const realIdx = selected.length - 1 - idx;
    onChange(selected.filter((_, i) => i !== realIdx));
  }

  function updateGuests(key: string, patch: Partial<Pick<SelectedRoom, "adults" | "children">>) {
    onChange(selected.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const totalSelectedGuests = selected.reduce((a, r) => a + r.adults + r.children, 0);
  const capacityOk = selected.length === wanted && totalSelectedGuests >= guests;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="num">{formatDate(availability.checkIn, locale, "weekday")}</span> → <span className="num">{formatDate(availability.checkOut, locale, "weekday")}</span> · {t("subtitle", { nights: availability.nights, guests, rooms: wanted })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>{t("changeDates")}</Button>
      </div>

      {!anyAvailable ? <EmptyState title={t("nothingAvailable")} action={<Button variant="outline" onClick={onBack}>{t("changeDates")}</Button>} /> : null}

      <ul className="space-y-4">
        {availability.roomTypes.map((rt) => {
          const count = countFor(rt.roomTypeId);
          const soldOut = rt.available < 1;
          const tooSmall = rt.maxOccupancy * wanted < guests && wanted === 1;
          const canAdd = !soldOut && selected.length < wanted && count < rt.available;
          return (
            <li key={rt.roomTypeId} data-testid={`room-type-${rt.code}`} className={cn("overflow-hidden rounded-lg border bg-white shadow-soft transition-colors", count > 0 ? "border-copper" : "border-charcoal/10", soldOut && "opacity-70")}>
              <div className="grid gap-0 md:grid-cols-[280px_1fr]">
                <div className="img-grade img-warm relative aspect-[4/3] md:aspect-auto md:min-h-[220px]">
                  {rt.images[0] ? <Image src={rt.images[0].url} alt={pickLocale(rt.images[0], "alt", locale)} fill sizes="(min-width: 768px) 280px, 100vw" className="object-cover" /> : null}
                  <div className="absolute start-3 top-3 z-10 flex gap-2">
                    {rt.isSuite ? <Badge variant="copper">{tr("suite")}</Badge> : null}
                    {rt.hasBalcony ? <Badge variant="sand">{tr("balcony")}</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-col p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-2xl">{pickLocale(rt, "name", locale)}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{pickLocale(rt, "short", locale)}</p>
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-muted">
                        <li className="inline-flex items-center gap-1"><Users className="size-3.5 text-copper" />{tr("sleeps", { count: rt.maxOccupancy })}</li>
                        <li className="inline-flex items-center gap-1"><BedDouble className="size-3.5 text-copper" />{pickLocale(rt, "bedConfig", locale)}</li>
                        {rt.sizeSqm ? <li className="inline-flex items-center gap-1"><Maximize2 className="size-3.5 text-copper" /><span className="num">{tr("size", { size: rt.sizeSqm })}</span></li> : null}
                      </ul>
                    </div>
                    <div className="text-end">
                      {soldOut ? (
                        <p className="text-sm font-medium text-danger">{rt.closed ? t("closed") : rt.minStay > availability.nights ? t("minStay", { count: rt.minStay }) : t("soldOut")}</p>
                      ) : (
                        <>
                          <p className="text-[10px] uppercase tracking-widest text-stone">{tc("from")}</p>
                          <p className="num font-display text-2xl text-copper-deep">{rt.fromNightly ? formatMoney(rt.fromNightly, availability.currency, locale) : "—"}</p>
                          <p className="text-[11px] text-stone">{tc("perNight")}</p>
                          {rt.fromTotal ? <p className="mt-1 text-xs text-muted-foreground">{t("stayTotal", { amount: formatMoney(rt.fromTotal, availability.currency, locale), nights: availability.nights })}</p> : null}
                          <p className="text-[11px] text-stone">{t("taxesExcluded")}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <Details rt={rt} locale={locale} currency={availability.currency} />

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/10 pt-4">
                    <p data-testid="available-count" data-available={rt.available} className={cn("text-xs font-medium", rt.available <= 2 && !soldOut ? "text-warning" : "text-muted-foreground")}>
                      {soldOut ? (tooSmall ? t("tooSmall", { count: guests }) : "") : t("left", { count: rt.available })}
                    </p>
                    <div className="flex items-center gap-2">
                      {count > 0 ? (
                        <>
                          <Button variant="outline" size="iconSm" onClick={() => remove(rt.roomTypeId)} aria-label={t("remove")}><Minus /></Button>
                          <span className="num w-6 text-center font-semibold">{count}</span>
                          <Button variant="outline" size="iconSm" onClick={() => add(rt)} disabled={!canAdd} aria-label={t("select")}><Plus /></Button>
                        </>
                      ) : (
                        <Button variant={soldOut ? "subtle" : "primary"} size="sm" onClick={() => add(rt)} disabled={!canAdd} data-testid={`select-${rt.code}`}>
                          {t("select")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {selected.length ? (
        <div className="rounded-lg border border-charcoal/10 bg-ivory-soft p-5">
          <p className="eyebrow">{t("assignGuests")}</p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {selected.map((room, i) => {
              const rt = availability.roomTypes.find((r) => r.roomTypeId === room.roomTypeId)!;
              return (
                <li key={room.key} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white p-3 text-sm shadow-xs">
                  <div>
                    <p className="font-medium">{t("roomLabel", { index: i + 1 })} · {pickLocale(rt, "name", locale)}</p>
                    <p className="text-xs text-muted-foreground">{tr("maxAdults", { count: rt.maxAdults })} {tr("maxChildren", { count: rt.maxChildren })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Counter label={tc("adults", { count: room.adults })} value={room.adults} min={1} max={Math.min(rt.maxAdults, rt.maxOccupancy - room.children)} onChange={(v) => updateGuests(room.key, { adults: v })} />
                    {rt.maxChildren > 0 ? <Counter label={tc("children", { count: room.children })} value={room.children} min={0} max={Math.min(rt.maxChildren, rt.maxOccupancy - room.adults)} onChange={(v) => updateGuests(room.key, { children: v })} /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>{tc("back")}</Button>
        <div className="flex items-center gap-3">
          {!capacityOk ? <p className="text-xs text-muted-foreground">{selected.length < wanted ? t("needRooms", { count: wanted - selected.length }) : te("capacity")}</p> : null}
          <Button variant="accent" size="lg" disabled={!capacityOk} onClick={onContinue} data-testid="continue-rates">{t("continue")}</Button>
        </div>
      </div>
    </div>
  );
}

function Counter({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-charcoal/15 p-0.5">
      <Button variant="ghost" size="iconSm" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="−"><Minus /></Button>
      <span className="min-w-20 text-center text-xs">{label}</span>
      <Button variant="ghost" size="iconSm" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="+"><Plus /></Button>
    </div>
  );
}

function Details({ rt, locale, currency }: { rt: RoomTypeAvailability; locale: string; currency: string }) {
  const [open, setOpen] = React.useState(false);
  const t = useTranslations("booking.availability");
  const tr = useTranslations("rooms");
  const offer = rt.offers[0];
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-copper hover:text-copper-deep" aria-expanded={open}>
        {t("details")} <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">{tr("amenities")}</p>
            <ul className="grid grid-cols-2 gap-1 text-xs text-charcoal-muted">
              {rt.amenities.map((a) => <li key={a.key} className="inline-flex items-center gap-1"><Check className="size-3 text-success" />{pickLocale(a, "label", locale)}</li>)}
            </ul>
          </div>
          {offer ? (
            <div>
              <p className="eyebrow mb-2">{t("nightlyBreakdown")}</p>
              <ul className="space-y-0.5 text-xs text-charcoal-muted">
                {offer.nightly.map((n) => <li key={n.date} className="flex justify-between"><span className="num">{formatDate(n.date, locale, "weekday")}</span><span className="num">{formatMoney(n.rate, currency, locale)}</span></li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
