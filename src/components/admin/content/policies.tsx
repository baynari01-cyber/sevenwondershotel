"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, EyeOff, Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import type { PolicyAdminDTO } from "@/lib/data/admin-catalog";
import { deletePolicyAction, savePolicyAction } from "@/lib/actions/admin-content";
import { pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { SwitchField } from "@/components/admin/form-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

type Editing = { kind: "new" } | { kind: "edit"; policy: PolicyAdminDTO } | null;

export function PoliciesPanel({ policies, canManage }: { policies: PolicyAdminDTO[]; canManage: boolean }) {
  const t = useTranslations("admin.content");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<PolicyAdminDTO | null>(null);
  const [pending, startTransition] = React.useTransition();

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const { ok } = feedback(await deletePolicyAction({ id: deleting.id }), t("deleted"));
      if (ok) setDeleting(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("policiesHint")}</p>
        {canManage ? <Button variant="accent" onClick={() => setEditing({ kind: "new" })} data-testid="new-policy"><Plus />{t("newPolicy")}</Button> : null}
      </div>
      {policies.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {policies.map((p) => (
            <li key={p.id} className={cn("flex flex-col rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft", !p.isVisible && "opacity-70")} data-testid={`policy-${p.key}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="num text-[11px] uppercase tracking-wider text-stone">#{p.sortOrder} · {p.key}</p>
                  <h3 className="mt-1 font-display text-lg leading-tight">{pickLocale(p, "title", locale)}</h3>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.isVerified ? <Badge variant="success"><BadgeCheck className="size-3" />{t("verifiedPolicy")}</Badge> : <Badge variant="warning">{tc("unverified")}</Badge>}
                  {!p.isVisible ? <Badge variant="neutral"><EyeOff className="size-3" />{t("hidden")}</Badge> : null}
                </div>
              </div>
              <p className="mt-3 line-clamp-4 text-sm text-muted-foreground" dir="auto">{pickLocale(p, "body", locale)}</p>
              <div className="mt-auto flex justify-end gap-1 pt-4">
                <Button variant="outline" size="sm" onClick={() => setEditing({ kind: "edit", policy: p })} data-testid={`edit-policy-${p.key}`}><Pencil />{canManage ? tc("edit") : t("view")}</Button>
                {canManage ? <Button variant="ghost" size="sm" onClick={() => setDeleting(p)} aria-label={`${tc("delete")} ${p.key}`}><Trash2 /></Button> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={ScrollText} title={t("noPolicies")} />
      )}
      {editing ? <PolicyDialog key={editing.kind === "edit" ? editing.policy.id : "new"} policy={editing.kind === "edit" ? editing.policy : null} canManage={canManage} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("deletePolicy")} body={t("deleteConfirm")} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </div>
  );
}

function PolicyDialog({ policy, canManage, onClose }: { policy: PolicyAdminDTO | null; canManage: boolean; onClose: () => void }) {
  const t = useTranslations("admin.content");
  const tc = useTranslations("common");
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [form, setForm] = React.useState({
    key: policy?.key ?? "",
    titleEn: policy?.titleEn ?? "",
    titleAr: policy?.titleAr ?? "",
    bodyEn: policy?.bodyEn ?? "",
    bodyAr: policy?.bodyAr ?? "",
    sortOrder: String(policy?.sortOrder ?? 0),
    isVisible: policy?.isVisible ?? true,
    isVerified: policy?.isVerified ?? false,
  });
  const readOnly = !canManage;
  const invalid = (k: string) => (errors[k] ? true : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await savePolicyAction({ id: policy?.id, ...form, sortOrder: Number(form.sortOrder) });
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-3xl">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader><DialogTitle>{policy ? t("editPolicy") : t("newPolicy")}</DialogTitle><DialogDescription>{t("policyDialogHint")}</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Field label={t("key")} htmlFor="po-key" required error={errors.key} hint={policy ? t("keyImmutable") : t("keyHint")}><Input id="po-key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })} className="ltr-field" readOnly={Boolean(policy) || readOnly} aria-invalid={invalid("key")} /></Field>
            <Field label={t("sortOrder")} htmlFor="po-sort" error={errors.sortOrder}><Input id="po-sort" type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} readOnly={readOnly} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("titleEn")} htmlFor="po-titleEn" required error={errors.titleEn}><Input id="po-titleEn" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} dir="ltr" maxLength={160} readOnly={readOnly} aria-invalid={invalid("titleEn")} autoFocus={Boolean(policy)} /></Field>
            <Field label={t("titleAr")} htmlFor="po-titleAr" required error={errors.titleAr}><Input id="po-titleAr" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} dir="rtl" maxLength={160} readOnly={readOnly} aria-invalid={invalid("titleAr")} /></Field>
            <Field label={t("bodyEn")} htmlFor="po-bodyEn" required error={errors.bodyEn}><Textarea id="po-bodyEn" rows={6} value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} dir="ltr" readOnly={readOnly} aria-invalid={invalid("bodyEn")} /></Field>
            <Field label={t("bodyAr")} htmlFor="po-bodyAr" required error={errors.bodyAr}><Textarea id="po-bodyAr" rows={6} value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} dir="rtl" readOnly={readOnly} aria-invalid={invalid("bodyAr")} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SwitchField id="po-visible" label={t("visible")} checked={form.isVisible} onCheckedChange={(v) => setForm({ ...form, isVisible: v })} disabled={readOnly} />
            <SwitchField id="po-verified" label={t("verifiedPolicy")} hint={t("verifiedHint")} checked={form.isVerified} onCheckedChange={(v) => setForm({ ...form, isVerified: v })} disabled={readOnly} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{canManage ? tc("cancel") : tc("close")}</Button>
            {canManage ? <Button type="submit" variant="accent" disabled={pending} data-testid="save-policy">{pending ? tc("saving") : tc("save")}</Button> : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
