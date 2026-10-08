"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SettingsDTO } from "@/lib/data/public";
import { updateFinancialAction, updateHotelProfileAction, updatePoliciesAction } from "@/lib/actions/admin-settings";
import { useAdminFeedback, type FieldErrors } from "@/components/admin/use-admin-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type Props = { settings: SettingsDTO; canManage: boolean };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="eyebrow">{children}</h3>;
}

function SwitchRow({ id, label, hint, checked, onCheckedChange, disabled }: { id: string; label: string; hint?: string; checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-charcoal/10 bg-ivory-soft/60 px-4 py-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer">{label}</Label>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function SaveBar({ pending, canManage, dirty }: { pending: boolean; canManage: boolean; dirty: boolean }) {
  const tc = useTranslations("common");
  const t = useTranslations("admin.settings");
  if (!canManage) return <p className="text-xs text-muted-foreground">{t("readOnly")}</p>;
  return (
    <div className="flex items-center justify-end gap-3 border-t border-charcoal/10 pt-4">
      <Button type="submit" variant="accent" disabled={pending || !dirty} data-testid="settings-save">{pending ? tc("saving") : tc("save")}</Button>
    </div>
  );
}

const card = "rounded-lg border border-charcoal/10 bg-white p-5 shadow-soft sm:p-6";

export function HotelProfileForm({ settings, canManage }: Props) {
  const t = useTranslations("admin.settings");
  const feedback = useAdminFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const initial = React.useMemo(
    () => ({
      nameEn: settings.nameEn,
      nameAr: settings.nameAr,
      taglineEn: settings.taglineEn,
      taglineAr: settings.taglineAr,
      addressEn: settings.addressEn,
      addressAr: settings.addressAr,
      city: settings.city,
      country: settings.country,
      postalBox: settings.postalBox ?? "",
      phone: settings.phone,
      phoneSecondary: settings.phoneSecondary ?? "",
      fax: settings.fax ?? "",
      email: settings.email,
      whatsapp: settings.whatsapp ?? "",
      latitude: String(settings.latitude),
      longitude: String(settings.longitude),
      facebookUrl: settings.facebookUrl ?? "",
      instagramUrl: settings.instagramUrl ?? "",
      tripadvisorUrl: settings.tripadvisorUrl ?? "",
      demoMode: settings.demoMode,
    }),
    [settings],
  );
  const [form, setForm] = React.useState(initial);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const ro = !canManage;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateHotelProfileAction({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) });
      const { fieldErrors } = feedback(result, t("saved"));
      setErrors(fieldErrors);
    });
  }

  const text = (key: keyof typeof form, label: string, opts?: { type?: string; dir?: "ltr" | "rtl" | "auto"; hint?: string; required?: boolean; className?: string }) => (
    <Field label={label} htmlFor={`profile-${key}`} error={errors[key]} hint={opts?.hint} required={opts?.required} className={opts?.className}>
      <Input id={`profile-${key}`} type={opts?.type ?? "text"} value={String(form[key])} onChange={(e) => set(key, e.target.value as never)} dir={opts?.dir} readOnly={ro} aria-invalid={errors[key] ? true : undefined} className={cn(opts?.dir === "ltr" && "ltr-field")} />
    </Field>
  );

  return (
    <form onSubmit={submit} className={cn(card, "space-y-8")} data-testid="profile-form">
      <section className="space-y-4">
        <SectionTitle>{t("identity")}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("nameEn", t("nameEn"), { dir: "ltr", required: true })}
          {text("nameAr", t("nameAr"), { dir: "rtl", required: true })}
          {text("taglineEn", t("taglineEn"), { dir: "ltr", required: true })}
          {text("taglineAr", t("taglineAr"), { dir: "rtl", required: true })}
        </div>
        <SwitchRow id="profile-demoMode" label={t("demoModeLabel")} hint={t("demoModeHint")} checked={form.demoMode} onCheckedChange={(v) => set("demoMode", v)} disabled={ro} />
      </section>
      <section className="space-y-4">
        <SectionTitle>{t("contact")}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("phone", t("phone"), { type: "tel", dir: "ltr", required: true })}
          {text("phoneSecondary", t("phoneSecondary"), { type: "tel", dir: "ltr" })}
          {text("fax", t("fax"), { type: "tel", dir: "ltr" })}
          {text("email", t("email"), { type: "email", dir: "ltr", required: true })}
          {text("whatsapp", t("whatsapp"), { type: "tel", dir: "ltr", hint: t("whatsappHint"), className: "sm:col-span-2" })}
        </div>
      </section>
      <section className="space-y-4">
        <SectionTitle>{t("location")}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("addressEn", t("addressEn"), { dir: "ltr", required: true })}
          {text("addressAr", t("addressAr"), { dir: "rtl", required: true })}
          {text("city", t("city"), { required: true })}
          {text("country", t("country"), { required: true })}
          {text("postalBox", t("postalBox"), { dir: "ltr" })}
          <div className="grid grid-cols-2 gap-4">
            {text("latitude", t("latitude"), { type: "number", dir: "ltr", required: true })}
            {text("longitude", t("longitude"), { type: "number", dir: "ltr", required: true })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("coordinatesHint")}</p>
      </section>
      <section className="space-y-4">
        <SectionTitle>{t("social")}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {text("facebookUrl", t("facebookUrl"), { type: "url", dir: "ltr" })}
          {text("instagramUrl", t("instagramUrl"), { type: "url", dir: "ltr" })}
          {text("tripadvisorUrl", t("tripadvisorUrl"), { type: "url", dir: "ltr" })}
        </div>
        <p className="text-xs text-muted-foreground">{t("socialHint")}</p>
      </section>
      <SaveBar pending={pending} canManage={canManage} dirty={dirty} />
    </form>
  );
}

export function PoliciesForm({ settings, canManage }: Props) {
  const t = useTranslations("admin.settings");
  const locale = useLocale();
  const feedback = useAdminFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const initial = React.useMemo(
    () => ({
      checkInTime: settings.checkInTime,
      checkOutTime: settings.checkOutTime,
      childAgeLimit: String(settings.childAgeLimit),
      maxRoomsPerBooking: String(settings.maxRoomsPerBooking),
      maxNightsPerBooking: String(settings.maxNightsPerBooking),
      weekendDays: [...settings.weekendDays].sort((a, b) => a - b),
    }),
    [settings],
  );
  const [form, setForm] = React.useState(initial);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const ro = !canManage;
  const weekdayName = (day: number) => new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 1, 1 + day))); // 2026-02-01 is a Sunday

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updatePoliciesAction({ ...form, childAgeLimit: Number(form.childAgeLimit), maxRoomsPerBooking: Number(form.maxRoomsPerBooking), maxNightsPerBooking: Number(form.maxNightsPerBooking) });
      setErrors(feedback(result, t("saved")).fieldErrors);
    });
  }

  return (
    <form onSubmit={submit} className={cn(card, "space-y-8")} data-testid="policies-form">
      <section className="space-y-4">
        <SectionTitle>{t("policies")}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("checkInTime")} htmlFor="pol-checkIn" error={errors.checkInTime} required>
            <Input id="pol-checkIn" type="time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} readOnly={ro} aria-invalid={errors.checkInTime ? true : undefined} data-testid="pol-checkin" />
          </Field>
          <Field label={t("checkOutTime")} htmlFor="pol-checkOut" error={errors.checkOutTime} required>
            <Input id="pol-checkOut" type="time" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} readOnly={ro} aria-invalid={errors.checkOutTime ? true : undefined} />
          </Field>
          <Field label={t("childAgeLimit")} htmlFor="pol-child" error={errors.childAgeLimit} required>
            <Input id="pol-child" type="number" min={0} max={17} value={form.childAgeLimit} onChange={(e) => setForm({ ...form, childAgeLimit: e.target.value })} readOnly={ro} />
          </Field>
          <Field label={t("maxRoomsPerBooking")} htmlFor="pol-rooms" error={errors.maxRoomsPerBooking} required>
            <Input id="pol-rooms" type="number" min={1} max={20} value={form.maxRoomsPerBooking} onChange={(e) => setForm({ ...form, maxRoomsPerBooking: e.target.value })} readOnly={ro} />
          </Field>
          <Field label={t("maxNightsPerBooking")} htmlFor="pol-nights" error={errors.maxNightsPerBooking} required>
            <Input id="pol-nights" type="number" min={1} max={90} value={form.maxNightsPerBooking} onChange={(e) => setForm({ ...form, maxNightsPerBooking: e.target.value })} readOnly={ro} />
          </Field>
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>{t("weekendDays")}</SectionTitle>
        <fieldset className="flex flex-wrap gap-2" aria-describedby="weekend-hint">
          <legend className="sr-only">{t("weekendDays")}</legend>
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const checked = form.weekendDays.includes(day);
            return (
              <label key={day} className={cn("inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors", checked ? "border-copper bg-copper/5 text-charcoal" : "border-charcoal/15 text-charcoal-muted hover:border-charcoal/40", ro && "cursor-default")}>
                <Checkbox
                  checked={checked}
                  disabled={ro}
                  aria-label={weekdayName(day)}
                  data-testid={`weekend-${day}`}
                  onCheckedChange={(v) => setForm({ ...form, weekendDays: v === true ? [...form.weekendDays, day].sort((a, b) => a - b) : form.weekendDays.filter((d) => d !== day) })}
                />
                {weekdayName(day)}
              </label>
            );
          })}
        </fieldset>
        <p id="weekend-hint" className="text-xs text-muted-foreground">{t("weekendDaysHint")}</p>
      </section>
      <SaveBar pending={pending} canManage={canManage} dirty={dirty} />
    </form>
  );
}

export function FinancialForm({ settings, canManage }: Props) {
  const t = useTranslations("admin.settings");
  const feedback = useAdminFeedback();
  const [pending, startTransition] = React.useTransition();
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const initial = React.useMemo(
    () => ({ currency: settings.currency, usdRate: settings.usdRate, eurRate: settings.eurRate, taxRate: settings.taxRate, serviceChargeRate: settings.serviceChargeRate, taxesIncluded: settings.taxesIncluded }),
    [settings],
  );
  const [form, setForm] = React.useState(initial);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const ro = !canManage;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateFinancialAction({ ...form, usdRate: Number(form.usdRate), eurRate: Number(form.eurRate), taxRate: Number(form.taxRate), serviceChargeRate: Number(form.serviceChargeRate) });
      setErrors(feedback(result, t("saved")).fieldErrors);
    });
  }

  const num = (key: "usdRate" | "eurRate" | "taxRate" | "serviceChargeRate", label: string, step: string, max: number) => (
    <Field label={label} htmlFor={`fin-${key}`} error={errors[key]} required>
      <Input id={`fin-${key}`} type="number" inputMode="decimal" step={step} min={0} max={max} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} readOnly={ro} aria-invalid={errors[key] ? true : undefined} />
    </Field>
  );

  return (
    <form onSubmit={submit} className={cn(card, "space-y-8")} data-testid="financial-form">
      <section className="space-y-4">
        <SectionTitle>{t("financial")}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("currency")} htmlFor="fin-currency" error={errors.currency} required>
            <Input id="fin-currency" value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} readOnly={ro} className="ltr-field uppercase" aria-invalid={errors.currency ? true : undefined} />
          </Field>
          {num("usdRate", t("usdRate"), "0.0001", 1000)}
          {num("eurRate", t("eurRate"), "0.0001", 1000)}
          {num("taxRate", t("taxRate"), "0.01", 100)}
          {num("serviceChargeRate", t("serviceChargeRate"), "0.01", 100)}
        </div>
        <SwitchRow id="fin-taxesIncluded" label={t("taxesIncluded")} checked={form.taxesIncluded} onCheckedChange={(v) => setForm({ ...form, taxesIncluded: v })} disabled={ro} />
        <p className="text-xs text-muted-foreground">{t("financialHint")}</p>
      </section>
      <SaveBar pending={pending} canManage={canManage} dirty={dirty} />
    </form>
  );
}
