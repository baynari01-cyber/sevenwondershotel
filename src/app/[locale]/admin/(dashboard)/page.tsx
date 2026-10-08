import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDownToLine, ArrowUpFromLine, BedDouble, Percent, TrendingUp, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePage } from "@/lib/admin/page-guard";
import { arrivalsOn, departuresOn, getOverviewStats, recentActivity, recentReservations, upcomingArrivals } from "@/lib/data/admin";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatPercent } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ReservationTable } from "@/components/admin/reservation-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.nav" });
  return { title: t("overview") };
}

export default async function AdminOverviewPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ forbidden?: string }> }) {
  const { locale: paramLocale } = await params;
  const { forbidden } = await searchParams;
  setRequestLocale(paramLocale);
  await requirePage("dashboard.view");
  const locale = await getLocale();
  const t = await getTranslations("admin.overview");
  const tr = await getTranslations("admin.reservations");
  const tc = await getTranslations("common");
  const ta = await getTranslations("admin");
  const [stats, arrivals, departures, upcoming, recent, activity] = await Promise.all([getOverviewStats(), arrivalsOn(todayOf()), departuresOn(todayOf()), upcomingArrivals(6), recentReservations(8), recentActivity(10)]);
  const occupancy = stats.totalRooms ? stats.occupiedTonight / stats.totalRooms : 0;

  return (
    <>
      {forbidden ? <p role="alert" className="mb-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">{ta("forbidden")}</p> : null}
      <PageHeader title={t("title")} description={`${formatDate(stats.today, locale, "long")} · ${t("pendingCount", { count: stats.pendingCount })} · ${t("unreadMessages", { count: stats.unreadMessages })}`} actions={<Button asChild variant="accent"><Link href="/admin/reservations/new">{tr("new")}</Link></Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("arrivals")} value={formatNumber(stats.arrivals, locale)} icon={ArrowDownToLine} />
        <StatCard label={t("departures")} value={formatNumber(stats.departures, locale)} icon={ArrowUpFromLine} />
        <StatCard label={t("occupancy")} value={formatPercent(occupancy, locale)} hint={t("occupancyDetail", { occupied: stats.occupiedTonight, total: stats.totalRooms })} icon={Percent} tone="dark" />
        <StatCard label={t("inHouse")} value={formatNumber(stats.inHouse, locale)} icon={BedDouble} />
        <StatCard label={t("revenueMonth")} value={formatMoney(stats.revenueMonth, "JOD", locale, { compact: true })} icon={Wallet} tone="accent" />
        <StatCard label={t("bookingsMonth")} value={formatNumber(stats.bookingsMonth, locale)} icon={TrendingUp} />
        <StatCard label={t("adr")} value={formatMoney(stats.adrMonth, "JOD", locale)} icon={TrendingUp} />
        <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone">{t("next7")}</p>
          <ul className="mt-3 flex items-end gap-1.5" aria-label={t("next7")}>
            {stats.next7.map((n) => {
              const pct = n.total ? n.occupied / n.total : 0;
              return (
                <li key={n.date} className="flex flex-1 flex-col items-center gap-1" title={`${formatDate(n.date, locale, "weekday")}: ${n.occupied}/${n.total}`}>
                  <div className="flex h-16 w-full items-end rounded-sm bg-sand-100"><div className="w-full rounded-sm bg-copper transition-[height]" style={{ height: `${Math.max(4, pct * 100)}%` }} /></div>
                  <span className="num text-[10px] text-stone">{formatDate(n.date, locale, "short").split(" ")[0]}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl">{t("newBookings")}</h2><Link href="/admin/reservations" className="text-sm font-semibold text-copper hover:text-copper-deep">{t("viewAll")}</Link></div>
          <ReservationTable rows={recent} compact />
        </section>
        <section className="space-y-6">
          <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl">{t("arrivals")}</h2>
            <ul className="mt-3 divide-y divide-charcoal/10 text-sm">
              {arrivals.length ? arrivals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2"><div><Link href={`/admin/reservations/${r.id}`} className="font-medium hover:text-copper">{r.guestName}</Link><p className="text-xs text-muted-foreground">{r.rooms.map((x) => x.roomNumber ?? "—").join(", ")}</p></div><StatusBadge status={r.status} /></li>
              )) : <li className="py-2 text-sm text-muted-foreground">{t("noArrivals")}</li>}
            </ul>
            <h2 className="mt-5 font-display text-xl">{t("departures")}</h2>
            <ul className="mt-3 divide-y divide-charcoal/10 text-sm">
              {departures.length ? departures.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2"><div><Link href={`/admin/reservations/${r.id}`} className="font-medium hover:text-copper">{r.guestName}</Link><p className="text-xs text-muted-foreground">{r.rooms.map((x) => x.roomNumber ?? "—").join(", ")}</p></div><StatusBadge status={r.status} /></li>
              )) : <li className="py-2 text-sm text-muted-foreground">{t("noDepartures")}</li>}
            </ul>
          </div>
          <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl">{t("upcoming")}</h2>
            <ul className="mt-3 divide-y divide-charcoal/10 text-sm">
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2"><div><Link href={`/admin/reservations/${r.id}`} className="font-medium hover:text-copper">{r.guestName}</Link><p className="num text-xs text-muted-foreground">{formatDate(r.checkIn, locale, "weekday")} · {tc("nights", { count: r.nights })}</p></div><span className="num text-xs">{formatMoney(r.grandTotal, r.currency, locale)}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl">{t("recentActivity")}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-copper" /><div><p><span className="font-medium">{a.actorName}</span> <span className="text-muted-foreground">{a.summary}</span></p><p className="num text-xs text-stone">{formatDateTime(a.createdAt, locale)}</p></div></li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}

function todayOf() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Amman", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
