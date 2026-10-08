import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, LayoutDashboard, Mail, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/booking/print-button";
import { getReservationByReference } from "@/lib/data/reservations";
import { getSettings } from "@/lib/data/public";
import { COUNTRY_NAMES } from "@/lib/countries";
import { formatDate, formatDateTime, formatMoney, pickLocale } from "@/lib/utils/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; reference: string }> }): Promise<Metadata> {
  const { locale, reference } = await params;
  const t = await getTranslations({ locale, namespace: "booking.confirmation" });
  return { title: `${t("demoTitle")} · ${reference.toUpperCase()}`, robots: { index: false } };
}

export default async function ConfirmationPage({ params }: { params: Promise<{ locale: string; reference: string }> }) {
  const { locale: paramLocale, reference } = await params;
  setRequestLocale(paramLocale);
  const locale = await getLocale();
  const t = await getTranslations("booking.confirmation");
  const tr = await getTranslations("booking.review");
  const tc = await getTranslations("common");
  const ts = await getTranslations("status");
  const tps = await getTranslations("paymentStatus");
  const [reservation, settings] = await Promise.all([getReservationByReference(reference), getSettings()]);
  if (!reservation) notFound();
  const r = reservation;
  const country = COUNTRY_NAMES[r.guest.country];

  return (
    <div className="bg-ivory">
      <div className="container-x max-w-4xl py-10 lg:py-16">
        <div className="no-print mb-8 flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"><CheckCircle2 className="size-7" /></span>
          <div>
            <p className="eyebrow">{t("subtitle")}</p>
            <h1 className="display-md mt-1">{t("demoTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("body", { email: r.guest.email })}</p>
          </div>
        </div>

        <article className="relative overflow-hidden rounded-lg border border-charcoal/10 bg-white p-6 shadow-soft sm:p-10 print:border-0 print:shadow-none">
          <span aria-hidden="true" className="pointer-events-none absolute -end-8 bottom-10 -rotate-12 rounded border-2 border-copper/40 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-copper/60 rtl:rotate-12">{t("demoStamp")}</span>
          <header className="flex flex-col gap-6 border-b border-charcoal/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-display text-2xl">{pickLocale(settings, "name", locale)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{pickLocale(settings, "address", locale)}</p>
              <p className="mt-1 text-sm text-muted-foreground"><span className="ltr-field num">{settings.phone}</span> · <span className="ltr-field">{settings.email}</span></p>
            </div>
            <div className="sm:text-end">
              <p className="text-xs uppercase tracking-widest text-stone">{t("subtitle")}</p>
              <p className="num font-display text-3xl text-copper-deep" data-testid="reference">{r.reference}</p>
              <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
                <Badge variant="success">{ts(r.status as "CONFIRMED")}</Badge>
                <Badge variant="neutral">{tps(r.paymentStatus as "PAY_AT_PROPERTY")}</Badge>
              </div>
            </div>
          </header>

          <div className="grid gap-8 py-6 sm:grid-cols-2">
            <section>
              <h2 className="eyebrow mb-3">{tr("stay")}</h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{tc("from")}</dt><dd className="num font-medium">{formatDate(r.checkIn, locale, "long")} · {settings.checkInTime}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{tc("to")}</dt><dd className="num font-medium">{formatDate(r.checkOut, locale, "long")} · {settings.checkOutTime}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{tc("nights", { count: r.nights })}</dt><dd>{tc("adults", { count: r.adults })}{r.children ? ` · ${tc("children", { count: r.children })}` : ""}</dd></div>
                {r.arrivalTime ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("createdAt")}</dt><dd className="num">{formatDateTime(r.createdAt, locale)}</dd></div> : <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("createdAt")}</dt><dd className="num">{formatDateTime(r.createdAt, locale)}</dd></div>}
              </dl>
            </section>
            <section>
              <h2 className="eyebrow mb-3">{tr("guestTitle")}</h2>
              <p className="text-sm font-medium">{r.guest.firstName} {r.guest.lastName}</p>
              <p className="text-sm text-muted-foreground"><span className="ltr-field">{r.guest.email}</span></p>
              <p className="text-sm text-muted-foreground"><span className="ltr-field num">{r.guest.phone}</span>{country ? ` · ${locale === "ar" ? country.ar : country.en}` : ""}</p>
              {r.specialRequests ? <p className="mt-2 text-sm italic text-muted-foreground" dir="auto">“{r.specialRequests}”</p> : null}
            </section>
          </div>

          <section className="border-t border-charcoal/10 py-6">
            <h2 className="eyebrow mb-3">{tr("roomsTitle")}</h2>
            <ul className="divide-y divide-charcoal/10 text-sm">
              {r.rooms.map((room) => (
                <li key={room.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{pickLocale(room, "roomTypeName", locale)}</p>
                    <p className="text-xs text-muted-foreground">{pickLocale(room, "ratePlanName", locale)} · {tc("adults", { count: room.adults })}{room.children ? ` · ${tc("children", { count: room.children })}` : ""}</p>
                  </div>
                  <span className="num">{formatMoney(room.roomTotal, r.currency, locale)}</span>
                </li>
              ))}
            </ul>
            {r.extras.length ? (
              <>
                <h2 className="eyebrow mb-3 mt-6">{tr("extrasTitle")}</h2>
                <ul className="divide-y divide-charcoal/10 text-sm">
                  {r.extras.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-4 py-2">
                      <span>{pickLocale(e, "name", locale)}{e.quantity > 1 ? <span className="num"> × {e.quantity}</span> : null}</span>
                      <span className="num">{formatMoney(e.total, r.currency, locale)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section className="border-t border-charcoal/10 py-6">
            <h2 className="eyebrow mb-3">{tr("priceTitle")}</h2>
            <dl className="ms-auto max-w-sm space-y-1.5 text-sm">
              <div className="flex justify-between"><dt>{tr("roomSubtotal")}</dt><dd className="num">{formatMoney(r.roomSubtotal, r.currency, locale)}</dd></div>
              {Number(r.extrasTotal) > 0 ? <div className="flex justify-between"><dt>{tr("extrasTotal")}</dt><dd className="num">{formatMoney(r.extrasTotal, r.currency, locale)}</dd></div> : null}
              {Number(r.discountTotal) > 0 ? <div className="flex justify-between text-success"><dt>{tr("discount", { code: r.promotionCode ?? "" })}</dt><dd className="num">− {formatMoney(r.discountTotal, r.currency, locale)}</dd></div> : null}
              <div className="flex justify-between text-muted-foreground"><dt>{tr("serviceCharge", { rate: Number(settings.serviceChargeRate) })}</dt><dd className="num">{formatMoney(r.serviceChargeTotal, r.currency, locale)}</dd></div>
              <div className="flex justify-between text-muted-foreground"><dt>{tr("tax", { rate: Number(settings.taxRate) })}</dt><dd className="num">{formatMoney(r.taxTotal, r.currency, locale)}</dd></div>
              <div className="flex items-baseline justify-between border-t border-charcoal/10 pt-3"><dt className="font-semibold">{tr("grandTotal")}</dt><dd className="num font-display text-3xl text-copper-deep">{formatMoney(r.grandTotal, r.currency, locale)}</dd></div>
              <p className="text-end text-xs text-stone">{t("payment")}: {tps(r.paymentStatus as "PAY_AT_PROPERTY")}</p>
            </dl>
          </section>

          <section className="border-t border-charcoal/10 pt-6 text-sm">
            <h2 className="eyebrow mb-2">{tr("cancellation")}</h2>
            <p className="text-muted-foreground">{pickLocale(r, "cancellationPolicy", locale)}</p>
            <p className="mt-4 text-xs text-stone">{t("hotelContact", { phone: settings.phone, email: settings.email })}</p>
          </section>
        </article>

        <div className="no-print mt-8 grid gap-8 lg:grid-cols-[1fr_auto]">
          <section className="rounded-lg border border-charcoal/10 bg-ivory-soft p-5">
            <h2 className="eyebrow mb-3">{t("nextSteps")}</h2>
            <ol className="list-decimal space-y-1.5 ps-5 text-sm text-charcoal-muted">
              <li>{t("step1")}</li>
              <li>{t("step2")}</li>
              <li>{t("step3")}</li>
            </ol>
          </section>
          <div className="flex flex-col gap-3">
            <PrintButton label={t("print")} />
            <Button asChild variant="accent"><Link href="/admin/reservations"><LayoutDashboard /> {t("openAdmin")}</Link></Button>
            <Button asChild variant="ghost"><Link href="/book">{t("newSearch")}</Link></Button>
            <p className="flex flex-col gap-1 text-xs text-muted-foreground">
              <a className="inline-flex items-center gap-1.5" href={`tel:${settings.phone.replace(/\s+/g, "")}`}><Phone className="size-3.5" /><span className="ltr-field num">{settings.phone}</span></a>
              <a className="inline-flex items-center gap-1.5" href={`mailto:${settings.email}`}><Mail className="size-3.5" /><span className="ltr-field">{settings.email}</span></a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
