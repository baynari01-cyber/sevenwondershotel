"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Car, Clock, Coffee, Map, Pencil, Plus, Sparkles, Trash2, Waves, type LucideIcon } from "lucide-react";
import type { ExtraDTO } from "@/lib/data/admin-catalog";
import { deleteExtraAction, saveExtraAction } from "@/lib/actions/admin-rates";
import { EXTRA_ICONS, EXTRA_PRICINGS, type ExtraIcon } from "@/lib/admin/constants";
import { formatMoney, pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DataTable, SwitchField, Td, Th, theadClass } from "@/components/admin/form-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<ExtraIcon, LucideIcon> = { coffee: Coffee, car: Car, waves: Waves, clock: Clock, map: Map, sparkles: Sparkles };

type Editing = { kind: "new" } | { kind: "edit"; extra: ExtraDTO } | null;

export function ExtrasPanel({ extras, canManage, currency }: { extras: ExtraDTO[]; canManage: boolean; currency: string }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<ExtraDTO | null>(null);
  const [pending, startTransition] = React.useTransition();

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const { ok } = feedback(await deleteExtraAction({ id: deleting.id }), t("deleted"));
      if (ok) setDeleting(null);
    });
  }

  return (
    <div className="space-y-4">
      {canManage ? <div className="flex justify-end"><Button variant="accent" onClick={() => setEditing({ kind: "new" })} data-testid="new-extra"><Plus />{t("newExtra")}</Button></div> : null}
      {extras.length ? (
        <DataTable minWidth={760}>
          <thead className={theadClass}>
            <tr>
              <Th>{t("extra")}</Th>
              <Th align="end">{t("price")}</Th>
              <Th>{t("pricing")}</Th>
              <Th>{t("status")}</Th>
              <Th align="end">{t("sortOrder")}</Th>
              <Th align="end"><span className="sr-only">{tc("edit")}</span></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/10">
            {extras.map((e) => {
              const Icon = ICONS[e.icon as ExtraIcon] ?? Sparkles;
              return (
                <tr key={e.id} className={e.isActive ? "" : "text-muted-foreground"} data-testid={`extra-${e.code}`}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sand-100 text-copper"><Icon className="size-4" /></span>
                      <div><p className="font-medium text-charcoal">{pickLocale(e, "name", locale)}</p><p className="num text-xs text-copper-deep">{e.code}</p></div>
                    </div>
                  </Td>
                  <Td align="end"><span className="num font-medium">{e.isInquiryOnly ? <span className="text-stone">—</span> : formatMoney(e.price, currency, locale)}</span></Td>
                  <Td><Badge variant="neutral">{t(`pricingLabels.${e.pricing}`)}</Badge>{e.isInquiryOnly ? <Badge variant="sand" className="ms-1">{t("inquiryShort")}</Badge> : null}</Td>
                  <Td><Badge variant={e.isActive ? "success" : "neutral"}>{e.isActive ? t("active") : t("inactive")}</Badge></Td>
                  <Td align="end"><span className="num">{e.sortOrder}</span></Td>
                  <Td align="end">
                    {canManage ? (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="iconSm" onClick={() => setEditing({ kind: "edit", extra: e })} aria-label={`${tc("edit")} ${e.code}`}><Pencil /></Button>
                        <Button variant="ghost" size="iconSm" onClick={() => setDeleting(e)} disabled={e.reservationCount > 0} title={e.reservationCount > 0 ? t("inUseHint") : undefined} aria-label={`${tc("delete")} ${e.code}`}><Trash2 /></Button>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState icon={Sparkles} title={t("noExtras")} />
      )}
      {editing ? <ExtraDialog key={editing.kind === "edit" ? editing.extra.id : "new"} extra={editing.kind === "edit" ? editing.extra : null} currency={currency} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("deleteExtra")} body={t("deleteConfirm")} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </div>
  );
}

function ExtraDialog({ extra, currency, onClose }: { extra: ExtraDTO | null; currency: string; onClose: () => void }) {
  const t = useTranslations("admin.rates");
  const tc = useTranslations("common");
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [form, setForm] = React.useState({
    code: extra?.code ?? "",
    nameEn: extra?.nameEn ?? "",
    nameAr: extra?.nameAr ?? "",
    descriptionEn: extra?.descriptionEn ?? "",
    descriptionAr: extra?.descriptionAr ?? "",
    price: extra?.price ?? "0",
    pricing: extra?.pricing ?? "PER_STAY",
    isInquiryOnly: extra?.isInquiryOnly ?? false,
    isActive: extra?.isActive ?? true,
    sortOrder: String(extra?.sortOrder ?? 0),
    icon: (EXTRA_ICONS.includes(extra?.icon as ExtraIcon) ? extra?.icon : "sparkles") as ExtraIcon,
  });
  const invalid = (k: string) => (errors[k] ? true : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveExtraAction({ id: extra?.id, ...form, sortOrder: Number(form.sortOrder) });
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-2xl">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader><DialogTitle>{extra ? t("editExtra") : t("newExtra")}</DialogTitle><DialogDescription>{t("extraHint")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("code")} htmlFor="ex-code" required error={errors.code}><Input id="ex-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="ltr-field uppercase" maxLength={24} aria-invalid={invalid("code")} autoFocus /></Field>
            <Field label={t("sortOrder")} htmlFor="ex-sort" error={errors.sortOrder}><Input id="ex-sort" type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>
            <Field label={t("nameEn")} htmlFor="ex-nameEn" required error={errors.nameEn}><Input id="ex-nameEn" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} dir="ltr" maxLength={80} aria-invalid={invalid("nameEn")} /></Field>
            <Field label={t("nameAr")} htmlFor="ex-nameAr" required error={errors.nameAr}><Input id="ex-nameAr" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" maxLength={80} aria-invalid={invalid("nameAr")} /></Field>
            <Field label={t("descriptionEn")} htmlFor="ex-descEn" required error={errors.descriptionEn}><Textarea id="ex-descEn" rows={2} value={form.descriptionEn} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} dir="ltr" aria-invalid={invalid("descriptionEn")} /></Field>
            <Field label={t("descriptionAr")} htmlFor="ex-descAr" required error={errors.descriptionAr}><Textarea id="ex-descAr" rows={2} value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} dir="rtl" aria-invalid={invalid("descriptionAr")} /></Field>
            <Field label={`${t("price")} (${currency})`} htmlFor="ex-price" required error={errors.price}><Input id="ex-price" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="ltr-field num" aria-invalid={invalid("price")} disabled={form.isInquiryOnly} /></Field>
            <Field label={t("pricing")} htmlFor="ex-pricing" required><NativeSelect id="ex-pricing" value={form.pricing} onChange={(e) => setForm({ ...form, pricing: e.target.value as typeof form.pricing })}>{EXTRA_PRICINGS.map((v) => <option key={v} value={v}>{t(`pricingLabels.${v}`)}</option>)}</NativeSelect></Field>
          </div>
          <fieldset>
            <legend className="mb-2 block text-sm font-medium">{t("icon")}</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("icon")}>
              {EXTRA_ICONS.map((icon) => {
                const Icon = ICONS[icon];
                const selected = form.icon === icon;
                return (
                  <button key={icon} type="button" role="radio" aria-checked={selected} aria-label={icon} onClick={() => setForm({ ...form, icon })} className={cn("flex size-11 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-copper", selected ? "border-copper bg-copper text-white" : "border-charcoal/15 bg-white text-charcoal hover:bg-sand-100")}>
                    <Icon className="size-5" />
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <SwitchField id="ex-inquiry" label={t("inquiryOnly")} checked={form.isInquiryOnly} onCheckedChange={(v) => setForm({ ...form, isInquiryOnly: v })} />
            <SwitchField id="ex-active" label={t("active")} checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{tc("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={pending} data-testid="save-extra">{pending ? tc("saving") : tc("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
