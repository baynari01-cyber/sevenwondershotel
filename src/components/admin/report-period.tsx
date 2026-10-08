"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { REPORT_PERIODS, type ReportPeriodKey } from "@/lib/reports/metrics";
import { addDays } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export function ReportPeriodBar({ period, from, to, exportHref }: { period: ReportPeriodKey; from: string; to: string; exportHref: string }) {
  const t = useTranslations("admin.reports");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();
  const lastInclusive = addDays(to, -1);
  const [custom, setCustom] = React.useState({ from, to: lastInclusive });

  const navigate = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params);
    startTransition(() => router.replace(`${pathname}?${qs}`));
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-charcoal/10 bg-white p-3 shadow-soft lg:flex-row lg:items-center lg:justify-between" aria-busy={pending}>
      <div role="group" aria-label={t("period")} className="inline-flex flex-wrap gap-1 rounded-md bg-sand-100/70 p-1">
        {REPORT_PERIODS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={period === key}
            disabled={pending}
            onClick={() => (key === "custom" ? navigate({ period: "custom", from: custom.from, to: custom.to }) : navigate({ period: key }))}
            className={cn("rounded-sm px-3 py-1.5 text-xs font-medium transition-colors", period === key ? "bg-white text-charcoal shadow-sm" : "text-charcoal-muted hover:text-charcoal")}
            data-testid={`period-${key}`}
          >
            {t(key)}
          </button>
        ))}
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => { e.preventDefault(); if (custom.from && custom.to) navigate({ period: "custom", from: custom.from, to: custom.to }); }}
      >
        <label className="text-[10px] font-semibold uppercase tracking-wider text-stone">
          <span className="mb-1 block">{tc("from")}</span>
          <Input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="h-9 w-40 text-xs" data-testid="report-from" />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-stone">
          <span className="mb-1 block">{tc("to")}</span>
          <Input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="h-9 w-40 text-xs" data-testid="report-to" />
        </label>
        <Button type="submit" variant="outline" size="sm" disabled={pending || !custom.from || !custom.to} data-testid="report-apply">{t("apply")}</Button>
        <Button asChild variant="subtle" size="sm" title={t("exportHint")}>
          <a href={exportHref} download data-testid="report-export"><Download /> {t("export")}</a>
        </Button>
      </form>
    </div>
  );
}
