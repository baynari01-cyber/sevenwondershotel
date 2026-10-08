"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import type { RatePlanDTO } from "@/lib/data/admin-catalog";
import { deleteRatePlanAction, saveRatePlanAction, setRatePlanActiveAction } from "@/lib/actions/admin-rates";
import { ADJUSTMENT_TYPES, RATE_PLAN_TYPES } from "@/lib/admin/constants";
import { formatDate, formatMoney, pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, FormSection, SwitchField, Td, Th, theadClass } from "@/components/admin/form-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";

type Editing = { kind: "new" } | { kind: "edit"; plan: RatePlanDTO } | null;

export function RatePlansPanel({ plans, canManage, currency }: { plans: RatePlanDTO[]; canManage: boolean; currency: string }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const tt = useTranslations("ratePlanType");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<RatePlanDTO | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function toggle(plan: RatePlanDTO, isActive: boolean) {
    setPendingId(plan.id);
    startTransition(async () => {
      feedback(await setRatePlanActiveAction({ id: plan.id, isActive }), t("saved"));
      setPendingId(null);
    });
  }
  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const { ok } = feedback(await deleteRatePlanAction({ id: deleting.id }), t("deleted"));
      if (ok) setDeleting(null);
    });
  }

  const adjustment = (p: RatePlanDTO) => (p.adjustmentType === "PERCENT" ? `${Number(p.adjustmentValue) > 0 ? "+" : ""}${p.adjustmentValue}%` : `${Number(p.adjustmentValue) > 0 ? "+" : ""}${formatMoney(p.adjustmentValue, currency, locale)}`);

  return (
    <div className="space-y-4">
      {canManage ? <div className="flex justify-end"><Button variant="accent" onClick={() => setEditing({ kind: "new" })} data-testid="new-rate-plan"><Plus />{t("newPlan")}</Button></div> : null}
      {plans.length ? (
        <DataTable minWidth={900}>
          <thead className={theadClass}>
            <tr>
              <Th>{t("plan")}</Th>
              <Th>{t("type")}</Th>
              <Th align="end">{t("adjustment")}</Th>
              <Th>{t("conditions")}</Th>
              <Th>{t("validity")}</Th>
              <Th>{t("active")}</Th>
              <Th align="end"><span className="sr-only">{tc("edit")}</span></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/10">
            {plans.map((p) => (
              <tr key={p.id} className={p.isActive ? "" : "text-muted-foreground"} data-testid={`rate-plan-${p.code}`}>
                <Td><p className="font-medium text-charcoal">{pickLocale(p, "name", locale)}</p><p className="num text-xs text-copper-deep">{p.code}</p></Td>
                <Td><Badge variant="neutral">{tt(p.type)}</Badge></Td>
                <Td align="end"><span className="num font-medium">{adjustment(p)}</span></Td>
                <Td>
                  <div className="flex flex-wrap gap-1 text-xs">
                    {p.includesBreakfast ? <Badge variant="sand">{t("includesBreakfast")}</Badge> : null}
                    <Badge variant={p.refundable ? "success" : "warning"}>{p.refundable ? t("refundableShort", { days: p.cancellationDeadlineDays }) : t("nonRefundable")}</Badge>
                    {p.minNights > 1 ? <Badge variant="neutral">{tc("nights", { count: p.minNights })}</Badge> : null}
                  </div>
                </Td>
                <Td><span className="num text-xs">{p.validFrom || p.validTo ? `${p.validFrom ? formatDate(p.validFrom, locale, "short") : "…"} → ${p.validTo ? formatDate(p.validTo, locale, "short") : "…"}` : t("always")}</span></Td>
                <Td>{canManage ? <Switch checked={p.isActive} disabled={pendingId === p.id} onCheckedChange={(v) => toggle(p, v)} aria-label={`${t("active")}: ${p.code}`} /> : <Badge variant={p.isActive ? "success" : "neutral"}>{p.isActive ? t("active") : t("inactive")}</Badge>}</Td>
                <Td align="end">
                  {canManage ? (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="iconSm" onClick={() => setEditing({ kind: "edit", plan: p })} aria-label={`${tc("edit")} ${p.code}`}><Pencil /></Button>
                      <Button variant="ghost" size="iconSm" onClick={() => setDeleting(p)} disabled={p.reservationCount > 0} title={p.reservationCount > 0 ? t("inUseHint") : undefined} aria-label={`${tc("delete")} ${p.code}`}><Trash2 /></Button>
                    </div>
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState icon={Tags} title={t("noPlans")} />
      )}
      {editing ? <RatePlanDialog key={editing.kind === "edit" ? editing.plan.id : "new"} plan={editing.kind === "edit" ? editing.plan : null} currency={currency} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("deletePlan")} body={t("deleteConfirm")} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </div>
  );
}

function RatePlanDialog({ plan, currency, onClose }: { plan: RatePlanDTO | null; currency: string; onClose: () => void }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const tt = useTranslations("ratePlanType");
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [form, setForm] = React.useState({
    code: plan?.code ?? "",
    nameEn: plan?.nameEn ?? "",
    nameAr: plan?.nameAr ?? "",
    descriptionEn: plan?.descriptionEn ?? "",
    descriptionAr: plan?.descriptionAr ?? "",
    type: plan?.type ?? "ROOM_ONLY",
    adjustmentType: plan?.adjustmentType ?? "PERCENT",
    adjustmentValue: plan?.adjustmentValue ?? "0",
    includesBreakfast: plan?.includesBreakfast ?? false,
    refundable: plan?.refundable ?? true,
    cancellationDeadlineDays: String(plan?.cancellationDeadlineDays ?? 2),
    cancellationPolicyEn: plan?.cancellationPolicyEn ?? "",
    cancellationPolicyAr: plan?.cancellationPolicyAr ?? "",
    minNights: String(plan?.minNights ?? 1),
    validFrom: plan?.validFrom ?? "",
    validTo: plan?.validTo ?? "",
    isActive: plan?.isActive ?? true,
    sortOrder: String(plan?.sortOrder ?? 0),
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const invalid = (k: string) => (errors[k] ? true : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveRatePlanAction({ id: plan?.id, ...form, cancellationDeadlineDays: Number(form.cancellationDeadlineDays), minNights: Number(form.minNights), sortOrder: Number(form.sortOrder) });
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-3xl">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader><DialogTitle>{plan ? t("editPlan") : t("newPlan")}</DialogTitle><DialogDescription>{t("planHint")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("code")} htmlFor="rp-code" required error={errors.code}><Input id="rp-code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="ltr-field uppercase" maxLength={24} aria-invalid={invalid("code")} autoFocus /></Field>
            <Field label={t("type")} htmlFor="rp-type" required error={errors.type}><NativeSelect id="rp-type" value={form.type} onChange={(e) => set("type", e.target.value as typeof form.type)}>{RATE_PLAN_TYPES.map((v) => <option key={v} value={v}>{tt(v)}</option>)}</NativeSelect></Field>
            <Field label={t("nameEn")} htmlFor="rp-nameEn" required error={errors.nameEn}><Input id="rp-nameEn" value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} dir="ltr" maxLength={80} aria-invalid={invalid("nameEn")} /></Field>
            <Field label={t("nameAr")} htmlFor="rp-nameAr" required error={errors.nameAr}><Input id="rp-nameAr" value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" maxLength={80} aria-invalid={invalid("nameAr")} /></Field>
            <Field label={t("descriptionEn")} htmlFor="rp-descEn" required error={errors.descriptionEn}><Textarea id="rp-descEn" rows={2} value={form.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} dir="ltr" aria-invalid={invalid("descriptionEn")} /></Field>
            <Field label={t("descriptionAr")} htmlFor="rp-descAr" required error={errors.descriptionAr}><Textarea id="rp-descAr" rows={2} value={form.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} dir="rtl" aria-invalid={invalid("descriptionAr")} /></Field>
          </div>
          <FormSection title={t("pricingRules")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("adjustmentType")} htmlFor="rp-adjType"><NativeSelect id="rp-adjType" value={form.adjustmentType} onChange={(e) => set("adjustmentType", e.target.value as typeof form.adjustmentType)}>{ADJUSTMENT_TYPES.map((v) => <option key={v} value={v}>{v === "PERCENT" ? t("percent") : t("fixed")}</option>)}</NativeSelect></Field>
              <Field label={`${t("adjustmentValue")} (${form.adjustmentType === "PERCENT" ? "%" : currency})`} htmlFor="rp-adjValue" required error={errors.adjustmentValue} hint={t("adjustmentHint")}><Input id="rp-adjValue" inputMode="decimal" value={form.adjustmentValue} onChange={(e) => set("adjustmentValue", e.target.value)} className="ltr-field num" aria-invalid={invalid("adjustmentValue")} /></Field>
              <Field label={t("minNights")} htmlFor="rp-minNights" required error={errors.minNights}><Input id="rp-minNights" type="number" min={1} max={30} value={form.minNights} onChange={(e) => set("minNights", e.target.value)} aria-invalid={invalid("minNights")} /></Field>
              <Field label={t("validFrom")} htmlFor="rp-from" error={errors.validFrom}><Input id="rp-from" type="date" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} aria-invalid={invalid("validFrom")} /></Field>
              <Field label={t("validTo")} htmlFor="rp-to" error={errors.validTo}><Input id="rp-to" type="date" value={form.validTo} onChange={(e) => set("validTo", e.target.value)} aria-invalid={invalid("validTo")} /></Field>
              <Field label={t("sortOrder")} htmlFor="rp-sort" error={errors.sortOrder}><Input id="rp-sort" type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field>
            </div>
          </FormSection>
          <FormSection title={t("cancellation")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <SwitchField id="rp-breakfast" label={t("includesBreakfast")} checked={form.includesBreakfast} onCheckedChange={(v) => set("includesBreakfast", v)} />
              <SwitchField id="rp-refundable" label={t("refundable")} checked={form.refundable} onCheckedChange={(v) => set("refundable", v)} />
              <Field label={t("deadline")} htmlFor="rp-deadline" error={errors.cancellationDeadlineDays}><Input id="rp-deadline" type="number" min={0} max={90} value={form.cancellationDeadlineDays} onChange={(e) => set("cancellationDeadlineDays", e.target.value)} disabled={!form.refundable} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("policyEn")} htmlFor="rp-polEn" required error={errors.cancellationPolicyEn}><Textarea id="rp-polEn" rows={3} value={form.cancellationPolicyEn} onChange={(e) => set("cancellationPolicyEn", e.target.value)} dir="ltr" aria-invalid={invalid("cancellationPolicyEn")} /></Field>
              <Field label={t("policyAr")} htmlFor="rp-polAr" required error={errors.cancellationPolicyAr}><Textarea id="rp-polAr" rows={3} value={form.cancellationPolicyAr} onChange={(e) => set("cancellationPolicyAr", e.target.value)} dir="rtl" aria-invalid={invalid("cancellationPolicyAr")} /></Field>
            </div>
          </FormSection>
          <SwitchField id="rp-active" label={t("active")} hint={t("activeHint")} checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{tc("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={pending} data-testid="save-rate-plan">{pending ? tc("saving") : tc("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
