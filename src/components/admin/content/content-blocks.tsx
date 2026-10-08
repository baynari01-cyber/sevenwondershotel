"use client";
import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, EyeOff, LayoutTemplate, Pencil, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ContentBlockAdminDTO } from "@/lib/data/admin-catalog";
import { saveContentBlockAction, setContentBlockVisibleAction } from "@/lib/actions/admin-content";
import { CONTENT_PAGES, CONTENT_PAGE_PATHS, type ContentPage } from "@/lib/admin/constants";
import { formatDateTime, pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { SwitchField } from "@/components/admin/form-bits";
import { ImageUploadField } from "@/components/admin/image-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

type Editing = { kind: "new"; page: ContentPage } | { kind: "edit"; block: ContentBlockAdminDTO } | null;

function pageOf(value: string): ContentPage {
  return CONTENT_PAGES.includes(value as ContentPage) ? (value as ContentPage) : "home";
}

export function ContentBlocksPanel({ blocks, canManage }: { blocks: ContentBlockAdminDTO[]; canManage: boolean }) {
  const t = useTranslations("admin.content");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const pages = CONTENT_PAGES.map((page) => ({ page, blocks: blocks.filter((b) => b.page === page) }));
  const extra = blocks.filter((b) => !CONTENT_PAGES.includes(b.page as ContentPage));

  function toggle(block: ContentBlockAdminDTO, isVisible: boolean) {
    setPendingId(block.id);
    startTransition(async () => {
      feedback(await setContentBlockVisibleAction({ id: block.id, isVisible }), t("saved"));
      setPendingId(null);
    });
  }

  if (!blocks.length && !canManage) return <EmptyState icon={LayoutTemplate} title={t("noBlocks")} />;

  return (
    <div className="space-y-8">
      {pages.map(({ page, blocks: list }) => (
        <section key={page} aria-labelledby={`page-${page}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 id={`page-${page}`} className="font-display text-xl">{t(`pages.${page}`)}</h2>
              <Button asChild variant="link" size="sm"><Link href={CONTENT_PAGE_PATHS[page]} target="_blank" rel="noreferrer"><ExternalLink />{t("preview")}</Link></Button>
            </div>
            {canManage ? <Button variant="outline" size="sm" onClick={() => setEditing({ kind: "new", page })}><Plus />{t("newBlock")}</Button> : null}
          </div>
          {list.length ? (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((b) => (
                <li key={b.id} className={cn("flex flex-col overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-soft transition-shadow hover:shadow-lift", !b.isVisible && "opacity-70")} data-testid={`block-${b.key}`}>
                  <div className="relative aspect-[16/7] bg-sand-100">
                    {b.imageUrl ? <Image src={b.imageUrl} alt="" fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" className="object-cover" /> : <LayoutTemplate className="absolute start-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-sand-400 rtl:translate-x-1/2" />}
                    <div className="absolute start-2 top-2 flex gap-1">
                      <Badge variant="dark" className="num">{b.sortOrder}</Badge>
                      {!b.isVisible ? <Badge variant="neutral"><EyeOff className="size-3" />{t("hidden")}</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="num text-[11px] uppercase tracking-wider text-stone">{b.key}</p>
                    {b.subtitleEn || b.subtitleAr ? <p className="eyebrow">{pickLocale(b, "subtitle", locale)}</p> : null}
                    <h3 className="font-display text-lg leading-tight">{pickLocale(b, "title", locale)}</h3>
                    <p className="line-clamp-3 text-sm text-muted-foreground" dir="auto">{pickLocale(b, "body", locale)}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <span className="num text-xs text-stone">{formatDateTime(b.updatedAt, locale)}</span>
                      <div className="flex items-center gap-2">
                        {canManage ? <Switch checked={b.isVisible} disabled={pendingId === b.id} onCheckedChange={(v) => toggle(b, v)} aria-label={`${t("visible")}: ${b.key}`} /> : null}
                        <Button variant="outline" size="sm" onClick={() => setEditing({ kind: "edit", block: b })} data-testid={`edit-block-${b.key}`}><Pencil />{canManage ? tc("edit") : t("view")}</Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-charcoal/20 px-4 py-6 text-center text-sm text-muted-foreground">{t("noBlocks")}</p>
          )}
        </section>
      ))}
      {extra.length ? <p className="text-xs text-muted-foreground">{t("otherPages", { count: extra.length })}</p> : null}
      {editing ? <BlockDialog key={editing.kind === "edit" ? editing.block.id : `new-${editing.page}`} editing={editing} canManage={canManage} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function BlockDialog({ editing, canManage, onClose }: { editing: NonNullable<Editing>; canManage: boolean; onClose: () => void }) {
  const t = useTranslations("admin.content");
  const tc = useTranslations("common");
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const block = editing.kind === "edit" ? editing.block : null;
  const [form, setForm] = React.useState({
    key: block?.key ?? `${editing.kind === "new" ? editing.page : "home"}.`,
    page: pageOf(block?.page ?? (editing.kind === "new" ? editing.page : "home")),
    section: block?.section ?? "",
    titleEn: block?.titleEn ?? "",
    titleAr: block?.titleAr ?? "",
    subtitleEn: block?.subtitleEn ?? "",
    subtitleAr: block?.subtitleAr ?? "",
    bodyEn: block?.bodyEn ?? "",
    bodyAr: block?.bodyAr ?? "",
    imageUrl: block?.imageUrl ?? "",
    linkHref: block?.linkHref ?? "",
    isVisible: block?.isVisible ?? true,
    sortOrder: String(block?.sortOrder ?? 1),
  });
  const readOnly = !canManage;
  const invalid = (k: string) => (errors[k] ? true : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveContentBlockAction({ id: block?.id, ...form, sortOrder: Number(form.sortOrder) });
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-3xl">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{block ? t("editBlock") : t("newBlock")}</DialogTitle>
            <DialogDescription>{block ? t("keyImmutable") : t("newBlockHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("key")} htmlFor="cb-key" required error={errors.key} hint={block ? undefined : t("keyHint")}>
              <Input id="cb-key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })} className="ltr-field" readOnly={Boolean(block) || readOnly} aria-invalid={invalid("key")} />
            </Field>
            <Field label={t("page")} htmlFor="cb-page" required>
              <NativeSelect id="cb-page" value={form.page} onChange={(e) => setForm({ ...form, page: pageOf(e.target.value) })} disabled={Boolean(block) || readOnly}>{CONTENT_PAGES.map((p) => <option key={p} value={p}>{t(`pages.${p}`)}</option>)}</NativeSelect>
            </Field>
            <Field label={t("section")} htmlFor="cb-section" required error={errors.section} hint={block ? undefined : t("sectionHint")}>
              <Input id="cb-section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value.toLowerCase() })} className="ltr-field" readOnly={Boolean(block) || readOnly} aria-invalid={invalid("section")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("subtitleEn")} htmlFor="cb-subEn" error={errors.subtitleEn}><Input id="cb-subEn" value={form.subtitleEn} onChange={(e) => setForm({ ...form, subtitleEn: e.target.value })} dir="ltr" maxLength={160} readOnly={readOnly} /></Field>
            <Field label={t("subtitleAr")} htmlFor="cb-subAr" error={errors.subtitleAr}><Input id="cb-subAr" value={form.subtitleAr} onChange={(e) => setForm({ ...form, subtitleAr: e.target.value })} dir="rtl" maxLength={160} readOnly={readOnly} /></Field>
            <Field label={t("titleEn")} htmlFor="cb-titleEn" required error={errors.titleEn}><Input id="cb-titleEn" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} dir="ltr" maxLength={160} readOnly={readOnly} aria-invalid={invalid("titleEn")} autoFocus={Boolean(block)} /></Field>
            <Field label={t("titleAr")} htmlFor="cb-titleAr" required error={errors.titleAr}><Input id="cb-titleAr" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} dir="rtl" maxLength={160} readOnly={readOnly} aria-invalid={invalid("titleAr")} /></Field>
            <Field label={t("bodyEn")} htmlFor="cb-bodyEn" required error={errors.bodyEn}><Textarea id="cb-bodyEn" rows={6} value={form.bodyEn} onChange={(e) => setForm({ ...form, bodyEn: e.target.value })} dir="ltr" readOnly={readOnly} aria-invalid={invalid("bodyEn")} /></Field>
            <Field label={t("bodyAr")} htmlFor="cb-bodyAr" required error={errors.bodyAr}><Textarea id="cb-bodyAr" rows={6} value={form.bodyAr} onChange={(e) => setForm({ ...form, bodyAr: e.target.value })} dir="rtl" readOnly={readOnly} aria-invalid={invalid("bodyAr")} /></Field>
          </div>
          <ImageUploadField id="cb-image" label={t("image")} value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} error={errors.imageUrl} disabled={readOnly} />
          <div className="grid gap-4 sm:grid-cols-[1fr_120px_auto] sm:items-end">
            <Field label={t("linkHref")} htmlFor="cb-link" error={errors.linkHref} hint={t("linkHint")}><Input id="cb-link" value={form.linkHref} onChange={(e) => setForm({ ...form, linkHref: e.target.value })} className="ltr-field" maxLength={200} readOnly={readOnly} aria-invalid={invalid("linkHref")} /></Field>
            <Field label={t("sortOrder")} htmlFor="cb-sort" error={errors.sortOrder}><Input id="cb-sort" type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} readOnly={readOnly} /></Field>
            <SwitchField id="cb-visible" label={t("visible")} checked={form.isVisible} onCheckedChange={(v) => setForm({ ...form, isVisible: v })} disabled={readOnly} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{canManage ? tc("cancel") : tc("close")}</Button>
            {canManage ? <Button type="submit" variant="accent" disabled={pending} data-testid="save-block">{pending ? tc("saving") : tc("save")}</Button> : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
