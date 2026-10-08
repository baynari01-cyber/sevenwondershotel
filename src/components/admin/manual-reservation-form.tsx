"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createManualReservationAction, quoteForAdminAction } from "@/lib/actions/admin-reservations";
import { COUNTRY_NAMES } from "@/lib/countries";
import { addDays, todayIso } from "@/lib/utils/dates";
import { formatMoney, pickLocale } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type Opt = { id: string; nameEn: string; nameAr: string };

export function ManualReservationForm({ roomTypes, ratePlans, extras, currency }: {
  roomTypes: Array<Opt & { maxAdults: number; maxChildren: number }>;
  ratePlans: Opt[];
  extras: Opt[];
  currency: string;
}) {
  const t = useTranslations("admin.reservations");
  const tb = useTranslations("booking");
  const tc = useTranslations("common");
  const ts = useTranslations("source");
  const tst = useTranslations("status");
  const tm = useTranslations("paymentMethod");
  const te = useTranslations("booking.errors");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const today = todayIso();
  const [form, setForm] = React.useState({
    checkIn: addDays(today, 1),
    checkOut: addDays(today, 3),
    rooms: [{ roomTypeId: roomTypes[0]?.id ?? "", ratePlanId: ratePlans[0]?.id ?? "", adults: Math.min(2, roomTypes[0]?.maxAdults ?? 2), children: 0 }],
    extras: {} as Record<string, number>,
    promotionCode: "",
    source: "PHONE",
    status: "CONFIRMED",
    paymentMethod: "PAY_AT_PROPERTY",
    guest: { firstName: "", lastName: "", email: "", phone: "", country: "JO", arrivalTime: "", specialRequests: "" },
  });
  const [quote, setQuote] = React.useState<{ grandTotal: string; roomSubtotal: string; taxTotal: string; serviceChargeTotal: string; extrasTotal: string; discountTotal: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const payload = () => ({
    checkIn: form.checkIn,
    checkOut: form.checkOut,
    rooms: form.rooms,
    extras: Object.entries(form.extras).filter(([, q]) => q > 0).map(([extraId, quantity]) => ({ extraId, quantity })),
    promotionCode: form.promotionCode || null,
  });

  const explain = (code: string, details?: Record<string, unknown>) => {
    switch (code) {
      case "NOT_AVAILABLE": return te("availabilityChanged");
      case "MIN_STAY": return te("minStay", { count: Number(details?.minStay ?? 2) });
      case "CLOSED_DATE": return te("closedDate");
      case "OCCUPANCY": return te("capacity");
      case "PROMOTION_INVALID": return te("invalidPromo");
      case "INVALID_DATES": return te("checkOutAfter");
      case "RATE_PLAN_UNAVAILABLE": return te("ratePlanUnavailable");
      case "VALIDATION": return tv("required");
      default: return te("generic");
    }
  };

  function preview() {
    setError(null);
    startTransition(async () => {
      const r = await quoteForAdminAction(payload());
      if (r.ok) setQuote(r.data);
      else { setQuote(null); setError(explain(r.error, r.details)); }
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const r = await createManualReservationAction({ ...payload(), guest: form.guest, source: form.source, status: form.status, paymentMethod: form.paymentMethod });
      if (r.ok) {
        toast({ kind: "success", title: t("saved"), description: r.data.reference });
        router.push(`/admin/reservations/${r.data.id}`);
        return;
      }
      if (r.error === "VALIDATION" && Array.isArray(r.details?.issues)) {
        const errs: Record<string, string> = {};
        for (const issue of r.details.issues as Array<{ path: string; message: string }>) errs[issue.path] = issue.message;
        setFieldErrors(errs);
      }
      setError(explain(r.error, r.details));
    });
  }

  const fe = (path: string) => {
    const m = fieldErrors[path];
    if (!m) return undefined;
    const key = m.replace(/^validation\./, "");
    return key === "minLength" ? tv("minLength", { min: 2 }) : key === "maxLength" ? tv("maxLength", { max: 1000 }) : ["email", "phone", "required"].includes(key) ? tv(key as "email") : tv("required");
  };

  const countries = Object.entries(COUNTRY_NAMES).map(([code, n]) => ({ code, name: locale === "ar" ? n.ar : n.en })).sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]" noValidate>
      <div className="space-y-6">
        <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
          <h2 className="eyebrow mb-4">{t("stayDetails")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={tb("search.checkIn")} htmlFor="ci"><Input id="ci" type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></Field>
            <Field label={tb("search.checkOut")} htmlFor="co"><Input id="co" type="date" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></Field>
            <Field label={t("source")} htmlFor="source"><NativeSelect id="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{(["WALK_IN", "PHONE", "EMAIL", "OTA", "TRAVEL_AGENT", "ADMIN"] as const).map((s) => <option key={s} value={s}>{ts(s)}</option>)}</NativeSelect></Field>
            <Field label={t("status")} htmlFor="status"><NativeSelect id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{(["CONFIRMED", "PENDING"] as const).map((s) => <option key={s} value={s}>{tst(s)}</option>)}</NativeSelect></Field>
          </div>
          <h3 className="eyebrow mb-2 mt-6">{t("roomsAssigned")}</h3>
          <div className="space-y-3">
            {form.rooms.map((room, i) => {
              const rt = roomTypes.find((x) => x.id === room.roomTypeId);
              const upd = (patch: Partial<typeof room>) => setForm({ ...form, rooms: form.rooms.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
              return (
                <div key={i} className="grid gap-2 rounded-md border border-charcoal/10 p-3 sm:grid-cols-4">
                  <NativeSelect aria-label={t("room")} value={room.roomTypeId} onChange={(e) => upd({ roomTypeId: e.target.value, adults: Math.min(room.adults, roomTypes.find((x) => x.id === e.target.value)?.maxAdults ?? 2) })} className="h-9 text-xs">{roomTypes.map((x) => <option key={x.id} value={x.id}>{pickLocale(x, "name", locale)}</option>)}</NativeSelect>
                  <NativeSelect aria-label={t("ratePlan")} value={room.ratePlanId} onChange={(e) => upd({ ratePlanId: e.target.value })} className="h-9 text-xs">{ratePlans.map((x) => <option key={x.id} value={x.id}>{pickLocale(x, "name", locale)}</option>)}</NativeSelect>
                  <NativeSelect aria-label={tb("search.adults")} value={room.adults} onChange={(e) => upd({ adults: Number(e.target.value) })} className="h-9 text-xs">{Array.from({ length: rt?.maxAdults ?? 4 }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{tc("adults", { count: n })}</option>)}</NativeSelect>
                  <NativeSelect aria-label={tb("search.children")} value={room.children} onChange={(e) => upd({ children: Number(e.target.value) })} className="h-9 text-xs">{Array.from({ length: (rt?.maxChildren ?? 0) + 1 }, (_, n) => n).map((n) => <option key={n} value={n}>{tc("children", { count: n })}</option>)}</NativeSelect>
                </div>
              );
            })}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, rooms: [...form.rooms, { roomTypeId: roomTypes[0].id, ratePlanId: ratePlans[0].id, adults: 2, children: 0 }] })}>+ {t("room")}</Button>
              {form.rooms.length > 1 ? <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, rooms: form.rooms.slice(0, -1) })}>− {t("room")}</Button> : null}
            </div>
          </div>
          <h3 className="eyebrow mb-2 mt-6">{tb("steps.extras")}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {extras.map((e) => (
              <label key={e.id} className="flex items-center justify-between gap-2 rounded-md border border-charcoal/10 px-3 py-2 text-sm"><span>{pickLocale(e, "name", locale)}</span><Input type="number" min={0} max={10} value={form.extras[e.id] ?? 0} onChange={(ev) => setForm({ ...form, extras: { ...form.extras, [e.id]: Number(ev.target.value) } })} className="h-8 w-20" /></label>
            ))}
          </div>
          <div className="mt-4 max-w-xs"><Field label={tb("search.promo")} htmlFor="promo"><Input id="promo" value={form.promotionCode} onChange={(e) => setForm({ ...form, promotionCode: e.target.value.toUpperCase() })} className="ltr-field uppercase" /></Field></div>
        </section>

        <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
          <h2 className="eyebrow mb-4">{t("guestDetails")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tb("guest.firstName")} htmlFor="g-fn" required error={fe("guest.firstName")}><Input id="g-fn" value={form.guest.firstName} onChange={(e) => setForm({ ...form, guest: { ...form.guest, firstName: e.target.value } })} /></Field>
            <Field label={tb("guest.lastName")} htmlFor="g-ln" required error={fe("guest.lastName")}><Input id="g-ln" value={form.guest.lastName} onChange={(e) => setForm({ ...form, guest: { ...form.guest, lastName: e.target.value } })} /></Field>
            <Field label={tb("guest.email")} htmlFor="g-em" required error={fe("guest.email")}><Input id="g-em" type="email" value={form.guest.email} onChange={(e) => setForm({ ...form, guest: { ...form.guest, email: e.target.value } })} /></Field>
            <Field label={tb("guest.phone")} htmlFor="g-ph" required error={fe("guest.phone")}><Input id="g-ph" type="tel" value={form.guest.phone} onChange={(e) => setForm({ ...form, guest: { ...form.guest, phone: e.target.value } })} /></Field>
            <Field label={tb("guest.country")} htmlFor="g-co" required error={fe("guest.country")}><NativeSelect id="g-co" value={form.guest.country} onChange={(e) => setForm({ ...form, guest: { ...form.guest, country: e.target.value } })}>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</NativeSelect></Field>
            <Field label={tb("guest.arrivalTime")} htmlFor="g-at"><Input id="g-at" type="time" value={form.guest.arrivalTime} onChange={(e) => setForm({ ...form, guest: { ...form.guest, arrivalTime: e.target.value } })} /></Field>
            <Field label={tb("guest.specialRequests")} htmlFor="g-sr" className="sm:col-span-2"><Textarea id="g-sr" rows={2} dir="auto" value={form.guest.specialRequests} onChange={(e) => setForm({ ...form, guest: { ...form.guest, specialRequests: e.target.value } })} /></Field>
            <Field label={t("payment")} htmlFor="g-pm"><NativeSelect id="g-pm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{(["PAY_AT_PROPERTY", "CASH", "SIMULATED_CARD", "BANK_TRANSFER"] as const).map((m) => <option key={m} value={m}>{tm(m)}</option>)}</NativeSelect></Field>
          </div>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
          <h2 className="eyebrow mb-3">{tb("review.priceTitle")}</h2>
          {quote ? (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>{tb("review.roomSubtotal")}</dt><dd className="num">{formatMoney(quote.roomSubtotal, currency, locale)}</dd></div>
              {Number(quote.extrasTotal) > 0 ? <div className="flex justify-between"><dt>{tb("review.extrasTotal")}</dt><dd className="num">{formatMoney(quote.extrasTotal, currency, locale)}</dd></div> : null}
              {Number(quote.discountTotal) > 0 ? <div className="flex justify-between text-success"><dt>{tb("review.discount", { code: form.promotionCode })}</dt><dd className="num">− {formatMoney(quote.discountTotal, currency, locale)}</dd></div> : null}
              <div className="flex justify-between text-muted-foreground"><dt>{tb("steps.review")}</dt><dd className="num">{formatMoney(Number(quote.serviceChargeTotal) + Number(quote.taxTotal), currency, locale)}</dd></div>
              <div className="flex items-baseline justify-between border-t border-charcoal/10 pt-2"><dt className="font-semibold">{tb("review.grandTotal")}</dt><dd className="num font-display text-2xl text-copper-deep">{formatMoney(quote.grandTotal, currency, locale)}</dd></div>
            </dl>
          ) : <p className="text-sm text-muted-foreground">{t("modifyHint")}</p>}
          {error ? <p role="alert" className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
          <div className="mt-4 flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={preview} disabled={pending}>{tb("review.priceTitle")}</Button>
            <Button type="submit" variant="accent" disabled={pending}>{t("new")}</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("manualHint")}</p>
      </aside>
    </form>
  );
}
