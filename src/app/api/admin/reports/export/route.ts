import { NextResponse, type NextRequest } from "next/server";
import { AuthError, requireUser } from "@/lib/auth/current-user";
import { getReport } from "@/lib/data/reports";
import { dailyTableToCsv, REPORT_PERIODS, type ReportPeriodKey } from "@/lib/reports/metrics";
import { addDays, isIsoDate } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

/** Daily report table as CSV. Requires the `reports.view` permission; never cached. */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireUser("reports.view");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: e.code === "UNAUTHENTICATED" ? 401 : 403 });
    throw e;
  }
  const sp = request.nextUrl.searchParams;
  const periodParam = sp.get("period");
  const period: ReportPeriodKey = REPORT_PERIODS.includes(periodParam as ReportPeriodKey) ? (periodParam as ReportPeriodKey) : "last30";
  const from = sp.get("from");
  const to = sp.get("to");
  const report = await getReport({ period, from: isIsoDate(from) ? from : undefined, to: isIsoDate(to) ? to : undefined });
  const csv = dailyTableToCsv(report.daily);
  const filename = `seven-wonders-report-${report.from}-to-${addDays(report.to, -1)}.csv`;
  return new Response(`﻿${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
