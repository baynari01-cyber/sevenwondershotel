import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePage } from "@/lib/admin/page-guard";
import { listReservations } from "@/lib/data/admin";
import type { BookingSource, ReservationStatus } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/admin/page-header";
import { ReservationTable } from "@/components/admin/reservation-table";
import { ReservationFiltersBar } from "@/components/admin/reservation-filters";
import { Button } from "@/components/ui/button";
import { isIsoDate } from "@/lib/utils/dates";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.reservations" });
  return { title: t("title") };
}

const STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"];
const SOURCES: BookingSource[] = ["WEBSITE", "WALK_IN", "PHONE", "EMAIL", "OTA", "TRAVEL_AGENT", "ADMIN"];

export default async function ReservationsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage("reservations.view");
  const sp = await searchParams;
  const t = await getTranslations("admin.reservations");
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const status = STATUSES.includes(str("status") as ReservationStatus) ? (str("status") as ReservationStatus) : "ALL";
  const source = SOURCES.includes(str("source") as BookingSource) ? (str("source") as BookingSource) : "ALL";
  const arrivalFrom = str("from") && isIsoDate(str("from")) ? str("from") : undefined;
  const arrivalTo = str("to") && isIsoDate(str("to")) ? str("to") : undefined;
  const page = Math.max(1, Number(str("page")) || 1);
  const sort = str("sort") === "checkIn" ? "checkIn" : "createdAt";
  const result = await listReservations({ q: str("q"), status, source, arrivalFrom, arrivalTo, page, pageSize: 20, sort });
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const qs = (p: number) => { const n = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) n.set(k, v); n.set("page", String(p)); return `?${n}`; };

  return (
    <>
      <PageHeader title={t("title")} description={t("count", { count: result.total })} actions={<Button asChild variant="accent"><Link href="/admin/reservations/new">{t("new")}</Link></Button>} />
      <ReservationFiltersBar q={str("q") ?? ""} status={status} source={source} from={arrivalFrom ?? ""} to={arrivalTo ?? ""} sort={sort} statuses={STATUSES} sources={SOURCES} />
      <div className="mt-5"><ReservationTable rows={result.rows} /></div>
      {pages > 1 ? (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted-foreground num">{result.page} / {pages}</span>
          <div className="flex gap-2">
            {result.page > 1 ? <Button asChild variant="outline" size="sm"><Link href={`/admin/reservations${qs(result.page - 1)}`}>←</Link></Button> : null}
            {result.page < pages ? <Button asChild variant="outline" size="sm"><Link href={`/admin/reservations${qs(result.page + 1)}`}>→</Link></Button> : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}
