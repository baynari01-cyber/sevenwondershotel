import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Printer } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { can } from "@/lib/auth/current-user";
import { requirePage } from "@/lib/admin/page-guard";
import { getReservationDetail } from "@/lib/data/admin";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/data/public";
import { COUNTRY_NAMES } from "@/lib/countries";
import { formatDate, formatDateTime, formatMoney, pickLocale } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge, PaymentBadge } from "@/components/admin/status-badge";
import { AssignRoomSelect, ModifyStayDialog, NoteForm, PaymentForm, StatusActions } from "@/components/admin/reservation-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: id.toUpperCase() };
}

export default async function ReservationDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: paramLocale, id } = await params;
  setRequestLocale(paramLocale);
  const user = await requirePage("reservations.view");
  const locale = await getLocale();
  const [r, roomTypes, ratePlans, extras, settings] = await Promise.all([
    getReservationDetail(id),
    prisma.roomType.findMany({ where: { isActive: true }, select: { id: true, nameEn: true, nameAr: true, maxAdults: true, maxChildren: true }, orderBy: { sortOrder: "asc" } }),
    prisma.ratePlan.findMany({ where: { isActive: true }, select: { id: true, nameEn: true, nameAr: true }, orderBy: { sortOrder: "asc" } }),
    prisma.extra.findMany({ where: { isActive: true }, select: { id: true, nameEn: true, nameAr: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
  ]);
  if (!r) notFound();
  const t = await getTranslations("admin.reservations");
  const tb = await getTranslations("booking.review");
  const tc = await getTranslations("common");
  const ts = await getTranslations("source");
  const tm = await getTranslations("paymentMethod");
  const canManage = can(user, "reservations.manage");
  const country = COUNTRY_NAMES[r.guest.country];
  const balance = (Number(r.grandTotal) - Number(r.paidTotal)).toFixed(2);

  return (
    <>
      <Link href="/admin/reservations" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-copper"><ArrowLeft className="size-4 rtl:-scale-x-100" />{t("title")}</Link>
      <PageHeader
        title={t("detailTitle", { reference: r.reference })}
        description={`${ts(r.source)} · ${t("created")} ${formatDateTime(r.createdAt, locale)}${r.createdBy ? ` · ${t("createdBy")} ${r.createdBy.name}` : ` · ${t("online")}`}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href={`/book/confirmation/${r.reference}`} target="_blank"><Printer /> {t("printConfirmation")}</Link></Button>
            <ModifyStayDialog reservation={r} roomTypes={roomTypes} ratePlans={ratePlans} extras={extras} canManage={canManage} />
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span data-testid="reservation-status"><StatusBadge status={r.status} /></span>
        <PaymentBadge status={r.paymentStatus} />
        {r.promotionCode ? <Badge variant="sand">{t("promotion")}: {r.promotionCode}</Badge> : null}
        <div className="ms-auto"><StatusActions reservation={r} canManage={canManage} /></div>
      </div>
      {r.cancelledAt ? <p className="mb-6 rounded-md bg-danger/10 px-4 py-2 text-sm text-danger"><span className="num">{formatDateTime(r.cancelledAt, locale)}</span>{r.cancellationReason ? ` · ${r.cancellationReason}` : ""}</p> : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="eyebrow mb-3">{t("stayDetails")}</h2>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-stone">{tc("from")}</dt><dd className="num font-medium">{formatDate(r.checkIn, locale, "long")}</dd></div>
              <div><dt className="text-xs text-stone">{tc("to")}</dt><dd className="num font-medium">{formatDate(r.checkOut, locale, "long")}</dd></div>
              <div><dt className="text-xs text-stone">{tc("nights", { count: r.nights })}</dt><dd>{tc("adults", { count: r.adults })} · {tc("children", { count: r.children })}</dd></div>
              <div><dt className="text-xs text-stone">{t("arrivalTime")}</dt><dd className="num">{r.arrivalTime ?? "—"}</dd></div>
              {r.specialRequests ? <div className="sm:col-span-2"><dt className="text-xs text-stone">{t("specialRequests")}</dt><dd dir="auto" className="italic">“{r.specialRequests}”</dd></div> : null}
            </dl>
            <h3 className="eyebrow mb-2 mt-6">{t("roomsAssigned")}</h3>
            <ul className="divide-y divide-charcoal/10 text-sm">
              {r.rooms.map((room) => (
                <li key={room.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div><p className="font-medium">{pickLocale(room, "roomTypeName", locale)}</p><p className="text-xs text-muted-foreground">{pickLocale(room, "ratePlanName", locale)} · {tc("adults", { count: room.adults })}{room.children ? ` · ${tc("children", { count: room.children })}` : ""}</p></div>
                  <AssignRoomSelect room={room} canManage={canManage && ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(r.status)} />
                  <span className="num text-end font-medium">{formatMoney(room.roomTotal, r.currency, locale)}</span>
                  <details className="text-xs text-muted-foreground sm:col-span-3"><summary className="cursor-pointer">{t("nightlyRates")}</summary><ul className="mt-1 grid grid-cols-2 gap-x-4 sm:grid-cols-4">{room.nightly.map((n) => <li key={n.date} className="num flex justify-between"><span>{formatDate(n.date, locale, "short")}</span><span>{formatMoney(n.rate, r.currency, locale)}</span></li>)}</ul></details>
                </li>
              ))}
            </ul>
            {r.extras.length ? (<><h3 className="eyebrow mb-2 mt-6">{tb("extrasTitle")}</h3><ul className="divide-y divide-charcoal/10 text-sm">{r.extras.map((e) => <li key={e.id} className="flex justify-between py-2"><span>{pickLocale(e, "name", locale)}{e.quantity > 1 ? <span className="num"> × {e.quantity}</span> : null}</span><span className="num">{formatMoney(e.total, r.currency, locale)}</span></li>)}</ul></>) : null}
          </section>

          <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="eyebrow mb-3">{tb("priceTitle")}</h2>
            <dl className="ms-auto max-w-sm space-y-1 text-sm">
              <div className="flex justify-between"><dt>{tb("roomSubtotal")}</dt><dd className="num">{formatMoney(r.roomSubtotal, r.currency, locale)}</dd></div>
              {Number(r.extrasTotal) > 0 ? <div className="flex justify-between"><dt>{tb("extrasTotal")}</dt><dd className="num">{formatMoney(r.extrasTotal, r.currency, locale)}</dd></div> : null}
              {Number(r.discountTotal) > 0 ? <div className="flex justify-between text-success"><dt>{tb("discount", { code: r.promotionCode ?? "" })}</dt><dd className="num">− {formatMoney(r.discountTotal, r.currency, locale)}</dd></div> : null}
              <div className="flex justify-between text-muted-foreground"><dt>{tb("serviceCharge", { rate: Number(settings.serviceChargeRate) })}</dt><dd className="num">{formatMoney(r.serviceChargeTotal, r.currency, locale)}</dd></div>
              <div className="flex justify-between text-muted-foreground"><dt>{tb("tax", { rate: Number(settings.taxRate) })}</dt><dd className="num">{formatMoney(r.taxTotal, r.currency, locale)}</dd></div>
              <div className="flex items-baseline justify-between border-t border-charcoal/10 pt-2"><dt className="font-semibold">{tb("grandTotal")}</dt><dd className="num font-display text-2xl text-copper-deep">{formatMoney(r.grandTotal, r.currency, locale)}</dd></div>
              <div className="flex justify-between text-xs"><dt>{t("paid")}</dt><dd className="num">{formatMoney(r.paidTotal, r.currency, locale)}</dd></div>
              <div className="flex justify-between text-xs"><dt>{t("balance")}</dt><dd className="num font-semibold">{formatMoney(balance, r.currency, locale)}</dd></div>
            </dl>
            <h3 className="eyebrow mb-2 mt-6">{t("paymentsTitle")}</h3>
            {r.payments.length ? <ul className="divide-y divide-charcoal/10 text-sm">{r.payments.map((p) => <li key={p.id} className="flex justify-between py-2"><span>{tm(p.method as "CASH")}<span className="block text-xs text-muted-foreground">{p.note}</span></span><span className="text-end"><span className="num block">{formatMoney(p.amount, r.currency, locale)}</span><span className="num text-xs text-stone">{formatDateTime(p.createdAt, locale)}</span></span></li>)}</ul> : <p className="text-sm text-muted-foreground">{t("noPayments")}</p>}
            <PaymentForm reservation={r} canManage={canManage && Number(balance) > 0 && r.status !== "CANCELLED"} />
            <p className="mt-3 text-xs text-stone">{t("cancellationPolicy")}: {pickLocale(r, "cancellationPolicy", locale)}</p>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="eyebrow mb-3">{t("guestDetails")}</h2>
            <p className="font-medium">{r.guest.firstName} {r.guest.lastName}</p>
            <p className="text-sm"><a className="ltr-field hover:text-copper" href={`mailto:${r.guest.email}`}>{r.guest.email}</a></p>
            <p className="text-sm"><a className="ltr-field num hover:text-copper" href={`tel:${r.guest.phone.replace(/\s+/g, "")}`}>{r.guest.phone}</a></p>
            <p className="text-sm text-muted-foreground">{country ? (locale === "ar" ? country.ar : country.en) : r.guest.country} · {r.locale.toUpperCase()}</p>
          </section>
          <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="eyebrow mb-3">{t("notes")}</h2>
            {r.notes.length ? <ul className="space-y-3 text-sm">{r.notes.map((n) => <li key={n.id} className="rounded-md bg-ivory-soft p-3"><p dir="auto">{n.body}</p><p className="num mt-1 text-xs text-stone">{n.authorName ?? "—"} · {formatDateTime(n.createdAt, locale)}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">{t("noNotes")}</p>}
            <NoteForm reservationId={r.id} canManage={canManage} />
          </section>
          <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="eyebrow mb-3">{t("activity")}</h2>
            <ul className="space-y-2 text-sm">{r.activity.map((a) => <li key={a.id}><p><span className="font-medium">{a.actorName}</span> <span className="text-muted-foreground">{a.summary}</span></p><p className="num text-xs text-stone">{formatDateTime(a.createdAt, locale)}</p></li>)}</ul>
          </section>
        </div>
      </div>
    </>
  );
}
