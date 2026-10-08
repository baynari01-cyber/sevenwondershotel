"use client";
import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { BedDouble, Pencil, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { RoomTypeRowDTO } from "@/lib/data/admin-catalog";
import { setRoomTypeActiveAction } from "@/lib/actions/admin-rooms";
import { formatMoney, pickLocale } from "@/lib/utils/format";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { DataTable, Td, Th, theadClass } from "@/components/admin/form-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";

export function RoomTypeTable({ rows, canManage, currency }: { rows: RoomTypeRowDTO[]; canManage: boolean; currency: string }) {
  const t = useTranslations("admin.rooms");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  if (!rows.length) return <EmptyState icon={BedDouble} title={t("noTypes")} body={t("noTypesHint")} action={canManage ? <Button asChild variant="accent"><Link href="/admin/rooms/new">{t("newType")}</Link></Button> : undefined} />;

  function toggle(row: RoomTypeRowDTO, isActive: boolean) {
    setPendingId(row.id);
    startTransition(async () => {
      feedback(await setRoomTypeActiveAction({ id: row.id, isActive }), t("saved"));
      setPendingId(null);
    });
  }

  return (
    <DataTable minWidth={860}>
      <thead className={theadClass}>
        <tr>
          <Th>{t("category")}</Th>
          <Th>{t("code")}</Th>
          <Th align="end">{t("baseRate")}</Th>
          <Th align="end">{t("weekendRate")}</Th>
          <Th>{t("occupancy")}</Th>
          <Th>{t("inventory")}</Th>
          <Th>{t("flags")}</Th>
          <Th>{t("isActiveShort")}</Th>
          <Th align="end"><span className="sr-only">{tc("edit")}</span></Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-charcoal/10">
        {rows.map((row) => (
          <tr key={row.id} className="transition-colors hover:bg-ivory-soft/60" data-testid={`room-type-${row.code}`}>
            <Td>
              <div className="flex items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-sand-100">
                  {row.imageUrl ? <Image src={row.imageUrl} alt="" fill sizes="48px" className="object-cover" /> : <BedDouble className="absolute start-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-sand-400 rtl:translate-x-1/2" />}
                </div>
                <div className="min-w-0">
                  <Link href={`/admin/rooms/${row.id}`} className="font-medium hover:text-copper">{pickLocale(row, "name", locale)}</Link>
                  <p className="text-xs text-muted-foreground ltr-field">/rooms/{row.slug}</p>
                </div>
              </div>
            </Td>
            <Td><span className="num font-semibold text-copper-deep">{row.code}</span></Td>
            <Td align="end"><span className="num font-medium">{formatMoney(row.baseRate, currency, locale)}</span></Td>
            <Td align="end"><span className="num text-muted-foreground">{row.weekendRate ? formatMoney(row.weekendRate, currency, locale) : "—"}</span></Td>
            <Td><span className="num">{tc("adults", { count: row.maxAdults })}</span><p className="num text-xs text-muted-foreground">{tc("children", { count: row.maxChildren })} · {t("maxOccupancy")} {row.maxOccupancy}</p></Td>
            <Td><span className="num">{t("activeCount", { active: row.activeRoomCount, total: row.roomCount })}</span></Td>
            <Td>
              <div className="flex flex-wrap gap-1">
                {row.isFeatured ? <Badge variant="sand"><Star className="size-3" />{t("featured")}</Badge> : null}
                {row.isSuite ? <Badge variant="dark">{t("isSuite")}</Badge> : null}
                {!row.isActive ? <Badge variant="neutral">{t("inactive")}</Badge> : null}
              </div>
            </Td>
            <Td>
              {canManage ? (
                <Switch checked={row.isActive} disabled={pendingId === row.id} onCheckedChange={(v) => toggle(row, v)} aria-label={`${t("isActive")}: ${pickLocale(row, "name", locale)}`} />
              ) : (
                <Badge variant={row.isActive ? "success" : "neutral"}>{row.isActive ? t("active") : t("inactive")}</Badge>
              )}
            </Td>
            <Td align="end">
              <Button asChild variant="outline" size="sm"><Link href={`/admin/rooms/${row.id}`}><Pencil />{canManage ? tc("edit") : t("view")}</Link></Button>
            </Td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}
