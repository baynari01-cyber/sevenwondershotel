"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Percent, Plus, Trash2 } from "lucide-react";
import type { PromotionDTO } from "@/lib/data/admin-catalog";
import { deletePromotionAction, savePromotionAction } from "@/lib/actions/admin-rates";
import { ADJUSTMENT_TYPES } from "@/lib/admin/constants";
import { addDays, todayIso } from "@/lib/utils/dates";
import { formatDate, formatMoney, pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, SwitchField, Td, Th, theadClass } from "@/components/admin/form-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

type Editing = { kind: "new" } | { kind: "edit"; promo: PromotionDTO } | null;

export function PromotionsPanel({ promotions, canManage, currency }: { promotions: PromotionDTO[]; canManage: boolean; currency: string }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<PromotionDTO | null>(null);
  const [pending, startTransition] = React.useTransition();
  const today = todayIso();

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const { ok } = feedback(await deletePromotionAction({ id: deleting.id }), t("deleted"));
      if (ok) setDeleting(null);
    });
  }

  return (
    <div className="space-y-4">
      {canManage ? <div className="flex justify-end"><Button variant="accent" onClick={() => setEditing({ kind: "new" })} data-testid="new-promotion"><Plus />{t("newPromotion")}</Button></div> : null}
      {promotions.length ? (
        <DataTable minWidth={760}>
          <thead className={theadClass}>
            <tr>
              <Th>{t("promoCode")}</Th>
              <Th>{t("name")}</Th>
              <Th align="end">{t("value")}</Th>
              <Th align="end">{t("minNights")}</Th>
              <Th>{t("validity")}</Th>
              <Th>{t("status")}</Th>
              <Th align="end"><span className="sr-only">{tc("edit")}</span></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/10">
            {promotions.map((p) => {
              const expired = p.validTo < today;
              return (
                <tr key={p.id} className={p.isActive && !expired ? "" : "text-muted-foreground"} data-testid={`promotion-${p.code}`}>
                  <Td><span className="num font-semibold text-copper-deep">{p.code}</span></Td>
                  <Td>{pickLocale(p, "name", locale)}</Td>
                  <Td align="end"><span className="num font-medium">{p.type === "PERCENT" ? `−${p.value}%` : `−${formatMoney(p.value, currency, locale)}`}</span></Td>
                  <Td align="end"><span className="num">{p.minNights}</span></Td>
                  <Td><span className="num whitespace-nowrap text-xs">{formatDate(p.validFrom, locale, "medium")} → {formatDate(p.validTo, locale, "medium")}</span></Td>
                  <Td>{expired ? <Badge variant="neutral">{t("expired")}</Badge> : <Badge variant={p.isActive ? "success" : "neutral"}>{p.isActive ? t("active") : t("inactive")}</Badge>}</Td>
                  <Td align="end">
                    {canManage ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="iconSm" onClick={() => setEditing({ kind: "edit", promo: p })} aria-label={`${tc("edit")} ${p.code}`}><Pencil /></Button>
                        <Button variant="ghost" size="iconSm" onClick={() => setDeleting(p)} disabled={p.reservationCount > 0} title={p.reservationCount > 0 ? t("inUseHint") : undefined} aria-label={`${tc("delete")} ${p.code}`}><Trash2 /></Button>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState icon={Percent} title={t("noPromotions")} />
      )}
      {editing ? <PromotionDialog key={editing.kind === "edit" ? editing.promo.id : "new"} promo={editing.kind === "edit" ? editing.promo : null} currency={currency} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("deletePromotion")} body={t("deleteConfirm")} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </div>
  );
}

function PromotionDialog({ promo, currency, onClose }: { promo: PromotionDTO | null; currency: string; onClose: () => void }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const today = todayIso();
  const [form, setForm] = React.useState({
    code: promo?.code ?? "",
    nameEn: promo?.nameEn ?? "",
    nameAr: promo?.nameAr ?? "",
    type: promo?.type ?? "PERCENT",
    value: promo?.value ?? "10",
    minNights: String(promo?.minNights ?? 1),
    validFrom: promo?.validFrom ?? today,
    validTo: promo?.validTo ?? addDays(today, 90),
    isActive: promo?.isActive ?? true,
  });
  const invalid = (k: string) => (errors[k] ? true : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await savePromotionAction({ id: promo?.id, ...form, minNights: Number(form.minNights) });
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader><DialogTitle>{promo ? t("editPromotion") : t("newPromotion")}</DialogTitle><DialogDescription>{t("promotionHint")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("promoCode")} htmlFor="pr-code" required error={errors.code} className="sm:col-span-2"><Input id="pr-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="ltr-field uppercase" maxLength={24} aria-invalid={invalid("code")} autoFocus /></Field>
            <Field label={t("nameEn")} htmlFor="pr-nameEn" required error={errors.nameEn}><Input id="pr-nameEn" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} dir="ltr" maxLength={80} aria-invalid={invalid("nameEn")} /></Field>
            <Field label={t("nameAr")} htmlFor="pr-nameAr" required error={errors.nameAr}><Input id="pr-nameAr" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" maxLength={80} aria-invalid={invalid("nameAr")} /></Field>
            <Field label={t("adjustmentType")} htmlFor="pr-type"><NativeSelect id="pr-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>{ADJUSTMENT_TYPES.map((v) => <option key={v} value={v}>{v === "PERCENT" ? t("percent") : t("fixedDiscount")}</option>)}</NativeSelect></Field>
            <Field label={`${t("value")} (${form.type === "PERCENT" ? "%" : currency})`} htmlFor="pr-value" required error={errors.value}><Input id="pr-value" inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="ltr-field num" aria-invalid={invalid("value")} /></Field>
            <Field label={t("validFrom")} htmlFor="pr-from" required error={errors.validFrom}><Input id="pr-from" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} aria-invalid={invalid("validFrom")} /></Field>
            <Field label={t("validTo")} htmlFor="pr-to" required error={errors.validTo}><Input id="pr-to" type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} aria-invalid={invalid("validTo")} /></Field>
            <Field label={t("minNights")} htmlFor="pr-minNights" required error={errors.minNights}><Input id="pr-minNights" type="number" min={1} max={30} value={form.minNights} onChange={(e) => setForm({ ...form, minNights: e.target.value })} aria-invalid={invalid("minNights")} /></Field>
            <SwitchField id="pr-active" label={t("active")} checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} className="self-end" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{tc("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={pending} data-testid="save-promotion">{pending ? tc("saving") : tc("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
