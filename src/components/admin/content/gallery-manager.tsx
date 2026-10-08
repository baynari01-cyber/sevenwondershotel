"use client";
import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { EyeOff, Images, Pencil, Plus, Trash2 } from "lucide-react";
import type { GalleryImageAdminDTO } from "@/lib/data/admin-catalog";
import { deleteGalleryImageAction, saveGalleryImageAction, setGalleryImageVisibleAction } from "@/lib/actions/admin-content";
import { GALLERY_CATEGORIES } from "@/lib/admin/constants";
import { pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { SwitchField } from "@/components/admin/form-bits";
import { ImageUploadField } from "@/components/admin/image-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

type Category = (typeof GALLERY_CATEGORIES)[number];
type Editing = { kind: "new" } | { kind: "edit"; image: GalleryImageAdminDTO } | null;

export function GalleryManager({ images, canManage }: { images: GalleryImageAdminDTO[]; canManage: boolean }) {
  const t = useTranslations("admin.content");
  const tc = useTranslations("common");
  const tg = useTranslations("gallery.categories");
  const locale = useLocale();
  const feedback = useCatalogFeedback();
  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<GalleryImageAdminDTO | null>(null);
  const [filter, setFilter] = React.useState<"ALL" | Category>("ALL");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const rows = filter === "ALL" ? images : images.filter((i) => i.category === filter);

  function toggle(img: GalleryImageAdminDTO, isVisible: boolean) {
    setPendingId(img.id);
    startTransition(async () => {
      feedback(await setGalleryImageVisibleAction({ id: img.id, isVisible }), t("saved"));
      setPendingId(null);
    });
  }
  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const { ok } = feedback(await deleteGalleryImageAction({ id: deleting.id }), t("deleted"));
      if (ok) setDeleting(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("category")}>
          {(["ALL", ...GALLERY_CATEGORIES] as const).map((c) => (
            <button key={c} type="button" onClick={() => setFilter(c)} aria-pressed={filter === c} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", filter === c ? "border-charcoal bg-charcoal text-ivory" : "border-charcoal/15 bg-white text-charcoal-muted hover:bg-sand-100")}>
              {tg(c)} <span className="num opacity-60">{c === "ALL" ? images.length : images.filter((i) => i.category === c).length}</span>
            </button>
          ))}
        </div>
        {canManage ? <Button variant="accent" onClick={() => setEditing({ kind: "new" })} data-testid="new-gallery-image"><Plus />{t("addImage")}</Button> : null}
      </div>
      {rows.length ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {rows.map((img) => (
            <li key={img.id} className={cn("group overflow-hidden rounded-lg border border-charcoal/10 bg-white shadow-soft", !img.isVisible && "opacity-70")} data-testid={`gallery-${img.id}`}>
              <div className="relative aspect-[4/3] bg-sand-100">
                <Image src={img.url} alt={pickLocale(img, "caption", locale)} fill sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw" className="object-cover" />
                <div className="absolute start-2 top-2 flex gap-1">
                  <Badge variant="dark">{tg(img.category)}</Badge>
                  {!img.isVisible ? <Badge variant="neutral"><EyeOff className="size-3" />{t("hidden")}</Badge> : null}
                </div>
                <span className="num absolute end-2 top-2 rounded bg-charcoal/70 px-1.5 py-0.5 text-[10px] text-ivory">{img.width}×{img.height}</span>
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-1 text-sm font-medium" dir="auto">{pickLocale(img, "caption", locale)}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{img.source}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="num text-xs text-stone">#{img.sortOrder}</span>
                  {canManage ? (
                    <div className="flex items-center gap-1">
                      <Switch checked={img.isVisible} disabled={pendingId === img.id} onCheckedChange={(v) => toggle(img, v)} aria-label={`${t("visible")}: ${img.captionEn}`} className="me-1 scale-90" />
                      <Button variant="ghost" size="iconSm" onClick={() => setEditing({ kind: "edit", image: img })} aria-label={`${tc("edit")} ${img.captionEn}`}><Pencil /></Button>
                      <Button variant="ghost" size="iconSm" onClick={() => setDeleting(img)} aria-label={`${tc("delete")} ${img.captionEn}`}><Trash2 /></Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Images} title={t("noGallery")} />
      )}
      {editing ? <GalleryDialog key={editing.kind === "edit" ? editing.image.id : "new"} image={editing.kind === "edit" ? editing.image : null} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("deleteImage")} body={t("deleteConfirm")} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </div>
  );
}

function GalleryDialog({ image, onClose }: { image: GalleryImageAdminDTO | null; onClose: () => void }) {
  const t = useTranslations("admin.content");
  const tc = useTranslations("common");
  const tg = useTranslations("gallery.categories");
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [form, setForm] = React.useState({
    url: image?.url ?? "",
    captionEn: image?.captionEn ?? "",
    captionAr: image?.captionAr ?? "",
    category: (image?.category ?? "HOTEL") as Category,
    width: image?.width ? String(image.width) : "",
    height: image?.height ? String(image.height) : "",
    source: image?.source ?? "",
    sortOrder: String(image?.sortOrder ?? 0),
    isVisible: image?.isVisible ?? true,
  });
  const invalid = (k: string) => (errors[k] ? true : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveGalleryImageAction({ id: image?.id, ...form, width: Number(form.width) || 0, height: Number(form.height) || 0, sortOrder: Number(form.sortOrder) });
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} className="max-w-2xl">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader><DialogTitle>{image ? t("editImage") : t("addImage")}</DialogTitle><DialogDescription>{t("galleryHint")}</DialogDescription></DialogHeader>
          <ImageUploadField id="gi-url" label={t("image")} value={form.url} required onChange={(url) => setForm({ ...form, url })} onUploaded={(u) => setForm((f) => ({ ...f, url: u.url, width: String(u.width), height: String(u.height) }))} error={errors.url} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("captionEn")} htmlFor="gi-capEn" required error={errors.captionEn}><Input id="gi-capEn" value={form.captionEn} onChange={(e) => setForm({ ...form, captionEn: e.target.value })} dir="ltr" maxLength={160} aria-invalid={invalid("captionEn")} /></Field>
            <Field label={t("captionAr")} htmlFor="gi-capAr" required error={errors.captionAr}><Input id="gi-capAr" value={form.captionAr} onChange={(e) => setForm({ ...form, captionAr: e.target.value })} dir="rtl" maxLength={160} aria-invalid={invalid("captionAr")} /></Field>
            <Field label={t("category")} htmlFor="gi-cat" required><NativeSelect id="gi-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>{GALLERY_CATEGORIES.map((c) => <option key={c} value={c}>{tg(c)}</option>)}</NativeSelect></Field>
            <Field label={t("source")} htmlFor="gi-source" required error={errors.source}><Input id="gi-source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} dir="auto" maxLength={160} aria-invalid={invalid("source")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("width")} htmlFor="gi-w" error={errors.width} hint={t("dimensionsHint")}><Input id="gi-w" type="number" min={0} max={20000} value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} /></Field>
              <Field label={t("height")} htmlFor="gi-h" error={errors.height}><Input id="gi-h" type="number" min={0} max={20000} value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3">
              <Field label={t("sortOrder")} htmlFor="gi-sort" error={errors.sortOrder}><Input id="gi-sort" type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>
              <SwitchField id="gi-visible" label={t("visible")} checked={form.isVisible} onCheckedChange={(v) => setForm({ ...form, isVisible: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>{tc("cancel")}</Button>
            <Button type="submit" variant="accent" disabled={pending} data-testid="save-gallery-image">{pending ? tc("saving") : tc("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
