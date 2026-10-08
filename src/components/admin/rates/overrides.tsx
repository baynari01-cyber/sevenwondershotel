"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarX2, Pencil, Plus, Trash2 } from "lucide-react";
import type { RateOverrideDTO, RoomTypeOptionDTO } from "@/lib/data/admin-catalog";
import { bulkRateOverrideAction, deleteRateOverrideAction, saveRateOverrideAction } from "@/lib/actions/admin-rates";
import { addDays, todayIso } from "@/lib/utils/dates";
import { formatDate, formatMoney, pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, SwitchField, Td, Th, theadClass } from "@/components/admin/form-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";

type Editing = { kind: "new" } | { kind: "edit"; override: RateOverrideDTO } | null;

export function OverridesPanel({ overrides, roomTypes, canManage, currency }: { overrides: RateOverrideDTO[]; roomTypes: RoomTypeOptionDTO[]; canManage: boolean; currency: string }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<RateOverrideDTO | null>(null);
  const [filterType, setFilterType] = React.useState("ALL");
  const [pending, startTransition] = React.useTransition();

  const typeName = (id: string) => {
    const rt = roomTypes.find((x) => x.id === id);
    return rt ? pickLocale(rt, "name", locale) : "—";
  };
  const rows = filterType === "ALL" ? overrides : overrides.filter((o) => o.roomTypeId === filterType);

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const { ok } = feedback(await deleteRateOverrideAction({ id: deleting.id }), t("deleted"));
      if (ok) setDeleting(null);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Field label={t("roomType")} htmlFor="ov-filter" className="w-full sm:w-64">
            <NativeSelect id="ov-filter" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-9">
              <option value="ALL">{tc("all")}</option>
              {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{pickLocale(rt, "name", locale)}</option>)}
            </NativeSelect>
          </Field>
          {canManage ? <Button variant="accent" onClick={() => setEditing({ kind: "new" })} data-testid="new-override"><Plus />{t("newOverride")}</Button> : null}
        </div>
        {rows.length ? (
          <DataTable minWidth={680}>
            <thead className={theadClass}>
              <tr>
                <Th>{t("date")}</Th>
                <Th>{t("roomType")}</Th>
                <Th align="end">{t("rate")}</Th>
                <Th align="end">{t("minStayShort")}</Th>
                <Th align="end">{t("maxInventoryShort")}</Th>
                <Th>{t("status")}</Th>
                <Th>{t("note")}</Th>
                <Th align="end"><span className="sr-only">{tc("edit")}</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/10">
              {rows.map((o) => (
                <tr key={o.id} data-testid={`override-${o.date}`}>
                  <Td><span className="num whitespace-nowrap font-medium">{formatDate(o.date, locale, "medium")}</span></Td>
                  <Td>{typeName(o.roomTypeId)}</Td>
                  <Td align="end"><span className="num">{o.rate ? formatMoney(o.rate, currency, locale) : <span className="text-stone">—</span>}</span></Td>
                  <Td align="end"><span className="num">{o.minStay ?? <span className="text-stone">—</span>}</span></Td>
                  <Td align="end"><span className="num">{o.maxInventory ?? <span className="text-stone">—</span>}</span></Td>
                  <Td>{o.closed ? <Badge variant="danger">{t("closedShort")}</Badge> : <Badge variant="success">{t("open")}</Badge>}</Td>
                  <Td><span className="line-clamp-1 max-w-[12rem] text-xs text-muted-foreground" dir="auto">{o.note ?? ""}</span></Td>
                  <Td align="end">
                    {canManage ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="iconSm" onClick={() => setEditing({ kind: "edit", override: o })} aria-label={`${tc("edit")} ${o.date}`}><Pencil /></Button>
                        <Button variant="ghost" size="iconSm" onClick={() => setDeleting(o)} aria-label={`${tc("delete")} ${o.date}`}><Trash2 /></Button>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState icon={CalendarX2} title={t("noOverrides")} body={t("overridesHint")} />
        )}
      </div>
      {canManage ? <BulkUpdateCard roomTypes={roomTypes} currency={currency} /> : null}
      {editing ? <OverrideDialog key={editing.kind === "edit" ? editing.override.id : "new"} override={editing.kind === "edit" ? editing.override : null} roomTypes={roomTypes} currency={currency} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("deleteOverride")} body={t("deleteConfirm")} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </div>
  );
}

function OverrideDialog({ override, roomTypes, currency, onClose }: { override: RateOverrideDTO | null; roomTypes: RoomTypeOptionDTO[]; currency: string; onClose: () => void }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [form, setForm] = React.useState({
    roomTypeId: override?.roomTypeId ?? roomTypes[0]?.id ?? "",
    date: override?.date ?? addDays(todayIso(), 1),
    rate: override?.rate ?? "",
    minStay: override?.minStay != null ? String(override.minStay) : "",
    closed: override?.closed ?? false,
    maxInventory: override?.maxInventory != null ? String(override.maxInventory) : "",
    note: override?.note ?? "",
  });
  const invalid = (k: string) => (errors[k] ? true : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveRateOverrideAction({ id: override?.id, ...form });
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader><DialogTitle>{override ? t("editOverride") : t("newOverride")}</DialogTitle><DialogDescription>{t("overridesHint")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("roomType")} htmlFor="ov-type" required error={errors.roomTypeId}><NativeSelect id="ov-type" value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}>{roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{pickLocale(rt, "name", locale)}</option>)}</NativeSelect></Field>
            <Field label={t("date")} htmlFor="ov-date" required error={errors.date}><Input id="ov-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-invalid={invalid("date")} /></Field>
            <Field label={`${t("rate")} (${currency})`} htmlFor="ov-rate" error={errors.rate} hint={t("rateHint")}><Input id="ov-rate" inputMode="decimal" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className="ltr-field num" aria-invalid={invalid("rate")} /></Field>
            <Field label={t("minStayShort")} htmlFor="ov-minStay" error={errors.minStay}><Input id="ov-minStay" type="number" min={1} max={30} value={form.minStay} onChange={(e) => setForm({ ...form, minStay: e.target.value })} aria-invalid={invalid("minStay")} /></Field>
            <Field label={t("maxInventory")} htmlFor="ov-maxInv" error={errors.maxInventory} hint={t("maxInventoryHint")}><Input id="ov-maxInv" type="number" min={0} max={500} value={form.maxInventory} onChange={(e) => setForm({ ...form, maxInventory: e.target.value })} aria-invalid={invalid("maxInventory")} /></Field>
            <SwitchField id="ov-closed" label={t("closed")} checked={form.closed} onCheckedChange={(v) => setForm({ ...form, closed: v })} className="self-end" />
          </div>
          <Field label={t("note")} htmlFor="ov-note" error={errors.note}><Textarea id="ov-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} dir="auto" maxLength={200} /></Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{tc("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={pending} data-testid="save-override">{pending ? tc("saving") : tc("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkUpdateCard({ roomTypes, currency }: { roomTypes: RoomTypeOptionDTO[]; currency: string }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const today = todayIso();
  const [form, setForm] = React.useState({
    roomTypeId: roomTypes[0]?.id ?? "",
    from: addDays(today, 1),
    to: addDays(today, 7),
    rate: "",
    minStay: "",
    closed: false,
    maxInventory: "",
    note: "",
    apply: { rate: false, minStay: false, closed: false, maxInventory: false },
  });
  const invalid = (k: string) => (errors[k] ? true : undefined);
  const applyAny = Object.values(form.apply).some(Boolean);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await bulkRateOverrideAction(form);
      const { ok, fieldErrors } = feedback(result, result.ok ? t("appliedCount", { count: result.data.count }) : "");
      setErrors(fieldErrors);
      if (ok) setForm((f) => ({ ...f, apply: { rate: false, minStay: false, closed: false, maxInventory: false } }));
    });
  }

  const applyRow = (key: keyof typeof form.apply, label: string, control: React.ReactNode) => (
    <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-md border border-charcoal/10 p-3" data-testid={`bulk-${key}`}>
      <Checkbox id={`bulk-apply-${key}`} checked={form.apply[key]} onCheckedChange={(v) => setForm({ ...form, apply: { ...form.apply, [key]: v === true } })} aria-label={label} />
      <div className="grid gap-1.5">
        <Label htmlFor={`bulk-${key}`} className="text-xs">{label}</Label>
        {control}
      </div>
    </div>
  );

  return (
    <aside className="rounded-lg border border-copper/30 bg-copper/5 p-5 shadow-soft xl:sticky xl:top-6 xl:self-start" aria-labelledby="bulk-title">
      <h2 id="bulk-title" className="eyebrow">{t("bulk")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("bulkHint")}</p>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-3">
        <Field label={t("roomType")} htmlFor="bulk-type" required error={errors.roomTypeId}><NativeSelect id="bulk-type" value={form.roomTypeId} onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })} className="h-9">{roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{pickLocale(rt, "name", locale)}</option>)}</NativeSelect></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("bulkFrom")} htmlFor="bulk-from" required error={errors.from}><Input id="bulk-from" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className="h-9" aria-invalid={invalid("from")} /></Field>
          <Field label={t("bulkTo")} htmlFor="bulk-to" required error={errors.to}><Input id="bulk-to" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className="h-9" aria-invalid={invalid("to")} /></Field>
        </div>
        <p className="text-xs text-muted-foreground">{t("bulkFields")}</p>
        {applyRow("rate", `${t("rate")} (${currency})`, <Input id="bulk-rate" inputMode="decimal" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value, apply: { ...form.apply, rate: true } })} className="ltr-field num h-9" placeholder={t("bulkRatePlaceholder")} aria-invalid={invalid("rate")} />)}
        {applyRow("minStay", t("minStay"), <Input id="bulk-minStay" type="number" min={1} max={30} value={form.minStay} onChange={(e) => setForm({ ...form, minStay: e.target.value, apply: { ...form.apply, minStay: true } })} className="h-9" aria-invalid={invalid("minStay")} />)}
        {applyRow("maxInventory", t("maxInventory"), <Input id="bulk-maxInventory" type="number" min={0} max={500} value={form.maxInventory} onChange={(e) => setForm({ ...form, maxInventory: e.target.value, apply: { ...form.apply, maxInventory: true } })} className="h-9" aria-invalid={invalid("maxInventory")} />)}
        {applyRow("closed", t("closed"), <SwitchField id="bulk-closed" label={form.closed ? t("closedShort") : t("open")} checked={form.closed} onCheckedChange={(v) => setForm({ ...form, closed: v, apply: { ...form.apply, closed: true } })} className="py-1.5" />)}
        <Field label={t("note")} htmlFor="bulk-note" hint={tc("optional")}><Input id="bulk-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="h-9" dir="auto" maxLength={200} /></Field>
        {errors.apply ? <p role="alert" className="text-xs text-danger">{t("bulkNothingSelected")}</p> : null}
        <Button type="submit" variant="accent" disabled={pending || !applyAny} data-testid="bulk-apply">{pending ? tc("saving") : t("apply")}</Button>
      </form>
    </aside>
  );
}
