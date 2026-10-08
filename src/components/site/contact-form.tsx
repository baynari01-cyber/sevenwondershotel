"use client";
import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { submitContactMessage, type ContactFormState } from "@/lib/actions/contact";

const LIMITS = {
  name: { min: 2, max: 80 },
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 2000 },
} as const;

type LimitedField = keyof typeof LIMITS;

const initialState: ContactFormState = { status: "idle" };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" size="lg" disabled={pending} aria-disabled={pending} className="w-full sm:w-auto">
      <Send className="rtl:-scale-x-100" aria-hidden="true" />
      {pending ? pendingLabel : label}
    </Button>
  );
}

/** Outer shell: remounting the inner form (via key) resets the action state after a success. */
export function ContactForm() {
  const [formKey, setFormKey] = React.useState(0);
  return <ContactFormInner key={formKey} onReset={() => setFormKey((k) => k + 1)} />;
}

function ContactFormInner({ onReset }: { onReset: () => void }) {
  const t = useTranslations("contact");
  const tc = useTranslations("common");
  const tAll = useTranslations();
  const { toast } = useToast();
  const [state, formAction] = useActionState(submitContactMessage, initialState);
  const announcedRef = React.useRef<ContactFormState | null>(null);

  React.useEffect(() => {
    if (announcedRef.current === state) return;
    announcedRef.current = state;
    if (state.status === "success") toast({ kind: "success", title: t("success") });
    else if (state.status === "error" && state.errors.form) toast({ kind: "error", title: tAll(state.errors.form) });
  }, [state, t, tAll, toast]);

  const errorFor = (name: string): string | undefined => {
    if (state.status !== "error") return undefined;
    const key = state.errors[name];
    if (!key) return undefined;
    const limits = name in LIMITS ? LIMITS[name as LimitedField] : undefined;
    return tAll(key, limits ? { min: limits.min, max: limits.max } : undefined);
  };

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-center rounded-lg border border-success/30 bg-success/5 px-6 py-14 text-center">
        <CheckCircle2 className="size-10 text-success" strokeWidth={1.5} aria-hidden="true" />
        <p className="mt-4 font-display text-2xl text-charcoal">{t("success")}</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("formBody")}</p>
        <Button type="button" variant="outline" className="mt-8" onClick={onReset}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="relative space-y-5" aria-describedby="contact-form-note">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("name")} htmlFor="contact-name" required error={errorFor("name")}>
          <Input id="contact-name" name="name" autoComplete="name" maxLength={LIMITS.name.max} required aria-invalid={Boolean(errorFor("name")) || undefined} />
        </Field>
        <Field label={t("email")} htmlFor="contact-email" required error={errorFor("email")}>
          <Input id="contact-email" name="email" type="email" inputMode="email" autoComplete="email" required aria-invalid={Boolean(errorFor("email")) || undefined} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("phone")} htmlFor="contact-phone" hint={tc("optional")} error={errorFor("phone")}>
          <Input id="contact-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(errorFor("phone")) || undefined} />
        </Field>
        <Field label={t("subject")} htmlFor="contact-subject" required error={errorFor("subject")}>
          <Input id="contact-subject" name="subject" maxLength={LIMITS.subject.max} required aria-invalid={Boolean(errorFor("subject")) || undefined} />
        </Field>
      </div>
      <Field label={t("message")} htmlFor="contact-message" required error={errorFor("message")}>
        <Textarea id="contact-message" name="message" rows={6} maxLength={LIMITS.message.max} required aria-invalid={Boolean(errorFor("message")) || undefined} className="min-h-40" />
      </Field>

      {/* Honeypot: hidden from people and assistive technology, tempting for bots. */}
      <div aria-hidden="true" className="absolute -start-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="contact-website">{t("website")}</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {state.status === "error" && state.errors.form ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{tAll(state.errors.form)}</p>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-charcoal/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p id="contact-form-note" className="text-xs leading-relaxed text-muted-foreground sm:max-w-xs">{t("formBody")}</p>
        <SubmitButton label={t("send")} pendingLabel={t("sending")} />
      </div>
    </form>
  );
}
