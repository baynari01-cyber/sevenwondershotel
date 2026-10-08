"use client";
import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ExternalLink, ImageIcon, Plus, Trash2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { AmenityDTO, RoomTypeEditDTO } from "@/lib/data/admin-catalog";
import { deleteRoomTypeAction, saveRoomTypeAction } from "@/lib/actions/admin-rooms";
import { pickLocale } from "@/lib/utils/format";
import type { FieldErrors } from "@/components/admin/use-admin-feedback";
import { useCatalogFeedback } from "@/components/admin/use-catalog-feedback";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormSection, SwitchField } from "@/components/admin/form-bits";
import { ImageUploadField } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ImageDraft = { key: string; url: string; altEn: string; altAr: string };

type FormState = {
  slug: string;
  code: string;
  nameEn: string;
  nameAr: string;
  shortEn: string;
  shortAr: string;
  descriptionEn: string;
  descriptionAr: string;
  bedConfigEn: string;
  bedConfigAr: string;
  sizeSqm: string;
  maxAdults: string;
  maxChildren: string;
  maxOccupancy: string;
  baseRate: string;
  weekendRate: string;
  extraAdultRate: string;
  extraChildRate: string;
  minStay: string;
  hasBalcony: boolean;
  isSuite: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: string;
  amenityIds: string[];
  images: ImageDraft[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let draftCounter = 0;
const nextKey = () => `img-${++draftCounter}`;

function initialState(rt: RoomTypeEditDTO | null): FormState {
  return {
    slug: rt?.slug ?? "",
    code: rt?.code ?? "",
    nameEn: rt?.nameEn ?? "",
    nameAr: rt?.nameAr ?? "",
    shortEn: rt?.shortEn ?? "",
    shortAr: rt?.shortAr ?? "",
    descriptionEn: rt?.descriptionEn ?? "",
    descriptionAr: rt?.descriptionAr ?? "",
    bedConfigEn: rt?.bedConfigEn ?? "",
    bedConfigAr: rt?.bedConfigAr ?? "",
    sizeSqm: rt?.sizeSqm != null ? String(rt.sizeSqm) : "",
    maxAdults: String(rt?.maxAdults ?? 2),
    maxChildren: String(rt?.maxChildren ?? 0),
    maxOccupancy: String(rt?.maxOccupancy ?? 2),
    baseRate: rt?.baseRate ?? "",
    weekendRate: rt?.weekendRate ?? "",
    extraAdultRate: rt?.extraAdultRate ?? "0",
    extraChildRate: rt?.extraChildRate ?? "0",
    minStay: String(rt?.minStay ?? 1),
    hasBalcony: rt?.hasBalcony ?? false,
    isSuite: rt?.isSuite ?? false,
    isFeatured: rt?.isFeatured ?? false,
    isActive: rt?.isActive ?? true,
    sortOrder: String(rt?.sortOrder ?? 0),
    amenityIds: rt?.amenityIds ?? [],
    images: (rt?.images ?? []).map((i) => ({ key: nextKey(), url: i.url, altEn: i.altEn, altAr: i.altAr })),
  };
}

export function RoomTypeForm({ roomType, amenities, canManage, currency }: { roomType: RoomTypeEditDTO | null; amenities: AmenityDTO[]; canManage: boolean; currency: string }) {
  const t = useTranslations("admin.rooms");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const feedback = useCatalogFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [form, setForm] = React.useState<FormState>(() => initialState(roomType));
  const [slugTouched, setSlugTouched] = React.useState(Boolean(roomType));
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const readOnly = !canManage;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never);
  const invalid = (key: string) => (errors[key] ? true : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        id: roomType?.id,
        ...form,
        sizeSqm: form.sizeSqm === "" ? null : Number(form.sizeSqm),
        maxAdults: Number(form.maxAdults),
        maxChildren: Number(form.maxChildren),
        maxOccupancy: Number(form.maxOccupancy),
        minStay: Number(form.minStay),
        sortOrder: Number(form.sortOrder),
        images: form.images.map(({ url, altEn, altAr }) => ({ url, altEn, altAr })),
      };
      const result = await saveRoomTypeAction(payload);
      const { ok, fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
      if (ok && !roomType && result.ok) router.push(`/admin/rooms/${result.data.id}`);
    });
  }

  function remove() {
    if (!roomType) return;
    startTransition(async () => {
      const { ok } = feedback(await deleteRoomTypeAction({ id: roomType.id }), t("typeDeleted"));
      if (ok) router.push("/admin/rooms?tab=types");
    });
  }

  const moveImage = (index: number, dir: -1 | 1) => {
    const next = [...form.images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set("images", next);
  };
  const updateImage = (index: number, patch: Partial<ImageDraft>) => set("images", form.images.map((img, i) => (i === index ? { ...img, ...patch } : img)));

  const amenityGroups = Array.from(new Set(amenities.map((a) => a.category)));

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft sm:p-6">
          <FormSection title={t("identity")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("nameEn")} htmlFor="rt-nameEn" required error={errors.nameEn}>
                <Input id="rt-nameEn" value={form.nameEn} onChange={(e) => { set("nameEn", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} dir="ltr" maxLength={80} aria-invalid={invalid("nameEn")} readOnly={readOnly} />
              </Field>
              <Field label={t("nameAr")} htmlFor="rt-nameAr" required error={errors.nameAr}>
                <Input id="rt-nameAr" value={form.nameAr} onChange={text("nameAr")} dir="rtl" maxLength={80} aria-invalid={invalid("nameAr")} readOnly={readOnly} />
              </Field>
              <Field label={t("code")} htmlFor="rt-code" required error={errors.code} hint={t("codeHint")}>
                <Input id="rt-code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="ltr-field uppercase" maxLength={24} aria-invalid={invalid("code")} readOnly={readOnly} />
              </Field>
              <Field label={t("slug")} htmlFor="rt-slug" required error={errors.slug} hint={`/rooms/${form.slug || "…"}`}>
                <Input id="rt-slug" value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} className="ltr-field" maxLength={60} aria-invalid={invalid("slug")} readOnly={readOnly} />
              </Field>
              <Field label={t("shortEn")} htmlFor="rt-shortEn" required error={errors.shortEn} className="sm:col-span-2">
                <Input id="rt-shortEn" value={form.shortEn} onChange={text("shortEn")} dir="ltr" maxLength={200} aria-invalid={invalid("shortEn")} readOnly={readOnly} />
              </Field>
              <Field label={t("shortAr")} htmlFor="rt-shortAr" required error={errors.shortAr} className="sm:col-span-2">
                <Input id="rt-shortAr" value={form.shortAr} onChange={text("shortAr")} dir="rtl" maxLength={200} aria-invalid={invalid("shortAr")} readOnly={readOnly} />
              </Field>
              <Field label={t("descriptionEn")} htmlFor="rt-descEn" required error={errors.descriptionEn} className="sm:col-span-2">
                <Textarea id="rt-descEn" value={form.descriptionEn} onChange={text("descriptionEn")} dir="ltr" rows={5} aria-invalid={invalid("descriptionEn")} readOnly={readOnly} />
              </Field>
              <Field label={t("descriptionAr")} htmlFor="rt-descAr" required error={errors.descriptionAr} className="sm:col-span-2">
                <Textarea id="rt-descAr" value={form.descriptionAr} onChange={text("descriptionAr")} dir="rtl" rows={5} aria-invalid={invalid("descriptionAr")} readOnly={readOnly} />
              </Field>
              <Field label={t("bedConfigEn")} htmlFor="rt-bedEn" required error={errors.bedConfigEn}>
                <Input id="rt-bedEn" value={form.bedConfigEn} onChange={text("bedConfigEn")} dir="ltr" maxLength={120} aria-invalid={invalid("bedConfigEn")} readOnly={readOnly} />
              </Field>
              <Field label={t("bedConfigAr")} htmlFor="rt-bedAr" required error={errors.bedConfigAr}>
                <Input id="rt-bedAr" value={form.bedConfigAr} onChange={text("bedConfigAr")} dir="rtl" maxLength={120} aria-invalid={invalid("bedConfigAr")} readOnly={readOnly} />
              </Field>
            </div>
          </FormSection>
        </section>

        <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft sm:p-6">
          <FormSection title={t("capacityAndRates")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t("sizeSqm")} htmlFor="rt-size" error={errors.sizeSqm}>
                <Input id="rt-size" type="number" min={5} max={1000} value={form.sizeSqm} onChange={text("sizeSqm")} aria-invalid={invalid("sizeSqm")} readOnly={readOnly} />
              </Field>
              <Field label={t("maxAdults")} htmlFor="rt-adults" required error={errors.maxAdults}>
                <Input id="rt-adults" type="number" min={1} max={12} value={form.maxAdults} onChange={text("maxAdults")} aria-invalid={invalid("maxAdults")} readOnly={readOnly} />
              </Field>
              <Field label={t("maxChildren")} htmlFor="rt-children" required error={errors.maxChildren}>
                <Input id="rt-children" type="number" min={0} max={12} value={form.maxChildren} onChange={text("maxChildren")} aria-invalid={invalid("maxChildren")} readOnly={readOnly} />
              </Field>
              <Field label={t("maxOccupancy")} htmlFor="rt-occupancy" required error={errors.maxOccupancy}>
                <Input id="rt-occupancy" type="number" min={1} max={20} value={form.maxOccupancy} onChange={text("maxOccupancy")} aria-invalid={invalid("maxOccupancy")} readOnly={readOnly} />
              </Field>
              <Field label={`${t("baseRate")} (${currency})`} htmlFor="rt-base" required error={errors.baseRate}>
                <Input id="rt-base" inputMode="decimal" value={form.baseRate} onChange={text("baseRate")} className="ltr-field num" aria-invalid={invalid("baseRate")} readOnly={readOnly} />
              </Field>
              <Field label={`${t("weekendRate")} (${currency})`} htmlFor="rt-weekend" error={errors.weekendRate} hint={t("weekendHint")}>
                <Input id="rt-weekend" inputMode="decimal" value={form.weekendRate} onChange={text("weekendRate")} className="ltr-field num" aria-invalid={invalid("weekendRate")} readOnly={readOnly} />
              </Field>
              <Field label={`${t("extraAdultRate")} (${currency})`} htmlFor="rt-extraAdult" required error={errors.extraAdultRate}>
                <Input id="rt-extraAdult" inputMode="decimal" value={form.extraAdultRate} onChange={text("extraAdultRate")} className="ltr-field num" aria-invalid={invalid("extraAdultRate")} readOnly={readOnly} />
              </Field>
              <Field label={`${t("extraChildRate")} (${currency})`} htmlFor="rt-extraChild" required error={errors.extraChildRate}>
                <Input id="rt-extraChild" inputMode="decimal" value={form.extraChildRate} onChange={text("extraChildRate")} className="ltr-field num" aria-invalid={invalid("extraChildRate")} readOnly={readOnly} />
              </Field>
              <Field label={t("minStay")} htmlFor="rt-minStay" required error={errors.minStay}>
                <Input id="rt-minStay" type="number" min={1} max={30} value={form.minStay} onChange={text("minStay")} aria-invalid={invalid("minStay")} readOnly={readOnly} />
              </Field>
              <Field label={t("sortOrder")} htmlFor="rt-sort" error={errors.sortOrder}>
                <Input id="rt-sort" type="number" min={0} max={999} value={form.sortOrder} onChange={text("sortOrder")} aria-invalid={invalid("sortOrder")} readOnly={readOnly} />
              </Field>
            </div>
          </FormSection>
        </section>

        <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft sm:p-6">
          <FormSection title={t("images")}>
            {form.images.length ? (
              <ul className="space-y-3">
                {form.images.map((img, i) => (
                  <li key={img.key} className="grid gap-3 rounded-md border border-charcoal/10 p-3 sm:grid-cols-[96px_1fr_auto] sm:items-start" data-testid={`photo-${i}`}>
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-sand-100 sm:w-24">
                      {img.url.startsWith("/") ? <Image src={img.url} alt={pickLocale(img, "alt", locale)} fill sizes="96px" className="object-cover" unoptimized /> : <ImageIcon className="absolute start-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-sand-400 rtl:translate-x-1/2" />}
                      {i === 0 ? <Badge variant="copper" className="absolute start-1.5 top-1.5">{t("cover")}</Badge> : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ImageUploadField id={`img-url-${img.key}`} label={t("imageUrl")} value={img.url} onChange={(url) => updateImage(i, { url })} error={errors[`images.${i}`]} disabled={readOnly} />
                      <div className="grid gap-3">
                        <Field label={t("altEn")} htmlFor={`img-altEn-${img.key}`}><Input id={`img-altEn-${img.key}`} value={img.altEn} onChange={(e) => updateImage(i, { altEn: e.target.value })} dir="ltr" maxLength={160} readOnly={readOnly} className="h-9" /></Field>
                        <Field label={t("altAr")} htmlFor={`img-altAr-${img.key}`}><Input id={`img-altAr-${img.key}`} value={img.altAr} onChange={(e) => updateImage(i, { altAr: e.target.value })} dir="rtl" maxLength={160} readOnly={readOnly} className="h-9" /></Field>
                      </div>
                    </div>
                    {!readOnly ? (
                      <div className="flex gap-1 sm:flex-col">
                        <Button type="button" variant="ghost" size="iconSm" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label={t("moveUp")}><ArrowUp /></Button>
                        <Button type="button" variant="ghost" size="iconSm" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} aria-label={t("moveDown")}><ArrowDown /></Button>
                        <Button type="button" variant="ghost" size="iconSm" onClick={() => set("images", form.images.filter((_, j) => j !== i))} aria-label={t("deleteImage")} className="text-danger hover:text-danger"><Trash2 /></Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-charcoal/20 px-4 py-6 text-center text-sm text-muted-foreground">{t("noImages")}</p>
            )}
            {!readOnly ? (
              <Button type="button" variant="outline" size="sm" onClick={() => set("images", [...form.images, { key: nextKey(), url: "", altEn: form.nameEn, altAr: form.nameAr }])} disabled={form.images.length >= 24} data-testid="add-photo"><Plus />{t("addImage")}</Button>
            ) : null}
          </FormSection>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
          <FormSection title={t("visibility")}>
            <div className="grid gap-3">
              <SwitchField id="rt-active" label={t("isActive")} checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} disabled={readOnly} />
              <SwitchField id="rt-featured" label={t("isFeatured")} checked={form.isFeatured} onCheckedChange={(v) => set("isFeatured", v)} disabled={readOnly} />
              <SwitchField id="rt-suite" label={t("isSuite")} checked={form.isSuite} onCheckedChange={(v) => set("isSuite", v)} disabled={readOnly} />
              <SwitchField id="rt-balcony" label={t("hasBalcony")} checked={form.hasBalcony} onCheckedChange={(v) => set("hasBalcony", v)} disabled={readOnly} />
            </div>
          </FormSection>
        </section>

        <section className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft">
          <FormSection title={t("amenities")}>
            {amenityGroups.map((group) => (
              <fieldset key={group} className="space-y-2">
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone">{group}</legend>
                {amenities.filter((a) => a.category === group).map((a) => {
                  const checked = form.amenityIds.includes(a.id);
                  return (
                    <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-ivory-soft">
                      <Checkbox checked={checked} disabled={readOnly} onCheckedChange={(v) => set("amenityIds", v === true ? [...form.amenityIds, a.id] : form.amenityIds.filter((id) => id !== a.id))} aria-label={pickLocale(a, "label", locale)} />
                      <span>{pickLocale(a, "label", locale)}</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
            {errors.amenityIds ? <p role="alert" className="text-xs text-danger">{errors.amenityIds}</p> : null}
          </FormSection>
        </section>

        <div className="space-y-3 rounded-lg border border-copper/30 bg-white p-4 shadow-soft">
          {roomType ? (
            <p className="text-xs text-muted-foreground">
              {t("usageSummary", { rooms: roomType.roomCount, reservations: roomType.reservationCount })}
            </p>
          ) : null}
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="accent" disabled={pending} className="flex-1" data-testid="save-room-type">{pending ? tc("saving") : roomType ? tc("save") : tc("create")}</Button>
              {roomType ? (
                roomType.reservationCount > 0 ? (
                  <Button type="button" variant="outline" disabled={pending} title={t("hasReservations")} onClick={() => set("isActive", false)}>{t("deactivate")}</Button>
                ) : (
                  <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirmDelete(true)} data-testid="delete-room-type">{tc("delete")}</Button>
                )
              ) : null}
            </div>
          ) : null}
          {roomType ? (
            <Button asChild variant="link" size="sm"><Link href={`/rooms/${roomType.slug}`} target="_blank" rel="noreferrer"><ExternalLink />{t("viewOnSite")}</Link></Button>
          ) : null}
          {roomType && roomType.reservationCount > 0 ? <p className="text-xs text-stone">{t("hasReservations")}</p> : null}
        </div>
      </div>

      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={t("deleteType")} body={t("deleteTypeConfirm")} confirmLabel={tc("delete")} pending={pending} onConfirm={remove} />
    </form>
  );
}
