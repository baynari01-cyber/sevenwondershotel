"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ShieldCheck, Tag, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { addDays, diffNights, todayIso } from "@/lib/utils/dates";
import type { WizardState } from "../types";

export function SearchStep({ state, settings, onSubmit, loading, error }: {
  state: WizardState;
  settings: { childAgeLimit: number; maxRoomsPerBooking: number; maxNightsPerBooking: number };
  onSubmit: (search: WizardState["search"]) => void;
  loading: boolean;
  error: string | null;
}) {
  const t = useTranslations("booking.search");
  const te = useTranslations("booking.errors");
  const tc = useTranslations("common");
  const locale = useLocale();
  const today = todayIso();
  const [form, setForm] = React.useState(state.search);
  const [localError, setLocalError] = React.useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.checkIn < today) return setLocalError(te("checkInPast"));
    if (form.checkOut <= form.checkIn) return setLocalError(te("checkOutAfter"));
    const nights = diffNights(form.checkIn, form.checkOut);
    if (nights > settings.maxNightsPerBooking) return setLocalError(te("maxNights", { max: settings.maxNightsPerBooking }));
    if (form.rooms > settings.maxRoomsPerBooking) return setLocalError(te("maxRooms", { max: settings.maxRoomsPerBooking }));
    if (form.adults < form.rooms) return setLocalError(te("adultsMin"));
    setLocalError(null);
    onSubmit(form);
  }

  const shownError = localError ?? error;

  return (
    <form onSubmit={submit} className="rounded-lg border border-charcoal/10 bg-white p-6 shadow-soft sm:p-8" noValidate>
      <h2 className="font-display text-3xl">{t("title")}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={<span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-copper" />{t("checkIn")}</span>} htmlFor="checkIn" required>
          <Input id="checkIn" type="date" min={today} value={form.checkIn} lang={locale} required onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value, checkOut: e.target.value >= f.checkOut ? addDays(e.target.value, 1) : f.checkOut }))} />
        </Field>
        <Field label={<span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-copper" />{t("checkOut")}</span>} htmlFor="checkOut" required>
          <Input id="checkOut" type="date" min={addDays(form.checkIn, 1)} value={form.checkOut} lang={locale} required onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} />
        </Field>
        <Field label={<span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-copper" />{t("adults")}</span>} htmlFor="adults">
          <NativeSelect id="adults" value={form.adults} onChange={(e) => setForm((f) => ({ ...f, adults: Number(e.target.value) }))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{tc("adults", { count: n })}</option>)}
          </NativeSelect>
        </Field>
        <Field label={t("children")} htmlFor="children" hint={t("childrenHint", { age: settings.childAgeLimit })}>
          <NativeSelect id="children" value={form.children} onChange={(e) => setForm((f) => ({ ...f, children: Number(e.target.value) }))}>
            {Array.from({ length: 7 }, (_, i) => i).map((n) => <option key={n} value={n}>{tc("children", { count: n })}</option>)}
          </NativeSelect>
        </Field>
        <Field label={t("roomsCount")} htmlFor="rooms">
          <NativeSelect id="rooms" value={form.rooms} onChange={(e) => setForm((f) => ({ ...f, rooms: Number(e.target.value) }))}>
            {Array.from({ length: settings.maxRoomsPerBooking }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{tc("rooms", { count: n })}</option>)}
          </NativeSelect>
        </Field>
        <Field label={<span className="inline-flex items-center gap-1.5"><Tag className="size-3.5 text-copper" />{t("promo")}</span>} htmlFor="promo">
          <Input id="promo" value={form.promotionCode} placeholder={t("promoPlaceholder")} className="ltr-field uppercase" maxLength={30} onChange={(e) => setForm((f) => ({ ...f, promotionCode: e.target.value.toUpperCase() }))} />
        </Field>
      </div>
      {shownError ? <p role="alert" className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{shownError}</p> : null}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-success" />{t("flexible")}</li>
          <li className="inline-flex items-center gap-1.5"><Wallet className="size-3.5 text-success" />{t("noPrepayment")}</li>
          <li className="inline-flex items-center gap-1.5"><Tag className="size-3.5 text-success" />{t("bestRate")}</li>
        </ul>
        <Button type="submit" variant="accent" size="lg" disabled={loading}>{loading ? t("searching") : t("submit")}</Button>
      </div>
    </form>
  );
}
