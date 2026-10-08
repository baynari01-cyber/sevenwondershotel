"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { guestSchema, type GuestFormInput } from "@/lib/booking/schemas";
import { COUNTRY_NAMES } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { GuestDraft } from "../types";

export function GuestStep({ guest, checkInTime, onBack, onContinue }: { guest: GuestDraft; checkInTime: string; onBack: () => void; onContinue: (guest: GuestDraft) => void }) {
  const t = useTranslations("booking.guest");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { register, handleSubmit, formState: { errors } } = useForm<GuestFormInput>({ resolver: zodResolver(guestSchema), defaultValues: guest, mode: "onBlur" });

  const err = (field: keyof GuestFormInput) => {
    const e = errors[field]?.message;
    if (!e) return undefined;
    const key = String(e).replace(/^validation\./, "");
    if (key === "minLength") return tv("minLength", { min: 2 });
    if (key === "maxLength") return tv("maxLength", { max: 1000 });
    if (["required", "email", "phone", "date", "number", "positive", "accept"].includes(key)) return tv(key as "required");
    return tv("required");
  };

  const countries = Object.entries(COUNTRY_NAMES)
    .filter(([code]) => code !== "OTHER")
    .map(([code, n]) => ({ code, name: locale === "ar" ? n.ar : n.en }))
    .sort((a, b) => a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en"));

  return (
    <form onSubmit={handleSubmit((values) => onContinue({ ...values, arrivalTime: values.arrivalTime ?? "", specialRequests: values.specialRequests ?? "" }))} noValidate className="rounded-lg border border-charcoal/10 bg-white p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-3xl">{t("title")}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={t("firstName")} htmlFor="firstName" required error={err("firstName")}>
          <Input id="firstName" autoComplete="given-name" aria-invalid={Boolean(errors.firstName)} {...register("firstName")} />
        </Field>
        <Field label={t("lastName")} htmlFor="lastName" required error={err("lastName")}>
          <Input id="lastName" autoComplete="family-name" aria-invalid={Boolean(errors.lastName)} {...register("lastName")} />
        </Field>
        <Field label={t("email")} htmlFor="email" required error={err("email")}>
          <Input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
        </Field>
        <Field label={t("phone")} htmlFor="phone" required error={err("phone")}>
          <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+962 7…" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
        </Field>
        <Field label={t("country")} htmlFor="country" required error={err("country")}>
          <NativeSelect id="country" autoComplete="country" aria-invalid={Boolean(errors.country)} {...register("country")}>
            <option value="">{t("selectCountry")}</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            <option value="OTHER">{locale === "ar" ? COUNTRY_NAMES.OTHER.ar : COUNTRY_NAMES.OTHER.en}</option>
          </NativeSelect>
        </Field>
        <Field label={t("arrivalTime")} htmlFor="arrivalTime" hint={t("arrivalHint", { time: checkInTime })} error={err("arrivalTime")}>
          <Input id="arrivalTime" type="time" {...register("arrivalTime")} />
        </Field>
        <Field label={t("specialRequests")} htmlFor="specialRequests" hint={t("specialRequestsHint")} className="sm:col-span-2" error={err("specialRequests")}>
          <Textarea id="specialRequests" rows={4} dir="auto" {...register("specialRequests")} />
        </Field>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("privacy")}</p>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>{tc("back")}</Button>
        <Button type="submit" variant="accent" size="lg" data-testid="continue-review">{t("continue")}</Button>
      </div>
    </form>
  );
}
