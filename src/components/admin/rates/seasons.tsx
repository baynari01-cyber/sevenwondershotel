"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import type { RoomTypeOptionDTO, SeasonDTO } from "@/lib/data/admin-catalog";
import { deleteSeasonAction, saveSeasonAction } from "@/lib/actions/admin-rates";
import { formatDate, formatMoney, pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, FormSection, SwitchField, Td, Th, theadClass } from "@/components/admin/form-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

type Editing = { kind: "new" } | { kind: "edit"; season: SeasonDTO } | null;

export function SeasonsPanel({ seasons, roomTypes, canManage, currency }: { seasons: SeasonDTO[]; roomTypes: RoomTypeOptionDTO[]; canManage: boolean; currency: string }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<SeasonDTO | null>(null);
  const [pending, startTransition] = React.useTransition();

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const { ok } = feedback(await deleteSeasonAction({ id: deleting.id }), t("deleted"));
      if (ok) setDeleting(null);
    });
  }

  return (
    <div className="space-y-4">
      {canManage ? <div className="flex justify-end"><Button variant="accent" onClick={() => setEditing({ kind: "new" })} data-testid="new-season"><Plus />{t("newSeason")}</Button></div> : null}
      {seasons.length ? (
        <DataTable minWidth={720 + roomTypes.length * 90}>
          <thead className={theadClass}>
            <tr>
              <Th>{t("seasonName")}</Th>
              <Th>{t("dates")}</Th>
              {roomTypes.map((rt) => <Th key={rt.id} align="end"><span title={pickLocale(rt, "name", locale)}>{rt.code}</span></Th>)}
              <Th>{t("active")}</Th>
              <Th align="end"><span className="sr-only">{tc("edit")}</span></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/10">
            {seasons.map((s) => (
              <tr key={s.id} className={s.isActive ? "" : "text-muted-foreground"} data-testid={`season-${s.id}`}>
                <Td><p className="font-medium text-charcoal">{pickLocale(s, "name", locale)}</p></Td>
                <Td><span className="num whitespace-nowrap text-xs">{formatDate(s.startDate, locale, "medium")} → {formatDate(s.endDate, locale, "medium")}</span></Td>
                {roomTypes.map((rt) => {
                  const r = s.rates.find((x) => x.roomTypeId === rt.id);
                  return <Td key={rt.id} align="end"><span className="num">{r ? formatMoney(r.rate, currency, locale) : <span className="text-stone">—</span>}</span></Td>;
                })}
                <Td><Badge variant={s.isActive ? "success" : "neutral"}>{s.isActive ? t("active") : t("inactive")}</Badge></Td>
                <Td align="end">
                  {canManage ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="iconSm" onClick={() => setEditing({ kind: "edit", season: s })} aria-label={`${tc("edit")} ${s.nameEn}`}><Pencil /></Button>
                      <Button variant="ghost" size="iconSm" onClick={() => setDeleting(s)} aria-label={`${tc("delete")} ${s.nameEn}`}><Trash2 /></Button>
                    </div>
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState icon={CalendarRange} title={t("noSeasons")} body={t("seasonsHint")} />
      )}
      {editing ? <SeasonDialog key={editing.kind === "edit" ? editing.season.id : "new"} season={editing.kind === "edit" ? editing.season : null} roomTypes={roomTypes} currency={currency} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("deleteSeason")} body={t("deleteConfirm")} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </div>
  );
}

function SeasonDialog({ season, roomTypes, currency, onClose }: { season: SeasonDTO | null; roomTypes: RoomTypeOptionDTO[]; currency: string; onClose: () => void }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [form, setForm] = React.useState({
    nameEn: season?.nameEn ?? "",
    nameAr: season?.nameAr ?? "",
    startDate: season?.startDate ?? "",
    endDate: season?.endDate ?? "",
    isActive: season?.isActive ?? true,
    rates: Object.fromEntries(roomTypes.map((rt) => [rt.id, season?.rates.find((r) => r.roomTypeId === rt.id)?.rate ?? ""])) as Record<string, string>,
  });
  const invalid = (k: string) => (errors[k] ? true : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveSeasonAction({ id: season?.id, ...form, rates: roomTypes.map((rt) => ({ roomTypeId: rt.id, rate: form.rates[rt.id] ?? "" })) });
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-2xl">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader><DialogTitle>{season ? t("editSeason") : t("newSeason")}</DialogTitle><DialogDescription>{t("seasonsHint")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("nameEn")} htmlFor="se-nameEn" required error={errors.nameEn}><Input id="se-nameEn" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} dir="ltr" maxLength={80} aria-invalid={invalid("nameEn")} autoFocus /></Field>
            <Field label={t("nameAr")} htmlFor="se-nameAr" required error={errors.nameAr}><Input id="se-nameAr" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" maxLength={80} aria-invalid={invalid("nameAr")} /></Field>
            <Field label={t("start")} htmlFor="se-start" required error={errors.startDate}><Input id="se-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} aria-invalid={invalid("startDate")} /></Field>
            <Field label={t("end")} htmlFor="se-end" required error={errors.endDate}><Input id="se-end" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} aria-invalid={invalid("endDate")} /></Field>
          </div>
          <FormSection title={t("rateGrid")}>
            <p className="text-xs text-muted-foreground">{t("rateGridHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roomTypes.map((rt) => (
                <Field key={rt.id} label={t("rateFor", { room: pickLocale(rt, "name", locale) })} htmlFor={`se-rate-${rt.id}`} hint={`${t("baseRateShort")}: ${formatMoney(rt.baseRate, currency, locale)}`} error={errors.rates && form.rates[rt.id] ? errors.rates : undefined}>
                  <Input id={`se-rate-${rt.id}`} inputMode="decimal" value={form.rates[rt.id] ?? ""} onChange={(e) => setForm({ ...form, rates: { ...form.rates, [rt.id]: e.target.value } })} className="ltr-field num h-9" placeholder={rt.baseRate} />
                </Field>
              ))}
            </div>
          </FormSection>
          <SwitchField id="se-active" label={t("active")} checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{tc("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={pending} data-testid="save-season">{pending ? tc("saving") : tc("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
