import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { BarChart3, BedDouble, CalendarCheck, Percent, TrendingUp, Wallet, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getReport } from "@/lib/data/reports";
import { REPORT_PERIODS, type ReportPeriodKey } from "@/lib/reports/metrics";
import { addDays, isIsoDate } from "@/lib/utils/dates";
import { formatDate, formatMoney, formatNumber, formatPercent, pickLocale } from "@/lib/utils/format";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ReportPeriodBar } from "@/components/admin/report-period";
import { BarList, BookingTrendChart, OccupancyChart } from "@/components/admin/report-charts";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.reports" });
  return { title: t("title") };
}

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  await requireUser("reports.view");
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.reports");
  const tso = await getTranslations("source");
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const period = REPORT_PERIODS.includes(str("period") as ReportPeriodKey) ? (str("period") as ReportPeriodKey) : "last30";
  const from = isIsoDate(str("from")) ? str("from") : undefined;
  const to = isIsoDate(str("to")) ? str("to") : undefined;
  const report = await getReport({ period, from, to });
  const money = (v: string) => formatMoney(v, report.currency, locale);
  const exportQuery = new URLSearchParams({ period, ...(period === "custom" ? { from: report.from, to: addDays(report.to, -1) } : {}) });
  const hasData = report.nightsSold > 0 || report.bookingsCreated > 0;
  const peak = report.daily.reduce<typeof report.daily[number] | null>((best, d) => (d.occupancy > (best?.occupancy ?? 0) ? d : best), null);
  const rangeLabel = t("range", { from: formatDate(report.from, locale, "medium"), to: formatDate(addDays(report.to, -1), locale, "medium") });

  return (
    <>
      <PageHeader title={t("title")} description={`${rangeLabel} · ${t("nightsInPeriod", { count: report.nightsInPeriod })}`} />
      <ReportPeriodBar period={period} from={report.from} to={report.to} exportHref={`/api/admin/reports/export?${exportQuery}`} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="report-kpis">
        <StatCard label={t("revenue")} value={money(report.revenue)} hint={t("revenueHint")} icon={Wallet} tone="accent" />
        <StatCard label={t("occupancy")} value={formatPercent(report.occupancy, locale, 1)} hint={t("occupancyHint", { sold: formatNumber(report.nightsSold, locale), available: formatNumber(report.nightsAvailable, locale) })} icon={Percent} tone="dark" />
        <StatCard label={t("adr")} value={money(report.adr)} hint={t("perSoldNight")} icon={TrendingUp} />
        <StatCard label={t("revpar")} value={money(report.revpar)} hint={t("perAvailableNight")} icon={BarChart3} />
        <StatCard label={t("bookings")} value={formatNumber(report.bookingsCreated, locale)} hint={t("bookingsHint", { cancelled: report.bookingsCancelled })} icon={CalendarCheck} />
        <StatCard label={t("cancellationRate")} value={formatPercent(report.cancellationRate, locale, 1)} hint={`${formatNumber(report.bookingsCancelled, locale)} / ${formatNumber(report.bookingsCreated, locale)}`} icon={XCircle} />
        <StatCard label={t("avgStay")} value={t("nightsValue", { value: formatNumber(report.averageStay, locale, 1) })} hint={t("staysHint", { count: report.staysInPeriod })} icon={BedDouble} />
        <StatCard label={t("nightsSold")} value={formatNumber(report.nightsSold, locale)} hint={`${t("nightsAvailable")}: ${formatNumber(report.nightsAvailable, locale)}`} icon={BedDouble} />
      </div>

      {!hasData ? (
        <div className="mt-6"><EmptyState icon={BarChart3} title={t("noData")} /></div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl">{t("trend")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("trendHint")}</p>
            <div className="mt-4"><BookingTrendChart daily={report.daily} locale={locale} label={t("trend")} /></div>
          </section>
          <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl">{t("occupancyTrend")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("occupancyChartHint")}{peak && peak.occupancy > 0 ? ` · ${t("peak", { value: formatPercent(peak.occupancy, locale), date: formatDate(peak.date, locale, "short") })}` : ""}</p>
            <div className="mt-4"><OccupancyChart daily={report.daily} locale={locale} label={t("occupancyTrend")} /></div>
          </section>
          <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl">{t("bySource")}</h2>
            <div className="mt-4">
              {report.bySource.length ? <BarList rows={report.bySource} locale={locale} currency={report.currency} labelFor={(r) => tso(r.key as "WEBSITE")} countLabel={(c) => t("bookingsCount", { count: c })} /> : <p className="text-sm text-muted-foreground">{t("noData")}</p>}
            </div>
          </section>
          <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-xl">{t("byRoomType")}</h2>
            <div className="mt-4">
              {report.byRoomType.length ? <BarList rows={report.byRoomType} locale={locale} currency={report.currency} labelFor={(r) => pickLocale(report.byRoomType.find((x) => x.key === r.key) ?? { nameEn: r.key, nameAr: r.key }, "name", locale)} countLabel={(c) => t("roomNightsCount", { count: c })} /> : <p className="text-sm text-muted-foreground">{t("noData")}</p>}
            </div>
          </section>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-charcoal/10 bg-ivory-soft p-5 xl:col-span-1">
          <p className="eyebrow">{t("definitions")}</p>
          <ul className="mt-3 space-y-2 text-sm text-charcoal-muted">
            <li>{t("defRevenue")}</li>
            <li>{t("defOccupancy")}</li>
            <li>{t("defNightsAvailable")}</li>
            <li>{t("defAdr")}</li>
            <li>{t("defRevpar")}</li>
            <li>{t("defCancellation")}</li>
            <li>{t("defAvgStay")}</li>
            <li>{t("defSource")}</li>
          </ul>
        </section>
        <details className="group self-start rounded-lg border border-charcoal/10 bg-white shadow-soft xl:col-span-2" data-testid="daily-table">
          <summary className="cursor-pointer select-none px-5 py-4 font-display text-xl marker:text-copper">{t("dailyTable")}</summary>
          <div className="max-h-[28rem] overflow-auto border-t border-charcoal/10">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-ivory-soft text-xs uppercase tracking-wider text-stone">
                <tr>
                  <th scope="col" className="px-4 py-2 text-start">{t("date")}</th>
                  <th scope="col" className="px-4 py-2 text-end">{t("created")}</th>
                  <th scope="col" className="px-4 py-2 text-end">{t("cancelled")}</th>
                  <th scope="col" className="px-4 py-2 text-end">{t("sold")}</th>
                  <th scope="col" className="px-4 py-2 text-end">{t("availableRooms")}</th>
                  <th scope="col" className="px-4 py-2 text-end">{t("occupancy")}</th>
                  <th scope="col" className="px-4 py-2 text-end">{t("revenue")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {report.daily.map((d) => (
                  <tr key={d.date} className={d.date === report.today ? "bg-copper/5" : undefined}>
                    <td className="num px-4 py-1.5">{formatDate(d.date, locale, "weekday")}</td>
                    <td className="num px-4 py-1.5 text-end">{formatNumber(d.created, locale)}</td>
                    <td className="num px-4 py-1.5 text-end">{formatNumber(d.cancelled, locale)}</td>
                    <td className="num px-4 py-1.5 text-end">{formatNumber(d.nightsSold, locale)}</td>
                    <td className="num px-4 py-1.5 text-end">{formatNumber(d.nightsAvailable, locale)}</td>
                    <td className="num px-4 py-1.5 text-end">{formatPercent(d.occupancy, locale)}</td>
                    <td className="num px-4 py-1.5 text-end">{money(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </>
  );
}
